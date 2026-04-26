// Low Stocks page initialization
let allLowStockItems = [];
let itemSupplierMap = {}; // Maps item name to supplier

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
  buildSupplierMap();
  renderLowStocks();
  subscribeState(() => {
    buildSupplierMap();
    renderLowStocks();
  });
}

function buildSupplierMap() {
  const state = getAppState();
  const purchases = state.purchases || [];
  
  // Build a map of item name to most recent supplier
  itemSupplierMap = {};
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
    });
}

function renderLowStocks() {
  const state = getAppState();
  const inventory = state.inventory || [];
  
  // Get low stock items
  allLowStockItems = inventory
    .filter(item => item.quantity < item.minStockLevel)
    .map(item => {
      // Get supplier from map
      const supplier = itemSupplierMap[item.name] || 'No Supplier';
      return {
        ...item,
        supplier: supplier,
        stockDifference: item.minStockLevel - item.quantity,
        stockPercentage: (item.quantity / item.minStockLevel) * 100
      };
    });
  
  applyFilters();
  populateFilters();
}

function populateFilters() {
  const supplierFilter = document.getElementById('supplierFilter');
  const categoryFilter = document.getElementById('categoryFilter');
  
  if (!supplierFilter || !categoryFilter) return;
  
  // Get unique suppliers
  const suppliers = [...new Set(allLowStockItems.map(item => item.supplier).filter(s => s && s !== 'No Supplier'))].sort();
  const currentSupplier = supplierFilter.value;
  
  supplierFilter.innerHTML = '<option value="">All Suppliers</option>' +
    suppliers.map(s => `<option value="${escapeHtml(s)}" ${s === currentSupplier ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');
  
  // Get unique categories
  const categories = [...new Set(allLowStockItems.map(item => item.category || 'Uncategorized').filter(c => c))].sort();
  const currentCategory = categoryFilter.value;
  
  categoryFilter.innerHTML = '<option value="">All Categories</option>' +
    categories.map(c => `<option value="${escapeHtml(c)}" ${c === currentCategory ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
}

function applyFilters() {
  const container = document.getElementById('lowStocksContainer');
  if (!container) return;
  
  const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const supplierFilter = document.getElementById('supplierFilter')?.value || '';
  const categoryFilter = document.getElementById('categoryFilter')?.value || '';
  
  let filteredItems = [...allLowStockItems];
  
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
  
  displayLowStocks(filteredItems);
}

function displayLowStocks(items) {
  const container = document.getElementById('lowStocksContainer');
  if (!container) return;
  
  if (items.length === 0) {
    container.innerHTML = '<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-gray-500">No low stock items found matching your filters.</div>';
    return;
  }
  
  // Sort by stock percentage (lowest first - most urgent)
  items.sort((a, b) => a.stockPercentage - b.stockPercentage);
  
  container.innerHTML = `
    <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div class="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <p class="text-sm text-gray-600">Showing ${items.length} of ${allLowStockItems.length} low stock items</p>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock Level</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shortage</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${items.map(item => {
              const stockPercentage = item.stockPercentage;
              const statusColor = stockPercentage < 25 ? 'bg-red-100 text-red-800' : 
                                 stockPercentage < 50 ? 'bg-yellow-100 text-yellow-800' : 
                                 'bg-orange-100 text-orange-800';
              const statusText = stockPercentage < 25 ? 'Critical' : 
                                stockPercentage < 50 ? 'Low' : 
                                'Warning';
              
              return `
                <tr class="hover:bg-gray-50">
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
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                    ${item.stockDifference.toFixed(2)} ${escapeHtml(item.unit)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ${escapeHtml(item.supplier)}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${statusColor}">
                      ${statusText}
                    </span>
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

function clearFilters() {
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
