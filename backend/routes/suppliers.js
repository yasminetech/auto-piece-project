const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { verifyToken, isAdmin } = require('../middleware/authJwt');

// Get all suppliers
router.get('/', [verifyToken], (req, res) => {
    res.json(store.suppliers);
});

// Create supplier (Admin only)
router.post('/', [verifyToken, isAdmin], (req, res) => {
    const { name, contact } = req.body;
    if (!name) return res.status(400).json({ message: 'Supplier name is required' });
    
    const newSupplier = {
        id: Date.now().toString(),
        name,
        contact
    };
    store.suppliers.push(newSupplier);
    res.status(201).json(newSupplier);
});

// Update supplier (Admin only)
router.put('/:id', [verifyToken, isAdmin], (req, res) => {
    const index = store.suppliers.findIndex(s => s.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'Supplier not found' });

    store.suppliers[index] = { ...store.suppliers[index], ...req.body };
    res.json(store.suppliers[index]);
});

// Delete supplier (Admin only)
router.delete('/:id', [verifyToken, isAdmin], (req, res) => {
    const index = store.suppliers.findIndex(s => s.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'Supplier not found' });

    store.suppliers.splice(index, 1);
    res.json({ message: 'Supplier deleted successfully' });
});

module.exports = router;
