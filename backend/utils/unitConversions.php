<?php

require_once __DIR__ . '/../types.php';

class UnitConversions {
    private static $WEIGHT_CONVERSIONS = [
        'kg' => 1,
        'g' => 0.001
    ];

    private static $VOLUME_CONVERSIONS = [
        'L' => 1,
        'ml' => 0.001
    ];

    public static function getUnitCategory($unit) {
        if ($unit === Unit::KG || $unit === Unit::G) {
            return 'weight';
        }
        if ($unit === Unit::L || $unit === Unit::ML) {
            return 'volume';
        }
        if ($unit === Unit::PCS) {
            return 'count';
        }
        return 'container'; // sack, box, pack, bottle, can
    }

    public static function canConvertUnits($fromUnit, $toUnit) {
        $fromCategory = self::getUnitCategory($fromUnit);
        $toCategory = self::getUnitCategory($toUnit);
        return $fromCategory === $toCategory && $fromCategory !== 'container';
    }

    public static function convertQuantity($quantity, $fromUnit, $toUnit) {
        if ($fromUnit === $toUnit) {
            return $quantity;
        }

        $category = self::getUnitCategory($fromUnit);

        if ($category === 'weight') {
            $baseQuantity = $quantity * self::$WEIGHT_CONVERSIONS[$fromUnit];
            return $baseQuantity / self::$WEIGHT_CONVERSIONS[$toUnit];
        }

        if ($category === 'volume') {
            $baseQuantity = $quantity * self::$VOLUME_CONVERSIONS[$fromUnit];
            return $baseQuantity / self::$VOLUME_CONVERSIONS[$toUnit];
        }

        // Can't convert count or container units
        return $quantity;
    }

    public static function formatQuantityWithUnit($quantity, $unit) {
        // Format with appropriate decimal places
        if ($quantity >= 1000) {
            return number_format($quantity) . ' ' . $unit;
        }
        if ($quantity >= 1) {
            $formatted = number_format($quantity, 2, '.', '');
            $formatted = rtrim($formatted, '0');
            $formatted = rtrim($formatted, '.');
            return $formatted . ' ' . $unit;
        }
        $formatted = number_format($quantity, 3, '.', '');
        $formatted = rtrim($formatted, '0');
        $formatted = rtrim($formatted, '.');
        return $formatted . ' ' . $unit;
    }

    public static function getCompatibleUnits($unit) {
        $category = self::getUnitCategory($unit);
        if ($category === 'weight') {
            return [Unit::KG, Unit::G];
        }
        if ($category === 'volume') {
            return [Unit::L, Unit::ML];
        }
        if ($category === 'count') {
            return [Unit::PCS];
        }
        // Container units can't be converted
        return [$unit];
    }
}
