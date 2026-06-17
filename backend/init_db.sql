-- Create Database
CREATE DATABASE IF NOT EXISTS autopiece_db;
USE autopiece_db;

-- Create tables
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2),
    quantity INT DEFAULT 0,
    supplierId INT,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplierId) REFERENCES suppliers(id)
);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT,
    paymentMethod VARCHAR(80) DEFAULT 'cash',
    status VARCHAR(50) DEFAULT 'pending',
    total DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId INT,
    productId INT,
    quantity INT,
    price DECIMAL(10, 2),
    FOREIGN KEY (orderId) REFERENCES orders(id),
    FOREIGN KEY (productId) REFERENCES products(id)
);

CREATE TABLE movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    productId INT,
    type VARCHAR(50),
    quantity INT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (productId) REFERENCES products(id)
);

CREATE TABLE product_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    productId INT NOT NULL,
    kind ENUM('image', 'video') NOT NULL DEFAULT 'image',
    url VARCHAR(500) NOT NULL,
    altText VARCHAR(255),
    sortOrder INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (productId) REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE product_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    productId INT NOT NULL,
    userId INT NOT NULL,
    rating TINYINT NOT NULL,
    comment TEXT,
    isVisible TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (productId) REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    UNIQUE KEY uniq_product_user_review (productId, userId)
);

-- Insert test data - Users (passwords are hashed with bcrypt)
-- User: flan / password: 123456 (pre-hashed)
INSERT INTO users (username, password, role) VALUES 
('flan', '$2b$08$Nhkzxk/aOhOnlnzL5EnO5unhtPiIAaHmnxk.UebKIY5fi7L1/gFV2', 'user'),
('admin', '$2b$08$Nhkzxk/aOhOnlnzL5EnO5unhtPiIAaHmnxk.UebKIY5fi7L1/gFV2', 'admin');

-- Insert test suppliers
INSERT INTO suppliers (name, contact) VALUES 
('Auto Distribution Europe', 'supply@ade.example'),
('Garage Parts Nord', 'contact@gpn.example');

-- Insert test products
INSERT INTO products (name, description, price, quantity, supplierId, category) VALUES 
('Filtre a huile Bosch', 'Filtre moteur compatible citadines essence et diesel recentes.', 12.90, 24, 1, 'Filtres'),
('Plaquettes de frein avant', 'Jeu de plaquettes haute resistance pour freinage quotidien.', 38.50, 12, 2, 'Freinage'),
('Batterie 12V 60Ah', 'Batterie sans entretien avec bonne tenue au demarrage a froid.', 96.00, 8, 1, 'Electricite');

INSERT INTO product_reviews (productId, userId, rating, comment, isVisible) VALUES
(1, 1, 5, 'Montage propre, livraison rapide et tres bon rapport qualite prix.', 1),
(2, 1, 4, 'Freinage rassurant apres installation, finition solide.', 1),
(3, 2, 5, 'Reference fiable pour les depannages atelier et les demandes clients urgentes.', 1);

-- Test query
SELECT 'Database setup completed!' as status;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as product_count FROM products;
SELECT COUNT(*) as supplier_count FROM suppliers;
