// backend/server.js
const express = require('express');
const { connectToDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.get('/test-db', async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT 1 AS number');
        res.status(200).send({
            message: "Database connected successfully!",
            result: result.recordset,
        });
    } catch (error) {
        res.status(500).send({ message: "Database connection failed", error });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
