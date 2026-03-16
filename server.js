const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static frontend files
app.use(express.static(path.join(__dirname)));

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
        const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
        
        stmt.run(username, hashedPassword, function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }
            res.status(201).json({ message: 'User registered successfully', userId: this.lastID });
        });
        stmt.finalize();
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(401).json({ error: 'Invalid username or password' });

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid username or password' });

        // In a real production app, use JWT. Here we just return the user ID to store in localStorage for simplicity.
        res.json({ message: 'Login successful', user: { id: user.id, username: user.username } });
    });
});

// Forgot Password (Mock Reset - just updating password directly)
app.post('/api/reset-password', async (req, res) => {
    const { username, newPassword } = req.body;
    if (!username || !newPassword) {
        return res.status(400).json({ error: 'Username and new password required' });
    }

    db.get('SELECT id FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, user.id], function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ message: 'Password reset successful' });
        });
    });
});

// =======================
// BILL MANAGEMENT ROUTES
// =======================

// Save a bill
app.post('/api/bills', (req, res) => {
    const { userId, invoiceName, date, clientName, title, rows } = req.body;
    if (!userId || !invoiceName) {
        return res.status(400).json({ error: 'User ID and Invoice Name required' });
    }

    // Check if a bill with this name already exists for this user to update it, otherwise insert new
    db.get('SELECT id FROM bills WHERE user_id = ? AND invoice_name = ?', [userId, invoiceName], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        const rowsJson = JSON.stringify(rows);

        if (row) {
            // Update existing
            db.run(
                'UPDATE bills SET date = ?, client_name = ?, title = ?, rows_json = ? WHERE id = ?',
                [date, clientName, title, rowsJson, row.id],
                function(err) {
                    if (err) return res.status(500).json({ error: 'Failed to update bill' });
                    res.json({ message: 'Bill updated successfully', billId: row.id });
                }
            );
        } else {
            // Insert new
            db.run(
                'INSERT INTO bills (user_id, invoice_name, date, client_name, title, rows_json) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, invoiceName, date, clientName, title, rowsJson],
                function(err) {
                    if (err) return res.status(500).json({ error: 'Failed to save bill' });
                    res.json({ message: 'Bill saved successfully', billId: this.lastID });
                }
            );
        }
    });
});

// Get all bills for a user
app.get('/api/bills/:userId', (req, res) => {
    const userId = req.params.userId;
    db.all('SELECT id, invoice_name, date, client_name, title FROM bills WHERE user_id = ? ORDER BY id DESC', [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Get specific bill by name for a user
app.get('/api/bills/:userId/:invoiceName', (req, res) => {
    const { userId, invoiceName } = req.params;
    db.get('SELECT * FROM bills WHERE user_id = ? AND invoice_name = ?', [userId, invoiceName], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Bill not found' });
        
        row.rows = JSON.parse(row.rows_json);
        delete row.rows_json;
        res.json(row);
    });
});

// Delete a bill
app.delete('/api/bills/:userId/:invoiceName', (req, res) => {
    const { userId, invoiceName } = req.params;
    db.run('DELETE FROM bills WHERE user_id = ? AND invoice_name = ?', [userId, invoiceName], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Bill deleted successfully' });
    });
});

// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
