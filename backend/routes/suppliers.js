const express = require('express');
const router = express.Router();
const { query, queryOne, insert, update, deleteQuery } = require('../config/dbHelper');
const { verifyToken, isAdmin } = require('../middleware/authJwt');

// Get all suppliers
router.get('/', [verifyToken], async (req, res) => {
    try {
        const suppliers = await query('SELECT * FROM suppliers');
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create supplier (Admin only)
router.post('/', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { name, contact } = req.body;
        const supplier = {
            name,
            contact: contact ?? null
        };
        const result = await insert(
            'INSERT INTO suppliers (name, contact) VALUES (?, ?)',
            [supplier.name, supplier.contact]
        );
        res.status(201).json({ id: result.insertId, ...supplier });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update supplier (Admin only)
router.put('/:id', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { name, contact } = req.body;
        const supplier = await queryOne('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
        
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        const supplierUpdate = {
            name: name ?? supplier.name,
            contact: contact ?? supplier.contact ?? null
        };

        await update(
            'UPDATE suppliers SET name = ?, contact = ? WHERE id = ?',
            [supplierUpdate.name, supplierUpdate.contact, req.params.id]
        );

        res.json({ id: req.params.id, ...supplierUpdate });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete supplier (Admin only)
router.delete('/:id', [verifyToken, isAdmin], async (req, res) => {
    try {
        const supplier = await queryOne('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        await deleteQuery('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
        res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
