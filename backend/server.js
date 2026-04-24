const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const config = require('./dbConfig');

const app = express();
app.use(cors());
app.use(express.json());

const poolPromise = sql.connect(config)
    .then(pool => {
        console.log('Connected to MSSQL');
        return pool;
    })
    .catch(err => console.log('Database Connection Failed! Bad Config: ', err));

// Global In-Memory Game States (Multi-user support)
const gameSessions = new Map();

// Middleware to attach the correct game state to the request
app.use((req, res, next) => {
    const managerName = (req.query && req.query.manager) || (req.body && req.body.managerName) || (req.headers && req.headers['x-manager-name']) || 'default';
    if (!gameSessions.has(managerName)) {
        gameSessions.set(managerName, {
            active: false,
            managerId: null,
            teams: [],
            players: [],
            fixtures: [],
            managers: []
        });
    }
    req.gameState = gameSessions.get(managerName);
    next();
});

// HELPER FUNCTION: Get Team by ID
const getTeam = (gameState, id) => gameState.teams.find(t => t.teamID == id);

// Get Teams
app.get('/api/teams', async (req, res) => {
    try {
        if (!req.gameState.active) {
            const pool = await poolPromise;
            const result = await pool.request().query(`
                SELECT t.teamID, t.name AS teamName, t.transferBudget, t.formation, c.username AS managerName
                FROM Team t
                LEFT JOIN ClubManager c ON t.managerID = c.managerID
                ORDER BY t.transferBudget DESC
            `);
            return res.json(result.recordset);
        }

        const result = req.gameState.teams.map(t => {
            const manager = req.gameState.managers.find(m => m.managerID == t.managerID);
            return {
                teamID: t.teamID,
                teamName: t.name,
                transferBudget: t.transferBudget,
                formation: t.formation,
                managerName: manager ? manager.username : null,
                youthFacilityLevel: t.youthFacilityLevel || 70,
                trainingFacilityLevel: t.trainingFacilityLevel || 70
            };
        }).sort((a, b) => b.transferBudget - a.transferBudget);

        res.json(result);
    } catch (err) { res.status(500).send("Server Error"); }
});

app.get('/api/teams/:id/players', async (req, res) => {
    try {
        if (!req.gameState.active) return res.status(400).json({ message: "Game not started" });
        const teamPlayers = req.gameState.players
            .filter(p => p.teamID == req.params.id)
            .sort((a, b) => b.overallRating - a.overallRating);
        res.json(teamPlayers);
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-05
app.get('/api/league/standings', async (req, res) => {
    try {
        if (!req.gameState.active) return res.status(400).json({ message: "Game not started" });
        const standings = req.gameState.teams
            .map(t => ({
                teamID: t.teamID,
                name: t.name,
                matchesPlayed: t.matchesPlayed || 0,
                wins: t.wins || 0,
                draws: t.draws || 0,
                losses: t.losses || 0,
                points: t.points || 0,
                goalDifference: t.goalDifference || 0
            }))
            .sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                return b.goalDifference - a.goalDifference;
            });
        res.json(standings);
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-07
app.get('/api/scout/players', async (req, res) => {
    try {
        const { position } = req.query;
        if (!req.gameState.active) return res.status(400).json({ message: "Game not started" });

        let freeAgents = req.gameState.players.filter(p => p.teamID === null);
        if (position) {
            freeAgents = freeAgents.filter(p => p.position && p.position.includes(position));
        }
        res.json(freeAgents.sort((a, b) => b.overallRating - a.overallRating));
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-01
app.put('/api/teams/:id/lineup', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id);
        const { starters, bench, reserves, teamOverallRating } = req.body;

        if (!Array.isArray(starters) || starters.length !== 11) {
            return res.status(400).send("You must select exactly 11 starting players.");
        }

        const safeStarters = starters.map(id => parseInt(id)).filter(id => !isNaN(id));
        const safeBench = Array.isArray(bench) ? bench.map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
        const safeReserves = Array.isArray(reserves) ? reserves.map(id => parseInt(id)).filter(id => !isNaN(id)) : [];

        req.gameState.players.forEach(p => {
            if (p.teamID === teamId) {
                const starterIdx = safeStarters.indexOf(p.playerID);
                const benchIdx = safeBench.indexOf(p.playerID);
                const reserveIdx = safeReserves.indexOf(p.playerID);

                if (starterIdx !== -1) {
                    p.squadRole = 'Starter';
                    p.squadPositionIndex = starterIdx;
                } else if (benchIdx !== -1) {
                    p.squadRole = 'Bench';
                    p.squadPositionIndex = benchIdx;
                } else if (reserveIdx !== -1) {
                    p.squadRole = 'Reserve';
                    p.squadPositionIndex = reserveIdx;
                } else {
                    p.squadRole = 'Reserve';
                    p.squadPositionIndex = 99;
                }
            }
        });

        if (teamOverallRating !== undefined) {
            const team = getTeam(req.gameState, teamId);
            if (team) team.currentOVR = teamOverallRating;
        }

        res.json({ message: "Lineup saved successfully!" });
    } catch (err) { res.status(500).send(err.message); }
});

// UC-02
app.put('/api/teams/:id/tactics', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id);
        const { newFormation, newStyle } = req.body;
        const team = getTeam(req.gameState, teamId);
        if (team) {
            team.formation = newFormation;
            team.teamStyle = newStyle;
        }
        res.json({ message: "Tactics updated successfully!" });
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-04 — Training: Focus on a position. After 3 matches the boost is applied.
app.put('/api/teams/:id/training', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id);
        const { position } = req.body;

        if (!position) {
            return res.status(400).json({ message: "Please select a position to train." });
        }

        const team = getTeam(req.gameState, teamId);
        if (!team) return res.status(404).json({ message: "Team not found." });

        // Check if there's already an active training programme
        if (team.trainingProgramme && team.trainingProgramme.matchesRemaining > 0) {
            return res.status(400).json({
                message: `Training already in progress for ${team.trainingProgramme.position}. ${team.trainingProgramme.matchesRemaining} match(es) remaining.`
            });
        }

        // Set a new training programme
        team.trainingProgramme = {
            position: position,
            matchesRemaining: 3,
            boost: 2
        };

        res.json({
            message: `Training focus set to ${position}. The +2 rating boost will apply after 3 matches.`,
            trainingProgramme: team.trainingProgramme
        });
    } catch (err) { res.status(500).send("Server Error"); }
});

// Get current training status
app.get('/api/teams/:id/training', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id);
        const team = getTeam(req.gameState, teamId);
        if (!team) return res.status(404).json({ message: "Team not found." });

        res.json({ trainingProgramme: team.trainingProgramme || null });
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-06
app.post('/api/game/advance-week', async (req, res) => {
    try {
        req.gameState.players.forEach(p => p.stamina = 100);
        res.json({ message: "Week advanced. Stamina restored." });
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-08
app.post('/api/teams/:id/facilities/upgrade', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id);
        const { type } = req.body; // 'youth' or 'training'
        const team = getTeam(req.gameState, teamId);
        if (!team) return res.status(404).send("Team not found.");

        const currentLevel = type === 'youth' ? (team.youthFacilityLevel || 70) : (team.trainingFacilityLevel || 70);
        if (currentLevel >= 100) {
            return res.status(400).json({ message: "Facility is already at maximum level." });
        }

        // Cost: 1M at level 70, up to 10M at level 100. Exponential scaling.
        const cost = Math.floor(1000000 * Math.pow(10, (currentLevel - 70) / 30));

        if (team.transferBudget < cost) {
            return res.status(400).json({ message: "Not enough budget." });
        }

        team.transferBudget -= cost;
        if (type === 'youth') {
            team.youthFacilityLevel = currentLevel + 1;
        } else {
            team.trainingFacilityLevel = currentLevel + 1;
        }

        res.json({ message: "Facility upgraded successfully!", newLevel: currentLevel + 1, newBudget: team.transferBudget });
    } catch (err) { res.status(500).send("Server Error"); }
});

app.post('/api/teams/:id/facilities/sign-youth', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id);
        const team = getTeam(req.gameState, teamId);
        if (!team) return res.status(404).send("Team not found.");

        const cost = 10000000; // 10M
        if (team.transferBudget < cost) {
            return res.status(400).json({ message: "Not enough budget. Signing a youth player costs $10M." });
        }

        const youthLevel = team.youthFacilityLevel || 70;
        const minRating = Math.max(1, youthLevel - 10);
        const maxRating = Math.min(99, youthLevel + 10);
        const newRating = Math.floor(Math.random() * (maxRating - minRating + 1)) + minRating;

        const firstNames = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Leo", "Hugo", "Lucas", "Mateo"];
        const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Silva", "Santos", "Fernandes", "Costa"];
        const randomName = firstNames[Math.floor(Math.random() * firstNames.length)] + " " + lastNames[Math.floor(Math.random() * lastNames.length)];

        const positions = ["GK", "CB", "LB", "RB", "CM", "CDM", "CAM", "LM", "RM", "ST", "RW", "LW"];
        const randomPos = positions[Math.floor(Math.random() * positions.length)];

        const newId = req.gameState.players.length > 0 ? Math.max(...req.gameState.players.map(p => p.playerID)) + 1 : 1;

        const newPlayer = {
            playerID: newId,
            name: randomName,
            position: randomPos,
            overallRating: newRating,
            marketValue: Math.floor(100000 * Math.pow(1.1, newRating - 50)),
            teamID: teamId,
            squadRole: 'Reserve'
        };

        team.transferBudget -= cost;
        req.gameState.players.push(newPlayer);

        res.json({ message: `Successfully signed ${randomName} (${randomPos}) with OVR ${newRating}!`, newBudget: team.transferBudget, player: newPlayer });
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-09
app.post('/api/matches/simulate', async (req, res) => {
    try {
        const { homeTeamId, awayTeamId, homeGoals, awayGoals, matchId } = req.body;
        const homeTeam = getTeam(req.gameState, homeTeamId);
        const awayTeam = getTeam(req.gameState, awayTeamId);

        if (!homeTeam || !awayTeam) {
            return res.status(404).json({ message: "One or both teams not found." });
        }

        const fixture = matchId
            ? req.gameState.fixtures.find(f => f.matchID === matchId)
            : req.gameState.fixtures.find(f =>
                f.homeTeamID === homeTeamId &&
                f.awayTeamID === awayTeamId &&
                f.isSimulated === 0
            );

        if (fixture) {
            fixture.isSimulated = 1;
            fixture.homeScore = homeGoals;
            fixture.awayScore = awayGoals;
        }

        homeTeam.matchesPlayed = (homeTeam.matchesPlayed || 0) + 1;
        awayTeam.matchesPlayed = (awayTeam.matchesPlayed || 0) + 1;

        homeTeam.goalsFor = (homeTeam.goalsFor || 0) + homeGoals;
        awayTeam.goalsFor = (awayTeam.goalsFor || 0) + awayGoals;
        homeTeam.goalsAgainst = (homeTeam.goalsAgainst || 0) + awayGoals;
        awayTeam.goalsAgainst = (awayTeam.goalsAgainst || 0) + homeGoals;

        // Budget: +5M per team for playing
        homeTeam.transferBudget = (homeTeam.transferBudget || 0) + 5000000;
        awayTeam.transferBudget = (awayTeam.transferBudget || 0) + 5000000;

        if (homeGoals > awayGoals) {
            const diff = homeGoals - awayGoals;
            homeTeam.wins = (homeTeam.wins || 0) + 1;
            awayTeam.losses = (awayTeam.losses || 0) + 1;

            homeTeam.points = (homeTeam.points || 0) + 3;
            homeTeam.goalDifference = (homeTeam.goalDifference || 0) + diff;
            awayTeam.goalDifference = (awayTeam.goalDifference || 0) - diff;
            // win bonus: 2.5M
            homeTeam.transferBudget += 2500000;
        } else if (awayGoals > homeGoals) {
            const diff = awayGoals - homeGoals;
            awayTeam.wins = (awayTeam.wins || 0) + 1;
            homeTeam.losses = (homeTeam.losses || 0) + 1;

            awayTeam.points = (awayTeam.points || 0) + 3;
            awayTeam.goalDifference = (awayTeam.goalDifference || 0) + diff;
            homeTeam.goalDifference = (homeTeam.goalDifference || 0) - diff;
            // win bonus: 2.5M
            awayTeam.transferBudget += 2500000;
        } else {
            homeTeam.draws = (homeTeam.draws || 0) + 1;
            awayTeam.draws = (awayTeam.draws || 0) + 1;

            homeTeam.points = (homeTeam.points || 0) + 1;
            awayTeam.points = (awayTeam.points || 0) + 1;
        }

        // Process training programmes for both teams involved
        [homeTeam, awayTeam].forEach(team => {
            if (team.trainingProgramme && team.trainingProgramme.matchesRemaining > 0) {
                team.trainingProgramme.matchesRemaining -= 1;

                if (team.trainingProgramme.matchesRemaining <= 0) {
                    // Apply the +2 boost to all players in that position
                    const targetPos = team.trainingProgramme.position;
                    req.gameState.players.forEach(p => {
                        if (p.teamID === team.teamID && p.position && p.position.includes(targetPos)) {
                            p.overallRating = Math.min(99, p.overallRating + team.trainingProgramme.boost);
                        }
                    });
                    console.log(`Training complete for ${team.name}: +2 to all ${targetPos} players.`);
                    team.trainingProgramme = null; // Clear the programme
                }
            }
        });

        res.json({
            message: "Match Simulated and Standings Updated!",
            result: {
                homeTeamName: homeTeam.name,
                awayTeamName: awayTeam.name,
                homeGoals,
                awayGoals,
                matchId: fixture ? fixture.matchID : null
            }
        });
    } catch (err) { res.status(500).send(err.message); }
});

// Simulate ai matches in the same game-week
app.post('/api/matches/simulate-week', async (req, res) => {
    try {
        const { matchDate, excludeMatchId } = req.body;
        if (!matchDate) return res.status(400).json({ message: "matchDate is required." });

        const weekFixtures = req.gameState.fixtures.filter(f =>
            f.matchDate === matchDate && f.isSimulated === 0 && f.matchID !== excludeMatchId
        );

        const results = [];

        weekFixtures.forEach(fixture => {
            const homeTeam = getTeam(req.gameState, fixture.homeTeamID);
            const awayTeam = getTeam(req.gameState, fixture.awayTeamID);
            if (!homeTeam || !awayTeam) return;

            // Calculate OVR for each team from their best 11
            const getTeamOVR = (team) => {
                const teamPlayers = req.gameState.players.filter(p => p.teamID === team.teamID);
                const top11 = teamPlayers.sort((a, b) => b.overallRating - a.overallRating).slice(0, 11);
                if (top11.length === 0) return 50;
                return Math.round(top11.reduce((sum, p) => sum + p.overallRating, 0) / top11.length);
            };

            const homeOVR = homeTeam.currentOVR || getTeamOVR(homeTeam);
            const awayOVR = awayTeam.currentOVR || getTeamOVR(awayTeam);
            const totalOVR = homeOVR + awayOVR;
            const homeProb = totalOVR > 0 ? homeOVR / totalOVR : 0.5;

            // Same scoring algorithm as the frontend uses for the player's match
            let homeGoals = 0;
            let awayGoals = 0;
            for (let i = 0; i < 5; i++) {
                if (Math.random() < (homeProb * 1.2)) homeGoals++;
                if (Math.random() < ((1 - homeProb) * 1.2)) awayGoals++;
            }

            // Mark fixture as simulated
            fixture.isSimulated = 1;
            fixture.homeScore = homeGoals;
            fixture.awayScore = awayGoals;

            // Update standings
            homeTeam.matchesPlayed = (homeTeam.matchesPlayed || 0) + 1;
            awayTeam.matchesPlayed = (awayTeam.matchesPlayed || 0) + 1;
            homeTeam.goalsFor = (homeTeam.goalsFor || 0) + homeGoals;
            awayTeam.goalsFor = (awayTeam.goalsFor || 0) + awayGoals;
            homeTeam.goalsAgainst = (homeTeam.goalsAgainst || 0) + awayGoals;
            awayTeam.goalsAgainst = (awayTeam.goalsAgainst || 0) + homeGoals;

            // Budget: +5M per team for playing
            homeTeam.transferBudget = (homeTeam.transferBudget || 0) + 5000000;
            awayTeam.transferBudget = (awayTeam.transferBudget || 0) + 5000000;

            if (homeGoals > awayGoals) {
                const diff = homeGoals - awayGoals;
                homeTeam.wins = (homeTeam.wins || 0) + 1;
                awayTeam.losses = (awayTeam.losses || 0) + 1;
                homeTeam.points = (homeTeam.points || 0) + 3;
                homeTeam.goalDifference = (homeTeam.goalDifference || 0) + diff;
                awayTeam.goalDifference = (awayTeam.goalDifference || 0) - diff;
                // +2.5M win bonus
                homeTeam.transferBudget += 2500000;
            } else if (awayGoals > homeGoals) {
                const diff = awayGoals - homeGoals;
                awayTeam.wins = (awayTeam.wins || 0) + 1;
                homeTeam.losses = (homeTeam.losses || 0) + 1;
                awayTeam.points = (awayTeam.points || 0) + 3;
                awayTeam.goalDifference = (awayTeam.goalDifference || 0) + diff;
                homeTeam.goalDifference = (homeTeam.goalDifference || 0) - diff;
                // +2.5M win bonus
                awayTeam.transferBudget += 2500000;
            } else {
                homeTeam.draws = (homeTeam.draws || 0) + 1;
                awayTeam.draws = (awayTeam.draws || 0) + 1;
                homeTeam.points = (homeTeam.points || 0) + 1;
                awayTeam.points = (awayTeam.points || 0) + 1;
            }

            // Process training for AI teams
            [homeTeam, awayTeam].forEach(team => {
                if (team.trainingProgramme && team.trainingProgramme.matchesRemaining > 0) {
                    team.trainingProgramme.matchesRemaining -= 1;
                    if (team.trainingProgramme.matchesRemaining <= 0) {
                        const targetPos = team.trainingProgramme.position;
                        req.gameState.players.forEach(p => {
                            if (p.teamID === team.teamID && p.position && p.position.includes(targetPos)) {
                                p.overallRating = Math.min(99, p.overallRating + team.trainingProgramme.boost);
                            }
                        });
                        team.trainingProgramme = null;
                    }
                }
            });

            results.push({
                matchID: fixture.matchID,
                homeTeamName: homeTeam.name,
                awayTeamName: awayTeam.name,
                homeGoals,
                awayGoals
            });
        });

        res.json({
            message: `Simulated ${results.length} other match(es) this week.`,
            results
        });
    } catch (err) { res.status(500).send(err.message); }
});

// UC-1
app.post('/api/transfers/ai-process', async (req, res) => {
    try {
        res.json({ message: "AI Teams have conducted their transfer business." });
    } catch (err) { res.status(500).send("Server Error"); }
});

app.get('/api/transfers/market/all', async (req, res) => {
    try {
        if (!req.gameState.active) return res.status(400).json({ message: "Game not started" });
        const market = req.gameState.players.map(p => {
            const team = getTeam(req.gameState, p.teamID);
            return {
                playerID: p.playerID,
                name: p.name,
                position: p.position,
                overallRating: p.overallRating,
                marketValue: p.marketValue,
                currentTeam: team ? team.name : 'Free Agent'
            };
        }).sort((a, b) => b.overallRating - a.overallRating);
        res.json(market);
    } catch (err) {
        console.error("Transfer Market Error:", err);
        res.status(500).send("Server Error: " + err.message);
    }
});

app.get('/api/matches/:id/preview', async (req, res) => {
    try {
        if (!req.gameState.active) return res.status(400).json({ message: "Game not started" });
        const matchId = parseInt(req.params.id);
        const match = req.gameState.fixtures.find(m => m.matchID === matchId);
        if (!match) return res.status(404).json({ message: "Match not found." });

        const homeTeam = getTeam(req.gameState, match.homeTeamID);
        const awayTeam = getTeam(req.gameState, match.awayTeamID);

        const getTeamStats = (team) => {
            if (!team) return null;
            let teamPlayers = req.gameState.players.filter(p => p.teamID === team.teamID);
            let starters = teamPlayers.filter(p => p.squadRole === 'Starter');
            if (starters.length !== 11) {
                starters = teamPlayers.sort((a, b) => b.overallRating - a.overallRating).slice(0, 11);
            }
            const calculatedOVR = starters.length > 0
                ? Math.round(starters.reduce((sum, p) => sum + p.overallRating, 0) / starters.length)
                : 0;
            const overallRating = team.currentOVR || calculatedOVR;

            const avgGoals = team.matchesPlayed > 0
                ? (team.goalsFor / team.matchesPlayed).toFixed(1)
                : "-";

            return {
                teamID: team.teamID,
                name: team.name,
                matchesPlayed: team.matchesPlayed || 0,
                wins: team.wins || 0,
                losses: team.losses || 0,
                avgGoals,
                overallRating
            };
        };

        res.json({
            match,
            homeTeam: getTeamStats(homeTeam),
            awayTeam: getTeamStats(awayTeam)
        });
    } catch (err) { res.status(500).send("Server Error"); }
});

app.get('/api/teams/:id/next-match', async (req, res) => {
    try {
        if (!req.gameState.active) return res.status(400).json({ message: "Game not started" });
        const teamId = parseInt(req.params.id);
        const match = req.gameState.fixtures.find(m => (m.homeTeamID === teamId || m.awayTeamID === teamId) && m.isSimulated === 0);
        res.json(match || { message: "No upcoming matches." });
    } catch (err) { res.status(500).send("Server Error"); }
});

app.get('/api/teams/:id/schedule', async (req, res) => {
    try {
        if (!req.gameState.active) return res.status(400).json({ message: "Game not started" });
        const teamId = parseInt(req.params.id);
        const schedule = req.gameState.fixtures
            .filter(m => m.homeTeamID === teamId || m.awayTeamID === teamId)
            .map(m => {
                const homeTeam = getTeam(req.gameState, m.homeTeamID);
                const awayTeam = getTeam(req.gameState, m.awayTeamID);
                return {
                    ...m,
                    homeTeamName: homeTeam ? homeTeam.name : 'Unknown',
                    awayTeamName: awayTeam ? awayTeam.name : 'Unknown'
                };
            })
            .sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));
        res.json(schedule);
    } catch (err) {
        console.error("Schedule Error:", err);
        res.status(500).send("Server Error: " + err.message);
    }
});

app.post('/api/transfers/buy', async (req, res) => {
    try {
        if (!req.gameState.active) return res.status(400).json({ message: "Game not started" });
        const { buyerTeamId, playerId, bidAmount } = req.body;

        const player = req.gameState.players.find(p => p.playerID == playerId);
        const buyer = getTeam(req.gameState, buyerTeamId);

        if (!player || !buyer) return res.status(404).send("Player or Team not found.");

        if (bidAmount < player.marketValue) {
            return res.status(400).json({ message: "Bid rejected! Offer is below the player's market value." });
        }
        if (buyer.transferBudget < bidAmount) {
            return res.status(400).json({ message: "Transfer failed. Your club does not have enough budget." });
        }

        // Deduct from buyer
        buyer.transferBudget -= bidAmount;

        // Add to seller
        const seller = getTeam(req.gameState, player.teamID);
        if (seller) {
            seller.transferBudget += bidAmount;
        }

        // Move player
        player.teamID = parseInt(buyerTeamId);
        player.squadRole = 'Reserve';

        res.json({ message: "Transfer successful! The player has joined your reserves." });
    } catch (err) {
        console.error("Transfer Error:", err);
        res.status(500).send("Server Error: " + err.message);
    }
});

//Start New Game
app.post('/api/game/new', async (req, res) => {
    try {
        const { managerName, teamId } = req.body;
        const pool = await poolPromise;

        // Fetch Everything from Database into Memory
        const teamsRes = await pool.request().query('SELECT * FROM Team');
        const playersRes = await pool.request().query('SELECT * FROM Player');
        const managersRes = await pool.request().query('SELECT * FROM ClubManager');

        req.gameState.teams = teamsRes.recordset;
        req.gameState.players = playersRes.recordset;
        req.gameState.managers = managersRes.recordset;

        // Reset all team stats to exactly 0 to start fresh
        req.gameState.teams.forEach(t => {
            t.points = 0;
            t.goalDifference = 0;
            t.matchesPlayed = 0;
            t.wins = 0;
            t.draws = 0;
            t.losses = 0;
            t.goalsFor = 0;
            t.goalsAgainst = 0;
            t.currentOVR = 0;
            t.youthFacilityLevel = 70;
            t.trainingFacilityLevel = 70;
        });

        // Setup Manager Logic IN MEMORY
        let manager = req.gameState.managers.find(m => m.username === managerName);
        if (!manager) {
            // Assign a fake ID for memory purposes
            const newId = req.gameState.managers.length > 0 ? Math.max(...req.gameState.managers.map(m => m.managerID)) + 1 : 1;
            manager = { managerID: newId, username: managerName, isHuman: 1 };
            req.gameState.managers.push(manager);
            console.log(`New Manager ${managerName} created in memory.`);
        } else {
            console.log(`Manager ${managerName} returning to the game.`);
        }

        // Assign team to manager in memory
        const team = getTeam(req.gameState, teamId);
        if (team) {
            team.managerID = manager.managerID;
        }

        // Generate Fixtures IN MEMORY
        let matchInserts = [];
        let teamsList = req.gameState.teams.map(t => t.teamID);
        let seasonStartDate = new Date('2026-08-15');
        const weeksToSimulate = 38;
        let matchIdCounter = 1;

        for (let week = 0; week < weeksToSimulate; week++) {
            let matchDateObj = new Date(seasonStartDate);
            matchDateObj.setDate(seasonStartDate.getDate() + (week * 7));
            let sqlDate = matchDateObj.toISOString().split('T')[0];

            let shuffledTeams = [...teamsList].sort(() => 0.5 - Math.random());

            for (let i = 0; i < shuffledTeams.length - 1; i += 2) {
                const home = shuffledTeams[i];
                const away = shuffledTeams[i + 1];
                matchInserts.push({
                    matchID: matchIdCounter++,
                    matchDate: sqlDate,
                    homeTeamID: home,
                    awayTeamID: away,
                    homeScore: 0,
                    awayScore: 0,
                    isSimulated: 0,
                    homeReady: 0,
                    awayReady: 0
                });
            }
        }

        req.gameState.fixtures = matchInserts;
        req.gameState.active = true;
        req.gameState.managerId = manager.managerID;

        res.json({ message: "Game Started & Simple Schedule Generated!", managerId: manager.managerID });
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to start game: " + err.message);
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Pitch Logic API running on http://localhost:${PORT}`);
});