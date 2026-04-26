// Inventory Management page initialization
let allItems = [];
let itemSupplierMap = {};
let itemExpiryMap = {}; // Maps item name to expiry date from most recent purchase
let itemDisposalMap = {}; // Maps item ID to disposal records

// Helper function to format expiry date and calculate status
function formatExpiryDate(expiryDate) {
  if (!expiryDate) {
    return {
      display: '<div class="text-sm text-gray-400">N/A</div>',
      status: null,
      daysRemaining: null
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
    status: status,
    daysRemaining: diffDays
  };
}

async function initPage() {
  await loadState();
  
  if (!isAuthenticated()) {
    window.location.href = 'login.php';
    return;
  }
  
  if (!isAdmin()) {
    window.location.href = 'index.php';
    return;
  }
  
  updateUserInfo();
  updateNavigation();
  updatePageTitle();
  buildMaps();
  renderInventory();
  subscribeState(() => {
    buildMaps();
    renderInventory();
  });
}

function buildMaps() {
  const state = getAppState();
  const purchases = state.purchases || [];
  const disposals = state.disposals || [];
  
  // Build a map of item name to most recent supplier and expiry date
  itemSupplierMap = {};
  itemExpiryMap = {};
  
  purchases
    .filter(p => p.status === 'completed' && p.supplier)
    .sort((a, b) => {
      const dateA = new Date(a.dateDelivered || a.dateCreated);
      const dateB = new Date(b.dateDelivered || b.dateCreated);
      return dateB - dateA; // Most recent first
    })
    .forEach(purchase => {
      // Use item name as key, only set if not already set (most recent first)
      if (!itemSupplierMap[purchase.itemName]) {
        itemSupplierMap[purchase.itemName] = purchase.supplier;
      }
      if (!itemExpiryMap[purchase.itemName] && purchase.expiryDate) {
        itemExpiryMap[purchase.itemName] = purchase.expiryDate;
      }
    });
  
  // Build a map of item ID to disposal records
  itemDisposalMap = {};
  disposals.forEach(disposal => {
    if (!itemDisposalMap[disposal.inventoryItemId]) {
      itemDisposalMap[disposal.inventoryItemId] = [];
    }
    itemDisposalMap[disposal.inventoryItemId].push(disposal);
  });
}

function renderInventory() {
  const state = getAppState();
  const inventory = state.inventory || [];
  
  // Process all items with supplier and expiry info
  allItems = inventory.map(item => {
    const supplier = itemSupplierMap[item.name] || 'No Supplier';
    const expiryDate = itemExpiryMap[item.name] || null;
    const expiryInfo = formatExpiryDate(expiryDate);
    const isLowStock = item.quantity < item.minStockLevel;
    const disposals = itemDisposalMap[item.id] || [];
    const hasDisposals = disposals.length > 0;
    
    return {
      ...item,
      supplier: supplier,
      expiryDate: expiryDate,
      expiryInfo: expiryInfo,
      isLowStock: isLowStock,
      stockDifference: item.minStockLevel - item.quantity,
      stockPercentage: item.minStockLevel > 0 ? (item.quantity / item.minStockLevel) * 100 : 100,
      disposals: disposals,
      hasDisposals: hasDisposals
    };
  });
  
  applyFilters();
  populateFilters();
}

function populateFilters() {
  const supplierFilter = document.getElementById('supplierFilter');
  const categoryFilter = document.getElementById('categoryFilter');
  
  if (!supplierFilter || !categoryFilter) return;
  
  // Get unique suppliers from all items
  const suppliers = [...new Set(allItems.map(item => item.supplier).filter(s => s && s !== 'No Supplier'))].sort();
  const currentSupplier = supplierFilter.value;
  
  supplierFilter.innerHTML = '<option value="">All Suppliers</option>' +
    suppliers.map(s => `<option value="${escapeHtml(s)}" ${s === currentSupplier ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');
  
  // Get unique categories from all items
  const categories = [...new Set(allItems.map(item => item.category || 'Uncategorized').filter(c => c))].sort();
  const currentCategory = categoryFilter.value;
  
  categoryFilter.innerHTML = '<option value="">All Categories</option>' +
    categories.map(c => `<option value="${escapeHtml(c)}" ${c === currentCategory ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
}

function applyFilters() {
  const container = document.getElementById('inventoryContainer');
  if (!container) return;
  
  const viewFilter = document.getElementById('viewFilter')?.value || 'all';
  const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const supplierFilter = document.getElementById('supplierFilter')?.value || '';
  const categoryFilter = document.getElementById('categoryFilter')?.value || '';
  
  let filteredItems = [...allItems];
  
  // Apply view filter
  if (viewFilter === 'low_stock') {
    filteredItems = filteredItems.filter(item => item.isLowStock);
  } else if (viewFilter === 'near_expiry') {
    filteredItems = filteredItems.filter(item => 
      item.expiryInfo && 
      item.expiryInfo.daysRemaining !== null && 
      item.expiryInfo.daysRemaining >= 1 && 
      item.expiryInfo.daysRemaining <= 7
    );
  } else if (viewFilter === 'expired') {
    filteredItems = filteredItems.filter(item => 
      item.expiryInfo && 
      item.expiryInfo.daysRemaining !== null && 
      item.expiryInfo.daysRemaining < 1
    );
  } else if (viewFilter === 'disposed') {
    filteredItems = filteredItems.filter(item => item.hasDisposals);
  }
  // 'all' shows everything, no filter needed
  
  // Apply search filter
  if (searchTerm) {
    filteredItems = filteredItems.filter(item => 
      item.name?.toLowerCase().includes(searchTerm) ||
      item.category?.toLowerCase().includes(searchTerm) ||
      item.supplier?.toLowerCase().includes(searchTerm)
    );
  }
  
  // Apply supplier filter
  if (supplierFilter) {
    filteredItems = filteredItems.filter(item => item.supplier === supplierFilter);
  }
  
  // Apply category filter
  if (categoryFilter) {
    filteredItems = filteredItems.filter(item => (item.category || 'Uncategorized') === categoryFilter);
  }
  
  displayInventory(filteredItems);
}

function displayInventory(items) {
  const container = document.getElementById('inventoryContainer');
  if (!container) return;
  
  if (items.length === 0) {
    container.innerHTML = '<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-gray-500">No items found matching your filters.</div>';
    return;
  }
  
  // Sort by urgency: expired first, then near expiry, then low stock
  items.sort((a, b) => {
    // Expired items first
    if (a.expiryInfo?.daysRemaining !== null && a.expiryInfo.daysRemaining < 1 && 
        (b.expiryInfo?.daysRemaining === null || b.expiryInfo.daysRemaining >= 1)) return -1;
    if (b.expiryInfo?.daysRemaining !== null && b.expiryInfo.daysRemaining < 1 && 
        (a.expiryInfo?.daysRemaining === null || a.expiryInfo.daysRemaining >= 1)) return 1;
    
    // Near expiry next
    if (a.expiryInfo?.daysRemaining !== null && a.expiryInfo.daysRemaining >= 1 && a.expiryInfo.daysRemaining <= 7 &&
        (b.expiryInfo?.daysRemaining === null || b.expiryInfo.daysRemaining > 7 || b.expiryInfo.daysRemaining < 1)) return -1;
    if (b.expiryInfo?.daysRemaining !== null && b.expiryInfo.daysRemaining >= 1 && b.expiryInfo.daysRemaining <= 7 &&
        (a.expiryInfo?.daysRemaining === null || a.expiryInfo.daysRemaining > 7 || a.expiryInfo.daysRemaining < 1)) return 1;
    
    // Then by stock percentage (lowest first)
    return a.stockPercentage - b.stockPercentage;
  });
  
  container.innerHTML = `
    <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div class="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <p class="text-sm text-gray-600">Showing ${items.length} of ${allItems.length} items</p>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onclick="showItemDetails(event)">Item Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock Level</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shortage</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disposed Quantity</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${items.map(item => {
              const stockPercentage = item.stockPercentage;
              let statusBadges = [];
              
              // Stock status
              if (item.isLowStock) {
                const statusColor = stockPercentage < 25 ? 'bg-red-100 text-red-800' : 
                                   stockPercentage < 50 ? 'bg-yellow-100 text-yellow-800' : 
                                   'bg-orange-100 text-orange-800';
                const statusText = stockPercentage < 25 ? 'Critical Stock' : 
                                  stockPercentage < 50 ? 'Low Stock' : 
                                  'Warning';
                statusBadges.push(`<span class="px-2 py-1 text-xs font-medium rounded-full ${statusColor}">${statusText}</span>`);
              } else {
                statusBadges.push('<span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">OK</span>');
              }
              
              // Expiry status
              if (item.expiryInfo && item.expiryInfo.status) {
                const expiryStatus = item.expiryInfo.status;
                if (expiryStatus === 'EXPIRED') {
                  statusBadges.push('<span class="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Expired</span>');
                }
              }
              
              // Calculate total disposed quantity
              const totalDisposed = item.hasDisposals 
                ? item.disposals.reduce((sum, d) => sum + parseFloat(d.quantity || 0), 0)
                : 0;
              
              return `
                <tr class="hover:bg-gray-50 cursor-pointer" onclick="showItemDetails(event, '${item.id}')">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${escapeHtml(item.name)}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${escapeHtml(item.category || 'Uncategorized')}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span class="font-medium">${item.quantity.toFixed(2)}</span>
                    <span class="text-gray-500 ml-1">${escapeHtml(item.unit)}</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ${item.minStockLevel.toFixed(2)} ${escapeHtml(item.unit)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm ${item.isLowStock ? 'text-red-600 font-medium' : 'text-gray-500'}">
                    ${item.isLowStock ? `${item.stockDifference.toFixed(2)} ${escapeHtml(item.unit)}` : '-'}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ${escapeHtml(item.supplier)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    ${item.expiryInfo.display}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ${totalDisposed > 0 
                      ? `<span class="font-medium">${totalDisposed.toFixed(2)}</span><span class="text-gray-500 ml-1">${escapeHtml(item.unit)}</span>` 
                      : '<span class="text-gray-400">-</span>'}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex flex-wrap gap-1">
                      ${statusBadges.join('')}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function showItemDetails(event, itemId) {
  event.stopPropagation();
  
  const state = getAppState();
  const item = allItems.find(i => i.id === itemId);
  
  if (!item) {
    console.error('Item not found:', itemId);
    return;
  }
  
  const disposals = item.disposals || [];
  const totalDisposed = disposals.reduce((sum, d) => sum + parseFloat(d.quantity || 0), 0);
  
  let disposalDetails = '';
  if (disposals.length > 0) {
    disposalDetails = `
      <div class="mt-4 pt-4 border-t border-gray-200">
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Disposal History</h3>
        <div class="space-y-2 max-h-60 overflow-y-auto">
          ${disposals.map(disposal => {
            const disposalDate = new Date(disposal.disposedAt);
            const formattedDate = disposalDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            return `
              <div class="bg-gray-50 rounded-md p-3">
                <div class="flex justify-between items-start mb-1">
                  <div>
                    <span class="text-sm font-medium text-gray-900">${escapeHtml(disposal.quantity)} ${escapeHtml(disposal.unit)}</span>
                    <span class="text-xs text-gray-500 ml-2">${formattedDate}</span>
                  </div>
                </div>
                <div class="text-xs text-gray-600">
                  <strong>Reason:</strong> ${escapeHtml(disposal.reason)}
                </div>
                ${disposal.notes ? `<div class="text-xs text-gray-600 mt-1"><strong>Notes:</strong> ${escapeHtml(disposal.notes)}</div>` : ''}
                <div class="text-xs text-gray-500 mt-1">
                  Disposed by: ${escapeHtml(disposal.disposedBy)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="mt-3 pt-3 border-t border-gray-200">
          <p class="text-sm text-gray-600">
            <strong>Total Disposed:</strong> <span class="text-gray-900">${totalDisposed.toFixed(2)} ${escapeHtml(item.unit)}</span>
          </p>
        </div>
      </div>
    `;
  } else {
    disposalDetails = `
      <div class="mt-4 pt-4 border-t border-gray-200">
        <p class="text-sm text-gray-500">No disposal records for this item.</p>
      </div>
    `;
  }
  
  const modalContent = `
    <div class="space-y-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">${escapeHtml(item.name)}</h3>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-600">Category:</span>
            <span class="ml-2 text-gray-900">${escapeHtml(item.category || 'Uncategorized')}</span>
          </div>
          <div>
            <span class="text-gray-600">Current Stock:</span>
            <span class="ml-2 text-gray-900 font-medium">${item.quantity.toFixed(2)} ${escapeHtml(item.unit)}</span>
          </div>
          <div>
            <span class="text-gray-600">Min Stock Level:</span>
            <span class="ml-2 text-gray-900">${item.minStockLevel.toFixed(2)} ${escapeHtml(item.unit)}</span>
          </div>
          <div>
            <span class="text-gray-600">Supplier:</span>
            <span class="ml-2 text-gray-900">${escapeHtml(item.supplier)}</span>
          </div>
          ${item.expiryDate ? `
            <div>
              <span class="text-gray-600">Expiry Date:</span>
              <span class="ml-2 text-gray-900">${item.expiryInfo.display.replace(/<[^>]*>/g, '')}</span>
            </div>
          ` : ''}
        </div>
      </div>
      ${disposalDetails}
    </div>
  `;
  
  showAlertModal('Item Details', modalContent, 'info');
}

function clearFilters() {
  document.getElementById('viewFilter').value = 'all';
  document.getElementById('searchInput').value = '';
  document.getElementById('supplierFilter').value = '';
  document.getElementById('categoryFilter').value = '';
  applyFilters();
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function handleLogout() {
  logout();
}

window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.handleLogout = handleLogout;
window.showItemDetails = showItemDetails;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
