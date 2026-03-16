require('dotenv').config();
const { Pool } = require('pg');

// Use the connection string from Render/Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Neon and many managed PostgreSQL providers
    }
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error acquiring client', err.stack);
        return;
    }
    console.log('Connected to PostgreSQL Database Successfully!');
    
    // Initialize Tables using PostgreSQL syntax (SERIAL instead of AUTOINCREMENT)
    client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bills (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            invoice_name TEXT NOT NULL,
            date TEXT,
            client_name TEXT,
            title TEXT,
            rows_json TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
    `, (err, result) => {
        release();
        if (err) {
            console.error('Error executing DB init query', err.stack);
        } else {
            console.log('PostgreSQL tables verified.');
        }
    });
});

module.exports = {
    // Helper to run queries like db.run or db.get but for PostgreSQL
    query: (text, params) => pool.query(text, params),
};
