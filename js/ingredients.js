// Ingredients page initialization
async function initPage() {
  await loadState();
  renderIngredients();
  subscribeState(() => renderIngredients());
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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

function renderIngredients() {
  try {
    if (!isAuthenticated()) {
      window.location.href = 'login.php';
      return;
    }

    updateUserInfo();
    updateNavigation();
    updatePageTitle();

    const state = getAppState();
    const container = document.getElementById('ingredientsContainer');
    const addRecipeBtn = document.getElementById('addRecipeBtn');
    if (!container) return;

    // Show/hide Add Recipe button based on role
    if (addRecipeBtn) {
      addRecipeBtn.style.display = isStockHandler() ? 'block' : 'none';
    }

    const sets = state.ingredientSets || [];
    const inventory = state.inventory || [];
    const packagedItems = state.packagedItems || [];

    if (sets.length === 0) {
      container.innerHTML = showEmptyState(
        'No ingredient sets (recipes) yet.',
        '+ Add Recipe',
        'showAddRecipeForm()'
      );
      return;
    }

    container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${sets.map(set => {
        // Check if recipe can be fulfilled
        let canFulfill = true;
        const issues = [];
        
        set.ingredients.forEach(ing => {
          if (ing.isPackaged) {
            const pkg = packagedItems.find(p => p.id === ing.inventoryItemId);
            if (!pkg || pkg.numberOfPacks < ing.quantity) {
              canFulfill = false;
              issues.push(`${ing.name} (packaged)`);
            }
          } else {
            const inv = inventory.find(i => i.id === ing.inventoryItemId);
            if (!inv) {
              canFulfill = false;
              issues.push(`${ing.name}`);
            } else {
              // Convert required quantity to inventory unit for comparison
              let requiredQty = ing.quantity;
              if (ing.unit !== inv.unit) {
                if (typeof canConvertUnits === 'function' && typeof convertQuantity === 'function' && canConvertUnits(ing.unit, inv.unit)) {
                  requiredQty = convertQuantity(ing.quantity, ing.unit, inv.unit);
                } else {
                  // Units don't match and can't be converted
                  canFulfill = false;
                  issues.push(`${ing.name} (unit mismatch)`);
                  return; // Skip this ingredient
                }
              }
              if (inv.quantity < requiredQty) {
                canFulfill = false;
                issues.push(`${ing.name}`);
              }
            }
          }
        });
        
        return `
          <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col">
            <div class="flex justify-between items-start mb-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="text-base font-semibold text-gray-900 truncate">${set.name}</h3>
                </div>
                ${set.description ? `<p class="text-xs text-gray-500 line-clamp-2 mb-2">${set.description}</p>` : ''}
                <div class="flex items-center gap-2">
                  ${canFulfill ? '<span class="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">Available</span>' : '<span class="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">Low Stock</span>'}
                  <span class="text-xs text-gray-400">${set.ingredients.length} ingredient${set.ingredients.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              ${isStockHandler() ? `
                <button onclick="deleteIngredientSet('${set.id}')" class="ml-2 text-red-600 hover:text-red-800 text-xs flex-shrink-0" title="Delete recipe">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              ` : ''}
            </div>
            <div onclick="showIngredientsModal('${set.id}', '${escapeHtml(set.name)}')" class="mt-3 p-3 bg-gray-50 rounded border border-gray-200 flex-1 cursor-pointer hover:bg-gray-100 transition-colors">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-medium text-gray-700">Ingredients:</h4>
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
              <p class="text-xs text-gray-500 mt-1">Click to view ${set.ingredients.length} ingredient${set.ingredients.length !== 1 ? 's' : ''}</p>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-200">
              <p class="text-xs text-gray-400">
                Created: ${new Date(set.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  } catch (error) {
    console.error('Error rendering ingredients:', error);
    const container = document.getElementById('ingredientsContainer');
    if (container) {
      container.innerHTML = '<p class="text-red-500">Error loading recipes. Please refresh the page.</p>';
    }
  }
}

function showAddRecipeForm() {
  const state = getAppState();
  const user = state.currentUser;
  const inventory = state.inventory || [];
  const packagedItems = state.packagedItems || [];

  if (inventory.length === 0 && packagedItems.length === 0) {
    showAlertModal('Info', 'No inventory items available. Please add inventory first.', 'info');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 overflow-y-auto';
  modal.innerHTML = `
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onclick="closeModal()"></div>
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full">
        <div class="bg-white">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex justify-between items-center">
              <div>
                <h3 class="text-xl font-semibold text-gray-900">Create Ingredient Set (Recipe)</h3>
                <p class="text-sm text-gray-500 mt-1">Define a recipe with ingredients from inventory</p>
              </div>
              <div id="recipeIngredientCount" class="text-right">
                <p class="text-2xl font-bold text-blue-600"><span id="ingredientCountDisplay">0</span></p>
                <p class="text-xs text-gray-500">ingredients</p>
              </div>
            </div>
          </div>

          <!-- Recipe Info Section -->
          <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Recipe Name *</label>
                <input type="text" id="recipeName" required placeholder="e.g., Chocolate Cake, Bread Loaf" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
                <input type="text" id="recipeDescription" placeholder="Brief description..." class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              </div>
            </div>
            <div class="mt-4">
              <label class="block text-xs font-medium text-gray-700 mb-1">Recipe Image (optional)</label>
              <div class="flex items-center gap-4">
                <div class="flex-1">
                  <input type="file" id="recipeImage" accept="image/*" onchange="handleRecipeImagePreview(event)" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
                  <p class="text-xs text-gray-500 mt-1">Upload an image to show as preview for kitchen staff</p>
                </div>
                <div id="recipeImagePreview" class="hidden">
                  <img id="recipeImagePreviewImg" src="" alt="Preview" class="h-20 w-20 object-cover rounded border border-gray-300">
                </div>
              </div>
            </div>
          </div>

          <!-- Two Column Layout -->
          <div class="flex flex-col lg:flex-row h-[65vh]">
            <!-- Left Panel: Quick Add Ingredient Form -->
            <div class="lg:w-1/3 border-r border-gray-200 bg-gray-50 p-6 overflow-y-auto">
              <h4 class="text-sm font-semibold text-gray-900 mb-4">Add Ingredient</h4>
              <form onsubmit="addIngredientFromQuickForm(event)" id="quickIngredientForm" class="space-y-4">
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Source *</label>
                  <select id="quickIngredientSource" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" onchange="updateQuickIngredientOptions()">
                    <option value="raw">Raw Inventory</option>
                    <option value="packaged">Packaged Items</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Search Item</label>
                  <input type="text" id="quickIngredientSearch" placeholder="Type to search items..." class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" oninput="filterQuickIngredientOptions()">
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 mb-1">Item *</label>
                  <select id="quickIngredientItem" required class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
                    <input type="number" id="quickIngredientQty" step="0.01" required min="0.01" placeholder="0.00" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Unit *</label>
                    <input type="text" id="quickIngredientUnit" required placeholder="kg" class="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                  </div>
                </div>
                <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm font-medium transition-colors">
                  + Add to Recipe
                </button>
              </form>
            </div>

            <!-- Right Panel: Ingredients List -->
            <div class="lg:w-2/3 p-6 overflow-y-auto">
              <div class="flex justify-between items-center mb-4">
                <h4 class="text-sm font-semibold text-gray-900">Recipe Ingredients</h4>
                <button type="button" onclick="clearAllRecipeIngredients()" class="text-xs text-red-600 hover:text-red-800" id="clearAllIngredientsBtn" style="display: none;">
                  Clear All
                </button>
              </div>
              <div id="ingredientsList" class="space-y-3">
                <div class="text-center py-12 text-gray-400">
                  <svg class="mx-auto h-12 w-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                  <p class="text-sm">No ingredients added yet</p>
                  <p class="text-xs mt-1">Use the form on the left to add ingredients</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button type="button" onclick="closeModal()" class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onclick="submitRecipeFromList()" id="submitRecipeBtn" disabled class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              Create Recipe
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  window.currentModal = modal;
  window.recipeIngredients = []; // Store ingredients in memory
  window.recipeImageFile = null; // Store selected image file
  
  // Initialize ingredient options
  updateQuickIngredientOptions();
  
  // Focus on recipe name
  setTimeout(() => {
    document.getElementById('recipeName')?.focus();
  }, 100);
}

function handleRecipeImagePreview(event) {
  const file = event.target.files[0];
  const preview = document.getElementById('recipeImagePreview');
  const previewImg = document.getElementById('recipeImagePreviewImg');
  
  if (file) {
    window.recipeImageFile = file;
    const reader = new FileReader();
    reader.onload = function(e) {
      previewImg.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  } else {
    window.recipeImageFile = null;
    preview.classList.add('hidden');
    previewImg.src = '';
  }
}

// Store all items for filtering
let allQuickIngredientItems = [];
// Track if unit was manually edited by user
let unitManuallyEdited = false;
// Store the last auto-filled unit value
let lastAutoFilledUnit = '';

function updateQuickIngredientOptions() {
  const state = getAppState();
  const inventory = state.inventory || [];
  const packagedItems = state.packagedItems || [];
  const sourceSelect = document.getElementById('quickIngredientSource');
  const itemSelect = document.getElementById('quickIngredientItem');
  const unitInput = document.getElementById('quickIngredientUnit');
  const searchInput = document.getElementById('quickIngredientSearch');
  
  if (!sourceSelect || !itemSelect) return;
  
  const isPackaged = sourceSelect.value === 'packaged';
  const items = isPackaged ? packagedItems : inventory;
  
  // Reset manual edit flag when source changes
  unitManuallyEdited = false;
  lastAutoFilledUnit = '';
  
  // Store all items for filtering
  allQuickIngredientItems = items.map(item => {
    if (isPackaged) {
      return {
        id: item.id,
        name: item.rawItemName,
        unit: item.packUnit,
        displayText: `${item.rawItemName} (${item.numberOfPacks.toFixed(2)} packs, ${item.packSize}${item.packUnit} each)`,
        isPackaged: true
      };
    } else {
      return {
        id: item.id,
        name: item.name,
        unit: item.unit,
        displayText: `${item.name} (${item.quantity.toFixed(2)} ${item.unit})`,
        isPackaged: false
      };
    }
  });
  
  // Clear search when source changes
  if (searchInput) {
    searchInput.value = '';
  }
  
  // Filter and populate options
  filterQuickIngredientOptions();
  
  // Store current unit value before auto-fill
  const currentUnit = unitInput ? unitInput.value.trim() : '';
  
  // Auto-fill unit from first item only if unit field is empty
  if (items.length > 0 && unitInput && (!currentUnit || currentUnit === '')) {
    const defaultUnit = isPackaged ? items[0].packUnit : items[0].unit;
    unitInput.value = defaultUnit;
    lastAutoFilledUnit = defaultUnit;
  }
  
  // Update unit when item changes, but preserve manual edits
  if (itemSelect && unitInput) {
    itemSelect.onchange = function() {
      const selectedOption = this.options[this.selectedIndex];
      const itemUnit = selectedOption ? selectedOption.dataset.unit : null;
      const currentUnitValue = unitInput.value.trim();
      
      // Only auto-fill unit if:
      // 1. User hasn't manually edited it, AND
      // 2. Unit field is empty OR matches the last auto-filled value
      if (itemUnit && !unitManuallyEdited && (!currentUnitValue || currentUnitValue === lastAutoFilledUnit)) {
        unitInput.value = itemUnit;
        lastAutoFilledUnit = itemUnit;
      }
    };
    
    // Track when user manually edits the unit field
    // Remove existing listeners first
    const newUnitInput = unitInput.cloneNode(true);
    unitInput.parentNode.replaceChild(newUnitInput, unitInput);
    const freshUnitInput = document.getElementById('quickIngredientUnit');
    
    if (freshUnitInput) {
      freshUnitInput.addEventListener('input', function() {
        unitManuallyEdited = true;
        lastAutoFilledUnit = this.value.trim();
      });
      
      freshUnitInput.addEventListener('change', function() {
        unitManuallyEdited = true;
        lastAutoFilledUnit = this.value.trim();
      });
    }
  }
  
  // Trigger change to set initial unit
  if (items.length > 0 && itemSelect) {
    itemSelect.dispatchEvent(new Event('change'));
  }
}

function filterQuickIngredientOptions() {
  const searchInput = document.getElementById('quickIngredientSearch');
  const itemSelect = document.getElementById('quickIngredientItem');
  
  if (!itemSelect || !allQuickIngredientItems) return;
  
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  // Filter items based on search term
  const filteredItems = allQuickIngredientItems.filter(item => {
    if (!searchTerm) return true;
    return item.name.toLowerCase().includes(searchTerm) || 
           item.displayText.toLowerCase().includes(searchTerm);
  });
  
  // Get currently selected value to preserve selection if it's still in filtered list
  const currentValue = itemSelect.value;
  const currentOptionStillExists = filteredItems.some(item => item.id === currentValue);
  
  // Populate dropdown with filtered items
  itemSelect.innerHTML = filteredItems.map(item => {
    const selected = item.id === currentValue ? 'selected' : '';
    return `<option value="${item.id}" data-name="${item.name}" data-unit="${item.unit}" ${selected}>${item.displayText}</option>`;
  }).join('');
  
  // If current selection was removed by filter, clear selection
  if (currentValue && !currentOptionStillExists) {
    itemSelect.value = '';
  }
  
  // Show message if no results
  if (filteredItems.length === 0 && searchTerm) {
    itemSelect.innerHTML = `<option value="" disabled>No items found matching "${searchTerm}"</option>`;
  }
}

function addIngredientFromQuickForm(event) {
  event.preventDefault();
  
  const state = getAppState();
  const inventory = state.inventory || [];
  const packagedItems = state.packagedItems || [];
  
  const sourceSelect = document.getElementById('quickIngredientSource');
  const itemSelect = document.getElementById('quickIngredientItem');
  const qtyInput = document.getElementById('quickIngredientQty');
  const unitInput = document.getElementById('quickIngredientUnit');
  
  if (!sourceSelect || !itemSelect || !qtyInput || !unitInput) return;
  
  const isPackaged = sourceSelect.value === 'packaged';
  const selectedOption = itemSelect.options[itemSelect.selectedIndex];
  const itemName = selectedOption.dataset.name;
  const itemId = itemSelect.value;
  const quantity = parseFloat(qtyInput.value);
  const unit = unitInput.value.trim();
  
  if (!itemId || !quantity || quantity <= 0 || !unit) {
    showAlertModal('Validation Error', 'Please fill in all required fields with valid values', 'warning');
    return;
  }
  
  // Add ingredient to memory
  const ingredient = {
    id: Date.now() + Math.random(),
    inventoryItemId: itemId,
    name: itemName,
    quantity: quantity,
    unit: unit,
    isPackaged: isPackaged
  };
  
  if (!window.recipeIngredients) window.recipeIngredients = [];
  window.recipeIngredients.push(ingredient);
  
  // Render ingredients list
  renderRecipeIngredientsList();
  
  // Clear form and focus on item select
  document.getElementById('quickIngredientForm').reset();
  document.getElementById('quickIngredientSource').value = 'raw';
  const searchInput = document.getElementById('quickIngredientSearch');
  if (searchInput) searchInput.value = '';
  // Reset manual edit flag when form is cleared
  unitManuallyEdited = false;
  lastAutoFilledUnit = '';
  updateQuickIngredientOptions();
  document.getElementById('quickIngredientQty').focus();
  
  updateIngredientCount();
}

function renderRecipeIngredientsList() {
  const ingredientsList = document.getElementById('ingredientsList');
  const clearAllBtn = document.getElementById('clearAllIngredientsBtn');
  const submitBtn = document.getElementById('submitRecipeBtn');
  
  if (!ingredientsList || !window.recipeIngredients) return;
  
  if (window.recipeIngredients.length === 0) {
    ingredientsList.innerHTML = `
      <div class="text-center py-12 text-gray-400">
        <svg class="mx-auto h-12 w-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>
        <p class="text-sm">No ingredients added yet</p>
        <p class="text-xs mt-1">Use the form on the left to add ingredients</p>
      </div>
    `;
    if (clearAllBtn) clearAllBtn.style.display = 'none';
    if (submitBtn) submitBtn.disabled = true;
    return;
  }
  
  if (clearAllBtn) clearAllBtn.style.display = 'block';
  if (submitBtn) submitBtn.disabled = false;
  
  ingredientsList.innerHTML = window.recipeIngredients.map((ingredient, index) => `
    <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow" data-ingredient-id="${ingredient.id}">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">#${index + 1}</span>
            <h5 class="text-sm font-semibold text-gray-900">${ingredient.name}</h5>
            <span class="px-2 py-0.5 text-xs font-medium ${ingredient.isPackaged ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'} rounded">
              ${ingredient.isPackaged ? 'Packaged' : 'Raw'}
            </span>
          </div>
          <div class="text-xs text-gray-600">
            <span class="font-medium">${ingredient.quantity} ${ingredient.unit}</span>
          </div>
        </div>
        <button type="button" onclick="removeRecipeIngredientById('${ingredient.id}')" class="ml-4 text-red-600 hover:text-red-800 text-sm font-medium" title="Remove">
          Remove
        </button>
      </div>
    </div>
  `).join('');
}

function removeRecipeIngredientById(ingredientId) {
  if (!window.recipeIngredients) return;
  window.recipeIngredients = window.recipeIngredients.filter(ing => ing.id !== ingredientId);
  renderRecipeIngredientsList();
  updateIngredientCount();
}

async function clearAllRecipeIngredients() {
  const confirmed = await showConfirmModal(
    'Clear All Ingredients',
    'Are you sure you want to remove all ingredients?',
    () => {
      window.recipeIngredients = [];
      renderRecipeIngredientsList();
      updateIngredientCount();
    }
  );
}

function updateIngredientCount() {
  const countDisplay = document.getElementById('ingredientCountDisplay');
  if (!countDisplay) return;
  
  const count = window.recipeIngredients ? window.recipeIngredients.length : 0;
  countDisplay.textContent = count;
}

function toggleIngredientSource(counter) {
  const state = getAppState();
  const inventory = state.inventory || [];
  const packagedItems = state.packagedItems || [];
  const select = document.querySelector(`#ingredient-row-${counter} select[onchange*="toggleIngredientSource"]`);
  const container = document.getElementById(`ingredient-select-${counter}`);
  const unitInput = document.querySelector(`#ingredient-row-${counter} input[name="ingredient-unit-${counter}"]`);
  
  if (!select || !container) return;
  
  const isPackaged = select.value === 'packaged';
  const items = isPackaged ? packagedItems : inventory;
  
  const itemSelect = container.querySelector('select');
  if (itemSelect) {
    itemSelect.innerHTML = items.map(item => {
      if (isPackaged) {
        return `<option value="${item.id}" data-name="${item.rawItemName}" data-unit="${item.packUnit}">${item.rawItemName} (${item.numberOfPacks.toFixed(2)} packs, ${item.packSize}${item.packUnit} each)</option>`;
      } else {
        return `<option value="${item.id}" data-name="${item.name}" data-unit="${item.unit}">${item.name} (${item.quantity} ${item.unit})</option>`;
      }
    }).join('');
    
    // Auto-fill unit from first item
    if (items.length > 0 && unitInput) {
      unitInput.value = isPackaged ? items[0].packUnit : items[0].unit;
    }
  }
}

function removeIngredientRow(counter) {
  const row = document.getElementById(`ingredient-row-${counter}`);
  if (row) row.remove();
}

async function submitRecipeFromList() {
  const state = getAppState();
  const user = state.currentUser;
  if (!user) return;

  const submitBtn = document.getElementById('submitRecipeBtn');
  const originalText = submitBtn.textContent;
  
  const name = document.getElementById('recipeName').value.trim();
  const description = document.getElementById('recipeDescription').value.trim();
  
  if (!name) {
    showAlertModal('Validation Error', 'Please enter a recipe name', 'warning');
    return;
  }
  
  if (!window.recipeIngredients || window.recipeIngredients.length === 0) {
    showAlertModal('Validation Error', 'Please add at least one ingredient to the recipe', 'warning');
    return;
  }
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating...';

  // Convert ingredients to API format
  const ingredients = window.recipeIngredients.map(ing => ({
    id: `ing-${Date.now()}-${Math.random()}`,
    inventoryItemId: ing.inventoryItemId,
    name: ing.name,
    quantity: ing.quantity,
    unit: ing.unit,
    isPackaged: ing.isPackaged
  }));

  let imagePath = null;
  
  // Upload image if provided
  if (window.recipeImageFile) {
    try {
      submitBtn.textContent = 'Uploading image...';
      const imageResponse = await API.uploadRecipeImage(window.recipeImageFile);
      if (imageResponse.success) {
        imagePath = imageResponse.imagePath;
      } else {
        showAlertModal('Image Upload Error', imageResponse.error || 'Failed to upload image', 'warning');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showAlertModal('Image Upload Error', 'Failed to upload image: ' + (error.message || 'Unknown error'), 'warning');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }
  }

  const data = {
    name: name,
    description: description,
    ingredients: ingredients,
    imagePath: imagePath,
    createdBy: user.id || ''
  };

  try {
    submitBtn.textContent = 'Creating...';
    console.log('Submitting ingredient set:', { name: data.name, ingredientsCount: data.ingredients.length, hasImage: !!data.imagePath });
    const response = await API.addIngredientSet(data);
    console.log('API response:', response);
    
    if (response.success) {
      console.log('Set created successfully. Response data:', response.data);
      const setsCount = response.data?.ingredientSets?.length || 0;
      console.log(`Total ingredient sets in response: ${setsCount}`);
      
      closeModal();
      window.recipeIngredients = []; // Clear ingredients
      window.recipeImageFile = null; // Clear image
      // Reset image preview
      const imageInput = document.getElementById('recipeImage');
      const preview = document.getElementById('recipeImagePreview');
      if (imageInput) imageInput.value = '';
      if (preview) preview.classList.add('hidden');
      
      // Update state with response data if available, otherwise reload
      if (response.data) {
        console.log('Updating state with response data');
        updateState(response.data);
        // Force re-render
        renderIngredients();
      } else {
        console.log('No data in response, reloading state');
        await loadState();
      }
    } else {
      console.error('Failed to create set:', response.error);
      showAlertModal('Error', response.error || 'Failed to create recipe', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  } catch (error) {
    console.error('Error creating recipe:', error);
    showAlertModal('Error', 'Failed to create recipe: ' + (error.message || 'Unknown error'), 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Keep old function for backward compatibility
async function submitRecipe(event) {
  if (event) event.preventDefault();
  await submitRecipeFromList();
}

async function deleteIngredientSet(id) {
  const confirmed = await showConfirmModal(
    'Delete Recipe',
    'Are you sure you want to delete this recipe? This action cannot be undone.',
    async () => {
      try {
        const response = await API.deleteIngredientSet(id);
        if (response.success) {
          await loadState();
        } else {
          showAlertModal('Error', response.error || 'Failed to delete recipe', 'error');
        }
      } catch (error) {
        console.error('Error deleting recipe:', error);
        showAlertModal('Error', 'Failed to delete recipe', 'error');
      }
    }
  );
}

function closeModal() {
  if (window.currentModal) {
    window.currentModal.remove();
    window.currentModal = null;
  }
  window.ingredientCounter = 0;
}

function showIngredientsModal(setId, setName) {
  const state = getAppState();
  const sets = state.ingredientSets || [];
  const inventory = state.inventory || [];
  const packagedItems = state.packagedItems || [];
  
  const set = sets.find(s => s.id === setId);
  if (!set) {
    showAlertModal('Error', 'Recipe set not found.', 'error');
    return;
  }
  
  const ingredientsHtml = set.ingredients.map(ing => {
    const inv = inventory.find(i => i.id === ing.inventoryItemId);
    const pkg = packagedItems.find(p => p.id === ing.inventoryItemId);
    const available = ing.isPackaged 
      ? (pkg ? `${pkg.numberOfPacks.toFixed(2)} packs` : '0 packs')
      : (inv ? `${inv.quantity.toFixed(2)} ${inv.unit}` : '0');
    let hasEnough = false;
    if (ing.isPackaged) {
      hasEnough = pkg && pkg.numberOfPacks >= ing.quantity;
    } else {
      if (inv) {
        // Convert required quantity to inventory unit for comparison
        let requiredQty = ing.quantity;
        if (ing.unit !== inv.unit && typeof canConvertUnits === 'function' && canConvertUnits(ing.unit, inv.unit)) {
          requiredQty = convertQuantity(ing.quantity, ing.unit, inv.unit);
          hasEnough = inv.quantity >= requiredQty;
        } else if (ing.unit === inv.unit) {
          // Units match, direct comparison
          hasEnough = inv.quantity >= requiredQty;
        } else {
          // Units don't match and can't be converted
          hasEnough = false;
        }
      }
    }
    
    return `
      <li class="text-sm py-2 border-b border-gray-100 ${hasEnough ? 'text-gray-700' : 'text-red-600'}">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <span class="font-semibold">${ing.quantity} ${ing.unit}</span>
            <span class="ml-2">${escapeHtml(ing.name)}</span>
            <span class="ml-2 px-1.5 py-0.5 text-xs font-medium rounded ${ing.isPackaged ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}">${ing.isPackaged ? 'P' : 'R'}</span>
          </div>
        </div>
        <div class="text-xs text-gray-500 mt-1">Available: ${available}</div>
      </li>
    `;
  }).join('');
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 overflow-y-auto';
  modal.innerHTML = `
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onclick="closeModal()"></div>
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
        <div class="bg-white px-6 py-4 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">${escapeHtml(setName)}</h3>
              <p class="text-sm text-gray-500 mt-1">Ingredients List</p>
            </div>
            <button onclick="closeModal()" class="text-gray-400 hover:text-gray-500">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="bg-white px-6 py-4">
          <ul class="space-y-1 max-h-96 overflow-y-auto">
            ${ingredientsHtml || '<li class="text-sm text-gray-500 py-4 text-center">No ingredients found</li>'}
          </ul>
        </div>
        <div class="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
          <button onclick="closeModal()" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  window.currentModal = modal;
}

function handleLogout() {
  logout();
}

window.handleLogout = handleLogout;
window.showIngredientsModal = showIngredientsModal;
window.showAddRecipeForm = showAddRecipeForm;
window.handleRecipeImagePreview = handleRecipeImagePreview;
window.addIngredientFromQuickForm = addIngredientFromQuickForm;
window.updateQuickIngredientOptions = updateQuickIngredientOptions;
window.filterQuickIngredientOptions = filterQuickIngredientOptions;
window.removeRecipeIngredientById = removeRecipeIngredientById;
window.clearAllRecipeIngredients = clearAllRecipeIngredients;
window.submitRecipeFromList = submitRecipeFromList;
window.deleteIngredientSet = deleteIngredientSet;
window.closeModal = closeModal;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
