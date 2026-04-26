// Reports page initialization
let currentTab = 'lowstock';

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
  showReportTab('lowstock');
  subscribeState(() => renderCurrentTab());
}

function showReportTab(tab) {
  currentTab = tab;
  
  // Update tab styles
  document.querySelectorAll('[id^="tab-"]').forEach(btn => {
    btn.classList.remove('text-blue-600', 'border-blue-600');
    btn.classList.add('text-gray-500', 'border-transparent');
  });
  
  const activeTab = document.getElementById(`tab-${tab}`);
  if (activeTab) {
    activeTab.classList.remove('text-gray-500', 'border-transparent');
    activeTab.classList.add('text-blue-600', 'border-blue-600');
  }
  
  renderCurrentTab();
}

function renderCurrentTab() {
  switch(currentTab) {
    case 'lowstock':
      renderLowStockReport();
      break;
    case 'expiry':
      renderExpiryTrackingReport();
      break;
    case 'disposals':
      renderDisposalReport();
      break;
    case 'purchases':
      renderPurchaseAnalysisReport();
      break;
    case 'consumption':
      renderConsumptionReport();
      break;
    case 'inventory':
      renderInventoryReports();
      break;
    case 'suppliers':
      renderSupplierAnalysisReport();
      break;
    case 'requests':
      renderKitchenRequestReport();
      break;
    case 'summary':
      renderMonthlySummaryReport();
      break;
    case 'users':
      renderUserActivityReports();
      break;
  }
}

// Helper function to format expiry date
function formatExpiryDate(expiryDate) {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { daysRemaining: diffDays, status: 'EXPIRED', display: `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago` };
  } else if (diffDays <= 7) {
    return { daysRemaining: diffDays, status: 'NEAR EXPIRY', display: `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining` };
  } else {
    return { daysRemaining: diffDays, status: 'OK', display: `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining` };
  }
}

// Build supplier map from purchases
function buildSupplierMap() {
  const state = getAppState();
  const purchases = state.purchases || [];
  const itemSupplierMap = {};
  
  purchases
    .filter(p => p.status === 'completed' && p.supplier)
    .sort((a, b) => {
      const dateA = new Date(a.dateDelivered || a.dateCreated);
      const dateB = new Date(b.dateDelivered || b.dateCreated);
      return dateB - dateA;
    })
    .forEach(purchase => {
      if (!itemSupplierMap[purchase.itemName]) {
        itemSupplierMap[purchase.itemName] = purchase.supplier;
      }
    });
  
  return itemSupplierMap;
}

// Build expiry map from purchases
function buildExpiryMap() {
  const state = getAppState();
  const purchases = state.purchases || [];
  const itemExpiryMap = {};
  
  purchases
    .filter(p => p.status === 'completed' && p.expiryDate)
    .sort((a, b) => {
      const dateA = new Date(a.dateDelivered || a.dateCreated);
      const dateB = new Date(b.dateDelivered || b.dateCreated);
      return dateB - dateA;
    })
    .forEach(purchase => {
      if (!itemExpiryMap[purchase.itemName] && purchase.expiryDate) {
        itemExpiryMap[purchase.itemName] = purchase.expiryDate;
      }
    });
  
  return itemExpiryMap;
}

// 1. LOW STOCK REPORT (PRIORITY 1)
function renderLowStockReport() {
  const state = getAppState();
  const container = document.getElementById('reportContent');
  if (!container) return;
  
  const inventory = state.inventory || [];
  const itemSupplierMap = buildSupplierMap();
  
  // Get low stock items
  const lowStockItems = inventory
    .filter(item => item.quantity < item.minStockLevel)
    .map(item => {
      const supplier = itemSupplierMap[item.name] || 'No Supplier';
      const stockDifference = item.minStockLevel - item.quantity;
      const stockPercentage = item.minStockLevel > 0 ? (item.quantity / item.minStockLevel) * 100 : 0;
      
      let priority = 'LOW';
      let priorityColor = 'bg-yellow-100 text-yellow-800';
      if (stockPercentage < 25) {
        priority = 'CRITICAL';
        priorityColor = 'bg-red-100 text-red-800';
      } else if (stockPercentage < 50) {
        priority = 'URGENT';
        priorityColor = 'bg-orange-100 text-orange-800';
      }
      
      return {
        ...item,
        supplier,
        stockDifference,
        stockPercentage,
        priority,
        priorityColor
      };
    })
    .sort((a, b) => a.stockPercentage - b.stockPercentage); // Most critical first
  
  const now = new Date();
  const reportDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const reportTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  container.innerHTML = `
    <div class="print-header">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Low Stock Items Report</h1>
      <p class="text-sm text-gray-600">Generated on: ${reportDate} at ${reportTime}</p>
      <p class="text-sm text-gray-600">Total Low Stock Items: ${lowStockItems.length}</p>
    </div>
    
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div class="bg-red-50 rounded-lg p-4 border border-red-200">
          <h3 class="text-sm font-medium text-red-800 mb-1">Critical Items</h3>
          <p class="text-2xl font-bold text-red-900">${lowStockItems.filter(i => i.priority === 'CRITICAL').length}</p>
        </div>
        <div class="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <h3 class="text-sm font-medium text-orange-800 mb-1">Urgent Items</h3>
          <p class="text-2xl font-bold text-orange-900">${lowStockItems.filter(i => i.priority === 'URGENT').length}</p>
        </div>
        <div class="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <h3 class="text-sm font-medium text-yellow-800 mb-1">Low Stock Items</h3>
          <p class="text-2xl font-bold text-yellow-900">${lowStockItems.filter(i => i.priority === 'LOW').length}</p>
        </div>
      </div>
      
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Low Stock Items Detail</h3>
        <div class="overflow-x-auto print-table-container">
          <table class="min-w-full divide-y divide-gray-200 print-table">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Min. Stock Level</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shortage</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Est. Reorder Cost</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${lowStockItems.length === 0 ? `
                <tr>
                  <td colspan="9" class="px-2 py-4 text-center text-gray-500">No low stock items found</td>
                </tr>
              ` : lowStockItems.map(item => {
                const reorderQty = item.stockDifference;
                const reorderCost = reorderQty * (item.pricePerUnit || 0);
                return `
                  <tr class="hover:bg-gray-50">
                    <td class="px-2 py-2 whitespace-nowrap">
                      <span class="px-1 py-0.5 text-xs font-medium rounded-full ${item.priorityColor}">
                        ${item.priority}
                      </span>
                    </td>
                    <td class="px-2 py-2 text-xs font-medium text-gray-900">${escapeHtml(item.name)}</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${escapeHtml(item.category || 'Uncategorized')}</td>
                    <td class="px-2 py-2 text-xs text-gray-900">
                      <span class="font-medium">${item.quantity.toFixed(2)}</span>
                      <span class="text-gray-500 ml-1">${escapeHtml(item.unit)}</span>
                    </td>
                    <td class="px-2 py-2 text-xs text-gray-600">
                      ${item.minStockLevel.toFixed(2)} ${escapeHtml(item.unit)}
                    </td>
                    <td class="px-2 py-2 text-xs text-red-600 font-medium">
                      ${item.stockDifference.toFixed(2)} ${escapeHtml(item.unit)}
                    </td>
                    <td class="px-2 py-2 text-xs text-gray-600">${escapeHtml(item.supplier)}</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${formatCurrency(item.pricePerUnit || 0)}</td>
                    <td class="px-2 py-2 text-xs font-medium text-gray-900">${formatCurrency(reorderCost)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            ${lowStockItems.length > 0 ? `
              <tfoot class="bg-gray-50">
                <tr>
                  <td colspan="8" class="px-2 py-2 text-xs font-medium text-gray-900 text-right">Total Estimated Reorder Cost:</td>
                  <td class="px-2 py-2 text-xs font-bold text-gray-900">
                    ${formatCurrency(lowStockItems.reduce((sum, item) => sum + (item.stockDifference * (item.pricePerUnit || 0)), 0))}
                  </td>
                </tr>
              </tfoot>
            ` : ''}
          </table>
        </div>
      </div>
    </div>
  `;
}

// 2. EXPIRY TRACKING REPORT (PRIORITY 2)
function renderExpiryTrackingReport() {
  const state = getAppState();
  const container = document.getElementById('reportContent');
  if (!container) return;
  
  const inventory = state.inventory || [];
  const itemExpiryMap = buildExpiryMap();
  const itemSupplierMap = buildSupplierMap();
  
  // Get items with expiry dates
  const itemsWithExpiry = inventory
    .map(item => {
      const expiryDate = itemExpiryMap[item.name];
      if (!expiryDate) return null;
      
      const expiryInfo = formatExpiryDate(expiryDate);
      const supplier = itemSupplierMap[item.name] || 'No Supplier';
      
      return {
        ...item,
        expiryDate,
        expiryInfo,
        supplier
      };
    })
    .filter(item => item !== null)
    .sort((a, b) => {
      // Expired first, then near expiry, then by days remaining
      if (a.expiryInfo.daysRemaining < 0 && b.expiryInfo.daysRemaining >= 0) return -1;
      if (a.expiryInfo.daysRemaining >= 0 && b.expiryInfo.daysRemaining < 0) return 1;
      return a.expiryInfo.daysRemaining - b.expiryInfo.daysRemaining;
    });
  
  const expired = itemsWithExpiry.filter(i => i.expiryInfo.daysRemaining < 0);
  const nearExpiry = itemsWithExpiry.filter(i => i.expiryInfo.daysRemaining >= 0 && i.expiryInfo.daysRemaining <= 7);
  const ok = itemsWithExpiry.filter(i => i.expiryInfo.daysRemaining > 7);
  
  const now = new Date();
  const reportDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const reportTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  container.innerHTML = `
    <div class="print-header">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Expiry Tracking Report</h1>
      <p class="text-sm text-gray-600">Generated on: ${reportDate} at ${reportTime}</p>
    </div>
    
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div class="bg-red-50 rounded-lg p-4 border border-red-200">
          <h3 class="text-sm font-medium text-red-800 mb-1">Expired Items</h3>
          <p class="text-2xl font-bold text-red-900">${expired.length}</p>
        </div>
        <div class="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <h3 class="text-sm font-medium text-orange-800 mb-1">Near Expiry (≤7 days)</h3>
          <p class="text-2xl font-bold text-orange-900">${nearExpiry.length}</p>
        </div>
        <div class="bg-green-50 rounded-lg p-4 border border-green-200">
          <h3 class="text-sm font-medium text-green-800 mb-1">OK (>7 days)</h3>
          <p class="text-2xl font-bold text-green-900">${ok.length}</p>
        </div>
      </div>
      
      ${expired.length > 0 ? `
        <div class="bg-white rounded-lg border border-red-200 p-4">
          <h3 class="text-lg font-semibold text-red-900 mb-4">⚠️ Expired Items (Immediate Action Required)</h3>
          <div class="overflow-x-auto print-table-container">
            <table class="min-w-full divide-y divide-gray-200 print-table">
              <thead class="bg-red-50">
                <tr>
                  <th class="px-2 py-2 text-left text-xs font-medium text-red-800 uppercase">Item Name</th>
                  <th class="px-2 py-2 text-left text-xs font-medium text-red-800 uppercase">Category</th>
                  <th class="px-2 py-2 text-left text-xs font-medium text-red-800 uppercase">Quantity</th>
                  <th class="px-2 py-2 text-left text-xs font-medium text-red-800 uppercase">Expiry Date</th>
                  <th class="px-2 py-2 text-left text-xs font-medium text-red-800 uppercase">Days Expired</th>
                  <th class="px-2 py-2 text-left text-xs font-medium text-red-800 uppercase">Inventory Value</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${expired.map(item => {
                  const value = item.quantity * (item.pricePerUnit || 0);
                  return `
                    <tr>
                      <td class="px-2 py-2 text-xs font-medium text-gray-900">${escapeHtml(item.name)}</td>
                      <td class="px-2 py-2 text-xs text-gray-600">${escapeHtml(item.category || 'Uncategorized')}</td>
                      <td class="px-2 py-2 text-xs text-gray-900">${item.quantity.toFixed(2)} ${escapeHtml(item.unit)}</td>
                      <td class="px-2 py-2 text-xs text-gray-600">${new Date(item.expiryDate).toLocaleDateString()}</td>
                      <td class="px-2 py-2 text-xs text-red-600 font-medium">${Math.abs(item.expiryInfo.daysRemaining)} days</td>
                      <td class="px-2 py-2 text-xs text-gray-900">${formatCurrency(value)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
      
      ${nearExpiry.length > 0 ? `
        <div class="bg-white rounded-lg border border-orange-200 p-4">
          <h3 class="text-lg font-semibold text-orange-900 mb-4">⚠️ Near Expiry Items (≤7 days remaining)</h3>
          <div class="overflow-x-auto print-table-container">
            <table class="min-w-full divide-y divide-gray-200 print-table">
              <thead class="bg-orange-50">
                <tr>
                  <th class="px-2 py-2 text-left text-xs font-medium text-orange-800 uppercase">Item Name</th>
                  <th class="px-2 py-2 text-left text-xs font-medium text-orange-800 uppercase">Category</th>
                  <th class="px-2 py-2 text-left text-xs font-medium text-orange-800 uppercase">Quantity</th>
                  <th class="px-2 py-2 text-left text-xs font-medium text-orange-800 uppercase">Expiry Date</th>
                  <th class="px-2 py-2 text-left text-xs font-medium text-orange-800 uppercase">Days Remaining</th>
                  <th class="px-2 py-2 text-left text-xs font-medium text-orange-800 uppercase">Supplier</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${nearExpiry.map(item => `
                  <tr>
                    <td class="px-2 py-2 text-xs font-medium text-gray-900">${escapeHtml(item.name)}</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${escapeHtml(item.category || 'Uncategorized')}</td>
                    <td class="px-2 py-2 text-xs text-gray-900">${item.quantity.toFixed(2)} ${escapeHtml(item.unit)}</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${new Date(item.expiryDate).toLocaleDateString()}</td>
                    <td class="px-2 py-2 text-xs text-orange-600 font-medium">${item.expiryInfo.daysRemaining} days</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${escapeHtml(item.supplier)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
      
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">All Items with Expiry Dates</h3>
        <div class="overflow-x-auto print-table-container">
          <table class="min-w-full divide-y divide-gray-200 print-table">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Days Remaining</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${itemsWithExpiry.map(item => {
                let statusColor = 'bg-green-100 text-green-800';
                if (item.expiryInfo.daysRemaining < 0) statusColor = 'bg-red-100 text-red-800';
                else if (item.expiryInfo.daysRemaining <= 7) statusColor = 'bg-orange-100 text-orange-800';
                
                return `
                  <tr>
                    <td class="px-2 py-2 whitespace-nowrap">
                      <span class="px-1 py-0.5 text-xs font-medium rounded-full ${statusColor}">
                        ${item.expiryInfo.status}
                      </span>
                    </td>
                    <td class="px-2 py-2 text-xs font-medium text-gray-900">${escapeHtml(item.name)}</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${escapeHtml(item.category || 'Uncategorized')}</td>
                    <td class="px-2 py-2 text-xs text-gray-900">${item.quantity.toFixed(2)} ${escapeHtml(item.unit)}</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${new Date(item.expiryDate).toLocaleDateString()}</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${item.expiryInfo.display}</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${escapeHtml(item.supplier)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// 3. WASTE/DISPOSAL REPORT (PRIORITY 3)
function renderDisposalReport() {
  const state = getAppState();
  const container = document.getElementById('reportContent');
  if (!container) return;
  
  const disposals = state.disposals || [];
  const inventory = state.inventory || [];
  const inventoryMap = {};
  inventory.forEach(item => {
    inventoryMap[item.id] = item;
  });
  
  // Group by item and reason combination
  const byItemAndReason = {};
  let totalValue = 0;
  
  disposals.forEach(disposal => {
    const item = inventoryMap[disposal.inventoryItemId];
    const itemPrice = item ? (item.pricePerUnit || 0) : 0;
    const disposalValue = disposal.quantity * itemPrice;
    totalValue += disposalValue;
    
    const itemName = disposal.itemName || 'Unknown';
    const reason = disposal.reason || 'Unknown';
    const key = `${itemName}|${reason}`;
    
    if (!byItemAndReason[key]) {
      byItemAndReason[key] = {
        itemName: itemName,
        reason: reason,
        count: 0,
        quantity: 0,
        value: 0,
        unit: disposal.unit
      };
    }
    byItemAndReason[key].count++;
    byItemAndReason[key].quantity += disposal.quantity;
    byItemAndReason[key].value += disposalValue;
  });
  
  // Get recent disposals (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentDisposals = disposals
    .filter(d => new Date(d.disposedAt) >= thirtyDaysAgo)
    .sort((a, b) => new Date(b.disposedAt) - new Date(a.disposedAt));
  
  const now = new Date();
  const reportDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const reportTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  container.innerHTML = `
    <div class="print-header">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Waste & Disposal Report</h1>
      <p class="text-sm text-gray-600">Generated on: ${reportDate} at ${reportTime}</p>
    </div>
    
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div class="bg-red-50 rounded-lg p-4 border border-red-200">
          <h3 class="text-sm font-medium text-red-800 mb-1">Total Disposals</h3>
          <p class="text-2xl font-bold text-red-900">${disposals.length}</p>
        </div>
        <div class="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <h3 class="text-sm font-medium text-orange-800 mb-1">Total Value Lost</h3>
          <p class="text-2xl font-bold text-orange-900">${formatCurrency(totalValue)}</p>
        </div>
        <div class="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <h3 class="text-sm font-medium text-yellow-800 mb-1">Last 30 Days</h3>
          <p class="text-2xl font-bold text-yellow-900">${recentDisposals.length}</p>
        </div>
      </div>
      
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Disposals by Item and Reason</h3>
        <div class="overflow-x-auto print-table-container">
          <table class="min-w-full divide-y divide-gray-200 print-table">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Disposal Count</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Quantity</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Value Lost</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">% of Total</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${Object.entries(byItemAndReason)
                .sort((a, b) => b[1].value - a[1].value)
                .map(([key, data]) => {
                  const percentage = totalValue > 0 ? (data.value / totalValue * 100).toFixed(1) : 0;
                  return `
                    <tr>
                      <td class="px-2 py-2 text-xs font-medium text-gray-900">${escapeHtml(data.itemName)}</td>
                      <td class="px-2 py-2 text-xs text-gray-600">${escapeHtml(data.reason)}</td>
                      <td class="px-2 py-2 text-xs text-gray-600">${data.count}</td>
                      <td class="px-2 py-2 text-xs text-gray-600">${data.quantity.toFixed(2)} ${escapeHtml(data.unit)}</td>
                      <td class="px-2 py-2 text-xs font-medium text-gray-900">${formatCurrency(data.value)}</td>
                      <td class="px-2 py-2 text-xs text-gray-600">${percentage}%</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
            ${Object.keys(byItemAndReason).length > 0 ? `
              <tfoot class="bg-gray-50">
                <tr>
                  <td colspan="4" class="px-2 py-2 text-xs font-medium text-gray-900 text-right">Total:</td>
                  <td class="px-2 py-2 text-xs font-bold text-gray-900">${formatCurrency(totalValue)}</td>
                  <td class="px-2 py-2 text-xs font-bold text-gray-900">100.0%</td>
                </tr>
              </tfoot>
            ` : ''}
          </table>
        </div>
      </div>
      
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Disposals (Last 30 Days)</h3>
        <div class="overflow-x-auto print-table-container">
          <table class="min-w-full divide-y divide-gray-200 print-table">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Disposed By</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${recentDisposals.length === 0 ? `
                <tr>
                  <td colspan="6" class="px-2 py-4 text-center text-gray-500">No disposals in the last 30 days</td>
                </tr>
              ` : recentDisposals.map(disposal => {
                const item = inventoryMap[disposal.inventoryItemId];
                const disposalValue = disposal.quantity * (item ? (item.pricePerUnit || 0) : 0);
                return `
                  <tr>
                    <td class="px-2 py-2 text-xs text-gray-600">${new Date(disposal.disposedAt).toLocaleDateString()}</td>
                    <td class="px-2 py-2 text-xs font-medium text-gray-900">${escapeHtml(disposal.itemName)}</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${disposal.quantity.toFixed(2)} ${escapeHtml(disposal.unit)}</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${escapeHtml(disposal.reason)}</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${escapeHtml(disposal.disposedBy)}</td>
                    <td class="px-2 py-2 text-xs text-gray-500">${escapeHtml(disposal.notes || '-')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// 4. PURCHASE ANALYSIS REPORT (PRIORITY 4)
function renderPurchaseAnalysisReport() {
  const state = getAppState();
  const container = document.getElementById('reportContent');
  if (!container) return;
  
  const purchases = state.purchases || [];
  const completed = purchases.filter(p => p.status === 'completed');
  const pending = purchases.filter(p => p.status === 'pending');
  
  // Calculate totals
  const totalSpent = completed.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
  const pendingValue = pending.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);
  
  // Group by month
  const monthlyData = {};
  completed.forEach(p => {
    const date = new Date(p.dateDelivered || p.dateCreated);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { count: 0, total: 0, items: [] };
    }
    monthlyData[monthKey].count++;
    monthlyData[monthKey].total += parseFloat(p.price) || 0;
    monthlyData[monthKey].items.push(p);
  });
  
  // Group by supplier
  const supplierData = {};
  completed.forEach(p => {
    const supplier = p.supplier || 'No Supplier';
    if (!supplierData[supplier]) {
      supplierData[supplier] = { count: 0, total: 0 };
    }
    supplierData[supplier].count++;
    supplierData[supplier].total += parseFloat(p.price) || 0;
  });
  
  // Group by category
  const categoryData = {};
  completed.forEach(p => {
    const category = p.category || 'Uncategorized';
    if (!categoryData[category]) {
      categoryData[category] = { count: 0, total: 0 };
    }
    categoryData[category].count++;
    categoryData[category].total += parseFloat(p.price) || 0;
  });
  
  // Top purchased items
  const itemData = {};
  completed.forEach(p => {
    const itemName = p.itemName || 'Unknown';
    if (!itemData[itemName]) {
      itemData[itemName] = { count: 0, totalQty: 0, totalValue: 0, unit: p.displayUnit || '' };
    }
    itemData[itemName].count++;
    itemData[itemName].totalQty += parseFloat(p.quantity) || 0;
    itemData[itemName].totalValue += parseFloat(p.price) || 0;
  });
  
  const now = new Date();
  const reportDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const reportTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  container.innerHTML = `
    <div class="print-header">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Purchase Analysis Report</h1>
      <p class="text-sm text-gray-600">Generated on: ${reportDate} at ${reportTime}</p>
    </div>
    
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 class="text-sm font-medium text-blue-800 mb-1">Total Purchases</h3>
          <p class="text-2xl font-bold text-blue-900">${completed.length}</p>
        </div>
        <div class="bg-green-50 rounded-lg p-4 border border-green-200">
          <h3 class="text-sm font-medium text-green-800 mb-1">Total Spent</h3>
          <p class="text-2xl font-bold text-green-900">${formatCurrency(totalSpent)}</p>
        </div>
        <div class="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <h3 class="text-sm font-medium text-yellow-800 mb-1">Pending Value</h3>
          <p class="text-2xl font-bold text-yellow-900">${formatCurrency(pendingValue)}</p>
        </div>
        <div class="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <h3 class="text-sm font-medium text-purple-800 mb-1">Avg. Purchase</h3>
          <p class="text-2xl font-bold text-purple-900">${formatCurrency(completed.length > 0 ? totalSpent / completed.length : 0)}</p>
        </div>
      </div>
      
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Monthly Purchase Summary</h3>
        <div class="overflow-x-auto print-table-container">
          <table class="min-w-full divide-y divide-gray-200 print-table">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Purchase Count</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg. per Purchase</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${Object.entries(monthlyData).sort((a, b) => b[0].localeCompare(a[0])).map(([month, data]) => `
                <tr>
                  <td class="px-2 py-2 text-xs text-gray-900">${new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</td>
                  <td class="px-2 py-2 text-xs text-gray-600">${data.count}</td>
                  <td class="px-2 py-2 text-xs font-medium text-gray-900">${formatCurrency(data.total)}</td>
                  <td class="px-2 py-2 text-xs text-gray-600">${formatCurrency(data.count > 0 ? data.total / data.count : 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Purchases by Supplier and Category</h3>
        <div class="overflow-x-auto print-table-container">
          <table class="min-w-full divide-y divide-gray-200 print-table">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${[
                ...Object.entries(supplierData)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([supplier, data]) => ({
                    type: 'Supplier',
                    name: supplier,
                    count: data.count,
                    total: data.total
                  })),
                ...Object.entries(categoryData)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([category, data]) => ({
                    type: 'Category',
                    name: category,
                    count: data.count,
                    total: data.total
                  }))
              ]
                .sort((a, b) => b.total - a.total)
                .map(item => `
                  <tr>
                    <td class="px-2 py-2 text-xs text-gray-600">${escapeHtml(item.type)}</td>
                    <td class="px-2 py-2 text-xs font-medium text-gray-900">${escapeHtml(item.name)}</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${item.count}</td>
                    <td class="px-2 py-2 text-xs font-medium text-gray-900">${formatCurrency(item.total)}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Most Frequently Purchased Items</h3>
        <div class="overflow-x-auto print-table-container">
          <table class="min-w-full divide-y divide-gray-200 print-table">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Purchase Count</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Quantity</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg. Price</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${Object.entries(itemData)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 20)
                .map(([itemName, data]) => `
                  <tr>
                    <td class="px-2 py-2 text-xs font-medium text-gray-900">${escapeHtml(itemName)}</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${data.count}</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${data.totalQty.toFixed(2)} ${escapeHtml(data.unit)}</td>
                    <td class="px-2 py-2 text-xs font-medium text-gray-900">${formatCurrency(data.totalValue)}</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${formatCurrency(data.count > 0 ? data.totalValue / data.totalQty : 0)}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// 5. CONSUMPTION REPORT (Most Consumed Items)
function renderConsumptionReport() {
  const state = getAppState();
  const container = document.getElementById('reportContent');
  if (!container) return;
  
  const requests = state.requests || [];
  const ingredientSets = state.ingredientSets || [];
  const inventory = state.inventory || [];
  
  // Track consumption from approved requests
  const consumptionMap = {};
  const itemNameMap = {};
  inventory.forEach(item => {
    itemNameMap[item.id] = item.name;
  });
  
  // Process approved requests
  const approvedRequests = requests.filter(r => r.status === 'approved' || r.status === 'completed');
  
  approvedRequests.forEach(request => {
    if (request.isSingleItem && request.inventoryItemId) {
      const itemName = request.inventoryItemName || itemNameMap[request.inventoryItemId] || 'Unknown';
      const qty = parseFloat(request.requestedQuantity) || 0;
      const unit = request.requestedUnit || '';
      
      if (!consumptionMap[itemName]) {
        consumptionMap[itemName] = { quantity: 0, unit: unit, count: 0 };
      }
      consumptionMap[itemName].quantity += qty;
      consumptionMap[itemName].count++;
    } else if (request.ingredientSetId) {
      // Find the ingredient set
      const set = ingredientSets.find(s => s.id === request.ingredientSetId);
      if (set && set.ingredients) {
        const multiplier = request.quantity || 1;
        set.ingredients.forEach(ing => {
          const itemName = ing.name || itemNameMap[ing.inventoryItemId] || 'Unknown';
          const qty = (parseFloat(ing.quantity) || 0) * multiplier;
          const unit = ing.unit || '';
          
          if (!consumptionMap[itemName]) {
            consumptionMap[itemName] = { quantity: 0, unit: unit, count: 0 };
          }
          consumptionMap[itemName].quantity += qty;
          consumptionMap[itemName].count++;
        });
      }
    }
  });
  
  // Also consider disposals as consumption
  const disposals = state.disposals || [];
  disposals.forEach(disposal => {
    const itemName = disposal.itemName || 'Unknown';
    if (!consumptionMap[itemName]) {
      consumptionMap[itemName] = { quantity: 0, unit: disposal.unit, count: 0 };
    }
    consumptionMap[itemName].quantity += parseFloat(disposal.quantity) || 0;
    consumptionMap[itemName].count++;
  });
  
  // Convert to array and add value
  const consumptionData = Object.entries(consumptionMap)
    .map(([itemName, data]) => {
      const item = inventory.find(i => i.name === itemName);
      const unitPrice = item ? (item.pricePerUnit || 0) : 0;
      const totalValue = data.quantity * unitPrice;
      
      return {
        itemName,
        ...data,
        unitPrice,
        totalValue
      };
    })
    .sort((a, b) => b.quantity - a.quantity);
  
  const now = new Date();
  const reportDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const reportTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  container.innerHTML = `
    <div class="print-header">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Most Consumed Items Report</h1>
      <p class="text-sm text-gray-600">Generated on: ${reportDate} at ${reportTime}</p>
      <p class="text-sm text-gray-600">Based on ${approvedRequests.length} approved requests and ${disposals.length} disposals</p>
    </div>
    
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 class="text-sm font-medium text-blue-800 mb-1">Total Items Consumed</h3>
          <p class="text-2xl font-bold text-blue-900">${consumptionData.length}</p>
        </div>
        <div class="bg-green-50 rounded-lg p-4 border border-green-200">
          <h3 class="text-sm font-medium text-green-800 mb-1">Total Consumption Value</h3>
          <p class="text-2xl font-bold text-green-900">${formatCurrency(consumptionData.reduce((sum, item) => sum + item.totalValue, 0))}</p>
        </div>
        <div class="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <h3 class="text-sm font-medium text-purple-800 mb-1">Total Requests Processed</h3>
          <p class="text-2xl font-bold text-purple-900">${approvedRequests.length}</p>
        </div>
      </div>
      
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Top 30 Most Consumed Items</h3>
        <div class="overflow-x-auto print-table-container">
          <table class="min-w-full divide-y divide-gray-200 print-table">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Quantity Consumed</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Usage Count</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg. per Use</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${consumptionData.length === 0 ? `
                <tr>
                  <td colspan="7" class="px-2 py-4 text-center text-gray-500">No consumption data available</td>
                </tr>
              ` : consumptionData.slice(0, 30).map((item, index) => {
                const avgPerUse = item.count > 0 ? item.quantity / item.count : 0;
                return `
                  <tr class="hover:bg-gray-50">
                    <td class="px-2 py-2 text-xs font-medium text-gray-900">${index + 1}</td>
                    <td class="px-2 py-2 text-xs font-medium text-gray-900">${escapeHtml(item.itemName)}</td>
                    <td class="px-2 py-2 text-xs text-gray-900">
                      <span class="font-medium">${item.quantity.toFixed(2)}</span>
                      <span class="text-gray-500 ml-1">${escapeHtml(item.unit)}</span>
                    </td>
                    <td class="px-2 py-2 text-xs text-gray-600">${item.count}</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${formatCurrency(item.unitPrice)}</td>
                    <td class="px-2 py-2 text-xs font-medium text-gray-900">${formatCurrency(item.totalValue)}</td>
                    <td class="px-2 py-2 text-xs text-gray-600">${avgPerUse.toFixed(2)} ${escapeHtml(item.unit)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// Additional reports (keeping existing ones)
function renderInventoryReports() {
  const state = getAppState();
  const container = document.getElementById('reportContent');
  if (!container) return;
  
  const inventory = state.inventory || [];
  const lowStock = inventory.filter(item => item.quantity < item.minStockLevel);
  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.pricePerUnit || 0)), 0);
  const totalItems = inventory.length;
  
  // Group by category
  const categoryData = {};
  inventory.forEach(item => {
    const cat = item.category || 'Uncategorized';
    if (!categoryData[cat]) {
      categoryData[cat] = { count: 0, totalValue: 0 };
    }
    categoryData[cat].count++;
    categoryData[cat].totalValue += item.quantity * (item.pricePerUnit || 0);
  });
  
  container.innerHTML = `
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 class="text-sm font-medium text-blue-800 mb-1">Total Items</h3>
          <p class="text-2xl font-bold text-blue-900">${totalItems}</p>
        </div>
        <div class="bg-green-50 rounded-lg p-4 border border-green-200">
          <h3 class="text-sm font-medium text-green-800 mb-1">Total Inventory Value</h3>
          <p class="text-2xl font-bold text-green-900">${formatCurrency(totalValue)}</p>
        </div>
        <div class="bg-red-50 rounded-lg p-4 border border-red-200">
          <h3 class="text-sm font-medium text-red-800 mb-1">Low Stock Items</h3>
          <p class="text-2xl font-bold text-red-900">${lowStock.length}</p>
        </div>
      </div>
      
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Inventory by Category</h3>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Count</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${Object.entries(categoryData).map(([category, data]) => `
                <tr>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">${escapeHtml(category)}</td>
                  <td class="px-4 py-3 text-sm text-gray-600">${data.count}</td>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">${formatCurrency(data.totalValue)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderSupplierAnalysisReport() {
  const state = getAppState();
  const container = document.getElementById('reportContent');
  if (!container) return;
  
  const purchases = state.purchases || [];
  const completed = purchases.filter(p => p.status === 'completed');
  
  const supplierData = {};
  completed.forEach(p => {
    const supplier = p.supplier || 'No Supplier';
    if (!supplierData[supplier]) {
      supplierData[supplier] = { count: 0, total: 0, items: new Set() };
    }
    supplierData[supplier].count++;
    supplierData[supplier].total += parseFloat(p.price) || 0;
    supplierData[supplier].items.add(p.itemName);
  });
  
  container.innerHTML = `
    <div class="space-y-6">
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Supplier Analysis</h3>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Count</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unique Items</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. Purchase</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${Object.entries(supplierData)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([supplier, data]) => `
                  <tr>
                    <td class="px-4 py-3 text-sm font-medium text-gray-900">${escapeHtml(supplier)}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">${data.count}</td>
                    <td class="px-4 py-3 text-sm font-medium text-gray-900">${formatCurrency(data.total)}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">${data.items.size}</td>
                    <td class="px-4 py-3 text-sm text-gray-600">${formatCurrency(data.count > 0 ? data.total / data.count : 0)}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderKitchenRequestReport() {
  const state = getAppState();
  const container = document.getElementById('reportContent');
  if (!container) return;
  
  const requests = state.requests || [];
  const pending = requests.filter(r => r.status === 'pending');
  const approved = requests.filter(r => r.status === 'approved' || r.status === 'completed');
  const rejected = requests.filter(r => r.status === 'rejected');
  const insufficient = requests.filter(r => r.hasInsufficientInventory);
  
  container.innerHTML = `
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 class="text-sm font-medium text-blue-800 mb-1">Total Requests</h3>
          <p class="text-2xl font-bold text-blue-900">${requests.length}</p>
        </div>
        <div class="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <h3 class="text-sm font-medium text-yellow-800 mb-1">Pending</h3>
          <p class="text-2xl font-bold text-yellow-900">${pending.length}</p>
        </div>
        <div class="bg-green-50 rounded-lg p-4 border border-green-200">
          <h3 class="text-sm font-medium text-green-800 mb-1">Approved</h3>
          <p class="text-2xl font-bold text-green-900">${approved.length}</p>
        </div>
        <div class="bg-red-50 rounded-lg p-4 border border-red-200">
          <h3 class="text-sm font-medium text-red-800 mb-1">Insufficient Stock</h3>
          <p class="text-2xl font-bold text-red-900">${insufficient.length}</p>
        </div>
      </div>
    </div>
  `;
}

function renderMonthlySummaryReport() {
  const state = getAppState();
  const container = document.getElementById('reportContent');
  if (!container) return;
  
  container.innerHTML = `
    <div class="space-y-6">
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Monthly Summary Report</h3>
        <p class="text-gray-600">Comprehensive monthly overview coming soon...</p>
      </div>
    </div>
  `;
}

function renderUserActivityReports() {
  const state = getAppState();
  const container = document.getElementById('reportContent');
  if (!container) return;
  
  const users = state.users || [];
  const auditLogs = state.auditLogs || [];
  
  // Count actions per user
  const userActivity = {};
  auditLogs.forEach(log => {
    const userId = log.userId || 'unknown';
    if (!userActivity[userId]) {
      userActivity[userId] = { name: 'Unknown', count: 0, lastActivity: null };
    }
    userActivity[userId].count++;
    const logDate = new Date(log.timestamp);
    if (!userActivity[userId].lastActivity || logDate > new Date(userActivity[userId].lastActivity)) {
      userActivity[userId].lastActivity = log.timestamp;
    }
  });
  
  // Match with user names
  users.forEach(user => {
    if (userActivity[user.id]) {
      userActivity[user.id].name = user.name;
    }
  });
  
  container.innerHTML = `
    <div class="space-y-6">
      <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 class="text-sm font-medium text-blue-800 mb-1">Total Users</h3>
        <p class="text-2xl font-bold text-blue-900">${users.length}</p>
      </div>
      
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">User Activity Summary</h3>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Actions</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${Object.entries(userActivity).sort((a, b) => b[1].count - a[1].count).map(([userId, data]) => `
                <tr>
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">${escapeHtml(data.name)}</td>
                  <td class="px-4 py-3 text-sm text-gray-600">${data.count}</td>
                  <td class="px-4 py-3 text-sm text-gray-600">${data.lastActivity ? new Date(data.lastActivity).toLocaleString() : 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function printCurrentReport() {
  window.print();
}

function exportCurrentReport() {
  const state = getAppState();
  let csvContent = '';
  let filename = '';
  
  switch(currentTab) {
    case 'lowstock':
      const inventory = state.inventory || [];
      const itemSupplierMap = buildSupplierMap();
      const lowStockItems = inventory
        .filter(item => item.quantity < item.minStockLevel)
        .map(item => ({
          ...item,
          supplier: itemSupplierMap[item.name] || 'No Supplier',
          stockDifference: item.minStockLevel - item.quantity,
          stockPercentage: item.minStockLevel > 0 ? (item.quantity / item.minStockLevel) * 100 : 0
        }));
      
      const headers = ['Item Name', 'Category', 'Current Stock', 'Min Stock Level', 'Shortage', 'Supplier', 'Unit Price', 'Est. Reorder Cost'];
      const rows = lowStockItems.map(item => [
        item.name,
        item.category || 'Uncategorized',
        `${item.quantity.toFixed(2)} ${item.unit}`,
        `${item.minStockLevel.toFixed(2)} ${item.unit}`,
        `${item.stockDifference.toFixed(2)} ${item.unit}`,
        item.supplier,
        formatCurrency(item.pricePerUnit || 0),
        formatCurrency(item.stockDifference * (item.pricePerUnit || 0))
      ]);
      
      csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      filename = `low_stock_report_${new Date().toISOString().split('T')[0]}.csv`;
      break;
      
    case 'purchases':
      const purchases = state.purchases || [];
      const purchaseHeaders = ['ID', 'Item Name', 'Quantity', 'Unit', 'Price', 'Status', 'Date Ordered', 'Date Delivered', 'Supplier'];
      const purchaseRows = purchases.map(p => [
        p.id || '',
        p.itemName || '',
        p.quantity || '',
        p.displayUnit || '',
        p.price || '',
        p.status || '',
        p.dateCreated ? new Date(p.dateCreated).toLocaleDateString() : '',
        p.dateDelivered ? new Date(p.dateDelivered).toLocaleDateString() : '',
        p.supplier || ''
      ]);
      
      csvContent = [
        purchaseHeaders.join(','),
        ...purchaseRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      filename = `purchases_${new Date().toISOString().split('T')[0]}.csv`;
      break;
      
    default:
      alert('Export not yet implemented for this report type');
      return;
  }
  
  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

window.showReportTab = showReportTab;
window.exportReport = exportCurrentReport;
window.printCurrentReport = printCurrentReport;
window.exportCurrentReport = exportCurrentReport;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
