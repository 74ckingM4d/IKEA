// Helper function to format expiry date and calculate status
function formatExpiryDate(expiryDate) {
  if (!expiryDate) {
    return {
      display: '<div class="text-sm text-gray-400">N/A</div>',
      status: null
    };
  }
  
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Format: Month Day/(remaining days)
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[expiry.getMonth()];
  const day = expiry.getDate();
  
  let emoji, status, statusClass;
  if (diffDays > 7) {
    emoji = '🟢';
    status = 'OK';
    statusClass = 'text-green-700';
  } else if (diffDays >= 1 && diffDays <= 7) {
    emoji = '🟡';
    status = 'NEAR EXPIRY';
    statusClass = 'text-yellow-700';
  } else {
    emoji = '🔴';
    status = 'EXPIRED';
    statusClass = 'text-red-700';
  }
  
  return {
    display: `
      <div class="text-sm text-gray-900">${monthName} ${day}</div>
      <div class="text-xs ${statusClass} font-medium">${emoji} ${status}</div>
    `,
    status: status
  };
}

function getMatchingPurchasesForItem(item, purchases) {
  const matchingPurchases = purchases.filter(p =>
    p.status === 'completed' &&
    p.itemName === item.name &&
    p.baseUnit === item.unit
  );
  matchingPurchases.sort((a, b) => {
    const dateA = a.dateDelivered ? new Date(a.dateDelivered) : new Date(0);
    const dateB = b.dateDelivered ? new Date(b.dateDelivered) : new Date(0);
    return dateB - dateA;
  });
  return matchingPurchases;
}

function getRawItemSupplier(item, purchases) {
  const matchingPurchases = getMatchingPurchasesForItem(item, purchases);
  return matchingPurchases.length > 0 && matchingPurchases[0].supplier
    ? matchingPurchases[0].supplier
    : 'N/A';
}

function bindInventorySearchInput() {
  const input = document.getElementById('inventorySearchInput');
  if (!input || input.dataset.boundInventorySearch) return;
  input.dataset.boundInventorySearch = '1';
  input.addEventListener('input', () => renderInventory());
}

// Inventory page initialization
async function initPage() {
  await loadState();
  bindInventorySearchInput();
  renderInventory();
  subscribeState(() => renderInventory());
}

function renderInventory() {
  if (!isAuthenticated()) {
    window.location.href = 'login.php';
    return;
  }

  updateUserInfo();
  updateNavigation();
  updatePageTitle();

  const state = getAppState();
  const container = document.getElementById('inventoryContainer');
  if (!container) return;

  const inventory = state.inventory || [];
  const purchases = state.purchases || [];

  const toolbar = document.getElementById('inventorySearchToolbar');
  const searchInput = document.getElementById('inventorySearchInput');
  if (toolbar) {
    if (isStockHandler() && inventory.length > 0) {
      toolbar.classList.remove('hidden');
    } else {
      toolbar.classList.add('hidden');
    }
  }

  const searchTerm = isStockHandler()
    ? (searchInput?.value || '').trim().toLowerCase()
    : '';

  let itemsToShow = inventory;
  if (searchTerm) {
    itemsToShow = inventory.filter(item => {
      const supplier = getRawItemSupplier(item, purchases).toLowerCase();
      const name = (item.name || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();
      const unit = (item.unit || '').toLowerCase();
      return (
        name.includes(searchTerm) ||
        cat.includes(searchTerm) ||
        supplier.includes(searchTerm) ||
        unit.includes(searchTerm)
      );
    });
  }

  let html = '';

  // Raw Inventory Section
  if (inventory.length > 0) {
    if (itemsToShow.length === 0) {
      html += `
      <div class="mb-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Raw Inventory</h2>
        </div>
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-gray-500 text-sm">
          No items match your search.
        </div>
      </div>`;
    } else {
    html += `
      <div class="mb-6">
        <div class="flex justify-between items-center mb-4">
        </div>
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Re-order Level</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                ${isStockHandler() ? '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>' : ''}
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${itemsToShow.map(item => {
                const isLowStock = item.quantity < item.minStockLevel;
                const isZeroStock = item.quantity <= 0;
                const statusClass = isLowStock ? 'text-red-600 font-medium' : 'text-gray-900';
                // Determine unit color based on stock status
                let unitColorClass = 'text-green-600 font-semibold'; // Default: green
                if (isZeroStock) {
                  unitColorClass = 'text-red-600 font-semibold'; // Zero stock: red
                } else if (isLowStock) {
                  unitColorClass = 'text-orange-600 font-semibold'; // Low stock: orange
                }
                
                const matchingPurchases = getMatchingPurchasesForItem(item, purchases);
                
                // Use the most recent purchase price, or fallback to calculated value
                const totalPrice = matchingPurchases.length > 0 
                  ? matchingPurchases[0].price 
                  : (item.pricePerUnit * item.quantity);
                
                const supplier = getRawItemSupplier(item, purchases);
                
                // Get expiry date from the most recent purchase
                const expiryDate = matchingPurchases.length > 0 && matchingPurchases[0].expiryDate
                  ? matchingPurchases[0].expiryDate
                  : null;
                const expiryInfo = formatExpiryDate(expiryDate);
                
                return `
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm font-medium ${statusClass}">${item.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900"><span class="font-semibold">${item.quantity.toFixed(2)}</span> <span class="${unitColorClass}">${item.unit}</span></div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-500">${item.minStockLevel} ${item.unit}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-500">${item.category}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-500">${supplier}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      ${expiryInfo.display}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">${formatCurrency(totalPrice)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      ${isLowStock ? '<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">Low Stock</span>' : '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">OK</span>'}
                    </td>
                    ${isStockHandler() ? `
                      <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex gap-2">
                          <button onclick="showEditInventoryForm('${item.id}')" class="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors" title="Edit">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                          </button>
                          <button onclick="showCreatePackageForm('${item.id}')" class="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors" title="Package">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                            </svg>
                          </button>
                          <button onclick="showDisposalModal('${item.id}', '${escapeHtml(item.name)}')" class="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors" title="Dispose">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    ` : ''}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    }
  }

  if (inventory.length === 0) {
    html = '<p class="text-gray-500 text-center py-12">No raw inventory items yet. Create a purchase order to add items.</p>';
  }

  container.innerHTML = html;
}

function getPackUnitOptions(rawUnit) {
  // Determine unit category and provide appropriate options
  const weightUnits = ['kg', 'g'];
  const volumeUnits = ['L', 'ml'];
  const countUnits = ['pcs'];
  
  // Check if raw unit is weight
  if (weightUnits.includes(rawUnit)) {
    const defaultUnit = rawUnit === 'kg' ? 'kg' : 'g';
    return `
      <option value="kg" ${defaultUnit === 'kg' ? 'selected' : ''}>kg (Kilograms)</option>
      <option value="g" ${defaultUnit === 'g' ? 'selected' : ''}>g (Grams)</option>
    `;
  }
  
  // Check if raw unit is volume
  if (volumeUnits.includes(rawUnit)) {
    const defaultUnit = rawUnit === 'L' ? 'L' : 'ml';
    return `
      <option value="L" ${defaultUnit === 'L' ? 'selected' : ''}>L (Liters)</option>
      <option value="ml" ${defaultUnit === 'ml' ? 'selected' : ''}>ml (Milliliters)</option>
    `;
  }
  
  // Check if raw unit is count
  if (countUnits.includes(rawUnit)) {
    return `
      <option value="pcs" selected>pcs (Pieces)</option>
    `;
  }
  
  // Default: show all common units
  return `
    <option value="kg" ${rawUnit === 'kg' ? 'selected' : ''}>kg (Kilograms)</option>
    <option value="g" ${rawUnit === 'g' ? 'selected' : ''}>g (Grams)</option>
    <option value="L" ${rawUnit === 'L' ? 'selected' : ''}>L (Liters)</option>
    <option value="ml" ${rawUnit === 'ml' ? 'selected' : ''}>ml (Milliliters)</option>
    <option value="pcs" ${rawUnit === 'pcs' ? 'selected' : ''}>pcs (Pieces)</option>
  `;
}

function showCreatePackageForm(rawItemId) {
  const state = getAppState();
  const rawItem = state.inventory.find(i => i.id === rawItemId);
  
  if (!rawItem) {
    showAlertModal('Error', 'Item not found', 'error');
    return;
  }

  // Calculate packaging statistics
  const totalRawStock = rawItem.quantity;
  
  // Sum up all packaged quantities for this raw item
  // Note: Packaged items store totalRawQuantityUsed in the raw item's unit
  const packagedItems = state.packagedItems || [];
  let alreadyPackaged = 0;
  
  packagedItems.forEach(pkg => {
    if (pkg.rawInventoryItemId === rawItemId) {
      alreadyPackaged += pkg.totalRawQuantityUsed || 0;
    }
  });
  
  const availableToPackage = Math.max(0, totalRawStock - alreadyPackaged);

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 overflow-y-auto';
  modal.innerHTML = `
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onclick="closeModal()"></div>
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="mb-4">
            <h3 class="text-lg font-medium text-gray-900 mb-1">Create Package</h3>
            <p class="text-sm text-gray-500">Package ${rawItem.name} from raw inventory</p>
          </div>
          <form onsubmit="submitPackage(event, '${rawItemId}')" id="packageForm">
            <div class="space-y-4">
              <!-- Packaging Statistics Boxes -->
              <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p class="text-xs font-medium text-blue-700 mb-1">Total Raw Stock</p>
                  <p class="text-lg font-semibold text-blue-900">${totalRawStock.toFixed(2)} ${rawItem.unit}</p>
                </div>
                <div class="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p class="text-xs font-medium text-orange-700 mb-1">Already Packaged</p>
                  <p class="text-lg font-semibold text-orange-900">${alreadyPackaged.toFixed(2)} ${rawItem.unit}</p>
                </div>
                <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p class="text-xs font-medium text-green-700 mb-1">Available to Package</p>
                  <p class="text-lg font-semibold text-green-900">${availableToPackage.toFixed(2)} ${rawItem.unit}</p>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Total Raw Quantity to Package</label>
                <input type="number" id="packageTotalQty" step="0.01" required min="0.01" placeholder="0.00" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <p class="mt-1 text-xs text-gray-500">Enter the quantity to package (connected to raw inventory: ${rawItem.quantity.toFixed(2)} ${rawItem.unit})</p>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Pack Size</label>
                  <input type="number" id="packageSize" step="0.01" required min="0.01" placeholder="0.00" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                  <p class="mt-1 text-xs text-gray-500">Size per pack</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Pack Unit</label>
                  <select id="packageUnit" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    ${getPackUnitOptions(rawItem.unit)}
                  </select>
                  <p class="mt-1 text-xs text-gray-500">Unit for pack size</p>
                </div>
              </div>
              <div id="packagePreview" class="hidden p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p class="text-sm font-medium text-gray-700 mb-2">Preview</p>
                <div class="space-y-1 text-sm text-gray-600">
                  <p id="packagePreviewText"></p>
                  <p id="packagePreviewDetails" class="text-xs text-gray-500"></p>
                </div>
              </div>
            </div>
            <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
              <button type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm">
                Create Package
              </button>
              <button type="button" onclick="closeModal()" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  window.currentModal = modal;
  
  // Add preview calculation with better logic
  const totalQtyInput = document.getElementById('packageTotalQty');
  const packSizeInput = document.getElementById('packageSize');
  const packUnitInput = document.getElementById('packageUnit');
  const preview = document.getElementById('packagePreview');
  const previewText = document.getElementById('packagePreviewText');
  const previewDetails = document.getElementById('packagePreviewDetails');
  
  function updatePreview() {
    const totalQty = parseFloat(totalQtyInput.value) || 0;
    const packSize = parseFloat(packSizeInput.value) || 0;
    const packUnit = packUnitInput.value;
    
    if (totalQty > 0 && packSize > 0 && packUnit) {
      const numPacks = totalQty / packSize;
      
      preview.classList.remove('hidden');
      previewText.innerHTML = `
        <span class="font-medium">${numPacks.toFixed(2)}</span> packs of <span class="font-medium">${packSize}</span> <span class="font-medium">${packUnit}</span> each
      `;
      previewDetails.textContent = `Connected to raw inventory: ${rawItem.name} (${rawItem.quantity.toFixed(2)} ${rawItem.unit} available)`;
    } else {
      preview.classList.add('hidden');
    }
  }
  
  totalQtyInput.addEventListener('input', updatePreview);
  packSizeInput.addEventListener('input', updatePreview);
  packUnitInput.addEventListener('change', updatePreview);
  
  // Initial preview if pack unit is pre-filled
  if (rawItem.unit) {
    setTimeout(updatePreview, 100);
  }
}

async function submitPackage(event, rawItemId) {
  event.preventDefault();
  const form = document.getElementById('packageForm');
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating...';

  const totalRawQty = parseFloat(document.getElementById('packageTotalQty').value);
  const packSize = parseFloat(document.getElementById('packageSize').value);
  const packUnit = document.getElementById('packageUnit').value;

  if (!totalRawQty || !packSize || !packUnit || totalRawQty <= 0 || packSize <= 0) {
    showAlertModal('Validation Error', 'Please fill in all fields with valid values', 'warning');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    return;
  }

  try {
    const response = await API.createPackage(rawItemId, totalRawQty, packSize, packUnit);
    if (response.success) {
      closeModal();
      await loadState();
    } else {
      showAlertModal('Error', response.error || 'Failed to create package', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  } catch (error) {
    console.error('Error creating package:', error);
    showAlertModal('Error', 'Failed to create package', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

async function deletePackage(packageId) {
  const confirmed = await showConfirmModal(
    'Delete Package',
    'Are you sure you want to delete this package? This action cannot be undone.',
    async () => {
      try {
        const response = await API.deletePackage(packageId);
        if (response.success) {
          await loadState();
        } else {
          showAlertModal('Error', response.error || 'Failed to delete package', 'error');
        }
      } catch (error) {
        console.error('Error deleting package:', error);
        showAlertModal('Error', 'Failed to delete package', 'error');
      }
    }
  );
}

function showEditInventoryForm(itemId) {
  const state = getAppState();
  const item = state.inventory.find(i => i.id === itemId);
  
  if (!item) {
    showAlertModal('Error', 'Item not found', 'error');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 overflow-y-auto';
  modal.innerHTML = `
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onclick="closeModal()"></div>
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="mb-4">
            <h3 class="text-lg font-medium text-gray-900 mb-1">Edit Inventory Item</h3>
            <p class="text-sm text-gray-500">Update details for ${item.name}</p>
          </div>
          <form onsubmit="submitEditInventory(event, '${itemId}')" id="editInventoryForm">
            <div class="space-y-4">
              <div class="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p class="text-sm text-gray-700">
                  <span class="font-medium">Current Quantity:</span> ${item.quantity.toFixed(2)} ${item.unit}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Reorder Level (Min. Stock) *</label>
                <input type="number" id="editMinStockLevel" step="0.01" min="0" required value="${item.minStockLevel}" placeholder="0.00" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <p class="mt-1 text-xs text-gray-500">Set the minimum stock level (reorder point) in ${item.unit}. Item will show as "Low Stock" when quantity falls below this level.</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select id="editCategory" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                  <option value="Dry Goods" ${item.category === 'Dry Goods' ? 'selected' : ''}>Dry Goods</option>
                  <option value="Dairy" ${item.category === 'Dairy' ? 'selected' : ''}>Dairy</option>
                  <option value="Meat & Poultry" ${item.category === 'Meat & Poultry' ? 'selected' : ''}>Meat & Poultry</option>
                  <option value="Fruits & Vegetables" ${item.category === 'Fruits & Vegetables' ? 'selected' : ''}>Fruits & Vegetables</option>
                  <option value="Beverages" ${item.category === 'Beverages' ? 'selected' : ''}>Beverages</option>
                  <option value="Spices & Seasonings" ${item.category === 'Spices & Seasonings' ? 'selected' : ''}>Spices & Seasonings</option>
                  <option value="Baking Supplies" ${item.category === 'Baking Supplies' ? 'selected' : ''}>Baking Supplies</option>
                  <option value="Canned Goods" ${item.category === 'Canned Goods' ? 'selected' : ''}>Canned Goods</option>
                  <option value="Frozen Foods" ${item.category === 'Frozen Foods' ? 'selected' : ''}>Frozen Foods</option>
                  <option value="Condiments" ${item.category === 'Condiments' ? 'selected' : ''}>Condiments</option>
                  <option value="Other" ${item.category === 'Other' || !item.category ? 'selected' : ''}>Other</option>
                </select>
              </div>
            </div>
            <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
              <button type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm">
                Save Changes
              </button>
              <button type="button" onclick="closeModal()" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  window.currentModal = modal;
}

async function submitEditInventory(event, itemId) {
  event.preventDefault();
  const form = document.getElementById('editInventoryForm');
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  const minStockLevel = parseFloat(document.getElementById('editMinStockLevel').value);
  const category = document.getElementById('editCategory').value;

  if (minStockLevel < 0) {
    showAlertModal('Validation Error', 'Please enter valid values (non-negative numbers)', 'warning');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    return;
  }

  try {
    const response = await API.updateInventoryItem(itemId, {
      minStockLevel: minStockLevel,
      category: category
    });
    if (response.success) {
      closeModal();
      await loadState();
    } else {
      showAlertModal('Error', response.error || 'Failed to update inventory item', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  } catch (error) {
    console.error('Error updating inventory item:', error);
    showAlertModal('Error', 'Failed to update inventory item', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

function showDisposalModal(itemId, itemName) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 overflow-y-auto';
  modal.innerHTML = `
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onclick="closeModal()"></div>
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="mb-4">
            <h3 class="text-lg font-medium text-gray-900 mb-1">Dispose Item</h3>
            <p class="text-sm text-gray-500">Select reason for disposal</p>
          </div>
          
          <form onsubmit="handleDisposalSubmit(event, '${itemId}')" id="disposalForm">
            <input type="hidden" id="disposalItemId" value="${itemId}">
            <input type="hidden" id="disposalItemName" value="${escapeHtml(itemName)}">
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Item</label>
                <p class="text-base font-semibold text-gray-900">${escapeHtml(itemName)}</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                <select id="disposalReason" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                  <option value="">Select a reason...</option>
                  <option value="Expired">Expired</option>
                  <option value="Spoiled">Spoiled</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Contaminated">Contaminated</option>
                  <option value="Quality Issue">Quality Issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div id="disposalOtherReasonContainer" class="hidden">
                <label class="block text-sm font-medium text-gray-700 mb-2">Specify Reason *</label>
                <input type="text" id="disposalOtherReason" placeholder="Enter reason..." class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Quantity to Dispose *</label>
                <input type="number" id="disposalQuantity" required min="0.01" step="0.01" placeholder="0.00" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <p class="mt-1 text-xs text-gray-500">Enter the quantity to dispose</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <textarea id="disposalNotes" rows="3" placeholder="Additional notes..." class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
              </div>
            </div>
            
            <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
              <button type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm">
                Dispose
              </button>
              <button type="button" onclick="closeModal()" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  window.currentModal = modal;
  
  // Show/hide other reason field based on selection
  const reasonSelect = document.getElementById('disposalReason');
  const otherReasonContainer = document.getElementById('disposalOtherReasonContainer');
  const otherReasonInput = document.getElementById('disposalOtherReason');
  
  reasonSelect.addEventListener('change', function() {
    if (this.value === 'Other') {
      otherReasonContainer.classList.remove('hidden');
      otherReasonInput.required = true;
    } else {
      otherReasonContainer.classList.add('hidden');
      otherReasonInput.required = false;
      otherReasonInput.value = '';
    }
  });
}

async function handleDisposalSubmit(event, itemId) {
  event.preventDefault();
  
  const reason = document.getElementById('disposalReason').value;
  const otherReason = document.getElementById('disposalOtherReason').value;
  const quantity = parseFloat(document.getElementById('disposalQuantity').value);
  const notes = document.getElementById('disposalNotes').value;
  const itemName = document.getElementById('disposalItemName').value;
  
  if (!reason) {
    showAlertModal('Validation Error', 'Please select a reason', 'warning');
    return;
  }
  
  if (reason === 'Other' && !otherReason.trim()) {
    showAlertModal('Validation Error', 'Please specify the reason', 'warning');
    return;
  }
  
  if (!quantity || quantity <= 0) {
    showAlertModal('Validation Error', 'Please enter a valid quantity (greater than 0)', 'warning');
    return;
  }
  
  const finalReason = reason === 'Other' ? otherReason : reason;
  
  const confirmed = await showConfirmModal(
    'Confirm Disposal',
    `Are you sure you want to dispose ${quantity} of ${itemName}?<br><br><strong>Reason:</strong> ${escapeHtml(finalReason)}`,
    async () => {
      try {
        const response = await API.disposeInventoryItem({
          itemId: itemId,
          quantity: quantity,
          reason: finalReason,
          notes: notes
        });
        
        if (response.success) {
          showAlertModal('Success', `Successfully disposed ${quantity} of ${itemName}. Reason: ${finalReason}`, 'success');
          closeModal();
          await loadState();
        } else {
          showAlertModal('Error', response.error || 'Failed to dispose item', 'error');
        }
      } catch (error) {
        console.error('Error disposing item:', error);
        showAlertModal('Error', 'Failed to dispose item: ' + (error.message || 'Unknown error'), 'error');
      }
    }
  );
}

function closeModal() {
  if (window.currentModal) {
    window.currentModal.remove();
    window.currentModal = null;
  }
}

function handleLogout() {
  logout();
}

window.handleLogout = handleLogout;
window.showCreatePackageForm = showCreatePackageForm;
window.showEditInventoryForm = showEditInventoryForm;
window.deletePackage = deletePackage;
window.closeModal = closeModal;
window.showDisposalModal = showDisposalModal;
window.handleDisposalSubmit = handleDisposalSubmit;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
