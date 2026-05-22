-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 22, 2026 at 05:13 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ikea_inventory`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_fix_inventory_quantities` ()   BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_id VARCHAR(36);
    DECLARE v_name VARCHAR(255);
    DECLARE v_unit VARCHAR(20);
    DECLARE v_current_qty DECIMAL(10, 2);
    DECLARE v_corrected_qty DECIMAL(10, 2);
    DECLARE fixed_count INT DEFAULT 0;
    
    -- Cursor to iterate through inventory items with mismatches
    -- Using subquery to handle collation properly
    DECLARE cur CURSOR FOR 
        SELECT 
            i.id,
            i.name,
            i.unit,
            i.quantity AS current_quantity,
            -- Calculate correct quantity from purchases and packaging
            GREATEST(0, (
                COALESCE((
                    SELECT SUM(p.quantity * p.conversion_ratio)
                    FROM purchases p
                    WHERE p.status = 'completed'
                    AND CAST(LOWER(p.item_name) AS CHAR(255) CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci = 
                        CAST(LOWER(i.name) AS CHAR(255) CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci
                    AND CAST(p.base_unit AS CHAR(20) CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci = 
                        CAST(i.unit AS CHAR(20) CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci
                ), 0) - COALESCE((
                    SELECT SUM(pi.total_raw_quantity_used)
                    FROM packaged_items pi
                    WHERE pi.raw_inventory_item_id = i.id
                ), 0)
            )) AS corrected_quantity
        FROM inventory_items i
        HAVING ABS(i.quantity - corrected_quantity) > 0.01;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Create temporary table for results
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_fix_results (
        item_id VARCHAR(36),
        item_name VARCHAR(255),
        unit VARCHAR(20),
        old_quantity DECIMAL(10, 2),
        new_quantity DECIMAL(10, 2),
        difference DECIMAL(10, 2)
    );
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO v_id, v_name, v_unit, v_current_qty, v_corrected_qty;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Update the quantity
        UPDATE inventory_items 
        SET quantity = v_corrected_qty,
            last_updated = NOW()
        WHERE id = v_id;
        
        -- Record the fix
        INSERT INTO temp_fix_results 
        VALUES (v_id, v_name, v_unit, v_current_qty, v_corrected_qty, v_corrected_qty - v_current_qty);
        
        SET fixed_count = fixed_count + 1;
        
    END LOOP;
    
    CLOSE cur;
    
    -- Show results
    SELECT 
        item_name AS 'Item Name',
        unit AS 'Unit',
        old_quantity AS 'Old Quantity',
        new_quantity AS 'New Quantity',
        difference AS 'Difference',
        CASE 
            WHEN difference > 0 THEN 'Increased'
            WHEN difference < 0 THEN 'Decreased'
            ELSE 'No Change'
        END AS 'Action'
    FROM temp_fix_results
    ORDER BY ABS(difference) DESC;
    
    SELECT CONCAT('Fixed ', fixed_count, ' inventory item(s)') AS result;
    
    DROP TEMPORARY TABLE IF EXISTS temp_fix_results;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(100) NOT NULL,
  `user_role` varchar(50) NOT NULL,
  `action` varchar(100) NOT NULL,
  `details` text DEFAULT NULL,
  `timestamp` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_id`, `user_role`, `action`, `details`, `timestamp`) VALUES
('035858f5-b44b-4aaa-b77a-974bf06a49fa', 'user-6968a326b38212.77763917', 'stock_handler', 'change_password', 'User Marc Fritz Aseo changed their password', '2026-01-15 08:20:56'),
('0afeb7f6-21f1-476d-88d1-d9b99d4a6886', 'user-stock-1', 'stock_handler', 'approval', 'Approved 1x Mango Cake. White Sugar: -1 packs, -1 kg raw; Mango: -10 pcs raw (no matching packages)', '2026-01-15 02:21:09'),
('0c353cee-4ffb-4ce4-a1d6-64aa5b1e60eb', 'user-stock-1', 'stock_handler', 'create_set', 'Created ingredient set: Macha Cake', '2026-01-15 04:34:35'),
('10f69372-c607-4f0b-bb1e-7940556f6915', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of Rice (1 sack)', '2026-01-15 06:05:28'),
('152c90b7-7bc6-4ee2-bd41-e18b423dfa74', 'user-admin-1', 'admin', 'delete_user', 'Deleted user: Loren (Loren Capuyan)', '2026-03-21 04:12:10'),
('15a8ef7c-6abb-437d-812d-ace1f4ad9d6d', 'user-admin-1', 'admin', 'create_user', 'Created user: Fritz (Marc Fritz Aseo)', '2026-01-15 08:19:51'),
('21dfe623-462a-425b-abdc-6525e2e8ab25', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1x Chocolate', '2026-01-14 07:41:14'),
('2246f5dd-0974-4ab1-b125-f21128aff5b0', 'user-69c0ea1033c707.28294494', 'stock_handler', 'change_password', 'User Loren Capuyan changed their password', '2026-03-23 07:32:21'),
('23e9ce47-e016-4548-b557-9d49f73a51e0', 'user-stock-1', 'stock_handler', 'create_set', 'Created ingredient set: Chocolate Cake', '2026-01-15 06:08:27'),
('2695c808-c1e4-4b29-9c17-d996e008ae72', 'user-stock-1', 'stock_handler', 'approval', 'Approved 1x Chocolate. Cocoa Powder: -5 kg raw (no matching packages)', '2026-01-14 07:37:05'),
('2852f89a-ce00-4961-ba78-e1f3a937f201', 'user-stock-1', 'stock_handler', 'packaging', 'Deleted package: Cocoa Powder (20.00 packs)', '2026-03-23 06:31:35'),
('2cda929e-8b37-43df-8095-694ddae36f81', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of Brown Sugar (1 sack)', '2026-03-23 03:22:14'),
('2e79a91b-66e3-4a1c-9bb8-e8d61a8e53bc', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of Egg (60 pcs)', '2026-01-15 08:25:14'),
('2e7e04bc-0083-4185-9379-545a4d46da85', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1x Chocolate Cake', '2026-01-15 04:18:13'),
('2ef23cae-394b-41b7-a1b1-c0b9e829cc9e', 'user-admin-1', 'admin', 'delete_user', 'Deleted user: Loren (Loren Capuyan)', '2026-01-14 17:07:19'),
('30d830c8-51d4-4692-9107-0606949dfde8', 'user-stock-1', 'stock_handler', 'approval', 'Approved 1x Mango Cake. Mango: -10 pcs raw (no matching packages)', '2026-01-15 04:47:13'),
('323af599-ddf7-4957-b33a-0d245e2276dc', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of Mayonaise (2 box)', '2026-01-14 14:56:05'),
('3257b0b1-7ad2-484a-939c-178d4337dbea', 'user-stock-1', 'stock_handler', 'update_inventory', 'Updated inventory item: Cocoa Powder (Reorder Level: 20 kg)', '2026-01-14 14:36:26'),
('37a56c22-556e-4e5f-b8f9-d02f861372ab', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of Cocoa Powder (1 sack)', '2026-01-14 07:24:28'),
('37ed81a3-d122-4845-b8dd-a5eee8e3af3a', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1x Mango Cake', '2026-01-15 04:43:15'),
('39ddd318-f85c-4652-93a0-174c609dc3b7', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1x Chocolate Cake', '2026-03-21 02:06:10'),
('3c245832-3cb0-41d1-ac6d-4accbfb33d8c', 'user-admin-1', 'admin', 'delete_user', 'Deleted user: Yong (Yong Capuyan)', '2026-03-21 04:12:14'),
('3cbc5de5-b3cd-45b0-b968-a285acd94785', 'user-stock-1', 'stock_handler', 'approval', 'Approved single item request: 1 kg of White Sugar', '2026-01-15 03:43:15'),
('3d7cae57-a5ab-4dba-8330-de9e2d370183', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 1 sack asd (Total: $123.00)', '2026-01-14 13:50:46'),
('3dc066e5-91cc-45cc-82ea-025dd7c9b2d2', 'user-stock-1', 'stock_handler', 'create_set', 'Created ingredient set: Mango Cake', '2026-01-15 02:19:21'),
('3e0ca03a-362a-407a-b400-0eb8490059d5', 'user-stock-1', 'stock_handler', 'update_inventory', 'Updated inventory item: Cocoa Powder (Reorder Level: 20 kg)', '2026-01-14 14:32:03'),
('3ef5a3be-f516-45e7-969e-cbfbc18649e4', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1x Chocolate', '2026-01-14 12:31:58'),
('422d4c9b-8567-49bc-a69c-3df7edd78456', 'user-stock-1', 'stock_handler', 'disposal', 'Disposed 4 pcs of Burger Bun. Reason: Expired', '2026-03-23 06:59:12'),
('4393ac49-3465-418c-a6ca-fbe8cd881c12', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1 kg of Cocoa Powder', '2026-01-15 04:45:06'),
('4793da45-26cc-41fa-8648-84e8b578192e', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 2x Mango Cake', '2026-01-15 04:18:13'),
('49cec460-d58e-4efe-a641-b59e4de48191', 'user-stock-1', 'stock_handler', 'create_set', 'Created ingredient set: Chocolate Cake', '2026-01-15 03:58:30'),
('4a9ab76f-9bf2-4876-ba46-948bcdddb856', 'user-6967cd592c0d75.43641527', 'purchaser', 'purchase', 'Batch purchase order: 1 box Mayonaise (Total: $300.00)', '2026-01-14 17:34:29'),
('4ab7418e-33c5-4261-9c7b-da36ac2659ea', 'user-admin-1', 'admin', 'create_user', 'Created user: Loren (Loren Capuyan)', '2026-01-15 02:16:12'),
('4bdf5b13-920e-42a1-a514-ff807e7a9ba3', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 1 pack Donut (Total: $299.00)', '2026-01-15 08:12:21'),
('4d6453a4-3813-46b2-bfbe-d28612d51ffe', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of Graham (2 box)', '2026-01-14 17:51:27'),
('4da78ea2-bed9-44aa-9237-cb6abde8a399', 'user-stock-1', 'stock_handler', 'approval', 'Approved 1x Chocolate Cake. Cocoa Powder: -1 packs, -1 kg raw', '2026-01-15 04:20:06'),
('4e4f234a-bf81-44c7-9c00-120a2ef0b9f8', 'user-stock-1', 'stock_handler', 'approval', 'Approved 2x Mango Cake. Mango: -20 pcs raw (no matching packages)', '2026-01-15 04:19:46'),
('4fd65c34-9859-485b-a90e-2ad047af4b29', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1x Mango Cake - INSUFFICIENT INVENTORY', '2026-03-23 06:48:14'),
('52168b1c-ebfe-41be-b6da-fb4db8383afa', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 1 sack Rice (Total: $2,100.00)', '2026-01-15 05:59:52'),
('539c8eff-e3a3-4b22-89f6-c15e15d820df', 'user-stock-1', 'stock_handler', 'create_set', 'Created ingredient set: Mango Cake', '2026-03-21 03:18:37'),
('55e8a62e-da89-4d8d-9ffe-306a9694e0c5', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 1 sack sdasd, 1 sack asds, 1 sack asda, 1 sack asd, 1 sack asd, 1 sack asd, 1 sack asd, 1 sack asd (Total: $984.00)', '2026-01-14 13:23:37'),
('56afbe54-7585-4ca9-9dcb-bf7361e77c9a', 'user-stock-1', 'stock_handler', 'create_set', 'Deleted ingredient set: Chocolate Cake', '2026-01-15 05:48:46'),
('57b616b8-d7d8-4f26-b67e-fef400d9f0cd', 'user-stock-1', 'stock_handler', 'approval', 'Approved 1x Mango Cake. Mango: -10 pcs raw (no matching packages)', '2026-03-21 02:03:27'),
('5b08ef68-f993-4540-8e1a-cd63bccce800', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 2x Mango Cake', '2026-01-15 02:20:08'),
('5cb8ac1e-ba19-4ef8-ad3d-ab4ad84c43a7', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 10 kg Mango (Total: $12,000.00)', '2026-01-14 17:45:55'),
('5d8f07a9-befd-4474-85c4-0a9423d4a968', 'user-stock-1', 'stock_handler', 'disposal', 'Disposed 2 pcs of Burger Bun. Reason: Expired', '2026-01-15 05:05:23'),
('61a4d07a-e42d-4224-b3e5-f33804551999', 'user-stock-1', 'stock_handler', 'create_set', 'Deleted ingredient set: Macha Cake', '2026-01-15 05:48:43'),
('62b8a168-9ff5-4d99-a1b8-582e8b912949', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of Cocoa Powder (2 sack)', '2026-01-14 14:31:31'),
('63463741-bda9-4a7f-84c7-e0b5369dad57', 'user-stock-1', 'stock_handler', 'rejection', 'Rejected request for Chocolate Cake', '2026-03-21 02:06:32'),
('648a7e60-f6d7-415e-915d-9eb16cc11ba1', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of Mayonaise (1 box)', '2026-01-14 17:43:14'),
('64d5204a-07f0-42d4-8375-da4a6f46df32', 'user-admin-1', 'admin', 'delete_user', 'Deleted user: Loren (Loren Capuyan)', '2026-01-15 02:15:50'),
('670ec873-b5a5-4b2c-b625-89818fd54260', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1x Mango Cake', '2026-01-15 08:16:45'),
('68d2d194-f839-48f9-a9ef-fae1842bd64b', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1x Mango Cake', '2026-01-15 03:29:49'),
('691b32f5-76fe-4f18-807b-2b944c39460c', 'user-stock-1', 'stock_handler', 'packaging', 'Packaged 10 kg of White Sugar into 10.00 packs (1 kg each)', '2026-01-15 06:07:06'),
('6bf728fa-e288-4a8f-a057-9b6343715810', 'user-stock-1', 'stock_handler', 'delivery', 'Marked delivery b91316c8-e4ff-436b-905e-740935d41c51 as incomplete/cancelled', '2026-01-14 14:26:07'),
('6d90c8b8-6cb4-475a-9bb2-ce5ed26aef2c', 'user-stock-1', 'stock_handler', 'create_set', 'Created ingredient set: Chocolate Cake', '2026-01-15 03:57:16'),
('6e3b48f2-4a56-4409-ba39-3838aab8926a', 'user-stock-1', 'stock_handler', 'create_set', 'Created ingredient set: Chocolate Cake', '2026-01-14 07:24:56'),
('6e6f08b0-d9ea-4fbd-8b33-9c62a6489cdc', 'user-stock-1', 'stock_handler', 'create_set', 'Deleted ingredient set: Mango Cake', '2026-01-15 05:48:49'),
('6eaaa9c1-edb1-4211-8c81-4ea69976d3a3', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 2 box Mayonaise, 1 box Cream (Total: $2,100.00)', '2026-01-14 14:53:59'),
('7058f150-a316-42ba-bb8b-702d2236ef28', 'user-stock-1', 'stock_handler', 'disposal', 'Disposed 1 pcs of Cream. Reason: Expired', '2026-03-23 06:59:37'),
('71e415a6-7fe6-4ce6-9862-ca4c102d960b', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of Burger Bun (1 pack)', '2026-01-15 03:07:16'),
('757e7e06-4301-4542-9fae-1448c9d7b701', 'user-stock-1', 'stock_handler', 'packaging', 'Deleted package: White Sugar (8.00 packs)', '2026-03-23 06:31:37'),
('7c73b75f-3778-4b02-a8b0-ac9874a44076', 'user-stock-1', 'stock_handler', 'approval', 'Approved 1x Chocolate Cake. White Sugar: -1 packs, -1 kg raw', '2026-01-15 06:09:18'),
('7f037b5a-b8ad-4c70-b5bb-4244d54a80c2', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1x Chocolate Cake', '2026-01-15 08:16:45'),
('7f6c9a31-b45f-4d8f-9fa9-31c3e6b58e9b', 'user-stock-1', 'stock_handler', 'approval', 'Approved 1x Mango Cake. Mango: -10 pcs raw (no matching packages)', '2026-01-15 08:17:33'),
('8410fe32-05a8-4fdf-96e8-a2f14da93308', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1x Test Low Stocks', '2026-01-15 03:03:04'),
('8758672a-6062-4f0e-b654-5d32bdb051e3', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1x Mango Cake', '2026-01-15 02:20:20'),
('88afcc8f-d966-4e27-a82c-9ab5a9f29fda', 'user-stock-1', 'stock_handler', 'update_inventory', 'Updated inventory item: White Sugar (Reorder Level: 20 kg)', '2026-01-14 14:31:58'),
('8c9df267-f914-4583-b8e7-ca9b647ca6e3', 'user-stock-1', 'stock_handler', 'packaging', 'Packaged 20 kg of Cocoa Powder into 20.00 packs (1 kg each)', '2026-01-15 08:14:43'),
('8ced7faa-5a88-4e0a-83cf-eadcf02cdeca', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 1 box Cream (Total: $900.00)', '2026-01-14 12:59:25'),
('8ddae092-42ec-4730-b433-dba8fcd81496', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of White Sugar (1 sack)', '2026-01-15 06:05:36'),
('8e4036d5-c2df-4d6f-93f4-fea64d5d0ff7', 'user-admin-1', 'admin', 'delete_user', 'Deleted user: Test (Test Test)', '2026-03-23 07:16:46'),
('8f5912a8-d40d-4ec2-a131-2c51043d6448', 'user-stock-1', 'stock_handler', 'packaging', 'Packaged 10 kg of White Sugar into 10.00 packs (1 kg each)', '2026-01-14 14:32:14'),
('8f790e57-0379-4682-8619-9fb7145568ef', 'user-stock-1', 'stock_handler', 'create_set', 'Created ingredient set: Chocolate', '2026-01-14 07:36:20'),
('91cb1d6e-a9ad-48f5-b01a-f718a07babae', 'user-admin-1', 'admin', 'create_user', 'Created user: Loren (Loren Capuyan)', '2026-01-14 17:24:44'),
('92bb2f0c-0006-4bc7-8f3c-745a92f1de53', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 1 pack Burger Bun (Total: $150.00)', '2026-01-15 03:06:21'),
('9639493e-fb1e-4137-bfde-126954491737', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of Mango (10 kg)', '2026-01-14 17:51:04'),
('96625d2f-e716-4f93-b957-330a7ea61b08', 'user-stock-1', 'stock_handler', 'create_set', 'Deleted ingredient set: Mango Cake', '2026-03-21 03:16:44'),
('994703b5-a4a6-45eb-8a69-57a96186e195', 'user-6967cd592c0d75.43641527', 'purchaser', 'change_password', 'User Yong Capuyan changed their password', '2026-01-14 17:14:40'),
('994a866c-b981-4486-87c9-1291870b13de', 'user-admin-1', 'admin', 'create_user', 'Created user: Loren (Loren Capuyan)', '2026-01-14 16:43:59'),
('9a23e502-87a2-4980-9f55-43a2924f63e0', 'user-stock-1', 'stock_handler', 'packaging', 'Packaged 10 kg of Cocoa Powder into 10.00 packs (1 kg each)', '2026-01-14 14:32:09'),
('9b73cfaf-2b84-4b9c-bf2f-af827442973b', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 60 pcs of Mango', '2026-01-15 03:40:41'),
('9bfe2533-4ec5-45b7-b569-90d67c3d26b0', 'user-admin-1', 'admin', 'create_user', 'Created user: Test (Test Test)', '2026-03-23 07:16:20'),
('9c1a82ca-399f-4475-b78f-504d7b9dca82', 'user-stock-1', 'stock_handler', 'approval', 'Approved 1x Macha Cake. White Sugar: -1 packs, -1 kg raw', '2026-01-15 04:47:11'),
('9ea79c2d-328d-41cb-a4ea-7af843109df9', 'user-stock-1', 'stock_handler', 'rejection', 'Rejected request for Mango Cake', '2026-03-23 07:01:56'),
('9f94ec5b-03f8-4a14-a981-28f2d6558bda', 'user-stock-1', 'stock_handler', 'disposal', 'Disposed 10 pcs of Egg. Reason: Damaged', '2026-01-15 08:25:58'),
('9fdce550-d710-45e3-a5c0-cb36ec82d63e', 'user-stock-1', 'stock_handler', 'update_inventory', 'Updated inventory item: Brown Sugar (Reorder Level: 20 kg)', '2026-03-23 07:01:27'),
('a6577f13-2441-425a-9d7a-ad355f1fbb98', 'user-stock-1', 'stock_handler', 'approval', 'Approved 1x Mango Cake. White Sugar: -1 packs, -1 kg raw; Mango: -10 pcs raw (no matching packages)', '2026-01-15 03:30:30'),
('a6e7da03-2eaf-441f-9fa1-739d6229293a', 'user-69684dec17ade8.01949623', 'stock_handler', 'change_password', 'User Loren Capuyan changed their password', '2026-01-15 06:13:26'),
('a79736b0-45f1-49c1-9fdb-541199d398dd', 'user-stock-1', 'stock_handler', 'create_set', 'Created ingredient set: Test Low Stocks', '2026-01-15 03:01:45'),
('a8c6a060-c030-4367-88f4-c3bd9752b129', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of Donut (1 pack)', '2026-01-15 08:13:24'),
('a9ae9bf7-264a-4789-aee8-094f32e942e5', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of Pork (1 kg)', '2026-01-15 06:11:31'),
('ab110c6a-c025-42a0-8e9e-ff9d6932244d', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1x Chocolate', '2026-01-14 07:36:40'),
('ab672e70-ffa7-4f2f-b1d0-70e38bc3257a', 'user-stock-1', 'stock_handler', 'packaging', 'Packaged 10 kg of Brown Sugar into 10.00 packs (1 kg each)', '2026-03-23 06:30:23'),
('ab830154-c2fa-402d-bbc6-bc840f838fac', 'user-stock-1', 'stock_handler', 'create_set', 'Created ingredient set: Chocolate Cake', '2026-01-15 04:02:13'),
('abc5c89a-dfb2-4e7b-9e97-8e362c568195', 'user-69684dec17ade8.01949623', 'stock_handler', 'change_password', 'User Loren Capuyan changed their password', '2026-01-15 02:17:23'),
('ad52f538-bd6e-4a0e-8241-e41b5579f2ba', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of White Sugar (2 sack)', '2026-01-14 14:31:31'),
('b38d0498-4d48-4298-b86b-2cd605b50691', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 2 box Graham (Total: $900.00)', '2026-01-14 17:50:23'),
('b3d0ee70-779f-4eeb-98f0-60d7df24ba08', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 1 sack Brown Sugar, 1 sack White Sugar (Total: $5,000.00)', '2026-03-23 03:05:23'),
('b7beea4d-ea3b-4b75-b891-139dd395d801', 'user-stock-1', 'stock_handler', 'create_set', 'Created ingredient set: Mango Cake', '2026-01-15 04:13:18'),
('b83647ba-187f-4699-8fed-728cdb9f690e', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 2 sack Cocoa Powder, 2 sack White Sugar (Total: $8,400.00)', '2026-01-14 14:29:58'),
('b9564c39-2f76-46cc-8369-301c150ddc68', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 1 sack Cocoa Powder (Total: $123.00)', '2026-01-14 07:24:06'),
('b97987c0-2ee2-4249-aead-0101d47d14ef', 'user-stock-1', 'stock_handler', 'approval', 'Approved 2x Mango Cake. White Sugar: -2 packs, -2 kg raw; Mango: -20 pcs raw (no matching packages)', '2026-01-15 02:21:06'),
('bd503f3c-e923-4dce-9bc0-96b9b66ad89b', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of Cream (1 box)', '2026-01-14 14:56:05'),
('bf5a1e36-ed79-46f1-b214-4396083d7273', 'user-stock-1', 'stock_handler', 'create_set', 'Deleted ingredient set: Mango Cake', '2026-01-15 04:10:16'),
('bffc6c35-4210-48aa-9462-f477a2a610d8', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 1 sack White Sugar (Total: $2,100.00)', '2026-01-15 05:51:02'),
('c0f9f682-8735-4095-be6c-abf75ea86f82', 'user-stock-1', 'stock_handler', 'update_inventory', 'Updated inventory item: Cocoa Powder (Reorder Level: 20 kg)', '2026-01-14 14:31:54'),
('c3c2ec66-bbed-4706-a9a8-0e46358c13fa', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 1 sack Cocoa Powder (Total: $2,100.00)', '2026-01-15 05:54:22'),
('c4ecf0a6-197f-4486-9cda-01f8f047c0d0', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 1 box Cream (Total: $300.00)', '2026-01-14 13:33:31'),
('c5be314f-49cc-477c-8314-184f192b4537', 'user-stock-1', 'stock_handler', 'create_set', 'Deleted ingredient set: Chocolate Cake', '2026-03-21 03:16:47'),
('c6b5c545-f9c1-40bf-8b01-a3a74be09816', 'user-stock-1', 'stock_handler', 'update_inventory', 'Updated inventory item: Mayonaise (Reorder Level: 10 pcs)', '2026-01-14 14:56:34'),
('c82a742e-97e9-4fed-b5f4-295861a669ab', 'user-admin-1', 'admin', 'delete_user', 'Deleted user: Fritz (Marc Fritz Aseo)', '2026-03-21 04:12:07'),
('c87fe157-082f-4388-93ba-0f4fe72c5a12', 'user-stock-1', 'stock_handler', 'approval', 'Approved 1x Chocolate Cake. White Sugar: -1 packs, -1 kg raw', '2026-01-15 08:17:35'),
('cc7310c2-d9e5-4c6f-8f91-691ca899bba6', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 1 pack Pork Cubes (Total: $2,100.00)', '2026-01-15 06:04:58'),
('cca64be2-6510-45f3-b2cd-65399c656e2b', 'user-stock-1', 'stock_handler', 'approval', 'Approved single item request: 60 pcs of Mango', '2026-01-15 03:43:18'),
('cfb30454-efea-484e-9490-35e752ad3331', 'user-stock-1', 'stock_handler', 'approval', 'Approved 1x Chocolate Cake. Cocoa Powder: -1 packs, -1 kg raw', '2026-01-15 04:47:15'),
('d0c23fd4-5433-43c2-a9d0-ebfd647d5086', 'user-stock-1', 'stock_handler', 'create_set', 'Deleted ingredient set: Test Low Stocks', '2026-01-15 03:46:15'),
('d10cb5fa-c76c-401a-8792-e5cb50f41a6f', 'user-69684dec17ade8.01949623', 'stock_handler', 'change_password', 'User Loren Capuyan changed their password', '2026-01-15 06:17:45'),
('d3b006e6-add0-4263-8ee8-52f7502a179d', 'user-stock-1', 'stock_handler', 'packaging', 'Packaged 10 kg of Brown Sugar into 10.00 packs (1 kg each)', '2026-03-23 06:31:25'),
('d406225b-7a94-40b2-8141-5ccf117a3ce0', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1x Macha Cake', '2026-01-15 04:43:15'),
('d4e9e416-6bd5-4873-b4a5-4cf7a7c559d4', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of White Sugar (1 sack)', '2026-03-23 03:22:14'),
('d6496352-418a-4835-bf0d-77aa314b3813', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 1 sack asdasd, 1 sack asd, 1 sack asd, 1 sack asd (Total: $491.99)', '2026-01-14 13:35:48'),
('da4a7331-c588-41b0-b2f7-e719878602da', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1x Chocolate Cake', '2026-01-15 06:08:58'),
('dc8360b5-2398-4ab1-8918-49ab1d72dd9b', 'user-stock-1', 'stock_handler', 'approval', 'Approved single item request: 1 kg of Cocoa Powder', '2026-01-15 04:47:09'),
('dcc7fd25-493c-447b-af41-412073965a70', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1 kg of White Sugar', '2026-01-15 03:41:33'),
('e08901f7-5077-49e5-ac2f-dc1b54c6910c', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1x Chocolate Cake', '2026-01-15 04:43:15'),
('e554ee63-3e14-4f45-a89a-f5cce26cb234', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of Cocoa Powder (1 sack)', '2026-01-15 06:05:32'),
('e6a1c214-574f-4471-8ea2-635196d05c3c', 'user-admin-1', 'admin', 'create_user', 'Created user: Yong (Yong Capuyan)', '2026-01-14 17:07:37'),
('e6ac145e-1998-4303-af40-bcb92b5cc687', 'user-6967d15c3a8933.29899630', 'purchaser', 'change_password', 'User Loren Capuyan changed their password', '2026-01-14 17:25:44'),
('e77cff99-220b-4433-b2d2-48ce35705df5', 'user-stock-1', 'stock_handler', 'create_set', 'Created ingredient set: Chocolate Cake', '2026-01-15 04:04:35'),
('edc6cb14-dabd-4444-8777-d132664b32bb', 'user-kitchen-1', 'kitchen_staff', 'request', 'Requested 1x Mango Cake', '2026-03-21 01:57:27'),
('edf5d6e7-2079-4115-91bc-c86f1bbe8189', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 1 kg Pork (Total: $500.00)', '2026-01-15 06:11:02'),
('ef1e5688-d682-4a63-975d-ca0ff6b50413', 'user-purchaser-1', 'purchaser', 'purchase', 'Batch purchase order: 60 pcs Egg (Total: $18,000.00)', '2026-01-15 08:24:37'),
('f0c1a761-be3a-4d02-bbfa-d6bdeb6671ea', 'user-stock-1', 'stock_handler', 'update_inventory', 'Updated inventory item: Cream (Reorder Level: 3 pcs)', '2026-01-14 14:56:28'),
('f2499388-8b4b-4ea8-b086-ac1b0555512f', 'user-admin-1', 'admin', 'create_user', 'Created user: Loren (Loren Capuyan)', '2026-03-23 07:21:52'),
('f56e243f-f167-4993-a5c0-702ab0c3c40d', 'user-stock-1', 'stock_handler', 'delivery', 'Confirmed full delivery of Pork Cubes (1 pack)', '2026-01-15 06:05:23'),
('f5bb664c-ac6e-46a6-a977-fe66d15f88db', 'user-stock-1', 'stock_handler', 'create_set', 'Deleted ingredient set: Chocolate', '2026-01-14 15:07:15'),
('f862b446-1fec-4584-848a-80eec6fd95b7', 'user-stock-1', 'stock_handler', 'create_set', 'Created ingredient set: Mango Cake', '2026-01-15 08:15:59'),
('faecfbe8-b58d-4995-8950-7f3adc01ece6', 'user-stock-1', 'stock_handler', 'approval', 'Approved 1x Test Low Stocks. Cream: -9 pcs raw (no matching packages)', '2026-01-15 03:03:20');

-- --------------------------------------------------------

--
-- Table structure for table `disposals`
--

CREATE TABLE `disposals` (
  `id` varchar(36) NOT NULL,
  `inventory_item_id` varchar(36) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `reason` varchar(255) NOT NULL,
  `notes` text DEFAULT NULL,
  `disposed_by` varchar(100) NOT NULL,
  `disposed_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `disposals`
--

INSERT INTO `disposals` (`id`, `inventory_item_id`, `item_name`, `quantity`, `unit`, `reason`, `notes`, `disposed_by`, `disposed_at`) VALUES
('701cb762-fa69-4ff0-805d-b75c1ee9ebc7', '09a7f756-6e3f-47b2-868b-75d40d6bb884', 'Egg', 10.00, 'pcs', 'Damaged', '', 'user-stock-1', '2026-01-15 08:25:58'),
('70402b4c-75d4-4b13-b804-9b896423769f', 'ed4baec6-a385-43b3-8426-17246e154185', 'Burger Bun', 4.00, 'pcs', 'Expired', '', 'user-stock-1', '2026-03-23 06:59:12'),
('731a08b7-7717-40bc-903c-c03251ed40e6', 'ed4baec6-a385-43b3-8426-17246e154185', 'Burger Bun', 2.00, 'pcs', 'Expired', '', 'user-stock-1', '2026-01-15 05:05:23'),
('9b8c831c-749f-4261-85d8-98dc156bcc29', 'e8f3abaf-6f2a-4a48-a58b-f51edfafa61e', 'Cream', 1.00, 'pcs', 'Expired', '', 'user-stock-1', '2026-03-23 06:59:37');

-- --------------------------------------------------------

--
-- Table structure for table `ingredients`
--

CREATE TABLE `ingredients` (
  `id` varchar(36) NOT NULL,
  `ingredient_set_id` varchar(36) NOT NULL,
  `inventory_item_id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `is_packaged` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ingredients`
--

INSERT INTO `ingredients` (`id`, `ingredient_set_id`, `inventory_item_id`, `name`, `quantity`, `unit`, `is_packaged`) VALUES
('ing-1774063117401-0.0144501313571708', 'c757fd13-3712-4cff-a648-eda03f272c41', '8fd23439-e5b5-4962-977b-c8a06a7fc408', 'White Sugar', 2.00, 'pcs', 1),
('ing-1774063117401-0.0529878399591480', 'c757fd13-3712-4cff-a648-eda03f272c41', 'a83b1bb6-53c0-4b73-8a7f-65a5fefca877', 'Mango', 5.00, 'pcs', 0),
('ing-1774063117401-0.0932692092594601', 'c757fd13-3712-4cff-a648-eda03f272c41', 'e8f3abaf-6f2a-4a48-a58b-f51edfafa61e', 'Cream', 1.00, 'pcs', 0);

-- --------------------------------------------------------

--
-- Table structure for table `ingredient_sets`
--

CREATE TABLE `ingredient_sets` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `image_path` varchar(500) DEFAULT NULL,
  `created_by` varchar(100) NOT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ingredient_sets`
--

INSERT INTO `ingredient_sets` (`id`, `name`, `description`, `image_path`, `created_by`, `created_at`) VALUES
('c757fd13-3712-4cff-a648-eda03f272c41', 'Mango Cake', 'A mango cake is a light, airy, and moist dessert, typically featuring fluffy vanilla chiffon sponge layers filled with fresh, sweet mango chunks and silky whipped cream.', 'uploads/recipes/recipe_69be0e0d6e5194.84041824.jpg', 'user-stock-1', '2026-03-21 03:18:37');

-- --------------------------------------------------------

--
-- Table structure for table `inventory_items`
--

CREATE TABLE `inventory_items` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT 0.00,
  `unit` varchar(20) NOT NULL,
  `min_stock_level` decimal(10,2) NOT NULL DEFAULT 0.00,
  `price_per_unit` decimal(10,2) NOT NULL DEFAULT 0.00,
  `category` varchar(100) DEFAULT NULL,
  `last_updated` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `inventory_items`
--

INSERT INTO `inventory_items` (`id`, `name`, `quantity`, `unit`, `min_stock_level`, `price_per_unit`, `category`, `last_updated`) VALUES
('09a7f756-6e3f-47b2-868b-75d40d6bb884', 'Egg', 3590.00, 'pcs', 0.00, 5.00, 'Meat & Poultry', '2026-01-15 08:25:58'),
('0a08f89c-7f30-4c75-8c44-854ca4ac2a1e', 'Graham', 40.00, 'pcs', 0.00, 22.50, 'Baking Supplies', '2026-01-14 17:51:27'),
('2e721a0e-5a4d-4039-b914-49712e0a8087', 'Mayonaise', 50.00, 'pcs', 10.00, 45.00, 'Dairy', '2026-01-14 17:43:14'),
('39a940b4-e6ee-4631-b7a3-d46f6513317d', 'Cocoa Powder', 50.00, 'kg', 0.00, 42.00, 'Dry Goods', '2026-01-15 06:05:32'),
('6950af29-0822-4512-91cc-92626018d6a0', 'Donut', 6.00, 'pcs', 0.00, 49.83, 'Dry Goods', '2026-01-15 08:13:24'),
('8de64faa-5565-46da-85ac-33a4de4ee76d', 'Rice', 50.00, 'kg', 0.00, 42.00, 'Dry Goods', '2026-01-15 06:05:28'),
('90fb5d69-6f2e-4f90-8982-2eb71a60fa13', 'Pork Cubes', 10.00, 'pcs', 0.00, 210.00, 'Spices & Seasonings', '2026-01-15 06:05:23'),
('a83b1bb6-53c0-4b73-8a7f-65a5fefca877', 'Mango', 550.00, 'pcs', 0.00, 17.14, 'Fruits & Vegetables', '2026-03-21 02:03:27'),
('d08c4b85-c790-40e0-bd49-bd369090c52d', 'Pork', 1.00, 'kg', 0.00, 500.00, 'Meat & Poultry', '2026-01-15 06:11:31'),
('dbe91fc7-aa03-4138-8ae9-72daa135e187', 'Brown Sugar', 50.00, 'kg', 20.00, 2500.00, 'Dry Goods', '2026-03-23 07:01:27'),
('e8f3abaf-6f2a-4a48-a58b-f51edfafa61e', 'Cream', 0.00, 'pcs', 3.00, 30.00, 'Dairy', '2026-03-23 06:59:37'),
('eb314119-e1d8-4209-8396-347f379d3791', 'White Sugar', 50.00, 'kg', 0.00, 2500.00, 'Dry Goods', '2027-03-23 11:22:14'),
('ed4baec6-a385-43b3-8426-17246e154185', 'Burger Bun', 0.00, 'pcs', 0.00, 25.00, 'Other', '2026-03-23 06:59:12');

-- --------------------------------------------------------

--
-- Table structure for table `packaged_items`
--

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
  `packaged_by` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `packaged_items`
--

INSERT INTO `packaged_items` (`id`, `raw_inventory_item_id`, `raw_item_name`, `category`, `total_raw_quantity_used`, `raw_unit`, `pack_size`, `pack_unit`, `number_of_packs`, `packaging_date`, `packaged_by`) VALUES
('29b4ca6d-0627-4122-bf78-cf512ee1ee89', 'dbe91fc7-aa03-4138-8ae9-72daa135e187', 'Brown Sugar', 'Dry Goods', 10.00, 'kg', 1.00, 'kg', 10.00, '2026-03-23 06:31:25', 'user-stock-1'),
('4f9d8361-a47b-4700-8667-d974a8a7628c', 'dbe91fc7-aa03-4138-8ae9-72daa135e187', 'Brown Sugar', 'Dry Goods', 10.00, 'kg', 1.00, 'kg', 10.00, '2026-03-23 06:30:23', 'user-stock-1');

-- --------------------------------------------------------

--
-- Table structure for table `password_verification_codes`
--

CREATE TABLE `password_verification_codes` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `code` varchar(6) NOT NULL,
  `email` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `password_verification_codes`
--

INSERT INTO `password_verification_codes` (`id`, `user_id`, `code`, `email`, `expires_at`, `used`, `created_at`) VALUES
('code-69c0ea9abc7c25.48238853', 'user-69c0ea1033c707.28294494', '564095', 'loren.capuyan@evsu.edu.ph', '2026-03-23 15:39:10', 1, '2026-03-23 15:24:10');

-- --------------------------------------------------------

--
-- Table structure for table `purchases`
--

CREATE TABLE `purchases` (
  `id` varchar(36) NOT NULL,
  `batch_id` varchar(36) DEFAULT NULL,
  `purchaser_id` varchar(100) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `brand_name` varchar(255) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `purchase_type` varchar(50) NOT NULL DEFAULT 'delivery',
  `payment_status` varchar(20) DEFAULT 'paid',
  `expiry_date` date DEFAULT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `display_unit` varchar(20) NOT NULL,
  `base_unit` varchar(20) NOT NULL,
  `conversion_ratio` decimal(10,4) NOT NULL DEFAULT 1.0000,
  `price` decimal(10,2) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `date_created` datetime NOT NULL,
  `date_delivered` datetime DEFAULT NULL,
  `receipt_path` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `purchases`
--

INSERT INTO `purchases` (`id`, `batch_id`, `purchaser_id`, `item_name`, `brand_name`, `category`, `supplier`, `purchase_type`, `payment_status`, `expiry_date`, `quantity`, `display_unit`, `base_unit`, `conversion_ratio`, `price`, `status`, `date_created`, `date_delivered`, `receipt_path`) VALUES
('12605322-b98f-4ced-aeba-5ba30aa7a5f1', '8eee3e7a-7628-4573-b9ce-418d2924283f', 'user-purchaser-1', 'Pork Cubes', 'knorr', 'Spices & Seasonings', 'Robinson Mall', 'personal', 'paid', '2026-02-15', 1.00, 'pack', 'pcs', 10.0000, 2100.00, 'completed', '2026-01-15 06:04:58', '2026-01-15 06:05:23', 'uploads/receipts/receipt_6968838a549324.03104293.jpg'),
('19ba474e-b203-4a64-8766-60b019a574d6', 'b054fb15-279b-435f-b940-91ed18aae05d', 'user-purchaser-1', 'White Sugar', 'Brand A', 'Dry Goods', 'RVDI', 'personal', 'paid', '2027-03-23', 1.00, 'sack', 'kg', 1.0000, 2500.00, 'completed', '2026-03-23 03:05:23', '2026-03-23 03:22:14', 'uploads/receipts/receipt_69c0adf395cca8.26175135.png'),
('1cb04c1a-115a-484c-8983-9c33a1e23fc6', '85d47dbc-333c-4724-84fa-1d1dd3195fa5', 'user-purchaser-1', 'Burger Bun', 'Brand A', 'Other', 'Robinson Mall', 'delivery', 'paid', '2026-01-22', 1.00, 'pack', 'pcs', 6.0000, 150.00, 'completed', '2026-01-15 03:06:21', '2026-01-15 03:07:16', 'uploads/receipts/receipt_69685ade411853.12480029.jpg'),
('3c2cf294-61b0-41fd-a562-b808935838a5', 'aa696f2a-2273-43cb-9021-36d428e209c6', 'user-purchaser-1', 'Mayonaise', 'Brand A', 'Dairy', 'Robinson Mall', 'personal', 'paid', '2026-04-14', 2.00, 'box', 'pcs', 20.0000, 1800.00, 'completed', '2026-01-14 14:53:59', '2026-01-14 14:56:05', 'uploads/receipts/receipt_6967ae072f1454.24271917.jpg'),
('411a169d-3432-4061-acae-72221ef22aa3', '74ab1be5-2bb7-48a6-9b22-b19d2dc9c102', 'user-purchaser-1', 'Donut', 'Brand A', 'Dry Goods', 'Robinson Mall', 'personal', 'paid', '2026-02-15', 1.00, 'pack', 'pcs', 6.0000, 299.00, 'completed', '2026-01-15 08:12:21', '2026-01-15 08:13:24', 'uploads/receipts/receipt_6968a165df25a5.84324334.jpg'),
('4e8eac4e-c1d8-405d-9228-52ff8384228f', '90e69d56-4fdc-4354-8398-bd973b3280e0', 'user-purchaser-1', 'Mango', 'Class S', 'Fruits & Vegetables', 'Merkado', 'personal', 'paid', '2026-01-22', 10.00, 'kg', 'pcs', 70.0000, 12000.00, 'completed', '2026-01-14 17:45:55', '2026-01-14 17:51:04', 'uploads/receipts/receipt_6967d6537c4397.09015250.jpg'),
('57589b42-9cfc-4680-9297-ef77d8674da5', 'aa696f2a-2273-43cb-9021-36d428e209c6', 'user-purchaser-1', 'Cream', 'Nestle', 'Dairy', 'Robinson Mall', 'personal', 'paid', '2026-02-14', 1.00, 'box', 'pcs', 10.0000, 300.00, 'completed', '2026-01-14 14:53:59', '2026-01-14 14:56:05', 'uploads/receipts/receipt_6967ae072f1454.24271917.jpg'),
('75eed3ea-9ceb-48b0-ae7d-f435de2e558a', 'f7ae7206-262c-4615-bd44-6c24f7a2d2b5', 'user-purchaser-1', 'Graham', 'Brand C', 'Baking Supplies', 'Robinson Mall', 'delivery', 'paid', '2026-06-15', 2.00, 'box', 'pcs', 20.0000, 900.00, 'completed', '2026-01-14 17:50:23', '2026-01-14 17:51:27', 'uploads/receipts/receipt_6968565c2f42f7.38338227.jpg'),
('900a484a-3f2b-4d6a-a101-95cb0943d373', '11df1adc-22ad-4539-a08b-4e724db722f5', 'user-purchaser-1', 'Cocoa Powder', 'Brand A', 'Dry Goods', 'Robinson Mall', 'delivery', 'unpaid', '2026-02-15', 1.00, 'sack', 'kg', 50.0000, 2100.00, 'completed', '2026-01-15 05:54:22', '2026-01-15 06:05:32', 'uploads/receipts/receipt_6968810e8b84c2.42724745.jpg'),
('aea94fd6-f1fa-42af-9fb4-edeeab8ed7e1', 'b054fb15-279b-435f-b940-91ed18aae05d', 'user-purchaser-1', 'Brown Sugar', 'Brand A', 'Dry Goods', 'RVDI', 'personal', 'paid', '2027-03-23', 1.00, 'sack', 'kg', 1.0000, 2500.00, 'completed', '2026-03-23 03:05:23', '2026-03-23 03:22:14', 'uploads/receipts/receipt_69c0adf395cca8.26175135.png'),
('b3583c02-e00a-44d4-9cbb-078d289450ad', '5a3dddf5-ae3e-4e4a-a0e8-a8a20311f8a9', 'user-purchaser-1', 'Rice', 'Brand A', 'Dry Goods', 'Robinson Mall', 'delivery', 'unpaid', '2026-02-15', 1.00, 'sack', 'kg', 50.0000, 2100.00, 'completed', '2026-01-15 05:59:52', '2026-01-15 06:05:28', 'uploads/receipts/receipt_69688258bad266.55306787.jpg'),
('b47be537-047e-47b5-b74e-3141ba2373be', '3d487b5c-03d4-4046-bc66-44770589130e', 'user-purchaser-1', 'Egg', '', 'Meat & Poultry', 'Robinson Mall', 'personal', 'paid', '2026-01-22', 60.00, 'pcs', 'pcs', 60.0000, 18000.00, 'completed', '2026-01-15 08:24:37', '2026-01-15 08:25:14', 'uploads/receipts/receipt_6968a445d6d222.37240197.jpg'),
('e6248b40-4187-4731-a498-6bce76697c85', '603cca19-05de-4e0a-939c-69f06ba45ba2', 'user-purchaser-1', 'White Sugar', 'Brand A', 'Dry Goods', 'Robinson Mall', 'delivery', 'unpaid', '2026-04-15', 1.00, 'sack', 'kg', 50.0000, 2100.00, 'completed', '2026-01-15 05:51:02', '2026-01-15 06:05:36', 'uploads/receipts/receipt_69688046adf448.65046868.jpg'),
('ead5b124-e395-45c9-b3bc-20bce1975f15', '01ed8c09-a4b0-4054-9cf6-98d9eb60e2a9', 'user-purchaser-1', 'Pork', 'Brand A', 'Meat & Poultry', 'Merkado', 'personal', 'paid', '2026-01-29', 1.00, 'kg', 'kg', 1.0000, 500.00, 'completed', '2026-01-15 06:11:02', '2026-01-15 06:11:31', 'uploads/receipts/receipt_696884f6131c34.71055442.jpg'),
('fb5d60b9-9f73-4d19-a525-2de4ada09c14', '03e1c5b3-9923-4033-b9a6-336b7873a64a', 'user-6967cd592c0d75.43641527', 'Mayonaise', 'Brand A', 'Dairy', 'Robinson Mall', 'personal', 'paid', '2026-02-15', 1.00, 'box', 'pcs', 10.0000, 300.00, 'completed', '2026-01-14 17:34:29', '2026-01-14 17:43:14', 'uploads/receipts/receipt_6967d3a545b5b3.83990882.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `requests`
--

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
  `requested_unit` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `requests`
--

INSERT INTO `requests` (`id`, `kitchen_staff_id`, `ingredient_set_id`, `ingredient_set_name`, `quantity`, `status`, `date_requested`, `date_processed`, `processed_by`, `has_insufficient_inventory`, `insufficient_items`, `is_single_item`, `inventory_item_id`, `inventory_item_name`, `requested_quantity`, `requested_unit`) VALUES
('27abd98c-dc8a-4163-8454-280f3b84aca2', 'user-kitchen-1', '762c70e2-bbd9-4e8c-a3db-343b74d9eac9', 'Chocolate Cake', 1, 'approved', '2026-01-15 06:08:58', '2026-01-15 06:09:18', 'user-stock-1', 0, '[]', 0, NULL, '', 0.00, ''),
('5133d245-c03f-49da-b29b-cd5301b3561b', 'user-kitchen-1', '762c70e2-bbd9-4e8c-a3db-343b74d9eac9', 'Chocolate Cake', 1, 'approved', '2026-01-15 08:16:45', '2026-01-15 08:17:35', 'user-stock-1', 0, '[]', 0, NULL, '', 0.00, ''),
('55363a50-2aac-457a-ac86-46669d029141', 'user-kitchen-1', 'c757fd13-3712-4cff-a648-eda03f272c41', 'Mango Cake', 1, 'rejected', '2026-03-23 06:48:14', '2026-03-23 07:01:56', 'user-stock-1', 1, '[\"White Sugar (packaged item not found)\"]', 0, NULL, '', 0.00, ''),
('bc339c8e-4d8e-4ea8-b332-af7465f2fdbe', 'user-kitchen-1', '7f0029d7-57f5-4e88-9afc-8338b3714b91', 'Mango Cake', 1, 'approved', '2026-01-15 08:16:45', '2026-01-15 08:17:33', 'user-stock-1', 0, '[]', 0, NULL, '', 0.00, ''),
('ef474e8c-97ec-4aad-8915-05f9a5efc3b9', 'user-kitchen-1', '762c70e2-bbd9-4e8c-a3db-343b74d9eac9', 'Chocolate Cake', 1, 'rejected', '2026-03-21 02:06:10', '2026-03-21 02:06:32', 'user-stock-1', 0, '[]', 0, NULL, '', 0.00, ''),
('f767161a-22a6-4b76-b296-b3096b5da100', 'user-kitchen-1', '7f0029d7-57f5-4e88-9afc-8338b3714b91', 'Mango Cake', 1, 'approved', '2026-03-21 01:57:27', '2026-03-21 02:03:27', 'user-stock-1', 0, '[]', 0, NULL, '', 0.00, '');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) NOT NULL,
  `user_id` varchar(100) DEFAULT NULL,
  `user_data` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_config`
--

CREATE TABLE `system_config` (
  `id` varchar(36) NOT NULL,
  `config_key` varchar(100) NOT NULL,
  `config_value` text DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `system_config`
--

INSERT INTO `system_config` (`id`, `config_key`, `config_value`, `description`, `updated_at`) VALUES
('config-1', 'low_stock_threshold_percentage', '20', 'Percentage below min stock level to trigger low stock alert', '2026-01-14 12:08:17'),
('config-2', 'default_min_stock_level', '10', 'Default minimum stock level for new items', '2026-01-14 12:08:17'),
('config-3', 'enable_email_notifications', 'false', 'Enable email notifications for low stock', '2026-01-14 12:08:17'),
('config-4', 'backup_retention_days', '30', 'Number of days to retain backups', '2026-01-14 12:08:17');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `role` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `name`, `email`, `role`, `created_at`) VALUES
('user-69c0ea1033c707.28294494', 'Loren', '$2y$12$Q3Oh.1zZm9aqwlsU07bRCuWPqo.7uQgn7zeEhjMtAYEP9bBnqrI9W', 'Loren Capuyan', 'loren.capuyan@evsu.edu.ph', 'stock_handler', '2026-03-23 15:21:52'),
('user-admin-1', 'admin', '$2y$12$zKUccWLQQfW2WZN8e.umfeVZgDyRJvx/OXR4KcWWTpFlDGwF5AjsO', 'Admin User', 'admin@commissary.com', 'admin', '2026-01-13 23:41:43'),
('user-kitchen-1', 'kitchen_staff', '$2y$12$zKUccWLQQfW2WZN8e.umfeVZgDyRJvx/OXR4KcWWTpFlDGwF5AjsO', 'Mike', 'kitchen@commissary.com', 'kitchen_staff', '2026-01-13 23:41:43'),
('user-purchaser-1', 'purchaser', '$2y$12$zKUccWLQQfW2WZN8e.umfeVZgDyRJvx/OXR4KcWWTpFlDGwF5AjsO', 'John Ruiz', 'purchaser@commissary.com', 'purchaser', '2026-01-13 23:41:43'),
('user-stock-1', 'stock_handler', '$2y$12$zKUccWLQQfW2WZN8e.umfeVZgDyRJvx/OXR4KcWWTpFlDGwF5AjsO', 'Angie', 'stock@commissary.com', 'stock_handler', '2026-01-13 23:41:43');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_timestamp` (`timestamp`),
  ADD KEY `idx_action` (`action`);

--
-- Indexes for table `disposals`
--
ALTER TABLE `disposals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_inventory_item` (`inventory_item_id`),
  ADD KEY `idx_disposed_at` (`disposed_at`),
  ADD KEY `idx_reason` (`reason`);

--
-- Indexes for table `ingredients`
--
ALTER TABLE `ingredients`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ingredient_set` (`ingredient_set_id`),
  ADD KEY `idx_inventory_item` (`inventory_item_id`);

--
-- Indexes for table `ingredient_sets`
--
ALTER TABLE `ingredient_sets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_name` (`name`);

--
-- Indexes for table `inventory_items`
--
ALTER TABLE `inventory_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_name` (`name`);

--
-- Indexes for table `packaged_items`
--
ALTER TABLE `packaged_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_raw_item` (`raw_inventory_item_id`),
  ADD KEY `idx_category` (`category`);

--
-- Indexes for table `password_verification_codes`
--
ALTER TABLE `password_verification_codes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_code` (`code`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indexes for table `purchases`
--
ALTER TABLE `purchases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_batch_id` (`batch_id`),
  ADD KEY `idx_date_created` (`date_created`);

--
-- Indexes for table `requests`
--
ALTER TABLE `requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_kitchen_staff` (`kitchen_staff_id`),
  ADD KEY `idx_date_requested` (`date_requested`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `system_config`
--
ALTER TABLE `system_config`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `config_key` (`config_key`),
  ADD KEY `idx_key` (`config_key`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_role` (`role`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `ingredients`
--
ALTER TABLE `ingredients`
  ADD CONSTRAINT `ingredients_ibfk_1` FOREIGN KEY (`ingredient_set_id`) REFERENCES `ingredient_sets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `password_verification_codes`
--
ALTER TABLE `password_verification_codes`
  ADD CONSTRAINT `password_verification_codes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
