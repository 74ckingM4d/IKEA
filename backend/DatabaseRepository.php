<?php

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/types.php';

class DatabaseRepository {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }
    
    // Convert ISO 8601 date to MySQL DATETIME format
    private function toMySQLDate($isoDate) {
        if (empty($isoDate) || $isoDate === null) {
            return null;
        }
        // If already in MySQL format, return as is
        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $isoDate)) {
            return $isoDate;
        }
        // Convert ISO 8601 to MySQL format
        try {
            $date = new DateTime($isoDate);
            return $date->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            return date('Y-m-d H:i:s');
        }
    }
    
    // ============ INVENTORY ITEMS ============
    
    public function getAllInventoryItems() {
        $stmt = $this->db->query("SELECT * FROM inventory_items ORDER BY name");
        $items = [];
        while ($row = $stmt->fetch()) {
            $items[] = new InventoryItem([
                'id' => $row['id'],
                'name' => $row['name'],
                'quantity' => floatval($row['quantity']),
                'unit' => $row['unit'],
                'minStockLevel' => floatval($row['min_stock_level']),
                'pricePerUnit' => floatval($row['price_per_unit']),
                'category' => $row['category'],
                'lastUpdated' => $row['last_updated']
            ]);
        }
        return $items;
    }
    
    public function getInventoryItemById($id) {
        $stmt = $this->db->prepare("SELECT * FROM inventory_items WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) return null;
        
        return new InventoryItem([
            'id' => $row['id'],
            'name' => $row['name'],
            'quantity' => floatval($row['quantity']),
            'unit' => $row['unit'],
            'minStockLevel' => floatval($row['min_stock_level']),
            'pricePerUnit' => floatval($row['price_per_unit']),
            'category' => $row['category'],
            'lastUpdated' => $row['last_updated']
        ]);
    }
    
    public function updateInventoryItem($item) {
        try {
            // CRITICAL DEBUG: Log raw quantity before any database work
            error_log("BEFORE DB - Raw item quantity: " . var_export($item->quantity, true));
            error_log("BEFORE DB - Item ID: {$item->id}, Name: {$item->name}");
            error_log("BEFORE DB - Item object type: " . gettype($item->quantity));
            
            // Check if item exists
            $checkStmt = $this->db->prepare("SELECT id, quantity FROM inventory_items WHERE id = ?");
            $checkStmt->execute([$item->id]);
            $exists = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            $mysqlDate = $this->toMySQLDate($item->lastUpdated);
            
            // CRITICAL FIX: Never auto-convert missing values to 0
            if (!isset($item->quantity) || $item->quantity === null || $item->quantity === '') {
                error_log("CRITICAL ERROR: Quantity is missing or null before database update");
                error_log("  Item ID: {$item->id}, Name: {$item->name}");
                error_log("  Quantity value: " . var_export($item->quantity, true));
                error_log("  Quantity type: " . gettype($item->quantity));
                
                // If item exists in DB, preserve existing quantity instead of setting to 0
                if ($exists) {
                    $preservedQty = floatval($exists['quantity']);
                    error_log("  PRESERVING existing quantity from DB: {$preservedQty}");
                    $item->quantity = $preservedQty;
                } else {
                    throw new Exception("Quantity is missing or invalid before database update for item {$item->id} ({$item->name})");
                }
            }
            
            // Ensure quantities are properly cast to float
            $quantity = floatval($item->quantity);
            $minStockLevel = floatval($item->minStockLevel);
            $pricePerUnit = floatval($item->pricePerUnit);
            
            // CRITICAL: Validate quantity is numeric after conversion
            if (!is_numeric($quantity)) {
                error_log("CRITICAL ERROR: Quantity is not numeric after floatval: " . var_export($quantity, true));
                if ($exists) {
                    // Preserve existing quantity
                    $quantity = floatval($exists['quantity']);
                    error_log("  FALLBACK: Using existing quantity from DB: {$quantity}");
                } else {
                    throw new Exception("Quantity is not numeric for item {$item->id} ({$item->name})");
                }
            }
            
            if ($exists) {
                // Update existing item
                $oldQty = floatval($exists['quantity']);
                
                // Debug: Log what we're about to update
                error_log("DB UPDATE - Item ID: {$item->id}, Name: {$item->name}");
                error_log("DB UPDATE - Old quantity from DB: {$oldQty}, New quantity from item object: {$quantity}");
                error_log("DB UPDATE - All values: name={$item->name}, qty={$quantity}, unit={$item->unit}, min_stock={$minStockLevel}, price={$pricePerUnit}, category={$item->category}");
                
                // CRITICAL: Never auto-convert to 0 - preserve existing quantity if invalid
                if (!is_numeric($quantity) || $quantity < 0) {
                    error_log("WARNING: Invalid quantity calculated: {$quantity}, preserving existing: {$oldQty}");
                    $quantity = $oldQty; // Preserve existing quantity instead of setting to 0
                }
                
                // CRITICAL: If old quantity was > 0 and new quantity is exactly 0, this is suspicious
                // Check if this might be a bug where quantity was accidentally reset
                // Only block if the item was recently created (within last 5 seconds) to avoid blocking legitimate zeroing
                if ($oldQty > 0.01 && abs($quantity) < 0.01) {
                    error_log("CRITICAL WARNING: Attempting to set quantity from {$oldQty} to {$quantity} (zero)!");
                    error_log("  Item object quantity: " . var_export($item->quantity, true));
                    error_log("  This might be a bug - checking if item was recently created...");
                    
                    // Check if item was recently created by checking last_updated timestamp
                    $checkTimeStmt = $this->db->prepare("SELECT last_updated, TIMESTAMPDIFF(SECOND, last_updated, NOW()) as age_seconds FROM inventory_items WHERE id = ?");
                    $checkTimeStmt->execute([$item->id]);
                    $timeRow = $checkTimeStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($timeRow && isset($timeRow['age_seconds']) && $timeRow['age_seconds'] < 5) {
                        // Item was created within last 5 seconds - this is likely a bug
                        error_log("  BLOCKING update - item was created {$timeRow['age_seconds']} seconds ago, preserving quantity {$oldQty}");
                        $quantity = $oldQty;
                    } else {
                        error_log("  Allowing update - item is older, may be legitimate zeroing");
                    }
                }
                $minStockLevel = is_numeric($minStockLevel) ? $minStockLevel : 0;
                $pricePerUnit = is_numeric($pricePerUnit) ? $pricePerUnit : 0;
                
                $stmt = $this->db->prepare("
                    UPDATE inventory_items 
                    SET name = ?, quantity = ?, unit = ?, min_stock_level = ?, 
                        price_per_unit = ?, category = ?, last_updated = ?
                    WHERE id = ?
                ");
                
                // Use numeric values directly - PDO will handle DECIMAL conversion
                $result = $stmt->execute([
                    $item->name,
                    (float)$quantity,  // Direct numeric value
                    $item->unit,
                    $minStockLevel,
                    $pricePerUnit,
                    $item->category,
                    $mysqlDate,
                    $item->id
                ]);
                
                if (!$result) {
                    $errorInfo = $stmt->errorInfo();
                    error_log("CRITICAL: Failed to update inventory item {$item->id} ({$item->name}). Error: " . json_encode($errorInfo));
                    error_log("Attempted to update quantity from {$oldQty} to {$quantity}");
                    return false;
                }
                
                $rowsAffected = $stmt->rowCount();
                if ($rowsAffected > 0) {
                    error_log("SUCCESS: Updated inventory item {$item->id} ({$item->name}): quantity from {$oldQty} to {$quantity}, rows affected: {$rowsAffected}");
                    
                    // CRITICAL: Verify the update worked by reading back from database
                    $verifyStmt = $this->db->prepare("SELECT quantity FROM inventory_items WHERE id = ?");
                    $verifyStmt->execute([$item->id]);
                    $verifyRow = $verifyStmt->fetch(PDO::FETCH_ASSOC);
                    if ($verifyRow) {
                        $actualQty = floatval($verifyRow['quantity']);
                        error_log("VERIFICATION - Quantity in DB after update: {$actualQty} (expected: {$quantity})");
                        if (abs($actualQty - $quantity) > 0.01) {
                            error_log("CRITICAL ERROR: Quantity mismatch! Expected: {$quantity}, Actual in DB: {$actualQty}");
                            // Try direct SQL update as fallback
                            $directStmt = $this->db->prepare("UPDATE inventory_items SET quantity = ? WHERE id = ?");
                            $directResult = $directStmt->execute([$quantity, $item->id]);
                            if ($directResult) {
                                error_log("FALLBACK UPDATE: Direct SQL update executed");
                                $verifyStmt2 = $this->db->prepare("SELECT quantity FROM inventory_items WHERE id = ?");
                                $verifyStmt2->execute([$item->id]);
                                $verifyRow2 = $verifyStmt2->fetch(PDO::FETCH_ASSOC);
                                if ($verifyRow2) {
                                    $actualQty2 = floatval($verifyRow2['quantity']);
                                    error_log("AFTER FALLBACK - Quantity in DB: {$actualQty2}");
                                }
                            }
                        } else {
                            error_log("VERIFICATION PASSED - Quantity matches expected value");
                        }
                    } else {
                        error_log("WARNING: Could not verify update - item not found after update!");
                    }
                } else {
                    error_log("CRITICAL WARNING: Update query executed but no rows affected for item {$item->id} ({$item->name}). Old qty: {$oldQty}, New qty: {$quantity}");
                    error_log("This might mean the WHERE clause didn't match any rows. Item ID in DB: " . $exists['id']);
                    return false;
                }
                return true;
        } else {
            // Insert new item
            // CRITICAL: Use the original quantity from the item object, not the recalculated one
            $originalQuantity = floatval($item->quantity);
            
            error_log("DB INSERT - Creating new item: ID={$item->id}, Name={$item->name}");
            error_log("  Original quantity from item object: {$originalQuantity}");
            error_log("  Item->quantity raw value: " . var_export($item->quantity, true));
            error_log("  Item->quantity type: " . gettype($item->quantity));
            error_log("  Calculated quantity variable: {$quantity}");
            
            // Use the original quantity from the item, but validate it
            if (!is_numeric($originalQuantity) || $originalQuantity <= 0) {
                error_log("CRITICAL ERROR: Invalid quantity for new item: {$originalQuantity}");
                error_log("  This should not happen - item was created with quantity > 0");
                throw new Exception("Cannot create inventory item with invalid quantity: {$originalQuantity}");
            }
            
            // CRITICAL FIX: Ensure we use the original quantity, not the potentially modified $quantity variable
            // The $quantity variable might have been modified earlier in the function for existing items
            $quantity = $originalQuantity; // Use the original quantity from the item object
            error_log("  Using quantity for INSERT: {$quantity}");
            $minStockLevel = is_numeric($minStockLevel) ? $minStockLevel : 0;
            $pricePerUnit = is_numeric($pricePerUnit) ? $pricePerUnit : 0;
            
            $stmt = $this->db->prepare("
                INSERT INTO inventory_items 
                (id, name, quantity, unit, min_stock_level, price_per_unit, category, last_updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            // CRITICAL: Final validation before insert
            if (!is_numeric($quantity) || $quantity <= 0) {
                error_log("CRITICAL ERROR: Quantity is invalid right before INSERT: {$quantity}");
                error_log("  Item ID: {$item->id}, Name: {$item->name}");
                error_log("  Item->quantity: " . var_export($item->quantity, true));
                throw new Exception("Cannot insert inventory item with invalid quantity: {$quantity}");
            }
            
            // Use numeric values directly - PDO will handle DECIMAL conversion
            // CRITICAL: Cast to float to ensure it's a number, not a string
            $quantityForInsert = (float)$quantity;
            error_log("  Final quantity value for INSERT: {$quantityForInsert} (type: " . gettype($quantityForInsert) . ")");
            error_log("  EXECUTING INSERT INTO inventory_items (id, name, quantity, unit, min_stock_level, price_per_unit, category, last_updated)");
            error_log("  VALUES ('{$item->id}', '{$item->name}', {$quantityForInsert}, '{$item->unit}', {$minStockLevel}, {$pricePerUnit}, '{$item->category}', '{$mysqlDate}')");
            
            $result = $stmt->execute([
                $item->id,
                $item->name,
                $quantityForInsert,  // Use validated and cast quantity
                $item->unit,
                $minStockLevel,
                $pricePerUnit,
                $item->category,
                $mysqlDate
            ]);
            
            if (!$result) {
                $errorInfo = $stmt->errorInfo();
                error_log("CRITICAL: Failed to insert inventory item {$item->id} ({$item->name}). Error: " . json_encode($errorInfo));
                return false;
            } else {
                error_log("SUCCESS: Inserted new inventory item {$item->id} ({$item->name}) with quantity {$quantity}");
                
                // CRITICAL: Verify the insert worked by reading back from database
                $verifyStmt = $this->db->prepare("SELECT quantity FROM inventory_items WHERE id = ?");
                $verifyStmt->execute([$item->id]);
                $verifyRow = $verifyStmt->fetch(PDO::FETCH_ASSOC);
                if ($verifyRow) {
                    $actualQty = floatval($verifyRow['quantity']);
                    error_log("VERIFICATION - Quantity in DB after insert: {$actualQty} (expected: {$quantity})");
                    if (abs($actualQty - $quantity) > 0.01) {
                        error_log("CRITICAL ERROR: Quantity mismatch after insert! Expected: {$quantity}, Actual: {$actualQty}");
                        // Try to fix it with an UPDATE
                        $fixStmt = $this->db->prepare("UPDATE inventory_items SET quantity = ? WHERE id = ?");
                        $fixStmt->execute([$quantity, $item->id]);
                        error_log("Attempted to fix quantity with UPDATE statement");
                    } else {
                        error_log("VERIFICATION PASSED - Quantity matches expected value");
                    }
                } else {
                    error_log("CRITICAL ERROR: Could not verify insert - item not found after insert!");
                }
            }
            return $result;
        }
        } catch (PDOException $e) {
            error_log("PDO Exception in updateInventoryItem for {$item->id}: " . $e->getMessage());
            throw $e;
        } catch (Exception $e) {
            error_log("Exception in updateInventoryItem for {$item->id}: " . $e->getMessage());
            throw $e;
        }
    }
    
    // ============ PACKAGED ITEMS ============
    
    public function getAllPackagedItems() {
        $stmt = $this->db->query("SELECT * FROM packaged_items ORDER BY packaging_date DESC");
        $items = [];
        while ($row = $stmt->fetch()) {
            $items[] = new PackagedItem([
                'id' => $row['id'],
                'rawInventoryItemId' => $row['raw_inventory_item_id'],
                'rawItemName' => $row['raw_item_name'],
                'category' => $row['category'],
                'totalRawQuantityUsed' => floatval($row['total_raw_quantity_used']),
                'rawUnit' => $row['raw_unit'],
                'packSize' => floatval($row['pack_size']),
                'packUnit' => $row['pack_unit'],
                'numberOfPacks' => floatval($row['number_of_packs']),
                'packagingDate' => $row['packaging_date'],
                'packagedBy' => $row['packaged_by']
            ]);
        }
        return $items;
    }
    
    public function addPackagedItem($item) {
        $stmt = $this->db->prepare("
            INSERT INTO packaged_items 
            (id, raw_inventory_item_id, raw_item_name, category, total_raw_quantity_used, 
             raw_unit, pack_size, pack_unit, number_of_packs, packaging_date, packaged_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        return $stmt->execute([
            $item->id,
            $item->rawInventoryItemId,
            $item->rawItemName,
            $item->category,
            $item->totalRawQuantityUsed,
            $item->rawUnit,
            $item->packSize,
            $item->packUnit,
            $item->numberOfPacks,
            $this->toMySQLDate($item->packagingDate),
            $item->packagedBy
        ]);
    }
    
    public function getPackagedItemById($id) {
        $stmt = $this->db->prepare("SELECT * FROM packaged_items WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) return null;
        
        return new PackagedItem([
            'id' => $row['id'],
            'rawInventoryItemId' => $row['raw_inventory_item_id'],
            'rawItemName' => $row['raw_item_name'],
            'category' => $row['category'],
            'totalRawQuantityUsed' => floatval($row['total_raw_quantity_used']),
            'rawUnit' => $row['raw_unit'],
            'packSize' => floatval($row['pack_size']),
            'packUnit' => $row['pack_unit'],
            'numberOfPacks' => floatval($row['number_of_packs']),
            'packagingDate' => $row['packaging_date'],
            'packagedBy' => $row['packaged_by']
        ]);
    }
    
    public function updatePackagedItem($item) {
        $stmt = $this->db->prepare("
            UPDATE packaged_items 
            SET number_of_packs = ?
            WHERE id = ?
        ");
        return $stmt->execute([
            $item->numberOfPacks,
            $item->id
        ]);
    }
    
    public function deletePackagedItem($id) {
        $stmt = $this->db->prepare("DELETE FROM packaged_items WHERE id = ?");
        return $stmt->execute([$id]);
    }
    
    // ============ PURCHASES ============
    
    public function getAllPurchases() {
        $stmt = $this->db->query("SELECT * FROM purchases ORDER BY date_created DESC");
        $purchases = [];
        while ($row = $stmt->fetch()) {
            $purchases[] = new PurchaseOrder([
                'id' => $row['id'],
                'batchId' => $row['batch_id'],
                'purchaserId' => $row['purchaser_id'],
                'itemName' => $row['item_name'],
                'brandName' => $row['brand_name'] ?? '',
                'category' => $row['category'],
                'supplier' => $row['supplier'] ?? '',
                'purchaseType' => $row['purchase_type'],
                'expiryDate' => $row['expiry_date'] ?? null,
                'paymentStatus' => $row['payment_status'] ?? 'paid',
                'quantity' => floatval($row['quantity']),
                'displayUnit' => $row['display_unit'],
                'baseUnit' => $row['base_unit'],
                'conversionRatio' => floatval($row['conversion_ratio']),
                'price' => floatval($row['price']),
                'status' => $row['status'],
                'dateCreated' => $row['date_created'],
                'dateDelivered' => $row['date_delivered'],
                'receiptPath' => $row['receipt_path'] ?? null
            ]);
        }
        return $purchases;
    }
    
    public function getPurchaseById($id) {
        $stmt = $this->db->prepare("SELECT * FROM purchases WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) return null;
        
        return new PurchaseOrder([
            'id' => $row['id'],
            'batchId' => $row['batch_id'],
            'purchaserId' => $row['purchaser_id'],
            'itemName' => $row['item_name'],
            'brandName' => $row['brand_name'] ?? '',
            'category' => $row['category'],
            'supplier' => $row['supplier'] ?? '',
            'purchaseType' => $row['purchase_type'],
            'expiryDate' => $row['expiry_date'] ?? null,
            'paymentStatus' => $row['payment_status'] ?? 'paid',
            'quantity' => floatval($row['quantity']),
            'displayUnit' => $row['display_unit'],
            'baseUnit' => $row['base_unit'],
            'conversionRatio' => floatval($row['conversion_ratio']),
            'price' => floatval($row['price']),
            'status' => $row['status'],
            'dateCreated' => $row['date_created'],
            'dateDelivered' => $row['date_delivered'],
            'receiptPath' => $row['receipt_path'] ?? null
        ]);
    }
    
    public function addPurchase($purchase) {
        try {
            // Log batch ID before insert
            $batchIdValue = $purchase->batchId ?? 'NULL';
            error_log("DatabaseRepository::addPurchase - Purchase ID: {$purchase->id}, Item: {$purchase->itemName}, batchId: {$batchIdValue}");
            
            $stmt = $this->db->prepare("
                INSERT INTO purchases 
                (id, batch_id, purchaser_id, item_name, brand_name, category, supplier, purchase_type, payment_status, expiry_date, quantity, 
                 display_unit, base_unit, conversion_ratio, price, status, date_created, date_delivered, receipt_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            // Ensure NULL is properly handled (PDO will convert empty string to NULL if needed)
            $batchId = !empty($purchase->batchId) ? $purchase->batchId : null;
            $receiptPath = !empty($purchase->receiptPath) ? $purchase->receiptPath : null;
            
            $result = $stmt->execute([
                $purchase->id,
                $batchId,  // Use explicit null handling
                $purchase->purchaserId,
                $purchase->itemName,
                $purchase->brandName ?? '',
                $purchase->category,
                $purchase->supplier ?? '',
                $purchase->purchaseType,
                $purchase->paymentStatus ?? 'paid',
                $purchase->expiryDate,
                $purchase->quantity,
                $purchase->displayUnit,
                $purchase->baseUnit,
                $purchase->conversionRatio,
                $purchase->price,
                $purchase->status,
                $this->toMySQLDate($purchase->dateCreated),
                $this->toMySQLDate($purchase->dateDelivered),
                $receiptPath
            ]);
            
            if (!$result) {
                error_log("Failed to insert purchase. Error info: " . json_encode($stmt->errorInfo()));
            } else {
                error_log("SUCCESS - Purchase inserted with batchId: " . ($batchId ?? 'NULL'));
            }
            return $result;
        } catch (PDOException $e) {
            error_log("PDO Exception adding purchase: " . $e->getMessage());
            throw $e;
        }
    }
    
    public function updatePurchase($purchase) {
        $stmt = $this->db->prepare("
            UPDATE purchases 
            SET batch_id = ?, status = ?, quantity = ?, price = ?, date_delivered = ?, supplier = ?
            WHERE id = ?
        ");
        return $stmt->execute([
            $purchase->batchId,
            $purchase->status,
            $purchase->quantity,
            $purchase->price,
            $this->toMySQLDate($purchase->dateDelivered),
            $purchase->supplier ?? '',
            $purchase->id
        ]);
    }
    
    public function deletePurchase($id) {
        $stmt = $this->db->prepare("DELETE FROM purchases WHERE id = ?");
        return $stmt->execute([$id]);
    }
    
    public function updatePaymentStatus($type, $id, $paidAmount, $receiptPath, $notes = null) {
        try {
            if ($type === 'batch') {
                // Update all purchases in the batch
                $stmt = $this->db->prepare("
                    UPDATE purchases 
                    SET payment_status = 'paid', receipt_path = ?
                    WHERE batch_id = ?
                ");
                return $stmt->execute([$receiptPath, $id]);
            } else {
                // Update single purchase
                $stmt = $this->db->prepare("
                    UPDATE purchases 
                    SET payment_status = 'paid', receipt_path = ?
                    WHERE id = ?
                ");
                return $stmt->execute([$receiptPath, $id]);
            }
        } catch (Exception $e) {
            error_log("Error updating payment status: " . $e->getMessage());
            return false;
        }
    }
    
    // ============ INGREDIENT SETS ============
    
    public function getAllIngredientSets() {
        $stmt = $this->db->query("SELECT * FROM ingredient_sets ORDER BY created_at DESC");
        $sets = [];
        while ($row = $stmt->fetch()) {
            $ingredients = $this->getIngredientsBySetId($row['id']);
            $sets[] = new IngredientSet([
                'id' => $row['id'],
                'name' => $row['name'],
                'description' => $row['description'],
                'imagePath' => $row['image_path'] ?? null,
                'createdBy' => $row['created_by'],
                'createdAt' => $row['created_at'],
                'ingredients' => $ingredients
            ]);
        }
        return $sets;
    }
    
    public function getIngredientsBySetId($setId) {
        $stmt = $this->db->prepare("SELECT * FROM ingredients WHERE ingredient_set_id = ?");
        $stmt->execute([$setId]);
        $ingredients = [];
        while ($row = $stmt->fetch()) {
            $ingredients[] = [
                'id' => $row['id'],
                'inventoryItemId' => $row['inventory_item_id'],
                'name' => $row['name'],
                'quantity' => floatval($row['quantity']),
                'unit' => $row['unit'],
                'isPackaged' => (bool)$row['is_packaged']
            ];
        }
        return $ingredients;
    }
    
    public function addIngredientSet($set) {
        $this->db->beginTransaction();
        try {
            error_log("DatabaseRepository::addIngredientSet - Inserting set: ID={$set->id}, Name={$set->name}, Ingredients count=" . count($set->ingredients));
            
            // Check if image_path column exists, if not use alternative query
            $columns = "id, name, description, created_by, created_at";
            $placeholders = "?, ?, ?, ?, ?";
            $values = [
                $set->id,
                $set->name,
                $set->description,
                $set->createdBy,
                $this->toMySQLDate($set->createdAt)
            ];
            
            // Try to include image_path if it exists
            try {
                $testStmt = $this->db->query("SHOW COLUMNS FROM ingredient_sets LIKE 'image_path'");
                if ($testStmt->rowCount() > 0) {
                    $columns = "id, name, description, image_path, created_by, created_at";
                    $placeholders = "?, ?, ?, ?, ?, ?";
                    $values = [
                        $set->id,
                        $set->name,
                        $set->description,
                        $set->imagePath ?? null,
                        $set->createdBy,
                        $this->toMySQLDate($set->createdAt)
                    ];
                }
            } catch (Exception $e) {
                error_log("Could not check for image_path column, using basic insert: " . $e->getMessage());
            }
            
            $stmt = $this->db->prepare("
                INSERT INTO ingredient_sets ({$columns})
                VALUES ({$placeholders})
            ");
            $stmt->execute($values);
            error_log("DatabaseRepository::addIngredientSet - Set inserted successfully");
            
            foreach ($set->ingredients as $ing) {
                error_log("DatabaseRepository::addIngredientSet - Inserting ingredient: {$ing->name}, Qty={$ing->quantity} {$ing->unit}");
                $ingStmt = $this->db->prepare("
                    INSERT INTO ingredients 
                    (id, ingredient_set_id, inventory_item_id, name, quantity, unit, is_packaged)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $ingStmt->execute([
                    $ing->id,
                    $set->id,
                    $ing->inventoryItemId,
                    $ing->name,
                    $ing->quantity,
                    $ing->unit,
                    $ing->isPackaged ? 1 : 0
                ]);
            }
            error_log("DatabaseRepository::addIngredientSet - All ingredients inserted successfully");
            
            $this->db->commit();
            error_log("DatabaseRepository::addIngredientSet - Transaction committed successfully");
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            error_log("DatabaseRepository::addIngredientSet - Error: " . $e->getMessage());
            error_log("DatabaseRepository::addIngredientSet - Stack trace: " . $e->getTraceAsString());
            throw $e;
        }
    }
    
    public function deleteIngredientSet($id) {
        // Foreign key cascade will delete ingredients
        $stmt = $this->db->prepare("DELETE FROM ingredient_sets WHERE id = ?");
        return $stmt->execute([$id]);
    }
    
    // ============ REQUESTS ============
    
    public function getAllRequests() {
        $stmt = $this->db->query("SELECT * FROM requests ORDER BY date_requested DESC");
        $requests = [];
        while ($row = $stmt->fetch()) {
            $insufficientItems = !empty($row['insufficient_items']) 
                ? json_decode($row['insufficient_items'], true) 
                : [];
            
            $requests[] = new KitchenRequest([
                'id' => $row['id'],
                'kitchenStaffId' => $row['kitchen_staff_id'],
                'ingredientSetId' => $row['ingredient_set_id'],
                'ingredientSetName' => $row['ingredient_set_name'],
                'quantity' => intval($row['quantity']),
                'status' => $row['status'],
                'dateRequested' => $row['date_requested'],
                'dateProcessed' => $row['date_processed'],
                'processedBy' => $row['processed_by'],
                'hasInsufficientInventory' => (bool)$row['has_insufficient_inventory'],
                'insufficientItems' => $insufficientItems,
                'isSingleItem' => (bool)$row['is_single_item'],
                'inventoryItemId' => $row['inventory_item_id'],
                'inventoryItemName' => $row['inventory_item_name'],
                'requestedQuantity' => $row['requested_quantity'] ? floatval($row['requested_quantity']) : 0,
                'requestedUnit' => $row['requested_unit']
            ]);
        }
        return $requests;
    }
    
    public function getRequestById($id) {
        $stmt = $this->db->prepare("SELECT * FROM requests WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) return null;
        
        $insufficientItems = !empty($row['insufficient_items']) 
            ? json_decode($row['insufficient_items'], true) 
            : [];
        
        return new KitchenRequest([
            'id' => $row['id'],
            'kitchenStaffId' => $row['kitchen_staff_id'],
            'ingredientSetId' => $row['ingredient_set_id'],
            'ingredientSetName' => $row['ingredient_set_name'],
            'quantity' => intval($row['quantity']),
            'status' => $row['status'],
            'dateRequested' => $row['date_requested'],
            'dateProcessed' => $row['date_processed'],
            'processedBy' => $row['processed_by'],
            'hasInsufficientInventory' => (bool)$row['has_insufficient_inventory'],
            'insufficientItems' => $insufficientItems,
            'isSingleItem' => (bool)$row['is_single_item'],
            'inventoryItemId' => $row['inventory_item_id'],
            'inventoryItemName' => $row['inventory_item_name'],
            'requestedQuantity' => $row['requested_quantity'] ? floatval($row['requested_quantity']) : 0,
            'requestedUnit' => $row['requested_unit']
        ]);
    }
    
    public function addRequest($request) {
        try {
            error_log("DatabaseRepository::addRequest - Inserting request ID: {$request->id}");
            error_log("  Kitchen Staff ID: " . ($request->kitchenStaffId ?? 'NULL'));
            error_log("  Ingredient Set ID: " . ($request->ingredientSetId ?? 'NULL'));
            error_log("  Ingredient Set Name: " . ($request->ingredientSetName ?? 'NULL'));
            error_log("  Quantity: " . ($request->quantity ?? 'NULL'));
            error_log("  Status: " . ($request->status ?? 'NULL'));
            error_log("  Is Single Item: " . (($request->isSingleItem ?? false) ? '1' : '0'));
            error_log("  Inventory Item ID: " . ($request->inventoryItemId ?? 'NULL'));
            error_log("  Inventory Item Name: " . ($request->inventoryItemName ?? 'NULL'));
            error_log("  Requested Quantity: " . ($request->requestedQuantity ?? 'NULL'));
            error_log("  Requested Unit: " . ($request->requestedUnit ?? 'NULL'));
            
            $stmt = $this->db->prepare("
                INSERT INTO requests 
                (id, kitchen_staff_id, ingredient_set_id, ingredient_set_name, quantity, status, 
                 date_requested, date_processed, processed_by, has_insufficient_inventory, insufficient_items,
                 is_single_item, inventory_item_id, inventory_item_name, requested_quantity, requested_unit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $params = [
                $request->id,
                $request->kitchenStaffId ?? null,
                $request->ingredientSetId ?? null,
                $request->ingredientSetName ?? null,
                $request->quantity ?? 0,
                $request->status ?? 'pending',
                $this->toMySQLDate($request->dateRequested ?? date('c')),
                $this->toMySQLDate($request->dateProcessed ?? null),
                $request->processedBy ?? null,
                ($request->hasInsufficientInventory ?? false) ? 1 : 0,
                json_encode($request->insufficientItems ?? []),
                ($request->isSingleItem ?? false) ? 1 : 0,
                $request->inventoryItemId ?? null,
                $request->inventoryItemName ?? null,
                $request->requestedQuantity ?? null,
                $request->requestedUnit ?? null
            ];
            
            error_log("  Executing INSERT with " . count($params) . " parameters");
            $result = $stmt->execute($params);
            
            if (!$result) {
                $errorInfo = $stmt->errorInfo();
                error_log("CRITICAL: Failed to insert request {$request->id}. Error: " . json_encode($errorInfo));
                error_log("  SQL State: " . ($errorInfo[0] ?? 'N/A'));
                error_log("  Error Code: " . ($errorInfo[1] ?? 'N/A'));
                error_log("  Error Message: " . ($errorInfo[2] ?? 'N/A'));
                return false;
            } else {
                $rowsAffected = $stmt->rowCount();
                error_log("SUCCESS: Request {$request->id} inserted. Rows affected: {$rowsAffected}");
                return true;
            }
        } catch (PDOException $e) {
            error_log("PDO Exception in addRequest for {$request->id}: " . $e->getMessage());
            error_log("  SQL State: " . $e->getCode());
            throw $e;
        } catch (Exception $e) {
            error_log("Exception in addRequest for {$request->id}: " . $e->getMessage());
            throw $e;
        }
    }
    
    public function updateRequest($request) {
        $stmt = $this->db->prepare("
            UPDATE requests 
            SET status = ?, date_processed = ?, processed_by = ?, 
                has_insufficient_inventory = ?, insufficient_items = ?
            WHERE id = ?
        ");
        return $stmt->execute([
            $request->status,
            $this->toMySQLDate($request->dateProcessed),
            $request->processedBy,
            $request->hasInsufficientInventory ? 1 : 0,
            json_encode($request->insufficientItems),
            $request->id
        ]);
    }
    
    public function deleteRequest($id) {
        $stmt = $this->db->prepare("DELETE FROM requests WHERE id = ?");
        return $stmt->execute([$id]);
    }
    
    // ============ AUDIT LOGS ============
    
    public function getAllAuditLogs($limit = 1000) {
        $stmt = $this->db->prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?");
        $stmt->execute([$limit]);
        $logs = [];
        while ($row = $stmt->fetch()) {
            $logs[] = new AuditLog([
                'id' => $row['id'],
                'userId' => $row['user_id'],
                'userRole' => $row['user_role'],
                'action' => $row['action'],
                'details' => $row['details'],
                'timestamp' => $row['timestamp']
            ]);
        }
        return $logs;
    }
    
    public function addAuditLog($log) {
        $stmt = $this->db->prepare("
            INSERT INTO audit_logs (id, user_id, user_role, action, details, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        return $stmt->execute([
            $log->id,
            $log->userId,
            $log->userRole,
            $log->action,
            $log->details,
            $this->toMySQLDate($log->timestamp)
        ]);
    }
    
    // ============ DISPOSALS ============
    
    public function addDisposal($disposal) {
        // Handle both object and array formats
        $id = is_object($disposal) ? $disposal->id : $disposal['id'];
        $inventoryItemId = is_object($disposal) ? $disposal->inventoryItemId : $disposal['inventoryItemId'];
        $itemName = is_object($disposal) ? $disposal->itemName : $disposal['itemName'];
        $quantity = is_object($disposal) ? $disposal->quantity : $disposal['quantity'];
        $unit = is_object($disposal) ? $disposal->unit : $disposal['unit'];
        $reason = is_object($disposal) ? $disposal->reason : $disposal['reason'];
        $notes = (is_object($disposal) ? ($disposal->notes ?? null) : ($disposal['notes'] ?? null));
        $disposedBy = is_object($disposal) ? $disposal->disposedBy : $disposal['disposedBy'];
        $disposedAt = is_object($disposal) ? $disposal->disposedAt : $disposal['disposedAt'];
        
        $stmt = $this->db->prepare("
            INSERT INTO disposals (id, inventory_item_id, item_name, quantity, unit, reason, notes, disposed_by, disposed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        return $stmt->execute([
            $id,
            $inventoryItemId,
            $itemName,
            $quantity,
            $unit,
            $reason,
            $notes,
            $disposedBy,
            $this->toMySQLDate($disposedAt)
        ]);
    }
    
    public function getAllDisposals($limit = 1000) {
        $stmt = $this->db->prepare("SELECT * FROM disposals ORDER BY disposed_at DESC LIMIT ?");
        $stmt->execute([$limit]);
        $disposals = [];
        while ($row = $stmt->fetch()) {
            $disposals[] = [
                'id' => $row['id'],
                'inventoryItemId' => $row['inventory_item_id'],
                'itemName' => $row['item_name'],
                'quantity' => floatval($row['quantity']),
                'unit' => $row['unit'],
                'reason' => $row['reason'],
                'notes' => $row['notes'],
                'disposedBy' => $row['disposed_by'],
                'disposedAt' => $row['disposed_at']
            ];
        }
        return $disposals;
    }
    
    // ============ SESSIONS ============
    
    public function getSession($sessionId) {
        $stmt = $this->db->prepare("SELECT * FROM sessions WHERE session_id = ?");
        $stmt->execute([$sessionId]);
        $row = $stmt->fetch();
        if (!$row || !$row['user_data']) return null;
        
        return json_decode($row['user_data'], true);
    }
    
    public function saveSession($sessionId, $userData) {
        $stmt = $this->db->prepare("
            INSERT INTO sessions (session_id, user_id, user_data, created_at, updated_at)
            VALUES (?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE 
                user_id = VALUES(user_id),
                user_data = VALUES(user_data),
                updated_at = NOW()
        ");
        $userId = $userData ? $userData['id'] : null;
        return $stmt->execute([
            $sessionId,
            $userId,
            json_encode($userData)
        ]);
    }
    
    public function deleteSession($sessionId) {
        $stmt = $this->db->prepare("DELETE FROM sessions WHERE session_id = ?");
        return $stmt->execute([$sessionId]);
    }
    
    // ============ USERS ============
    
    public function getUserByUsername($username) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $row = $stmt->fetch();
        if (!$row) return null;
        
        return [
            'id' => $row['id'],
            'username' => $row['username'],
            'password' => $row['password'],
            'name' => $row['name'],
            'email' => $row['email'],
            'role' => $row['role']
        ];
    }
    
    public function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }
    
    public function getAllUsers() {
        // Check if status column exists, if not use default
        try {
            $stmt = $this->db->prepare("SELECT id, username, name, email, role, COALESCE(status, 'active') as status, last_login, created_at FROM users ORDER BY created_at DESC");
        } catch (Exception $e) {
            // Fallback if status column doesn't exist yet
            $stmt = $this->db->prepare("SELECT id, username, name, email, role, 'active' as status, NULL as last_login, created_at FROM users ORDER BY created_at DESC");
        }
        $stmt->execute();
        $users = [];
        while ($row = $stmt->fetch()) {
            $users[] = [
                'id' => $row['id'],
                'username' => $row['username'],
                'name' => $row['name'],
                'email' => $row['email'],
                'role' => $row['role'],
                'status' => $row['status'] ?? 'active',
                'last_login' => $row['last_login'] ?? null,
                'created_at' => $row['created_at']
            ];
        }
        return $users;
    }
    
    public function getUserById($id) {
        try {
            $stmt = $this->db->prepare("SELECT id, username, name, email, role, COALESCE(status, 'active') as status, last_login, created_at FROM users WHERE id = ?");
        } catch (Exception $e) {
            $stmt = $this->db->prepare("SELECT id, username, name, email, role, 'active' as status, NULL as last_login, created_at FROM users WHERE id = ?");
        }
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) return null;
        
        return [
            'id' => $row['id'],
            'username' => $row['username'],
            'name' => $row['name'],
            'email' => $row['email'],
            'role' => $row['role'],
            'status' => $row['status'] ?? 'active',
            'last_login' => $row['last_login'] ?? null,
            'created_at' => $row['created_at']
        ];
    }
    
    public function createUser($id, $username, $password, $name, $email, $role) {
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        try {
            $stmt = $this->db->prepare("
                INSERT INTO users (id, username, password, name, email, role, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())
            ");
        } catch (Exception $e) {
            $stmt = $this->db->prepare("
                INSERT INTO users (id, username, password, name, email, role, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            ");
        }
        return $stmt->execute([$id, $username, $hashedPassword, $name, $email, $role]);
    }
    
    public function updateUser($id, $username, $name, $email, $role, $updatePassword = false, $password = null, $status = null) {
        if ($updatePassword && $password) {
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            try {
                if ($status !== null) {
                    $stmt = $this->db->prepare("
                        UPDATE users 
                        SET username = ?, name = ?, email = ?, role = ?, password = ?, status = ?
                        WHERE id = ?
                    ");
                    return $stmt->execute([$username, $name, $email, $role, $hashedPassword, $status, $id]);
                } else {
                    $stmt = $this->db->prepare("
                        UPDATE users 
                        SET username = ?, name = ?, email = ?, role = ?, password = ?
                        WHERE id = ?
                    ");
                    return $stmt->execute([$username, $name, $email, $role, $hashedPassword, $id]);
                }
            } catch (Exception $e) {
                $stmt = $this->db->prepare("
                    UPDATE users 
                    SET username = ?, name = ?, email = ?, role = ?, password = ?
                    WHERE id = ?
                ");
                return $stmt->execute([$username, $name, $email, $role, $hashedPassword, $id]);
            }
        } else {
            try {
                if ($status !== null) {
                    $stmt = $this->db->prepare("
                        UPDATE users 
                        SET username = ?, name = ?, email = ?, role = ?, status = ?
                        WHERE id = ?
                    ");
                    return $stmt->execute([$username, $name, $email, $role, $status, $id]);
                } else {
                    $stmt = $this->db->prepare("
                        UPDATE users 
                        SET username = ?, name = ?, email = ?, role = ?
                        WHERE id = ?
                    ");
                    return $stmt->execute([$username, $name, $email, $role, $id]);
                }
            } catch (Exception $e) {
                $stmt = $this->db->prepare("
                    UPDATE users 
                    SET username = ?, name = ?, email = ?, role = ?
                    WHERE id = ?
                ");
                return $stmt->execute([$username, $name, $email, $role, $id]);
            }
        }
    }
    
    public function resetUserPassword($id, $newPassword) {
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare("UPDATE users SET password = ? WHERE id = ?");
        return $stmt->execute([$hashedPassword, $id]);
    }
    
    public function updateUserStatus($id, $status) {
        try {
            $stmt = $this->db->prepare("UPDATE users SET status = ? WHERE id = ?");
            return $stmt->execute([$status, $id]);
        } catch (Exception $e) {
            // Column might not exist, return false
            return false;
        }
    }
    
    public function updateLastLogin($id) {
        try {
            $stmt = $this->db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
            return $stmt->execute([$id]);
        } catch (Exception $e) {
            // Column might not exist, ignore
            return true;
        }
    }
    
    public function deleteUser($id) {
        $stmt = $this->db->prepare("DELETE FROM users WHERE id = ?");
        return $stmt->execute([$id]);
    }
    
    // ============ PASSWORD VERIFICATION CODES ============
    
    public function createVerificationCode($userId, $email, $code) {
        // Clean up expired codes first
        $this->cleanupExpiredCodes();
        
        // Invalidate any existing unused codes for this user
        $this->invalidateUserCodes($userId);
        
        // Ensure code is exactly 6 digits, no spaces
        $code = trim($code);
        $code = preg_replace('/[^0-9]/', '', $code); // Remove non-numeric characters
        if (strlen($code) !== 6) {
            error_log("Invalid code format for creation: $code (length: " . strlen($code) . ")");
            return false;
        }
        
        // Create new code (expires in 15 minutes to give more buffer)
        // Use MySQL time to ensure consistency with database
        $id = uniqid('code-', true);
        
        // Get MySQL time to ensure consistency
        $timeStmt = $this->db->query("SELECT DATE_ADD(NOW(), INTERVAL 15 MINUTE) as expires_at, NOW() as created_at");
        $timeRow = $timeStmt->fetch(PDO::FETCH_ASSOC);
        $expiresAt = $timeRow['expires_at'];
        $createdAt = $timeRow['created_at'];
        
        error_log("Creating code: $code, Created at: $createdAt, Expires at: $expiresAt");
        
        try {
            // Check if table exists, create if not
            $checkTable = $this->db->query("SHOW TABLES LIKE 'password_verification_codes'");
            if ($checkTable->rowCount() === 0) {
                error_log("password_verification_codes table does not exist, attempting to create...");
                $this->createVerificationCodesTable();
            }
            
            $stmt = $this->db->prepare("
                INSERT INTO password_verification_codes (id, user_id, code, email, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ");
            $result = $stmt->execute([$id, $userId, $code, $email, $expiresAt]);
            
            if ($result) {
                error_log("Verification code created successfully: User=$userId, Code=$code, Expires=$expiresAt");
            } else {
                error_log("Failed to create verification code: User=$userId, Code=$code");
            }
            
            return $result;
        } catch (Exception $e) {
            error_log("Error creating verification code: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return false;
        }
    }
    
    private function createVerificationCodesTable() {
        try {
            $sql = "
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
                    INDEX idx_expires_at (expires_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ";
            $this->db->exec($sql);
            error_log("password_verification_codes table created successfully");
            return true;
        } catch (Exception $e) {
            error_log("Error creating password_verification_codes table: " . $e->getMessage());
            return false;
        }
    }
    
    public function verifyCode($userId, $code) {
        try {
            // Trim and ensure code is exactly 6 digits
            $code = trim($code);
            $code = preg_replace('/[^0-9]/', '', $code); // Remove non-numeric characters
            
            if (strlen($code) !== 6) {
                error_log("Invalid code format: length is " . strlen($code) . ", expected 6");
                return false;
            }
            
            // Check if table exists first
            $checkTable = $this->db->query("SHOW TABLES LIKE 'password_verification_codes'");
            if ($checkTable->rowCount() === 0) {
                error_log("password_verification_codes table does not exist");
                return false;
            }
            
            // Get the code without expiration check first to debug
            $stmt = $this->db->prepare("
                SELECT *, 
                       TIMESTAMPDIFF(SECOND, NOW(), expires_at) as mysql_seconds_remaining,
                       expires_at,
                       created_at,
                       used
                FROM password_verification_codes 
                WHERE user_id = ? AND code = ? AND used = 0
                ORDER BY created_at DESC
                LIMIT 1
            ");
            $stmt->execute([$userId, $code]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($row) {
                // Get current MySQL time for comparison
                $timeStmt = $this->db->query("SELECT NOW() as mysql_now, UNIX_TIMESTAMP(NOW()) as mysql_timestamp");
                $timeRow = $timeStmt->fetch(PDO::FETCH_ASSOC);
                $mysqlNow = $timeRow['mysql_now'];
                $mysqlTimestamp = $timeRow['mysql_timestamp'];
                
                // Convert expires_at to timestamp
                $expiresTimestamp = strtotime($row['expires_at']);
                $phpNow = time();
                $phpSecondsRemaining = $expiresTimestamp - $phpNow;
                $mysqlSecondsRemaining = $row['mysql_seconds_remaining'];
                
                error_log("=== Code Verification Debug ===");
                error_log("Code: {$row['code']}");
                error_log("Expires at (DB): {$row['expires_at']}");
                error_log("MySQL NOW(): $mysqlNow");
                error_log("PHP time(): " . date('Y-m-d H:i:s', $phpNow));
                error_log("MySQL seconds remaining: $mysqlSecondsRemaining");
                error_log("PHP seconds remaining: $phpSecondsRemaining");
                error_log("Expires timestamp: $expiresTimestamp");
                error_log("PHP timestamp: $phpNow");
                
                // Use PHP comparison but allow small buffer (30 seconds) for clock skew
                if ($phpSecondsRemaining > -30) { // Allow 30 second buffer for clock differences
                    // Code is still valid - DON'T mark as used yet, only mark when password is changed
                    error_log("✓ Code verified successfully for user: $userId (not marking as used yet)");
                    return true;
                } else {
                    error_log("✗ Code expired. PHP seconds remaining: $phpSecondsRemaining");
                    return false;
                }
            } else {
                // Debug: Check what codes exist for this user
                $debugStmt = $this->db->prepare("
                    SELECT code, used, expires_at, created_at, NOW() as current_time,
                           TIMESTAMPDIFF(SECOND, NOW(), expires_at) as seconds_remaining
                    FROM password_verification_codes 
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    LIMIT 5
                ");
                $debugStmt->execute([$userId]);
                $debugRows = $debugStmt->fetchAll(PDO::FETCH_ASSOC);
                error_log("Code not found. Looking for code: $code, User: $userId");
                error_log("Available codes: " . json_encode($debugRows));
                return false;
            }
        } catch (Exception $e) {
            error_log("Error verifying code: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return false;
        }
    }
    
    private function cleanupExpiredCodes() {
        try {
            $stmt = $this->db->prepare("
                DELETE FROM password_verification_codes 
                WHERE expires_at < NOW() OR used = 1
            ");
            $stmt->execute();
        } catch (Exception $e) {
            // Table might not exist, ignore
        }
    }
    
    private function invalidateUserCodes($userId) {
        try {
            $stmt = $this->db->prepare("
                UPDATE password_verification_codes 
                SET used = 1 
                WHERE user_id = ? AND used = 0
            ");
            $stmt->execute([$userId]);
        } catch (Exception $e) {
            // Table might not exist, ignore
        }
    }
    
    public function changeUserPassword($userId, $newPassword) {
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare("UPDATE users SET password = ? WHERE id = ?");
        $result = $stmt->execute([$hashedPassword, $userId]);
        
        // Mark all verification codes for this user as used after successful password change
        if ($result) {
            try {
                $updateStmt = $this->db->prepare("
                    UPDATE password_verification_codes 
                    SET used = 1 
                    WHERE user_id = ? AND used = 0
                ");
                $updateStmt->execute([$userId]);
                error_log("Marked all verification codes as used for user: $userId");
            } catch (Exception $e) {
                // Ignore if table doesn't exist
                error_log("Note: Could not mark codes as used: " . $e->getMessage());
            }
        }
        
        return $result;
    }
    
    public function checkUsernameExists($username, $excludeId = null) {
        if ($excludeId) {
            $stmt = $this->db->prepare("SELECT COUNT(*) as count FROM users WHERE username = ? AND id != ?");
            $stmt->execute([$username, $excludeId]);
        } else {
            $stmt = $this->db->prepare("SELECT COUNT(*) as count FROM users WHERE username = ?");
            $stmt->execute([$username]);
        }
        $row = $stmt->fetch();
        return $row['count'] > 0;
    }
    
    // ============ SYSTEM CONFIG ============
    
    public function getSystemConfig($key = null) {
        if ($key) {
            try {
                $stmt = $this->db->prepare("SELECT config_key, config_value FROM system_config WHERE config_key = ?");
                $stmt->execute([$key]);
                $row = $stmt->fetch();
                return $row ? $row['config_value'] : null;
            } catch (Exception $e) {
                return null;
            }
        } else {
            try {
                $stmt = $this->db->prepare("SELECT config_key, config_value, description FROM system_config");
                $stmt->execute();
                $config = [];
                while ($row = $stmt->fetch()) {
                    $config[$row['config_key']] = [
                        'value' => $row['config_value'],
                        'description' => $row['description']
                    ];
                }
                return $config;
            } catch (Exception $e) {
                return [];
            }
        }
    }
    
    public function setSystemConfig($key, $value) {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO system_config (id, config_key, config_value, updated_at)
                VALUES (?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE config_value = ?, updated_at = NOW()
            ");
            $id = 'config-' . md5($key);
            return $stmt->execute([$id, $key, $value, $value]);
        } catch (Exception $e) {
            error_log("Error setting system config: " . $e->getMessage());
            return false;
        }
    }
}
