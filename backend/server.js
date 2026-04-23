const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const config = require('./dbConfig');

const app = express();
app.use(cors());
app.use(express.json());
//Get Teams
app.get('/api/teams', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query(`
            SELECT t.teamID, t.name AS teamName, t.transferBudget, t.formation, c.username AS managerName
            FROM Team t
            LEFT JOIN ClubManager c ON t.managerID = c.managerID
            ORDER BY t.transferBudget DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).send("Server Error"); }
});

// Specific Team Players 
app.get('/api/teams/:id/players', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query(`SELECT * FROM Player WHERE teamID = ${req.params.id} ORDER BY overallRating DESC`);
        res.json(result.recordset);
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-05
app.get('/api/league/standings', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query(`SELECT teamID, name, points, goalDifference FROM Team ORDER BY points DESC, goalDifference DESC`);
        res.json(result.recordset);
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-07
app.get('/api/scout/players', async (req, res) => {
    try {
        const { position } = req.query;
        await sql.connect(config);
        const result = await sql.query(`SELECT * FROM Player WHERE teamID IS NULL AND position LIKE '%${position}%' ORDER BY overallRating DESC`);
        res.json(result.recordset);
    } catch (err) { res.status(500).send("Server Error"); }
});
// UC-01
app.put('/api/teams/:id/lineup', async (req, res) => {
    try {
        const teamId = req.params.id;
        const { starters } = req.body;
        await sql.connect(config);
        await sql.query(`UPDATE Player SET squadRole = 'Bench' WHERE teamID = ${teamId}`);
        await sql.query(`UPDATE Player SET squadRole = 'Starter' WHERE playerID IN (${starters.join(',')})`);

        res.json({ message: "Lineup saved successfully!" });
    } catch (err) { res.status(500).send(err.message); }
});

// UC-02
app.put('/api/teams/:id/tactics', async (req, res) => {
    try {
        const { newFormation, newStyle } = req.body;
        await sql.connect(config);
        await sql.query(`UPDATE Team SET formation = '${newFormation}', teamStyle = '${newStyle}' WHERE teamID = ${req.params.id}`);
        res.json({ message: "Tactics updated successfully!" });
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-03
app.post('/api/transfers/buy', async (req, res) => {
    try {
        const { teamId, playerId, cost } = req.body;
        await sql.connect(config);
        await sql.query(`UPDATE Team SET transferBudget = transferBudget - ${cost} WHERE teamID = ${teamId}`);
        await sql.query(`UPDATE Player SET teamID = ${teamId}, squadRole = 'Bench' WHERE playerID = ${playerId}`);

        res.json({ message: "Transfer successful!" });
    } catch (err) { res.status(500).send(err.message); }
});

// UC-04
app.put('/api/teams/:id/training', async (req, res) => {
    try {
        await sql.connect(config);
        await sql.query(`UPDATE Player SET morale = 100 WHERE teamID = ${req.params.id}`);
        res.json({ message: "Training complete. Squad morale is maximized!" });
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-06
app.post('/api/game/advance-week', async (req, res) => {
    try {
        await sql.connect(config);
        await sql.query(`UPDATE Player SET stamina = 100`);
        res.json({ message: "Week advanced. Stamina restored." });
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-08
app.post('/api/teams/:id/facilities/upgrade', async (req, res) => {
    try {
        const { cost } = req.body;
        await sql.connect(config);
        await sql.query(`UPDATE Team SET transferBudget = transferBudget - ${cost} WHERE teamID = ${req.params.id}`);
        res.json({ message: "Facility upgraded!" });
    } catch (err) { res.status(500).send("Server Error"); }
});

// UC-09
app.post('/api/matches/simulate', async (req, res) => {
    try {
        const { homeTeamId, awayTeamId, homeGoals, awayGoals } = req.body;
        await sql.connect(config);

        if (homeGoals > awayGoals) {
            await sql.query(`UPDATE Team SET points = points + 3, goalDifference = goalDifference + (${homeGoals} - ${awayGoals}) WHERE teamID = ${homeTeamId}`);
            await sql.query(`UPDATE Team SET goalDifference = goalDifference - (${homeGoals} - ${awayGoals}) WHERE teamID = ${awayTeamId}`);
        } else if (awayGoals > homeGoals) {
            await sql.query(`UPDATE Team SET points = points + 3, goalDifference = goalDifference + (${awayGoals} - ${homeGoals}) WHERE teamID = ${awayTeamId}`);
            await sql.query(`UPDATE Team SET goalDifference = goalDifference - (${awayGoals} - ${homeGoals}) WHERE teamID = ${homeTeamId}`);
        } else {
            // Draw
            await sql.query(`UPDATE Team SET points = points + 1 WHERE teamID IN (${homeTeamId}, ${awayTeamId})`);
        }
        res.json({ message: "Match Simulated and Standings Updated!" });
    } catch (err) { res.status(500).send(err.message); }
});

// UC-10 Placeholder
app.post('/api/transfers/ai-process', async (req, res) => {
    try {
        res.json({ message: "AI Teams have conducted their transfer business." });
    } catch (err) { res.status(500).send("Server Error"); }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Pitch Logic API running on http://localhost:${PORT}`);
});