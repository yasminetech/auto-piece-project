const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { verifyToken, isAdmin } = require('../middleware/authJwt');


router.get('/', (req, res) => {
    const { search, category } = req.query;
    let products = store.products;

    if (search) {
        products = products.filter(p => 
            p.name.toLowerCase().includes(search.toLowerCase()) || 
            p.description.toLowerCase().includes(search.toLowerCase())
        );
    }

    if (category) {
        products = products.filter(p => p.category === category);
    }

    res.json(products);
});

// Get single product
router.get('/:id', (req, res) => {
    const product = store.products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
});

// Create product (Admin only)
router.post('/', [verifyToken, isAdmin], (req, res) => {
    const { name, description, price, quantity, supplierId, category } = req.body;
    const newProduct = {
        id: (store.products.length + 1).toString(),
        name,
        description,
        price,
        quantity,
        supplierId,
        category
    };
    store.products.push(newProduct);
    
    // Log movement
    store.movements.push({
        id: (store.movements.length + 1).toString(),
        productId: newProduct.id,
        type: 'entry',
        quantity,
        date: new Date().toISOString(),
        description: 'New product added'
    });

    res.status(201).json(newProduct);
});

// Update product (Admin only)
router.put('/:id', [verifyToken, isAdmin], (req, res) => {
    const index = store.products.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'Product not found' });

    const updatedProduct = { ...store.products[index], ...req.body };
    store.products[index] = updatedProduct;
    res.json(updatedProduct);
});

// Delete product (Admin only)
router.delete('/:id', [verifyToken, isAdmin], (req, res) => {
    const index = store.products.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'Product not found' });

    store.products.splice(index, 1);
    res.json({ message: 'Product deleted successfully' });
});

module.exports = router;
