const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { verifyToken, isAdmin } = require('../middleware/authJwt');

// Get dashboard stats (Admin only)
router.get('/stats', [verifyToken, isAdmin], (req, res) => {
    const totalProducts = store.products.length;
    const outOfStock = store.products.filter(p => p.quantity === 0).length;
    const recentMovements = store.movements.slice(-5).reverse();
    const totalOrders = store.orders.length;

    res.json({
        totalProducts,
        outOfStock,
        totalOrders,
        recentMovements
    });
});

module.exports = router;
