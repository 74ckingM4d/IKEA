const API_BASE = 'api/index.php';
// Export to global scope for debugging
window.API_BASE = API_BASE;

async function apiCall(action, method = 'GET', data = null, queryParams = {}) {
  const options = {
    method: method.toUpperCase(), // Ensure uppercase
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin' // Include cookies for session
  };

  if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  let url = `${API_BASE}?action=${action}`;
  if (Object.keys(queryParams).length > 0) {
    const params = new URLSearchParams(queryParams);
    url += '&' + params.toString();
  }
  console.log('API Call:', { url, method: options.method, action, hasData: !!data });
  
  // Add timeout to prevent hanging
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
  
  try {
    options.signal = controller.signal;
    console.log('Fetching:', url, 'with options:', { method: options.method, hasBody: !!options.body });
    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    console.log('Response status:', response.status, response.statusText);
  
  // Check if response is OK
  if (!response.ok) {
    // Try to parse error response as JSON, fallback to text
    let errorData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } else {
      const text = await response.text();
      errorData = { success: false, error: `HTTP ${response.status}: ${response.statusText}`, details: text };
    }
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  // Parse JSON response
  const text = await response.text();
  if (!text.trim()) {
    throw new Error('Empty response from server');
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - server took too long to respond');
    }
    throw error;
  }
}

const API = {
  login: (username, password) => apiCall('login', 'POST', { username, password }),
  logout: () => apiCall('logout', 'POST'),
  getState: () => apiCall('getState', 'GET'),
  addPurchase: (data) => apiCall('addPurchase', 'POST', data),
  uploadReceipt: async (file) => {
    const formData = new FormData();
    formData.append('receipt', file);
    const response = await fetch(`${API_BASE}?action=uploadReceipt`, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin'
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return response.json();
  },
  uploadRecipeImage: async (file) => {
    const formData = new FormData();
    formData.append('recipeImage', file);
    const response = await fetch(`${API_BASE}?action=uploadRecipeImage`, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin'
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return response.json();
  },
  confirmDelivery: (id, isComplete) => apiCall('confirmDelivery', 'POST', { id, isComplete }),
  confirmDeliveryPartial: (id, receivedQuantity) => apiCall('confirmDeliveryPartial', 'POST', { id, receivedQuantity }),
  createPackage: (rawItemId, totalRawQty, packSize, packUnit) => apiCall('createPackage', 'POST', { rawItemId, totalRawQty, packSize, packUnit }),
  deletePackage: (packageId) => apiCall('deletePackage', 'POST', { packageId }),
  addIngredientSet: (data) => apiCall('addIngredientSet', 'POST', data),
  deleteIngredientSet: (id) => apiCall('deleteIngredientSet', 'POST', { id }),
  addRequest: (setId, quantity) => apiCall('addRequest', 'POST', { setId, quantity }),
  addSingleItemRequest: (inventoryItemId, requestedQuantity, requestedUnit) => apiCall('addSingleItemRequest', 'POST', { inventoryItemId, requestedQuantity, requestedUnit }),
  processRequest: (requestId, approved) => apiCall('processRequest', 'POST', { requestId, approved }),
  updateInventoryItem: (itemId, data) => apiCall('updateInventoryItem', 'POST', { itemId, ...data }),
  deletePurchase: (id) => apiCall('deletePurchase', 'POST', { id }),
  deleteRequest: (id) => apiCall('deleteRequest', 'POST', { id }),
  resetData: () => apiCall('resetData', 'POST', {}),
  // User Management (Admin only)
  getUsers: () => apiCall('getUsers', 'GET'),
  getUser: (id) => apiCall('getUser', 'GET', null, { id }),
  createUser: (data) => apiCall('createUser', 'POST', data),
  updateUser: (data) => apiCall('updateUser', 'POST', data),
  deleteUser: (id) => apiCall('deleteUser', 'POST', { id }),
  resetUserPassword: (id, password) => apiCall('resetUserPassword', 'POST', { id, password }),
  updateUserStatus: (id, status) => apiCall('updateUserStatus', 'POST', { id, status }),
  // System Configuration (Admin only)
  getSystemConfig: () => apiCall('getSystemConfig', 'GET'),
  updateSystemConfig: (key, value) => apiCall('updateSystemConfig', 'POST', { key, value }),
  // Backup & Restore (Admin only)
  backupDatabase: () => apiCall('backupDatabase', 'POST', {}),
  listBackups: () => apiCall('listBackups', 'GET'),
  restoreDatabase: (filename) => apiCall('restoreDatabase', 'POST', { filename }),
  // Data Export (Admin only)
  exportData: (type) => apiCall('exportData', 'POST', { type }),
  // Password Management
  sendPasswordVerificationCode: (email) => apiCall('sendPasswordVerificationCode', 'POST', { email }),
  verifyPasswordCode: (code) => apiCall('verifyPasswordCode', 'POST', { code }),
  changePassword: (code, newPassword, confirmPassword) => apiCall('changePassword', 'POST', { code, newPassword, confirmPassword }),
  // Payment Management
  updatePaymentStatus: (data) => apiCall('updatePaymentStatus', 'POST', data),
  // Disposal Management
  disposeInventoryItem: (data) => apiCall('disposeInventoryItem', 'POST', data)
};

// Export API to global scope
window.API = API;
