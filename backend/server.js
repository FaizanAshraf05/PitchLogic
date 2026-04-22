const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const config = require('./dbConfig'); 

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/teams', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query('SELECT * FROM Team');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

app.get('/api/teams/:id/players', async (req, res) => {
    try {
        const teamId = req.params.id;
        await sql.connect(config);
        const result = await sql.query(`
            SELECT playerID, name, position, overallRating, marketValue 
            FROM Player 
            WHERE teamID = ${teamId}
            ORDER BY overallRating DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});


app.get('/api/transfer-market', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query(`
            SELECT playerID, name, position, overallRating, marketValue 
            FROM Player 
            WHERE teamID IS NULL
            ORDER BY overallRating DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Pitch Logic API running on http://localhost:${PORT}`);
});