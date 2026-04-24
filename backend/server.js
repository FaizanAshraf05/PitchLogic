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

// Get Teams
app.get('/api/teams', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT t.teamID, t.name AS teamName, t.transferBudget, t.formation, c.username AS managerName
            FROM Team t
            LEFT JOIN ClubManager c ON t.managerID = c.managerID
            ORDER BY t.transferBudget DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).send("Server Error"); }
});

app.get('/api/teams/:id/players', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('teamId', sql.Int, req.params.id)
            .query(`SELECT * FROM Player WHERE teamID = @teamId ORDER BY overallRating DESC`);
        res.json(result.recordset);
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-05
app.get('/api/league/standings', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`SELECT teamID, name, points, goalDifference FROM Team ORDER BY points DESC, goalDifference DESC`);
        res.json(result.recordset);
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-07
app.get('/api/scout/players', async (req, res) => {
    try {
        const { position } = req.query;
        const pool = await poolPromise;
        const result = await pool.request()
            .input('position', sql.VarChar, position ? `%${position}%` : '%%')
            .query(`SELECT * FROM Player WHERE teamID IS NULL AND position LIKE @position ORDER BY overallRating DESC`);
        res.json(result.recordset);
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-01
app.put('/api/teams/:id/lineup', async (req, res) => {
    try {
        const teamId = req.params.id;
        const { starters, bench, reserves } = req.body;

        if (!Array.isArray(starters) || starters.length !== 11) {
            return res.status(400).send("You must select exactly 11 starting players.");
        }

        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const safeStarters = starters.map(id => parseInt(id)).filter(id => !isNaN(id)).join(',');
            const safeBench = Array.isArray(bench) ? bench.map(id => parseInt(id)).filter(id => !isNaN(id)).join(',') : '';
            const safeReserves = Array.isArray(reserves) ? reserves.map(id => parseInt(id)).filter(id => !isNaN(id)).join(',') : '';

            // Update roles efficiently based on provided arrays
            if (safeStarters) {
                await transaction.request().query(`UPDATE Player SET squadRole = 'Starter' WHERE playerID IN (${safeStarters}) AND teamID = ${teamId}`);
            }
            if (safeBench) {
                await transaction.request().query(`UPDATE Player SET squadRole = 'Bench' WHERE playerID IN (${safeBench}) AND teamID = ${teamId}`);
            }
            if (safeReserves) {
                await transaction.request().query(`UPDATE Player SET squadRole = 'Reserve' WHERE playerID IN (${safeReserves}) AND teamID = ${teamId}`);
            }

            await transaction.commit();
            res.json({ message: "Lineup saved successfully!" });
        } catch (txErr) {
            await transaction.rollback();
            throw txErr;
        }
    } catch (err) { res.status(500).send(err.message); }
});

// UC-02
app.put('/api/teams/:id/tactics', async (req, res) => {
    try {
        const { newFormation, newStyle } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('formation', sql.VarChar, newFormation)
            .input('style', sql.VarChar, newStyle)
            .input('teamId', sql.Int, req.params.id)
            .query(`UPDATE Team SET formation = @formation, teamStyle = @style WHERE teamID = @teamId`);
        res.json({ message: "Tactics updated successfully!" });
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-03
app.post('/api/transfers/buy', async (req, res) => {
    try {
        const { teamId, playerId, cost } = req.body;
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            await transaction.request()
                .input('cost', sql.Int, cost)
                .input('teamId', sql.Int, teamId)
                .query(`UPDATE Team SET transferBudget = transferBudget - @cost WHERE teamID = @teamId`);

            await transaction.request()
                .input('teamId', sql.Int, teamId)
                .input('playerId', sql.Int, playerId)
                .query(`UPDATE Player SET teamID = @teamId, squadRole = 'Bench' WHERE playerID = @playerId`);

            await transaction.commit();
            res.json({ message: "Transfer successful!" });
        } catch (txErr) {
            await transaction.rollback();
            throw txErr;
        }
    } catch (err) { res.status(500).send(err.message); }
});

// UC-04
app.put('/api/teams/:id/training', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('teamId', sql.Int, req.params.id)
            .query(`UPDATE Player SET morale = 100 WHERE teamID = @teamId`);
        res.json({ message: "Training complete. Squad morale is maximized!" });
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-06
app.post('/api/game/advance-week', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().query(`UPDATE Player SET stamina = 100`);
        res.json({ message: "Week advanced. Stamina restored." });
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-08
app.post('/api/teams/:id/facilities/upgrade', async (req, res) => {
    try {
        const { cost } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('cost', sql.Int, cost)
            .input('teamId', sql.Int, req.params.id)
            .query(`UPDATE Team SET transferBudget = transferBudget - @cost WHERE teamID = @teamId`);
        res.json({ message: "Facility upgraded!" });
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-09
app.post('/api/matches/simulate', async (req, res) => {
    try {
        const { homeTeamId, awayTeamId, homeGoals, awayGoals } = req.body;
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            if (homeGoals > awayGoals) {
                const diff = homeGoals - awayGoals;
                await transaction.request()
                    .input('homeId', sql.Int, homeTeamId)
                    .input('diff', sql.Int, diff)
                    .query(`UPDATE Team SET points = points + 3, goalDifference = goalDifference + @diff WHERE teamID = @homeId`);
                await transaction.request()
                    .input('awayId', sql.Int, awayTeamId)
                    .input('diff', sql.Int, diff)
                    .query(`UPDATE Team SET goalDifference = goalDifference - @diff WHERE teamID = @awayId`);
            } else if (awayGoals > homeGoals) {
                const diff = awayGoals - homeGoals;
                await transaction.request()
                    .input('awayId', sql.Int, awayTeamId)
                    .input('diff', sql.Int, diff)
                    .query(`UPDATE Team SET points = points + 3, goalDifference = goalDifference + @diff WHERE teamID = @awayId`);
                await transaction.request()
                    .input('homeId', sql.Int, homeTeamId)
                    .input('diff', sql.Int, diff)
                    .query(`UPDATE Team SET goalDifference = goalDifference - @diff WHERE teamID = @homeId`);
            } else {
                // Draw
                await transaction.request()
                    .input('homeId', sql.Int, homeTeamId)
                    .input('awayId', sql.Int, awayTeamId)
                    .query(`UPDATE Team SET points = points + 1 WHERE teamID IN (@homeId, @awayId)`);
            }
            await transaction.commit();
            res.json({ message: "Match Simulated and Standings Updated!" });
        } catch (txErr) {
            await transaction.rollback();
            throw txErr;
        }
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
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                p.playerID, 
                p.name, 
                p.position, 
                p.overallRating, 
                p.marketValue, 
                ISNULL(t.name, 'Free Agent') AS currentTeam
            FROM Player p
            LEFT JOIN Team t ON p.teamID = t.teamID
            ORDER BY p.overallRating DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error("Transfer Market Error:", err);
        res.status(500).send("Server Error: " + err.message);
    }
});

app.get('/api/teams/:id/next-match', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('teamId', sql.Int, req.params.id)
            .query(`
                SELECT TOP 1 * FROM MatchFixture 
                WHERE (homeTeamID = @teamId OR awayTeamID = @teamId) 
                AND isSimulated = 0 
                ORDER BY matchDate ASC
            `);
        res.json(result.recordset[0] || { message: "No upcoming matches." });
    } catch (err) { res.status(500).send("Server Error"); }
});

app.get('/api/teams/:id/schedule', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('teamId', sql.Int, req.params.id)
            .query(`
                SELECT 
                    m.matchID, 
                    m.matchDate, 
                    m.homeScore, 
                    m.awayScore, 
                    m.isSimulated,
                    m.homeTeamID,
                    ht.name AS homeTeamName,
                    m.awayTeamID,
                    at.name AS awayTeamName
                FROM MatchFixture m
                JOIN Team ht ON m.homeTeamID = ht.teamID
                JOIN Team at ON m.awayTeamID = at.teamID
                WHERE m.homeTeamID = @teamId OR m.awayTeamID = @teamId
                ORDER BY m.matchDate ASC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error("Schedule Error:", err);
        res.status(500).send("Server Error: " + err.message);
    }
});

app.post('/api/transfers/buy', async (req, res) => {
    try {
        const { buyerTeamId, playerId, bidAmount } = req.body;
        const pool = await poolPromise;

        const checkQuery = await pool.request()
            .input('buyerId', sql.Int, buyerTeamId)
            .input('playerId', sql.Int, playerId)
            .query(`
                SELECT 
                    p.marketValue, 
                    p.teamID AS sellerTeamId, 
                    t.transferBudget AS buyerBudget
                FROM Player p
                LEFT JOIN Team t ON t.teamID = @buyerId
                WHERE p.playerID = @playerId
            `);

        const details = checkQuery.recordset[0];
        if (!details) return res.status(404).send("Player or Team not found.");

        if (bidAmount < details.marketValue) {
            return res.status(400).json({ message: "Bid rejected! Offer is below the player's market value." });
        }
        if (details.buyerBudget < bidAmount) {
            return res.status(400).json({ message: "Transfer failed. Your club does not have enough budget." });
        }

        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            await transaction.request()
                .input('cost', sql.Int, bidAmount)
                .input('buyerId', sql.Int, buyerTeamId)
                .query(`UPDATE Team SET transferBudget = transferBudget - @cost WHERE teamID = @buyerId`);

            if (details.sellerTeamId !== null) {
                await transaction.request()
                    .input('cost', sql.Int, bidAmount)
                    .input('sellerId', sql.Int, details.sellerTeamId)
                    .query(`UPDATE Team SET transferBudget = transferBudget + @cost WHERE teamID = @sellerId`);
            }
            await transaction.request()
                .input('buyerId', sql.Int, buyerTeamId)
                .input('playerId', sql.Int, playerId)
                .query(`UPDATE Player SET teamID = @buyerId, squadRole = 'Reserve' WHERE playerID = @playerId`);

            await transaction.commit();
            res.json({ message: "Transfer successful! The player has joined your reserves." });

        } catch (txErr) {
            await transaction.rollback();
            throw txErr;
        }
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
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // create maanger
            const checkManager = await transaction.request()
                .input('managerName', sql.VarChar, managerName)
                .query(`SELECT managerID FROM ClubManager WHERE username = @managerName`);

            let newManagerId;

            if (checkManager.recordset.length > 0) {
                newManagerId = checkManager.recordset[0].managerID;
                console.log(`Manager ${managerName} returning to the game.`);
            } else {
                const managerResult = await transaction.request()
                    .input('managerName', sql.VarChar, managerName)
                    .query(`
                        INSERT INTO ClubManager (username, isHuman) 
                        VALUES (@managerName, 1);
                        SELECT SCOPE_IDENTITY() AS managerID;
                    `);
                newManagerId = managerResult.recordset[0].managerID;
                console.log(`New Manager ${managerName} created.`);
            }
            await transaction.request()
                .input('managerId', sql.Int, newManagerId)
                .input('teamId', sql.Int, teamId)
                .query(`UPDATE Team SET managerID = @managerId WHERE teamID = @teamId`);

            await transaction.request().query(`DELETE FROM MatchFixture`);

            const teamsResult = await transaction.request().query(`SELECT teamID FROM Team`);
            let teams = teamsResult.recordset.map(t => t.teamID);

            let matchInserts = [];
            let seasonStartDate = new Date('2026-08-15');
            const weeksToSimulate = 38;

            for (let week = 0; week < weeksToSimulate; week++) {
                let matchDateObj = new Date(seasonStartDate);
                matchDateObj.setDate(seasonStartDate.getDate() + (week * 7));
                let sqlDate = matchDateObj.toISOString().split('T')[0];

                let shuffledTeams = [...teams].sort(() => 0.5 - Math.random());

                for (let i = 0; i < shuffledTeams.length - 1; i += 2) {
                    const home = shuffledTeams[i];
                    const away = shuffledTeams[i + 1];
                    matchInserts.push(`('${sqlDate}', ${home}, ${away}, 0, 0, 0, 0, 0)`);
                }
            }

            if (matchInserts.length > 0) {
                const bulkInsertQuery = `
                    INSERT INTO MatchFixture (matchDate, homeTeamID, awayTeamID, homeScore, awayScore, isSimulated, homeReady, awayReady)
                    VALUES ${matchInserts.join(', ')}
                `;
                await transaction.request().query(bulkInsertQuery);
            }

            await transaction.commit();
            res.json({ message: "Game Started & Simple Schedule Generated!", managerId: newManagerId });

        } catch (txErr) {
            await transaction.rollback();
            throw txErr;
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to start game: " + err.message);
    }
});
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Pitch Logic API running on http://localhost:${PORT}`);
});