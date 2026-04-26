// Conversion factors to base units (kg for weight, L for volume)
const WEIGHT_CONVERSIONS = {
  kg: 1,
  g: 0.001
};

const VOLUME_CONVERSIONS = {
  L: 1,
  ml: 0.001
};

function getUnitCategory(unit) {
  if (unit === 'kg' || unit === 'g') return 'weight';
  if (unit === 'L' || unit === 'ml') return 'volume';
  if (unit === 'pcs') return 'count';
  return 'container'; // sack, box, pack, bottle, can
}

function canConvertUnits(fromUnit, toUnit) {
  const fromCategory = getUnitCategory(fromUnit);
  const toCategory = getUnitCategory(toUnit);
  return fromCategory === toCategory && fromCategory !== 'container';
}

function convertQuantity(quantity, fromUnit, toUnit) {
  if (fromUnit === toUnit) return quantity;
  const category = getUnitCategory(fromUnit);
  if (category === 'weight') {
    const baseQuantity = quantity * WEIGHT_CONVERSIONS[fromUnit];
    return baseQuantity / WEIGHT_CONVERSIONS[toUnit];
  }
  if (category === 'volume') {
    const baseQuantity = quantity * VOLUME_CONVERSIONS[fromUnit];
    return baseQuantity / VOLUME_CONVERSIONS[toUnit];
  }
  // Can't convert count or container units
  return quantity;
}

function formatQuantityWithUnit(quantity, unit) {
  // Format with appropriate decimal places
  if (quantity >= 1000) {
    return `${quantity.toLocaleString()} ${unit}`;
  }
  if (quantity >= 1) {
    return `${quantity.toFixed(2)} ${unit}`.replace(/\.00$/, '');
  }
  return `${quantity.toFixed(3)} ${unit}`.replace(/\.000$/, '');
}

function getCompatibleUnits(unit) {
  const category = getUnitCategory(unit);
  if (category === 'weight') return ['kg', 'g'];
  if (category === 'volume') return ['L', 'ml'];
  if (category === 'count') return ['pcs'];
  // Container units can't be converted
  return [unit];
}
