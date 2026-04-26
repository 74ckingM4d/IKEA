// Purchases page initialization
async function initPage() {
  await loadState();
  renderPurchases();
  subscribeState(() => renderPurchases());
}

// Helper function for empty state
function showEmptyState(message, actionText, actionOnClick) {
  return `
    <div class="text-center py-12">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">${message}</h3>
      ${actionText && actionOnClick ? `
        <div class="mt-6">
          <button onclick="${actionOnClick}" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            ${actionText}
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

// Payment/Status column colors as inline styles — Tailwind CDN often omits utilities that only appear in JS strings.
const PO_PAYMENT_COLOR = { paid: '#16a34a', unpaid: '#f87171' };
const PO_STATUS_COLOR = { pending: '#d97706', completed: '#16a34a', cancelled: '#f87171' };

function poPaymentColor(paymentStatus) {
  return paymentStatus === 'paid' ? PO_PAYMENT_COLOR.paid : PO_PAYMENT_COLOR.unpaid;
}

function poStatusColor(status) {
  return PO_STATUS_COLOR[status] || '#6b7280';
}

function renderPurchases() {
  try {
    if (!isAuthenticated()) {
      window.location.href = 'login.php';
      return;
    }

    updateUserInfo();
    updateNavigation();
    updatePageTitle();

    const state = getAppState();
    const container = document.getElementById('purchasesContainer');
    const addPurchaseBtn = document.getElementById('addPurchaseBtn');
    if (!container) return;

    // Show/hide Add Purchase button based on role
    if (addPurchaseBtn) {
      addPurchaseBtn.style.display = isPurchaser() ? 'block' : 'none';
    }

    const purchases = state.purchases || [];
    
    // Group purchases by batchId
    const batches = {};
    const singlePurchases = [];
    
    purchases.forEach(purchase => {
      if (purchase.batchId) {
        if (!batches[purchase.batchId]) {
          batches[purchase.batchId] = [];
        }
        batches[purchase.batchId].push(purchase);
      } else {
        singlePurchases.push(purchase);
      }
    });

    if (purchases.length === 0) {
      container.innerHTML = showEmptyState('No purchase orders yet.', isPurchaser() ? '+ Add Purchase' : null, isPurchaser() ? 'showAddPurchaseForm()' : null);
      return;
    }

    // Helper function to get batch status
    function getBatchStatus(batch) {
      const statuses = [...new Set(batch.map(p => p.status))];
      if (statuses.length === 1) return statuses[0];
      if (statuses.includes('cancelled')) return 'cancelled';
      if (statuses.includes('pending')) return 'pending';
      return 'completed';
    }

    // Group batches by status
    const pendingBatches = [];
    const completedBatches = [];
    const cancelledBatches = [];
    
    Object.values(batches).forEach(batch => {
      const batchStatus = getBatchStatus(batch);
      if (batchStatus === 'pending') pendingBatches.push(batch);
      else if (batchStatus === 'completed') completedBatches.push(batch);
      else cancelledBatches.push(batch);
    });

    const pendingPurchases = singlePurchases.filter(p => p.status === 'pending');
    const completedPurchases = singlePurchases.filter(p => p.status === 'completed');
    const cancelledPurchases = singlePurchases.filter(p => p.status === 'cancelled');

    let html = '';
    
    function buildSectionTable(title, rows) {
      if (rows.length === 0) return '';
      
      // Check if any row has pending status
      const hasPending = rows.some(row => row.status === 'pending');
      
      let sectionHtml = `
        <div class="mb-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">${title}</h2>
          <div class="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-2 text-left font-medium text-gray-600">Supplier</th>
                    <th class="px-4 py-2 text-left font-medium text-gray-600">Item / Batch</th>
                    <th class="px-4 py-2 text-left font-medium text-gray-600">Purchase Type</th>
                    <th class="px-4 py-2 text-right font-medium text-gray-600">Total</th>
                    <th class="px-4 py-2 text-left font-medium text-gray-600">Payment</th>
                    <th class="px-4 py-2 text-left font-medium text-gray-600">Status</th>
                    ${hasPending ? '<th class="px-4 py-2 text-left font-medium text-gray-600">Actions</th>' : ''}
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 bg-white">
      `;
      
      sectionHtml += rows.map(row => createPurchaseTableRow(row, hasPending)).join('');
      
      sectionHtml += `
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
      
      return sectionHtml;
    }
    
    // Build row models
    const pendingRows = [
      ...pendingBatches.map(batch => ({
        type: 'batch',
        batch,
        status: getBatchStatus(batch)
      })),
      ...pendingPurchases.map(p => ({
        type: 'single',
        purchase: p,
        status: p.status
      }))
    ];
    
    const completedRows = [
      ...completedBatches.map(batch => ({
        type: 'batch',
        batch,
        status: getBatchStatus(batch)
      })),
      ...completedPurchases.map(p => ({
        type: 'single',
        purchase: p,
        status: p.status
      }))
    ];
    
    const cancelledRows = [
      ...cancelledBatches.map(batch => ({
        type: 'batch',
        batch,
        status: getBatchStatus(batch)
      })),
      ...cancelledPurchases.map(p => ({
        type: 'single',
        purchase: p,
        status: p.status
      }))
    ];
    
    html += buildSectionTable('Pending Deliveries', pendingRows);
    html += buildSectionTable('Completed', completedRows);
    html += buildSectionTable('Cancelled', cancelledRows);
    
    container.innerHTML = html;
  } catch (error) {
    console.error('Error rendering purchases:', error);
    const container = document.getElementById('purchasesContainer');
    if (container) {
      container.innerHTML = '<p class="text-red-500">Error loading purchases. Please refresh the page.</p>';
    }
  }
}

function createPurchaseTableRow(row, showActionsColumn) {
  if (row.type === 'batch') {
    const batch = row.batch;
    const batchStatus = row.status;
    const dateCreated = batch[0].dateCreated;
    const dateDelivered = batch[0].dateDelivered;
    const purchaseType = batch[0].purchaseType || 'delivery';
    const purchaseTypeLabel = purchaseType === 'delivery' ? 'Delivery' : 'Personal Purchase';
    const paymentStatus = batch[0].paymentStatus || 'paid';
    const paymentStatusLabel = paymentStatus === 'paid' ? 'Paid' : 'Unpaid';
    const batchTotal = batch.reduce((sum, p) => sum + (p.price || 0), 0);
    const supplier = batch[0].supplier || 'N/A';
    
    return `
      <tr class="hover:bg-blue-50 transition-colors" onclick="showPurchaseDetails('batch', '${batch[0].batchId}')">
        <td class="px-4 py-3 text-sm text-gray-700">${supplier}</td>
        <td class="px-4 py-3 text-sm font-medium text-gray-900">${batch.length} item${batch.length !== 1 ? 's' : ''}</td>
        <td class="px-4 py-3 text-sm text-gray-700">${purchaseTypeLabel}</td>
        <td class="px-4 py-3 text-sm text-right font-bold text-gray-600">${formatCurrency(batchTotal)}</td>
        <td class="px-4 py-3 text-xs">
          <span class="font-medium" style="color:${poPaymentColor(paymentStatus)}">${paymentStatusLabel}</span>
        </td>
        <td class="px-4 py-3 text-xs">
          <span class="font-medium capitalize" style="color:${poStatusColor(batchStatus)}">${batchStatus}</span>
        </td>
        ${showActionsColumn ? `
        <td class="px-4 py-3 text-xs">
          ${isStockHandler() && batchStatus === 'pending' ? `
            <div class="flex gap-2">
              <button class="px-2 py-1 bg-green-100 text-green-700 rounded" onclick="event.stopPropagation(); showPartialDeliveryModal('${batch[0].batchId}')">Review</button>
              <button class="px-2 py-1 bg-red-100 text-red-700 rounded" onclick="event.stopPropagation(); confirmBatchDelivery('${batch[0].batchId}', false)">Reject</button>
            </div>
          ` : '<span class="text-gray-400">-</span>'}
        </td>
        ` : ''}
      </tr>
    `;
  } else {
    const p = row.purchase;
    const purchaseType = p.purchaseType || 'delivery';
    const purchaseTypeLabel = purchaseType === 'delivery' ? 'Delivery' : 'Personal Purchase';
    const paymentStatus = p.paymentStatus || 'paid';
    const paymentStatusLabel = paymentStatus === 'paid' ? 'Paid' : 'Unpaid';
    const supplier = p.supplier || 'N/A';
    
    return `
      <tr class="hover:bg-blue-50 transition-colors" onclick="showPurchaseDetails('single', '${p.id}')">
        <td class="px-4 py-3 text-sm text-gray-700">${supplier}</td>
        <td class="px-4 py-3 text-sm font-medium text-gray-900 truncate">${p.itemName}</td>
        <td class="px-4 py-3 text-sm text-gray-700">${purchaseTypeLabel}</td>
        <td class="px-4 py-3 text-sm text-right font-semibold text-blue-600">${formatCurrency(p.price)}</td>
        <td class="px-4 py-3 text-xs">
          <span class="font-medium" style="color:${poPaymentColor(paymentStatus)}">${paymentStatusLabel}</span>
        </td>
        <td class="px-4 py-3 text-xs">
          <span class="font-medium capitalize" style="color:${poStatusColor(p.status)}">${p.status}</span>
        </td>
        ${showActionsColumn ? `
        <td class="px-4 py-3 text-xs">
          ${isStockHandler() && p.status === 'pending' ? `
            <div class="flex gap-2">
              <button class="px-2 py-1 bg-green-100 text-green-700 rounded" onclick="event.stopPropagation(); confirmDelivery('${p.id}', true)">Approve</button>
              <button class="px-2 py-1 bg-red-100 text-red-700 rounded" onclick="event.stopPropagation(); confirmDelivery('${p.id}', false)">Cancel</button>
            </div>
          ` : '<span class="text-gray-400">-</span>'}
        </td>
        ` : ''}
      </tr>
    `;
  }
}

function getBatchStatus(batch) {
  const statuses = [...new Set(batch.map(p => p.status))];
  if (statuses.length === 1) return statuses[0];
  if (statuses.includes('cancelled')) return 'cancelled';
  if (statuses.includes('pending')) return 'pending';
  return 'completed';
}

// Show detailed info for a batch or single purchase
function showPurchaseDetails(type, id) {
  const state = getAppState();
  const purchases = state.purchases || [];
  
  if (type === 'batch') {
    const batch = purchases.filter(p => p.batchId === id);
    if (!batch.length) return;
    
    const batchStatus = getBatchStatus(batch);
    const dateCreated = batch[0].dateCreated;
    const dateDelivered = batch[0].dateDelivered;
    const purchaseType = batch[0].purchaseType || 'delivery';
    const paymentStatus = batch[0].paymentStatus || 'paid';
    const paymentStatusLabel = paymentStatus === 'paid' ? 'Paid' : 'Unpaid';
    
    const batchTotal = batch.reduce((sum, p) => sum + (p.price || 0), 0);

    const itemsHtml = batch.map(item => `
      <li class="py-1.5 text-sm font-semi-bold text-green-700 border-b last:border-0 border-gray-100">
        <span class="font-medium">${item.quantity} ${item.displayUnit}</span>
        <span class="ml-1">${item.itemName}</span>
        ${item.brandName ? `<span class="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">${item.brandName}</span>` : ''}
        <div class="text-xs text-gray-500 mt-0.5">
          Base: ${(item.quantity * item.conversionRatio).toFixed(2)} ${item.baseUnit} • ${formatCurrency(item.price)} • Status: ${item.status}
        </div>
      </li>
    `).join('');

    const body = `
      <div class="text-left text-sm text-gray-800">
        <div class="font-semibold">Batch Order</div>

        <div class="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-gray-500">Status</div>
            <div class="font-semibold capitalize">${batchStatus}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Purchase Type</div>
            <div class="font-semibold">${purchaseType === 'delivery' ? 'Delivery' : 'Personal Purchase'}</div>
          </div>
        </div>

        <div class="mt-3">
          <div class="text-xs text-gray-500">Payment Status</div>
          <div class="font-semibold">${paymentStatusLabel}</div>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-gray-500">Purchased Date</div>
            <div>${new Date(dateCreated).toLocaleDateString()}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Delivered Date</div>
            <div>${dateDelivered ? new Date(dateDelivered).toLocaleDateString() : 'Not yet Arrived'}</div>
          </div>
        </div>

        <div class="mt-3">
          <div class="font-semibold mb-1">Items (${batch.length})</div>
          <ul class="max-h-60 overflow-y-auto divide-y divide-gray-100">
            ${itemsHtml}
          </ul>
        </div>

        <div class="mt-3 pt-3 border-t border-gray-100">
          <div class="text-xs text-gray-500">Total Amount</div>
          <div class="text-lg font-semibold text-gray-900">${formatCurrency(batchTotal)}</div>
        </div>
      </div>
    `;
    
    showAlertModal('Batch Purchase Details', body, 'plain');
  } else {
    const purchase = purchases.find(p => p.id === id);
    if (!purchase) return;
    
    const purchaseType = purchase.purchaseType || 'delivery';
    const paymentStatus = purchase.paymentStatus || 'paid';
    const paymentStatusLabel = paymentStatus === 'paid' ? 'Paid' : 'Unpaid';

    const body = `
      <div class="text-left space-y-3 text-sm text-gray-800">
        <div>
          <div class="font-semibold">${purchase.itemName}</div>
          ${purchase.brandName ? `<div class="text-xs text-gray-500 mt-0.5">${purchase.brandName}</div>` : ''}
        </div>

        <div>
          <div class="text-xs text-gray-500">Total Price</div>
          <div class="text-lg font-semibold text-gray-900">${formatCurrency(purchase.price)}</div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-gray-500">Status</div>
            <div class="font-semibold capitalize">${purchase.status}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Purchase Type</div>
            <div class="font-semibold">${purchaseType === 'delivery' ? 'Delivery' : 'Personal Purchase'}</div>
          </div>
        </div>

        <div>
          <div class="text-xs text-gray-500">Payment Status</div>
          <div class="font-semibold">${paymentStatusLabel}</div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-gray-500">Quantity</div>
            <div>${purchase.quantity} ${purchase.displayUnit}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Base Quantity</div>
            <div>${(purchase.quantity * purchase.conversionRatio).toFixed(2)} ${purchase.baseUnit}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-gray-500">Category</div>
            <div>${purchase.category || 'N/A'}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Supplier</div>
            <div>${purchase.supplier || 'N/A'}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <div class="text-xs text-gray-500">Created</div>
            <div>${new Date(purchase.dateCreated).toLocaleDateString()}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Delivered</div>
            <div>${purchase.dateDelivered ? new Date(purchase.dateDelivered).toLocaleDateString() : 'Not yet delivered'}</div>
          </div>
        </div>
      </div>
    `;
    
    showAlertModal('Purchase Details', body, 'plain');
  }
}

// Old single-purchase card renderer kept for reference; not used anymore

async function confirmDelivery(id, isComplete) {
  const confirmed = await showConfirmModal(
    isComplete ? 'Confirm Delivery' : 'Cancel Purchase Order',
    isComplete ? 'Confirm delivery and add to inventory?' : 'Cancel this purchase order?',
    async () => {
      try {
        const response = await API.confirmDelivery(id, isComplete);
        if (response.success) {
          await loadState();
        } else {
          showAlertModal('Error', response.error || 'Failed to confirm delivery', 'error');
        }
      } catch (error) {
        console.error('Error confirming delivery:', error);
        showAlertModal('Error', 'Failed to confirm delivery', 'error');
      }
    }
  );
}

function showPartialDeliveryModal(batchId) {
  const state = getAppState();
  const batch = state.purchases.filter(p => p.batchId === batchId);
  const pendingItems = batch.filter(p => p.status === 'pending');
  const completedItems = batch.filter(p => p.status === 'completed');
  
  if (pendingItems.length === 0) {
    showAlertModal('Info', 'All items in this batch have already been processed.', 'info');
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'currentModal';
  modal.className = 'fixed inset-0 z-50 overflow-y-auto';
  modal.innerHTML = `
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onclick="closeModal()"></div>
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="mb-4">
            <h3 class="text-lg font-medium text-gray-900 mb-1">Review Delivery - Batch Order</h3>
            <p class="text-sm text-gray-500">Enter the actual quantity received for each item. If quantity is less than ordered, the remaining will stay pending for next delivery.</p>
          </div>
          
          ${completedItems.length > 0 ? `
            <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p class="text-xs font-medium text-green-800 mb-2">Already Received (${completedItems.length}):</p>
              <ul class="space-y-1">
                ${completedItems.map(item => `
                  <li class="text-xs text-green-700">✓ ${item.quantity} ${item.displayUnit} ${item.itemName} - Received on ${new Date(item.dateDelivered).toLocaleDateString()}</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          
          <div class="mb-4">
            <p class="text-sm font-medium text-gray-700 mb-3">Pending Items - Enter Received Quantity:</p>
            <div class="space-y-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
              ${pendingItems.map(item => {
                const orderedQty = item.quantity;
                const unitPrice = item.price / orderedQty;
                const state = getAppState();
                
                // Find current inventory for this item
                const inventoryItem = (state.inventory || []).find(inv => 
                  inv.name.toLowerCase() === item.itemName.toLowerCase() && inv.unit === item.baseUnit
                );
                const currentInventory = inventoryItem ? inventoryItem.quantity : 0;
                
                // Find other pending purchases for the same item (excluding current)
                const relatedPending = (state.purchases || []).filter(p => 
                  p.status === 'pending' && 
                  p.id !== item.id &&
                  p.itemName.toLowerCase() === item.itemName.toLowerCase() &&
                  p.baseUnit === item.baseUnit
                );
                const totalRelatedPending = relatedPending.reduce((sum, p) => sum + (p.quantity * p.conversionRatio), 0);
                
                return `
                <div class="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100">
                  <div class="flex items-start gap-3">
                    <input type="checkbox" value="${item.id}" data-item-id="${item.id}" data-ordered-qty="${orderedQty}" data-unit-price="${unitPrice}" data-display-unit="${item.displayUnit}" data-base-unit="${item.baseUnit}" data-conversion-ratio="${item.conversionRatio}" data-item-name="${item.itemName}" data-category="${item.category || ''}" class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded delivery-checkbox" checked onchange="toggleQuantityInput('${item.id}')">
                    <div class="flex-1">
                      <div class="flex items-center justify-between mb-2">
                        <div>
                          <span class="text-sm font-medium text-gray-900">${item.itemName}</span>
                          <span class="text-xs text-gray-500 ml-2">Ordered: ${orderedQty} ${item.displayUnit}</span>
                        </div>
                        <span class="text-xs font-medium text-blue-600">${formatCurrency(item.price)}</span>
                      </div>
                      
                      ${inventoryItem ? `
                        <div class="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                          <span class="text-gray-600">Current Inventory:</span>
                          <span class="font-semibold text-blue-700 ml-1">${currentInventory.toFixed(2)} ${item.baseUnit}</span>
                        </div>
                      ` : ''}
                      
                      ${relatedPending.length > 0 ? `
                        <div class="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                          <span class="text-gray-600">Other Pending Orders:</span>
                          <span class="font-semibold text-yellow-700 ml-1">${relatedPending.length} order(s) • ${totalRelatedPending.toFixed(2)} ${item.baseUnit} total</span>
                        </div>
                      ` : ''}
                      
                      <div class="flex items-center gap-2 mb-2">
                        <label class="text-xs text-gray-600 font-medium">Received:</label>
                        <input type="number" id="qty-${item.id}" step="0.01" min="0" value="${orderedQty}" class="w-24 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 quantity-input" onchange="validateQuantity('${item.id}', ${orderedQty})" oninput="updateItemTotal('${item.id}', ${unitPrice}, '${item.displayUnit}'); updateInventoryPreview('${item.id}', '${item.baseUnit}', ${item.conversionRatio}, ${currentInventory})">
                        <span class="text-xs text-gray-600">${item.displayUnit}</span>
                        <span class="text-xs text-gray-400">(ordered: ${orderedQty})</span>
                        <span id="total-${item.id}" class="text-xs font-medium text-green-600 ml-auto">${formatCurrency(orderedQty * unitPrice)}</span>
                      </div>
                      
                      <div id="inventory-preview-${item.id}" class="mb-2 p-2 bg-green-50 border border-green-200 rounded text-xs hidden">
                        <span class="text-gray-600">Will add to inventory:</span>
                        <span id="add-qty-${item.id}" class="font-semibold text-green-700 ml-1"></span>
                        <span class="text-gray-600 ml-1">→ New total:</span>
                        <span id="new-total-${item.id}" class="font-semibold text-green-700 ml-1"></span>
                      </div>
                      
                      <p class="text-xs text-gray-500 mt-1">
                        Base: <span id="base-${item.id}">${(orderedQty * item.conversionRatio).toFixed(2)}</span> ${item.baseUnit} • Category: ${item.category || 'N/A'}
                      </p>
                      
                      ${item.receivedQty !== undefined && item.receivedQty < orderedQty ? `
                        <p id="warning-${item.id}" class="text-xs text-yellow-600 mt-1">
                          ⚠️ Remaining ${(orderedQty - item.receivedQty).toFixed(2)} ${item.displayUnit} will stay pending
                        </p>
                      ` : ''}
                    </div>
                  </div>
                </div>
              `;
              }).join('')}
            </div>
          </div>
          
          <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <label class="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" id="includePendingItems" checked class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
              <div class="flex-1">
                <span class="text-sm font-medium text-blue-900">Include All Delivered Quantity in Inventory</span>
                <p class="text-xs text-blue-700 mt-1">When checked, the full delivered quantity will be added to inventory, even if it exceeds the ordered amount. Excess quantities will be added to inventory automatically.</p>
              </div>
            </label>
          </div>
          
          <div class="flex items-center justify-between text-sm text-gray-600 mb-4">
            <div>
              <span>Selected: <span id="selectedCount" class="font-medium text-blue-600">${pendingItems.length}</span> of ${pendingItems.length} items</span>
              <span class="ml-4">Total: <span id="totalAmount" class="font-medium text-green-600">${formatCurrency(pendingItems.reduce((sum, item) => sum + item.price, 0))}</span></span>
            </div>
            <button type="button" onclick="toggleAllItems()" class="text-blue-600 hover:text-blue-800 text-xs font-medium">
              Toggle All
            </button>
          </div>
          
          <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <button type="button" onclick="confirmSelectedItems('${batchId}')" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:col-start-2 sm:text-sm">
              Confirm Selected Items
            </button>
            <button type="button" onclick="closeModal()" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  window.currentModal = modal;
  
  // Add event listeners for checkboxes and quantity inputs
  const checkboxes = modal.querySelectorAll('.delivery-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      updateSelectedCount();
      updateTotalAmount();
      const itemId = checkbox.dataset.itemId;
      toggleQuantityInput(itemId);
    });
  });
  
  const quantityInputs = modal.querySelectorAll('.quantity-input');
  quantityInputs.forEach(input => {
    input.addEventListener('input', () => {
      updateTotalAmount();
      // Update inventory preview for this item
      const itemId = input.id.replace('qty-', '');
      const checkbox = document.querySelector(`input[data-item-id="${itemId}"]`);
      if (checkbox) {
        const baseUnit = checkbox.dataset.baseUnit;
        const conversionRatio = parseFloat(checkbox.dataset.conversionRatio);
        const state = getAppState();
        const inventoryItem = (state.inventory || []).find(inv => 
          inv.name.toLowerCase() === checkbox.dataset.itemName.toLowerCase() && inv.unit === baseUnit
        );
        const currentInventory = inventoryItem ? inventoryItem.quantity : 0;
        updateInventoryPreview(itemId, baseUnit, conversionRatio, currentInventory);
      }
    });
  });
  
  // Also update preview when quantity changes via oninput
  quantityInputs.forEach(input => {
    const itemId = input.id.replace('qty-', '');
    const checkbox = document.querySelector(`input[data-item-id="${itemId}"]`);
    if (checkbox) {
      const baseUnit = checkbox.dataset.baseUnit;
      const conversionRatio = parseFloat(checkbox.dataset.conversionRatio);
      const state = getAppState();
      const inventoryItem = (state.inventory || []).find(inv => 
        inv.name.toLowerCase() === checkbox.dataset.itemName.toLowerCase() && inv.unit === baseUnit
      );
      const currentInventory = inventoryItem ? inventoryItem.quantity : 0;
      // Trigger initial preview update
      setTimeout(() => updateInventoryPreview(itemId, baseUnit, conversionRatio, currentInventory), 100);
    }
  });
  
  // Initialize inventory previews for all items
  pendingItems.forEach(item => {
    const checkbox = document.querySelector(`input[data-item-id="${item.id}"]`);
    if (checkbox) {
      const state = getAppState();
      const inventoryItem = (state.inventory || []).find(inv => 
        inv.name.toLowerCase() === item.itemName.toLowerCase() && inv.unit === item.baseUnit
      );
      const currentInventory = inventoryItem ? inventoryItem.quantity : 0;
      updateInventoryPreview(item.id, item.baseUnit, item.conversionRatio, currentInventory);
    }
  });
  
  updateSelectedCount();
  updateTotalAmount();
}

function toggleQuantityInput(itemId) {
  const checkbox = document.querySelector(`input[data-item-id="${itemId}"]`);
  const quantityInput = document.getElementById(`qty-${itemId}`);
  const warning = document.getElementById(`warning-${itemId}`);
  
  if (checkbox && quantityInput) {
    quantityInput.disabled = !checkbox.checked;
    if (!checkbox.checked) {
      const orderedQty = parseFloat(checkbox.dataset.orderedQty);
      quantityInput.value = orderedQty;
      validateQuantity(itemId, orderedQty);
    }
  }
}

function updateInventoryPreview(itemId, baseUnit, conversionRatio, currentInventory) {
  const quantityInput = document.getElementById(`qty-${itemId}`);
  const previewDiv = document.getElementById(`inventory-preview-${itemId}`);
  const addQtySpan = document.getElementById(`add-qty-${itemId}`);
  const newTotalSpan = document.getElementById(`new-total-${itemId}`);
  
  if (!quantityInput || !previewDiv || !addQtySpan || !newTotalSpan) return;
  
  const receivedQty = parseFloat(quantityInput.value) || 0;
  if (receivedQty <= 0) {
    previewDiv.classList.add('hidden');
    return;
  }
  
  const checkbox = document.querySelector(`input[data-item-id="${itemId}"]`);
  if (!checkbox) return;
  
  const receivedBaseQty = receivedQty * conversionRatio;
  
  // Calculate related pending orders that will be auto-completed
  const state = getAppState();
  const itemName = checkbox.dataset.itemName;
  const relatedPending = (state.purchases || []).filter(p => 
    p.status === 'pending' && 
    p.id !== itemId &&
    p.itemName.toLowerCase() === itemName.toLowerCase() &&
    p.baseUnit === baseUnit
  );
  
  // Calculate total pending quantity that will be auto-completed
  // The auto-complete will deduct from inventory, so we need to account for that
  let totalPendingToDeduct = 0;
  const currentInventoryAfterAdd = parseFloat(currentInventory) + receivedBaseQty;
  
  // Simulate what autoCompletePendingPurchases will do
  let availableQty = currentInventoryAfterAdd;
  relatedPending.forEach(pending => {
    const pendingBaseQty = pending.quantity * pending.conversionRatio;
    if (availableQty >= pendingBaseQty) {
      totalPendingToDeduct += pendingBaseQty;
      availableQty -= pendingBaseQty;
    }
  });
  
  // Net amount that will actually be added to inventory
  const netAdded = receivedBaseQty - totalPendingToDeduct;
  const newTotal = parseFloat(currentInventory) + netAdded;
  
  // Show gross addition and net result
  if (totalPendingToDeduct > 0) {
    addQtySpan.innerHTML = `<span class="text-green-700">${receivedBaseQty.toFixed(2)} ${baseUnit}</span> <span class="text-gray-500">(net: ${netAdded.toFixed(2)} ${baseUnit})</span>`;
    addQtySpan.title = `${receivedBaseQty.toFixed(2)} ${baseUnit} will be added, but ${totalPendingToDeduct.toFixed(2)} ${baseUnit} will be deducted for auto-completing ${relatedPending.length} pending order(s)`;
  } else {
    addQtySpan.textContent = `${receivedBaseQty.toFixed(2)} ${baseUnit}`;
  }
  newTotalSpan.textContent = `${newTotal.toFixed(2)} ${baseUnit}`;
  previewDiv.classList.remove('hidden');
}

function validateQuantity(itemId, orderedQty) {
  const quantityInput = document.getElementById(`qty-${itemId}`);
  const warning = document.getElementById(`warning-${itemId}`);
  const checkbox = document.querySelector(`input[data-item-id="${itemId}"]`);
  
  if (!quantityInput || !checkbox) return;
  
  const receivedQty = parseFloat(quantityInput.value) || 0;
  const ordered = parseFloat(orderedQty);
  
  // Allow receiving more than ordered - excess will be added to inventory
  // Only validate that it's not negative
  if (receivedQty < 0) {
    quantityInput.value = 0;
    updateItemTotal(itemId, parseFloat(checkbox.dataset.unitPrice), checkbox.dataset.displayUnit);
    return;
  }
  
  // Show warning/info if partial quantity or excess
  if (warning) {
    if (receivedQty < ordered && receivedQty > 0) {
      const remaining = ordered - receivedQty;
      warning.textContent = `⚠️ Remaining ${remaining.toFixed(2)} ${checkbox.dataset.displayUnit} will stay pending`;
      warning.classList.remove('hidden');
      warning.classList.remove('text-blue-600');
      warning.classList.add('text-yellow-600');
    } else if (receivedQty > ordered) {
      const excess = receivedQty - ordered;
      warning.textContent = `ℹ️ Excess ${excess.toFixed(2)} ${checkbox.dataset.displayUnit} will be added to inventory`;
      warning.classList.remove('hidden');
      warning.classList.remove('text-yellow-600');
      warning.classList.add('text-blue-600');
    } else {
      warning.classList.add('hidden');
    }
  }
  
  // Update base quantity display
  const baseQty = receivedQty * parseFloat(checkbox.dataset.conversionRatio);
  const baseDisplay = document.getElementById(`base-${itemId}`);
  if (baseDisplay) {
    baseDisplay.textContent = baseQty.toFixed(2);
  }
}

function updateItemTotal(itemId, unitPrice, displayUnit) {
  const quantityInput = document.getElementById(`qty-${itemId}`);
  const totalDisplay = document.getElementById(`total-${itemId}`);
  
  if (quantityInput && totalDisplay) {
    const qty = parseFloat(quantityInput.value) || 0;
    const total = qty * unitPrice;
    totalDisplay.textContent = formatCurrency(total);
  }
  
  updateTotalAmount();
}

function updateTotalAmount() {
  const modal = document.getElementById('currentModal');
  if (!modal) return;
  
  const checkedBoxes = modal.querySelectorAll('.delivery-checkbox:checked');
  let total = 0;
  
  checkedBoxes.forEach(checkbox => {
    const itemId = checkbox.dataset.itemId;
    const quantityInput = document.getElementById(`qty-${itemId}`);
    if (quantityInput) {
      const qty = parseFloat(quantityInput.value) || 0;
      const unitPrice = parseFloat(checkbox.dataset.unitPrice);
      total += qty * unitPrice;
    }
  });
  
  const totalDisplay = document.getElementById('totalAmount');
  if (totalDisplay) {
    totalDisplay.textContent = formatCurrency(total);
  }
}

function toggleAllItems() {
  const modal = document.getElementById('currentModal');
  if (!modal) return;
  const checkboxes = modal.querySelectorAll('.delivery-checkbox');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => {
    cb.checked = !allChecked;
    const itemId = cb.dataset.itemId;
    toggleQuantityInput(itemId);
  });
  updateSelectedCount();
  updateTotalAmount();
}

function updateSelectedCount() {
  const modal = document.getElementById('currentModal');
  if (!modal) return;
  const checkboxes = modal.querySelectorAll('.delivery-checkbox');
  const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
  const totalCount = checkboxes.length;
  const countElement = document.getElementById('selectedCount');
  if (countElement) {
    countElement.textContent = selectedCount;
  }
}

async function confirmSelectedItems(batchId) {
  const modal = document.getElementById('currentModal') || window.currentModal;
  if (!modal) return;
  
  const checkedBoxes = modal.querySelectorAll('.delivery-checkbox:checked');
  
  if (checkedBoxes.length === 0) {
    showAlertModal('Validation Error', 'Please select at least one item to confirm.', 'warning');
    return;
  }
  
  // Collect items with quantities
  const itemsToConfirm = [];
  checkedBoxes.forEach(checkbox => {
    const itemId = checkbox.value;
    const quantityInput = document.getElementById(`qty-${itemId}`);
    const receivedQty = parseFloat(quantityInput.value) || 0;
    const orderedQty = parseFloat(checkbox.dataset.orderedQty);
    
    if (receivedQty > 0) {
      itemsToConfirm.push({
        id: itemId,
        receivedQty: receivedQty,
        orderedQty: orderedQty,
        displayUnit: checkbox.dataset.displayUnit,
        itemName: checkbox.dataset.itemName
      });
    }
  });
  
  if (itemsToConfirm.length === 0) {
    showAlertModal('Validation Error', 'Please enter valid quantities for at least one item.', 'warning');
    return;
  }
  
  // Build confirmation message
  const itemsSummary = itemsToConfirm.map(item => {
    if (item.receivedQty < item.orderedQty) {
      return `${item.receivedQty} ${item.displayUnit} ${item.itemName} (${item.orderedQty - item.receivedQty} pending)`;
    }
    return `${item.receivedQty} ${item.displayUnit} ${item.itemName}`;
  }).join(', ');
  
  const confirmationMessage = `Confirm delivery for:\n${itemsSummary}\n\nPartial quantities will create pending orders for remaining items.`;
  
  const confirmed = await showConfirmModal(
    'Confirm Delivery',
    confirmationMessage.replace(/\n/g, '<br>'),
    async () => {
      try {
        // Confirm items with partial quantities
        for (const item of itemsToConfirm) {
          await API.confirmDeliveryPartial(item.id, item.receivedQty);
        }
        
        closeModal();
        await loadState();
      } catch (error) {
        console.error('Error confirming selected items:', error);
        showAlertModal('Error', 'Failed to confirm delivery. Please try again.', 'error');
      }
    }
  );
}

async function confirmBatchDelivery(batchId, isComplete) {
  const confirmed = await showConfirmModal(
    isComplete ? 'Confirm Batch Delivery' : 'Cancel Batch Order',
    isComplete ? 'Confirm delivery for all items in this batch?' : 'Cancel all items in this batch?',
    async () => {
      try {
        const state = getAppState();
        const batch = state.purchases.filter(p => p.batchId === batchId && p.status === 'pending');
        
        if (batch.length === 0) {
          showAlertModal('Info', 'No pending items in this batch', 'info');
          return;
        }
        
        // Confirm all items in the batch
        for (const purchase of batch) {
          await API.confirmDelivery(purchase.id, isComplete);
        }
        
        await loadState();
      } catch (error) {
        console.error('Error confirming batch delivery:', error);
        showAlertModal('Error', 'Failed to confirm batch delivery', 'error');
      }
    }
  );
}

function showAddPurchaseForm() {
  const state = getAppState();
  const user = state.currentUser;
  if (!user) return;

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 overflow-y-auto';
  modal.innerHTML = `
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onclick="closeModal()"></div>
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
        <div class="bg-white">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-xl font-semibold text-gray-900">Create Batch Purchase Order</h3>
                <p class="text-sm text-gray-500 mt-1">Quickly add multiple items to your purchase order</p>
              </div>
              <div id="batchPurchaseTotal" class="text-right">
                <p class="text-2xl font-bold text-blue-600"><span id="batchTotalAmount">${formatCurrency(0)}</span></p>
                <p class="text-xs text-gray-500"><span id="batchItemCount">0</span> items</p>
              </div>
            </div>
            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Purchase Type *</label>
              <div class="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                <div class="flex gap-4">
                  <label class="flex items-center">
                    <input type="radio" name="purchaseType" value="delivery" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                    <span class="ml-2 text-sm text-gray-700">Delivery</span>
                  </label>
                  <label class="flex items-center">
                    <input type="radio" name="purchaseType" value="personal" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                    <span class="ml-2 text-sm text-gray-700">Personal Purchase</span>
                  </label>
                </div>
                <p id="purchaseTypeError" class="mt-2 sm:mt-0 text-xs text-red-600 font-medium hidden">Please select a purchase type.</p>
              </div>
            </div>
            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Payment Status *</label>
              <div class="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                <div class="flex gap-4">
                  <label class="flex items-center">
                    <input type="radio" name="paymentStatus" value="paid" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                    <span class="ml-2 text-sm text-gray-700">Paid</span>
                  </label>
                  <label class="flex items-center">
                    <input type="radio" name="paymentStatus" value="unpaid" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300">
                    <span class="ml-2 text-sm text-gray-700">Unpaid</span>
                  </label>
                </div>
                <p id="paymentStatusError" class="mt-2 sm:mt-0 text-xs text-red-600 font-medium hidden">Please select a payment status.</p>
              </div>
            </div>
          </div>

          <!-- Two Column Layout -->
          <div class="flex flex-col lg:flex-row h-[70vh]">
            <!-- Left Panel: Quick Add Form -->
            <div class="lg:w-1/3 border-r border-gray-200 bg-gray-50 p-6 overflow-y-auto">
              <h4 class="text-sm font-semibold text-gray-900 mb-4">Quick Add Item</h4>
              <form onsubmit="addItemFromQuickForm(event)" id="quickAddForm" class="space-y-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Item Name *</label>
                  <input type="text" id="quickItemName" required placeholder="e.g., Rice, Sugar" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Brand Name</label>
                  <input type="text" id="quickBrandName" placeholder="e.g., Brand A" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                  <select id="quickCategory" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Select Category</option>
                    <option value="Dry Goods">Dry Goods</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Meat & Poultry">Meat & Poultry</option>
                    <option value="Fruits & Vegetables">Fruits & Vegetables</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Spices & Seasonings">Spices & Seasonings</option>
                    <option value="Baking Supplies">Baking Supplies</option>
                    <option value="Canned Goods">Canned Goods</option>
                    <option value="Frozen Foods">Frozen Foods</option>
                    <option value="Condiments">Condiments</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
                  <input type="number" id="quickQuantity" step="0.01" required min="0.01" placeholder="1" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Display Unit *</label>
                  <select id="quickDisplayUnit" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    <option value="sack">Sack</option>
                    <option value="box">Box</option>
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="pcs">pcs</option>
                    <option value="pack">Pack</option>
                    <option value="bottle">Bottle</option>
                    <option value="can">Can</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Base Unit *</label>
                  <select id="quickBaseUnit" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="ml">ml</option>
                    <option value="pcs">pcs</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Ratio *</label>
                  <input type="number" id="quickConversionRatio" step="0.01" required min="0.01" placeholder="1" value="1" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input type="date" id="quickExpiryDate" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Price per Unit (₱) *</label>
                  <input type="number" id="quickPrice" step="0.01" required min="0.01" placeholder="0.00" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  <p class="mt-1 text-xs text-gray-500">Price for one <span id="priceUnitLabel">unit</span>. Total = Quantity × Price</p>
                </div>
              </div>
                <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm font-medium transition-colors">
                  + Add to List
                </button>
              </form>
            </div>

            <!-- Right Panel: Items List -->
            <div class="lg:w-2/3 p-6 overflow-y-auto">
              <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                  <h4 class="text-sm font-semibold text-gray-900 mb-3">Purchase Items</h4>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Supplier (for all items)</label>
                    <input type="text" id="batchSupplier" placeholder="e.g., ABC Suppliers, XYZ Company" class="block w-full max-w-md border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  </div>
                </div>
                <div class="flex flex-col items-end gap-1">
                  <label for="batchReceiptUpload" class="cursor-pointer flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    Upload Receipt *
                  </label>
                  <input type="file" id="batchReceiptUpload" accept="image/*,.pdf" required class="hidden" onchange="handleReceiptUpload(event)">
                  <div class="mt-1 flex items-center gap-2">
                    <span id="receiptFileName" class="text-xs text-gray-500 hidden"></span>
                    <button type="button" id="removeReceiptBtn" onclick="removeReceipt()" class="hidden text-xs text-red-600 hover:text-red-800">Remove</button>
                  </div>
                  <p id="receiptRequiredMessage" class="mt-1 text-xs text-gray-500">Receipt is required for batch purchases</p>
                  <p id="receiptErrorMessage" class="mt-1 text-xs text-red-600 font-medium hidden">Receipt is required. Please upload a receipt before creating the batch order.</p>
                </div>
              </div>
              <div id="purchaseItemsList" class="space-y-3">
                <div class="text-center py-12 text-gray-400">
                  <svg class="mx-auto h-12 w-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                  <p class="text-sm">No items added yet</p>
                  <p class="text-xs mt-1">Use the form on the left to add items</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button type="button" onclick="closeModal()" class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onclick="submitBatchPurchaseFromList()" id="submitBatchBtn" disabled class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              Create Batch Order
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  window.currentModal = modal;
  window.batchPurchaseModal = modal; // Store reference to batch purchase modal
  window.purchaseItems = []; // Store items in memory
  
  // Add event listener to update display when purchase type changes
  const purchaseTypeInputs = document.querySelectorAll('input[name="purchaseType"]');
  purchaseTypeInputs.forEach(input => {
    input.addEventListener('change', () => {
      renderPurchaseItemsList();
    });
  });

  // Update price unit label
  updatePriceUnitLabel();
  
  // Update price unit label when display unit changes
  const displayUnitSelect = document.getElementById('quickDisplayUnit');
  if (displayUnitSelect) {
    displayUnitSelect.addEventListener('change', updatePriceUnitLabel);
    updatePriceUnitLabel();
  }
  
  // Focus on first input
  setTimeout(() => {
    document.getElementById('quickItemName')?.focus();
  }, 100);
}

function updatePriceUnitLabel() {
  const displayUnit = document.getElementById('quickDisplayUnit')?.value || 'unit';
  const priceUnitLabel = document.getElementById('priceUnitLabel');
  if (priceUnitLabel) {
    priceUnitLabel.textContent = displayUnit;
  }
}

function updatePriceUnitLabel() {
  const displayUnit = document.getElementById('quickDisplayUnit')?.value || 'unit';
  const priceUnitLabel = document.getElementById('priceUnitLabel');
  if (priceUnitLabel) {
    priceUnitLabel.textContent = displayUnit;
  }
}

function addItemFromQuickForm(event) {
  event.preventDefault();
  
  const itemName = document.getElementById('quickItemName').value.trim();
  const brandNameInput = document.getElementById('quickBrandName');
  const brandName = brandNameInput ? brandNameInput.value.trim() : '';
  const category = document.getElementById('quickCategory').value;
  const expiryDateInput = document.getElementById('quickExpiryDate');
  const expiryDate = expiryDateInput ? expiryDateInput.value : '';
  const supplier = document.getElementById('batchSupplier') ? document.getElementById('batchSupplier').value.trim() : '';
  const quantity = parseFloat(document.getElementById('quickQuantity').value);
  const displayUnit = document.getElementById('quickDisplayUnit').value;
  const baseUnit = document.getElementById('quickBaseUnit').value;
  const conversionRatio = parseFloat(document.getElementById('quickConversionRatio').value) || 1;
  const unitPrice = parseFloat(document.getElementById('quickPrice').value); // Price per unit
  const totalPrice = quantity * unitPrice; // Calculate total price

  if (!itemName || !category || !quantity || quantity <= 0 || !conversionRatio || conversionRatio <= 0 || !unitPrice || unitPrice <= 0) {
    showAlertModal('Validation Error', 'Please fill in all required fields with valid values', 'warning');
    return;
  }

  // Add item to memory - store total price (quantity × unit price)
  const item = {
    id: Date.now() + Math.random(),
    itemName,
    brandName,
    category,
    supplier,
    expiryDate,
    quantity,
    displayUnit,
    baseUnit,
    conversionRatio,
    price: totalPrice, // Store total price (quantity × unit price)
    unitPrice: unitPrice // Store unit price for reference/display
  };

  if (!window.purchaseItems) window.purchaseItems = [];
  window.purchaseItems.push(item);

  // Render items list
  renderPurchaseItemsList();
  
  // Clear form and focus on item name
  document.getElementById('quickAddForm').reset();
  document.getElementById('quickConversionRatio').value = '1';
  document.getElementById('quickItemName').focus();
  
  updateBatchTotal();
}

function renderPurchaseItemsList() {
  const itemsList = document.getElementById('purchaseItemsList');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const submitBtn = document.getElementById('submitBatchBtn');
  
  if (!itemsList || !window.purchaseItems) return;

  if (window.purchaseItems.length === 0) {
    itemsList.innerHTML = `
      <div class="text-center py-12 text-gray-400">
        <svg class="mx-auto h-12 w-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>
        <p class="text-sm">No items added yet</p>
        <p class="text-xs mt-1">Use the form on the left to add items</p>
      </div>
    `;
    if (clearAllBtn) clearAllBtn.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  if (clearAllBtn) clearAllBtn.style.display = 'block';
  if (submitBtn) submitBtn.disabled = false;

  // Get current purchase type for display
  const purchaseTypeInput = document.querySelector('input[name="purchaseType"]:checked');
  const currentPurchaseType = purchaseTypeInput ? purchaseTypeInput.value : 'delivery';
  const purchaseTypeLabel = currentPurchaseType === 'delivery' ? 'Delivery' : 'Personal Purchase';
  const purchaseTypeColor = currentPurchaseType === 'delivery' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';

  itemsList.innerHTML = window.purchaseItems.map((item, index) => `
    <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow" data-item-id="${item.id}">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2 flex-wrap">
            <span class="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">#${index + 1}</span>
            <h5 class="text-sm font-semibold text-gray-900">${item.itemName}</h5>
            <span class="text-xs font-medium px-2 py-0.5 rounded ${purchaseTypeColor}">${purchaseTypeLabel}</span>
          </div>
          <div class="grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div>
              <span class="text-gray-500">Category:</span>
              <span class="font-medium ml-1">${item.category || 'N/A'}</span>
            </div>
            <div>
              <span class="text-gray-500">Quantity:</span>
              <span class="font-medium ml-1">${item.quantity} ${item.displayUnit}</span>
            </div>
            <div>
              <span class="text-gray-500">Base:</span>
              <span class="font-medium ml-1">${(item.quantity * item.conversionRatio).toFixed(2)} ${item.baseUnit}</span>
            </div>
            <div>
              <span class="text-gray-500">Total Price:</span>
              <span class="font-medium ml-1 text-blue-600">${formatCurrency(item.price)}</span>
              ${item.unitPrice ? `<span class="text-xs text-gray-400 ml-1">(${formatCurrency(item.unitPrice)}/${item.displayUnit})</span>` : ''}
            </div>
          </div>
        </div>
        <button type="button" onclick="removePurchaseItemById('${item.id}')" class="ml-4 text-red-600 hover:text-red-800 text-sm font-medium" title="Remove">
          Remove
        </button>
      </div>
    </div>
  `).join('');
}

function removePurchaseItemById(itemId) {
  if (!window.purchaseItems) return;
  // Convert itemId to number for proper comparison (item.id is a number)
  const idToRemove = typeof itemId === 'string' ? parseFloat(itemId) : itemId;
  window.purchaseItems = window.purchaseItems.filter(item => {
    // Compare both as numbers to handle type mismatch
    return Number(item.id) !== Number(idToRemove);
  });
  renderPurchaseItemsList();
  updateBatchTotal();
}

async function clearAllPurchaseItems() {
  const confirmed = await showConfirmModal(
    'Clear All Items',
    'Are you sure you want to remove all items?',
    () => {
      window.purchaseItems = [];
      renderPurchaseItemsList();
      updateBatchTotal();
    }
  );
}

function removePurchaseItemRow(counter) {
  const row = document.getElementById(`purchase-item-row-${counter}`);
  if (row) {
    row.remove();
    updateBatchTotal();
  }
}

function updateBatchTotal() {
  const totalAmount = document.getElementById('batchTotalAmount');
  const itemCount = document.getElementById('batchItemCount');
  if (!totalAmount || !itemCount) return;

  if (!window.purchaseItems || window.purchaseItems.length === 0) {
    totalAmount.textContent = formatCurrency(0);
    itemCount.textContent = '0';
    return;
  }

  const total = window.purchaseItems.reduce((sum, item) => sum + (item.price || 0), 0);
  totalAmount.textContent = formatCurrency(total);
  itemCount.textContent = window.purchaseItems.length;
}

function handlePurchaseRowKeydown(event, currentRowIndex) {
  // Allow Enter key to move to next row or add new row
  if (event.key === 'Enter') {
    event.preventDefault();
    const currentInput = event.target;
    const currentRow = document.getElementById(`purchase-item-row-${currentRowIndex}`);
    if (!currentRow) return;

    // Find all inputs in current row
    const inputs = currentRow.querySelectorAll('input, select');
    const currentIndex = Array.from(inputs).indexOf(currentInput);
    
    if (currentIndex < inputs.length - 1) {
      // Move to next input in same row
      inputs[currentIndex + 1].focus();
      if (inputs[currentIndex + 1].tagName === 'SELECT') {
        inputs[currentIndex + 1].focus();
      }
    } else {
      // Move to next row or create new one
      const allRows = Array.from(document.querySelectorAll('[id^="purchase-item-row-"]'));
      const currentRowElement = allRows.find(row => row.id === `purchase-item-row-${currentRowIndex}`);
      const currentRowPosition = allRows.indexOf(currentRowElement);
      
      if (currentRowPosition < allRows.length - 1) {
        // Move to first input of next row
        const nextRow = allRows[currentRowPosition + 1];
        const nextInputs = nextRow.querySelectorAll('input, select');
        if (nextInputs.length > 0) {
          nextInputs[0].focus();
        }
      } else {
        // Add new row and focus on it
        addPurchaseItemRow();
        setTimeout(() => {
          const newRowIndex = window.purchaseItemCounter - 1;
          const newRow = document.getElementById(`purchase-item-row-${newRowIndex}`);
          if (newRow) {
            const firstInput = newRow.querySelector('input[name^="item-name-"]');
            if (firstInput) firstInput.focus();
          }
        }, 50);
      }
    }
  }
  
  // Allow Tab for normal navigation
  // Delete key to remove empty rows
  if (event.key === 'Delete' && event.ctrlKey) {
    const nameInput = currentRow.querySelector('input[name^="item-name-"]');
    const priceInput = currentRow.querySelector('input[name^="item-price-"]');
    if ((!nameInput || !nameInput.value.trim()) && (!priceInput || !priceInput.value)) {
      removePurchaseItemRow(currentRowIndex);
    }
  }
}

async function submitBatchPurchaseFromList() {
  const state = getAppState();
  const user = state.currentUser;
  if (!user) return;

  const submitBtn = document.getElementById('submitBatchBtn');
  const originalText = submitBtn.textContent;
  
  if (!window.purchaseItems || window.purchaseItems.length === 0) {
    showAlertModal('Validation Error', 'Please add at least one item to the purchase order', 'warning');
    return;
  }

  // Get purchase type (required)
  const purchaseTypeInput = document.querySelector('input[name="purchaseType"]:checked');
  const purchaseTypeError = document.getElementById('purchaseTypeError');
  if (!purchaseTypeInput) {
    if (purchaseTypeError) {
      purchaseTypeError.classList.remove('hidden');
    }
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    return;
  }
  if (purchaseTypeError) {
    purchaseTypeError.classList.add('hidden');
  }
  const purchaseType = purchaseTypeInput.value;

  // Get payment status (required)
  const paymentStatusInput = document.querySelector('input[name="paymentStatus"]:checked');
  const paymentStatusError = document.getElementById('paymentStatusError');
  if (!paymentStatusInput) {
    if (paymentStatusError) {
      paymentStatusError.classList.remove('hidden');
    }
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    return;
  }
  if (paymentStatusError) {
    paymentStatusError.classList.add('hidden');
  }
  const paymentStatus = paymentStatusInput.value;

  // Get batch supplier
  const batchSupplierInput = document.getElementById('batchSupplier');
  const batchSupplier = batchSupplierInput ? batchSupplierInput.value.trim() : '';

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating...';

  // Convert items to API format (use batch supplier for all items)
  const items = window.purchaseItems.map(item => ({
    itemName: item.itemName,
    brandName: item.brandName || '',
    category: item.category || '',
    supplier: batchSupplier || '',
    expiryDate: item.expiryDate || '',
    quantity: item.quantity,
    displayUnit: item.displayUnit,
    baseUnit: item.baseUnit,
    conversionRatio: item.conversionRatio,
    price: item.price,
    purchaseType: purchaseType,
    paymentStatus: paymentStatus
  }));

  // Handle receipt upload (required)
  const receiptInput = document.getElementById('batchReceiptUpload');
  const receiptErrorMessage = document.getElementById('receiptErrorMessage');
  const receiptRequiredMessage = document.getElementById('receiptRequiredMessage');
  
  if (!receiptInput || !receiptInput.files || receiptInput.files.length === 0) {
    // Show inline error message instead of alert modal
    if (receiptErrorMessage) {
      receiptErrorMessage.classList.remove('hidden');
    }
    if (receiptRequiredMessage) {
      receiptRequiredMessage.classList.add('hidden');
    }
    // Scroll to receipt area to make error visible
    receiptInput.closest('div')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    return;
  }
  
  // Clear error message if receipt is present
  if (receiptErrorMessage) {
    receiptErrorMessage.classList.add('hidden');
  }
  if (receiptRequiredMessage) {
    receiptRequiredMessage.classList.remove('hidden');
  }

  let receiptPath = null;
  try {
    submitBtn.textContent = 'Uploading receipt...';
    const uploadResponse = await API.uploadReceipt(receiptInput.files[0]);
    if (uploadResponse.success) {
      receiptPath = uploadResponse.receiptPath;
    } else {
      showAlertModal('Upload Error', uploadResponse.error || 'Failed to upload receipt', 'warning');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }
  } catch (error) {
    console.error('Error uploading receipt:', error);
    showAlertModal('Upload Error', 'Failed to upload receipt: ' + error.message, 'warning');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    return;
  }

  const data = {
    purchaserId: user.id || '',
    purchaseType: purchaseType,
    items: items,
    receiptPath: receiptPath
  };

  try {
    submitBtn.textContent = 'Creating...';
    const response = await API.addPurchase(data);
    if (response.success) {
      // Clear local state
      window.purchaseItems = [];
      renderPurchaseItemsList();
      updateBatchTotal();

      // Reload main state to show new purchase in the list
      await loadState();

      // Close the batch purchase modal so it does NOT reopen
      closeModal();

      // Show success message
      await showAlertModal('Success', 'Batch purchase order created successfully!', 'success');

      // Re-enable button
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    } else {
          showAlertModal('Error', response.error || 'Failed to create purchase order', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  } catch (error) {
    console.error('Error creating purchase:', error);
        showAlertModal('Error', 'Failed to create purchase order', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Keep old function for backward compatibility
async function submitBatchPurchase(event) {
  if (event) event.preventDefault();
  await submitBatchPurchaseFromList();
}

function closeModal() {
  if (window.currentModal) {
    window.currentModal.remove();
    window.currentModal = null;
  }
  // Also clear batch purchase modal reference
  if (window.batchPurchaseModal) {
    window.batchPurchaseModal = null;
  }
  // Also remove by ID if exists
  const modalById = document.getElementById('currentModal');
  if (modalById) {
    modalById.remove();
  }
}

function handleLogout() {
  logout();
}

window.handleLogout = handleLogout;
window.confirmDelivery = confirmDelivery;
window.confirmBatchDelivery = confirmBatchDelivery;
window.showPartialDeliveryModal = showPartialDeliveryModal;
window.confirmSelectedItems = confirmSelectedItems;
window.toggleAllItems = toggleAllItems;
window.updateSelectedCount = updateSelectedCount;
window.toggleQuantityInput = toggleQuantityInput;
window.validateQuantity = validateQuantity;
window.updateItemTotal = updateItemTotal;
window.updateTotalAmount = updateTotalAmount;
window.showAddPurchaseForm = showAddPurchaseForm;
window.addItemFromQuickForm = addItemFromQuickForm;
window.removePurchaseItemById = removePurchaseItemById;
window.clearAllPurchaseItems = clearAllPurchaseItems;
// Receipt upload handlers
function handleReceiptUpload(event) {
  const fileInput = event.target;
  const file = fileInput.files[0];
  const fileNameSpan = document.getElementById('receiptFileName');
  const removeBtn = document.getElementById('removeReceiptBtn');
  const receiptErrorMessage = document.getElementById('receiptErrorMessage');
  const receiptRequiredMessage = document.getElementById('receiptRequiredMessage');
  
  if (file) {
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      if (receiptErrorMessage) {
        receiptErrorMessage.textContent = 'File is too large. Please choose a file smaller than 10MB.';
        receiptErrorMessage.classList.remove('hidden');
      }
      if (receiptRequiredMessage) {
        receiptRequiredMessage.classList.add('hidden');
      }
      fileInput.value = '';
      return;
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      if (receiptErrorMessage) {
        receiptErrorMessage.textContent = 'Invalid file type. Please upload an image (JPG, PNG, GIF, WebP) or PDF file.';
        receiptErrorMessage.classList.remove('hidden');
      }
      if (receiptRequiredMessage) {
        receiptRequiredMessage.classList.add('hidden');
      }
      fileInput.value = '';
      return;
    }
    
    // File is valid - clear any error messages and show file name
    if (receiptErrorMessage) {
      receiptErrorMessage.classList.add('hidden');
    }
    if (receiptRequiredMessage) {
      receiptRequiredMessage.classList.remove('hidden');
    }
    
    fileNameSpan.textContent = file.name;
    fileNameSpan.classList.remove('hidden');
    removeBtn.classList.remove('hidden');
  }
}

function removeReceipt() {
  const fileInput = document.getElementById('batchReceiptUpload');
  const fileNameSpan = document.getElementById('receiptFileName');
  const removeBtn = document.getElementById('removeReceiptBtn');
  const receiptErrorMessage = document.getElementById('receiptErrorMessage');
  const receiptRequiredMessage = document.getElementById('receiptRequiredMessage');
  
  fileInput.value = '';
  fileNameSpan.classList.add('hidden');
  removeBtn.classList.add('hidden');
  
  // Reset error message text and show required message
  if (receiptErrorMessage) {
    receiptErrorMessage.textContent = 'Receipt is required. Please upload a receipt before creating the batch order.';
    receiptErrorMessage.classList.add('hidden');
  }
  if (receiptRequiredMessage) {
    receiptRequiredMessage.classList.remove('hidden');
  }
}

window.submitBatchPurchaseFromList = submitBatchPurchaseFromList;
window.updateBatchTotal = updateBatchTotal;
window.handleReceiptUpload = handleReceiptUpload;
window.removeReceipt = removeReceipt;
async function deletePurchase(id) {
  const confirmed = await showConfirmModal(
    'Delete Purchase Order',
    'Are you sure you want to delete this purchase order? This action cannot be undone.',
    async () => {
      try {
        const response = await API.deletePurchase(id);
        if (response.success) {
          await loadState();
        } else {
          showAlertModal('Error', response.error || 'Failed to delete purchase order', 'error');
        }
      } catch (error) {
        console.error('Error deleting purchase:', error);
        showAlertModal('Error', 'Failed to delete purchase order', 'error');
      }
    }
  );
}

window.closeModal = closeModal;
window.deletePurchase = deletePurchase;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
