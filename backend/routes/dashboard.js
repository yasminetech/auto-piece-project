const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../config/dbHelper');
const { verifyToken, isAdmin } = require('../middleware/authJwt');

function normalizeMovement(movement) {
    return {
        id: String(movement.id),
        productId: String(movement.productId),
        type: movement.type,
        quantity: Number(movement.quantity || 0),
        description: movement.description || '',
        date: movement.created_at ? new Date(movement.created_at).toISOString() : new Date().toISOString(),
        productName: movement.productName || ''
    };
}

// Get dashboard stats (Admin only)
router.get('/stats', [verifyToken, isAdmin], async (req, res) => {
    try {
        const totalProductsResult = await queryOne('SELECT COUNT(*) as count FROM products');
        const outOfStockResult = await queryOne('SELECT COUNT(*) as count FROM products WHERE quantity = 0');
        const totalOrdersResult = await queryOne('SELECT COUNT(*) as count FROM orders');
        const totalRevenueResult = await queryOne('SELECT SUM(total) as total FROM orders WHERE status != "cancelled"');
        
        const recentMovements = await query(
            'SELECT m.*, p.name as productName FROM movements m JOIN products p ON m.productId = p.id ORDER BY m.created_at DESC LIMIT 10'
        );

        const lowStockProducts = await query(
            'SELECT id, name, quantity FROM products WHERE quantity < 5 ORDER BY quantity ASC'
        );

        res.json({
            totalProducts: totalProductsResult.count,
            outOfStock: outOfStockResult.count,
            totalOrders: totalOrdersResult.count,
            totalRevenue: totalRevenueResult.total || 0,
            recentMovements: recentMovements.map(normalizeMovement),
            lowStockProducts: lowStockProducts.map((product) => ({
                id: String(product.id),
                name: product.name,
                quantity: Number(product.quantity || 0)
            }))
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
