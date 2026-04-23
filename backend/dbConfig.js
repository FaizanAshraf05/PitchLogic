const sql = require('mssql');

const config = {
    user: 'sa', 
    password: 'PitchLogic123',
    server: 'localhost', 
    database: 'Pitch_Logic',
    port: 1433,
    options: {
        encrypt: false, 
        trustServerCertificate: true
    }
};

module.exports = config;