<?php

class UserRole {
    const PURCHASER = 'purchaser';
    const STOCK_HANDLER = 'stock_handler';
    const KITCHEN_STAFF = 'kitchen_staff';
    const ADMIN = 'admin';
}

class Unit {
    const KG = 'kg';
    const G = 'g';
    const L = 'L';
    const ML = 'ml';
    const PCS = 'pcs';
    const SACK = 'sack';
    const BOX = 'box';
    const PACK = 'pack';
    const BOTTLE = 'bottle';
    const CAN = 'can';
}

class User {
    public $id;
    public $name;
    public $role;
    public $email;

    public function __construct($id, $name, $role, $email) {
        $this->id = $id;
        $this->name = $name;
        $this->role = $role;
        $this->email = $email;
    }

    public function toArray() {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'role' => $this->role,
            'email' => $this->email
        ];
    }
}

class InventoryItem {
    public $id;
    public $name;
    public $quantity;
    public $unit;
    public $minStockLevel;
    public $pricePerUnit;
    public $category;
    public $lastUpdated;

    public function __construct($data) {
        $this->id = $data['id'] ?? null;
        $this->name = $data['name'] ?? '';
        $this->quantity = $data['quantity'] ?? 0;
        $this->unit = $data['unit'] ?? Unit::KG;
        $this->minStockLevel = $data['minStockLevel'] ?? 0;
        $this->pricePerUnit = $data['pricePerUnit'] ?? 0;
        $this->category = $data['category'] ?? '';
        $this->lastUpdated = $data['lastUpdated'] ?? date('c');
    }

    public function toArray() {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'quantity' => $this->quantity,
            'unit' => $this->unit,
            'minStockLevel' => $this->minStockLevel,
            'pricePerUnit' => $this->pricePerUnit,
            'category' => $this->category,
            'lastUpdated' => $this->lastUpdated
        ];
    }
}

class PackagedItem {
    public $id;
    public $rawInventoryItemId;
    public $rawItemName;
    public $category;
    public $totalRawQuantityUsed;
    public $rawUnit;
    public $packSize;
    public $packUnit;
    public $numberOfPacks;
    public $packagingDate;
    public $packagedBy;

    public function __construct($data) {
        $this->id = $data['id'] ?? null;
        $this->rawInventoryItemId = $data['rawInventoryItemId'] ?? '';
        $this->rawItemName = $data['rawItemName'] ?? '';
        $this->category = $data['category'] ?? '';
        $this->totalRawQuantityUsed = $data['totalRawQuantityUsed'] ?? 0;
        $this->rawUnit = $data['rawUnit'] ?? Unit::KG;
        $this->packSize = $data['packSize'] ?? 0;
        $this->packUnit = $data['packUnit'] ?? Unit::KG;
        $this->numberOfPacks = $data['numberOfPacks'] ?? 0;
        $this->packagingDate = $data['packagingDate'] ?? date('c');
        $this->packagedBy = $data['packagedBy'] ?? '';
    }

    public function toArray() {
        return [
            'id' => $this->id,
            'rawInventoryItemId' => $this->rawInventoryItemId,
            'rawItemName' => $this->rawItemName,
            'category' => $this->category,
            'totalRawQuantityUsed' => $this->totalRawQuantityUsed,
            'rawUnit' => $this->rawUnit,
            'packSize' => $this->packSize,
            'packUnit' => $this->packUnit,
            'numberOfPacks' => $this->numberOfPacks,
            'packagingDate' => $this->packagingDate,
            'packagedBy' => $this->packagedBy
        ];
    }
}

class PurchaseOrder {
    public $id;
    public $batchId;
    public $purchaserId;
    public $itemName;
    public $brandName;
    public $category;
    public $supplier;
    public $purchaseType;
    public $expiryDate;
    public $paymentStatus;
    public $quantity;
    public $displayUnit;
    public $baseUnit;
    public $conversionRatio;
    public $price;
    public $status;
    public $dateCreated;
    public $dateDelivered;
    public $receiptPath;

    public function __construct($data) {
        $this->id = $data['id'] ?? null;
        $this->batchId = $data['batchId'] ?? null;
        $this->purchaserId = $data['purchaserId'] ?? '';
        $this->itemName = $data['itemName'] ?? '';
        $this->brandName = $data['brandName'] ?? '';
        $this->category = $data['category'] ?? '';
        $this->supplier = $data['supplier'] ?? '';
        $this->purchaseType = $data['purchaseType'] ?? 'delivery';
        $this->expiryDate = $data['expiryDate'] ?? null;
        $this->paymentStatus = $data['paymentStatus'] ?? 'paid';
        $this->quantity = $data['quantity'] ?? 0;
        $this->displayUnit = $data['displayUnit'] ?? Unit::KG;
        $this->baseUnit = $data['baseUnit'] ?? Unit::KG;
        $this->conversionRatio = $data['conversionRatio'] ?? 1;
        $this->price = $data['price'] ?? 0;
        $this->status = $data['status'] ?? 'pending';
        $this->dateCreated = $data['dateCreated'] ?? date('c');
        $this->dateDelivered = $data['dateDelivered'] ?? null;
        $this->receiptPath = $data['receiptPath'] ?? null;
    }

    public function toArray() {
        return [
            'id' => $this->id,
            'batchId' => $this->batchId,
            'purchaserId' => $this->purchaserId,
            'itemName' => $this->itemName,
            'brandName' => $this->brandName,
            'category' => $this->category,
            'supplier' => $this->supplier,
            'purchaseType' => $this->purchaseType,
            'expiryDate' => $this->expiryDate,
            'paymentStatus' => $this->paymentStatus,
            'quantity' => $this->quantity,
            'displayUnit' => $this->displayUnit,
            'baseUnit' => $this->baseUnit,
            'conversionRatio' => $this->conversionRatio,
            'price' => $this->price,
            'status' => $this->status,
            'dateCreated' => $this->dateCreated,
            'dateDelivered' => $this->dateDelivered,
            'receiptPath' => $this->receiptPath
        ];
    }
}

class Ingredient {
    public $id;
    public $inventoryItemId;
    public $name;
    public $quantity;
    public $unit;
    public $isPackaged;

    public function __construct($data) {
        $this->id = $data['id'] ?? '';
        $this->inventoryItemId = $data['inventoryItemId'] ?? '';
        $this->name = $data['name'] ?? '';
        $this->quantity = $data['quantity'] ?? 0;
        $this->unit = $data['unit'] ?? Unit::KG;
        $this->isPackaged = $data['isPackaged'] ?? false;
    }

    public function toArray() {
        return [
            'id' => $this->id,
            'inventoryItemId' => $this->inventoryItemId,
            'name' => $this->name,
            'quantity' => $this->quantity,
            'unit' => $this->unit,
            'isPackaged' => $this->isPackaged
        ];
    }
}

class IngredientSet {
    public $id;
    public $name;
    public $description;
    public $imagePath;
    public $ingredients;
    public $createdBy;
    public $createdAt;

    public function __construct($data) {
        $this->id = $data['id'] ?? null;
        $this->name = $data['name'] ?? '';
        $this->description = $data['description'] ?? '';
        $this->imagePath = $data['imagePath'] ?? null;
        $this->createdBy = $data['createdBy'] ?? '';
        $this->createdAt = $data['createdAt'] ?? date('c');
        $this->ingredients = [];
        if (isset($data['ingredients'])) {
            foreach ($data['ingredients'] as $ing) {
                $this->ingredients[] = new Ingredient($ing);
            }
        }
    }

    public function toArray() {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'imagePath' => $this->imagePath,
            'ingredients' => array_map(function($ing) { return $ing->toArray(); }, $this->ingredients),
            'createdBy' => $this->createdBy,
            'createdAt' => $this->createdAt
        ];
    }
}

class KitchenRequest {
    public $id;
    public $kitchenStaffId;
    public $ingredientSetId;
    public $ingredientSetName;
    public $quantity;
    public $status;
    public $dateRequested;
    public $dateProcessed;
    public $processedBy;
    public $hasInsufficientInventory;
    public $insufficientItems;
    // Single item request fields
    public $isSingleItem;
    public $inventoryItemId;
    public $inventoryItemName;
    public $requestedQuantity;
    public $requestedUnit;

    public function __construct($data) {
        $this->id = $data['id'] ?? null;
        $this->kitchenStaffId = $data['kitchenStaffId'] ?? '';
        $this->ingredientSetId = $data['ingredientSetId'] ?? '';
        $this->ingredientSetName = $data['ingredientSetName'] ?? '';
        $this->quantity = $data['quantity'] ?? 0;
        $this->status = $data['status'] ?? 'pending';
        $this->dateRequested = $data['dateRequested'] ?? date('c');
        $this->dateProcessed = $data['dateProcessed'] ?? null;
        $this->processedBy = $data['processedBy'] ?? null;
        $this->hasInsufficientInventory = $data['hasInsufficientInventory'] ?? false;
        $this->insufficientItems = $data['insufficientItems'] ?? [];
        // Single item request fields
        $this->isSingleItem = $data['isSingleItem'] ?? false;
        $this->inventoryItemId = $data['inventoryItemId'] ?? null;
        $this->inventoryItemName = $data['inventoryItemName'] ?? '';
        $this->requestedQuantity = $data['requestedQuantity'] ?? 0;
        $this->requestedUnit = $data['requestedUnit'] ?? '';
    }

    public function toArray() {
        return [
            'id' => $this->id,
            'kitchenStaffId' => $this->kitchenStaffId,
            'ingredientSetId' => $this->ingredientSetId,
            'ingredientSetName' => $this->ingredientSetName,
            'quantity' => $this->quantity,
            'status' => $this->status,
            'dateRequested' => $this->dateRequested,
            'dateProcessed' => $this->dateProcessed,
            'processedBy' => $this->processedBy,
            'hasInsufficientInventory' => $this->hasInsufficientInventory,
            'insufficientItems' => $this->insufficientItems,
            'isSingleItem' => $this->isSingleItem,
            'inventoryItemId' => $this->inventoryItemId,
            'inventoryItemName' => $this->inventoryItemName,
            'requestedQuantity' => $this->requestedQuantity,
            'requestedUnit' => $this->requestedUnit
        ];
    }
}

class AuditLog {
    public $id;
    public $userId;
    public $userRole;
    public $action;
    public $details;
    public $timestamp;

    public function __construct($data) {
        $this->id = $data['id'] ?? null;
        $this->userId = $data['userId'] ?? '';
        $this->userRole = $data['userRole'] ?? '';
        $this->action = $data['action'] ?? '';
        $this->details = $data['details'] ?? '';
        $this->timestamp = $data['timestamp'] ?? date('c');
    }

    public function toArray() {
        return [
            'id' => $this->id,
            'userId' => $this->userId,
            'userRole' => $this->userRole,
            'action' => $this->action,
            'details' => $this->details,
            'timestamp' => $this->timestamp
        ];
    }
}
