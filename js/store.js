// Currency formatting utility
function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₱0.00';
  }
  return '₱' + parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Global application state
let appState = {
  currentUser: null,
  inventory: [],
  packagedItems: [],
  purchases: [],
  ingredientSets: [],
  requests: [],
  auditLogs: []
};

// State update listeners
const stateListeners = [];

function subscribeState(listener) {
  stateListeners.push(listener);
  return () => {
    const index = stateListeners.indexOf(listener);
    if (index > -1) {
      stateListeners.splice(index, 1);
    }
  };
}

function updateState(newState) {
  appState = { ...appState, ...newState };
  stateListeners.forEach(listener => listener(appState));
}

function getAppState() {
  return appState;
}

async function loadState() {
  try {
    const response = await API.getState();
    if (response.success) {
      updateState(response.data);
    }
  } catch (error) {
    console.error('Failed to load state:', error);
  }
}

async function login(username, password) {
  try {
    console.log('Calling API.login with:', { username, passwordLength: password.length });
    const response = await API.login(username, password);
    console.log('API.login response:', response);
    
    if (response && response.success) {
      // Update current user immediately from login response
      if (response.data) {
        console.log('Updating state with user:', response.data);
        updateState({ currentUser: response.data });
      }
      
      // Try to load state, but don't fail login if it fails
      try {
        console.log('Loading full state...');
        await Promise.race([
          loadState(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('State load timeout')), 10000)
          )
        ]);
        console.log('State loaded successfully');
      } catch (loadError) {
        console.warn('Failed to load full state after login:', loadError);
        // Login still succeeds even if state load fails
      }
      
      return true;
    } else {
      const errorMessage = response?.error || 'Login failed. Please check your credentials and try again.';
      console.error('Login failed - response:', response);
      console.error('Error message:', errorMessage);
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Login error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

async function logout() {
  try {
    await API.logout();
    updateState({
      currentUser: null,
      inventory: [],
      packagedItems: [],
      purchases: [],
      ingredientSets: [],
      requests: [],
      auditLogs: []
    });
    window.location.href = 'login.php';
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

// Helper functions for role checking
function isPurchaser() {
  return appState.currentUser?.role === 'purchaser';
}

function isStockHandler() {
  return appState.currentUser?.role === 'stock_handler';
}

function isKitchenStaff() {
  return appState.currentUser?.role === 'kitchen_staff';
}

function isAdmin() {
  return appState.currentUser?.role === 'admin';
}

function isAuthenticated() {
  return appState.currentUser !== null;
}

// Export functions for use in other scripts
window.loadState = loadState;
window.updateState = updateState;
window.getAppState = getAppState;
window.subscribeState = subscribeState;
window.login = login;
window.logout = logout;
window.isPurchaser = isPurchaser;
window.isStockHandler = isStockHandler;
window.isKitchenStaff = isKitchenStaff;
window.isAdmin = isAdmin;
window.isAuthenticated = isAuthenticated;
