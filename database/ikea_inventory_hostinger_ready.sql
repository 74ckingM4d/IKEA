-- IKEA Commissary Database Export for Hostinger
-- Generated: 2026-01-14 06:16:29
-- Database: ikea_inventory
-- This file is compatible with Hostinger phpMyAdmin

-- Note: Do NOT include CREATE DATABASE or USE statements
-- Select your database in phpMyAdmin before importing

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
SET AUTOCOMMIT=0;
START TRANSACTION;

-- --------------------------------------------------------
-- Table structure for `audit_logs`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(100) NOT NULL,
  `user_role` varchar(50) NOT NULL,
  `action` varchar(100) NOT NULL,
  `details` text DEFAULT NULL,
  `timestamp` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `audit_logs` is empty

-- --------------------------------------------------------
-- Table structure for `ingredient_sets`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `ingredient_sets`;
CREATE TABLE `ingredient_sets` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_by` varchar(100) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `ingredient_sets` is empty

-- --------------------------------------------------------
-- Table structure for `ingredients`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `ingredients`;
CREATE TABLE `ingredients` (
  `id` varchar(36) NOT NULL,
  `ingredient_set_id` varchar(36) NOT NULL,
  `inventory_item_id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `is_packaged` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_ingredient_set` (`ingredient_set_id`),
  KEY `idx_inventory_item` (`inventory_item_id`),
  CONSTRAINT `ingredients_ibfk_1` FOREIGN KEY (`ingredient_set_id`) REFERENCES `ingredient_sets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `ingredients` is empty

-- --------------------------------------------------------
-- Table structure for `inventory_items`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `inventory_items`;
CREATE TABLE `inventory_items` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT 0.00,
  `unit` varchar(20) NOT NULL,
  `min_stock_level` decimal(10,2) NOT NULL DEFAULT 0.00,
  `price_per_unit` decimal(10,2) NOT NULL DEFAULT 0.00,
  `category` varchar(100) DEFAULT NULL,
  `last_updated` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `inventory_items` is empty

-- --------------------------------------------------------
-- Table structure for `packaged_items`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `packaged_items`;
CREATE TABLE `packaged_items` (
  `id` varchar(36) NOT NULL,
  `raw_inventory_item_id` varchar(36) NOT NULL,
  `raw_item_name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `total_raw_quantity_used` decimal(10,2) NOT NULL,
  `raw_unit` varchar(20) NOT NULL,
  `pack_size` decimal(10,2) NOT NULL,
  `pack_unit` varchar(20) NOT NULL,
  `number_of_packs` decimal(10,2) NOT NULL,
  `packaging_date` datetime NOT NULL,
  `packaged_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_raw_item` (`raw_inventory_item_id`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `packaged_items` is empty

-- --------------------------------------------------------
-- Table structure for `purchases`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `purchases`;
CREATE TABLE `purchases` (
  `id` varchar(36) NOT NULL,
  `batch_id` varchar(36) DEFAULT NULL,
  `purchaser_id` varchar(100) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `purchase_type` varchar(50) NOT NULL DEFAULT 'delivery',
  `quantity` decimal(10,2) NOT NULL,
  `display_unit` varchar(20) NOT NULL,
  `base_unit` varchar(20) NOT NULL,
  `conversion_ratio` decimal(10,4) NOT NULL DEFAULT 1.0000,
  `price` decimal(10,2) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `date_created` datetime NOT NULL,
  `date_delivered` datetime DEFAULT NULL,
  `receipt_path` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_batch_id` (`batch_id`),
  KEY `idx_date_created` (`date_created`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `purchases` is empty

-- --------------------------------------------------------
-- Table structure for `requests`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `requests`;
CREATE TABLE `requests` (
  `id` varchar(36) NOT NULL,
  `kitchen_staff_id` varchar(100) NOT NULL,
  `ingredient_set_id` varchar(36) DEFAULT NULL,
  `ingredient_set_name` varchar(255) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `date_requested` datetime NOT NULL,
  `date_processed` datetime DEFAULT NULL,
  `processed_by` varchar(100) DEFAULT NULL,
  `has_insufficient_inventory` tinyint(1) NOT NULL DEFAULT 0,
  `insufficient_items` text DEFAULT NULL,
  `is_single_item` tinyint(1) NOT NULL DEFAULT 0,
  `inventory_item_id` varchar(36) DEFAULT NULL,
  `inventory_item_name` varchar(255) DEFAULT NULL,
  `requested_quantity` decimal(10,2) DEFAULT NULL,
  `requested_unit` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_kitchen_staff` (`kitchen_staff_id`),
  KEY `idx_date_requested` (`date_requested`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `requests` is empty

-- --------------------------------------------------------
-- Table structure for `sessions`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `session_id` varchar(128) NOT NULL,
  `user_id` varchar(100) DEFAULT NULL,
  `user_data` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`session_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table `sessions` is empty

-- --------------------------------------------------------
-- Table structure for `system_config`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `system_config`;
CREATE TABLE `system_config` (
  `id` varchar(36) NOT NULL,
  `config_key` varchar(100) NOT NULL,
  `config_value` text DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`),
  KEY `idx_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Dumping data for table `system_config`
-- --------------------------------------------------------

INSERT INTO `system_config` (`id`, `config_key`, `config_value`, `description`, `updated_at`) VALUES
('config-1', 'low_stock_threshold_percentage', '20', 'Percentage below min stock level to trigger low stock alert', '2026-01-14 12:08:17'),
('config-2', 'default_min_stock_level', '10', 'Default minimum stock level for new items', '2026-01-14 12:08:17'),
('config-3', 'enable_email_notifications', 'false', 'Enable email notifications for low stock', '2026-01-14 12:08:17'),
('config-4', 'backup_retention_days', '30', 'Number of days to retain backups', '2026-01-14 12:08:17');

-- --------------------------------------------------------
-- Table structure for `users`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `role` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Dumping data for table `users`
-- --------------------------------------------------------

INSERT INTO `users` (`id`, `username`, `password`, `name`, `email`, `role`, `created_at`) VALUES
('user-admin-1', 'admin', '$2y$12$zKUccWLQQfW2WZN8e.umfeVZgDyRJvx/OXR4KcWWTpFlDGwF5AjsO', 'Admin User', 'admin@commissary.com', 'admin', '2026-01-13 23:41:43'),
('user-kitchen-1', 'kitchen_staff', '$2y$12$zKUccWLQQfW2WZN8e.umfeVZgDyRJvx/OXR4KcWWTpFlDGwF5AjsO', 'Mike', 'kitchen@commissary.com', 'kitchen_staff', '2026-01-13 23:41:43'),
('user-purchaser-1', 'purchaser', '$2y$12$zKUccWLQQfW2WZN8e.umfeVZgDyRJvx/OXR4KcWWTpFlDGwF5AjsO', 'John Ruiz', 'purchaser@commissary.com', 'purchaser', '2026-01-13 23:41:43'),
('user-stock-1', 'stock_handler', '$2y$12$zKUccWLQQfW2WZN8e.umfeVZgDyRJvx/OXR4KcWWTpFlDGwF5AjsO', 'Angie', 'stock@commissary.com', 'stock_handler', '2026-01-13 23:41:43');

SET FOREIGN_KEY_CHECKS=1;
COMMIT;
