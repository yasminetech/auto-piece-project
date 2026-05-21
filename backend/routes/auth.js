const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('../data/store');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

// Register
router.post('/register', async (req, res) => {
    const { username, password, role } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const userExists = store.users.find(u => u.username === username);
    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    const newUser = {
        id: (store.users.length + 1).toString(),
        username,
        password: hashedPassword,
        role: role || 'user'
    };

    store.users.push(newUser);
    res.status(201).json({ message: 'User created successfully' });
});

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = store.users.find(u => u.username === username);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.status(200).json({
        id: user.id,
        username: user.username,
        role: user.role,
        accessToken: token
    });
});

module.exports = router;
