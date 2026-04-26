-- Commissary Inventory & Recipe Management System Database Schema
-- Run this SQL script in phpMyAdmin or MySQL command line to create the database

CREATE DATABASE IF NOT EXISTS ikea_inventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ikea_inventory;

-- Table: inventory_items
CREATE TABLE IF NOT EXISTS inventory_items (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    min_stock_level DECIMAL(10, 2) NOT NULL,
    price_per_unit DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    last_updated DATETIME NOT NULL,
    INDEX idx_category (category),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: packaged_items
CREATE TABLE IF NOT EXISTS packaged_items (
    id VARCHAR(36) PRIMARY KEY,
    raw_inventory_item_id VARCHAR(36) NOT NULL,
    raw_item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    total_raw_quantity_used DECIMAL(10, 2) NOT NULL,
    raw_unit VARCHAR(20) NOT NULL,
    pack_size DECIMAL(10, 2) NOT NULL,
    pack_unit VARCHAR(20) NOT NULL,
    number_of_packs DECIMAL(10, 2) NOT NULL,
    packaging_date DATETIME NOT NULL,
    packaged_by VARCHAR(100),
    INDEX idx_raw_item (raw_inventory_item_id),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: purchases
CREATE TABLE IF NOT EXISTS purchases (
    id VARCHAR(36) PRIMARY KEY,
    batch_id VARCHAR(36) NULL,
    purchaser_id VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    supplier VARCHAR(255) NULL,
    purchase_type VARCHAR(50) NOT NULL DEFAULT 'delivery',
    quantity DECIMAL(10, 2) NOT NULL,
    display_unit VARCHAR(20) NOT NULL,
    base_unit VARCHAR(20) NOT NULL,
    conversion_ratio DECIMAL(10, 4) NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'paid',
    expiry_date DATE NULL,
    date_created DATETIME NOT NULL,
    date_delivered DATETIME NULL,
    receipt_path VARCHAR(500) NULL,
    INDEX idx_status (status),
    INDEX idx_batch_id (batch_id),
    INDEX idx_date_created (date_created)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: ingredient_sets
CREATE TABLE IF NOT EXISTS ingredient_sets (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_path VARCHAR(500) NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: ingredients (for ingredient_sets - many-to-many relationship)
CREATE TABLE IF NOT EXISTS ingredients (
    id VARCHAR(36) PRIMARY KEY,
    ingredient_set_id VARCHAR(36) NOT NULL,
    inventory_item_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    is_packaged BOOLEAN NOT NULL DEFAULT FALSE,
    INDEX idx_ingredient_set (ingredient_set_id),
    INDEX idx_inventory_item (inventory_item_id),
    FOREIGN KEY (ingredient_set_id) REFERENCES ingredient_sets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: requests (kitchen_requests)
CREATE TABLE IF NOT EXISTS requests (
    id VARCHAR(36) PRIMARY KEY,
    kitchen_staff_id VARCHAR(100) NOT NULL,
    ingredient_set_id VARCHAR(36) NULL,
    ingredient_set_name VARCHAR(255) NULL,
    quantity INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    date_requested DATETIME NOT NULL,
    date_processed DATETIME NULL,
    processed_by VARCHAR(100) NULL,
    has_insufficient_inventory BOOLEAN NOT NULL DEFAULT FALSE,
    insufficient_items TEXT NULL,
    -- Single item request fields
    is_single_item BOOLEAN NOT NULL DEFAULT FALSE,
    inventory_item_id VARCHAR(36) NULL,
    inventory_item_name VARCHAR(255) NULL,
    requested_quantity DECIMAL(10, 2) NULL,
    requested_unit VARCHAR(20) NULL,
    INDEX idx_status (status),
    INDEX idx_kitchen_staff (kitchen_staff_id),
    INDEX idx_date_requested (date_requested)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    timestamp DATETIME NOT NULL,
    INDEX idx_user (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: disposals
CREATE TABLE IF NOT EXISTS disposals (
    id VARCHAR(36) PRIMARY KEY,
    inventory_item_id VARCHAR(36) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    notes TEXT NULL,
    disposed_by VARCHAR(100) NOT NULL,
    disposed_at DATETIME NOT NULL,
    INDEX idx_inventory_item (inventory_item_id),
    INDEX idx_disposed_at (disposed_at),
    INDEX idx_reason (reason)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: sessions (for current user session)
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(100) NULL,
    user_data TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: users (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_login DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: password_verification_codes (for password change verification)
CREATE TABLE IF NOT EXISTS password_verification_codes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    code VARCHAR(6) NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_code (code),
    INDEX idx_expires_at (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: system_config (for system settings)
CREATE TABLE IF NOT EXISTS system_config (
    id VARCHAR(36) PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description VARCHAR(255),
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default system configuration
INSERT INTO system_config (id, config_key, config_value, description) VALUES
('config-1', 'low_stock_threshold_percentage', '20', 'Percentage below min stock level to trigger low stock alert'),
('config-2', 'default_min_stock_level', '10', 'Default minimum stock level for new items'),
('config-3', 'enable_email_notifications', 'false', 'Enable email notifications for low stock'),
('config-4', 'backup_retention_days', '30', 'Number of days to retain backups')
ON DUPLICATE KEY UPDATE config_key=config_key;







-- Insert default users (password for all: password123)
-- Note: Run generate_password_hash.php to generate new hashes if needed
INSERT INTO users (id, username, password, name, email, role, created_at) VALUES
('user-kitchen-1', 'kitchen_staff', '$2y$12$zKUccWLQQfW2WZN8e.umfeVZgDyRJvx/OXR4KcWWTpFlDGwF5AjsO', 'Chef Mike', 'kitchen@commissary.com', 'kitchen_staff', NOW()),
('user-stock-1', 'stock_handler', '$2y$12$zKUccWLQQfW2WZN8e.umfeVZgDyRJvx/OXR4KcWWTpFlDGwF5AjsO', 'Sarah Stock', 'stock@commissary.com', 'stock_handler', NOW()),
('user-purchaser-1', 'purchaser', '$2y$12$zKUccWLQQfW2WZN8e.umfeVZgDyRJvx/OXR4KcWWTpFlDGwF5AjsO', 'John Purchaser', 'purchaser@commissary.com', 'purchaser', NOW()),
('user-admin-1', 'admin', '$2y$12$zKUccWLQQfW2WZN8e.umfeVZgDyRJvx/OXR4KcWWTpFlDGwF5AjsO', 'Admin User', 'admin@commissary.com', 'admin', NOW())
ON DUPLICATE KEY UPDATE username=username;
