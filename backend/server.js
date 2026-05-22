const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const pool = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const supplierRoutes = require('./routes/suppliers');
const orderRoutes = require('./routes/orders');
const stockRoutes = require('./routes/stock');
const dashboardRoutes = require('./routes/dashboard');


app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/', (req, res) => {
    res.send('Auto-Piece API is running...');
});

// Graceful shutdown: close pool on process termination
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    await pool.end();
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
