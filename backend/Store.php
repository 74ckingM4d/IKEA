<?php

require_once __DIR__ . '/types.php';
require_once __DIR__ . '/utils/unitConversions.php';
require_once __DIR__ . '/DatabaseRepository.php';

class Store {
    private $currentUser = null;
    private $inventory = [];
    private $packagedItems = [];
    private $purchases = [];
    private $ingredientSets = [];
    private $requests = [];
    private $auditLogs = [];
    private $db;

    public function __construct() {
        try {
            $this->db = new DatabaseRepository();
            $this->loadFromDatabase();
        } catch (Exception $e) {
            // If database connection fails, fall back to in-memory (for backward compatibility)
            error_log("Database connection failed, using in-memory storage: " . $e->getMessage());
            $this->initializeData();
        }
    }
    
    private function loadFromDatabase() {
        $this->inventory = $this->db->getAllInventoryItems();
        $this->packagedItems = $this->db->getAllPackagedItems();
        $this->purchases = $this->db->getAllPurchases();
        $this->ingredientSets = $this->db->getAllIngredientSets();
        $this->requests = $this->db->getAllRequests();
        $this->auditLogs = $this->db->getAllAuditLogs();
    }
    
    public function reloadInventory() {
        if ($this->db) {
            try {
                $oldCount = count($this->inventory);
                $this->inventory = $this->db->getAllInventoryItems();
                $newCount = count($this->inventory);
                error_log("Reloaded inventory from database: {$oldCount} -> {$newCount} items");
                
                // Log all items with their quantities for debugging
                if (count($this->inventory) > 0) {
                    error_log("Inventory items after reload:");
                    foreach ($this->inventory as $item) {
                        error_log("  - {$item->name}: {$item->quantity} {$item->unit} (ID: {$item->id})");
                    }
                } else {
                    error_log("WARNING: No inventory items found after reload!");
                }
            } catch (Exception $e) {
                error_log("Error reloading inventory: " . $e->getMessage());
                error_log("Stack trace: " . $e->getTraceAsString());
            }
        } else {
            error_log("WARNING: Cannot reload inventory - database connection not available");
        }
    }
    
    public function reloadPurchases() {
        if ($this->db) {
            try {
                $this->purchases = $this->db->getAllPurchases();
                error_log("Reloaded purchases from database: " . count($this->purchases) . " purchases");
            } catch (Exception $e) {
                error_log("Error reloading purchases: " . $e->getMessage());
            }
        }
    }
    
    public function reloadIngredientSets() {
        if ($this->db) {
            try {
                $oldCount = count($this->ingredientSets);
                $this->ingredientSets = $this->db->getAllIngredientSets();
                $newCount = count($this->ingredientSets);
                error_log("Reloaded ingredient sets from database: {$oldCount} -> {$newCount} sets");
            } catch (Exception $e) {
                error_log("Error reloading ingredient sets: " . $e->getMessage());
            }
        }
    }
    
    public function reloadRequests() {
        if ($this->db) {
            try {
                $oldCount = count($this->requests);
                $this->requests = $this->db->getAllRequests();
                $newCount = count($this->requests);
                error_log("Reloaded requests from database: {$oldCount} -> {$newCount} requests");
            } catch (Exception $e) {
                error_log("Error reloading requests: " . $e->getMessage());
            }
        }
    }
    
    private function saveToDatabase() {
        if (!$this->db) return;
        
        // Save all changes to database
        foreach ($this->inventory as $item) {
            $this->db->updateInventoryItem($item);
        }
    }

    private function initializeData() {
        // Initial Inventory
        $this->inventory = [
            new InventoryItem([
                'id' => '1',
                'name' => 'White Sugar',
                'quantity' => 50,
                'unit' => Unit::KG,
                'minStockLevel' => 10,
                'pricePerUnit' => 2.5,
                'category' => 'Dry Goods',
                'lastUpdated' => date('c')
            ]),
            new InventoryItem([
                'id' => '2',
                'name' => 'All-Purpose Flour',
                'quantity' => 100,
                'unit' => Unit::KG,
                'minStockLevel' => 20,
                'pricePerUnit' => 1.8,
                'category' => 'Dry Goods',
                'lastUpdated' => date('c')
            ]),
            new InventoryItem([
                'id' => '3',
                'name' => 'Eggs',
                'quantity' => 500,
                'unit' => Unit::PCS,
                'minStockLevel' => 100,
                'pricePerUnit' => 0.2,
                'category' => 'Dairy',
                'lastUpdated' => date('c')
            ]),
            new InventoryItem([
                'id' => '4',
                'name' => 'Whole Milk',
                'quantity' => 50,
                'unit' => Unit::L,
                'minStockLevel' => 10,
                'pricePerUnit' => 1.5,
                'category' => 'Dairy',
                'lastUpdated' => date('c')
            ])
        ];

        // Initial Ingredient Sets
        $this->ingredientSets = [
            new IngredientSet([
                'id' => '1',
                'name' => 'Chocolate Cake Set',
                'description' => 'Standard 8-inch cake recipe',
                'ingredients' => [
                    [
                        'id' => 'i1',
                        'inventoryItemId' => '2',
                        'name' => 'All-Purpose Flour',
                        'quantity' => 1,
                        'unit' => Unit::KG,
                        'isPackaged' => false
                    ],
                    [
                        'id' => 'i2',
                        'inventoryItemId' => '1',
                        'name' => 'White Sugar',
                        'quantity' => 0.5,
                        'unit' => Unit::KG,
                        'isPackaged' => false
                    ],
                    [
                        'id' => 'i3',
                        'inventoryItemId' => '3',
                        'name' => 'Eggs',
                        'quantity' => 4,
                        'unit' => Unit::PCS,
                        'isPackaged' => false
                    ],
                    [
                        'id' => 'i4',
                        'inventoryItemId' => '4',
                        'name' => 'Whole Milk',
                        'quantity' => 0.25,
                        'unit' => Unit::L,
                        'isPackaged' => false
                    ]
                ],
                'createdBy' => 'stock_handler',
                'createdAt' => date('c')
            ])
        ];
    }

    private function generateUUID() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }

    private function addAuditLog($action, $details) {
        if (!$this->currentUser) {
            return;
        }
        $newLog = new AuditLog([
            'id' => $this->generateUUID(),
            'userId' => $this->currentUser->id,
            'userRole' => $this->currentUser->role,
            'action' => $action,
            'details' => $details,
            'timestamp' => date('c')
        ]);
        array_unshift($this->auditLogs, $newLog);
        
        // Save to database
        if ($this->db) {
            try {
                $this->db->addAuditLog($newLog);
            } catch (Exception $e) {
                error_log("Failed to save audit log: " . $e->getMessage());
            }
        }
    }
    
    public function logAction($action, $details) {
        $this->addAuditLog($action, $details);
    }
    
    private function persistInventory() {
        if (!$this->db) return;
        try {
            foreach ($this->inventory as $item) {
                $this->db->updateInventoryItem($item);
            }
        } catch (Exception $e) {
            error_log("Failed to persist inventory: " . $e->getMessage());
        }
    }
    
    private function persistPurchase($purchase) {
        if (!$this->db) {
            error_log("Database not available for persisting purchase");
            return;
        }
        try {
            // Check if purchase exists in database
            $existingInDb = $this->db->getPurchaseById($purchase->id);
            
            if ($existingInDb) {
                // Update existing purchase
                $this->db->updatePurchase($purchase);
            } else {
                // Insert new purchase
                $result = $this->db->addPurchase($purchase);
                if (!$result) {
                    error_log("Failed to insert purchase ID {$purchase->id}");
                }
            }
        } catch (Exception $e) {
            error_log("Failed to persist purchase ID {$purchase->id}: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            error_log("Purchase data: " . json_encode([
                'id' => $purchase->id,
                'itemName' => $purchase->itemName,
                'quantity' => $purchase->quantity,
                'status' => $purchase->status,
                'dateCreated' => $purchase->dateCreated
            ]));
        }
    }
    
    private function persistPackagedItem($item) {
        if (!$this->db) return;
        try {
            // Check if packaged item exists in database
            $existing = $this->db->getPackagedItemById($item->id);
            
            if ($existing) {
                // Update existing packaged item
                $this->db->updatePackagedItem($item);
            } else {
                // Insert new packaged item
                $this->db->addPackagedItem($item);
            }
        } catch (Exception $e) {
            error_log("Failed to persist packaged item: " . $e->getMessage());
        }
    }
    
    private function persistIngredientSet($set) {
        if (!$this->db) return;
        try {
            $this->db->addIngredientSet($set);
        } catch (Exception $e) {
            error_log("Failed to persist ingredient set: " . $e->getMessage());
        }
    }
    
    private function persistRequest($request) {
        if (!$this->db) {
            error_log("WARNING: Cannot persist request - database not available");
            return;
        }
        try {
            // Check if request exists in database (not in-memory array)
            $existingInDb = $this->db->getRequestById($request->id);
            
            if ($existingInDb) {
                // Update existing request in database
                error_log("Updating existing request in database: {$request->id}");
                $result = $this->db->updateRequest($request);
                if (!$result) {
                    error_log("CRITICAL: Failed to update request {$request->id} in database");
                } else {
                    error_log("SUCCESS: Request {$request->id} updated in database");
                }
            } else {
                // Insert new request into database
                $requestName = $request->isSingleItem ? ($request->inventoryItemName ?? 'Single Item') : ($request->ingredientSetName ?? 'Recipe');
                error_log("Inserting new request into database: ID={$request->id}, Name={$requestName}, Qty={$request->quantity}, Status={$request->status}");
                error_log("  Kitchen Staff ID: {$request->kitchenStaffId}");
                error_log("  Is Single Item: " . ($request->isSingleItem ? 'Yes' : 'No'));
                
                $result = $this->db->addRequest($request);
                if (!$result) {
                    error_log("CRITICAL: Failed to insert request {$request->id} into database");
                    throw new Exception("Failed to save request to database");
                } else {
                    error_log("SUCCESS: Request {$request->id} inserted into database successfully");
                }
            }
        } catch (Exception $e) {
            error_log("CRITICAL ERROR: Failed to persist request {$request->id}: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            error_log("Request data: " . json_encode([
                'id' => $request->id,
                'kitchenStaffId' => $request->kitchenStaffId,
                'ingredientSetId' => $request->ingredientSetId,
                'ingredientSetName' => $request->ingredientSetName,
                'quantity' => $request->quantity,
                'status' => $request->status,
                'isSingleItem' => $request->isSingleItem ?? false,
                'inventoryItemId' => $request->inventoryItemId ?? null,
                'inventoryItemName' => $request->inventoryItemName ?? null
            ]));
            throw $e; // Re-throw to prevent silent failure
        }
    }

    // Getters
    public function getCurrentUser() {
        return $this->currentUser;
    }

    public function getDb() {
        return $this->db;
    }

    public function getInventory() {
        return $this->inventory;
    }

    public function getPackagedItems() {
        return $this->packagedItems;
    }

    public function getPurchases() {
        return $this->purchases;
    }

    public function getIngredientSets() {
        return $this->ingredientSets;
    }

    public function getRequests() {
        return $this->requests;
    }

    public function getAuditLogs() {
        return $this->auditLogs;
    }

    // Actions
    public function login($username, $password) {
        if (!$this->db) {
            throw new Exception('Database connection not available');
        }
        
        $userData = $this->db->getUserByUsername($username);
        if (!$userData) {
            throw new Exception('Invalid username or password');
        }
        
        if (!$this->db->verifyPassword($password, $userData['password'])) {
            throw new Exception('Invalid username or password');
        }
        
        // Check user status
        $userStatus = $userData['status'] ?? 'active';
        if ($userStatus !== 'active') {
            throw new Exception('Account is inactive. Please contact administrator.');
        }
        
        $this->currentUser = new User(
            $userData['id'],
            $userData['name'],
            $userData['role'],
            $userData['email']
        );
        
        // Update last login
        if ($this->db) {
            $this->db->updateLastLogin($userData['id']);
        }
        
        return $this->currentUser;
    }

    public function logout() {
        $this->currentUser = null;
    }

    public function addPurchase($data) {
        // Log incoming data for debugging
        error_log("Store::addPurchase called with data: " . json_encode([
            'hasItems' => isset($data['items']),
            'itemsIsArray' => isset($data['items']) && is_array($data['items']),
            'itemsCount' => isset($data['items']) && is_array($data['items']) ? count($data['items']) : 0
        ]));
        
        // Handle both single purchase and batch purchase
        if (isset($data['items']) && is_array($data['items']) && count($data['items']) > 0) {
            // Batch purchase - create multiple purchase orders with same batchId
            $batchId = $this->generateUUID();
            error_log("Creating BATCH purchase with batchId: {$batchId}, Items count: " . count($data['items']));
            $itemNames = [];
            $totalPrice = 0;
            
            foreach ($data['items'] as $item) {
                $newPurchase = new PurchaseOrder([
                    'id' => $this->generateUUID(),
                    'batchId' => $batchId,
                    'purchaserId' => $data['purchaserId'] ?? '',
                    'itemName' => $item['itemName'],
                    'brandName' => $item['brandName'] ?? '',
                    'category' => $item['category'] ?? '',
                    'supplier' => $item['supplier'] ?? '',
                    'purchaseType' => $item['purchaseType'] ?? $data['purchaseType'] ?? 'delivery',
                    'paymentStatus' => $item['paymentStatus'] ?? $data['paymentStatus'] ?? 'paid',
                    'expiryDate' => $item['expiryDate'] ?? null,
                    'quantity' => $item['quantity'],
                    'displayUnit' => $item['displayUnit'],
                    'baseUnit' => $item['baseUnit'],
                    'conversionRatio' => $item['conversionRatio'],
                    'price' => $item['price'],
                    'status' => 'pending',
                    'dateCreated' => date('c'),
                    'receiptPath' => $data['receiptPath'] ?? null
                ]);
                
                // Log batch ID for debugging
                error_log("Creating batch purchase: Item='{$item['itemName']}', batchId='{$batchId}', Purchase ID='{$newPurchase->id}'");
                
                $this->purchases[] = $newPurchase;
                $this->persistPurchase($newPurchase);
                $itemNames[] = "{$item['quantity']} {$item['displayUnit']} {$item['itemName']}";
                $totalPrice += $item['price'];
            }
            
            $this->addAuditLog('purchase', "Batch purchase order: " . implode(', ', $itemNames) . " (Total: $" . number_format($totalPrice, 2) . ")");
        } else {
            // Single purchase (backward compatible)
            $newPurchase = new PurchaseOrder([
                'id' => $this->generateUUID(),
                'batchId' => null,
                'purchaserId' => $data['purchaserId'] ?? '',
                'itemName' => $data['itemName'],
                'brandName' => $data['brandName'] ?? '',
                'category' => $data['category'] ?? '',
                'supplier' => $data['supplier'] ?? '',
                'purchaseType' => $data['purchaseType'] ?? 'delivery',
                'paymentStatus' => $data['paymentStatus'] ?? 'paid',
                'expiryDate' => $data['expiryDate'] ?? null,
                'quantity' => $data['quantity'],
                'displayUnit' => $data['displayUnit'],
                'baseUnit' => $data['baseUnit'],
                'conversionRatio' => $data['conversionRatio'],
                'price' => $data['price'],
                'status' => 'pending',
                'dateCreated' => date('c'),
                'receiptPath' => $data['receiptPath'] ?? null
            ]);
            $this->purchases[] = $newPurchase;
            $this->persistPurchase($newPurchase);
            $this->addAuditLog('purchase', "Ordered {$data['quantity']} {$data['displayUnit']} of {$data['itemName']}");
        }
    }

    public function confirmDelivery($id, $isComplete) {
        if (!$isComplete) {
            foreach ($this->purchases as $purchase) {
                if ($purchase->id === $id) {
                    $purchase->status = 'cancelled';
                    $this->persistPurchase($purchase);
                    break;
                }
            }
            $this->addAuditLog('delivery', "Marked delivery {$id} as incomplete/cancelled");
            return;
        }

        $purchase = null;
        foreach ($this->purchases as $p) {
            if ($p->id === $id) {
                $purchase = $p;
                break;
            }
        }
        
        // If not found in memory, fetch directly from database to ensure we have latest conversion_ratio
        if (!$purchase && $this->db) {
            try {
                $purchase = $this->db->getPurchaseById($id);
                if ($purchase) {
                    // Update in-memory array for future use
                    $this->purchases[] = $purchase;
                    error_log("Fetched purchase from database: {$purchase->itemName} (ID: {$purchase->id})");
                }
            } catch (Exception $e) {
                error_log("Error fetching purchase from database: " . $e->getMessage());
            }
        }
        
        if (!$purchase) {
            error_log("ERROR: Purchase with ID {$id} not found");
            return;
        }

        // Calculate base quantity: quantity from purchases table × conversion_ratio from purchases table
        // Example: quantity=2, conversion_ratio=50 → totalBaseQty = 2 × 50 = 100
        $purchaseQuantity = floatval($purchase->quantity);
        $purchaseConversionRatio = floatval($purchase->conversionRatio);
        $totalBaseQty = $purchaseQuantity * $purchaseConversionRatio;
        
        error_log("Delivery Calculation - Purchase Qty: {$purchaseQuantity}, Conversion Ratio: {$purchaseConversionRatio}, Total Base Qty: {$totalBaseQty}");
        $existing = null;
        foreach ($this->inventory as $item) {
            // Use case-insensitive comparison for item name matching
            if (strcasecmp($item->name, $purchase->itemName) === 0 && $item->unit === $purchase->baseUnit) {
                $existing = $item;
                break;
            }
        }
        
        // If not found in memory, try to find it in database directly
        if (!$existing && $this->db) {
            try {
                $allDbItems = $this->db->getAllInventoryItems();
                foreach ($allDbItems as $dbItem) {
                    if (strcasecmp($dbItem->name, $purchase->itemName) === 0 && $dbItem->unit === $purchase->baseUnit) {
                        $existing = $dbItem;
                        // Add it to in-memory array for future use
                        $this->inventory[] = $existing;
                        error_log("Found item in database but not in memory: {$existing->name} (ID: {$existing->id})");
                        break;
                    }
                }
            } catch (Exception $e) {
                error_log("Error searching database for item: " . $e->getMessage());
            }
        }
        
        // Log for debugging - show the calculation
        error_log("ConfirmDelivery: itemName='{$purchase->itemName}', baseUnit='{$purchase->baseUnit}'");
        error_log("  Purchase Quantity: {$purchaseQuantity} {$purchase->displayUnit}");
        error_log("  Conversion Ratio: {$purchaseConversionRatio}");
        error_log("  Calculated Base Quantity: {$totalBaseQty} {$purchase->baseUnit}");
        if ($existing) {
            error_log("Found existing item: ID={$existing->id}, Name='{$existing->name}', Current Qty={$existing->quantity} {$existing->unit}");
        } else {
            error_log("Item NOT found. Will create new item.");
        }

        if ($existing) {
            $oldQty = floatval($existing->quantity);
            $newQty = floatval($oldQty) + floatval($totalBaseQty);
            
            // Validate the calculation
            if (!is_numeric($newQty) || $newQty < 0) {
                error_log("ERROR: Invalid calculated quantity: {$newQty} (old: {$oldQty}, adding: {$totalBaseQty})");
                throw new Exception("Invalid quantity calculation: {$newQty}");
            }
            
            $existing->quantity = $newQty;
            $existing->lastUpdated = date('c');
            
            error_log("BEFORE UPDATE - Item: {$existing->name}, ID: {$existing->id}, Old Qty: {$oldQty}, Adding: {$totalBaseQty}, New Qty: {$newQty}");
            
            // Immediately persist this specific item to ensure it's saved
            if ($this->db) {
                try {
                    $result = $this->db->updateInventoryItem($existing);
                    if ($result) {
                        error_log("SUCCESS - Database update returned true for {$existing->name} (ID: {$existing->id})");
                        
                        // CRITICAL: Force reload from database to verify update
                        $updatedItem = $this->db->getInventoryItemById($existing->id);
                        if ($updatedItem) {
                            $dbQty = floatval($updatedItem->quantity);
                            error_log("VERIFIED - Reloaded from DB: Quantity is now {$dbQty} (expected: {$newQty})");
                            
                            // Update the in-memory item with the database value
                            $existing->quantity = $dbQty;
                            $existing->minStockLevel = floatval($updatedItem->minStockLevel);
                            $existing->pricePerUnit = floatval($updatedItem->pricePerUnit);
                            $existing->lastUpdated = $updatedItem->lastUpdated;
                            
                            // Verify the quantity matches
                            if (abs($dbQty - $newQty) > 0.01) {
                                error_log("WARNING: Quantity mismatch! Expected: {$newQty}, Got from DB: {$dbQty}");
                                // Force update again
                                $existing->quantity = $newQty;
                                $this->db->updateInventoryItem($existing);
                                error_log("FORCED UPDATE - Set quantity to {$newQty} again");
                            }
                        } else {
                            error_log("CRITICAL ERROR: Could not reload item {$existing->id} from database after update!");
                            throw new Exception("Failed to verify inventory update for item {$existing->id}");
                        }
                    } else {
                        error_log("CRITICAL ERROR - updateInventoryItem returned false for {$existing->name} (ID: {$existing->id})");
                        throw new Exception("Database update failed for item {$existing->id}");
                    }
                } catch (Exception $e) {
                    error_log("EXCEPTION - Failed to update inventory item {$existing->id}: " . $e->getMessage());
                    error_log("Stack trace: " . $e->getTraceAsString());
                    throw $e; // Re-throw to prevent silent failure
                }
            } else {
                error_log("CRITICAL ERROR - Database connection not available!");
                throw new Exception("Database connection not available");
            }
        } else {
            // Create new inventory item
            $newQty = floatval($totalBaseQty);
            if ($newQty <= 0) {
                error_log("ERROR: Cannot create inventory item with quantity 0 or negative: {$newQty}");
                throw new Exception("Invalid quantity for new inventory item: {$newQty}");
            }
            
            error_log("Creating NEW inventory item: {$purchase->itemName} with quantity {$newQty} {$purchase->baseUnit}");
            error_log("DEBUG - newQty value: " . var_export($newQty, true) . ", type: " . gettype($newQty));
            
            $newItem = new InventoryItem([
                'id' => $this->generateUUID(),
                'name' => $purchase->itemName,
                'quantity' => $newQty,  // Explicitly set quantity
                'unit' => $purchase->baseUnit,
                'minStockLevel' => 0,
                'pricePerUnit' => $totalBaseQty > 0 ? (floatval($purchase->price) / floatval($totalBaseQty)) : 0,
                'category' => $purchase->category ?? 'Uncategorized',
                'lastUpdated' => date('c')
            ]);
            
            // CRITICAL: Verify quantity was set correctly on the object
            error_log("DEBUG - After creating InventoryItem, quantity property: " . var_export($newItem->quantity, true) . ", type: " . gettype($newItem->quantity));
            if ($newItem->quantity != $newQty) {
                error_log("CRITICAL ERROR: Quantity mismatch! Expected: {$newQty}, Got: {$newItem->quantity}");
                // Force set it
                $newItem->quantity = $newQty;
                error_log("FORCED quantity to: {$newItem->quantity}");
            }
            
            $this->inventory[] = $newItem;
            
            if ($this->db) {
                try {
                    $result = $this->db->updateInventoryItem($newItem);
                    if ($result) {
                        error_log("SUCCESS - Created new inventory item: {$newItem->name} (ID: {$newItem->id}) with quantity {$newItem->quantity}");
                        
                        // Verify it was saved
                        $savedItem = $this->db->getInventoryItemById($newItem->id);
                        if ($savedItem) {
                            $dbQty = floatval($savedItem->quantity);
                            error_log("VERIFIED - New item saved with quantity: {$dbQty}");
                            $newItem->quantity = $dbQty;
                        } else {
                            error_log("WARNING: Could not verify new inventory item was saved!");
                        }
                    } else {
                        error_log("CRITICAL ERROR - Failed to create new inventory item: {$newItem->name}");
                        throw new Exception("Failed to create new inventory item");
                    }
                } catch (Exception $e) {
                    error_log("EXCEPTION - Failed to persist new inventory item: " . $e->getMessage());
                    error_log("Stack trace: " . $e->getTraceAsString());
                    throw $e; // Re-throw to prevent silent failure
                }
            } else {
                error_log("CRITICAL ERROR - Database connection not available for creating new item!");
                throw new Exception("Database connection not available");
            }
        }

        // CRITICAL: Verify the inventory was actually updated before marking purchase as completed
        // Reload the item from database to verify
        if ($existing && $this->db) {
            $verifyItem = $this->db->getInventoryItemById($existing->id);
            if ($verifyItem) {
                $verifyQty = floatval($verifyItem->quantity);
                $expectedQty = floatval($oldQty) + floatval($totalBaseQty);
                if (abs($verifyQty - $expectedQty) > 0.01) {
                    error_log("CRITICAL: Inventory update verification failed! Expected: {$expectedQty}, Got: {$verifyQty}");
                    throw new Exception("Inventory update failed - quantity mismatch. Expected {$expectedQty} but got {$verifyQty}");
                }
                error_log("VERIFICATION PASSED - Inventory updated correctly to {$verifyQty}");
            } else {
                error_log("CRITICAL: Could not verify inventory update - item not found in database!");
                throw new Exception("Inventory update verification failed - item not found");
            }
        } else if (!$existing) {
            // For new items, verify it was created with correct quantity
            if ($this->db && isset($newItem)) {
                $verifyItem = $this->db->getInventoryItemById($newItem->id);
                if (!$verifyItem) {
                    error_log("CRITICAL: New inventory item not found in database after creation!");
                    throw new Exception("New inventory item creation failed - item not found in database");
                }
                
                $verifyQty = floatval($verifyItem->quantity);
                $expectedQty = floatval($totalBaseQty);
                
                error_log("Verifying new item - Expected: {$expectedQty}, Got from DB: {$verifyQty}");
                
                if (abs($verifyQty - $expectedQty) > 0.01) {
                    error_log("CRITICAL: New inventory item quantity mismatch! Expected: {$expectedQty}, Got: {$verifyQty}");
                    // Try to fix it
                    $newItem->quantity = $expectedQty;
                    $fixResult = $this->db->updateInventoryItem($newItem);
                    if ($fixResult) {
                        error_log("Fixed quantity with UPDATE - retrying verification");
                        $verifyItem2 = $this->db->getInventoryItemById($newItem->id);
                        if ($verifyItem2) {
                            $verifyQty2 = floatval($verifyItem2->quantity);
                            if (abs($verifyQty2 - $expectedQty) > 0.01) {
                                throw new Exception("New inventory item creation failed - quantity still incorrect after fix. Expected: {$expectedQty}, Got: {$verifyQty2}");
                            }
                        }
                    } else {
                        throw new Exception("New inventory item creation failed - quantity mismatch and fix failed. Expected: {$expectedQty}, Got: {$verifyQty}");
                    }
                }
                error_log("VERIFICATION PASSED - New inventory item created correctly with quantity {$verifyQty}");
            } else {
                error_log("CRITICAL: New item variable not set or database not available!");
                throw new Exception("New inventory item creation failed - item variable not set");
            }
        }

        // After adding to inventory, check if we can auto-complete any OTHER pending purchases for the same item
        // This will complete pending items from previous orders
        // IMPORTANT: Exclude the current purchase ID to prevent double-processing the same delivery
        // Pass the total base quantity delivered so it can cover pending orders without deducting
        $this->autoCompletePendingPurchases($purchase->itemName, $purchase->baseUnit, $purchase->id, $totalBaseQty);

        // Only mark as completed AFTER inventory is verified
        foreach ($this->purchases as $p) {
            if ($p->id === $id) {
                $p->status = 'completed';
                $p->dateDelivered = date('c');
                $this->persistPurchase($p);
                break;
            }
        }

        $this->addAuditLog('delivery', "Confirmed delivery of {$purchase->itemName} (+{$totalBaseQty} {$purchase->baseUnit})");
    }

    private function autoCompletePendingPurchases($itemName, $baseUnit, $excludePurchaseId = null, $deliveredQty = null) {
        // Find all pending purchases for the same item
        // Match by item name and base unit to ensure we're completing the right pending orders
        // Exclude the current purchase being delivered to prevent double processing
        $pendingPurchases = [];
        foreach ($this->purchases as $p) {
            if ($p->status === 'pending' && 
                $p->itemName === $itemName && 
                $p->baseUnit === $baseUnit &&
                $p->id !== $excludePurchaseId) {
                $pendingPurchases[] = $p;
            }
        }

        if (empty($pendingPurchases)) {
            return; // No pending purchases to complete
        }

        // Get current inventory for this item
        $inventoryItem = null;
        foreach ($this->inventory as $item) {
            if ($item->name === $itemName && $item->unit === $baseUnit) {
                $inventoryItem = $item;
                break;
            }
        }

        if (!$inventoryItem || $inventoryItem->quantity <= 0) {
            return; // No inventory available to complete pending orders
        }

        // If delivered quantity is provided and sufficient, use it to cover pending orders
        // This prevents double-deducting: the delivered quantity already covers both current and pending orders
        $availableQty = $inventoryItem->quantity;
        $excessFromDelivery = 0;
        
        if ($deliveredQty !== null && $deliveredQty > 0) {
            // Calculate if the delivered quantity exceeds what's needed for the current order
            // The excess can cover pending orders without deducting from inventory
            // Note: We can't know the ordered quantity here, so we'll use a different approach:
            // If delivered quantity is large enough to cover all pending orders, don't deduct
            $totalPendingQty = 0;
            foreach ($pendingPurchases as $pending) {
                $totalPendingQty += $pending->quantity * $pending->conversionRatio;
            }
            
            // If delivered quantity can cover all pending orders, mark them as completed without deducting
            if ($deliveredQty >= $totalPendingQty) {
                $excessFromDelivery = $totalPendingQty;
                error_log("Delivery quantity ({$deliveredQty}) covers all pending orders ({$totalPendingQty}), will not deduct from inventory");
            }
        }

        // Process pending purchases in order (oldest first)
        usort($pendingPurchases, function($a, $b) {
            return strtotime($a->dateCreated) <=> strtotime($b->dateCreated);
        });

        foreach ($pendingPurchases as $pending) {
            if ($availableQty <= 0 && $excessFromDelivery <= 0) {
                break; // No more inventory available and no excess from delivery
            }

            $pendingBaseQty = $pending->quantity * $pending->conversionRatio;
            $canComplete = false;
            $useExcessFromDelivery = false;
            
            // Check if we can complete using excess from delivery first
            if ($excessFromDelivery >= $pendingBaseQty) {
                $canComplete = true;
                $useExcessFromDelivery = true;
                $excessFromDelivery -= $pendingBaseQty;
            } elseif ($availableQty >= $pendingBaseQty) {
                // Can complete this pending order fully using inventory
                $canComplete = true;
                $availableQty -= $pendingBaseQty;
            }
            
            if ($canComplete) {
                // Check if the batch this pending belongs to is already completed
                // If so, we can safely mark this as completed without worrying about batch grouping
                $batchIsCompleted = true;
                if ($pending->batchId) {
                    $otherBatchItems = [];
                    foreach ($this->purchases as $p) {
                        if ($p->batchId === $pending->batchId && $p->id !== $pending->id) {
                            $otherBatchItems[] = $p;
                        }
                    }
                    if (count($otherBatchItems) > 0) {
                        foreach ($otherBatchItems as $otherItem) {
                            if ($otherItem->status !== 'completed') {
                                $batchIsCompleted = false;
                                break;
                            }
                        }
                    }
                }
                
                // Mark pending purchase as completed
                foreach ($this->purchases as $p) {
                    if ($p->id === $pending->id) {
                        $p->status = 'completed';
                        $p->dateDelivered = date('c');
                        // Keep batchId even when completed so items stay grouped in the UI
                        // The batchId should be preserved to maintain the batch relationship
                        $this->persistPurchase($p);
                        break;
                    }
                }
                
                // Only deduct from inventory if we're not using excess from delivery
                if (!$useExcessFromDelivery) {
                    $inventoryItem->quantity -= $pendingBaseQty;
                    $inventoryItem->lastUpdated = date('c');
                    // Only update this specific item, not all items
                    if ($this->db) {
                        $this->db->updateInventoryItem($inventoryItem);
                    }
                    $this->addAuditLog('delivery', "Auto-completed pending purchase: {$pending->itemName} ({$pending->quantity} {$pending->displayUnit}) from inventory");
                } else {
                    $this->addAuditLog('delivery', "Auto-completed pending purchase: {$pending->itemName} ({$pending->quantity} {$pending->displayUnit}) using excess from delivery");
                }
            } else {
                // Partial completion - check if we can use excess from delivery first
                $remainingNeeded = $pendingBaseQty;
                $useExcessForPartial = false;
                
                if ($excessFromDelivery > 0) {
                    if ($excessFromDelivery >= $pendingBaseQty) {
                        // Can complete fully using excess
                        $useExcessForPartial = true;
                        $excessFromDelivery -= $pendingBaseQty;
                        $completedQty = $pending->quantity;
                        $remainingQty = 0;
                    } else {
                        // Use excess for partial, then use inventory for remainder
                        $remainingNeeded -= $excessFromDelivery;
                        $completedQty = ($pendingBaseQty - $remainingNeeded) / $pending->conversionRatio;
                        $remainingQty = $pending->quantity - $completedQty;
                        $excessFromDelivery = 0;
                    }
                } else {
                    // No excess, use inventory only
                    $completedQty = $availableQty / $pending->conversionRatio;
                    $remainingQty = $pending->quantity - $completedQty;
                }
                
                $unitPrice = $pending->price / $pending->quantity;
                
                // Check if the batch this pending belongs to is already completed
                // A batch is considered completed if all other items in the batch (excluding this pending) are completed
                $batchIsCompleted = true;
                if ($pending->batchId) {
                    $otherBatchItems = [];
                    foreach ($this->purchases as $p) {
                        if ($p->batchId === $pending->batchId && $p->id !== $pending->id) {
                            $otherBatchItems[] = $p;
                        }
                    }
                    // Batch is completed only if all other items are completed (or there are no other items)
                    if (count($otherBatchItems) > 0) {
                        foreach ($otherBatchItems as $otherItem) {
                            if ($otherItem->status !== 'completed') {
                                $batchIsCompleted = false;
                                break;
                            }
                        }
                    }
                }
                
                // Update pending purchase with completed quantity
                foreach ($this->purchases as $p) {
                    if ($p->id === $pending->id) {
                        $p->quantity = $completedQty;
                        $p->price = $completedQty * $unitPrice;
                        $p->status = 'completed';
                        $p->dateDelivered = date('c');
                        $this->persistPurchase($p);
                        break;
                    }
                }
                
                // Only create new pending if batch is not completed, otherwise create as standalone
                $newBatchId = $batchIsCompleted ? null : $pending->batchId;
                
                // Create new pending for remainder
                $remainingPurchase = new PurchaseOrder([
                    'id' => $this->generateUUID(),
                    'batchId' => $newBatchId,
                    'purchaserId' => $pending->purchaserId,
                    'itemName' => $pending->itemName,
                    'category' => $pending->category ?? '',
                    'supplier' => $pending->supplier ?? '',
                    'purchaseType' => $pending->purchaseType ?? 'delivery',
                    'quantity' => $remainingQty,
                    'displayUnit' => $pending->displayUnit,
                    'baseUnit' => $pending->baseUnit,
                    'conversionRatio' => $pending->conversionRatio,
                    'price' => $remainingQty * $unitPrice,
                    'status' => 'pending',
                    'dateCreated' => $pending->dateCreated
                ]);
                $this->purchases[] = $remainingPurchase;
                $this->persistPurchase($remainingPurchase);
                
                // Deduct from inventory only if we used inventory (not excess from delivery)
                if ($useExcessForPartial) {
                    // Completed fully using excess from delivery - no deduction needed
                    $this->addAuditLog('delivery', "Auto-completed pending purchase: {$pending->itemName} ({$completedQty} {$pending->displayUnit}) using excess from delivery");
                } else {
                    // Used inventory (either fully or partially)
                    $inventoryUsed = min($availableQty, $pendingBaseQty - ($remainingNeeded ?? 0));
                    if ($inventoryUsed > 0) {
                        $inventoryItem->quantity -= $inventoryUsed;
                        $inventoryItem->lastUpdated = date('c');
                        // Only update this specific item, not all items
                        if ($this->db) {
                            $this->db->updateInventoryItem($inventoryItem);
                        }
                    }
                    if ($remainingQty > 0) {
                        $this->addAuditLog('delivery', "Auto-completed partial pending purchase: {$pending->itemName} ({$completedQty} {$pending->displayUnit} completed, {$remainingQty} {$pending->displayUnit} still pending) from inventory");
                    } else {
                        $this->addAuditLog('delivery', "Auto-completed pending purchase: {$pending->itemName} ({$completedQty} {$pending->displayUnit}) from inventory");
                    }
                }
                $availableQty = max(0, $availableQty - ($pendingBaseQty - ($remainingNeeded ?? 0)));
                if ($remainingQty > 0) {
                    break; // Stop processing more pending orders if we couldn't complete this one fully
                }
            }
        }
    }

    public function confirmDeliveryPartial($id, $receivedQuantity) {
        $purchase = null;
        foreach ($this->purchases as $p) {
            if ($p->id === $id) {
                $purchase = $p;
                break;
            }
        }
        
        // If not found in memory, fetch directly from database to ensure we have latest conversion_ratio
        if (!$purchase && $this->db) {
            try {
                $purchase = $this->db->getPurchaseById($id);
                if ($purchase) {
                    // Update in-memory array for future use
                    $this->purchases[] = $purchase;
                    error_log("Fetched purchase from database for partial delivery: {$purchase->itemName} (ID: {$purchase->id})");
                }
            } catch (Exception $e) {
                error_log("Error fetching purchase from database: " . $e->getMessage());
            }
        }
        
        if (!$purchase || $purchase->status !== 'pending') {
            return;
        }

        $orderedQty = floatval($purchase->quantity);
        $receivedQty = floatval($receivedQuantity);
        
        // Validate received quantity
        if ($receivedQty <= 0) {
            error_log("ERROR: Received quantity is 0 or negative: {$receivedQty}");
            return;
        }
        // Allow receiving more than ordered - excess will be added to inventory
        // Don't cap the received quantity as users may deliver more than ordered
        
        // Calculate quantities - fetch conversion_ratio from database purchases table
        // Example: receivedQty=2, conversion_ratio=50 → receivedBaseQty = 2 × 50 = 100
        $purchaseConversionRatio = floatval($purchase->conversionRatio);
        $unitPrice = $orderedQty > 0 ? (floatval($purchase->price) / $orderedQty) : 0;
        $receivedBaseQty = $receivedQty * $purchaseConversionRatio;
        
        error_log("Partial Delivery Calculation - Received Qty: {$receivedQty} {$purchase->displayUnit}, Conversion Ratio: {$purchaseConversionRatio}, Base Qty: {$receivedBaseQty} {$purchase->baseUnit}");
        $receivedPrice = $receivedQty * $unitPrice;
        
        // Log removed - already logged above with more detail
        
        // Add received quantity to inventory
        $existing = null;
        foreach ($this->inventory as $item) {
            // Use case-insensitive comparison for item name matching
            if (strcasecmp($item->name, $purchase->itemName) === 0 && $item->unit === $purchase->baseUnit) {
                $existing = $item;
                break;
            }
        }
        
        // If not found in memory, try to find it in database directly
        if (!$existing && $this->db) {
            try {
                $allDbItems = $this->db->getAllInventoryItems();
                foreach ($allDbItems as $dbItem) {
                    if (strcasecmp($dbItem->name, $purchase->itemName) === 0 && $dbItem->unit === $purchase->baseUnit) {
                        $existing = $dbItem;
                        // Add it to in-memory array for future use
                        $this->inventory[] = $existing;
                        error_log("Found item in database but not in memory (partial): {$existing->name} (ID: {$existing->id})");
                        break;
                    }
                }
            } catch (Exception $e) {
                error_log("Error searching database for item: " . $e->getMessage());
            }
        }
        
        // Log for debugging
        error_log("=== ConfirmDeliveryPartial START ===");
        error_log("Purchase ID: {$purchase->id}");
        error_log("Item Name: '{$purchase->itemName}'");
        error_log("Base Unit: '{$purchase->baseUnit}'");
        error_log("Received Qty: {$receivedQty} {$purchase->displayUnit}");
        error_log("Conversion Ratio: {$purchaseConversionRatio}");
        error_log("Received Base Qty (calculated): {$receivedBaseQty} {$purchase->baseUnit}");
        error_log("Existing item: " . ($existing ? "FOUND (ID: {$existing->id}, Current Qty: {$existing->quantity} {$existing->unit})" : "NOT FOUND - will create new"));

        if ($existing) {
            $oldQty = floatval($existing->quantity);
            $newQty = $oldQty + floatval($receivedBaseQty);
            // Ensure newQty is a proper number - never set to 0 if we're adding
            if (!is_numeric($newQty) || $newQty < 0) {
                error_log("ERROR: Invalid newQty calculated: {$newQty}, keeping old value: {$oldQty}");
                $newQty = $oldQty;
            }
            $existing->quantity = $newQty;
            
            error_log("confirmDeliveryPartial UPDATE: {$existing->name} - Old: {$oldQty}, Adding: {$receivedBaseQty}, New: {$existing->quantity}");
            $existing->lastUpdated = date('c');
            
            // Immediately persist this specific item to ensure it's saved
            if ($this->db) {
                try {
                    $result = $this->db->updateInventoryItem($existing);
                    if ($result) {
                        error_log("Updated inventory (partial): {$existing->name} from {$oldQty} to {$existing->quantity} {$existing->unit}");
                        
                        // Reload this item from database to ensure we have the latest value
                        $updatedItem = $this->db->getInventoryItemById($existing->id);
                        if ($updatedItem) {
                            // Update the in-memory item with the database value
                            $existing->quantity = floatval($updatedItem->quantity);
                            $existing->minStockLevel = floatval($updatedItem->minStockLevel);
                            $existing->pricePerUnit = floatval($updatedItem->pricePerUnit);
                            $existing->lastUpdated = $updatedItem->lastUpdated;
                            error_log("Reloaded from DB (partial) - Quantity is now: {$existing->quantity}");
                        } else {
                            error_log("WARNING: Could not reload item {$existing->id} from database after update!");
                        }
                    }
                } catch (Exception $e) {
                    error_log("Failed to update inventory item {$existing->id}: " . $e->getMessage());
                    // CRITICAL: Don't call persistInventory() as it syncs ALL items and might overwrite correct values
                    // Instead, just log the error - the item was already updated successfully above
                    error_log("Exception in update path - item may not be fully synced, but this is non-critical");
                }
            }
        } else {
            // Item doesn't exist - create new one
            $newQty = floatval($receivedBaseQty);
            if ($newQty <= 0) {
                error_log("ERROR: Cannot create inventory item with quantity 0 or negative: {$newQty}");
                return;
            }
            error_log("confirmDeliveryPartial CREATE NEW: {$purchase->itemName} - Quantity: {$newQty} {$purchase->baseUnit}");
            
            $newItem = new InventoryItem([
                'id' => $this->generateUUID(),
                'name' => $purchase->itemName,
                'quantity' => $newQty,
                'unit' => $purchase->baseUnit,
                'pricePerUnit' => $receivedBaseQty > 0 ? (floatval($receivedPrice) / $receivedBaseQty) : 0,
                'category' => $purchase->category ?? 'Uncategorized',
                'lastUpdated' => date('c')
            ]);
            $this->inventory[] = $newItem;
            if ($this->db) {
                try {
                    $result = $this->db->updateInventoryItem($newItem);
                    if ($result) {
                        error_log("SUCCESS - Created new inventory item: {$newItem->name} with quantity {$newItem->quantity} {$newItem->unit}");
                        
                        // Reload the item to verify it was saved
                        $savedItem = $this->db->getInventoryItemById($newItem->id);
                        if ($savedItem) {
                            $verifiedQty = floatval($savedItem->quantity);
                            $newItem->quantity = $verifiedQty;
                            error_log("Verified saved item - Quantity in DB: {$verifiedQty}");
                            
                            // CRITICAL: If quantity was somehow reset to 0, fix it immediately
                            if ($verifiedQty == 0 && $newQty > 0) {
                                error_log("CRITICAL: Quantity was reset to 0 after insert! Fixing by setting to {$newQty}");
                                $newItem->quantity = $newQty;
                                $this->db->updateInventoryItem($newItem);
                                error_log("Fixed quantity back to {$newQty}");
                            }
                        } else {
                            error_log("WARNING: Could not verify new item was saved - item not found in DB!");
                        }
                    } else {
                        error_log("FAILED - Could not create new inventory item: {$newItem->name}");
                    }
                } catch (Exception $e) {
                    error_log("EXCEPTION - Failed to persist new inventory item: " . $e->getMessage());
                    error_log("Stack trace: " . $e->getTraceAsString());
                }
            }
        }

        // After adding to inventory, check if we can auto-complete any OTHER pending purchases for the same item
        // This will complete pending items from previous orders (e.g., if you ordered 2 sacks, received 1, 
        // then ordered 5 more and received all 5, it will auto-complete the 1 pending from the first order)
        // CRITICAL: Only call this if we updated an existing item, not if we created a new one
        // For new items, we don't want to auto-complete pending purchases immediately as the item was just created
        // IMPORTANT: Exclude the current purchase ID to prevent double-processing the same delivery
        // IMPORTANT: Pass the delivered quantity so it can cover pending orders without deducting from inventory
        if ($existing) {
            $this->autoCompletePendingPurchases($purchase->itemName, $purchase->baseUnit, $purchase->id, $receivedBaseQty);
        } else {
            error_log("Skipping autoCompletePendingPurchases for newly created item - will be handled on next delivery");
        }

        // If full quantity received, mark as completed
        if ($receivedQty >= $orderedQty) {
            foreach ($this->purchases as $p) {
                if ($p->id === $id) {
                    $p->status = 'completed';
                    $p->dateDelivered = date('c');
                    $this->persistPurchase($p);
                    break;
                }
            }
            $this->addAuditLog('delivery', "Confirmed full delivery of {$purchase->itemName} ({$receivedQty} {$purchase->displayUnit})");
        } else {
            // Partial delivery - update current purchase and create pending for remainder
            $remainingQty = $orderedQty - $receivedQty;
            $remainingPrice = $remainingQty * $unitPrice;
            
            // Update current purchase with received quantity
            foreach ($this->purchases as $p) {
                if ($p->id === $id) {
                    $p->quantity = $receivedQty;
                    $p->price = $receivedPrice;
                    $p->status = 'completed';
                    $p->dateDelivered = date('c');
                    $this->persistPurchase($p);
                    break;
                }
            }
            
            // Create new pending purchase for remaining quantity
            $remainingPurchase = new PurchaseOrder([
                'id' => $this->generateUUID(),
                'batchId' => $purchase->batchId,
                'purchaserId' => $purchase->purchaserId,
                'itemName' => $purchase->itemName,
                'category' => $purchase->category ?? '',
                'supplier' => $purchase->supplier ?? '',
                'purchaseType' => $purchase->purchaseType ?? 'delivery',
                'quantity' => $remainingQty,
                'displayUnit' => $purchase->displayUnit,
                'baseUnit' => $purchase->baseUnit,
                'conversionRatio' => $purchase->conversionRatio,
                'price' => $remainingPrice,
                'status' => 'pending',
                'dateCreated' => $purchase->dateCreated
            ]);
            $this->purchases[] = $remainingPurchase;
            $this->persistPurchase($remainingPurchase);
            
            $this->addAuditLog('delivery', "Confirmed partial delivery of {$purchase->itemName}: {$receivedQty} {$purchase->displayUnit} received, {$remainingQty} {$purchase->displayUnit} pending");
        }
    }

    public function deletePurchase($id) {
        $purchase = null;
        foreach ($this->purchases as $p) {
            if ($p->id === $id) {
                $purchase = $p;
                break;
            }
        }
        if (!$purchase) {
            return ['success' => false, 'error' => 'Purchase order not found'];
        }

        // Cannot delete completed purchases (already delivered and added to inventory)
        if ($purchase->status === 'completed') {
            return ['success' => false, 'error' => 'Cannot delete completed purchase order. It has already been delivered and added to inventory.'];
        }

        // If it's part of a batch, check all items in the batch
        if ($purchase->batchId) {
            $batchItems = [];
            $hasCompleted = false;
            foreach ($this->purchases as $i => $p) {
                if ($p->batchId === $purchase->batchId) {
                    $batchItems[] = ['index' => $i, 'purchase' => $p];
                    if ($p->status === 'completed') {
                        $hasCompleted = true;
                    }
                }
            }
            
            // Cannot delete batch if any item is completed
            if ($hasCompleted) {
                return ['success' => false, 'error' => 'Cannot delete batch purchase order. Some items have already been delivered and added to inventory.'];
            }
            
            // Delete all items in the batch (all are pending or cancelled)
            $indices = array_map(function($item) { return $item['index']; }, $batchItems);
            rsort($indices);
            foreach ($indices as $index) {
                $p = $this->purchases[$index];
                array_splice($this->purchases, $index, 1);
                if ($this->db) {
                    try {
                        $this->db->deletePurchase($p->id);
                    } catch (Exception $e) {
                        error_log("Failed to delete purchase from database: " . $e->getMessage());
                    }
                }
            }
            $this->addAuditLog('purchase', "Deleted batch purchase order (batchId: {$purchase->batchId})");
            return ['success' => true];
        } else {
            // Single purchase - already checked status above
            $index = -1;
            foreach ($this->purchases as $i => $p) {
                if ($p->id === $id) {
                    $index = $i;
                    break;
                }
            }
            if ($index >= 0) {
                array_splice($this->purchases, $index, 1);
                if ($this->db) {
                    try {
                        $this->db->deletePurchase($id);
                    } catch (Exception $e) {
                        error_log("Failed to delete purchase from database: " . $e->getMessage());
                    }
                }
                $this->addAuditLog('purchase', "Deleted purchase order: {$purchase->itemName} ({$purchase->quantity} {$purchase->displayUnit})");
                return ['success' => true];
            }
        }
        
        return ['success' => false, 'error' => 'Failed to delete purchase order'];
    }

    public function deleteRequest($id) {
        $index = -1;
        $request = null;
        foreach ($this->requests as $i => $r) {
            if ($r->id === $id) {
                $request = $r;
                $index = $i;
                break;
            }
        }
        if ($index >= 0) {
            array_splice($this->requests, $index, 1);
            if ($this->db) {
                try {
                    $this->db->deleteRequest($id);
                } catch (Exception $e) {
                    error_log("Failed to delete request from database: " . $e->getMessage());
                }
            }
            $requestName = $request->isSingleItem ? $request->inventoryItemName : $request->ingredientSetName;
            $this->addAuditLog('request', "Deleted request: {$requestName}");
        }
    }
    
    public function disposeInventoryItem($itemId, $quantity, $reason, $notes = null) {
        $item = null;
        foreach ($this->inventory as $i) {
            if ($i->id === $itemId) {
                $item = $i;
                break;
            }
        }
        
        if (!$item) {
            throw new Exception('Inventory item not found');
        }
        
        if ($quantity > $item->quantity) {
            throw new Exception('Disposal quantity cannot exceed available quantity');
        }
        
        // Reduce inventory quantity
        $oldQuantity = $item->quantity;
        $item->quantity = max(0, $item->quantity - $quantity);
        $item->lastUpdated = date('c');
        
        // Update in database
        if ($this->db) {
            try {
                $this->db->updateInventoryItem($item);
            } catch (Exception $e) {
                error_log("Failed to update inventory after disposal: " . $e->getMessage());
                throw $e;
            }
        }
        
        // Record disposal
        $disposal = (object)[
            'id' => $this->generateUUID(),
            'inventoryItemId' => $itemId,
            'itemName' => $item->name,
            'quantity' => $quantity,
            'unit' => $item->unit,
            'reason' => $reason,
            'notes' => $notes,
            'disposedBy' => $this->currentUser ? $this->currentUser->id : 'unknown',
            'disposedAt' => date('c')
        ];
        
        if ($this->db) {
            try {
                $this->db->addDisposal($disposal);
            } catch (Exception $e) {
                error_log("Failed to record disposal: " . $e->getMessage());
                // Don't throw - inventory was already updated
            }
        }
        
        $this->addAuditLog('disposal', "Disposed {$quantity} {$item->unit} of {$item->name}. Reason: {$reason}");
        
        return $disposal;
    }

    public function createPackage($rawItemId, $totalRawQty, $packSize, $packUnit) {
        $rawItem = null;
        foreach ($this->inventory as $item) {
            if ($item->id === $rawItemId) {
                $rawItem = $item;
                break;
            }
        }
        if (!$rawItem) {
            return;
        }

        $packSizeInRawUnit = $packSize;
        if (UnitConversions::canConvertUnits($packUnit, $rawItem->unit)) {
            $packSizeInRawUnit = UnitConversions::convertQuantity($packSize, $packUnit, $rawItem->unit);
        }
        $numberOfPacks = $totalRawQty / $packSizeInRawUnit;

        $newPackage = new PackagedItem([
            'id' => $this->generateUUID(),
            'rawInventoryItemId' => $rawItemId,
            'rawItemName' => $rawItem->name,
            'category' => $rawItem->category,
            'totalRawQuantityUsed' => $totalRawQty,
            'rawUnit' => $rawItem->unit,
            'packSize' => $packSize,
            'packUnit' => $packUnit,
            'numberOfPacks' => $numberOfPacks,
            'packagingDate' => date('c'),
            'packagedBy' => $this->currentUser ? $this->currentUser->id : 'unknown'
        ]);
        $this->packagedItems[] = $newPackage;
        $this->persistPackagedItem($newPackage);
        $this->addAuditLog('packaging', "Packaged {$totalRawQty} {$rawItem->unit} of {$rawItem->name} into " . number_format($numberOfPacks, 2) . " packs ({$packSize} {$packUnit} each)");
    }

    public function deletePackage($packageId) {
        $pkg = null;
        $index = -1;
        foreach ($this->packagedItems as $i => $p) {
            if ($p->id === $packageId) {
                $pkg = $p;
                $index = $i;
                break;
            }
        }
        if ($pkg) {
            array_splice($this->packagedItems, $index, 1);
            if ($this->db) {
                try {
                    $this->db->deletePackagedItem($packageId);
                } catch (Exception $e) {
                    error_log("Failed to delete packaged item from database: " . $e->getMessage());
                }
            }
            $this->addAuditLog('packaging', "Deleted package: {$pkg->rawItemName} (" . number_format($pkg->numberOfPacks, 2) . " packs)");
        }
    }

    public function addIngredientSet($setData) {
        $newSet = new IngredientSet([
            'id' => $this->generateUUID(),
            'name' => $setData['name'],
            'description' => $setData['description'] ?? '',
            'imagePath' => $setData['imagePath'] ?? null,
            'ingredients' => $setData['ingredients'],
            'createdBy' => $setData['createdBy'] ?? '',
            'createdAt' => date('c')
        ]);
        $this->ingredientSets[] = $newSet;
        $this->persistIngredientSet($newSet);
        $this->addAuditLog('create_set', "Created ingredient set: {$setData['name']}");
    }

    public function deleteIngredientSet($id) {
        $index = -1;
        foreach ($this->ingredientSets as $i => $set) {
            if ($set->id === $id) {
                $index = $i;
                break;
            }
        }
        if ($index >= 0) {
            $setName = $this->ingredientSets[$index]->name;
            array_splice($this->ingredientSets, $index, 1);
            if ($this->db) {
                try {
                    $this->db->deleteIngredientSet($id);
                } catch (Exception $e) {
                    error_log("Failed to delete ingredient set from database: " . $e->getMessage());
                }
            }
            $this->addAuditLog('create_set', "Deleted ingredient set: {$setName}");
        }
    }

    public function addRequest($setId, $quantity) {
        if (!$this->currentUser) {
            throw new Exception('User not authenticated');
        }
        
        // Validate quantity
        $quantity = intval($quantity);
        if ($quantity < 1) {
            throw new Exception('Quantity must be at least 1');
        }

        $set = null;
        foreach ($this->ingredientSets as $s) {
            if ($s->id === $setId) {
                $set = $s;
                break;
            }
        }
        if (!$set) {
            throw new Exception('Ingredient set not found');
        }

        // Check inventory availability immediately when request is created
        $inventoryCheck = $this->checkRequestInventory($set, $quantity);
        
        $newRequest = new KitchenRequest([
            'id' => $this->generateUUID(),
            'kitchenStaffId' => $this->currentUser->id,
            'ingredientSetId' => $setId,
            'ingredientSetName' => $set->name,
            'quantity' => $quantity,
            'status' => 'pending',
            'dateRequested' => date('c'),
            'hasInsufficientInventory' => !$inventoryCheck['canFulfill'],
            'insufficientItems' => $inventoryCheck['insufficientItems']
        ]);
        $this->requests[] = $newRequest;
        $this->persistRequest($newRequest);
        
        $logMessage = "Requested {$quantity}x {$set->name}";
        if (!$inventoryCheck['canFulfill']) {
            $logMessage .= " - INSUFFICIENT INVENTORY";
        }
        $this->addAuditLog('request', $logMessage);
    }

    public function addSingleItemRequest($inventoryItemId, $requestedQuantity, $requestedUnit) {
        if (!$this->currentUser) {
            throw new Exception('User not authenticated');
        }
        
        // Validate inputs
        $requestedQuantity = floatval($requestedQuantity);
        if ($requestedQuantity <= 0) {
            throw new Exception('Requested quantity must be greater than 0');
        }
        
        if (empty($requestedUnit)) {
            throw new Exception('Unit is required');
        }

        $invItem = null;
        foreach ($this->inventory as $i) {
            if ($i->id === $inventoryItemId) {
                $invItem = $i;
                break;
            }
        }
        if (!$invItem) {
            throw new Exception('Inventory item not found');
        }

        // Check inventory availability
        $convertedQty = $requestedQuantity;
        $hasInsufficient = false;
        $insufficientItems = [];
        
        if (UnitConversions::canConvertUnits($requestedUnit, $invItem->unit)) {
            $convertedQty = UnitConversions::convertQuantity($requestedQuantity, $requestedUnit, $invItem->unit);
            $hasInsufficient = $invItem->quantity < $convertedQty;
            if ($hasInsufficient) {
                $need = UnitConversions::formatQuantityWithUnit($convertedQty, $invItem->unit);
                $have = UnitConversions::formatQuantityWithUnit($invItem->quantity, $invItem->unit);
                $insufficientItems[] = "Need {$need}, have {$have}";
            }
        } elseif ($requestedUnit !== $invItem->unit) {
            // Unit mismatch - cannot fulfill
            $hasInsufficient = true;
            $insufficientItems = ["Unit mismatch: requested {$requestedUnit}, available {$invItem->unit}"];
        } else {
            // Same unit, no conversion needed
            $hasInsufficient = $invItem->quantity < $convertedQty;
            if ($hasInsufficient) {
                $need = UnitConversions::formatQuantityWithUnit($convertedQty, $invItem->unit);
                $have = UnitConversions::formatQuantityWithUnit($invItem->quantity, $invItem->unit);
                $insufficientItems[] = "Need {$need}, have {$have}";
            }
        }

        $newRequest = new KitchenRequest([
            'id' => $this->generateUUID(),
            'kitchenStaffId' => $this->currentUser->id,
            'isSingleItem' => true,
            'inventoryItemId' => $inventoryItemId,
            'inventoryItemName' => $invItem->name,
            'requestedQuantity' => $requestedQuantity,
            'requestedUnit' => $requestedUnit,
            'status' => 'pending',
            'dateRequested' => date('c'),
            'hasInsufficientInventory' => $hasInsufficient,
            'insufficientItems' => $insufficientItems
        ]);
        $this->requests[] = $newRequest;
        $this->persistRequest($newRequest);
        
        $formattedQty = UnitConversions::formatQuantityWithUnit($requestedQuantity, $requestedUnit);
        $logMessage = "Requested {$formattedQty} of {$invItem->name}";
        if ($hasInsufficient) {
            $logMessage .= " - INSUFFICIENT INVENTORY";
        }
        $this->addAuditLog('request', $logMessage);
    }

    private function checkRequestInventory($set, $quantity) {
        $canFulfill = true;
        $insufficientItems = [];

        foreach ($set->ingredients as $ing) {
            if ($ing->isPackaged) {
                $pkgItem = null;
                foreach ($this->packagedItems as $p) {
                    if ($p->id === $ing->inventoryItemId) {
                        $pkgItem = $p;
                        break;
                    }
                }
                if (!$pkgItem) {
                    $canFulfill = false;
                    $insufficientItems[] = "{$ing->name} (packaged item not found)";
                    continue;
                }
                $requiredPacks = $ing->quantity * $quantity;
                if ($pkgItem->numberOfPacks < $requiredPacks) {
                    $canFulfill = false;
                    $insufficientItems[] = "{$ing->name} (need {$requiredPacks} packs, have " . number_format($pkgItem->numberOfPacks, 2) . " packs)";
                }
            } else {
                $invItem = null;
                foreach ($this->inventory as $i) {
                    if ($i->id === $ing->inventoryItemId) {
                        $invItem = $i;
                        break;
                    }
                }
                if (!$invItem) {
                    $canFulfill = false;
                    $insufficientItems[] = "{$ing->name} (item not found)";
                    continue;
                }
                $requiredQty = $ing->quantity * $quantity;
                $convertedQty = $requiredQty;
                if (UnitConversions::canConvertUnits($ing->unit, $invItem->unit)) {
                    $convertedQty = UnitConversions::convertQuantity($requiredQty, $ing->unit, $invItem->unit);
                } elseif ($ing->unit !== $invItem->unit) {
                    $canFulfill = false;
                    $insufficientItems[] = "{$ing->name} (unit mismatch: need {$ing->unit}, have {$invItem->unit})";
                    continue;
                }
                if ($invItem->quantity < $convertedQty) {
                    $canFulfill = false;
                    $need = UnitConversions::formatQuantityWithUnit($convertedQty, $invItem->unit);
                    $have = UnitConversions::formatQuantityWithUnit($invItem->quantity, $invItem->unit);
                    $insufficientItems[] = "{$ing->name} (need {$need}, have {$have})";
                }
            }
        }

        return [
            'canFulfill' => $canFulfill,
            'insufficientItems' => $insufficientItems
        ];
    }

    public function processRequest($requestId, $approved) {
        $request = null;
        foreach ($this->requests as $r) {
            if ($r->id === $requestId) {
                $request = $r;
                break;
            }
        }
        if (!$request) {
            return ['success' => false, 'error' => 'Request not found'];
        }

        if (!$approved) {
            foreach ($this->requests as $r) {
                if ($r->id === $requestId) {
                    $r->status = 'rejected';
                    $r->processedBy = $this->currentUser ? $this->currentUser->id : null;
                    $r->dateProcessed = date('c');
                    $this->persistRequest($r);
                    break;
                }
            }
            $requestName = $request->isSingleItem ? $request->inventoryItemName : $request->ingredientSetName;
            $this->addAuditLog('rejection', "Rejected request for {$requestName}");
            return ['success' => true];
        }

        // Handle single item requests
        if ($request->isSingleItem) {
            return $this->processSingleItemRequest($request);
        }

        // Handle ingredient set requests (existing logic)
        $set = null;
        foreach ($this->ingredientSets as $s) {
            if ($s->id === $request->ingredientSetId) {
                $set = $s;
                break;
            }
        }
        if (!$set) {
            return ['success' => false, 'error' => 'Ingredient set not found'];
        }

        $canFulfill = true;
        $insufficientItems = [];

        // Validation phase
        foreach ($set->ingredients as $ing) {
            if ($ing->isPackaged) {
                $pkgItem = null;
                foreach ($this->packagedItems as $p) {
                    if ($p->id === $ing->inventoryItemId) {
                        $pkgItem = $p;
                        break;
                    }
                }
                if (!$pkgItem) {
                    $canFulfill = false;
                    $insufficientItems[] = "{$ing->name} (packaged item not found)";
                    continue;
                }
                $requiredPacks = $ing->quantity * $request->quantity;
                if ($pkgItem->numberOfPacks < $requiredPacks) {
                    $canFulfill = false;
                    $insufficientItems[] = "{$ing->name} (need {$requiredPacks} packs, have " . number_format($pkgItem->numberOfPacks, 2) . " packs)";
                }
                $rawItem = null;
                foreach ($this->inventory as $i) {
                    if ($i->id === $pkgItem->rawInventoryItemId) {
                        $rawItem = $i;
                        break;
                    }
                }
                // Note: Packages are connected to raw inventory but don't deduct from it
                // So we only check if packaged items exist and have enough packs
            } else {
                $invItem = null;
                foreach ($this->inventory as $i) {
                    if ($i->id === $ing->inventoryItemId) {
                        $invItem = $i;
                        break;
                    }
                }
                if (!$invItem) {
                    $canFulfill = false;
                    $insufficientItems[] = $ing->name;
                    continue;
                }
                $requiredQty = $ing->quantity * $request->quantity;
                $convertedQty = $requiredQty;
                if (UnitConversions::canConvertUnits($ing->unit, $invItem->unit)) {
                    $convertedQty = UnitConversions::convertQuantity($requiredQty, $ing->unit, $invItem->unit);
                } elseif ($ing->unit !== $invItem->unit) {
                    $canFulfill = false;
                    $insufficientItems[] = "{$ing->name} (unit mismatch: need {$ing->unit}, have {$invItem->unit})";
                    continue;
                }
                if ($invItem->quantity < $convertedQty) {
                    $canFulfill = false;
                    $need = UnitConversions::formatQuantityWithUnit($convertedQty, $invItem->unit);
                    $have = UnitConversions::formatQuantityWithUnit($invItem->quantity, $invItem->unit);
                    $insufficientItems[] = "{$ing->name} (need {$need}, have {$have})";
                }
            }
        }

        if (!$canFulfill) {
            return [
                'success' => false,
                'error' => 'Insufficient inventory',
                'insufficientItems' => $insufficientItems
            ];
        }

        // Deduction phase - BIDIRECTIONAL LINKED DEDUCTION
        $deductionDetails = [];
        foreach ($set->ingredients as $ing) {
            if ($ing->isPackaged) {
                // CASE 1: Using packaged items → Deduct from BOTH packaged AND raw
                $pkgItem = null;
                foreach ($this->packagedItems as $p) {
                    if ($p->id === $ing->inventoryItemId) {
                        $pkgItem = $p;
                        break;
                    }
                }
                if (!$pkgItem) {
                    continue;
                }
                $requiredPacks = $ing->quantity * $request->quantity;
                // 1a. Deduct from packaged items
                foreach ($this->packagedItems as $pkg) {
                    if ($pkg->id === $ing->inventoryItemId) {
                        $pkg->numberOfPacks -= $requiredPacks;
                        // Persist the updated packaged item
                        if ($this->db) {
                            $this->db->updatePackagedItem($pkg);
                        }
                        break;
                    }
                }
                // 1b. ALSO deduct from raw inventory (linked)
                $rawItem = null;
                foreach ($this->inventory as $i) {
                    if ($i->id === $pkgItem->rawInventoryItemId) {
                        $rawItem = $i;
                        break;
                    }
                }
                if ($rawItem) {
                    $packSizeInRawUnit = $pkgItem->packSize;
                    if (UnitConversions::canConvertUnits($pkgItem->packUnit, $rawItem->unit)) {
                        $packSizeInRawUnit = UnitConversions::convertQuantity($pkgItem->packSize, $pkgItem->packUnit, $rawItem->unit);
                    }
                    $rawQtyToDeduct = $requiredPacks * $packSizeInRawUnit;
                    foreach ($this->inventory as $item) {
                        if ($item->id === $pkgItem->rawInventoryItemId) {
                            $item->quantity -= $rawQtyToDeduct;
                            $item->lastUpdated = date('c');
                            // Only update this specific item, not all items
                            if ($this->db) {
                                $this->db->updateInventoryItem($item);
                            }
                            break;
                        }
                    }
                    $rawFormatted = UnitConversions::formatQuantityWithUnit($rawQtyToDeduct, $rawItem->unit);
                    $deductionDetails[] = "{$ing->name}: -{$requiredPacks} packs, -{$rawFormatted} raw";
                } else {
                    $deductionDetails[] = "{$ing->name}: -{$requiredPacks} packs";
                }
            } else {
                // CASE 2: Using raw ingredients → Deduct from raw AND matching packaged items
                $invItem = null;
                foreach ($this->inventory as $i) {
                    if ($i->id === $ing->inventoryItemId) {
                        $invItem = $i;
                        break;
                    }
                }
                if (!$invItem) {
                    continue;
                }
                $requiredQty = $ing->quantity * $request->quantity;
                $rawQtyToDeduct = $requiredQty;
                if (UnitConversions::canConvertUnits($ing->unit, $invItem->unit)) {
                    $rawQtyToDeduct = UnitConversions::convertQuantity($requiredQty, $ing->unit, $invItem->unit);
                }
                // 2a. Deduct from raw inventory
                foreach ($this->inventory as $item) {
                    if ($item->id === $ing->inventoryItemId) {
                        $item->quantity -= $rawQtyToDeduct;
                        $item->lastUpdated = date('c');
                        // Only update this specific item, not all items
                        if ($this->db) {
                            $this->db->updateInventoryItem($item);
                        }
                        break;
                    }
                }
                // 2b. ALSO deduct from matching packaged items (linked deduction)
                $matchingPackages = [];
                foreach ($this->packagedItems as $pkg) {
                    if ($pkg->rawInventoryItemId === $ing->inventoryItemId) {
                        $matchingPackages[] = $pkg;
                    }
                }
                // Sort packages by pack size (largest first) for proportional deduction
                usort($matchingPackages, function($a, $b) use ($invItem) {
                    $sizeA = $a->packSize;
                    $sizeB = $b->packSize;
                    // Convert to raw unit for comparison
                    if (UnitConversions::canConvertUnits($a->packUnit, $invItem->unit)) {
                        $sizeA = UnitConversions::convertQuantity($a->packSize, $a->packUnit, $invItem->unit);
                    }
                    if (UnitConversions::canConvertUnits($b->packUnit, $invItem->unit)) {
                        $sizeB = UnitConversions::convertQuantity($b->packSize, $b->packUnit, $invItem->unit);
                    }
                    return $sizeB <=> $sizeA; // Descending order (largest first)
                });
                $remainingToDeduct = $rawQtyToDeduct;
                $packageDeductions = [];
                // Deduct from packages proportionally (largest packs first)
                foreach ($matchingPackages as $pkg) {
                    if ($remainingToDeduct <= 0) {
                        break;
                    }
                    if ($pkg->numberOfPacks <= 0) {
                        continue;
                    }
                    // Calculate pack size in raw unit
                    $packSizeInRawUnit = $pkg->packSize;
                    if (UnitConversions::canConvertUnits($pkg->packUnit, $invItem->unit)) {
                        $packSizeInRawUnit = UnitConversions::convertQuantity($pkg->packSize, $pkg->packUnit, $invItem->unit);
                    }
                    // How many packs can we deduct?
                    $packsNeeded = $remainingToDeduct / $packSizeInRawUnit;
                    $packsToDeduct = min($packsNeeded, $pkg->numberOfPacks);
                    if ($packsToDeduct > 0) {
                        $packageDeductions[] = [
                            'pkgId' => $pkg->id,
                            'packs' => $packsToDeduct
                        ];
                        $remainingToDeduct -= $packsToDeduct * $packSizeInRawUnit;
                    }
                }
                // Apply package deductions
                if (count($packageDeductions) > 0) {
                    foreach ($this->packagedItems as $pkg) {
                        foreach ($packageDeductions as $deduction) {
                            if ($pkg->id === $deduction['pkgId']) {
                                $pkg->numberOfPacks -= $deduction['packs'];
                                // Persist the updated packaged item
                                if ($this->db) {
                                    $this->db->updatePackagedItem($pkg);
                                }
                                break;
                            }
                        }
                    }
                    $packDetails = [];
                    foreach ($packageDeductions as $d) {
                        $pkg = null;
                        foreach ($matchingPackages as $p) {
                            if ($p->id === $d['pkgId']) {
                                $pkg = $p;
                                break;
                            }
                        }
                        if ($pkg) {
                            $packDetails[] = '-' . number_format($d['packs'], 2) . " packs ({$pkg->packSize}{$pkg->packUnit})";
                        }
                    }
                    $rawFormatted = UnitConversions::formatQuantityWithUnit($rawQtyToDeduct, $invItem->unit);
                    $deductionDetails[] = "{$ing->name}: -{$rawFormatted} raw, " . implode(', ', $packDetails);
                } else {
                    $rawFormatted = UnitConversions::formatQuantityWithUnit($rawQtyToDeduct, $invItem->unit);
                    $deductionDetails[] = "{$ing->name}: -{$rawFormatted} raw (no matching packages)";
                }
            }
        }

        foreach ($this->requests as $r) {
            if ($r->id === $requestId) {
                $r->status = 'approved';
                $r->processedBy = $this->currentUser ? $this->currentUser->id : null;
                $r->dateProcessed = date('c');
                $this->persistRequest($r);
                break;
            }
        }
        $this->addAuditLog('approval', "Approved {$request->quantity}x {$request->ingredientSetName}. " . implode('; ', $deductionDetails));
        return ['success' => true];
    }

    private function processSingleItemRequest($request) {
        $invItem = null;
        foreach ($this->inventory as $i) {
            if ($i->id === $request->inventoryItemId) {
                $invItem = $i;
                break;
            }
        }
        if (!$invItem) {
            return ['success' => false, 'error' => 'Inventory item not found'];
        }

        // Convert requested quantity to inventory unit
        $convertedQty = $request->requestedQuantity;
        if (UnitConversions::canConvertUnits($request->requestedUnit, $invItem->unit)) {
            $convertedQty = UnitConversions::convertQuantity($request->requestedQuantity, $request->requestedUnit, $invItem->unit);
        } elseif ($request->requestedUnit !== $invItem->unit) {
            return [
                'success' => false,
                'error' => 'Unit mismatch',
                'insufficientItems' => ["Cannot convert {$request->requestedUnit} to {$invItem->unit}"]
            ];
        }

        // Check if sufficient inventory
        if ($invItem->quantity < $convertedQty) {
            $need = UnitConversions::formatQuantityWithUnit($convertedQty, $invItem->unit);
            $have = UnitConversions::formatQuantityWithUnit($invItem->quantity, $invItem->unit);
            return [
                'success' => false,
                'error' => 'Insufficient inventory',
                'insufficientItems' => ["Need {$need}, have {$have}"]
            ];
        }

        // Deduct from inventory
        foreach ($this->inventory as $item) {
            if ($item->id === $request->inventoryItemId) {
                $item->quantity -= $convertedQty;
                $item->lastUpdated = date('c');
                // Only update this specific item, not all items
                if ($this->db) {
                    $this->db->updateInventoryItem($item);
                }
                break;
            }
        }

        // Also deduct from matching packaged items (linked deduction)
        $matchingPackages = [];
        foreach ($this->packagedItems as $pkg) {
            if ($pkg->rawInventoryItemId === $request->inventoryItemId) {
                $matchingPackages[] = $pkg;
            }
        }
        if (count($matchingPackages) > 0) {
            // Sort packages by pack size (largest first)
            usort($matchingPackages, function($a, $b) use ($invItem) {
                $sizeA = $a->packSize;
                $sizeB = $b->packSize;
                if (UnitConversions::canConvertUnits($a->packUnit, $invItem->unit)) {
                    $sizeA = UnitConversions::convertQuantity($a->packSize, $a->packUnit, $invItem->unit);
                }
                if (UnitConversions::canConvertUnits($b->packUnit, $invItem->unit)) {
                    $sizeB = UnitConversions::convertQuantity($b->packSize, $b->packUnit, $invItem->unit);
                }
                return $sizeB <=> $sizeA;
            });
            $remainingToDeduct = $convertedQty;
            foreach ($matchingPackages as $pkg) {
                if ($remainingToDeduct <= 0) break;
                if ($pkg->numberOfPacks <= 0) continue;
                $packSizeInRawUnit = $pkg->packSize;
                if (UnitConversions::canConvertUnits($pkg->packUnit, $invItem->unit)) {
                    $packSizeInRawUnit = UnitConversions::convertQuantity($pkg->packSize, $pkg->packUnit, $invItem->unit);
                }
                $packsNeeded = $remainingToDeduct / $packSizeInRawUnit;
                $packsToDeduct = min($packsNeeded, $pkg->numberOfPacks);
                if ($packsToDeduct > 0) {
                    foreach ($this->packagedItems as $p) {
                        if ($p->id === $pkg->id) {
                            $p->numberOfPacks -= $packsToDeduct;
                            // Persist the updated packaged item
                            if ($this->db) {
                                $this->db->updatePackagedItem($p);
                            }
                            $remainingToDeduct -= $packsToDeduct * $packSizeInRawUnit;
                            break;
                        }
                    }
                }
            }
        }

        // Update request status
        foreach ($this->requests as $r) {
            if ($r->id === $request->id) {
                $r->status = 'approved';
                $r->processedBy = $this->currentUser ? $this->currentUser->id : null;
                $r->dateProcessed = date('c');
                $this->persistRequest($r);
                break;
            }
        }

        $formattedQty = UnitConversions::formatQuantityWithUnit($request->requestedQuantity, $request->requestedUnit);
        $this->addAuditLog('approval', "Approved single item request: {$formattedQty} of {$request->inventoryItemName}");
        return ['success' => true];
    }

    public function updateInventoryItem($itemId, $data) {
        if (!$this->currentUser) {
            return ['success' => false, 'error' => 'Not authenticated'];
        }

        $item = null;
        foreach ($this->inventory as $i) {
            if ($i->id === $itemId) {
                $item = $i;
                break;
            }
        }

        if (!$item) {
            return ['success' => false, 'error' => 'Inventory item not found'];
        }

        // CRITICAL: Log current quantity before any updates
        $originalQuantity = $item->quantity;
        error_log("Store::updateInventoryItem - Item ID: {$itemId}, Current quantity: {$originalQuantity}");
        error_log("Store::updateInventoryItem - Update data: " . json_encode($data));

        // Update allowed fields
        if (isset($data['minStockLevel'])) {
            $item->minStockLevel = floatval($data['minStockLevel']);
        }
        if (isset($data['pricePerUnit'])) {
            $item->pricePerUnit = floatval($data['pricePerUnit']);
        }
        if (isset($data['category'])) {
            $item->category = $data['category'];
        }
        
        // CRITICAL: Handle quantity update - validate it's provided and valid
        if (isset($data['quantity'])) {
            if (!is_numeric($data['quantity']) || $data['quantity'] < 0) {
                error_log("CRITICAL ERROR: Invalid quantity in updateInventoryItem: " . var_export($data['quantity'], true));
                return ['success' => false, 'error' => 'Invalid quantity value'];
            }
            $item->quantity = floatval($data['quantity']);
            error_log("Store::updateInventoryItem - Quantity updated from {$originalQuantity} to {$item->quantity}");
        } else {
            // CRITICAL: If quantity is not provided, preserve existing quantity
            // Do NOT update quantity - keep the original value
            error_log("Store::updateInventoryItem - Quantity not provided in update, preserving original: {$originalQuantity}");
        }
        
        $item->lastUpdated = date('c');
        
        // CRITICAL: Verify quantity is still valid before persisting
        if (!isset($item->quantity) || !is_numeric($item->quantity)) {
            error_log("CRITICAL ERROR: Quantity is missing or invalid before persist: " . var_export($item->quantity, true));
            return ['success' => false, 'error' => 'Quantity is missing or invalid'];
        }
        
        // Only update this specific item, not all items
        if ($this->db) {
            $this->db->updateInventoryItem($item);
        }
        $this->addAuditLog('update_inventory', "Updated inventory item: {$item->name} (Reorder Level: {$item->minStockLevel} {$item->unit})");
        return ['success' => true];
    }

    public function reset() {
        // Save current user before reset
        $savedUser = $this->currentUser;
        
        // Clear all data
        $this->inventory = [];
        $this->packagedItems = [];
        $this->purchases = [];
        $this->ingredientSets = [];
        $this->requests = [];
        $this->auditLogs = [];
        
        // Reinitialize with default data
        $this->initializeData();
        
        // Restore user if they were logged in
        $this->currentUser = $savedUser;
        
        if ($this->currentUser) {
            $this->addAuditLog('system', 'All data has been reset to initial state');
        }
    }

    // Convert all data to arrays for JSON serialization
    public function toArray() {
        $data = [
            'currentUser' => $this->currentUser ? $this->currentUser->toArray() : null,
            'inventory' => array_map(function($item) { return $item->toArray(); }, $this->inventory),
            'packagedItems' => array_map(function($item) { return $item->toArray(); }, $this->packagedItems),
            'purchases' => array_map(function($item) { return $item->toArray(); }, $this->purchases),
            'ingredientSets' => array_map(function($item) { return $item->toArray(); }, $this->ingredientSets),
            'requests' => array_map(function($item) { return $item->toArray(); }, $this->requests),
            'auditLogs' => array_map(function($item) { return $item->toArray(); }, $this->auditLogs)
        ];
        
        // Include users list for admin users
        if ($this->currentUser && $this->currentUser->role === 'admin' && $this->db) {
            try {
                $data['users'] = $this->db->getAllUsers();
            } catch (Exception $e) {
                error_log("Failed to load users for admin: " . $e->getMessage());
                $data['users'] = [];
            }
        }
        
        // Include disposals for admin users
        if ($this->currentUser && $this->currentUser->role === 'admin' && $this->db) {
            try {
                $data['disposals'] = $this->db->getAllDisposals();
            } catch (Exception $e) {
                error_log("Failed to load disposals for admin: " . $e->getMessage());
                $data['disposals'] = [];
            }
        }
        
        return $data;
    }
}
