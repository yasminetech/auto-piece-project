DROP DATABASE IF EXISTS autopiece_db;
CREATE DATABASE autopiece_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE autopiece_db;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    quantity INT NOT NULL DEFAULT 0,
    supplierId INT,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplierId) REFERENCES suppliers(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_products_category (category),
    INDEX idx_products_name (name)
) ENGINE=InnoDB;

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT,
    paymentMethod VARCHAR(80) DEFAULT 'cash',
    status VARCHAR(50) DEFAULT 'pending',
    total DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_orders_user (userId),
    INDEX idx_orders_status (status)
) ENGINE=InnoDB;

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orderId INT,
    productId INT,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    FOREIGN KEY (orderId) REFERENCES orders(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_order_items_order (orderId),
    INDEX idx_order_items_product (productId)
) ENGINE=InnoDB;

CREATE TABLE movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    productId INT,
    type VARCHAR(50),
    quantity INT NOT NULL DEFAULT 0,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (productId) REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    INDEX idx_movements_product (productId),
    INDEX idx_movements_created_at (created_at)
) ENGINE=InnoDB;

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
        ON DELETE CASCADE,
    INDEX idx_product_media_product (productId),
    INDEX idx_product_media_kind (kind)
) ENGINE=InnoDB;

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
    UNIQUE KEY uniq_product_user_review (productId, userId),
    INDEX idx_product_reviews_product_visible (productId, isVisible),
    INDEX idx_product_reviews_user (userId)
) ENGINE=InnoDB;

-- Password for both seed accounts: 123456
INSERT INTO users (username, password, role) VALUES
('flan', '$2b$08$Nhkzxk/aOhOnlnzL5EnO5unhtPiIAaHmnxk.UebKIY5fi7L1/gFV2', 'user'),
('admin', '$2b$08$Nhkzxk/aOhOnlnzL5EnO5unhtPiIAaHmnxk.UebKIY5fi7L1/gFV2', 'admin');

INSERT INTO suppliers (name, contact) VALUES
('Auto Distribution Europe', 'supply@ade.example'),
('Garage Parts Nord', 'contact@gpn.example'),
('Turbo Maroc Parts', 'turbo@tmp.example');

INSERT INTO products (name, description, price, quantity, supplierId, category) VALUES
('Filtre a huile Bosch', 'Filtre moteur compatible citadines essence et diesel recentes.', 12.90, 24, 1, 'Filtres'),
('Plaquettes de frein avant', 'Jeu de plaquettes haute resistance pour freinage quotidien.', 38.50, 12, 2, 'Freinage'),
('Batterie 12V 60Ah', 'Batterie sans entretien avec bonne tenue au demarrage a froid.', 96.00, 8, 1, 'Electricite'),
('Amortisseur arriere', 'Amortisseur hydraulique pour conduite stable sur route degradee.', 72.75, 6, 2, 'Suspension'),
('Bougie allumage iridium', 'Bougie longue duree pour moteur essence performant.', 9.80, 32, 1, 'Moteur'),
('Courroie accessoire', 'Courroie striee resistant aux variations de temperature.', 21.40, 0, 3, 'Moteur');

INSERT INTO movements (productId, type, quantity, description) VALUES
(1, 'entry', 24, 'Stock initial'),
(2, 'entry', 12, 'Stock initial'),
(3, 'entry', 8, 'Stock initial'),
(4, 'entry', 6, 'Stock initial'),
(5, 'entry', 32, 'Stock initial'),
(6, 'entry', 0, 'Stock initial');

INSERT INTO product_reviews (productId, userId, rating, comment, isVisible) VALUES
(1, 1, 5, 'Montage propre, livraison rapide et tres bon rapport qualite prix.', 1),
(2, 1, 4, 'Freinage rassurant apres installation, finition solide.', 1),
(3, 2, 5, 'Reference fiable pour les depannages atelier et les demandes clients urgentes.', 1);
