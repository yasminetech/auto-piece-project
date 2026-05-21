const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { verifyToken, isAdmin } = require('../middleware/authJwt');

// Get all stock movements (Admin only)
router.get('/movements', [verifyToken, isAdmin], (req, res) => {
    res.json(store.movements);
});

// Manual stock adjustment (Admin only)
router.post('/adjust', [verifyToken, isAdmin], (req, res) => {
    let { productId, quantity, type, description } = req.body; // type: 'entry' or 'exit'
    const product = store.products.find(p => p.id === productId);
    
    if (!product) return res.status(404).json({ message: 'Product not found' });

    quantity = Number(quantity);
    if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ message: 'Invalid quantity' });
    }

    if (type === 'entry') {
        product.quantity += quantity;
    } else if (type === 'exit') {
        if (product.quantity < quantity) {
            return res.status(400).json({ message: 'Insufficient stock' });
        }
        product.quantity -= quantity;
    } else {
        return res.status(400).json({ message: 'Invalid movement type' });
    }

    const movement = {
        id: Date.now().toString(),
        productId,
        type,
        quantity,
        date: new Date().toISOString(),
        description: description || 'Manual adjustment'
    };
    store.movements.push(movement);

    res.status(201).json({ product, movement });
});

module.exports = router;
