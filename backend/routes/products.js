const express = require('express');
const router = express.Router();
const { query, queryOne, insert, update, deleteQuery } = require('../config/dbHelper');
const { verifyToken, isAdmin } = require('../middleware/authJwt');

// Get all products with search and filter
router.get('/', async (req, res) => {
    try {
        const { search, category } = req.query;
        let sql = 'SELECT * FROM products';
        const params = [];

        if (search || category) {
            const conditions = [];
            if (search) {
                conditions.push('(name LIKE ? OR description LIKE ?)');
                params.push(`%${search}%`, `%${search}%`);
            }
            if (category) {
                conditions.push('category = ?');
                params.push(category);
            }
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        const products = await query(sql, params);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single product
router.get('/:id', async (req, res) => {
    try {
        const product = await queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create product (Admin only)
<<<<<<< HEAD
router.post('/', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { name, description, price, quantity, supplierId, category } = req.body;
        
        const result = await insert(
            'INSERT INTO products (name, description, price, quantity, supplierId, category) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description, price, quantity, supplierId, category]
        );
        
        // Log movement
        await insert(
            'INSERT INTO movements (productId, type, quantity, description) VALUES (?, ?, ?, ?)',
            [result.insertId, 'entry', quantity, 'New product added']
        );
=======
router.post('/', [verifyToken, isAdmin], (req, res) => {
    const { name, description, price, quantity, supplierId, category } = req.body;
    
    if (!name || price === undefined || quantity === undefined) {
        return res.status(400).json({ message: 'Name, price and quantity are required' });
    }

    const newProduct = {
        id: Date.now().toString(),
        name,
        description,
        price: Number(price),
        quantity: Number(quantity),
        supplierId,
        category
    };
    store.products.push(newProduct);
    
    // Log movement
    store.movements.push({
        id: (store.movements.length + 1).toString(),
        productId: newProduct.id,
        type: 'entry',
        quantity: Number(quantity),
        date: new Date().toISOString(),
        description: 'New product added'
    });
>>>>>>> origin/ysmine

        res.status(201).json({ id: result.insertId, name, description, price, quantity, supplierId, category });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update product (Admin only)
router.put('/:id', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { name, description, price, quantity, supplierId, category } = req.body;
        const product = await queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
        
        if (!product) return res.status(404).json({ message: 'Product not found' });

        await update(
            'UPDATE products SET name = ?, description = ?, price = ?, quantity = ?, supplierId = ?, category = ? WHERE id = ?',
            [name || product.name, description || product.description, price || product.price, 
             quantity !== undefined ? quantity : product.quantity, supplierId || product.supplierId, 
             category || product.category, req.params.id]
        );

        res.json({ id: req.params.id, name, description, price, quantity, supplierId, category });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete product (Admin only)
router.delete('/:id', [verifyToken, isAdmin], async (req, res) => {
    try {
        const product = await queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        await deleteQuery('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
