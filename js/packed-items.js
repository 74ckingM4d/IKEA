function bindPackedItemsSearchInput() {
  const input = document.getElementById('packedItemsSearchInput');
  if (!input || input.dataset.boundPackedSearch) return;
  input.dataset.boundPackedSearch = '1';
  input.addEventListener('input', () => renderPackedItems());
}

// Packed Items page initialization
async function initPage() {
  await loadState();
  bindPackedItemsSearchInput();
  renderPackedItems();
  subscribeState(() => renderPackedItems());
}

function renderPackedItems() {
  if (!isAuthenticated()) {
    window.location.href = 'login.php';
    return;
  }

  updateUserInfo();
  updateNavigation();
  updatePageTitle();

  const state = getAppState();
  const container = document.getElementById('packedItemsContainer');
  if (!container) return;

  const inventory = state.inventory || [];
  const packagedItems = state.packagedItems || [];

  const toolbar = document.getElementById('packedItemsSearchToolbar');
  const searchInput = document.getElementById('packedItemsSearchInput');

  if (packagedItems.length === 0) {
    if (toolbar) toolbar.classList.add('hidden');
    container.innerHTML = '<p class="text-gray-500 text-center py-12">No packaged items yet. Package items from raw inventory to see them here.</p>';
    return;
  }

  if (toolbar) {
    if (isStockHandler()) {
      toolbar.classList.remove('hidden');
    } else {
      toolbar.classList.add('hidden');
    }
  }

  const searchTerm = isStockHandler()
    ? (searchInput?.value || '').trim().toLowerCase()
    : '';

  // Merge items with same rawInventoryItemId, packSize, and packUnit
  const mergedItems = new Map();
  
  packagedItems.forEach(pkg => {
    // Create a unique key for merging: rawInventoryItemId + packSize + packUnit
    const mergeKey = `${pkg.rawInventoryItemId}_${pkg.packSize}_${pkg.packUnit}`;
    
    if (mergedItems.has(mergeKey)) {
      // Merge with existing item
      const existing = mergedItems.get(mergeKey);
      existing.numberOfPacks += pkg.numberOfPacks;
      existing.totalRawQuantityUsed += pkg.totalRawQuantityUsed;
      existing.packageIds.push(pkg.id);
      // Keep the earliest packaging date
      const existingDate = new Date(existing.packagingDate);
      const currentDate = new Date(pkg.packagingDate);
      if (currentDate < existingDate) {
        existing.packagingDate = pkg.packagingDate;
      }
    } else {
      // Create new merged item entry
      mergedItems.set(mergeKey, {
        ...pkg,
        packageIds: [pkg.id] // Store all package IDs for deletion
      });
    }
  });

  // Convert map to array for rendering
  let mergedItemsArray = Array.from(mergedItems.values());

  if (searchTerm) {
    mergedItemsArray = mergedItemsArray.filter(pkg => {
      const rawItem = inventory.find(i => i.id === pkg.rawInventoryItemId);
      const rawName = (rawItem?.name || '').toLowerCase();
      const pkgName = (pkg.rawItemName || '').toLowerCase();
      const cat = (pkg.category || '').toLowerCase();
      const packBits = `${pkg.packSize} ${pkg.packUnit} ${pkg.rawUnit}`.toLowerCase();
      return (
        pkgName.includes(searchTerm) ||
        rawName.includes(searchTerm) ||
        cat.includes(searchTerm) ||
        packBits.includes(searchTerm)
      );
    });
  }

  if (mergedItemsArray.length === 0) {
    container.innerHTML = '<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-gray-500 text-sm">No prepared items match your search.</div>';
    return;
  }

  let html = `
    <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number of Packs</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pack Size</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Raw Used</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Packaged Date</th>
            ${isStockHandler() ? '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>' : ''}
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${mergedItemsArray.map((pkg, index) => {
            const rawItem = inventory.find(i => i.id === pkg.rawInventoryItemId);
            // Store package IDs as JSON string in data attribute for safe handling
            const packageIdsJson = JSON.stringify(pkg.packageIds).replace(/"/g, '&quot;');
            // Alternate row colors for better readability
            const rowBgClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            return `
              <tr class="${rowBgClass} hover:bg-blue-50 transition-colors duration-150">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">${pkg.rawItemName}</div>
                  ${rawItem ? `<div class="text-xs text-gray-500">From: ${rawItem.name}</div>` : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">${pkg.numberOfPacks.toFixed(2)} <span class="font-semibold text-green-600">packs</span></div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">${pkg.packSize} ${pkg.packUnit} <span class="font-semibold text-green-600">per pack</span></div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">${pkg.totalRawQuantityUsed.toFixed(2)} ${pkg.rawUnit}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-500">${pkg.category}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-500">${new Date(pkg.packagingDate).toLocaleDateString()}</div>
                </td>
                ${isStockHandler() ? `
                  <td class="px-6 py-4 whitespace-nowrap">
                    <button onclick="deleteMergedPackageFromButton(this)" data-package-ids="${packageIdsJson}" class="text-red-600 hover:text-red-800 text-sm font-medium">Return</button>
                  </td>
                ` : ''}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
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

async function deleteMergedPackage(packageIds) {
  const count = packageIds.length;
  const message = count > 1 
    ? `Are you sure you want to delete ${count} merged packages? This action cannot be undone.`
    : 'Are you sure you want to delete this package? This action cannot be undone.';
  
  const confirmed = await showConfirmModal(
    'Delete Package' + (count > 1 ? 's' : ''),
    message,
    async () => {
      try {
        // Delete all packages in the merged group
        for (const packageId of packageIds) {
          const response = await API.deletePackage(packageId);
          if (!response.success) {
            showAlertModal('Error', response.error || `Failed to delete package ${packageId}`, 'error');
            return;
          }
        }
        await loadState();
      } catch (error) {
        console.error('Error deleting merged packages:', error);
        showAlertModal('Error', 'Failed to delete packages', 'error');
      }
    }
  );
}

async function deleteMergedPackageFromButton(button) {
  const packageIdsJson = button.getAttribute('data-package-ids');
  if (!packageIdsJson) {
    showAlertModal('Error', 'Error: Package IDs not found', 'error');
    return;
  }
  
  try {
    const packageIds = JSON.parse(packageIdsJson);
    await deleteMergedPackage(packageIds);
  } catch (error) {
    console.error('Error parsing package IDs:', error);
    showAlertModal('Error', 'Error: Failed to parse package IDs', 'error');
  }
}

function handleLogout() {
  logout();
}

window.handleLogout = handleLogout;
window.deletePackage = deletePackage;
window.deleteMergedPackage = deleteMergedPackage;
window.deleteMergedPackageFromButton = deleteMergedPackageFromButton;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
