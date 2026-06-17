const express = require('express');
const router = express.Router();
const { query, queryOne, update, pool } = require('../config/dbHelper');
const { verifyToken, isAdmin } = require('../middleware/authJwt');

function normalizeOrderItem(item) {
    return {
        productId: String(item.productId),
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0)
    };
}

function normalizeOrder(order, items = []) {
    return {
        id: String(order.id),
        userId: String(order.userId),
        username: order.username,
        items,
        paymentMethod: order.paymentMethod || 'cash',
        status: order.status || 'pending',
        total: Number(order.total || 0),
        date: order.created_at ? new Date(order.created_at).toISOString() : new Date().toISOString()
    };
}

async function getItemsByOrderIds(orderIds) {
    if (orderIds.length === 0) return new Map();

    const placeholders = orderIds.map(() => '?').join(',');
    const rows = await query(
        `SELECT orderId, productId, quantity, price FROM order_items WHERE orderId IN (${placeholders}) ORDER BY id ASC`,
        orderIds
    );
    const grouped = new Map();

    rows.forEach((row) => {
        const orderId = String(row.orderId);
        if (!grouped.has(orderId)) grouped.set(orderId, []);
        grouped.get(orderId).push(normalizeOrderItem(row));
    });

    return grouped;
}

// Place order
router.post('/', [verifyToken], async (req, res) => {
    const { paymentMethod = 'cash' } = req.body;
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    if (items.length === 0) {
        return res.status(400).json({ message: 'Order items are required' });
    }

    const normalizedItems = items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity)
    }));

    if (normalizedItems.some((item) => !item.productId || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
        return res.status(400).json({ message: 'Every order item needs a valid product and quantity' });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        let total = 0;
        const products = [];

        for (const item of normalizedItems) {
            const [rows] = await connection.execute('SELECT * FROM products WHERE id = ? FOR UPDATE', [item.productId]);
            const product = rows[0];

            if (!product || Number(product.quantity) < item.quantity) {
                await connection.rollback();
                return res.status(400).json({
                    message: `Insufficient stock for product ${product ? product.name : item.productId}`
                });
            }

            total += Number(product.price) * item.quantity;
            products.push(product);
        }

        let orderResult;
        try {
            const [result] = await connection.execute(
                'INSERT INTO orders (userId, status, total, paymentMethod) VALUES (?, ?, ?, ?)',
                [req.userId, 'pending', total, paymentMethod]
            );
            orderResult = result;
        } catch (error) {
            if (error.code !== 'ER_BAD_FIELD_ERROR') throw error;

            const [fallbackResult] = await connection.execute(
                'INSERT INTO orders (userId, status, total) VALUES (?, ?, ?)',
                [req.userId, 'pending', total]
            );
            orderResult = fallbackResult;
        }

        for (const item of normalizedItems) {
            const product = products.find((entry) => String(entry.id) === String(item.productId));

            await connection.execute(
                'INSERT INTO order_items (orderId, productId, quantity, price) VALUES (?, ?, ?, ?)',
                [orderResult.insertId, item.productId, item.quantity, product.price]
            );

            await connection.execute(
                'UPDATE products SET quantity = quantity - ? WHERE id = ?',
                [item.quantity, item.productId]
            );

            await connection.execute(
                'INSERT INTO movements (productId, type, quantity, description) VALUES (?, ?, ?, ?)',
                [item.productId, 'exit', item.quantity, `Order #${orderResult.insertId} placed by user ${req.userId}`]
            );
        }

        await connection.commit();

        res.status(201).json(normalizeOrder(
            {
                id: orderResult.insertId,
                userId: req.userId,
                paymentMethod,
                status: 'pending',
                total,
                created_at: new Date()
            },
            normalizedItems.map((item) => normalizeOrderItem({ ...item, price: products.find((entry) => String(entry.id) === String(item.productId)).price }))
        ));
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
});

// Get user orders
router.get('/', [verifyToken], async (req, res) => {
    try {
        const orders = await query(
            'SELECT * FROM orders WHERE userId = ? ORDER BY created_at DESC',
            [req.userId]
        );
        const orderIds = orders.map((order) => order.id);
        const itemsByOrder = await getItemsByOrderIds(orderIds);

        res.json(orders.map((order) => normalizeOrder(order, itemsByOrder.get(String(order.id)) || [])));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all orders (Admin only)
router.get('/all', [verifyToken, isAdmin], async (req, res) => {
    try {
        const orders = await query(
            'SELECT o.*, u.username FROM orders o LEFT JOIN users u ON o.userId = u.id ORDER BY o.created_at DESC'
        );
        const orderIds = orders.map((order) => order.id);
        const itemsByOrder = await getItemsByOrderIds(orderIds);

        res.json(orders.map((order) => normalizeOrder(order, itemsByOrder.get(String(order.id)) || [])));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update order status (Admin only)
router.put('/:id/status', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { status } = req.body;
        const order = await queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        await update('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
        const itemsByOrder = await getItemsByOrderIds([req.params.id]);
        res.json(normalizeOrder({ ...order, status }, itemsByOrder.get(String(req.params.id)) || []));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Cancel order
router.put('/:id/cancel', [verifyToken], async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [orderRows] = await connection.execute(
            'SELECT * FROM orders WHERE id = ? AND userId = ? FOR UPDATE',
            [req.params.id, req.userId]
        );
        const order = orderRows[0];

        if (!order) {
            await connection.rollback();
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status === 'cancelled') {
            await connection.rollback();
            return res.status(400).json({ message: 'Order already cancelled' });
        }

        await connection.execute('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', req.params.id]);

        const [orderItems] = await connection.execute('SELECT * FROM order_items WHERE orderId = ?', [req.params.id]);
        for (const item of orderItems) {
            await connection.execute(
                'UPDATE products SET quantity = quantity + ? WHERE id = ?',
                [item.quantity, item.productId]
            );
            await connection.execute(
                'INSERT INTO movements (productId, type, quantity, description) VALUES (?, ?, ?, ?)',
                [item.productId, 'entry', item.quantity, `Order #${req.params.id} cancelled`]
            );
        }

        await connection.commit();
        res.json(normalizeOrder({ ...order, status: 'cancelled' }, orderItems.map(normalizeOrderItem)));
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
