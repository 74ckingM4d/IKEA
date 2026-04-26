// Layout initialization
document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  
  if (!isAuthenticated()) {
    window.location.href = 'login.php';
    return;
  }

  updateUserInfo();
  updateNavigation();
  updatePageTitle();
  updateNotifications();
});

function updateUserInfo() {
  const state = getAppState();
  const user = state.currentUser;
  if (user) {
    // Update header user dropdown
    const headerUserNameEl = document.getElementById('headerUserName');
    const headerUserRoleEl = document.getElementById('headerUserRole');
    const headerUserInitialEl = document.getElementById('headerUserInitial');
    const headerUserNameMobileEl = document.getElementById('headerUserNameMobile');
    const headerUserRoleMobileEl = document.getElementById('headerUserRoleMobile');
    
    if (headerUserNameEl) headerUserNameEl.textContent = user.name;
    if (headerUserRoleEl) headerUserRoleEl.textContent = user.role.replace('_', ' ');
    if (headerUserInitialEl) headerUserInitialEl.textContent = user.name.charAt(0).toUpperCase();
    if (headerUserNameMobileEl) headerUserNameMobileEl.textContent = user.name;
    if (headerUserRoleMobileEl) headerUserRoleMobileEl.textContent = user.role.replace('_', ' ');
    
    // Legacy support for sidebar (if exists)
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const userInitialEl = document.getElementById('userInitial');
    
    if (userNameEl) userNameEl.textContent = user.name;
    if (userRoleEl) userRoleEl.textContent = user.role.replace('_', ' ');
    if (userInitialEl) userInitialEl.textContent = user.name.charAt(0).toUpperCase();
  }
}

function toggleUserDropdown() {
  const dropdown = document.getElementById('userDropdown');
  if (!dropdown) return;
  
  dropdown.classList.toggle('hidden');
  
  // Close dropdown when clicking outside
  if (!dropdown.classList.contains('hidden')) {
    setTimeout(() => {
      document.addEventListener('click', closeUserDropdownOnOutsideClick, true);
    }, 0);
  }
}

function closeUserDropdown() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
  document.removeEventListener('click', closeUserDropdownOnOutsideClick, true);
}

function closeUserDropdownOnOutsideClick(event) {
  const userMenu = document.getElementById('userMenuButton');
  const dropdown = document.getElementById('userDropdown');
  
  if (userMenu && dropdown && !userMenu.contains(event.target) && !dropdown.contains(event.target)) {
    closeUserDropdown();
  }
}

function updateNavigation() {
  const navLinks = document.getElementById('navLinks');
  if (!navLinks) return;

  const currentPath = window.location.pathname.split('/').pop() || 'index.php';
  
  const links = [
    { to: 'index.php', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', show: true, type: 'link' },
    { to: 'purchases.php', label: 'Purchases', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z', show: isPurchaser() || isStockHandler(), type: 'link' },
    { 
      label: 'Inventory', 
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', 
      show: isStockHandler(), 
      type: 'group',
      children: [
        { to: 'inventory.php', label: 'Raw Inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
        { to: 'packed-items.php', label: 'Prepred Items', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' }
      ]
    },
    { to: 'ingredients.php', label: 'Make Set', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', show: isStockHandler(), type: 'link' },
    { to: 'recipe-sets.php', label: 'Set Request', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', show: isKitchenStaff(), type: 'link' },
    { to: 'requests.php', label: 'Kitchen Requests', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', show: isKitchenStaff() || isStockHandler(), type: 'link' },
    { to: 'history.php', label: 'History', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', show: true, type: 'link' },
    // Admin-only links
    { to: 'inventory-management.php', label: 'Inventory Management', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', show: isAdmin(), type: 'link' },
    { to: 'payments.php', label: 'Payment Management', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', show: isAdmin(), type: 'link' },
    { to: 'reports.php', label: 'Reports & Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', show: isAdmin(), type: 'link' },
    { to: 'users.php', label: 'User Management', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', show: isAdmin(), type: 'link' },
    { to: 'settings.php', label: 'System Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', show: isAdmin(), type: 'link' }
  ];

  let html = '';
  
  links.filter(link => link.show).forEach(link => {
    if (link.type === 'group') {
      // Check if any child is active
      const hasActiveChild = link.children.some(child => {
        return currentPath === child.to || (currentPath === '' && child.to === 'index.php');
      });
      const isExpanded = hasActiveChild || currentPath === 'inventory.php' || currentPath === 'packed-items.php';
      
      html += `
        <li>
          <div class="px-6 py-3">
            <button onclick="toggleInventorySubmenu()" class="flex items-center w-full text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              <svg class="h-5 w-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${link.icon}"></path>
              </svg>
              ${link.label}
              <svg class="ml-auto h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
            <ul class="mt-1 ${isExpanded ? '' : 'hidden'}" id="inventorySubmenu">
              ${link.children.map(child => {
                const isActive = currentPath === child.to;
                const activeClass = isActive ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900';
                return `
                  <li>
                    <a href="${child.to}" class="flex items-center pl-14 pr-6 py-2 text-sm font-medium transition-colors ${activeClass}" onclick="closeSidebar()">
                      <svg class="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${child.icon}"></path>
                      </svg>
                      ${child.label}
                    </a>
                  </li>
                `;
              }).join('')}
            </ul>
          </div>
        </li>
      `;
    } else {
      const isActive = currentPath === link.to || (currentPath === '' && link.to === 'index.php');
      const activeClass = isActive ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900';
      html += `
        <li>
          <a href="${link.to}" class="flex items-center px-6 py-3 text-sm font-medium transition-colors ${activeClass}" onclick="closeSidebar()">
            <svg class="h-5 w-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${link.icon}"></path>
            </svg>
            ${link.label}
          </a>
        </li>
      `;
    }
  });

  navLinks.innerHTML = html;
}

function toggleInventorySubmenu() {
  const submenu = document.getElementById('inventorySubmenu');
  const button = event.currentTarget;
  const arrow = button.querySelector('svg:last-child');
  
  if (submenu) {
    submenu.classList.toggle('hidden');
    if (arrow) {
      arrow.classList.toggle('rotate-90');
    }
  }
}

function updatePageTitle() {
  const pageTitleEl = document.getElementById('pageTitle');
  if (!pageTitleEl) return;
  
  const state = getAppState();
  const user = state.currentUser;
  if (!user) return;
  
  const titles = {
    purchaser: 'Purchasing Dashboard',
    stock_handler: 'Inventory Management',
    kitchen_staff: 'Kitchen Operations',
    admin: 'Admin Dashboard'
  };
  
  pageTitleEl.textContent = titles[user.role] || 'Dashboard';
}

function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('-translate-x-full');
  if (overlay) {
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    overlay.classList.add('opacity-100');
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.add('-translate-x-full');
  if (overlay) {
    overlay.classList.remove('opacity-100');
    overlay.classList.add('opacity-0', 'pointer-events-none');
  }
}

// Logout handler
function handleLogout() {
  logout();
}

// Make functions globally available
window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;
window.toggleUserDropdown = toggleUserDropdown;
window.closeUserDropdown = closeUserDropdown;
window.toggleInventorySubmenu = toggleInventorySubmenu;
window.handleLogout = handleLogout;