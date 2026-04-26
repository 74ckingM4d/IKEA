// Requests page initialization
async function initPage() {
  await loadState();
  renderRequests();
  subscribeState(() => renderRequests());
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

function renderRequests() {
  try {
    if (!isAuthenticated()) {
      window.location.href = 'login.php';
      return;
    }

    updateUserInfo();
    updateNavigation();
    updatePageTitle();

    const state = getAppState();
    const container = document.getElementById('requestsContainer');
    if (!container) return;

    const requests = state.requests || [];
    const ingredientSets = state.ingredientSets || [];

    // Show/hide Add Request button based on role
    const addRequestBtn = document.getElementById('addRequestBtn');
    if (addRequestBtn) {
      addRequestBtn.style.display = isKitchenStaff() ? 'block' : 'none';
    }

    if (requests.length === 0) {
      container.innerHTML = showEmptyState(
        'No kitchen requests yet.',
        isKitchenStaff() ? '+ New Request' : null,
        isKitchenStaff() ? 'showAddRequestForm()' : null
      );
      return;
    }

    // Separate requests by status
    const pendingRequests = requests.filter(r => r.status === 'pending');
    const approvedRequests = requests.filter(r => r.status === 'approved');
    const rejectedRequests = requests.filter(r => r.status === 'rejected');

    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    // Debug: Check if ingredient sets are available
    if (ingredientSets.length === 0) {
      console.warn('No ingredient sets found in state. State might need refreshing.');
    }

    let html = '';
    
    // Pending requests section
    if (pendingRequests.length > 0) {
      html += '<div class="mb-8"><h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">';
      html += '<span class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">Pending</span>';
      html += '<span class="text-gray-900">Pending Requests</span>';
      html += '</h2>';
      html += '<div class="bg-white rounded-lg shadow overflow-hidden border border-gray-200">';
      html += '<table class="min-w-full divide-y divide-gray-200">';
      html += '<thead class="bg-gray-50"><tr>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item/Recipe Name</th>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested Date</th>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed Date</th>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>';
      html += '</tr></thead><tbody class="bg-white divide-y divide-gray-200">';
      html += pendingRequests.map(request => {
        return createRequestRow(request, statusColors, state, true);
      }).join('');
      html += '</tbody></table></div></div>';
    }

    // Approved requests section
    if (approvedRequests.length > 0) {
      html += '<div class="mb-8"><h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">';
      html += '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Approved</span>';
      html += '<span class="text-gray-900">Approved Requests</span>';
      html += '</h2>';
      html += '<div class="bg-white rounded-lg shadow overflow-hidden border border-gray-200">';
      html += '<table class="min-w-full divide-y divide-gray-200">';
      html += '<thead class="bg-gray-50"><tr>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item/Recipe Name</th>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested Date</th>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed Date</th>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>';
      html += '</tr></thead><tbody class="bg-white divide-y divide-gray-200">';
      html += approvedRequests.map(request => {
        // Verify ingredient set exists for this request
        const set = ingredientSets.find(s => s.id === request.ingredientSetId);
        if (!set && request.ingredientSetId) {
          console.warn(`Ingredient set not found for approved request ${request.id} (${request.ingredientSetName}): looking for setId ${request.ingredientSetId}`);
        }
        return createRequestRow(request, statusColors, state, false);
      }).join('');
      html += '</tbody></table></div></div>';
    }

    // Rejected requests section
    if (rejectedRequests.length > 0) {
      html += '<div class="mb-8"><h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">';
      html += '<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">Rejected</span>';
      html += '<span class="text-gray-900">Rejected Requests</span>';
      html += '</h2>';
      html += '<div class="bg-white rounded-lg shadow overflow-hidden border border-gray-200">';
      html += '<table class="min-w-full divide-y divide-gray-200">';
      html += '<thead class="bg-gray-50"><tr>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item/Recipe Name</th>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested Date</th>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processed Date</th>';
      html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>';
      html += '</tr></thead><tbody class="bg-white divide-y divide-gray-200">';
      html += rejectedRequests.map(request => {
        // Verify ingredient set exists for this request
        const set = ingredientSets.find(s => s.id === request.ingredientSetId);
        if (!set && request.ingredientSetId) {
          console.warn(`Ingredient set not found for rejected request ${request.id} (${request.ingredientSetName}): looking for setId ${request.ingredientSetId}`);
        }
        return createRequestRow(request, statusColors, state, false);
      }).join('');
      html += '</tbody></table></div></div>';
    }

    container.innerHTML = html;
  } catch (error) {
    console.error('Error rendering requests:', error);
    const container = document.getElementById('requestsContainer');
    if (container) {
      container.innerHTML = '<p class="text-red-500">Error loading requests. Please refresh the page.</p>';
    }
  }
}

function createRequestCard(request, statusColors, state, showActions) {
  const inventory = state.inventory || [];
  const packagedItems = state.packagedItems || [];
  
  // Handle single item requests
  if (request.isSingleItem) {
    const hasInsufficient = request.hasInsufficientInventory || false;
    const insufficientItems = request.insufficientItems || [];
    const invItem = inventory.find(i => i.id === request.inventoryItemId);
    const requestedQty = request.requestedQuantity || 0;
    const requestedUnit = request.requestedUnit || '';
    
    return `
      <div class="bg-white rounded-lg border ${hasInsufficient ? 'border-red-300 border-2' : 'border-gray-200'} shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col ${hasInsufficient ? 'ring-2 ring-red-200' : ''}">
        <div class="flex justify-between items-start mb-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-2">
              ${hasInsufficient ? '<span class="text-red-600 font-bold text-lg">⚠️</span>' : ''}
              <h3 class="text-lg font-semibold text-gray-900 truncate">${request.inventoryItemName || 'Single Item'}</h3>
              <span class="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">Single Item</span>
            </div>
          </div>
          ${isKitchenStaff() || isStockHandler() ? `
            <button onclick="deleteRequest('${request.id}')" class="ml-2 text-red-600 hover:text-red-800 flex-shrink-0 p-1 rounded hover:bg-red-50 transition-colors" title="Delete request">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          ` : ''}
        </div>
        
        <div class="flex items-center gap-2 mb-3 flex-wrap">
          <span class="px-2 py-1 text-xs font-medium ${statusColors[request.status]} rounded capitalize">
            ${request.status}
          </span>
          ${hasInsufficient ? 
            '<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded font-bold">⚠️ INSUFFICIENT INVENTORY</span>' : 
            (request.status === 'pending' ? 
              '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Available</span>' : '')
          }
          <span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">${requestedQty} ${requestedUnit}</span>
        </div>
        
        ${hasInsufficient && insufficientItems.length > 0 ? `
          <div class="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p class="text-xs font-medium text-red-900 mb-2">Issue:</p>
            <ul class="text-xs text-red-700 space-y-1">
              ${insufficientItems.map(item => `<li>• ${item}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div class="mb-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600 font-medium">Requested:</span>
              <span class="text-gray-900 font-semibold">${requestedQty} ${requestedUnit}</span>
            </div>
            ${invItem ? `
              <div class="flex justify-between">
                <span class="text-gray-600 font-medium">Available:</span>
                <span class="text-gray-900 font-semibold">${invItem.quantity.toFixed(2)} ${invItem.unit}</span>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="mt-auto pt-4 border-t border-gray-200">
          <div class="flex justify-between items-center mb-3">
            <p class="text-xs text-gray-500">
              <span class="font-medium">Requested:</span> ${new Date(request.dateRequested).toLocaleDateString()}
            </p>
            ${request.dateProcessed ? `
              <p class="text-xs text-gray-500">
                <span class="font-medium">Processed:</span> ${new Date(request.dateProcessed).toLocaleDateString()}
              </p>
            ` : ''}
          </div>
          ${showActions && request.status === 'pending' && isStockHandler() ? `
            <div class="flex gap-2">
              <button onclick="processRequest('${request.id}', true)" class="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors shadow-sm">
                Approve
              </button>
              <button onclick="processRequest('${request.id}', false)" class="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors shadow-sm">
                Reject
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  // Handle recipe requests (existing logic)
  const set = state.ingredientSets.find(s => s.id === request.ingredientSetId);
  
  // Use backend check if available, otherwise check client-side
  const hasInsufficient = request.hasInsufficientInventory || false;
  const insufficientItems = request.insufficientItems || [];
  
  // Check if ingredients are available (for display)
  let canFulfill = !hasInsufficient;
  if (!hasInsufficient && set && set.ingredients) {
    set.ingredients.forEach(ing => {
      if (ing.isPackaged) {
        const pkg = packagedItems.find(p => p.id === ing.inventoryItemId);
        const required = ing.quantity * request.quantity;
        if (!pkg || pkg.numberOfPacks < required) {
          canFulfill = false;
        }
      } else {
        const inv = inventory.find(i => i.id === ing.inventoryItemId);
        const required = ing.quantity * request.quantity;
        if (!inv || inv.quantity < required) {
          canFulfill = false;
        }
      }
    });
  }
  
  // Kitchen staff should not see detailed ingredient breakdown for set/recipe requests
  const canShowIngredientDetails = !isKitchenStaff();
  const hasIngredients = canShowIngredientDetails && set && set.ingredients && set.ingredients.length > 0;
  
  return `
    <div class="bg-white rounded-lg border ${hasInsufficient ? 'border-red-300 border-2' : 'border-gray-200'} shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col ${hasInsufficient ? 'ring-2 ring-red-200' : ''}">
      <div class="flex justify-between items-start mb-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-2">
            ${hasInsufficient ? '<span class="text-red-600 font-bold text-lg">⚠️</span>' : ''}
            <h3 class="text-lg font-semibold text-gray-900 truncate">${request.ingredientSetName}</h3>
          </div>
        </div>
        ${isKitchenStaff() || isStockHandler() ? `
          <button onclick="deleteRequest('${request.id}')" class="ml-2 text-red-600 hover:text-red-800 flex-shrink-0 p-1 rounded hover:bg-red-50 transition-colors" title="Delete request">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        ` : ''}
      </div>
      
      <div class="flex items-center gap-2 mb-3 flex-wrap">
        <span class="px-2 py-1 text-xs font-medium ${statusColors[request.status]} rounded capitalize">
          ${request.status}
        </span>
        ${hasInsufficient ? 
          '<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded font-bold">⚠️ INSUFFICIENT INVENTORY</span>' : 
          (request.status === 'pending' && canFulfill ? 
            '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Available</span>' : 
            (request.status === 'pending' && !canFulfill ? 
              '<span class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">Check Stock</span>' : ''))
        }
        <span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">${request.quantity}x sets</span>
      </div>
      
      ${hasInsufficient && insufficientItems.length > 0 ? `
        <div class="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p class="text-xs font-medium text-red-900 mb-2">Missing Items:</p>
          <ul class="text-xs text-red-700 space-y-1">
            ${insufficientItems.slice(0, 3).map(item => `<li>• ${item}</li>`).join('')}
            ${insufficientItems.length > 3 ? `<li class="text-red-600 font-medium">... and ${insufficientItems.length - 3} more</li>` : ''}
          </ul>
        </div>
      ` : ''}
      
      ${hasIngredients && set ? `
        <div class="mb-3 p-4 bg-gray-50 rounded-lg border border-gray-200 flex-1">
          <h4 class="text-sm font-semibold text-gray-700 mb-3">Required Ingredients:</h4>
          <ul class="space-y-2 max-h-40 overflow-y-auto pr-2">
            ${set.ingredients.map(ing => {
              const inv = inventory.find(i => i.id === ing.inventoryItemId);
              const pkg = packagedItems.find(p => p.id === ing.inventoryItemId);
              const required = ing.quantity * request.quantity;
              const available = ing.isPackaged 
                ? (pkg ? `${pkg.numberOfPacks.toFixed(2)} packs` : '0 packs')
                : (inv ? `${inv.quantity.toFixed(2)} ${inv.unit}` : '0');
              const hasEnough = ing.isPackaged 
                ? (pkg && pkg.numberOfPacks >= required)
                : (inv && inv.quantity >= required);
              
              return `
                <li class="text-sm ${hasEnough || request.status !== 'pending' ? 'text-gray-700' : 'text-red-600'}">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <span class="font-semibold">${required.toFixed(2)} ${ing.unit}</span>
                      <span class="ml-1">${ing.name}</span>
                      <span class="ml-2 px-1.5 py-0.5 text-xs font-medium rounded ${ing.isPackaged ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}">${ing.isPackaged ? 'P' : 'R'}</span>
                    </div>
                  </div>
                  <div class="text-xs text-gray-500 mt-0.5 ml-1">Available: ${available}</div>
                </li>
              `;
            }).join('')}
          </ul>
        </div>
      ` : (!set ? `<div class="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">⚠️ Recipe data not available. Please refresh the page.</div>` : '')}
      
      <div class="mt-auto pt-4 border-t border-gray-200">
        <div class="flex justify-between items-center mb-3">
          <p class="text-xs text-gray-500">
            <span class="font-medium">Requested:</span> ${new Date(request.dateRequested).toLocaleDateString()}
          </p>
          ${request.dateProcessed ? `
            <p class="text-xs text-gray-500">
              <span class="font-medium">Processed:</span> ${new Date(request.dateProcessed).toLocaleDateString()}
            </p>
          ` : ''}
        </div>
        ${showActions && request.status === 'pending' && isStockHandler() ? `
          <div class="flex gap-2">
            <button onclick="processRequest('${request.id}', true)" class="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors shadow-sm">
              Approve
            </button>
            <button onclick="processRequest('${request.id}', false)" class="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors shadow-sm">
              Reject
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function createRequestRow(request, statusColors, state, showActions) {
  const inventory = state.inventory || [];
  const packagedItems = state.packagedItems || [];
  
  // Handle single item requests
  if (request.isSingleItem) {
    const hasInsufficient = request.hasInsufficientInventory || false;
    const requestedQty = request.requestedQuantity || 0;
    const requestedUnit = request.requestedUnit || '';
    const itemName = request.inventoryItemName || 'Single Item';
    const requestedDate = new Date(request.dateRequested).toLocaleDateString();
    const processedDate = request.dateProcessed ? new Date(request.dateProcessed).toLocaleDateString() : '-';
    const quantityText = `${requestedQty} ${requestedUnit}`;
    
    // Action buttons for pending requests (stock handler only)
    let actionButtons = '';
    if (showActions && request.status === 'pending' && isStockHandler()) {
      actionButtons = `
        <div class="flex gap-2">
          <button onclick="processRequest('${request.id}', true)" class="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors">
            Approve
          </button>
          <button onclick="processRequest('${request.id}', false)" class="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors">
            Reject
          </button>
        </div>
      `;
    }
    
    return `
      <tr class="${hasInsufficient ? 'bg-red-50' : 'hover:bg-gray-50'}">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            ${hasInsufficient ? '<span class="text-red-600 font-bold mr-2">⚠️</span>' : ''}
            <div>
              <div class="text-sm font-medium text-gray-900">${escapeHtml(itemName)}</div>
              <div class="text-xs text-gray-500">Single Item</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 py-1 text-xs font-medium ${statusColors[request.status]} rounded capitalize">
            ${request.status}
          </span>
          ${hasInsufficient ? '<br><span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded mt-1 inline-block">⚠️ INSUFFICIENT</span>' : ''}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${quantityText}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${requestedDate}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${processedDate}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          ${actionButtons || '-'}
        </td>
      </tr>
    `;
  }
  
  // Handle recipe/set requests
  const set = state.ingredientSets.find(s => s.id === request.ingredientSetId);
  const hasInsufficient = request.hasInsufficientInventory || false;
  const recipeName = request.ingredientSetName || 'Recipe Set';
  const requestedDate = new Date(request.dateRequested).toLocaleDateString();
  const processedDate = request.dateProcessed ? new Date(request.dateProcessed).toLocaleDateString() : '-';
  const quantityText = `${request.quantity}x sets`;
  
  // Action buttons for pending requests (stock handler only)
  let actionButtons = '';
  if (showActions && request.status === 'pending' && isStockHandler()) {
    actionButtons = `
      <div class="flex gap-2">
        <button onclick="processRequest('${request.id}', true)" class="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors">
          Approve
        </button>
        <button onclick="processRequest('${request.id}', false)" class="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors">
          Reject
        </button>
      </div>
    `;
  }
  
  return `
    <tr class="${hasInsufficient ? 'bg-red-50' : 'hover:bg-gray-50'}">
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          ${hasInsufficient ? '<span class="text-red-600 font-bold mr-2">⚠️</span>' : ''}
          <div class="text-sm font-medium text-gray-900">${escapeHtml(recipeName)}</div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="px-2 py-1 text-xs font-medium ${statusColors[request.status]} rounded capitalize">
          ${request.status}
        </span>
        ${hasInsufficient ? '<br><span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded mt-1 inline-block">⚠️ INSUFFICIENT</span>' : ''}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${quantityText}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${requestedDate}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${processedDate}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        ${actionButtons || '-'}
      </td>
    </tr>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function processRequest(requestId, approved) {
  const action = approved ? 'approve' : 'reject';
  const confirmed = await showConfirmModal(
    `${action.charAt(0).toUpperCase() + action.slice(1)} Request`,
    `Are you sure you want to ${action} this request?`,
    async () => {
      try {
        const response = await API.processRequest(requestId, approved);
        if (response.success) {
          await loadState();
        } else {
          const errorMsg = response.insufficientItems 
            ? `Insufficient inventory:\n${response.insufficientItems.join('\n')}`
            : (response.error || 'Failed to process request');
          showAlertModal('Error', errorMsg.replace(/\n/g, '<br>'), 'error');
        }
  } catch (error) {
    console.error('Error processing request:', error);
    showAlertModal('Error', 'Failed to process request', 'error');
      }
    }
  );
}

function showAddRequestForm() {
  const state = getAppState();
  const sets = state.ingredientSets || [];
  const inventory = state.inventory || [];

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 overflow-y-auto';
  modal.innerHTML = `
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onclick="closeModal()"></div>
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="mb-4">
            <h3 class="text-lg font-medium text-gray-900 mb-1">Create Kitchen Request</h3>
            <p class="text-sm text-gray-500">Request a single item from inventory</p>
          </div>

          <!-- Single Item Request Form -->
          <form onsubmit="submitSingleItemRequest(event)" id="singleItemRequestForm" class="request-form">
            <div class="space-y-4">
              <!-- Request Type: Raw or Pack -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Request Type</label>
                <div class="flex gap-4">
                  <label class="flex items-center">
                    <input type="radio" name="singleItemRequestType" value="raw" checked onchange="toggleSingleItemRequestType()" class="mr-2 text-blue-600 focus:ring-blue-500">
                    <span class="text-sm text-gray-700">Raw Item</span>
                  </label>
                  <label class="flex items-center">
                    <input type="radio" name="singleItemRequestType" value="pack" onchange="toggleSingleItemRequestType()" class="mr-2 text-blue-600 focus:ring-blue-500">
                    <span class="text-sm text-gray-700">Per Pack</span>
                  </label>
                </div>
              </div>
              
              <!-- Search Field -->
              <div id="singleItemSearchContainer" class="relative">
                <label class="block text-sm font-medium text-gray-700 mb-1">Search Item</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </div>
                  <input 
                    type="text" 
                    id="singleItemSearch" 
                    placeholder="Type to search items..." 
                    oninput="filterSingleItemOptions()"
                    class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 pl-10 pr-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                </div>
              </div>
              
              <!-- Raw Item Selection -->
              <div id="singleItemRawContainer">
                <label class="block text-sm font-medium text-gray-700 mb-1">Item</label>
                <select id="singleItemInventoryId" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                  <option value="">Select an item...</option>
                </select>
                ${inventory.length === 0 ? '<p class="mt-1 text-xs text-yellow-600">No inventory items available.</p>' : ''}
              </div>
              
              <!-- Pack Selection (shown when pack type is selected) -->
              <div id="singleItemPackContainer" class="hidden">
                <label class="block text-sm font-medium text-gray-700 mb-1">Packaged Item</label>
                <select id="singleItemPackId" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                  <option value="">Select a packaged item...</option>
                </select>
                <p class="mt-1 text-xs text-gray-500">Select a packaged item to request by packs</p>
              </div>
              
              <!-- Quantity and Unit Fields (for raw items) -->
              <div id="singleItemQuantityContainer" class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input type="number" id="singleItemQuantity" required min="0.01" step="0.01" placeholder="0.00" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select id="singleItemUnit" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="ml">ml</option>
                    <option value="pcs">pcs</option>
                  </select>
                </div>
              </div>
              
              <!-- Pack Quantity (for pack requests) -->
              <div id="singleItemPackQuantityContainer" class="hidden">
                <label class="block text-sm font-medium text-gray-700 mb-1">Number of Packs</label>
                <input type="number" id="singleItemPackQuantity" min="0.01" step="0.01" placeholder="0.00" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <p class="mt-1 text-xs text-gray-500">Enter the number of packs to request</p>
              </div>
            </div>
            <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
              <button type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm">
                Submit Request
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
  window.currentRequestType = 'single';
  
  // Initialize items lists for filtering
  setTimeout(() => {
    // Store all raw items for filtering
    allSingleItemRawItems = inventory.map(item => ({
      id: item.id,
      name: item.name,
      displayText: `${item.name} (${item.quantity.toFixed(2)} ${item.unit} available)`,
      rawData: item
    }));
    
    // Populate raw items dropdown initially
    const rawSelect = document.getElementById('singleItemInventoryId');
    if (rawSelect && allSingleItemRawItems.length > 0) {
      allSingleItemRawItems.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.displayText;
        option.dataset.item = JSON.stringify(item.rawData);
        option.dataset.search = item.name.toLowerCase();
        rawSelect.appendChild(option);
      });
    }
    
    // Initialize packaged items list for pack requests
    updatePackagedItemsList();
  }, 100);
}

// Function removed - only single item requests are supported now
function switchRequestType(type) {
  // No longer needed - only single item requests available
}

function toggleSingleItemRequestType() {
  const requestType = document.querySelector('input[name="singleItemRequestType"]:checked')?.value;
  const rawContainer = document.getElementById('singleItemRawContainer');
  const packContainer = document.getElementById('singleItemPackContainer');
  const quantityContainer = document.getElementById('singleItemQuantityContainer');
  const packQuantityContainer = document.getElementById('singleItemPackQuantityContainer');
  const searchInput = document.getElementById('singleItemSearch');
  
  if (requestType === 'pack') {
    rawContainer.classList.add('hidden');
    packContainer.classList.remove('hidden');
    quantityContainer.classList.add('hidden');
    packQuantityContainer.classList.remove('hidden');
    document.getElementById('singleItemPackId').required = true;
    document.getElementById('singleItemInventoryId').required = false;
    document.getElementById('singleItemQuantity').required = false;
    document.getElementById('singleItemUnit').required = false;
    document.getElementById('singleItemPackQuantity').required = true;
    updatePackagedItemsList();
  } else {
    rawContainer.classList.remove('hidden');
    packContainer.classList.add('hidden');
    quantityContainer.classList.remove('hidden');
    packQuantityContainer.classList.add('hidden');
    document.getElementById('singleItemPackId').required = false;
    document.getElementById('singleItemInventoryId').required = true;
    document.getElementById('singleItemQuantity').required = true;
    document.getElementById('singleItemUnit').required = true;
    document.getElementById('singleItemPackQuantity').required = false;
    // Reapply filter for raw items
    if (searchInput) {
      filterSingleItemOptions();
    }
  }
  updateSingleItemPreview();
}

// Store all items for filtering
let allSingleItemRawItems = [];
let allSingleItemPackagedItems = [];

function filterSingleItemOptions() {
  const searchInput = document.getElementById('singleItemSearch');
  if (!searchInput) return;
  
  const requestType = document.querySelector('input[name="singleItemRequestType"]:checked')?.value;
  const searchTerm = searchInput.value.toLowerCase().trim();
  
  if (requestType === 'pack') {
    // Filter packaged items
    const packSelect = document.getElementById('singleItemPackId');
    if (!packSelect || !allSingleItemPackagedItems) return;
    
    const filteredItems = allSingleItemPackagedItems.filter(item => {
      if (!searchTerm) return true;
      return item.name.toLowerCase().includes(searchTerm) || 
             item.displayText.toLowerCase().includes(searchTerm);
    });
    
    const currentValue = packSelect.value;
    const currentOptionStillExists = filteredItems.some(item => item.id === currentValue);
    
    // Rebuild options
    packSelect.innerHTML = '<option value="">Select a packaged item...</option>';
    filteredItems.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.displayText;
      option.dataset.pack = JSON.stringify(item.packData);
      option.dataset.search = item.name.toLowerCase();
      if (item.id === currentValue) {
        option.selected = true;
      }
      packSelect.appendChild(option);
    });
    
    if (currentValue && !currentOptionStillExists) {
      packSelect.value = '';
    }
    
    if (filteredItems.length === 0 && searchTerm) {
      packSelect.innerHTML = `<option value="" disabled>No items found matching "${searchTerm}"</option>`;
    }
  } else {
    // Filter raw items
    const select = document.getElementById('singleItemInventoryId');
    if (!select || !allSingleItemRawItems) return;
    
    const filteredItems = allSingleItemRawItems.filter(item => {
      if (!searchTerm) return true;
      return item.name.toLowerCase().includes(searchTerm) || 
             item.displayText.toLowerCase().includes(searchTerm);
    });
    
    const currentValue = select.value;
    const currentOptionStillExists = filteredItems.some(item => item.id === currentValue);
    
    // Rebuild options
    select.innerHTML = '<option value="">Select an item...</option>';
    filteredItems.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.displayText;
      option.dataset.item = JSON.stringify(item.rawData);
      option.dataset.search = item.name.toLowerCase();
      if (item.id === currentValue) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    
    if (currentValue && !currentOptionStillExists) {
      select.value = '';
      updateSingleItemPreview();
    }
    
    if (filteredItems.length === 0 && searchTerm) {
      select.innerHTML = `<option value="" disabled>No items found matching "${searchTerm}"</option>`;
    }
  }
}

function updatePackagedItemsList() {
  const state = getAppState();
  const packagedItems = state.packagedItems || [];
  const packSelect = document.getElementById('singleItemPackId');
  if (!packSelect) return;
  
  // Group packaged items by rawInventoryItemId, packSize, and packUnit (similar to packed-items.js)
  const mergedPacks = new Map();
  
  packagedItems.forEach(pkg => {
    const mergeKey = `${pkg.rawInventoryItemId}_${pkg.packSize}_${pkg.packUnit}`;
    if (mergedPacks.has(mergeKey)) {
      const existing = mergedPacks.get(mergeKey);
      existing.numberOfPacks += pkg.numberOfPacks;
      existing.packageIds.push(pkg.id);
    } else {
      mergedPacks.set(mergeKey, {
        ...pkg,
        packageIds: [pkg.id]
      });
    }
  });
  
  const mergedPacksArray = Array.from(mergedPacks.values());
  
  // Store all packaged items for filtering
  allSingleItemPackagedItems = mergedPacksArray.map(pkg => ({
    id: pkg.id,
    name: pkg.rawItemName,
    displayText: `${pkg.rawItemName} - ${pkg.numberOfPacks.toFixed(2)} packs (${pkg.packSize} ${pkg.packUnit} per pack)`,
    packData: pkg
  }));
  
  // Apply current search filter
  filterSingleItemOptions();
}

function updateSingleItemPreview() {
  const requestType = document.querySelector('input[name="singleItemRequestType"]:checked')?.value;
  const preview = document.getElementById('singleItemPreview');
  const previewText = document.getElementById('singleItemPreviewText');
  
  if (!preview || !previewText) return;
  
  if (requestType === 'pack') {
    const packId = document.getElementById('singleItemPackId')?.value;
    const packQuantity = parseFloat(document.getElementById('singleItemPackQuantity')?.value || '0');
    
    if (!packId || !packQuantity || packQuantity <= 0) {
      preview.classList.add('hidden');
      return;
    }
    
    const option = document.querySelector(`#singleItemPackId option[value="${packId}"]`);
    if (!option) return;
    
    try {
      const pack = JSON.parse(option.dataset.pack);
      const totalRawQty = packQuantity * pack.packSize;
      preview.classList.remove('hidden');
      previewText.innerHTML = `Requesting <strong>${packQuantity.toFixed(2)} packs</strong> of ${pack.rawItemName}<br>
        Pack Size: ${pack.packSize} ${pack.packUnit} per pack<br>
        Total Raw Quantity: ${totalRawQty.toFixed(2)} ${pack.rawUnit}<br>
        Available: ${pack.numberOfPacks.toFixed(2)} packs`;
    } catch (e) {
      console.error('Error parsing pack data:', e);
    }
  } else {
    const itemId = document.getElementById('singleItemInventoryId')?.value;
    const quantity = parseFloat(document.getElementById('singleItemQuantity')?.value || '0');
    const unit = document.getElementById('singleItemUnit')?.value;
    
    if (!itemId || !quantity || !unit || quantity <= 0) {
      preview.classList.add('hidden');
      return;
    }
    
    const option = document.querySelector(`#singleItemInventoryId option[value="${itemId}"]`);
    if (!option) return;
    
    try {
      const item = JSON.parse(option.dataset.item);
      preview.classList.remove('hidden');
      previewText.textContent = `Requesting ${quantity} ${unit} of ${item.name} (Available: ${item.quantity.toFixed(2)} ${item.unit})`;
    } catch (e) {
      console.error('Error parsing item data:', e);
    }
  }
}

async function submitSingleItemRequest(event) {
  event.preventDefault();
  const form = document.getElementById('singleItemRequestForm');
  if (!form) {
    console.error('Single item request form not found');
    return;
  }
  
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn ? submitBtn.textContent : 'Submit Request';
  
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }

  const requestType = document.querySelector('input[name="singleItemRequestType"]:checked')?.value;
  
  if (requestType === 'pack') {
    // Handle pack request
    const packId = document.getElementById('singleItemPackId')?.value;
    const packQuantity = parseFloat(document.getElementById('singleItemPackQuantity')?.value || '0');
    
    if (!packId || !packQuantity || packQuantity <= 0) {
      showAlertModal('Validation Error', 'Please select a packaged item and enter a valid number of packs (greater than 0).', 'warning');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
      return;
    }
    
    // Get pack details
    const packOption = document.querySelector(`#singleItemPackId option[value="${packId}"]`);
    if (!packOption) {
      showAlertModal('Validation Error', 'Selected packaged item not found.', 'warning');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
      return;
    }
    
    try {
      const pack = JSON.parse(packOption.dataset.pack);
      const totalRawQty = packQuantity * pack.packSize;
      
      // For pack requests, we'll use the raw inventory item ID and convert pack quantity to raw quantity
      // The unit will be the pack unit, but we need to convert to raw unit for the request
      console.log('Submitting pack request:', { packId, packQuantity, rawItemId: pack.rawInventoryItemId, totalRawQty, rawUnit: pack.rawUnit });
      
      // Request using the raw item ID with converted quantity
      const response = await API.addSingleItemRequest(pack.rawInventoryItemId, totalRawQty, pack.rawUnit);
      console.log('Pack request response:', response);
      
      if (response && response.success) {
        if (response.data) {
          updateState(response.data);
        } else {
          await loadState();
        }
        
        closeModal();
        
        setTimeout(() => {
          showAlertModal(
            'Success',
            `Request created successfully! You requested ${packQuantity.toFixed(2)} packs of ${pack.rawItemName} (${totalRawQty.toFixed(2)} ${pack.rawUnit}).`,
            'success'
          );
        }, 100);
      } else {
        const errorMsg = response?.error || 'Failed to create request';
        console.error('Pack request failed:', errorMsg);
        showAlertModal('Error', 'Error: ' + errorMsg, 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    } catch (error) {
      console.error('Error creating pack request:', error);
      showAlertModal('Error', 'Failed to create request: ' + (error.message || 'Unknown error'), 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  } else {
    // Handle raw item request (existing logic)
    const inventoryItemId = document.getElementById('singleItemInventoryId')?.value;
    const requestedQuantityInput = document.getElementById('singleItemQuantity')?.value;
    const requestedQuantity = parseFloat(requestedQuantityInput);
    const requestedUnit = document.getElementById('singleItemUnit')?.value;

    if (!inventoryItemId || !requestedQuantity || requestedQuantity <= 0 || !requestedUnit) {
      showAlertModal('Validation Error', 'Please fill in all fields with valid values. Quantity must be greater than 0.', 'warning');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
      return;
    }

    try {
      console.log('Submitting single item request:', { inventoryItemId, requestedQuantity, requestedUnit });
      const response = await API.addSingleItemRequest(inventoryItemId, requestedQuantity, requestedUnit);
      console.log('Single item request response:', response);
      
      if (response && response.success) {
        if (response.data) {
          updateState(response.data);
        } else {
          await loadState();
        }
        const state = getAppState();
        const inventory = state.inventory || [];
        const item = inventory.find(i => i.id === inventoryItemId);
        const itemName = item ? item.name : 'item';
        
        closeModal();
        
        setTimeout(() => {
          showAlertModal(
            'Success',
            `Request created successfully! You requested ${requestedQuantity} ${requestedUnit} of ${itemName}.`,
            'success'
          );
        }, 100);
      } else {
        const errorMsg = response?.error || 'Failed to create request';
        console.error('Single item request failed:', errorMsg);
        showAlertModal('Error', 'Error: ' + errorMsg, 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    } catch (error) {
      console.error('Error creating single item request:', error);
      showAlertModal('Error', 'Failed to create request: ' + (error.message || 'Unknown error'), 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  }
}

function updateRequestPreview() {
  const setId = document.getElementById('requestSetId')?.value;
  const quantity = parseInt(document.getElementById('requestQuantity')?.value || '1');
  const preview = document.getElementById('requestPreview');
  const previewList = document.getElementById('requestPreviewList');
  
  if (!setId || !preview || !previewList) return;
  
  const option = document.querySelector(`#requestSetId option[value="${setId}"]`);
  if (!option) return;
  
  try {
    const set = JSON.parse(option.dataset.set);
    preview.classList.remove('hidden');
    previewList.innerHTML = set.ingredients.map(ing => 
      `<li>• ${(ing.quantity * quantity).toFixed(2)} ${ing.unit} ${ing.name} ${ing.isPackaged ? '(Packaged)' : '(Raw)'}</li>`
    ).join('');
  } catch (e) {
    console.error('Error parsing set data:', e);
  }
}

async function submitRequest(event) {
  event.preventDefault();
  const form = document.getElementById('requestForm');
  if (!form) {
    console.error('Request form not found');
    return;
  }
  
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn ? submitBtn.textContent : 'Submit Request';
  
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }

  const setId = document.getElementById('requestSetId')?.value;
  const quantityInput = document.getElementById('requestQuantity')?.value;
  const quantity = parseInt(quantityInput);

  if (!setId || !quantity || quantity < 1) {
    showAlertModal('Validation Error', 'Please select a recipe and enter a valid quantity (at least 1)', 'warning');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
    return;
  }

  try {
    console.log('Submitting request:', { setId, quantity });
    const response = await API.addRequest(setId, quantity);
    console.log('Request response:', response);
    
    if (response && response.success) {
      // Update state with response data if available, otherwise reload
      if (response.data) {
        updateState(response.data);
      } else {
        await loadState();
      }
      // Show success message
      const state = getAppState();
      const sets = state.ingredientSets || [];
      const set = sets.find(s => s.id === setId);
      const setName = set ? set.name : 'recipe';
      
      // Close modal and show success
      closeModal();
      
      // Small delay to ensure state is updated before showing alert
      setTimeout(() => {
        showAlertModal(
          'Success',
          `Request created successfully! You requested ${quantity}x ${setName}.`,
          'success'
        );
      }, 100);
    } else {
      const errorMsg = response?.error || 'Failed to create request';
      console.error('Request failed:', errorMsg);
      showAlertModal('Error', 'Error: ' + errorMsg, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  } catch (error) {
    console.error('Error creating request:', error);
    showAlertModal('Error', 'Failed to create request: ' + (error.message || 'Unknown error'), 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
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

async function deleteRequest(id) {
  const confirmed = await showConfirmModal(
    'Delete Request',
    'Are you sure you want to delete this request? This action cannot be undone.',
    async () => {
      try {
        const response = await API.deleteRequest(id);
        if (response.success) {
          await loadState();
        } else {
          showAlertModal('Error', response.error || 'Failed to delete request', 'error');
        }
      } catch (error) {
        console.error('Error deleting request:', error);
        showAlertModal('Error', 'Failed to delete request', 'error');
      }
    }
  );
}

window.handleLogout = handleLogout;
window.processRequest = processRequest;
window.showAddRequestForm = showAddRequestForm;
window.switchRequestType = switchRequestType;
window.updateRequestPreview = updateRequestPreview;
window.updateSingleItemPreview = updateSingleItemPreview;
window.submitRequest = submitRequest;
window.submitSingleItemRequest = submitSingleItemRequest;
window.deleteRequest = deleteRequest;
window.closeModal = closeModal;
window.toggleSingleItemRequestType = toggleSingleItemRequestType;
window.filterSingleItemOptions = filterSingleItemOptions;
window.updatePackagedItemsList = updatePackagedItemsList;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
