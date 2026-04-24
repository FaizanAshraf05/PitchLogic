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

// Global In-Memory Game State
let gameState = {
    active: false,
    managerId: null,
    teams: [],
    players: [],
    fixtures: [],
    managers: []
};

// HELPER FUNCTION: Get Team by ID
const getTeam = (id) => gameState.teams.find(t => t.teamID == id);

// Get Teams
app.get('/api/teams', async (req, res) => {
    try {
        if (!gameState.active) {
            // If the game hasn't started yet, the TeamSelectScreen still needs the list of teams!
            // Fetch directly from the SQL database.
            const pool = await poolPromise;
            const result = await pool.request().query(`
                SELECT t.teamID, t.name AS teamName, t.transferBudget, t.formation, c.username AS managerName
                FROM Team t
                LEFT JOIN ClubManager c ON t.managerID = c.managerID
                ORDER BY t.transferBudget DESC
            `);
            return res.json(result.recordset);
        }

        // Return teams enriched with managerName
        const result = gameState.teams.map(t => {
            const manager = gameState.managers.find(m => m.managerID == t.managerID);
            return {
                teamID: t.teamID,
                teamName: t.name,
                transferBudget: t.transferBudget,
                formation: t.formation,
                managerName: manager ? manager.username : null
            };
        }).sort((a, b) => b.transferBudget - a.transferBudget);

        res.json(result);
    } catch (err) { res.status(500).send("Server Error"); }
});

app.get('/api/teams/:id/players', async (req, res) => {
    try {
        if (!gameState.active) return res.status(400).json({ message: "Game not started" });
        const teamPlayers = gameState.players
            .filter(p => p.teamID == req.params.id)
            .sort((a, b) => b.overallRating - a.overallRating);
        res.json(teamPlayers);
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-05
app.get('/api/league/standings', async (req, res) => {
    try {
        if (!gameState.active) return res.status(400).json({ message: "Game not started" });
        const standings = gameState.teams
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
        if (!gameState.active) return res.status(400).json({ message: "Game not started" });

        let freeAgents = gameState.players.filter(p => p.teamID === null);
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
        const { starters, bench, reserves } = req.body;

        if (!Array.isArray(starters) || starters.length !== 11) {
            return res.status(400).send("You must select exactly 11 starting players.");
        }

        const safeStarters = starters.map(id => parseInt(id)).filter(id => !isNaN(id));
        const safeBench = Array.isArray(bench) ? bench.map(id => parseInt(id)).filter(id => !isNaN(id)) : [];
        const safeReserves = Array.isArray(reserves) ? reserves.map(id => parseInt(id)).filter(id => !isNaN(id)) : [];

        gameState.players.forEach(p => {
            if (p.teamID === teamId) {
                if (safeStarters.includes(p.playerID)) p.squadRole = 'Starter';
                else if (safeBench.includes(p.playerID)) p.squadRole = 'Bench';
                else p.squadRole = 'Reserve'; // Default to Reserve if not in starter/bench
            }
        });

        res.json({ message: "Lineup saved successfully!" });
    } catch (err) { res.status(500).send(err.message); }
});

// UC-02
app.put('/api/teams/:id/tactics', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id);
        const { newFormation, newStyle } = req.body;
        const team = getTeam(teamId);
        if (team) {
            team.formation = newFormation;
            team.teamStyle = newStyle;
        }
        res.json({ message: "Tactics updated successfully!" });
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-04
app.put('/api/teams/:id/training', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id);
        gameState.players.forEach(p => {
            if (p.teamID === teamId) p.morale = 100;
        });
        res.json({ message: "Training complete. Squad morale is maximized!" });
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-06
app.post('/api/game/advance-week', async (req, res) => {
    try {
        gameState.players.forEach(p => p.stamina = 100);
        res.json({ message: "Week advanced. Stamina restored." });
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-08
app.post('/api/teams/:id/facilities/upgrade', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id);
        const { cost } = req.body;
        const team = getTeam(teamId);
        if (team) {
            team.transferBudget -= cost;
        }
        res.json({ message: "Facility upgraded!" });
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-09
app.post('/api/matches/simulate', async (req, res) => {
    try {
        const { homeTeamId, awayTeamId, homeGoals, awayGoals } = req.body;
        const homeTeam = getTeam(homeTeamId);
        const awayTeam = getTeam(awayTeamId);

        if (homeTeam && awayTeam) {
            homeTeam.matchesPlayed = (homeTeam.matchesPlayed || 0) + 1;
            awayTeam.matchesPlayed = (awayTeam.matchesPlayed || 0) + 1;

            if (homeGoals > awayGoals) {
                const diff = homeGoals - awayGoals;
                homeTeam.wins = (homeTeam.wins || 0) + 1;
                awayTeam.losses = (awayTeam.losses || 0) + 1;

                homeTeam.points = (homeTeam.points || 0) + 3;
                homeTeam.goalDifference = (homeTeam.goalDifference || 0) + diff;
                awayTeam.goalDifference = (awayTeam.goalDifference || 0) - diff;
            } else if (awayGoals > homeGoals) {
                const diff = awayGoals - homeGoals;
                awayTeam.wins = (awayTeam.wins || 0) + 1;
                homeTeam.losses = (homeTeam.losses || 0) + 1;

                awayTeam.points = (awayTeam.points || 0) + 3;
                awayTeam.goalDifference = (awayTeam.goalDifference || 0) + diff;
                homeTeam.goalDifference = (homeTeam.goalDifference || 0) - diff;
            } else {
                homeTeam.draws = (homeTeam.draws || 0) + 1;
                awayTeam.draws = (awayTeam.draws || 0) + 1;

                homeTeam.points = (homeTeam.points || 0) + 1;
                awayTeam.points = (awayTeam.points || 0) + 1;
            }
        }
        res.json({ message: "Match Simulated and Standings Updated!" });
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
        if (!gameState.active) return res.status(400).json({ message: "Game not started" });
        const market = gameState.players.map(p => {
            const team = getTeam(p.teamID);
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

app.get('/api/teams/:id/next-match', async (req, res) => {
    try {
        if (!gameState.active) return res.status(400).json({ message: "Game not started" });
        const teamId = parseInt(req.params.id);
        const match = gameState.fixtures.find(m => (m.homeTeamID === teamId || m.awayTeamID === teamId) && m.isSimulated === 0);
        res.json(match || { message: "No upcoming matches." });
    } catch (err) { res.status(500).send("Server Error"); }
});

app.get('/api/teams/:id/schedule', async (req, res) => {
    try {
        if (!gameState.active) return res.status(400).json({ message: "Game not started" });
        const teamId = parseInt(req.params.id);
        const schedule = gameState.fixtures
            .filter(m => m.homeTeamID === teamId || m.awayTeamID === teamId)
            .map(m => {
                const homeTeam = getTeam(m.homeTeamID);
                const awayTeam = getTeam(m.awayTeamID);
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
        if (!gameState.active) return res.status(400).json({ message: "Game not started" });
        const { buyerTeamId, playerId, bidAmount } = req.body;

        const player = gameState.players.find(p => p.playerID == playerId);
        const buyer = getTeam(buyerTeamId);

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
        const seller = getTeam(player.teamID);
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

        gameState.teams = teamsRes.recordset;
        gameState.players = playersRes.recordset;
        gameState.managers = managersRes.recordset;

        // Ensure goalDifference and points exist
        gameState.teams.forEach(t => {
            t.points = t.points || 0;
            t.goalDifference = t.goalDifference || 0;
            t.matchesPlayed = t.matchesPlayed || 0;
            t.wins = t.wins || 0;
            t.draws = t.draws || 0;
            t.losses = t.losses || 0;
        });

        // Setup Manager Logic IN MEMORY
        let manager = gameState.managers.find(m => m.username === managerName);
        if (!manager) {
            // Assign a fake ID for memory purposes
            const newId = gameState.managers.length > 0 ? Math.max(...gameState.managers.map(m => m.managerID)) + 1 : 1;
            manager = { managerID: newId, username: managerName, isHuman: 1 };
            gameState.managers.push(manager);
            console.log(`New Manager ${managerName} created in memory.`);
        } else {
            console.log(`Manager ${managerName} returning to the game.`);
        }

        // Assign team to manager in memory
        const team = getTeam(teamId);
        if (team) {
            team.managerID = manager.managerID;
        }

        // Generate Fixtures IN MEMORY
        let matchInserts = [];
        let teamsList = gameState.teams.map(t => t.teamID);
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

        gameState.fixtures = matchInserts;
        gameState.active = true;
        gameState.managerId = manager.managerID;

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