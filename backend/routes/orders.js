const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { verifyToken, isAdmin } = require('../middleware/authJwt');

// Place order
router.post('/', [verifyToken], (req, res) => {
    const { items, paymentMethod } = req.body; // items: [{ productId, quantity }]
    
    // Check stock and update
    for (const item of items) {
        const product = store.products.find(p => p.id === item.productId);
        if (!product || product.quantity < item.quantity) {
            return res.status(400).json({ message: `Insufficient stock for product ${product ? product.name : item.productId}` });
        }
    }

    // Deduct stock and log movements
    items.forEach(item => {
        const product = store.products.find(p => p.id === item.productId);
        product.quantity -= item.quantity;
        
        store.movements.push({
            id: (store.movements.length + 1).toString(),
            productId: item.productId,
            type: 'exit',
            quantity: item.quantity,
            date: new Date().toISOString(),
            description: `Order placed by user ${req.userId}`
        });
    });

    const newOrder = {
        id: (store.orders.length + 1).toString(),
        userId: req.userId,
        items,
        paymentMethod,
        status: 'pending',
        date: new Date().toISOString()
    };
    store.orders.push(newOrder);

    res.status(201).json(newOrder);
});

// Get user orders
router.get('/', [verifyToken], (req, res) => {
    const userOrders = store.orders.filter(o => o.userId === req.userId);
    res.json(userOrders);
});

// Get all orders (Admin only)
router.get('/all', [verifyToken, isAdmin], (req, res) => {
    res.json(store.orders);
});

// Update order status (Admin only)
router.put('/:id/status', [verifyToken, isAdmin], (req, res) => {
    const { status } = req.body;
    const order = store.orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    res.json(order);
});

// Cancel order
router.put('/:id/cancel', [verifyToken], (req, res) => {
    const order = store.orders.find(o => o.id === req.params.id && o.userId === req.userId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status === 'cancelled') return res.status(400).json({ message: 'Order already cancelled' });

    order.status = 'cancelled';

    // Return stock
    order.items.forEach(item => {
        const product = store.products.find(p => p.id === item.productId);
        if (product) {
            product.quantity += item.quantity;
            store.movements.push({
                id: (store.movements.length + 1).toString(),
                productId: item.productId,
                type: 'entry',
                quantity: item.quantity,
                date: new Date().toISOString(),
                description: `Order ${order.id} cancelled`
            });
        }
    });

    res.json(order);
});

module.exports = router;
