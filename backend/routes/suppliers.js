const express = require('express');
const router = express.Router();
const { query, queryOne, insert, update, deleteQuery } = require('../config/dbHelper');
const { verifyToken, isAdmin } = require('../middleware/authJwt');

function normalizeSupplier(supplier) {
    return {
        id: String(supplier.id),
        name: supplier.name,
        contact: supplier.contact || ''
    };
}

// Get all suppliers
router.get('/', [verifyToken], async (req, res) => {
    try {
        const suppliers = await query('SELECT * FROM suppliers ORDER BY name ASC');
        res.json(suppliers.map(normalizeSupplier));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create supplier (Admin only)
router.post('/', [verifyToken, isAdmin], async (req, res) => {
    const { name, contact } = req.body;
    const cleanName = String(name || '').trim();
    const cleanContact = String(contact || '').trim();

    if (!cleanName) {
        return res.status(400).json({ message: 'Supplier name is required' });
    }

    try {
        const result = await insert(
            'INSERT INTO suppliers (name, contact) VALUES (?, ?)',
            [cleanName, cleanContact]
        );
        res.status(201).json(normalizeSupplier({ id: result.insertId, name: cleanName, contact: cleanContact }));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update supplier (Admin only)
router.put('/:id', [verifyToken, isAdmin], async (req, res) => {
    try {
        const supplier = await queryOne('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        const cleanName = req.body.name !== undefined ? String(req.body.name).trim() : supplier.name;
        const cleanContact = req.body.contact !== undefined ? String(req.body.contact).trim() : supplier.contact;

        if (!cleanName) {
            return res.status(400).json({ message: 'Supplier name is required' });
        }

        await update(
            'UPDATE suppliers SET name = ?, contact = ? WHERE id = ?',
            [cleanName, cleanContact, req.params.id]
        );

        res.json(normalizeSupplier({ id: req.params.id, name: cleanName, contact: cleanContact }));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete supplier (Admin only)
router.delete('/:id', [verifyToken, isAdmin], async (req, res) => {
    try {
        const supplier = await queryOne('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        await update('UPDATE products SET supplierId = NULL WHERE supplierId = ?', [req.params.id]);
        await deleteQuery('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
        res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
