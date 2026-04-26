// Payment Management page initialization
let allUnpaidPurchases = [];
let unpaidBatches = [];
let unpaidSingle = [];

function paymentStatusLabelColor(isPaid) {
  return isPaid ? '#16a34a' : '#f87171';
}

async function initPage() {
  try {
    console.log('Initializing payments page...');
    
    // Clear loading message immediately
    const container = document.getElementById('paymentsContainer');
    if (container && container.textContent.includes('Loading')) {
      container.innerHTML = '<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-gray-500">Loading payments...</div>';
    }
    
    await loadState();
    console.log('State loaded');
    
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
    
    console.log('Rendering payments...');
    renderPayments();
    subscribeState(() => renderPayments());
    
    // Setup receipt preview
    const receiptFile = document.getElementById('receiptFile');
    if (receiptFile) {
      receiptFile.addEventListener('change', handleReceiptPreview);
    }
    
    console.log('Payments page initialized successfully');
  } catch (error) {
    console.error('Error in initPage:', error);
    const container = document.getElementById('paymentsContainer');
    if (container) {
      container.innerHTML = '<div class="bg-white rounded-lg border border-red-200 shadow-sm p-8 text-center text-red-600">Error loading page: ' + (error.message || 'Unknown error') + '<br><button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Reload Page</button></div>';
    }
  }
}

function renderPayments() {
  try {
    const state = getAppState();
    const purchases = state.purchases || [];
    
    console.log('Rendering payments, total purchases:', purchases.length);
    
    // Show ALL completed purchases (both paid and unpaid)
    const allPurchases = purchases.filter(p => p.status === 'completed');
    console.log('Completed purchases:', allPurchases.length);
    
    // Calculate unpaid totals for summary
    const unpaidPurchases = allPurchases.filter(p => {
      const isUnpaid = p.paymentStatus === 'unpaid' || 
                       !p.paymentStatus || 
                       p.paymentStatus === '' ||
                       p.paymentStatus === null;
      const isNotPaid = p.paymentStatus !== 'paid';
      return isUnpaid && isNotPaid;
    });
    
    const paidPurchases = allPurchases.filter(p => p.paymentStatus === 'paid');
    
    console.log('Unpaid purchases:', unpaidPurchases.length);
    console.log('Paid purchases:', paidPurchases.length);
    
    // Group ALL purchases by batchId (both paid and unpaid) for display
    const batches = {};
    const singlePurchases = [];
    
    allPurchases.forEach(purchase => {
      if (purchase.batchId) {
        if (!batches[purchase.batchId]) {
          batches[purchase.batchId] = [];
        }
        batches[purchase.batchId].push(purchase);
      } else {
        singlePurchases.push(purchase);
      }
    });
    
    // Store ALL batches and single purchases for display
    unpaidBatches = Object.values(batches);
    unpaidSingle = singlePurchases;
    allUnpaidPurchases = allPurchases; // Store all for filtering
    
    // Calculate UNPAID batches and single items for summary cards
    // A batch is unpaid if at least one item in it is unpaid
    const unpaidBatchesForSummary = Object.values(batches).filter(batch => {
      return batch.some(p => {
        const isUnpaid = p.paymentStatus === 'unpaid' || 
                         !p.paymentStatus || 
                         p.paymentStatus === '' ||
                         p.paymentStatus === null;
        return isUnpaid && p.paymentStatus !== 'paid';
      });
    });
    
    const unpaidSingleForSummary = singlePurchases.filter(p => {
      const isUnpaid = p.paymentStatus === 'unpaid' || 
                       !p.paymentStatus || 
                       p.paymentStatus === '' ||
                       p.paymentStatus === null;
      return isUnpaid && p.paymentStatus !== 'paid';
    });
    
    // Calculate totals
    const totalUnpaid = unpaidPurchases.reduce((sum, p) => sum + (p.price || 0), 0);
    
    // Update summary cards with UNPAID counts
    const totalUnpaidEl = document.getElementById('totalUnpaidAmount');
    const totalBatchesEl = document.getElementById('totalUnpaidBatches');
    const totalSingleEl = document.getElementById('totalUnpaidSingle');
    
    if (totalUnpaidEl) totalUnpaidEl.textContent = formatCurrency(totalUnpaid);
    if (totalBatchesEl) totalBatchesEl.textContent = unpaidBatchesForSummary.length;
    if (totalSingleEl) totalSingleEl.textContent = unpaidSingleForSummary.length;
    
    populateFilters();
    // Apply display filters (search, supplier, type) to the already-processed data
    applyFiltersToDisplay();
  } catch (error) {
    console.error('Error rendering payments:', error);
    const container = document.getElementById('paymentsContainer');
    if (container) {
      container.innerHTML = '<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-red-500">Error loading payments: ' + error.message + '</div>';
    }
  }
}

function populateFilters() {
  const supplierFilter = document.getElementById('supplierFilter');
  if (!supplierFilter) return;
  
  // Get unique suppliers from all purchases
  const suppliers = [...new Set(allUnpaidPurchases.map(p => p.supplier).filter(s => s))].sort();
  const currentSupplier = supplierFilter.value;
  
  supplierFilter.innerHTML = '<option value="">All Suppliers</option>' +
    suppliers.map(s => `<option value="${escapeHtml(s)}" ${s === currentSupplier ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');
}

function applyFilters() {
  // Always apply filters to existing data (we show all purchases now)
  applyFiltersToDisplay();
}

function applyFiltersToDisplay() {
  try {
    const container = document.getElementById('paymentsContainer');
    if (!container) return;
    
    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const supplierFilter = document.getElementById('supplierFilter')?.value || '';
    const purchaseTypeFilter = document.getElementById('purchaseTypeFilter')?.value || '';
    
    let filteredBatches = [...unpaidBatches];
    let filteredSingle = [...unpaidSingle];
    
    // Apply search filter
    if (searchTerm) {
      filteredBatches = filteredBatches.filter(batch => {
        const supplier = batch[0].supplier || '';
        const items = batch.map(p => p.itemName).join(' ');
        return supplier.toLowerCase().includes(searchTerm) || items.toLowerCase().includes(searchTerm);
      });
      
      filteredSingle = filteredSingle.filter(p => {
        const supplier = p.supplier || '';
        const itemName = p.itemName || '';
        return supplier.toLowerCase().includes(searchTerm) || itemName.toLowerCase().includes(searchTerm);
      });
    }
    
    // Apply supplier filter
    if (supplierFilter) {
      filteredBatches = filteredBatches.filter(batch => batch[0].supplier === supplierFilter);
      filteredSingle = filteredSingle.filter(p => p.supplier === supplierFilter);
    }
    
    // Apply purchase type filter
    if (purchaseTypeFilter) {
      const typeValue = purchaseTypeFilter === 'delivery' ? 'delivery' : 'personal';
      filteredBatches = filteredBatches.filter(batch => (batch[0].purchaseType || 'delivery') === typeValue);
      filteredSingle = filteredSingle.filter(p => (p.purchaseType || 'delivery') === typeValue);
    }
    
    displayPayments(filteredBatches, filteredSingle);
  } catch (error) {
    console.error('Error applying filters:', error);
    const container = document.getElementById('paymentsContainer');
    if (container) {
      container.innerHTML = '<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-red-500">Error applying filters: ' + error.message + '</div>';
    }
  }
}

function displayPayments(batches, singlePurchases) {
  const container = document.getElementById('paymentsContainer');
  if (!container) {
    console.error('paymentsContainer element not found');
    return;
  }
  
  console.log('Displaying payments:', { batches: batches.length, single: singlePurchases.length });
  
  if (batches.length === 0 && singlePurchases.length === 0) {
    container.innerHTML = '<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-gray-500">No purchases found.</div>';
    return;
  }
  
  let html = '';
  
  // Display batches
  if (batches.length > 0) {
    html += `
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Purchase Batches (${batches.length})</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${batches.map(batch => {
                const batchTotal = batch.reduce((sum, p) => sum + (p.price || 0), 0);
                const supplier = batch[0].supplier || 'N/A';
                const purchaseType = batch[0].purchaseType || 'delivery';
                const purchaseTypeLabel = purchaseType === 'delivery' ? 'Delivery' : 'Personal Purchase';
                const dateCreated = new Date(batch[0].dateCreated).toLocaleDateString();
                const batchId = batch[0].batchId;
                const paymentStatus = batch[0].paymentStatus || 'unpaid';
                const isPaid = paymentStatus === 'paid';
                const paymentStatusLabel = isPaid ? 'Paid' : 'Unpaid';
                
                return `
                  <tr class="hover:bg-gray-50 cursor-pointer" onclick="showBatchDetails('${batchId}')">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${escapeHtml(supplier)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${batch.length} item${batch.length !== 1 ? 's' : ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${purchaseTypeLabel}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dateCreated}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${isPaid ? 'text-gray-600' : 'text-red-600'}">${formatCurrency(batchTotal)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                      <span class="font-medium text-xs" style="color:${paymentStatusLabelColor(isPaid)}">${paymentStatusLabel}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-center" onclick="event.stopPropagation()">
                      ${!isPaid ? `
                        <button onclick="openPaymentModal('batch', '${batchId}', ${batchTotal})" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
                          Mark as Paid
                        </button>
                      ` : '<span class="text-gray-400 text-sm">-</span>'}
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
  
  // Display single purchases
  if (singlePurchases.length > 0) {
    html += `
      <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mt-6">
        <div class="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">Single Purchase Items (${singlePurchases.length})</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${singlePurchases.map(purchase => {
                const supplier = purchase.supplier || 'N/A';
                const purchaseType = purchase.purchaseType || 'delivery';
                const purchaseTypeLabel = purchaseType === 'delivery' ? 'Delivery' : 'Personal Purchase';
                const dateCreated = new Date(purchase.dateCreated).toLocaleDateString();
                const paymentStatus = purchase.paymentStatus || 'unpaid';
                const isPaid = paymentStatus === 'paid';
                const paymentStatusLabel = isPaid ? 'Paid' : 'Unpaid';
                
                return `
                  <tr class="hover:bg-gray-50 cursor-pointer" onclick="showSinglePurchaseDetails('${purchase.id}')">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${escapeHtml(supplier)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${escapeHtml(purchase.itemName)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${purchaseTypeLabel}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dateCreated}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${isPaid ? 'text-gray-600' : 'text-red-600'}">${formatCurrency(purchase.price)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                      <span class="font-medium text-xs" style="color:${paymentStatusLabelColor(isPaid)}">${paymentStatusLabel}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-center" onclick="event.stopPropagation()">
                      ${!isPaid ? `
                        <button onclick="openPaymentModal('single', '${purchase.id}', ${purchase.price})" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
                          Mark as Paid
                        </button>
                      ` : '<span class="text-gray-400 text-sm">-</span>'}
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
  
  container.innerHTML = html;
}

function openPaymentModal(type, id, expectedAmount) {
  const modal = document.getElementById('paymentModal');
  const form = document.getElementById('paymentForm');
  
  if (!modal || !form) {
    console.error('Payment modal elements not found');
    return;
  }
  
  // Set values first, then reset form (this ensures hidden fields keep their values)
  const batchIdInput = document.getElementById('paymentBatchId');
  const typeInput = document.getElementById('paymentType');
  
  if (!batchIdInput || !typeInput) {
    console.error('Payment form inputs not found');
    return;
  }
  
  // Set hidden field values before reset
  batchIdInput.value = id;
  typeInput.value = type;
  
  // Reset form (this won't affect programmatically set values)
  form.reset();
  
  // Set values again after reset to ensure they persist
  batchIdInput.value = id;
  typeInput.value = type;
  
  // Update other fields
  document.getElementById('expectedAmount').textContent = formatCurrency(expectedAmount);
  document.getElementById('paidAmount').value = '';
  document.getElementById('amountError').classList.add('hidden');
  document.getElementById('receiptPreview').classList.add('hidden');
  document.getElementById('receiptFile').value = '';
  document.getElementById('paymentNotes').value = '';
  
  console.log('Payment modal opened:', { type, id, expectedAmount });
  
  modal.classList.remove('hidden');
}

function closePaymentModal() {
  const modal = document.getElementById('paymentModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function handleReceiptPreview(event) {
  const file = event.target.files[0];
  const preview = document.getElementById('receiptPreview');
  const previewImg = document.getElementById('receiptPreviewImg');
  
  if (!file) {
    preview.classList.add('hidden');
    return;
  }
  
  // Check file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    showNotification('File size exceeds 5MB limit', 'error');
    event.target.value = '';
    preview.classList.add('hidden');
    return;
  }
  
  // Check file type
  if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
    showNotification('Please upload an image or PDF file', 'error');
    event.target.value = '';
    preview.classList.add('hidden');
    return;
  }
  
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  } else {
    // PDF - just show filename
    previewImg.src = '';
    previewImg.alt = file.name;
    preview.classList.remove('hidden');
  }
}

async function handlePaymentSubmit(event) {
  event.preventDefault();
  
  const type = document.getElementById('paymentType').value;
  const id = document.getElementById('paymentBatchId').value;
  const paidAmount = parseFloat(document.getElementById('paidAmount').value);
  const expectedAmount = parseFloat(document.getElementById('expectedAmount').textContent.replace(/[₱,]/g, ''));
  const receiptFile = document.getElementById('receiptFile').files[0];
  const notes = document.getElementById('paymentNotes').value;
  const amountError = document.getElementById('amountError');
  
  // Validate required fields
  if (!type || !id) {
    showNotification('Missing payment information. Please try again.', 'error');
    console.error('Missing payment data:', { type, id });
    return;
  }
  
  // Validate amount
  if (isNaN(paidAmount) || paidAmount <= 0) {
    amountError.textContent = 'Please enter a valid amount';
    amountError.classList.remove('hidden');
    return;
  }
  
  // Allow ±1% discrepancy, flag larger differences
  const discrepancy = Math.abs(paidAmount - expectedAmount);
  const discrepancyPercent = (discrepancy / expectedAmount) * 100;
  
  if (discrepancyPercent > 1) {
    if (!confirm(`Amount discrepancy detected: ${formatCurrency(discrepancy)} (${discrepancyPercent.toFixed(1)}%). Continue anyway?`)) {
      return;
    }
  }
  
  if (!receiptFile) {
    showNotification('Please upload a receipt', 'error');
    return;
  }
  
  // Hide error
  amountError.classList.add('hidden');
  
  try {
    // Upload receipt first
    const receiptResponse = await API.uploadReceipt(receiptFile);
    if (!receiptResponse.success) {
      throw new Error(receiptResponse.error || 'Failed to upload receipt');
    }
    
    // API returns receiptPath (camelCase)
    const receiptPath = receiptResponse.receiptPath || receiptResponse.path;
    
    if (!receiptPath) {
      throw new Error('Receipt upload succeeded but no path returned');
    }
    
    // Prepare payment data
    const paymentData = {
      type: type,
      id: id,
      paidAmount: paidAmount,
      receiptPath: receiptPath,
      notes: notes || ''
    };
    
    console.log('Submitting payment:', paymentData);
    
    // Update payment status
    const response = await API.updatePaymentStatus(paymentData);
    
    if (response.success) {
      showNotification('Payment recorded successfully', 'success');
      closePaymentModal();
      
      // Force reload state from server to get updated payment status
      await loadState();
      
      // Small delay to ensure state is fully updated
      setTimeout(() => {
        renderPayments();
      }, 100);
    } else {
      throw new Error(response.error || 'Failed to update payment status');
    }
  } catch (error) {
    console.error('Payment error:', error);
    showNotification('Error processing payment: ' + error.message, 'error');
  }
}

function clearFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('supplierFilter').value = '';
  document.getElementById('purchaseTypeFilter').value = '';
  applyFilters();
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatCurrency(amount) {
  return '₱' + parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function handleLogout() {
  logout();
}

function showBatchDetails(batchId) {
  const state = getAppState();
  const purchases = state.purchases || [];
  const batch = purchases.filter(p => p.batchId === batchId && p.status === 'completed');
  
  if (!batch.length) {
    showNotification('Batch not found', 'error');
    return;
  }
  
  const batchTotal = batch.reduce((sum, p) => sum + (p.price || 0), 0);
  const supplier = batch[0].supplier || 'N/A';
  const purchaseType = batch[0].purchaseType || 'delivery';
  const purchaseTypeLabel = purchaseType === 'delivery' ? 'Delivery' : 'Personal Purchase';
  const dateCreated = new Date(batch[0].dateCreated).toLocaleDateString();
  const dateDelivered = batch[0].dateDelivered ? new Date(batch[0].dateDelivered).toLocaleDateString() : 'Not yet delivered';
  const paymentStatus = batch[0].paymentStatus || 'unpaid';
  const paymentStatusLabel = paymentStatus === 'paid' ? 'Paid' : 'Unpaid';
  
  const itemsHtml = batch.map(item => `
    <li class="py-2 text-sm border-b last:border-0 border-gray-100">
      <div class="flex justify-between items-start">
        <div>
          <span class="font-medium text-gray-900">${escapeHtml(item.itemName)}</span>
          ${item.brandName ? `<span class="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">${escapeHtml(item.brandName)}</span>` : ''}
          <div class="text-xs text-gray-500 mt-1">
            Quantity: ${item.quantity} ${item.displayUnit} (Base: ${(item.quantity * item.conversionRatio).toFixed(2)} ${item.baseUnit})
          </div>
        </div>
        <div class="text-right">
          <div class="font-semibold text-gray-900">${formatCurrency(item.price)}</div>
        </div>
      </div>
    </li>
  `).join('');
  
  // Get receipt path from any item in the batch (they should all have the same receipt)
  const receiptPath = batch[0].receiptPath || batch.find(p => p.receiptPath)?.receiptPath || null;
  
  const body = `
    <div class="text-left text-sm text-gray-800 space-y-4">
      <div>
        <div class="text-xs text-gray-500">Supplier</div>
        <div class="font-semibold text-gray-900">${escapeHtml(supplier)}</div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-xs text-gray-500">Purchase Type</div>
          <div class="font-semibold">${purchaseTypeLabel}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500">Payment Status</div>
          <div>
            <span class="font-medium text-xs" style="color:${paymentStatusLabelColor(paymentStatus === 'paid')}">${paymentStatusLabel}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-xs text-gray-500">Purchase Date</div>
          <div>${dateCreated}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500">Delivery Date</div>
          <div>${dateDelivered}</div>
        </div>
      </div>

      <div>
        <div class="font-semibold mb-2">Items (${batch.length})</div>
        <ul class="max-h-60 overflow-y-auto bg-gray-50 rounded-lg p-3">
          ${itemsHtml}
        </ul>
      </div>

      <div class="pt-3 border-t border-gray-200">
        <div class="flex justify-between items-center mb-3">
          <div class="text-xs text-gray-500">Total Amount</div>
          <div class="text-xl font-bold text-gray-900">${formatCurrency(batchTotal)}</div>
        </div>
        ${receiptPath ? `
          <div class="mt-3">
            <button onclick="viewReceipt('${receiptPath}')" class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              View Receipt
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  if (typeof showAlertModal === 'function') {
    showAlertModal('Batch Purchase Details', body, 'plain');
  } else {
    alert('Batch Details:\n\n' + batch.map(p => `${p.itemName}: ${formatCurrency(p.price)}`).join('\n'));
  }
}

function showSinglePurchaseDetails(purchaseId) {
  const state = getAppState();
  const purchases = state.purchases || [];
  const purchase = purchases.find(p => p.id === purchaseId && p.status === 'completed');
  
  if (!purchase) {
    showNotification('Purchase not found', 'error');
    return;
  }
  
  const supplier = purchase.supplier || 'N/A';
  const purchaseType = purchase.purchaseType || 'delivery';
  const purchaseTypeLabel = purchaseType === 'delivery' ? 'Delivery' : 'Personal Purchase';
  const dateCreated = new Date(purchase.dateCreated).toLocaleDateString();
  const dateDelivered = purchase.dateDelivered ? new Date(purchase.dateDelivered).toLocaleDateString() : 'Not yet delivered';
  const paymentStatus = purchase.paymentStatus || 'unpaid';
  const paymentStatusLabel = paymentStatus === 'paid' ? 'Paid' : 'Unpaid';
  
  const receiptPath = purchase.receiptPath || null;
  
  const body = `
    <div class="text-left text-sm text-gray-800 space-y-4">
      <div>
        <div class="font-semibold text-lg text-gray-900">${escapeHtml(purchase.itemName)}</div>
        ${purchase.brandName ? `<div class="text-xs text-gray-500 mt-1">Brand: ${escapeHtml(purchase.brandName)}</div>` : ''}
        <div class="text-xs text-gray-500 mt-1">Supplier: ${escapeHtml(supplier)}</div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-xs text-gray-500">Purchase Type</div>
          <div class="font-semibold">${purchaseTypeLabel}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500">Payment Status</div>
          <div>
            <span class="font-medium text-xs" style="color:${paymentStatusLabelColor(paymentStatus === 'paid')}">${paymentStatusLabel}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-xs text-gray-500">Purchase Date</div>
          <div>${dateCreated}</div>
        </div>
        <div>
          <div class="text-xs text-gray-500">Delivery Date</div>
          <div>${dateDelivered}</div>
        </div>
      </div>

      <div>
        <div class="text-xs text-gray-500 mb-1">Quantity</div>
        <div class="font-semibold">${purchase.quantity} ${purchase.displayUnit}</div>
        <div class="text-xs text-gray-500 mt-1">Base: ${(purchase.quantity * purchase.conversionRatio).toFixed(2)} ${purchase.baseUnit}</div>
      </div>

      ${purchase.expiryDate ? `
        <div>
          <div class="text-xs text-gray-500 mb-1">Expiry Date</div>
          <div>${new Date(purchase.expiryDate).toLocaleDateString()}</div>
        </div>
      ` : ''}

      <div class="pt-3 border-t border-gray-200">
        <div class="flex justify-between items-center mb-3">
          <div class="text-xs text-gray-500">Total Price</div>
          <div class="text-xl font-bold text-gray-900">${formatCurrency(purchase.price)}</div>
        </div>
        ${receiptPath ? `
          <div class="mt-3">
            <button onclick="viewReceipt('${receiptPath}')" class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              View Receipt
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  if (typeof showAlertModal === 'function') {
    showAlertModal('Purchase Details', body, 'plain');
  } else {
    alert('Purchase Details:\n\n' + purchase.itemName + '\nPrice: ' + formatCurrency(purchase.price));
  }
}

window.applyFilters = applyFilters;
window.applyFiltersToDisplay = applyFiltersToDisplay;
window.clearFilters = clearFilters;
window.handleLogout = handleLogout;
window.openPaymentModal = openPaymentModal;
window.closePaymentModal = closePaymentModal;
window.handlePaymentSubmit = handlePaymentSubmit;
window.showBatchDetails = showBatchDetails;
window.showSinglePurchaseDetails = showSinglePurchaseDetails;

function viewReceipt(receiptPath) {
  if (!receiptPath) {
    showNotification('Receipt not available', 'error');
    return;
  }
  
  // Close the current modal first
  if (typeof closeAlertModal === 'function') {
    closeAlertModal();
  }
  
  // Build receipt URL
  const receiptUrl = receiptPath.startsWith('http') ? receiptPath : `/${receiptPath}`;
  
  // Check if it's a PDF or image
  const isPDF = receiptPath.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(receiptPath);
  
  // Create receipt viewer modal
  const modal = document.createElement('div');
  modal.id = 'receiptViewerModal';
  modal.className = 'fixed inset-0 z-50 overflow-y-auto';
  modal.innerHTML = `
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onclick="closeReceiptViewer()"></div>
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">Payment Receipt</h3>
            <button onclick="closeReceiptViewer()" class="text-gray-400 hover:text-gray-500">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="mt-4">
            ${isPDF ? `
              <iframe src="${receiptUrl}" class="w-full h-96 border border-gray-300 rounded-lg" style="min-height: 600px;"></iframe>
            ` : isImage ? `
              <div class="flex justify-center">
                <img src="${receiptUrl}" alt="Receipt" class="max-w-full max-h-96 object-contain border border-gray-300 rounded-lg" onerror="this.onerror=null; this.src=''; this.alt='Receipt not found'; this.className='p-8 text-gray-500'">
              </div>
            ` : `
              <div class="p-8 text-center text-gray-500">
                <p>Receipt format not supported for preview.</p>
                <a href="${receiptUrl}" target="_blank" class="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Open in New Tab
                </a>
              </div>
            `}
          </div>
          <div class="mt-4 flex justify-end">
            <button onclick="closeReceiptViewer()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Prevent body scroll when modal is open
  document.body.style.overflow = 'hidden';
}

function closeReceiptViewer() {
  const modal = document.getElementById('receiptViewerModal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
}

window.viewReceipt = viewReceipt;
window.closeReceiptViewer = closeReceiptViewer;

// Initialize page when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing payments page...');
    initPage().catch(error => {
      console.error('Error initializing payments page:', error);
      const container = document.getElementById('paymentsContainer');
      if (container) {
        container.innerHTML = '<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-red-500">Error initializing page: ' + error.message + '</div>';
      }
    });
  });
} else {
  console.log('DOM already loaded, initializing payments page...');
  initPage().catch(error => {
    console.error('Error initializing payments page:', error);
    const container = document.getElementById('paymentsContainer');
    if (container) {
      container.innerHTML = '<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-red-500">Error initializing page: ' + error.message + '</div>';
    }
  });
}
