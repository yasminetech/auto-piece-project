const express = require('express');
const router = express.Router();
const { query, queryOne, insert, update, deleteQuery } = require('../config/dbHelper');
const { verifyToken, isAdmin } = require('../middleware/authJwt');

// Place order
router.post('/', [verifyToken], async (req, res) => {
    try {
        const { items, paymentMethod } = req.body; // items: [{ productId, quantity }]
        const normalizedPaymentMethod = paymentMethod ?? 'cash';
        
        // Check stock for all items
        for (const item of items) {
            const product = await queryOne('SELECT * FROM products WHERE id = ?', [item.productId]);
            if (!product || product.quantity < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for product ${product ? product.name : item.productId}` });
            }
        }

        // Create order
        let total = 0;
        for (const item of items) {
            const product = await queryOne('SELECT price FROM products WHERE id = ?', [item.productId]);
            total += (product.price * item.quantity);
        }

        const orderResult = await insert(
            'INSERT INTO orders (userId, status, total) VALUES (?, ?, ?)',
            [req.userId, 'pending', total]
        );

        // Add order items and update stock
        for (const item of items) {
            const product = await queryOne('SELECT price FROM products WHERE id = ?', [item.productId]);
            await insert(
                'INSERT INTO order_items (orderId, productId, quantity, price) VALUES (?, ?, ?, ?)',
                [orderResult.insertId, item.productId, item.quantity, product.price]
            );

            // Update product stock
            await update(
                'UPDATE products SET quantity = quantity - ? WHERE id = ?',
                [item.quantity, item.productId]
            );

            // Log movement
            await insert(
                'INSERT INTO movements (productId, type, quantity, description) VALUES (?, ?, ?, ?)',
                [item.productId, 'exit', item.quantity, `Order #${orderResult.insertId} placed by user ${req.userId}`]
            );
        }

        res.status(201).json({ id: orderResult.insertId, userId: req.userId, items, paymentMethod: normalizedPaymentMethod, status: 'pending', total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user orders
router.get('/', [verifyToken], async (req, res) => {
    try {
        const orders = await query(
            'SELECT *, created_at as date FROM orders WHERE userId = ? ORDER BY created_at DESC',
            [req.userId]
        );

        for (const order of orders) {
            order.items = await query('SELECT productId, quantity, price FROM order_items WHERE orderId = ?', [order.id]);
        }

        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all orders (Admin only)
router.get('/all', [verifyToken, isAdmin], async (req, res) => {
    try {
        const orders = await query(
            'SELECT o.*, u.username, o.created_at as date FROM orders o LEFT JOIN users u ON o.userId = u.id ORDER BY o.created_at DESC'
        );

        for (const order of orders) {
            order.items = await query('SELECT productId, quantity, price FROM order_items WHERE orderId = ?', [order.id]);
        }

        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update order status (Admin only)
router.put('/:id/status', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }
        const order = await queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        await update('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ ...order, status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cancel order
router.put('/:id/cancel', [verifyToken], async (req, res) => {
    try {
        const order = await queryOne('SELECT * FROM orders WHERE id = ? AND userId = ?', [req.params.id, req.userId]);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.status === 'cancelled') return res.status(400).json({ message: 'Order already cancelled' });

        await update('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', req.params.id]);

        // Get order items and return stock
        const orderItems = await query('SELECT * FROM order_items WHERE orderId = ?', [req.params.id]);
        for (const item of orderItems) {
            await update(
                'UPDATE products SET quantity = quantity + ? WHERE id = ?',
                [item.quantity, item.productId]
            );
            await insert(
                'INSERT INTO movements (productId, type, quantity, description) VALUES (?, ?, ?, ?)',
                [item.productId, 'entry', item.quantity, `Order #${req.params.id} cancelled`]
            );
        }

        res.json({ ...order, status: 'cancelled' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
