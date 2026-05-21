const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('../data/store');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

// Register
router.post('/register', async (req, res) => {
    const { username, password, email, phone } = req.body;
    
    if (!email || !password || !username) {
        return res.status(400).json({ message: 'Email, username and password are required' });
    }

    const userExists = store.users.find(u => u.email === email);
    if (userExists) {
        return res.status(400).json({ message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    const newUser = {
        id: Date.now().toString(),
        username,
        email,
        phone: phone || '',
        password: hashedPassword,
        role: 'user' // Force role to user for public registration
    };

    store.users.push(newUser);
    res.status(201).json({ message: 'User created successfully' });
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = store.users.find(u => u.email === email);
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
