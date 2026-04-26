// Cart storage for recipe sets
let recipeCart = [];

function loadCart() {
  try {
    const saved = localStorage.getItem('recipeCart');
    if (saved) {
      recipeCart = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading cart:', e);
    recipeCart = [];
  }
}

function saveCart() {
  try {
    localStorage.setItem('recipeCart', JSON.stringify(recipeCart));
    updateCartBadge();
  } catch (e) {
    console.error('Error saving cart:', e);
  }
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (badge) {
    const count = recipeCart.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

// Recipe Sets page initialization
async function initPage() {
  await loadState();
  
  if (!isAuthenticated()) {
    window.location.href = 'login.php';
    return;
  }
  
  if (!isKitchenStaff()) {
    window.location.href = 'index.php';
    return;
  }
  
  loadCart();
  updateUserInfo();
  updateNavigation();
  updatePageTitle();
  renderRecipeSets();
  updateCartBadge();
  subscribeState(() => renderRecipeSets());
}

function renderRecipeSets() {
  try {
    if (!isAuthenticated()) {
      window.location.href = 'login.php';
      return;
    }

    updateUserInfo();
    updateNavigation();
    updatePageTitle();

    const state = getAppState();
    const container = document.getElementById('recipeSetsContainer');
    if (!container) return;

    const sets = state.ingredientSets || [];
    const inventory = state.inventory || [];
    const packagedItems = state.packagedItems || [];

    if (sets.length === 0) {
      container.innerHTML = '<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-gray-500">No recipe sets available.</div>';
      return;
    }

    container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        ${sets.map(set => {
          // Check if recipe can be fulfilled (for status badge)
          let canFulfill = true;
          if (set.ingredients && set.ingredients.length > 0) {
            set.ingredients.forEach(ing => {
              if (ing.isPackaged) {
                const pkg = packagedItems.find(p => p.id === ing.inventoryItemId);
                if (!pkg || pkg.numberOfPacks < ing.quantity) {
                  canFulfill = false;
                }
              } else {
                const inv = inventory.find(i => i.id === ing.inventoryItemId);
                if (!inv || inv.quantity < ing.quantity) {
                  canFulfill = false;
                }
              }
            });
          }
          
          const cartItem = recipeCart.find(item => item.setId === set.id);
          const isInCart = !!cartItem;
          
          return `
            <div onclick="addToCart('${set.id}', '${escapeHtml(set.name)}')" class="bg-white rounded-lg border-2 ${isInCart ? 'border-blue-400' : 'border-gray-200'} shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-200 flex flex-col aspect-square overflow-hidden cursor-pointer">
              ${set.imagePath ? `
                <div class="w-full flex-shrink-0 bg-gray-100">
                  <img src="${escapeHtml(set.imagePath)}" alt="${escapeHtml(set.name)}" class="w-full h-40 object-cover pointer-events-none select-none" style="touch-action: none; -webkit-user-drag: none; user-select: none;">
                </div>
              ` : `
                <div class="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
                  <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
              `}
              <div class="flex-1 flex flex-col p-5 min-h-0 overflow-hidden">
                <div class="flex-1 min-h-0 flex flex-col">
                  <h3 class="text-lg font-semibold text-gray-900 mb-2 line-clamp-1 flex-shrink-0">${escapeHtml(set.name)}</h3>
                  ${set.description ? `<p class="text-sm text-gray-600 line-clamp-3 mb-3 flex-shrink-0">${escapeHtml(set.description)}</p>` : ''}
                  
                  ${isInCart ? `
                    <div class="mt-auto flex-shrink-0">
                      <span class="text-sm text-blue-600 font-medium">(${cartItem.quantity}x in cart)</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (error) {
    console.error('Error rendering recipe sets:', error);
    const container = document.getElementById('recipeSetsContainer');
    if (container) {
      container.innerHTML = '<div class="bg-white rounded-lg border border-red-200 shadow-sm p-8 text-center text-red-500">Error loading recipe sets: ' + error.message + '</div>';
    }
  }
}

function addToCart(setId, recipeName) {
  const existingItem = recipeCart.find(item => item.setId === setId);
  
  if (existingItem) {
    // Open modal to update quantity
    openRequestModal(setId, recipeName, existingItem.quantity);
  } else {
    // Open modal to add new item
    openRequestModal(setId, recipeName, 1);
  }
}

function openRequestModal(setId, recipeName, quantity = 1) {
  const modal = document.getElementById('requestQuantityModal');
  const form = document.getElementById('requestQuantityForm');
  
  if (!modal || !form) {
    console.error('Request modal elements not found');
    return;
  }
  
  // Set values
  document.getElementById('requestSetId').value = setId;
  document.getElementById('requestRecipeName').textContent = recipeName;
  document.getElementById('requestQuantity').value = quantity;
  
  modal.classList.remove('hidden');
}

function closeRequestQuantityModal() {
  const modal = document.getElementById('requestQuantityModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

async function handleRequestSubmit(event) {
  event.preventDefault();
  
  const setId = document.getElementById('requestSetId').value;
  const quantity = parseInt(document.getElementById('requestQuantity').value);
  
  if (!setId || !quantity || quantity < 1) {
    showNotification('Please enter a valid quantity', 'error');
    return;
  }
  
  // Add or update item in cart
  const existingIndex = recipeCart.findIndex(item => item.setId === setId);
  const recipeName = document.getElementById('requestRecipeName').textContent;
  
  if (existingIndex >= 0) {
    recipeCart[existingIndex].quantity = quantity;
  } else {
    recipeCart.push({
      setId: setId,
      recipeName: recipeName,
      quantity: quantity
    });
  }
  
  saveCart();
  closeRequestQuantityModal();
  renderRecipeSets();
  showNotification('Added to cart', 'success');
}

function openCartModal() {
  const modal = document.getElementById('cartModal');
  if (!modal) return;
  
  renderCart();
  modal.classList.remove('hidden');
}

function closeCartModal() {
  const modal = document.getElementById('cartModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function renderCart() {
  const cartList = document.getElementById('cartList');
  if (!cartList) return;
  
  if (recipeCart.length === 0) {
    cartList.innerHTML = '<div class="text-center py-8 text-gray-500">Your cart is empty</div>';
    return;
  }
  
  const state = getAppState();
  const sets = state.ingredientSets || [];
  
  cartList.innerHTML = recipeCart.map((item, index) => {
    const set = sets.find(s => s.id === item.setId);
    return `
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <div class="flex-1">
          <h4 class="font-medium text-gray-900">${escapeHtml(item.recipeName)}</h4>
          <div class="mt-2 flex items-center gap-3">
            <label class="text-sm text-gray-600">Quantity:</label>
            <input type="number" 
                   value="${item.quantity}" 
                   min="1" 
                   onchange="updateCartQuantity(${index}, this.value)"
                   class="w-20 px-2 py-1 border border-gray-300 rounded text-sm">
          </div>
        </div>
        <button onclick="removeFromCart(${index})" class="ml-4 text-red-600 hover:text-red-800 p-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    `;
  }).join('');
}

function updateCartQuantity(index, quantity) {
  const qty = parseInt(quantity);
  if (qty > 0) {
    recipeCart[index].quantity = qty;
    saveCart();
    renderCart();
    renderRecipeSets();
  }
}

function removeFromCart(index) {
  recipeCart.splice(index, 1);
  saveCart();
  renderCart();
  renderRecipeSets();
  updateCartBadge();
}

async function submitAllRequests() {
  if (recipeCart.length === 0) {
    showNotification('Cart is empty', 'error');
    return;
  }
  
  const submitBtn = document.getElementById('submitAllBtn');
  const originalText = submitBtn ? submitBtn.textContent : 'Submit All';
  
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (const item of recipeCart) {
    try {
      const response = await API.addRequest(item.setId, item.quantity);
      if (response.success) {
        successCount++;
      } else {
        errorCount++;
        errors.push(`${item.recipeName}: ${response.error || 'Failed'}`);
      }
    } catch (error) {
      errorCount++;
      errors.push(`${item.recipeName}: ${error.message}`);
    }
  }
  
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
  
  // Clear cart
  recipeCart = [];
  saveCart();
  closeCartModal();
  renderRecipeSets();
  updateCartBadge();
  
  // Show results
  if (errorCount === 0) {
    showNotification(`Successfully submitted ${successCount} request(s)`, 'success');
  } else {
    showNotification(`Submitted ${successCount}, failed ${errorCount}. ${errors.join('; ')}`, 'error');
  }
  
  await loadState();
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

window.openRequestModal = openRequestModal;
window.closeRequestQuantityModal = closeRequestQuantityModal;
window.handleRequestSubmit = handleRequestSubmit;
window.handleLogout = handleLogout;
window.addToCart = addToCart;
window.openCartModal = openCartModal;
window.closeCartModal = closeCartModal;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.submitAllRequests = submitAllRequests;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
