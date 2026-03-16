const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config(); // Load variables from .env if present
const db = require('./db'); 

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Verify Database Connection Environment Variable is set
if (!process.env.DATABASE_URL) {
    console.warn("WARNING: DATABASE_URL is not set. The app will crash if it tries to connect to the DB.");
}

// =======================
// AUTHENTICATION ROUTES
// =======================

// Register
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Postgres uses $1, $2 for params and RETURNING to get the inserted id
        const result = await db.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
            [username, hashedPassword]
        );
        
        res.status(201).json({ message: 'User registered successfully', userId: result.rows[0].id });
    } catch (err) {
        if (err.code === '23505') { // Postgres unique violation error code
            return res.status(400).json({ error: 'Username already exists' });
        }
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) return res.status(401).json({ error: 'Invalid username or password' });

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid username or password' });

        res.json({ message: 'Login successful', user: { id: user.id, username: user.username } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Forgot Password
app.post('/api/reset-password', async (req, res) => {
    const { username, newPassword } = req.body;
    if (!username || !newPassword) {
        return res.status(400).json({ error: 'Username and new password required' });
    }

    try {
        const result = await db.query('SELECT id FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) return res.status(404).json({ error: 'User not found' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, user.id]);
        
        res.json({ message: 'Password reset successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// =======================
// BILL MANAGEMENT ROUTES
// =======================

// Save a bill
app.post('/api/bills', async (req, res) => {
    const { userId, invoiceName, date, clientName, title, rows } = req.body;
    if (!userId || !invoiceName) {
        return res.status(400).json({ error: 'User ID and Invoice Name required' });
    }

    try {
        // Check if exists
        const checkResult = await db.query(
            'SELECT id FROM bills WHERE user_id = $1 AND invoice_name = $2', 
            [userId, invoiceName]
        );
        
        const rowsJson = JSON.stringify(rows);

        if (checkResult.rows.length > 0) {
            // Update existing
            const rowId = checkResult.rows[0].id;
            await db.query(
                'UPDATE bills SET date = $1, client_name = $2, title = $3, rows_json = $4 WHERE id = $5',
                [date, clientName, title, rowsJson, rowId]
            );
            res.json({ message: 'Bill updated successfully', billId: rowId });
        } else {
            // Insert new
            const insertResult = await db.query(
                `INSERT INTO bills (user_id, invoice_name, date, client_name, title, rows_json) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [userId, invoiceName, date, clientName, title, rowsJson]
            );
            res.json({ message: 'Bill saved successfully', billId: insertResult.rows[0].id });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get all bills for a user
app.get('/api/bills/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const result = await db.query(
            'SELECT id, invoice_name, date, client_name, title FROM bills WHERE user_id = $1 ORDER BY id DESC', 
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get specific bill by name for a user
app.get('/api/bills/:userId/:invoiceName', async (req, res) => {
    const { userId, invoiceName } = req.params;
    try {
        const result = await db.query(
            'SELECT * FROM bills WHERE user_id = $1 AND invoice_name = $2', 
            [userId, invoiceName]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ error: 'Bill not found' });
        
        const row = result.rows[0];
        row.rows = JSON.parse(row.rows_json);
        delete row.rows_json;
        res.json(row);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Delete a bill
app.delete('/api/bills/:userId/:invoiceName', async (req, res) => {
    const { userId, invoiceName } = req.params;
    try {
        await db.query(
            'DELETE FROM bills WHERE user_id = $1 AND invoice_name = $2', 
            [userId, invoiceName]
        );
        res.json({ message: 'Bill deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
