const express = require('express');
const router = express.Router();
const { query, queryOne, insert, update } = require('../config/dbHelper');
const { verifyToken, isAdmin } = require('../middleware/authJwt');

function normalizeProduct(product) {
    return {
        id: String(product.id),
        name: product.name,
        description: product.description || '',
        price: Number(product.price || 0),
        quantity: Number(product.quantity || 0),
        supplierId: product.supplierId == null ? '' : String(product.supplierId),
        category: product.category || ''
    };
}

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

// Get all stock movements (Admin only)
router.get('/movements', [verifyToken, isAdmin], async (req, res) => {
    try {
        const movements = await query(
            'SELECT m.*, p.name as productName FROM movements m JOIN products p ON m.productId = p.id ORDER BY m.created_at DESC LIMIT 50'
        );
        res.json(movements.map(normalizeMovement));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Manual stock adjustment (Admin only)
router.post('/adjust', [verifyToken, isAdmin], async (req, res) => {
    const { productId, type, description } = req.body;
    const quantity = Number(req.body.quantity);

    if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ message: 'Valid product and quantity are required' });
    }

    if (!['entry', 'exit'].includes(type)) {
        return res.status(400).json({ message: 'Invalid movement type' });
    }

    try {
        const product = await queryOne('SELECT * FROM products WHERE id = ?', [productId]);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        if (type === 'exit' && Number(product.quantity) < quantity) {
            return res.status(400).json({ message: 'Insufficient stock' });
        }

        if (type === 'entry') {
            await update('UPDATE products SET quantity = quantity + ? WHERE id = ?', [quantity, productId]);
        } else {
            await update('UPDATE products SET quantity = quantity - ? WHERE id = ?', [quantity, productId]);
        }

        const movementResult = await insert(
            'INSERT INTO movements (productId, type, quantity, description) VALUES (?, ?, ?, ?)',
            [productId, type, quantity, description || 'Manual adjustment']
        );

        const updatedProduct = await queryOne('SELECT * FROM products WHERE id = ?', [productId]);
        res.status(201).json({
            product: normalizeProduct(updatedProduct),
            movement: normalizeMovement({
                id: movementResult.insertId,
                productId,
                type,
                quantity,
                description: description || 'Manual adjustment',
                created_at: new Date()
            })
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get stock summary for all products
router.get('/summary', [verifyToken, isAdmin], async (req, res) => {
    try {
        const stock = await query(
            'SELECT id, name, quantity, category FROM products ORDER BY quantity ASC'
        );
        res.json(stock.map((item) => ({
            id: String(item.id),
            name: item.name,
            quantity: Number(item.quantity || 0),
            category: item.category || ''
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
