<?php
// Suppress warnings/notices in production (log them instead)
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Set headers first (content-type will be set per action for file uploads)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

require_once __DIR__ . '/../backend/Store.php';
require_once __DIR__ . '/../backend/types.php';

session_start();

// Create Store instance - it will load from database automatically
$store = new Store();

// Load current user from session if available
if (isset($_SESSION['current_user'])) {
    $userData = $_SESSION['current_user'];
    // Create user object from session data (skip authentication for session restore)
    require_once __DIR__ . '/../backend/types.php';
    $reflection = new ReflectionClass($store);
    $property = $reflection->getProperty('currentUser');
    $property->setAccessible(true);
    $property->setValue($store, new User(
        $userData['id'],
        $userData['name'],
        $userData['role'],
        $userData['email']
    ));
}
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$action = $_GET['action'] ?? '';

// Debug logging (remove in production)
error_log("API Request - Method: $method, Action: $action, Raw Method: " . ($_SERVER['REQUEST_METHOD'] ?? 'N/A'));

$response = ['success' => false, 'data' => null, 'error' => ''];

// Strong password validation function
function validateStrongPassword($password) {
    if (strlen($password) < 8) {
        return ['valid' => false, 'error' => 'Password must be at least 8 characters long'];
    }
    
    if (!preg_match('/[A-Z]/', $password)) {
        return ['valid' => false, 'error' => 'Password must contain at least one uppercase letter (A-Z)'];
    }
    
    if (!preg_match('/[a-z]/', $password)) {
        return ['valid' => false, 'error' => 'Password must contain at least one lowercase letter (a-z)'];
    }
    
    if (!preg_match('/[0-9]/', $password)) {
        return ['valid' => false, 'error' => 'Password must contain at least one number (0-9)'];
    }
    
    if (!preg_match('/[!@#$%^&*()_+\-=\[\]{};\':"\\\\|,.<>\/?]/', $password)) {
        return ['valid' => false, 'error' => 'Password must contain at least one special character (!@#$%^&*)'];
    }
    
    return ['valid' => true, 'error' => ''];
}

try {
    switch ($action) {
        case 'login':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                $username = $data['username'] ?? '';
                $password = $data['password'] ?? '';
                
                if (empty($username) || empty($password)) {
                    $response['error'] = 'Username and password are required';
                } else {
                    try {
                        error_log("Login attempt - Username: $username");
                        $user = $store->login($username, $password);
                        // Save user to session
                        if ($user) {
                            $_SESSION['current_user'] = $user->toArray();
                            $response = ['success' => true, 'data' => $user->toArray()];
                            error_log("Login successful - User: {$user->name} (Role: {$user->role})");
                        } else {
                            $response['error'] = 'Login failed - user not set';
                            error_log("Login failed - User object not returned");
                        }
                    } catch (Exception $e) {
                        $errorMsg = $e->getMessage();
                        $response['error'] = $errorMsg;
                        error_log("Login exception - Username: $username, Error: $errorMsg");
                    }
                }
            } else {
                http_response_code(405);
                $response['error'] = 'Method not allowed. Expected POST, got ' . $method . ' (Raw: ' . ($_SERVER['REQUEST_METHOD'] ?? 'N/A') . ')';
                error_log("Login failed - Wrong method: $method (Raw: " . ($_SERVER['REQUEST_METHOD'] ?? 'N/A') . ")");
            }
            break;

        case 'logout':
            if ($method === 'POST') {
                $store->logout();
                unset($_SESSION['current_user']);
                $response = ['success' => true];
            } else {
                $response['error'] = 'Method not allowed. Expected POST, got ' . $method;
            }
            break;

        case 'getState':
            if ($method === 'GET') {
                $response = ['success' => true, 'data' => $store->toArray()];
            } else {
                $response['error'] = 'Method not allowed. Expected GET, got ' . $method;
            }
            break;

        case 'uploadReceipt':
            if ($method === 'POST') {
                header('Content-Type: application/json');
                try {
                    // Create uploads/receipts directory if it doesn't exist
                    $uploadDir = __DIR__ . '/../uploads/receipts/';
                    if (!file_exists($uploadDir)) {
                        if (!mkdir($uploadDir, 0755, true)) {
                            throw new Exception('Failed to create upload directory. Please check permissions.');
                        }
                    }
                    
                    // Check if directory is writable
                    if (!is_writable($uploadDir)) {
                        throw new Exception('Upload directory is not writable. Please check permissions.');
                    }
                    
                    if (!isset($_FILES['receipt'])) {
                        $uploadError = $_FILES['receipt']['error'] ?? 'No file uploaded';
                        $errorMessages = [
                            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize directive',
                            UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE directive',
                            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                            UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
                        ];
                        $errorMsg = $errorMessages[$uploadError] ?? "Upload error: $uploadError";
                        $response = ['success' => false, 'error' => $errorMsg];
                        break;
                    }
                    
                    if ($_FILES['receipt']['error'] !== UPLOAD_ERR_OK) {
                        $errorMessages = [
                            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize directive',
                            UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE directive',
                            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                            UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
                        ];
                        $errorMsg = $errorMessages[$_FILES['receipt']['error']] ?? "Upload error: {$_FILES['receipt']['error']}";
                        $response = ['success' => false, 'error' => $errorMsg];
                        break;
                    }
                    
                    $file = $_FILES['receipt'];
                    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
                    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
                    $maxSize = 10 * 1024 * 1024; // 10MB
                    
                    // Validate file size first
                    if ($file['size'] > $maxSize) {
                        $response = ['success' => false, 'error' => 'File size exceeds 10MB limit'];
                        break;
                    }
                    
                    // Validate file type using finfo if available, otherwise use extension
                    $mimeType = null;
                    if (function_exists('finfo_open')) {
                        try {
                            $finfo = finfo_open(FILEINFO_MIME_TYPE);
                            if ($finfo) {
                                $mimeType = finfo_file($finfo, $file['tmp_name']);
                                finfo_close($finfo);
                            }
                        } catch (Exception $e) {
                            error_log("finfo error: " . $e->getMessage());
                        }
                    }
                    
                    // Fallback to extension-based validation if finfo failed
                    if (!$mimeType) {
                        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                        if (!in_array($extension, $allowedExtensions)) {
                            $response = ['success' => false, 'error' => 'Invalid file type. Please upload an image (JPG, PNG, GIF, WebP) or PDF file.'];
                            break;
                        }
                        // Set mime type based on extension for validation
                        $mimeMap = [
                            'jpg' => 'image/jpeg',
                            'jpeg' => 'image/jpeg',
                            'png' => 'image/png',
                            'gif' => 'image/gif',
                            'webp' => 'image/webp',
                            'pdf' => 'application/pdf'
                        ];
                        $mimeType = $mimeMap[$extension] ?? null;
                    }
                    
                    // Final mime type validation
                    if ($mimeType && !in_array($mimeType, $allowedTypes)) {
                        $response = ['success' => false, 'error' => 'Invalid file type. Please upload an image (JPG, PNG, GIF, WebP) or PDF file.'];
                        break;
                    }
                    
                    // Generate unique filename
                    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
                    $filename = uniqid('receipt_', true) . '.' . $extension;
                    $filepath = $uploadDir . $filename;
                    
                    // Move uploaded file
                    if (move_uploaded_file($file['tmp_name'], $filepath)) {
                        $relativePath = 'uploads/receipts/' . $filename;
                        $response = ['success' => true, 'receiptPath' => $relativePath];
                    } else {
                        $lastError = error_get_last();
                        $errorMsg = 'Failed to save file';
                        if ($lastError) {
                            $errorMsg .= ': ' . $lastError['message'];
                        }
                        $response = ['success' => false, 'error' => $errorMsg];
                    }
                } catch (Exception $e) {
                    error_log("Error uploading receipt: " . $e->getMessage());
                    error_log("Stack trace: " . $e->getTraceAsString());
                    $response = ['success' => false, 'error' => $e->getMessage()];
                } catch (Error $e) {
                    error_log("Fatal error uploading receipt: " . $e->getMessage());
                    error_log("Stack trace: " . $e->getTraceAsString());
                    $response = ['success' => false, 'error' => 'Server error: ' . $e->getMessage()];
                }
            } else {
                $response = ['success' => false, 'error' => 'Method not allowed. Expected POST, got ' . $method];
            }
            break;

        case 'uploadRecipeImage':
            if ($method === 'POST') {
                header('Content-Type: application/json');
                try {
                    // Create uploads/recipes directory if it doesn't exist
                    $uploadDir = __DIR__ . '/../uploads/recipes/';
                    if (!file_exists($uploadDir)) {
                        if (!mkdir($uploadDir, 0755, true)) {
                            throw new Exception('Failed to create upload directory. Please check permissions.');
                        }
                    }
                    
                    // Check if directory is writable
                    if (!is_writable($uploadDir)) {
                        throw new Exception('Upload directory is not writable. Please check permissions.');
                    }
                    
                    if (!isset($_FILES['recipeImage'])) {
                        $uploadError = $_FILES['recipeImage']['error'] ?? 'No file uploaded';
                        $errorMessages = [
                            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize directive',
                            UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE directive',
                            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                            UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
                        ];
                        $errorMsg = $errorMessages[$uploadError] ?? "Upload error: $uploadError";
                        $response = ['success' => false, 'error' => $errorMsg];
                        break;
                    }
                    
                    if ($_FILES['recipeImage']['error'] !== UPLOAD_ERR_OK) {
                        $errorMessages = [
                            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize directive',
                            UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE directive',
                            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                            UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
                        ];
                        $errorMsg = $errorMessages[$_FILES['recipeImage']['error']] ?? "Upload error: {$_FILES['recipeImage']['error']}";
                        $response = ['success' => false, 'error' => $errorMsg];
                        break;
                    }
                    
                    $file = $_FILES['recipeImage'];
                    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                    $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                    $maxSize = 5 * 1024 * 1024; // 5MB
                    
                    // Validate file size first
                    if ($file['size'] > $maxSize) {
                        $response = ['success' => false, 'error' => 'File size exceeds 5MB limit'];
                        break;
                    }
                    
                    // Validate file type using finfo if available, otherwise use extension
                    $mimeType = null;
                    if (function_exists('finfo_open')) {
                        try {
                            $finfo = finfo_open(FILEINFO_MIME_TYPE);
                            if ($finfo) {
                                $mimeType = finfo_file($finfo, $file['tmp_name']);
                                finfo_close($finfo);
                            }
                        } catch (Exception $e) {
                            error_log("finfo error: " . $e->getMessage());
                        }
                    }
                    
                    // Fallback to extension-based validation if finfo failed
                    if (!$mimeType) {
                        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                        if (!in_array($extension, $allowedExtensions)) {
                            $response = ['success' => false, 'error' => 'Invalid file type. Allowed: ' . implode(', ', $allowedExtensions)];
                            break;
                        }
                    } else {
                        if (!in_array($mimeType, $allowedTypes)) {
                            $response = ['success' => false, 'error' => 'Invalid file type. Allowed: images only'];
                            break;
                        }
                    }
                    
                    // Generate unique filename
                    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
                    $filename = uniqid('recipe_', true) . '.' . $extension;
                    $filepath = $uploadDir . $filename;
                    
                    // Move uploaded file
                    if (move_uploaded_file($file['tmp_name'], $filepath)) {
                        $relativePath = 'uploads/recipes/' . $filename;
                        $response = ['success' => true, 'imagePath' => $relativePath];
                    } else {
                        $lastError = error_get_last();
                        $errorMsg = 'Failed to save file';
                        if ($lastError) {
                            $errorMsg .= ': ' . $lastError['message'];
                        }
                        $response = ['success' => false, 'error' => $errorMsg];
                    }
                } catch (Exception $e) {
                    error_log("Error uploading recipe image: " . $e->getMessage());
                    error_log("Stack trace: " . $e->getTraceAsString());
                    $response = ['success' => false, 'error' => $e->getMessage()];
                } catch (Error $e) {
                    error_log("Fatal error uploading recipe image: " . $e->getMessage());
                    error_log("Stack trace: " . $e->getTraceAsString());
                    $response = ['success' => false, 'error' => 'Server error: ' . $e->getMessage()];
                }
            } else {
                $response = ['success' => false, 'error' => 'Method not allowed. Expected POST, got ' . $method];
            }
            break;

        case 'addPurchase':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                $store->addPurchase($data);
                $response = ['success' => true, 'data' => $store->toArray()];
            }
            break;

        case 'confirmDelivery':
            if ($method === 'POST') {
                try {
                    $data = json_decode(file_get_contents('php://input'), true);
                    $store->confirmDelivery($data['id'], $data['isComplete']);
                    
                    // CRITICAL: Force reload entire inventory from database AFTER update
                    // This ensures we return the latest values from the database
                    $store->reloadInventory();
                    $store->reloadPurchases();
                    
                    // Get fresh state from database
                    $state = $store->toArray();
                    
                    // Log inventory quantities for debugging
                    if (isset($state['inventory']) && is_array($state['inventory'])) {
                        error_log("Returning inventory with " . count($state['inventory']) . " items");
                        foreach ($state['inventory'] as $item) {
                            if (isset($item['quantity'])) {
                                error_log("  - {$item['name']}: {$item['quantity']} {$item['unit']}");
                            }
                        }
                    }
                    
                    $response = ['success' => true, 'data' => $state];
                } catch (Exception $e) {
                    error_log("Error in confirmDelivery API: " . $e->getMessage());
                    $response = ['success' => false, 'error' => $e->getMessage()];
                }
            }
            break;

        case 'confirmDeliveryPartial':
            if ($method === 'POST') {
                try {
                    $data = json_decode(file_get_contents('php://input'), true);
                    $store->confirmDeliveryPartial($data['id'], $data['receivedQuantity']);
                    
                    // CRITICAL: Force reload entire inventory from database AFTER update
                    // This ensures we return the latest values from the database
                    $store->reloadInventory();
                    $store->reloadPurchases();
                    
                    // Get fresh state from database
                    $state = $store->toArray();
                    
                    // Log inventory quantities for debugging
                    if (isset($state['inventory']) && is_array($state['inventory'])) {
                        error_log("Returning inventory with " . count($state['inventory']) . " items");
                        foreach ($state['inventory'] as $item) {
                            if (isset($item['quantity'])) {
                                error_log("  - {$item['name']}: {$item['quantity']} {$item['unit']}");
                            }
                        }
                    }
                    
                    $response = ['success' => true, 'data' => $state];
                } catch (Exception $e) {
                    error_log("Error in confirmDeliveryPartial API: " . $e->getMessage());
                    $response = ['success' => false, 'error' => $e->getMessage()];
                }
            }
            break;

        case 'createPackage':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                $store->createPackage($data['rawItemId'], $data['totalRawQty'], $data['packSize'], $data['packUnit']);
                $response = ['success' => true, 'data' => $store->toArray()];
            }
            break;

        case 'deletePackage':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                $store->deletePackage($data['packageId']);
                $response = ['success' => true, 'data' => $store->toArray()];
            }
            break;

        case 'addIngredientSet':
            if ($method === 'POST') {
                try {
                    $data = json_decode(file_get_contents('php://input'), true);
                    error_log("addIngredientSet - Received data: " . json_encode($data));
                    
                    if (empty($data['name'])) {
                        $response = ['success' => false, 'error' => 'Recipe name is required'];
                        break;
                    }
                    
                    if (empty($data['ingredients']) || !is_array($data['ingredients']) || count($data['ingredients']) === 0) {
                        $response = ['success' => false, 'error' => 'At least one ingredient is required'];
                        break;
                    }
                    
                    $store->addIngredientSet($data);
                    error_log("addIngredientSet - Set created successfully");
                    
                    // CRITICAL: Force reload ingredient sets from database AFTER creation
                    // This ensures we return the latest values from the database
                    $store->reloadIngredientSets();
                    
                    $state = $store->toArray();
                    $ingredientSetsCount = count($state['ingredientSets'] ?? []);
                    error_log("addIngredientSet - Reloaded state with {$ingredientSetsCount} ingredient sets");
                    
                    $response = ['success' => true, 'data' => $state];
                } catch (Exception $e) {
                    error_log("Error adding ingredient set: " . $e->getMessage());
                    error_log("Stack trace: " . $e->getTraceAsString());
                    $response = ['success' => false, 'error' => $e->getMessage()];
                } catch (Error $e) {
                    error_log("Fatal error adding ingredient set: " . $e->getMessage());
                    error_log("Stack trace: " . $e->getTraceAsString());
                    $response = ['success' => false, 'error' => 'Server error: ' . $e->getMessage()];
                }
            }
            break;

        case 'deleteIngredientSet':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                $store->deleteIngredientSet($data['id']);
                $response = ['success' => true, 'data' => $store->toArray()];
            }
            break;

        case 'addRequest':
            if ($method === 'POST') {
                try {
                    $data = json_decode(file_get_contents('php://input'), true);
                    if (!isset($data['setId']) || !isset($data['quantity'])) {
                        $response = ['success' => false, 'error' => 'Missing required fields: setId and quantity'];
                    } else {
                        error_log("API addRequest - Received data: setId={$data['setId']}, quantity={$data['quantity']}");
                        $store->addRequest($data['setId'], $data['quantity']);
                        // Reload requests from database to ensure fresh data
                        $store->reloadRequests();
                        $response = ['success' => true, 'data' => $store->toArray()];
                        error_log("API addRequest - Success, returning " . count($response['data']['requests'] ?? []) . " requests");
                    }
                } catch (Exception $e) {
                    error_log("CRITICAL ERROR in addRequest API: " . $e->getMessage());
                    error_log("Stack trace: " . $e->getTraceAsString());
                    $response = ['success' => false, 'error' => $e->getMessage()];
                }
            }
            break;

        case 'addSingleItemRequest':
            if ($method === 'POST') {
                try {
                    $data = json_decode(file_get_contents('php://input'), true);
                    if (!isset($data['inventoryItemId']) || !isset($data['requestedQuantity']) || !isset($data['requestedUnit'])) {
                        $response = ['success' => false, 'error' => 'Missing required fields: inventoryItemId, requestedQuantity, and requestedUnit'];
                    } else {
                        error_log("API addSingleItemRequest - Received data: itemId={$data['inventoryItemId']}, qty={$data['requestedQuantity']}, unit={$data['requestedUnit']}");
                        $store->addSingleItemRequest($data['inventoryItemId'], $data['requestedQuantity'], $data['requestedUnit']);
                        // Reload requests from database to ensure fresh data
                        $store->reloadRequests();
                        $response = ['success' => true, 'data' => $store->toArray()];
                        error_log("API addSingleItemRequest - Success, returning " . count($response['data']['requests'] ?? []) . " requests");
                    }
                } catch (Exception $e) {
                    error_log("CRITICAL ERROR in addSingleItemRequest API: " . $e->getMessage());
                    error_log("Stack trace: " . $e->getTraceAsString());
                    $response = ['success' => false, 'error' => $e->getMessage()];
                }
            }
            break;

        case 'processRequest':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                $result = $store->processRequest($data['requestId'], $data['approved']);
                // Reload requests from database to ensure fresh data after status update
                $store->reloadRequests();
                $response = $result;
                $response['data'] = $store->toArray();
            }
            break;

        case 'updateInventoryItem':
            if ($method === 'POST') {
                try {
                    $data = json_decode(file_get_contents('php://input'), true);
                    
                    // CRITICAL: Log incoming data to debug field name issues
                    error_log("API updateInventoryItem - Received data: " . json_encode($data));
                    
                    // Handle wrong field name: if frontend sends "qty" instead of "quantity"
                    if (isset($data['qty']) && !isset($data['quantity'])) {
                        error_log("WARNING: Frontend sent 'qty' instead of 'quantity', converting...");
                        $data['quantity'] = $data['qty'];
                        unset($data['qty']);
                    }
                    
                    // CRITICAL VALIDATION: If quantity is being updated, it must be provided and valid
                    if (isset($data['quantity'])) {
                        if (!is_numeric($data['quantity']) || $data['quantity'] < 0) {
                            throw new Exception("Quantity must be a valid non-negative number. Received: " . var_export($data['quantity'], true));
                        }
                    }
                    
                    $result = $store->updateInventoryItem($data['itemId'], $data);
                    $response = $result;
                    $response['data'] = $store->toArray();
                } catch (Exception $e) {
                    error_log("Error in updateInventoryItem API: " . $e->getMessage());
                    $response = ['success' => false, 'error' => $e->getMessage()];
                }
            }
            break;

        case 'deletePurchase':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                $result = $store->deletePurchase($data['id']);
                $response = $result;
                $response['data'] = $store->toArray();
            }
            break;

        case 'updatePaymentStatus':
            if ($method === 'POST') {
                try {
                    $data = json_decode(file_get_contents('php://input'), true);
                    $type = $data['type'] ?? ''; // 'batch' or 'single'
                    $id = $data['id'] ?? '';
                    $paidAmount = $data['paidAmount'] ?? 0;
                    $receiptPath = $data['receiptPath'] ?? '';
                    $notes = $data['notes'] ?? '';
                    
                    if (empty($type) || empty($id) || empty($receiptPath)) {
                        $response = ['success' => false, 'error' => 'Missing required fields: type, id, and receiptPath'];
                    } else {
                        if ($store->getDb()->updatePaymentStatus($type, $id, $paidAmount, $receiptPath, $notes)) {
                            // Reload purchases to get updated data
                            $store->reloadPurchases();
                            $response = ['success' => true, 'data' => $store->toArray()];
                        } else {
                            $response = ['success' => false, 'error' => 'Failed to update payment status'];
                        }
                    }
                } catch (Exception $e) {
                    error_log("Error updating payment status: " . $e->getMessage());
                    $response = ['success' => false, 'error' => $e->getMessage()];
                }
            } else {
                $response = ['success' => false, 'error' => 'Method not allowed. Expected POST, got ' . $method];
            }
            break;

        case 'deleteRequest':
            if ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                $store->deleteRequest($data['id']);
                $response = ['success' => true, 'data' => $store->toArray()];
            }
            break;

        case 'disposeInventoryItem':
            if ($method === 'POST') {
                try {
                    $data = json_decode(file_get_contents('php://input'), true);
                    if (!isset($data['itemId']) || !isset($data['quantity']) || !isset($data['reason'])) {
                        $response = ['success' => false, 'error' => 'Missing required fields: itemId, quantity, and reason'];
                    } else {
                        $disposal = $store->disposeInventoryItem(
                            $data['itemId'],
                            floatval($data['quantity']),
                            $data['reason'],
                            $data['notes'] ?? null
                        );
                        // Reload inventory to get updated quantities
                        $store->reloadInventory();
                        $response = ['success' => true, 'data' => $store->toArray(), 'disposal' => $disposal];
                    }
                } catch (Exception $e) {
                    error_log("Error disposing inventory item: " . $e->getMessage());
                    $response = ['success' => false, 'error' => $e->getMessage()];
                }
            }
            break;

        case 'resetData':
            if ($method === 'POST') {
                // Reset all data in the store while preserving the current user session
                $store->reset();
                $response = ['success' => true, 'data' => $store->toArray()];
            }
            break;

        case 'checkDatabase':
            if ($method === 'GET') {
                try {
                    require_once __DIR__ . '/../backend/database.php';
                    $db = Database::getInstance()->getConnection();
                    
                    // Get database name
                    $stmt = $db->query("SELECT DATABASE() as dbname");
                    $dbInfo = $stmt->fetch();
                    
                    // Check tables
                    $tables = ['inventory_items', 'packaged_items', 'purchases', 'ingredient_sets', 'ingredients', 'requests', 'audit_logs', 'sessions'];
                    $tableStatus = [];
                    foreach ($tables as $table) {
                        $stmt = $db->query("SHOW TABLES LIKE '$table'");
                        $exists = $stmt->rowCount() > 0;
                        $count = 0;
                        if ($exists) {
                            $countStmt = $db->query("SELECT COUNT(*) as count FROM $table");
                            $count = $countStmt->fetch()['count'];
                        }
                        $tableStatus[$table] = ['exists' => $exists, 'count' => $count];
                    }
                    
                    $response = [
                        'success' => true,
                        'connected' => true,
                        'database' => $dbInfo['dbname'] ?? 'Unknown',
                        'tables' => $tableStatus
                    ];
                } catch (Exception $e) {
                    $response = [
                        'success' => false,
                        'connected' => false,
                        'error' => $e->getMessage()
                    ];
                }
            }
            break;

        case 'getUsers':
            if ($method === 'GET') {
                // Check if user is admin
                $currentUser = $store->getCurrentUser();
                if (!$currentUser || $currentUser->role !== 'admin') {
                    $response['error'] = 'Unauthorized: Admin access required';
                    http_response_code(403);
                } else {
                    $users = $store->getDb()->getAllUsers();
                    $response = ['success' => true, 'data' => $users];
                }
            } else {
                $response['error'] = 'Method not allowed. Expected GET, got ' . $method;
            }
            break;

        case 'getUser':
            if ($method === 'GET') {
                $currentUser = $store->getCurrentUser();
                if (!$currentUser || $currentUser->role !== 'admin') {
                    $response['error'] = 'Unauthorized: Admin access required';
                    http_response_code(403);
                } else {
                    // Get ID from query string or POST data
                    $id = $_GET['id'] ?? '';
                    if (empty($id)) {
                        // Try to get from POST data if available
                        $postData = json_decode(file_get_contents('php://input'), true);
                        $id = $postData['id'] ?? '';
                    }
                    if (empty($id)) {
                        $response['error'] = 'User ID is required';
                    } else {
                        $user = $store->getDb()->getUserById($id);
                        if ($user) {
                            $response = ['success' => true, 'data' => $user];
                        } else {
                            $response['error'] = 'User not found';
                        }
                    }
                }
            } else {
                $response['error'] = 'Method not allowed. Expected GET, got ' . $method;
            }
            break;

        case 'createUser':
            if ($method === 'POST') {
                $currentUser = $store->getCurrentUser();
                if (!$currentUser || $currentUser->role !== 'admin') {
                    $response['error'] = 'Unauthorized: Admin access required';
                    http_response_code(403);
                } else {
                    $data = json_decode(file_get_contents('php://input'), true);
                    $username = $data['username'] ?? '';
                    $password = $data['password'] ?? '';
                    $name = $data['name'] ?? '';
                    $email = $data['email'] ?? '';
                    $role = $data['role'] ?? '';
                    
                    if (empty($username) || empty($password) || empty($name) || empty($role)) {
                        $response['error'] = 'Username, password, name, and role are required';
                    } else {
                        // Check if username already exists
                        if ($store->getDb()->checkUsernameExists($username)) {
                            $response['error'] = 'Username already exists';
                        } else {
                            $id = $data['id'] ?? uniqid('user-', true);
                            if ($store->getDb()->createUser($id, $username, $password, $name, $email, $role)) {
                                $user = $store->getDb()->getUserById($id);
                                $response = ['success' => true, 'data' => $user];
                                // Log action
                                $store->logAction('create_user', "Created user: $username ($name)");
                            } else {
                                $response['error'] = 'Failed to create user';
                            }
                        }
                    }
                }
            } else {
                $response['error'] = 'Method not allowed. Expected POST, got ' . $method;
            }
            break;

        case 'updateUser':
            if ($method === 'PUT' || $method === 'POST') {
                $currentUser = $store->getCurrentUser();
                if (!$currentUser || $currentUser->role !== 'admin') {
                    $response['error'] = 'Unauthorized: Admin access required';
                    http_response_code(403);
                } else {
                    $data = json_decode(file_get_contents('php://input'), true);
                    $id = $data['id'] ?? '';
                    $username = $data['username'] ?? '';
                    $name = $data['name'] ?? '';
                    $email = $data['email'] ?? '';
                    $role = $data['role'] ?? '';
                    $updatePassword = $data['updatePassword'] ?? false;
                    $password = $data['password'] ?? '';
                    $status = $data['status'] ?? null;
                    
                    if (empty($id) || empty($username) || empty($name) || empty($role)) {
                        $response['error'] = 'ID, username, name, and role are required';
                    } else {
                        // Check if username already exists (excluding current user)
                        if ($store->getDb()->checkUsernameExists($username, $id)) {
                            $response['error'] = 'Username already exists';
                        } else {
                            if ($store->getDb()->updateUser($id, $username, $name, $email, $role, $updatePassword, $password, $status)) {
                                $user = $store->getDb()->getUserById($id);
                                $response = ['success' => true, 'data' => $user];
                                // Log action
                                $store->logAction('update_user', "Updated user: $username ($name)");
                            } else {
                                $response['error'] = 'Failed to update user';
                            }
                        }
                    }
                }
            } else {
                $response['error'] = 'Method not allowed. Expected PUT/POST, got ' . $method;
            }
            break;

        case 'resetUserPassword':
            if ($method === 'POST') {
                $currentUser = $store->getCurrentUser();
                if (!$currentUser || $currentUser->role !== 'admin') {
                    $response['error'] = 'Unauthorized: Admin access required';
                    http_response_code(403);
                } else {
                    $data = json_decode(file_get_contents('php://input'), true);
                    $id = $data['id'] ?? '';
                    $newPassword = $data['password'] ?? '';
                    
                    if (empty($id) || empty($newPassword)) {
                        $response['error'] = 'User ID and new password are required';
                    } else {
                        if ($store->getDb()->resetUserPassword($id, $newPassword)) {
                            $user = $store->getDb()->getUserById($id);
                            $response = ['success' => true, 'data' => $user];
                            // Log action
                            $store->logAction('reset_password', "Password reset for user: {$user['username']} ({$user['name']})");
                        } else {
                            $response['error'] = 'Failed to reset password';
                        }
                    }
                }
            } else {
                $response['error'] = 'Method not allowed. Expected POST, got ' . $method;
            }
            break;

        case 'updateUserStatus':
            if ($method === 'POST') {
                $currentUser = $store->getCurrentUser();
                if (!$currentUser || $currentUser->role !== 'admin') {
                    $response['error'] = 'Unauthorized: Admin access required';
                    http_response_code(403);
                } else {
                    $data = json_decode(file_get_contents('php://input'), true);
                    $id = $data['id'] ?? '';
                    $status = $data['status'] ?? '';
                    
                    if (empty($id) || empty($status)) {
                        $response['error'] = 'User ID and status are required';
                    } else {
                        if ($store->getDb()->updateUserStatus($id, $status)) {
                            $user = $store->getDb()->getUserById($id);
                            $response = ['success' => true, 'data' => $user];
                            // Log action
                            $store->logAction('update_user_status', "Updated status for user: {$user['username']} to {$status}");
                        } else {
                            $response['error'] = 'Failed to update user status';
                        }
                    }
                }
            } else {
                $response['error'] = 'Method not allowed. Expected POST, got ' . $method;
            }
            break;

        case 'deleteUser':
            if ($method === 'DELETE' || $method === 'POST') {
                $currentUser = $store->getCurrentUser();
                if (!$currentUser || $currentUser->role !== 'admin') {
                    $response['error'] = 'Unauthorized: Admin access required';
                    http_response_code(403);
                } else {
                    $data = json_decode(file_get_contents('php://input'), true);
                    $id = $data['id'] ?? ($_GET['id'] ?? '');
                    
                    if (empty($id)) {
                        $response['error'] = 'User ID is required';
                    } else if ($id === $currentUser->id) {
                        $response['error'] = 'Cannot delete your own account';
                    } else {
                        $user = $store->getDb()->getUserById($id);
                        if ($user && $store->getDb()->deleteUser($id)) {
                            $response = ['success' => true];
                            // Log action
                            $store->logAction('delete_user', "Deleted user: {$user['username']} ({$user['name']})");
                        } else {
                            $response['error'] = 'Failed to delete user or user not found';
                        }
                    }
                }
            } else {
                $response['error'] = 'Method not allowed. Expected DELETE/POST, got ' . $method;
            }
            break;

        case 'getSystemConfig':
            if ($method === 'GET') {
                $currentUser = $store->getCurrentUser();
                if (!$currentUser || $currentUser->role !== 'admin') {
                    $response['error'] = 'Unauthorized: Admin access required';
                    http_response_code(403);
                } else {
                    $config = $store->getDb()->getSystemConfig();
                    $response = ['success' => true, 'data' => $config];
                }
            } else {
                $response['error'] = 'Method not allowed. Expected GET, got ' . $method;
            }
            break;

        case 'updateSystemConfig':
            if ($method === 'POST') {
                $currentUser = $store->getCurrentUser();
                if (!$currentUser || $currentUser->role !== 'admin') {
                    $response['error'] = 'Unauthorized: Admin access required';
                    http_response_code(403);
                } else {
                    $data = json_decode(file_get_contents('php://input'), true);
                    $key = $data['key'] ?? '';
                    $value = $data['value'] ?? '';
                    
                    if (empty($key)) {
                        $response['error'] = 'Config key is required';
                    } else {
                        if ($store->getDb()->setSystemConfig($key, $value)) {
                            $response = ['success' => true];
                            $store->logAction('update_config', "Updated system config: $key");
                        } else {
                            $response['error'] = 'Failed to update system config';
                        }
                    }
                }
            } else {
                $response['error'] = 'Method not allowed. Expected POST, got ' . $method;
            }
            break;

        case 'backupDatabase':
            if ($method === 'POST') {
                $currentUser = $store->getCurrentUser();
                if (!$currentUser || $currentUser->role !== 'admin') {
                    $response['error'] = 'Unauthorized: Admin access required';
                    http_response_code(403);
                } else {
                    try {
                        require_once __DIR__ . '/../backend/database.php';
                        $db = Database::getInstance()->getConnection();
                        $dbName = $db->query("SELECT DATABASE()")->fetchColumn();
                        
                        $backupDir = __DIR__ . '/../backups/';
                        if (!file_exists($backupDir)) {
                            mkdir($backupDir, 0755, true);
                        }
                        
                        $timestamp = date('Y-m-d_H-i-s');
                        $backupFile = $backupDir . "backup_{$dbName}_{$timestamp}.sql";
                        
                        // Get all tables
                        $tables = [];
                        $stmt = $db->query("SHOW TABLES");
                        while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
                            $tables[] = $row[0];
                        }
                        
                        $output = "-- Database Backup\n";
                        $output .= "-- Generated: " . date('Y-m-d H:i:s') . "\n\n";
                        
                        foreach ($tables as $table) {
                            $output .= "-- Table: $table\n";
                            $output .= "DROP TABLE IF EXISTS `$table`;\n";
                            
                            $createTable = $db->query("SHOW CREATE TABLE `$table`")->fetch(PDO::FETCH_NUM);
                            $output .= $createTable[1] . ";\n\n";
                            
                            $rows = $db->query("SELECT * FROM `$table`");
                            $output .= "INSERT INTO `$table` VALUES\n";
                            $values = [];
                            while ($row = $rows->fetch(PDO::FETCH_ASSOC)) {
                                $rowValues = [];
                                foreach ($row as $val) {
                                    if ($val === null) {
                                        $rowValues[] = 'NULL';
                                    } else {
                                        $rowValues[] = "'" . addslashes($val) . "'";
                                    }
                                }
                                $values[] = "(" . implode(',', $rowValues) . ")";
                            }
                            if (!empty($values)) {
                                $output .= implode(",\n", $values) . ";\n\n";
                            }
                        }
                        
                        file_put_contents($backupFile, $output);
                        $response = ['success' => true, 'backupFile' => basename($backupFile)];
                        $store->logAction('backup', "Database backup created: " . basename($backupFile));
                    } catch (Exception $e) {
                        error_log("Backup error: " . $e->getMessage());
                        $response = ['success' => false, 'error' => $e->getMessage()];
                    }
                }
            } else {
                $response['error'] = 'Method not allowed. Expected POST, got ' . $method;
            }
            break;

        case 'listBackups':
            if ($method === 'GET') {
                $currentUser = $store->getCurrentUser();
                if (!$currentUser || $currentUser->role !== 'admin') {
                    $response['error'] = 'Unauthorized: Admin access required';
                    http_response_code(403);
                } else {
                    $backupDir = __DIR__ . '/../backups/';
                    $backups = [];
                    if (file_exists($backupDir)) {
                        $files = glob($backupDir . 'backup_*.sql');
                        foreach ($files as $file) {
                            $backups[] = [
                                'filename' => basename($file),
                                'size' => filesize($file),
                                'created' => date('Y-m-d H:i:s', filemtime($file))
                            ];
                        }
                        usort($backups, function($a, $b) {
                            return strcmp($b['created'], $a['created']);
                        });
                    }
                    $response = ['success' => true, 'data' => $backups];
                }
            } else {
                $response['error'] = 'Method not allowed. Expected GET, got ' . $method;
            }
            break;

        case 'restoreDatabase':
            if ($method === 'POST') {
                $currentUser = $store->getCurrentUser();
                if (!$currentUser || $currentUser->role !== 'admin') {
                    $response['error'] = 'Unauthorized: Admin access required';
                    http_response_code(403);
                } else {
                    $data = json_decode(file_get_contents('php://input'), true);
                    $filename = $data['filename'] ?? '';
                    
                    if (empty($filename)) {
                        $response['error'] = 'Backup filename is required';
                    } else {
                        $backupFile = __DIR__ . '/../backups/' . basename($filename);
                        if (!file_exists($backupFile)) {
                            $response['error'] = 'Backup file not found';
                        } else {
                            try {
                                require_once __DIR__ . '/../backend/database.php';
                                $db = Database::getInstance()->getConnection();
                                
                                $sql = file_get_contents($backupFile);
                                $db->exec($sql);
                                
                                $response = ['success' => true];
                                $store->logAction('restore', "Database restored from: $filename");
                            } catch (Exception $e) {
                                error_log("Restore error: " . $e->getMessage());
                                $response = ['success' => false, 'error' => $e->getMessage()];
                            }
                        }
                    }
                }
            } else {
                $response['error'] = 'Method not allowed. Expected POST, got ' . $method;
            }
            break;

        case 'exportData':
            if ($method === 'POST') {
                $currentUser = $store->getCurrentUser();
                if (!$currentUser || $currentUser->role !== 'admin') {
                    $response['error'] = 'Unauthorized: Admin access required';
                    http_response_code(403);
                } else {
                    $data = json_decode(file_get_contents('php://input'), true);
                    $type = $data['type'] ?? 'all';
                    
                    $exportData = [];
                    if ($type === 'all' || $type === 'inventory') {
                        $items = $store->getDb()->getAllInventoryItems();
                        $exportData['inventory'] = array_map(function($item) {
                            return $item->toArray();
                        }, $items);
                    }
                    if ($type === 'all' || $type === 'purchases') {
                        $purchases = $store->getDb()->getAllPurchases();
                        $exportData['purchases'] = array_map(function($purchase) {
                            return $purchase->toArray();
                        }, $purchases);
                    }
                    if ($type === 'all' || $type === 'users') {
                        $exportData['users'] = $store->getDb()->getAllUsers();
                    }
                    
                    $response = ['success' => true, 'data' => $exportData];
                }
            } else {
                $response['error'] = 'Method not allowed. Expected POST, got ' . $method;
            }
            break;

        case 'test':
            // Diagnostic endpoint
            $response = [
                'success' => true,
                'data' => [
                    'method' => $method,
                    'raw_method' => $_SERVER['REQUEST_METHOD'] ?? 'N/A',
                    'action' => $action,
                    'php_version' => phpversion(),
                    'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
                    'post_data' => $_POST,
                    'input_data' => file_get_contents('php://input')
                ]
            ];
            break;

        case 'sendPasswordVerificationCode':
            if ($method === 'POST') {
                $currentUser = $store->getCurrentUser();
                if (!$currentUser) {
                    $response['error'] = 'Unauthorized: Please log in';
                    http_response_code(401);
                } else {
                    $data = json_decode(file_get_contents('php://input'), true);
                    $email = $data['email'] ?? '';
                    
                    if (empty($email)) {
                        $response['error'] = 'Email is required';
                    } else {
                        // Verify email belongs to current user
                        $user = $store->getDb()->getUserById($currentUser->id);
                        if (!$user || strtolower($user['email']) !== strtolower($email)) {
                            $response['error'] = 'Email does not match your account';
                        } else {
                            // Generate 6-digit code
                            $code = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
                            
                            // Save verification code
                            if ($store->getDb()->createVerificationCode($currentUser->id, $email, $code)) {
                                // Send email
                                try {
                                    require_once __DIR__ . '/../backend/EmailService.php';
                                    $emailService = new EmailService();
                                    $emailService->sendPasswordVerificationCode($email, $user['name'], $code);
                                    $response = ['success' => true, 'message' => 'Verification code sent to your email'];
                                } catch (Exception $e) {
                                    $errorMessage = $e->getMessage();
                                    error_log("Email sending error: " . $errorMessage);
                                    error_log("Email sending error details: " . print_r($e, true));
                                    // Return more detailed error for debugging (remove sensitive info in production)
                                    $response['error'] = 'Failed to send verification email: ' . $errorMessage;
                                }
                            } else {
                                $response['error'] = 'Failed to create verification code';
                            }
                        }
                    }
                }
            } else {
                $response['error'] = 'Method not allowed. Expected POST, got ' . $method;
            }
            break;

        case 'verifyPasswordCode':
            if ($method === 'POST') {
                $currentUser = $store->getCurrentUser();
                if (!$currentUser) {
                    $response['error'] = 'Unauthorized: Please log in';
                    http_response_code(401);
                } else {
                    $data = json_decode(file_get_contents('php://input'), true);
                    $code = $data['code'] ?? '';
                    
                    // Clean and validate code
                    $code = trim($code);
                    $code = preg_replace('/[^0-9]/', '', $code); // Remove non-numeric characters
                    
                    if (empty($code)) {
                        $response['error'] = 'Verification code is required';
                    } else if (strlen($code) !== 6) {
                        $response['error'] = 'Verification code must be 6 digits';
                    } else {
                        error_log("Verifying code: $code for user: {$currentUser->id}");
                        if ($store->getDb()->verifyCode($currentUser->id, $code)) {
                            $response = ['success' => true, 'message' => 'Code verified successfully'];
                        } else {
                            // Check if table exists
                            try {
                                $db = $store->getDb();
                                $conn = new ReflectionClass($db);
                                $dbProp = $conn->getProperty('db');
                                $dbProp->setAccessible(true);
                                $pdo = $dbProp->getValue($db);
                                $checkTable = $pdo->query("SHOW TABLES LIKE 'password_verification_codes'");
                                if ($checkTable->rowCount() === 0) {
                                    $response['error'] = 'Verification system not initialized. Please contact administrator.';
                                } else {
                                    $response['error'] = 'Invalid or expired verification code. Please request a new code.';
                                }
                            } catch (Exception $e) {
                                $response['error'] = 'Invalid or expired verification code';
                            }
                        }
                    }
                }
            } else {
                $response['error'] = 'Method not allowed. Expected POST, got ' . $method;
            }
            break;

        case 'changePassword':
            if ($method === 'POST') {
                $currentUser = $store->getCurrentUser();
                if (!$currentUser) {
                    $response['error'] = 'Unauthorized: Please log in';
                    http_response_code(401);
                } else {
                    $data = json_decode(file_get_contents('php://input'), true);
                    $code = $data['code'] ?? '';
                    $newPassword = $data['newPassword'] ?? '';
                    $confirmPassword = $data['confirmPassword'] ?? '';
                    
                    if (empty($code) || empty($newPassword) || empty($confirmPassword)) {
                        $response['error'] = 'Verification code, new password, and confirmation are required';
                    } else if ($newPassword !== $confirmPassword) {
                        $response['error'] = 'Passwords do not match';
                    } else {
                        // Validate strong password
                        $passwordValidation = validateStrongPassword($newPassword);
                        if (!$passwordValidation['valid']) {
                            $response['error'] = $passwordValidation['error'];
                        } else {
                            // Verify code first
                            if ($store->getDb()->verifyCode($currentUser->id, $code)) {
                                // Change password
                                if ($store->getDb()->changeUserPassword($currentUser->id, $newPassword)) {
                                    $response = ['success' => true, 'message' => 'Password changed successfully'];
                                    $store->logAction('change_password', "User {$currentUser->name} changed their password");
                                } else {
                                    $response['error'] = 'Failed to change password';
                                }
                            } else {
                                $response['error'] = 'Invalid or expired verification code';
                            }
                        }
                    }
                }
            } else {
                $response['error'] = 'Method not allowed. Expected POST, got ' . $method;
            }
            break;

        default:
            $response['error'] = 'Unknown action: ' . $action;
    }
} catch (Exception $e) {
    $response['error'] = $e->getMessage();
    $response['trace'] = $e->getTraceAsString();
    error_log("API Exception: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
}

// Log errors for debugging (remove in production)
if (!$response['success']) {
    error_log('API Error: ' . json_encode($response));
}

// Set JSON content type if not already set (for file uploads)
if (!headers_sent()) {
    $contentTypeSet = false;
    foreach (headers_list() as $header) {
        if (stripos($header, 'Content-Type:') === 0) {
            $contentTypeSet = true;
            break;
        }
    }
    if (!$contentTypeSet) {
        header('Content-Type: application/json');
    }
}

echo json_encode($response);
