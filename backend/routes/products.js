const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const router = express.Router();
const { query, queryOne, insert, update, deleteQuery } = require('../config/dbHelper');
const { verifyToken, isAdmin } = require('../middleware/authJwt');
const { uploadProductMedia, UPLOAD_ROOT } = require('../middleware/uploadMedia');

function normalizeProduct(product) {
    if (!product) return null;

    return {
        id: String(product.id),
        name: product.name,
        description: product.description || '',
        price: Number(product.price || 0),
        quantity: Number(product.quantity || 0),
        supplierId: product.supplierId == null ? '' : String(product.supplierId),
        supplierName: product.supplierName || '',
        category: product.category || '',
        primaryImage: product.primaryImage || '',
        ratingAverage: Number(product.ratingAverage || 0),
        reviewCount: Number(product.reviewCount || 0)
    };
}

function normalizeMediaItem(media) {
    return {
        id: String(media.id),
        productId: String(media.productId),
        kind: media.kind === 'video' ? 'video' : 'image',
        url: media.url,
        altText: media.altText || '',
        sortOrder: Number(media.sortOrder || 0)
    };
}

function normalizeReview(review) {
    return {
        id: String(review.id),
        productId: String(review.productId),
        userId: String(review.userId),
        username: review.username || '',
        rating: Number(review.rating || 0),
        comment: review.comment || '',
        isVisible: Boolean(review.isVisible),
        createdAt: review.created_at ? new Date(review.created_at).toISOString() : new Date().toISOString(),
        updatedAt: review.updated_at ? new Date(review.updated_at).toISOString() : new Date().toISOString()
    };
}

function toNullableId(value) {
    return value === undefined || value === null || value === '' ? null : value;
}

function validateProductPayload(payload, current = {}) {
    const next = {
        name: payload.name !== undefined ? String(payload.name).trim() : current.name,
        description: payload.description !== undefined ? String(payload.description).trim() : current.description,
        price: payload.price !== undefined ? Number(payload.price) : Number(current.price),
        quantity: payload.quantity !== undefined ? Number(payload.quantity) : Number(current.quantity),
        supplierId: payload.supplierId !== undefined ? toNullableId(payload.supplierId) : current.supplierId,
        category: payload.category !== undefined ? String(payload.category).trim() : current.category
    };

    if (!next.name || !next.category || !Number.isFinite(next.price) || !Number.isFinite(next.quantity)) {
        return null;
    }

    if (next.price < 0 || next.quantity < 0) {
        return null;
    }

    next.quantity = Math.floor(next.quantity);
    return next;
}

async function getProductMedia(productId) {
    const rows = await query(
        'SELECT id, productId, kind, url, altText, sortOrder FROM product_media WHERE productId = ? ORDER BY sortOrder ASC, id ASC',
        [productId]
    );

    return rows.map(normalizeMediaItem);
}

async function getVisibleReviews(productId) {
    const rows = await query(
        `SELECT r.*, u.username
         FROM product_reviews r
         JOIN users u ON u.id = r.userId
         WHERE r.productId = ? AND r.isVisible = 1
         ORDER BY r.updated_at DESC, r.created_at DESC`,
        [productId]
    );

    return rows.map(normalizeReview);
}

async function getProductWithSummary(productId) {
    return queryOne(
        `SELECT
            p.*,
            s.name AS supplierName,
            (
                SELECT pm.url
                FROM product_media pm
                WHERE pm.productId = p.id
                ORDER BY CASE WHEN pm.kind = 'image' THEN 0 ELSE 1 END, pm.sortOrder ASC, pm.id ASC
                LIMIT 1
            ) AS primaryImage,
            COALESCE((
                SELECT AVG(r.rating)
                FROM product_reviews r
                WHERE r.productId = p.id AND r.isVisible = 1
            ), 0) AS ratingAverage,
            (
                SELECT COUNT(*)
                FROM product_reviews r
                WHERE r.productId = p.id AND r.isVisible = 1
            ) AS reviewCount
         FROM products p
         LEFT JOIN suppliers s ON s.id = p.supplierId
         WHERE p.id = ?`,
        [productId]
    );
}

async function buildProductDetails(productId) {
    const product = await getProductWithSummary(productId);
    if (!product) return null;

    const [media, reviews, similarRows] = await Promise.all([
        getProductMedia(productId),
        getVisibleReviews(productId),
        query(
            `SELECT
                p.*,
                s.name AS supplierName,
                (
                    SELECT pm.url
                    FROM product_media pm
                    WHERE pm.productId = p.id
                    ORDER BY CASE WHEN pm.kind = 'image' THEN 0 ELSE 1 END, pm.sortOrder ASC, pm.id ASC
                    LIMIT 1
                ) AS primaryImage,
                COALESCE((
                    SELECT AVG(r.rating)
                    FROM product_reviews r
                    WHERE r.productId = p.id AND r.isVisible = 1
                ), 0) AS ratingAverage,
                (
                    SELECT COUNT(*)
                    FROM product_reviews r
                    WHERE r.productId = p.id AND r.isVisible = 1
                ) AS reviewCount
             FROM products p
             LEFT JOIN suppliers s ON s.id = p.supplierId
             WHERE p.category = ? AND p.id <> ?
             ORDER BY p.quantity DESC, p.name ASC
             LIMIT 4`,
            [product.category, productId]
        )
    ]);

    return {
        ...normalizeProduct(product),
        media,
        reviews,
        similarProducts: similarRows.map(normalizeProduct)
    };
}

function extractLocalUploadPath(url) {
    if (typeof url !== 'string' || !url.startsWith('/uploads/products/')) {
        return null;
    }

    const relativePath = url.replace('/uploads/products/', '');
    const absolutePath = path.resolve(UPLOAD_ROOT, relativePath);
    return absolutePath.startsWith(UPLOAD_ROOT) ? absolutePath : null;
}

function runUpload(req, res) {
    return new Promise((resolve, reject) => {
        uploadProductMedia.array('media', 8)(req, res, (error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

router.get('/', async (req, res) => {
    try {
        const { search, category } = req.query;
        let sql = `
            SELECT
                p.*,
                s.name AS supplierName,
                (
                    SELECT pm.url
                    FROM product_media pm
                    WHERE pm.productId = p.id
                    ORDER BY CASE WHEN pm.kind = 'image' THEN 0 ELSE 1 END, pm.sortOrder ASC, pm.id ASC
                    LIMIT 1
                ) AS primaryImage,
                COALESCE((
                    SELECT AVG(r.rating)
                    FROM product_reviews r
                    WHERE r.productId = p.id AND r.isVisible = 1
                ), 0) AS ratingAverage,
                (
                    SELECT COUNT(*)
                    FROM product_reviews r
                    WHERE r.productId = p.id AND r.isVisible = 1
                ) AS reviewCount
            FROM products p
            LEFT JOIN suppliers s ON s.id = p.supplierId
        `;
        const params = [];

        if (search || category) {
            const conditions = [];
            if (search) {
                conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
                params.push(`%${search}%`, `%${search}%`);
            }
            if (category) {
                conditions.push('p.category = ?');
                params.push(category);
            }
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }

        sql += ' ORDER BY p.name ASC';

        const products = await query(sql, params);
        res.json(products.map(normalizeProduct));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/details/:id', async (req, res) => {
    try {
        const details = await buildProductDetails(req.params.id);
        if (!details) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(details);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/reviews/moderation/all', [verifyToken, isAdmin], async (_req, res) => {
    try {
        const rows = await query(
            `SELECT
                r.*,
                u.username,
                p.name AS productName
             FROM product_reviews r
             JOIN users u ON u.id = r.userId
             JOIN products p ON p.id = r.productId
             ORDER BY r.updated_at DESC, r.created_at DESC`
        );

        res.json(rows.map((review) => ({
            ...normalizeReview(review),
            productName: review.productName || ''
        })));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/:id/reviews', [verifyToken], async (req, res) => {
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || '').trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'La note doit etre comprise entre 1 et 5.' });
    }

    try {
        const product = await queryOne('SELECT id FROM products WHERE id = ?', [req.params.id]);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const existing = await queryOne(
            'SELECT id FROM product_reviews WHERE productId = ? AND userId = ?',
            [req.params.id, req.userId]
        );

        let reviewId = existing?.id;
        if (existing) {
            await update(
                'UPDATE product_reviews SET rating = ?, comment = ?, isVisible = 1 WHERE id = ?',
                [rating, comment, existing.id]
            );
        } else {
            const result = await insert(
                'INSERT INTO product_reviews (productId, userId, rating, comment, isVisible) VALUES (?, ?, ?, ?, ?)',
                [req.params.id, req.userId, rating, comment, 1]
            );
            reviewId = result.insertId;
        }

        const review = await queryOne(
            `SELECT r.*, u.username
             FROM product_reviews r
             JOIN users u ON u.id = r.userId
             WHERE r.id = ?`,
            [reviewId]
        );

        res.status(existing ? 200 : 201).json(normalizeReview(review));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.patch('/reviews/:reviewId', [verifyToken, isAdmin], async (req, res) => {
    try {
        const review = await queryOne('SELECT * FROM product_reviews WHERE id = ?', [req.params.reviewId]);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        const nextVisible =
            req.body.isVisible === undefined ? review.isVisible : req.body.isVisible ? 1 : 0;
        const nextComment =
            req.body.comment === undefined ? review.comment || '' : String(req.body.comment).trim();
        const nextRating =
            req.body.rating === undefined ? Number(review.rating) : Number(req.body.rating);

        if (!Number.isInteger(nextRating) || nextRating < 1 || nextRating > 5) {
            return res.status(400).json({ message: 'La note doit etre comprise entre 1 et 5.' });
        }

        await update(
            'UPDATE product_reviews SET rating = ?, comment = ?, isVisible = ? WHERE id = ?',
            [nextRating, nextComment, nextVisible, req.params.reviewId]
        );

        const updatedReview = await queryOne(
            `SELECT r.*, u.username, p.name AS productName
             FROM product_reviews r
             JOIN users u ON u.id = r.userId
             JOIN products p ON p.id = r.productId
             WHERE r.id = ?`,
            [req.params.reviewId]
        );

        res.json({
            ...normalizeReview(updatedReview),
            productName: updatedReview.productName || ''
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/reviews/:reviewId', [verifyToken, isAdmin], async (req, res) => {
    try {
        const review = await queryOne('SELECT id FROM product_reviews WHERE id = ?', [req.params.reviewId]);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        await deleteQuery('DELETE FROM product_reviews WHERE id = ?', [req.params.reviewId]);
        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/:id/media', [verifyToken, isAdmin], async (req, res) => {
    try {
        const product = await queryOne('SELECT id FROM products WHERE id = ?', [req.params.id]);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        await runUpload(req, res);

        const files = Array.isArray(req.files) ? req.files : [];
        if (files.length === 0) {
            return res.status(400).json({ message: 'Aucun fichier a televerser.' });
        }

        const existingCount = await queryOne(
            'SELECT COUNT(*) AS total FROM product_media WHERE productId = ?',
            [req.params.id]
        );
        let nextSortOrder = Number(existingCount?.total || 0);
        const createdItems = [];

        for (const file of files) {
            const kind = file.mimetype.startsWith('video/') ? 'video' : 'image';
            const url = `/uploads/products/${file.filename}`;
            const result = await insert(
                'INSERT INTO product_media (productId, kind, url, altText, sortOrder) VALUES (?, ?, ?, ?, ?)',
                [req.params.id, kind, url, file.originalname, nextSortOrder]
            );

            createdItems.push(normalizeMediaItem({
                id: result.insertId,
                productId: req.params.id,
                kind,
                url,
                altText: file.originalname,
                sortOrder: nextSortOrder
            }));

            nextSortOrder += 1;
        }

        res.status(201).json(createdItems);
    } catch (error) {
        res.status(400).json({ message: error.message || 'Upload media impossible' });
    }
});

router.delete('/media/:mediaId', [verifyToken, isAdmin], async (req, res) => {
    try {
        const media = await queryOne('SELECT * FROM product_media WHERE id = ?', [req.params.mediaId]);
        if (!media) {
            return res.status(404).json({ message: 'Media not found' });
        }

        await deleteQuery('DELETE FROM product_media WHERE id = ?', [req.params.mediaId]);

        const filePath = extractLocalUploadPath(media.url);
        if (filePath) {
            await fs.unlink(filePath).catch(() => null);
        }

        res.json({ message: 'Media deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const product = await getProductWithSummary(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(normalizeProduct(product));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/', [verifyToken, isAdmin], async (req, res) => {
    const payload = validateProductPayload(req.body);
    if (!payload) {
        return res.status(400).json({ message: 'Name, category, price and quantity are required' });
    }

    try {
        const result = await insert(
            'INSERT INTO products (name, description, price, quantity, supplierId, category) VALUES (?, ?, ?, ?, ?, ?)',
            [payload.name, payload.description, payload.price, payload.quantity, payload.supplierId, payload.category]
        );

        if (payload.quantity > 0) {
            await insert(
                'INSERT INTO movements (productId, type, quantity, description) VALUES (?, ?, ?, ?)',
                [result.insertId, 'entry', payload.quantity, 'New product added']
            );
        }

        const createdProduct = await getProductWithSummary(result.insertId);
        res.status(201).json(normalizeProduct(createdProduct));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/:id', [verifyToken, isAdmin], async (req, res) => {
    try {
        const product = await queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        const payload = validateProductPayload(req.body, product);
        if (!payload) {
            return res.status(400).json({ message: 'Invalid product data' });
        }

        await update(
            'UPDATE products SET name = ?, description = ?, price = ?, quantity = ?, supplierId = ?, category = ? WHERE id = ?',
            [payload.name, payload.description, payload.price, payload.quantity, payload.supplierId, payload.category, req.params.id]
        );

        const updatedProduct = await getProductWithSummary(req.params.id);
        res.json(normalizeProduct(updatedProduct));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/:id', [verifyToken, isAdmin], async (req, res) => {
    try {
        const product = await queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        const mediaItems = await query('SELECT url FROM product_media WHERE productId = ?', [req.params.id]);
        await deleteQuery('DELETE FROM product_media WHERE productId = ?', [req.params.id]);
        await deleteQuery('DELETE FROM product_reviews WHERE productId = ?', [req.params.id]);
        await deleteQuery('DELETE FROM movements WHERE productId = ?', [req.params.id]);
        await deleteQuery('DELETE FROM products WHERE id = ?', [req.params.id]);

        await Promise.all(
            mediaItems
                .map((item) => extractLocalUploadPath(item.url))
                .filter(Boolean)
                .map((filePath) => fs.unlink(filePath).catch(() => null))
        );

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ message: 'Product is linked to existing orders' });
        }

        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
