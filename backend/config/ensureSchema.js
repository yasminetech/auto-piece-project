const pool = require('./database');

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_media (
      id INT AUTO_INCREMENT PRIMARY KEY,
      productId INT NOT NULL,
      kind ENUM('image', 'video') NOT NULL DEFAULT 'image',
      url VARCHAR(500) NOT NULL,
      altText VARCHAR(255),
      sortOrder INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_product_media_product
        FOREIGN KEY (productId) REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
      INDEX idx_product_media_product (productId),
      INDEX idx_product_media_kind (kind)
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      productId INT NOT NULL,
      userId INT NOT NULL,
      rating TINYINT NOT NULL,
      comment TEXT,
      isVisible TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_product_reviews_product
        FOREIGN KEY (productId) REFERENCES products(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
      CONSTRAINT fk_product_reviews_user
        FOREIGN KEY (userId) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
      UNIQUE KEY uniq_product_user_review (productId, userId),
      INDEX idx_product_reviews_product_visible (productId, isVisible),
      INDEX idx_product_reviews_user (userId)
    ) ENGINE=InnoDB
  `);
}

module.exports = ensureSchema;
