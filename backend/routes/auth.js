const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, insert } = require('../config/dbHelper');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

function normalizeUser(user, token) {
    return {
        id: String(user.id),
        username: user.username,
        role: user.role || 'user',
        accessToken: token
    };
}

// Register
router.post('/register', async (req, res) => {
    const { username, password, email } = req.body;
    const identifier = String(username || email || '').trim();

    if (!identifier || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const userExists = await queryOne('SELECT id FROM users WHERE username = ?', [identifier]);
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 8);
        const result = await insert(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [identifier, hashedPassword, 'user']
        );

        res.status(201).json({
            message: 'User created successfully',
            userId: String(result.insertId)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { username, email, password } = req.body;
    const identifier = String(username || email || '').trim();

    if (!identifier || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const user = await queryOne('SELECT id, username, password, role FROM users WHERE username = ?', [identifier]);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json(normalizeUser(user, token));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
