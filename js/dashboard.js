// Dashboard page initialization
async function initPage() {
  await loadState();
  renderDashboard();
  subscribeState(() => renderDashboard());
}

function renderDashboard() {
  if (!isAuthenticated()) {
    window.location.href = 'login.php';
    return;
  }

  const state = getAppState();
  const user = state.currentUser;
  updateUserInfo();
  updateNavigation();
  updatePageTitle();

  // Welcome message
  const welcomeText = document.getElementById('welcomeText');
  if (welcomeText && user) {
    welcomeText.textContent = `Welcome back, ${user.name}`;
  }

  // Calculate stats
  const totalValue = calculateTotalInventoryValue();
  const lowStockItems = getLowStockItems();
  const pendingDeliveries = state.purchases.filter(p => p.status === 'pending');
  const pendingRequests = state.requests.filter(r => r.status === 'pending');

  // Render stats
  renderStats(totalValue, lowStockItems, pendingDeliveries, pendingRequests);

  // Render chart for admin
  if (isAdmin()) {
    renderTotalSpentChart();
  }

  // Render alerts
  renderAlerts(lowStockItems, pendingRequests, pendingDeliveries);
}

function calculateTotalInventoryValue() {
  const state = getAppState();
  return state.inventory.reduce((total, item) => {
    return total + (item.quantity * item.pricePerUnit);
  }, 0);
}

function getLowStockItems() {
  const state = getAppState();
  return state.inventory.filter(item => item.quantity < item.minStockLevel);
}

function renderStats(totalValue, lowStockItems, pendingDeliveries, pendingRequests) {
  const statsGrid = document.getElementById('statsGrid');
  if (!statsGrid) return;

  const state = getAppState();
  const stats = [];
  
  if (isStockHandler()) {
    stats.push({
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      label: 'Total Inventory Value',
      value: formatCurrency(totalValue)
    });
  }

  if (isStockHandler()) {
    stats.push({
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600',
      label: 'Low Stock Items',
      value: lowStockItems.length.toString()
    });
  }

  if (isStockHandler() || isPurchaser()) {
    stats.push({
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      label: 'Pending Deliveries',
      value: pendingDeliveries.length.toString()
    });
  }

  if (isStockHandler() || isKitchenStaff()) {
    stats.push({
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
      label: 'Pending Requests',
      value: pendingRequests.length.toString()
    });
  }
  
  // Admin-specific stats
  if (isAdmin()) {
    const users = state.users || [];
    const activeUsers = users.filter(u => (u.status || 'active') === 'active').length;
    const totalPurchases = state.purchases?.length || 0;
    const completedPurchases = state.purchases?.filter(p => p.status === 'completed').length || 0;
    const totalSpent = state.purchases?.filter(p => p.status === 'completed').reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0) || 0;
    
    stats.push({
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      label: 'Active Users',
      value: activeUsers.toString()
    });
    
    stats.push({
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      bgColor: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      label: 'Total Purchases',
      value: totalPurchases.toString()
    });
    
    stats.push({
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      label: 'Total Spent',
      value: formatCurrency(totalSpent)
    });
  }
  
  // Admin sees all stats
  if (isAdmin()) {
    stats.push({
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      label: 'Total Inventory Value',
      value: formatCurrency(totalValue)
    });
    stats.push({
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      bgColor: 'bg-red-100',
      iconColor: 'text-red-600',
      label: 'Low Stock Items',
      value: lowStockItems.length.toString()
    });
    stats.push({
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      label: 'Pending Deliveries',
      value: pendingDeliveries.length.toString()
    });
    stats.push({
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
      label: 'Pending Requests',
      value: pendingRequests.length.toString()
    });
  }

  statsGrid.innerHTML = stats.map(stat => `
    <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div class="flex items-center">
        <div class="p-3 rounded-full ${stat.bgColor} ${stat.iconColor}">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${stat.icon}"></path>
          </svg>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-500">${stat.label}</p>
          <p class="text-2xl font-semibold text-gray-900">${stat.value}</p>
        </div>
      </div>
    </div>
  `).join('');
}

let totalSpentChart = null;

function renderTotalSpentChart() {
  const chartContainer = document.getElementById('chartContainer');
  const chartCanvas = document.getElementById('totalSpentChart');
  
  if (!chartContainer || !chartCanvas) return;
  
  const state = getAppState();
  const purchases = state.purchases || [];
  const completedPurchases = purchases.filter(p => p.status === 'completed');
  
  // Group by month
  const monthlyData = {};
  completedPurchases.forEach(p => {
    const date = new Date(p.dateDelivered || p.dateCreated);
    if (isNaN(date.getTime())) return; // Skip invalid dates
    
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = 0;
    }
    monthlyData[monthKey] += parseFloat(p.price) || 0;
  });
  
  // Sort by date and get last 12 months
  const sortedMonths = Object.keys(monthlyData).sort();
  const last12Months = sortedMonths.slice(-12);
  
  const labels = last12Months.map(month => {
    const date = new Date(month + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });
  
  const data = last12Months.map(month => monthlyData[month]);
  
  // Show container
  chartContainer.classList.remove('hidden');
  
  // Destroy existing chart if it exists
  if (totalSpentChart) {
    totalSpentChart.destroy();
  }
  
  // Create new chart
  const ctx = chartCanvas.getContext('2d');
  totalSpentChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total Spent (₱)',
        data: data,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Total Spent: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value).replace('.00', '');
            }
          },
          title: {
            display: true,
            text: 'Amount (₱)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Month'
          }
        }
      }
    }
  });
}

function renderAlerts(lowStockItems, pendingRequests, pendingDeliveries) {
  const alertsContainer = document.getElementById('alertsContainer');
  if (!alertsContainer) return;

  const alerts = [];
  const state = getAppState();

  // Check for requests with insufficient inventory (HIGHEST PRIORITY)
  if (isStockHandler() && pendingRequests.length > 0) {
    const insufficientRequests = pendingRequests.filter(r => r.hasInsufficientInventory);
    if (insufficientRequests.length > 0) {
      alerts.push({
        variant: 'urgent',
        title: '⚠️ URGENT: Insufficient Inventory',
        message: `${insufficientRequests.length} kitchen request${insufficientRequests.length !== 1 ? 's' : ''} cannot be fulfilled due to insufficient inventory.`,
        link: { text: 'Review Now', href: 'requests.php' },
        count: insufficientRequests.length
      });
    }
  }

  if (isStockHandler() && lowStockItems.length > 0) {
    alerts.push({
      variant: 'warning',
      title: 'Low Stock Warning',
      message: `There are ${lowStockItems.length} items below minimum stock level.`,
      link: { text: 'View Inventory', href: 'inventory.php' }
    });
  }


  const variantClasses = {
    urgent: 'bg-red-50 border-red-300 border-2 text-red-900',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800'
  };

  alertsContainer.innerHTML = alerts.map(alert => `
    <div class="rounded-lg border ${variantClasses[alert.variant]} p-4 ${alert.variant === 'urgent' ? 'animate-pulse' : ''}">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          ${alert.variant === 'urgent' ? `
            <svg class="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
          ` : ''}
        </div>
        <div class="ml-3 flex-1">
          <h3 class="text-sm font-semibold">${alert.title}</h3>
          <div class="mt-2 text-sm">
            <p>${alert.message} <a href="${alert.link.href}" class="underline font-medium hover:no-underline">${alert.link.text}</a></p>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

async function resetAllData() {
  const confirmed = await showConfirmModal(
    'Reset All Data',
    'Are you sure you want to reset all data? This will delete all purchases, requests, packages, and custom recipes. Only the initial inventory items will remain. This action cannot be undone.',
    async () => {
      try {
        const response = await API.resetData();
        if (response.success) {
          showAlertModal('Success', 'All data has been reset successfully! Reloading page...', 'success').then(() => {
            // Force a full page reload to ensure fresh state
            window.location.reload();
          });
        } else {
          showAlertModal('Error', response.error || 'Failed to reset data', 'error');
        }
      } catch (error) {
        console.error('Error resetting data:', error);
        showAlertModal('Error', 'Failed to reset data', 'error');
      }
    }
  );
}

function handleLogout() {
  logout();
}

// Make function globally available
window.handleLogout = handleLogout;
window.resetAllData = resetAllData;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
