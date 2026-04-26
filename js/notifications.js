// Notification system

// Track read notifications with expiration (24 hours)
let readNotifications = new Map();

function loadReadNotifications() {
  try {
    const saved = localStorage.getItem('readNotifications');
    if (saved) {
      const data = JSON.parse(saved);
      const now = Date.now();
      readNotifications = new Map();
      // Only load notifications that haven't expired (older than 24 hours are removed)
      Object.entries(data).forEach(([id, timestamp]) => {
        if (now - timestamp < 24 * 60 * 60 * 1000) {
          readNotifications.set(id, timestamp);
        }
      });
      // Save cleaned up version
      saveReadNotifications();
    }
  } catch (e) {
    console.error('Error loading read notifications:', e);
    readNotifications = new Map();
  }
}

function saveReadNotifications() {
  try {
    const data = {};
    readNotifications.forEach((timestamp, id) => {
      data[id] = timestamp;
    });
    localStorage.setItem('readNotifications', JSON.stringify(data));
  } catch (e) {
    console.error('Error saving read notifications:', e);
  }
}

function markNotificationAsRead(notificationId) {
  readNotifications.set(notificationId, Date.now());
  saveReadNotifications();
}

function markAllNotificationsAsRead(notifications) {
  const now = Date.now();
  notifications.forEach(notif => {
    readNotifications.set(notif.id, now);
  });
  saveReadNotifications();
}

function isNotificationRead(notificationId) {
  return readNotifications.has(notificationId);
}

// Simple hash function for creating stable notification IDs
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Load read notifications on page load
loadReadNotifications();

// Inject custom bell bounce animation CSS
(function() {
  if (document.getElementById('bellBounceStyle')) return; // Already injected
  
  const style = document.createElement('style');
  style.id = 'bellBounceStyle';
  style.textContent = `
    @keyframes bellBounce {
      0%, 100% {
        transform: translateY(0);
      }
      10%, 30%, 50%, 70%, 90% {
        transform: translateY(-4px);
      }
      20%, 40%, 60%, 80% {
        transform: translateY(0);
      }
    }
    .animate-bell-bounce {
      animation: bellBounce 1s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
})();

function getNotifications() {
  const state = getAppState();
  const notifications = [];
  
  if (!state || !state.currentUser) return notifications;
  
  const user = state.currentUser;
  const purchases = state.purchases || [];
  const requests = state.requests || [];
  const inventory = state.inventory || [];
  
  // Get current time for checking recent updates (last 7 days)
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  // NOTIFICATIONS FOR PURCHASERS
  if (isPurchaser()) {
    // Check for recently confirmed deliveries (purchases that were completed in last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentCompletedPurchases = purchases.filter(p => 
      p.status === 'completed' && 
      p.purchaserId === user.id &&
      p.dateDelivered &&
      new Date(p.dateDelivered).getTime() > oneDayAgo
    );
    
    if (recentCompletedPurchases.length > 0) {
      // Create stable ID based on purchase IDs
      const purchaseIds = recentCompletedPurchases.map(p => p.id).sort().join(',');
      const notificationId = `confirmed-deliveries-${hashString(purchaseIds)}`;
      notifications.push({
        id: notificationId,
        type: 'success',
        title: '✅ Delivery Confirmed',
        message: `${recentCompletedPurchases.length} of your purchase${recentCompletedPurchases.length !== 1 ? 's' : ''} ${recentCompletedPurchases.length === 1 ? 'has' : 'have'} been confirmed and delivered`,
        link: 'purchases.php',
        count: recentCompletedPurchases.length,
        timestamp: Date.now()
      });
    }
  }
  
  // NOTIFICATIONS FOR KITCHEN STAFF
  if (isKitchenStaff()) {
    // Check for approved requests (requests that were approved in last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const approvedRequests = requests.filter(r => 
      r.status === 'approved' && 
      r.kitchenStaffId === user.id &&
      r.dateProcessed &&
      new Date(r.dateProcessed).getTime() > oneDayAgo
    );
    
    if (approvedRequests.length > 0) {
      const requestIds = approvedRequests.map(r => r.id).sort().join(',');
      const notificationId = `approved-requests-${hashString(requestIds)}`;
      notifications.push({
        id: notificationId,
        type: 'success',
        title: '✅ Request Approved',
        message: `${approvedRequests.length} of your request${approvedRequests.length !== 1 ? 's' : ''} ${approvedRequests.length === 1 ? 'has' : 'have'} been approved by stock handler`,
        link: 'requests.php',
        count: approvedRequests.length,
        timestamp: Date.now()
      });
    }
    
    // Check for rejected requests (in last 24 hours)
    const rejectedRequests = requests.filter(r => 
      r.status === 'rejected' && 
      r.kitchenStaffId === user.id &&
      r.dateProcessed &&
      new Date(r.dateProcessed).getTime() > oneDayAgo
    );
    
    if (rejectedRequests.length > 0) {
      const requestIds = rejectedRequests.map(r => r.id).sort().join(',');
      const notificationId = `rejected-requests-${hashString(requestIds)}`;
      notifications.push({
        id: notificationId,
        type: 'warning',
        title: '⚠️ Request Rejected',
        message: `${rejectedRequests.length} of your request${rejectedRequests.length !== 1 ? 's' : ''} ${rejectedRequests.length === 1 ? 'has' : 'have'} been rejected`,
        link: 'requests.php',
        count: rejectedRequests.length,
        timestamp: Date.now()
      });
    }
  }
  
  // NOTIFICATIONS FOR STOCK HANDLERS
  if (isStockHandler()) {
    // Check for requests with insufficient inventory (HIGHEST PRIORITY)
    const pendingRequests = requests.filter(r => r.status === 'pending');
    if (pendingRequests.length > 0) {
      const insufficientRequests = pendingRequests.filter(r => r.hasInsufficientInventory);
      if (insufficientRequests.length > 0) {
        const requestIds = insufficientRequests.map(r => r.id).sort().join(',');
        const notificationId = `insufficient-inventory-${hashString(requestIds)}`;
        notifications.push({
          id: notificationId,
          type: 'urgent',
          title: '⚠️ URGENT: Insufficient Inventory',
          message: `${insufficientRequests.length} kitchen request${insufficientRequests.length !== 1 ? 's' : ''} cannot be fulfilled`,
          link: 'requests.php',
          count: insufficientRequests.length,
          timestamp: Date.now()
        });
      }
    }
    
    // Low stock warning
    const lowStockItems = inventory.filter(item => item.quantity < item.minStockLevel);
    if (lowStockItems.length > 0) {
      const itemIds = lowStockItems.map(item => item.id).sort().join(',');
      const notificationId = `low-stock-${hashString(itemIds)}`;
      notifications.push({
        id: notificationId,
        type: 'warning',
        title: 'Low Stock Warning',
        message: `${lowStockItems.length} item${lowStockItems.length !== 1 ? 's' : ''} below minimum stock level`,
        link: 'inventory.php',
        count: lowStockItems.length,
        timestamp: Date.now()
      });
    }
    
    // Pending kitchen requests
    if (pendingRequests.length > 0) {
      const requestIds = pendingRequests.map(r => r.id).sort().join(',');
      const notificationId = `pending-requests-${hashString(requestIds)}`;
      notifications.push({
        id: notificationId,
        type: 'info',
        title: 'Kitchen Requests',
        message: `${pendingRequests.length} pending request${pendingRequests.length !== 1 ? 's' : ''} to approve`,
        link: 'requests.php',
        count: pendingRequests.length,
        timestamp: Date.now()
      });
    }
    
    // Pending deliveries
    const pendingDeliveries = purchases.filter(p => p.status === 'pending');
    if (pendingDeliveries.length > 0) {
      const purchaseIds = pendingDeliveries.map(p => p.id).sort().join(',');
      const notificationId = `pending-deliveries-${hashString(purchaseIds)}`;
      notifications.push({
        id: notificationId,
        type: 'success',
        title: 'Incoming Deliveries',
        message: `${pendingDeliveries.length} purchase order${pendingDeliveries.length !== 1 ? 's' : ''} pending delivery confirmation`,
        link: 'purchases.php',
        count: pendingDeliveries.length,
        timestamp: Date.now()
      });
    }
  }
  
  return notifications;
}

function renderNotificationBell() {
  // Show notification bell for all authenticated users
  if (!isAuthenticated()) {
    const bellContainer = document.getElementById('notificationBellContainer');
    if (bellContainer) {
      bellContainer.innerHTML = '';
    }
    return;
  }
  
  const notifications = getNotifications();
  // Filter out read notifications
  const unreadNotifications = notifications.filter(notif => !isNotificationRead(notif.id));
  const totalCount = unreadNotifications.reduce((sum, notif) => sum + (notif.count || 1), 0);
  const urgentCount = unreadNotifications.filter(n => n.type === 'urgent').length;
  
  // Get the notification bell container (should exist in header HTML)
  const bellContainer = document.getElementById('notificationBellContainer');
  if (!bellContainer) return;
  
  // Check if dropdown is currently open
  const dropdown = document.getElementById('notificationDropdown');
  const wasOpen = dropdown && !dropdown.classList.contains('hidden');
  
  // Update notification bell button
  bellContainer.innerHTML = `
    <div class="relative">
      <button 
        id="notificationBell" 
        onclick="event.stopPropagation(); toggleNotificationDropdown(event);" 
        class="relative p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${totalCount > 0 ? 'shadow-sm' : ''}"
        title="Notifications"
      >
        <svg class="h-6 w-6 transition-transform duration-200 ${totalCount > 0 ? 'animate-bell-bounce' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
        </svg>
        ${totalCount > 0 ? `
          <span class="absolute top-0.5 right-0.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600 shadow-md ring-2 ring-white ${urgentCount > 0 ? 'animate-pulse' : ''}">
            ${totalCount > 99 ? '99+' : totalCount}
          </span>
        ` : ''}
      </button>
      <div 
        id="notificationDropdown" 
        class="hidden absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-hidden transform transition-all duration-200"
        style="top: 100%; z-index: 9999;"
      >
        <div class="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-gray-900">Notifications</h3>
            ${totalCount > 0 ? `<span class="px-2 py-0.5 text-xs font-semibold text-gray-700 bg-gray-200 rounded-full">${totalCount} new</span>` : ''}
          </div>
        </div>
        <div id="notificationList" class="overflow-y-auto max-h-80">
          ${renderNotificationList(unreadNotifications.length > 0 ? unreadNotifications : notifications)}
        </div>
      </div>
    </div>
  `;
  
  // If dropdown was open, restore its open state
  if (wasOpen) {
    setTimeout(() => {
      const newDropdown = document.getElementById('notificationDropdown');
      if (newDropdown) {
        newDropdown.classList.remove('hidden');
        // Update the list
        const updatedNotifications = getNotifications();
        const updatedUnread = updatedNotifications.filter(notif => !isNotificationRead(notif.id));
        const list = document.getElementById('notificationList');
        if (list) {
          list.innerHTML = renderNotificationList(updatedUnread.length > 0 ? updatedUnread : updatedNotifications);
        }
      }
    }, 0);
  }
}

function renderNotificationList(notifications) {
  if (notifications.length === 0) {
    return `
      <div class="p-8 text-center">
        <svg class="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
        </svg>
        <p class="mt-3 text-sm font-medium text-gray-500">All caught up!</p>
        <p class="mt-1 text-xs text-gray-400">No new notifications</p>
      </div>
    `;
  }
  
  const typeIcons = {
    urgent: `<svg class="h-5 w-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
    </svg>`,
    warning: `<svg class="h-5 w-5 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
    </svg>`,
    info: `<svg class="h-5 w-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
    </svg>`,
    success: `<svg class="h-5 w-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
    </svg>`
  };
  
  const typeColors = {
    urgent: 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500',
    warning: 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-500',
    info: 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500',
    success: 'bg-green-50 hover:bg-green-100 border-l-4 border-green-500'
  };
  
  return notifications.map(notif => {
    // Escape strings for use in onclick attribute
    const escapedTitle = escapeHtml(notif.title).replace(/'/g, "\\'");
    const escapedMessage = escapeHtml(notif.message).replace(/'/g, "\\'");
    const escapedLink = escapeHtml(notif.link).replace(/'/g, "\\'");
    
    return `
    <div 
      onclick="event.stopPropagation(); showNotificationModal(event, '${notif.id}', '${escapedTitle}', '${escapedMessage}', '${escapedLink}', ${notif.count || 1}, '${notif.type}');"
      class="block p-4 border-b border-gray-100 ${typeColors[notif.type]} transition-all duration-150 cursor-pointer ${notif.type === 'urgent' ? 'animate-pulse' : ''}"
    >
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0 mt-0.5">
          ${typeIcons[notif.type]}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-900 leading-tight">${escapeHtml(notif.title)}</p>
          <p class="mt-1.5 text-sm text-gray-600 leading-snug">${escapeHtml(notif.message)}</p>
          ${notif.count > 1 ? `<p class="mt-1.5 text-xs font-medium text-gray-500">${notif.count} items</p>` : ''}
        </div>
      </div>
    </div>
  `;
  }).join('');
}

function toggleNotificationDropdown(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  const dropdown = document.getElementById('notificationDropdown');
  if (!dropdown) {
    // If dropdown doesn't exist, re-render the bell first
    renderNotificationBell();
    // Try again after a short delay
    setTimeout(() => {
      toggleNotificationDropdown(event);
    }, 50);
    return;
  }
  
  const wasHidden = dropdown.classList.contains('hidden');
  
  if (wasHidden) {
    // Opening dropdown - update the list first
    const notifications = getNotifications();
    const unreadNotifications = notifications.filter(notif => !isNotificationRead(notif.id));
    const list = document.getElementById('notificationList');
    if (list) {
      list.innerHTML = renderNotificationList(unreadNotifications.length > 0 ? unreadNotifications : notifications);
    }
    
    // Show dropdown
    dropdown.classList.remove('hidden');
    
    // Close dropdown when clicking outside (with delay to avoid immediate closing)
    setTimeout(() => {
      document.addEventListener('click', closeNotificationOnOutsideClick, true);
    }, 200);
  } else {
    // Closing dropdown
    dropdown.classList.add('hidden');
    document.removeEventListener('click', closeNotificationOnOutsideClick, true);
  }
}

function closeNotificationDropdown() {
  const dropdown = document.getElementById('notificationDropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
  document.removeEventListener('click', closeNotificationOnOutsideClick, true);
}

function closeNotificationOnOutsideClick(event) {
  const bell = document.getElementById('notificationBell');
  const dropdown = document.getElementById('notificationDropdown');
  
  // Don't close if clicking on the bell or dropdown
  if (bell && bell.contains(event.target)) {
    return;
  }
  
  if (dropdown && dropdown.contains(event.target)) {
    return;
  }
  
  // Close if clicking outside
  if (bell && dropdown) {
    closeNotificationDropdown();
  }
}

function updateNotifications() {
  renderNotificationBell();
  // Update notification list if dropdown is open
  const dropdown = document.getElementById('notificationDropdown');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    const notifications = getNotifications();
    const unreadNotifications = notifications.filter(notif => !isNotificationRead(notif.id));
    const list = document.getElementById('notificationList');
    if (list) {
      list.innerHTML = renderNotificationList(unreadNotifications.length > 0 ? unreadNotifications : notifications);
    }
  }
}

// Subscribe to state changes to update notifications
if (typeof subscribeState === 'function') {
  subscribeState(() => {
    updateNotifications();
  });
}

function showNotificationModal(event, notificationId, title, message, link, count, type) {
  // Prevent event bubbling
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  // Mark notification as read
  markNotificationAsRead(notificationId);
  
  // Update the notification list without closing dropdown
  const notifications = getNotifications();
  const unreadNotifications = notifications.filter(notif => !isNotificationRead(notif.id));
  const list = document.getElementById('notificationList');
  if (list) {
    list.innerHTML = renderNotificationList(unreadNotifications.length > 0 ? unreadNotifications : notifications);
  }
  
  // Update badge count
  renderNotificationBell();
  
  // Close dropdown
  closeNotificationDropdown();
  
  // Navigate directly to the link without showing modal
  if (link && link !== 'undefined' && link !== '') {
    window.location.href = link;
  }
}

// Make functions globally available
window.toggleNotificationDropdown = toggleNotificationDropdown;
window.closeNotificationDropdown = closeNotificationDropdown;
window.updateNotifications = updateNotifications;
window.getNotifications = getNotifications;
window.markNotificationAsRead = markNotificationAsRead;
window.renderNotificationBell = renderNotificationBell;
window.showNotificationModal = showNotificationModal;
