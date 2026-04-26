<?php
/**
 * Database Configuration
 * 
 * LOCAL DEVELOPMENT (XAMPP):
 * - host: 'localhost'
 * - dbname: 'ikea_inventory'
 * - username: 'root'
 * - password: '' (empty)
 * 
 * PRODUCTION (HOSTINGER):
 * - Update the values below with your Hostinger MySQL credentials
 * - Find these in Hostinger hPanel → Databases → MySQL Databases
 */

// Production database credentials (UPDATE THESE WHEN DEPLOYING TO HOSTINGER)
// Tip: On Hostinger, db name/user often look like u123456789_dbname / u123456789_user
$productionDbHost = 'localhost';
$productionDbName = 'u123456789_ikea_inventory';
$productionDbUser = 'u123456789_dbuser';
$productionDbPass = 'your_secure_password';

// Detect if we're on localhost (handles localhost, 127.0.0.1, localhost:8080, etc.)
$httpHost = $_SERVER['HTTP_HOST'] ?? '';
$isLocalhost = strpos($httpHost, 'localhost') === 0 || 
               strpos($httpHost, '127.0.0.1') === 0 ||
               strpos($httpHost, '.local') !== false ||
               empty($httpHost);

// Environment variable override (recommended for production)
// You can set these in Hostinger (if available) or hardcode below:
// DB_HOST, DB_NAME, DB_USER, DB_PASS
$envHost = getenv('DB_HOST') ?: '';
$envName = getenv('DB_NAME') ?: '';
$envUser = getenv('DB_USER') ?: '';
$envPass = getenv('DB_PASS') ?: '';
$hasEnvCreds = ($envHost !== '' && $envName !== '' && $envUser !== '');

// Use production config if we're not on localhost.
// (On Hostinger, using local XAMPP creds will ALWAYS fail.)
$isProduction = !$isLocalhost;

if ($isProduction) {
    // PRODUCTION CONFIGURATION (HOSTINGER)
    // TODO: Update these values with your Hostinger database credentials (or set env vars)
    return [
        'host' => $hasEnvCreds ? $envHost : $productionDbHost,
        'dbname' => $hasEnvCreds ? $envName : $productionDbName,
        'username' => $hasEnvCreds ? $envUser : $productionDbUser,
        'password' => $hasEnvCreds ? $envPass : $productionDbPass,
        'charset' => 'utf8mb4'
    ];
} else {
    // LOCAL DEVELOPMENT CONFIGURATION (XAMPP)
    return [
        'host' => 'localhost',
        'dbname' => 'ikea_inventory',
        'username' => 'root',
        'password' => '',
        'charset' => 'utf8mb4'
    ];
}
