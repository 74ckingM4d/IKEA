<?php
/**
 * Export Database for Hostinger
 * 
 * This script exports your entire database (structure + data) 
 * in a clean SQL format compatible with Hostinger phpMyAdmin.
 * 
 * Usage: Run this from command line or browser
 * php export_for_hostinger.php
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../backend/Database.php';

$outputFile = __DIR__ . '/ikea_inventory_hostinger_ready.sql';

echo "=== Exporting Database for Hostinger ===\n\n";

try {
    $db = Database::getInstance()->getConnection();
    $dbName = $db->query("SELECT DATABASE()")->fetchColumn();
    
    echo "Connected to database: $dbName\n";
    
    // Get all tables
    $tables = [];
    $stmt = $db->query("SHOW TABLES");
    while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
        $tables[] = $row[0];
    }
    
    echo "Found " . count($tables) . " tables\n\n";
    
    $output = "-- IKEA Commissary Database Export for Hostinger\n";
    $output .= "-- Generated: " . date('Y-m-d H:i:s') . "\n";
    $output .= "-- Database: $dbName\n";
    $output .= "-- This file is compatible with Hostinger phpMyAdmin\n\n";
    $output .= "-- Note: Do NOT include CREATE DATABASE or USE statements\n";
    $output .= "-- Select your database in phpMyAdmin before importing\n\n";
    $output .= "SET FOREIGN_KEY_CHECKS=0;\n";
    $output .= "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n";
    $output .= "SET AUTOCOMMIT=0;\n";
    $output .= "START TRANSACTION;\n\n";
    
    // Export each table
    foreach ($tables as $table) {
        echo "Exporting table: $table...\n";
        
        // Get CREATE TABLE statement
        $stmt = $db->query("SHOW CREATE TABLE `$table`");
        $createTable = $stmt->fetch(PDO::FETCH_ASSOC);
        $createSql = $createTable['Create Table'];
        
        // Remove DEFINER if present (for views, triggers, etc.)
        $createSql = preg_replace('/DEFINER\s*=\s*[^\s]+\s+/i', '', $createSql);
        
        // Remove AUTO_INCREMENT values (let MySQL assign new ones)
        $createSql = preg_replace('/AUTO_INCREMENT=\d+/i', '', $createSql);
        
        $output .= "-- --------------------------------------------------------\n";
        $output .= "-- Table structure for `$table`\n";
        $output .= "-- --------------------------------------------------------\n\n";
        $output .= "DROP TABLE IF EXISTS `$table`;\n";
        $output .= $createSql . ";\n\n";
        
        // Get table data
        $stmt = $db->query("SELECT * FROM `$table`");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($rows) > 0) {
            $output .= "-- --------------------------------------------------------\n";
            $output .= "-- Dumping data for table `$table`\n";
            $output .= "-- --------------------------------------------------------\n\n";
            
            // Get column names
            $columns = array_keys($rows[0]);
            $columnList = '`' . implode('`, `', $columns) . '`';
            
            // Generate INSERT statements in batches
            $batchSize = 100;
            $batches = array_chunk($rows, $batchSize);
            
            foreach ($batches as $batch) {
                $output .= "INSERT INTO `$table` ($columnList) VALUES\n";
                
                $values = [];
                foreach ($batch as $row) {
                    $rowValues = [];
                    foreach ($columns as $col) {
                        $value = $row[$col];
                        if ($value === null) {
                            $rowValues[] = 'NULL';
                        } else {
                            // Escape the value properly
                            $value = str_replace(['\\', "'", "\n", "\r"], ['\\\\', "\\'", "\\n", "\\r"], $value);
                            $rowValues[] = "'$value'";
                        }
                    }
                    $values[] = '(' . implode(', ', $rowValues) . ')';
                }
                
                $output .= implode(",\n", $values) . ";\n\n";
            }
            
            echo "  → Exported " . count($rows) . " rows\n";
        } else {
            echo "  → Table is empty\n";
            $output .= "-- Table `$table` is empty\n\n";
        }
    }
    
    $output .= "SET FOREIGN_KEY_CHECKS=1;\n";
    $output .= "COMMIT;\n";
    
    // Write to file
    file_put_contents($outputFile, $output);
    
    $fileSize = filesize($outputFile);
    echo "\n✅ Export completed successfully!\n";
    echo "📁 File saved to: $outputFile\n";
    echo "📊 File size: " . number_format($fileSize) . " bytes (" . round($fileSize / 1024, 2) . " KB)\n";
    echo "\n📋 Next steps:\n";
    echo "1. Go to Hostinger phpMyAdmin\n";
    echo "2. Select your database\n";
    echo "3. Click 'Import' tab\n";
    echo "4. Choose this file: ikea_inventory_hostinger_ready.sql\n";
    echo "5. Click 'Go' to import\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
