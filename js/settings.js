// Settings page initialization
async function initSettings() {
  await loadState();
  
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
  loadSystemConfig();
  loadBackups();
}

async function loadSystemConfig() {
  try {
    const response = await API.getSystemConfig();
    if (response.success) {
      const config = response.data || {};
      renderSystemConfig(config);
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

function renderSystemConfig(config) {
  const container = document.getElementById('configContainer');
  if (!container) return;
  
  const defaultConfig = {
    'low_stock_threshold_percentage': { value: '20', description: 'Percentage below min stock level to trigger low stock alert' },
    'default_min_stock_level': { value: '10', description: 'Default minimum stock level for new items' },
    'enable_email_notifications': { value: 'false', description: 'Enable email notifications for low stock' },
    'backup_retention_days': { value: '30', description: 'Number of days to retain backups' }
  };
  
  const allConfig = { ...defaultConfig, ...config };
  
  container.innerHTML = Object.entries(allConfig).map(([key, data]) => {
    const value = config[key]?.value || data.value || '';
    const description = data.description || '';
    
    return `
      <div class="flex items-center justify-between py-2 border-b border-gray-100">
        <div class="flex-1">
          <label class="text-sm font-medium text-gray-700">${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
          <p class="text-xs text-gray-500 mt-1">${description}</p>
        </div>
        <div class="ml-4">
          ${key.includes('enable') ? `
            <select onchange="updateConfig('${key}', this.value)" class="px-3 py-1 border border-gray-300 rounded-md text-sm">
              <option value="true" ${value === 'true' ? 'selected' : ''}>Enabled</option>
              <option value="false" ${value === 'false' ? 'selected' : ''}>Disabled</option>
            </select>
          ` : `
            <input type="${key.includes('percentage') || key.includes('days') || key.includes('level') ? 'number' : 'text'}" 
                   value="${value}" 
                   onchange="updateConfig('${key}', this.value)"
                   class="px-3 py-1 border border-gray-300 rounded-md text-sm w-32">
          `}
        </div>
      </div>
    `;
  }).join('');
}

async function updateConfig(key, value) {
  try {
    const response = await API.updateSystemConfig(key, value);
    if (response.success) {
      showNotification('Configuration updated successfully', 'success');
      loadSystemConfig();
      await loadState();
    } else {
      showNotification('Error updating configuration: ' + (response.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    showNotification('Error updating configuration: ' + error.message, 'error');
  }
}

async function createBackup() {
  if (!confirm('Create a database backup? This may take a moment.')) {
    return;
  }
  
  try {
    showNotification('Creating backup...', 'info');
    const response = await API.backupDatabase();
    if (response.success) {
      showNotification('Backup created successfully: ' + response.backupFile, 'success');
      loadBackups();
      await loadState();
    } else {
      showNotification('Error creating backup: ' + (response.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    showNotification('Error creating backup: ' + error.message, 'error');
  }
}

async function loadBackups() {
  try {
    const response = await API.listBackups();
    if (response.success) {
      renderBackups(response.data || []);
    }
  } catch (error) {
    console.error('Error loading backups:', error);
  }
}

function renderBackups(backups) {
  const container = document.getElementById('backupsList');
  if (!container) return;
  
  if (backups.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-sm">No backups found</p>';
    return;
  }
  
  container.innerHTML = `
    <div class="space-y-2">
      ${backups.map(backup => {
        const sizeKB = (backup.size / 1024).toFixed(2);
        return `
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900">${backup.filename}</p>
              <p class="text-xs text-gray-500">${sizeKB} KB • ${backup.created}</p>
            </div>
            <button onclick="restoreBackup('${backup.filename}')" class="ml-4 px-3 py-1 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 transition-colors">
              Restore
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function restoreBackup(filename) {
  if (!confirm(`WARNING: This will restore the database from "${filename}". All current data will be replaced. This action cannot be undone. Continue?`)) {
    return;
  }
  
  if (!confirm('Are you absolutely sure? This will overwrite all current data!')) {
    return;
  }
  
  try {
    showNotification('Restoring backup...', 'info');
    const response = await API.restoreDatabase(filename);
    if (response.success) {
      showNotification('Backup restored successfully. Reloading page...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      showNotification('Error restoring backup: ' + (response.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    showNotification('Error restoring backup: ' + error.message, 'error');
  }
}

async function exportData(type) {
  // Find the button that was clicked
  const buttons = document.querySelectorAll('[onclick*="exportData"]');
  let clickedButton = null;
  buttons.forEach(btn => {
    if (btn.getAttribute('onclick').includes(`'${type}'`)) {
      clickedButton = btn;
    }
  });
  
  // Store original content for restoration
  let originalContent = null;
  if (clickedButton) {
    originalContent = clickedButton.innerHTML;
    clickedButton.disabled = true;
    clickedButton.innerHTML = `
      <div class="flex items-center justify-center gap-2 py-2">
        <svg class="animate-spin h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-sm font-medium text-gray-700">Exporting...</span>
      </div>
    `;
    clickedButton.classList.add('opacity-75', 'cursor-not-allowed');
  }
  
  try {
    showNotification('Exporting data...', 'info');
    const response = await API.exportData(type);
    if (response.success) {
      const data = response.data;
      let csvContent = '';
      let filename = '';
      
      if (type === 'inventory' && data.inventory) {
        const headers = ['ID', 'Name', 'Quantity', 'Unit', 'Min Stock Level', 'Price Per Unit', 'Category', 'Last Updated'];
        const rows = data.inventory.map(item => [
          item.id || '',
          item.name || '',
          item.quantity || '',
          item.unit || '',
          item.minStockLevel || '',
          item.pricePerUnit || '',
          item.category || '',
          item.lastUpdated ? new Date(item.lastUpdated).toLocaleString() : ''
        ]);
        csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        filename = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (type === 'purchases' && data.purchases) {
        const headers = ['ID', 'Item Name', 'Quantity', 'Display Unit', 'Base Unit', 'Price', 'Status', 'Date Ordered', 'Date Delivered', 'Supplier'];
        const rows = data.purchases.map(p => [
          p.id || '',
          p.itemName || '',
          p.quantity || '',
          p.displayUnit || '',
          p.baseUnit || '',
          p.price || '',
          p.status || '',
          p.dateCreated ? new Date(p.dateCreated).toLocaleDateString() : '',
          p.dateDelivered ? new Date(p.dateDelivered).toLocaleDateString() : '',
          p.supplier || ''
        ]);
        csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        filename = `purchases_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (type === 'users' && data.users) {
        const headers = ['ID', 'Username', 'Name', 'Email', 'Role', 'Status', 'Created At'];
        const rows = data.users.map(u => [
          u.id || '',
          u.username || '',
          u.name || '',
          u.email || '',
          u.role || '',
          u.status || 'active',
          u.created_at ? new Date(u.created_at).toLocaleDateString() : ''
        ]);
        csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        filename = `users_${new Date().toISOString().split('T')[0]}.csv`;
      }
      
      if (csvContent) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('Data exported successfully', 'success');
      }
    } else {
      showNotification('Error exporting data: ' + (response.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    showNotification('Error exporting data: ' + error.message, 'error');
  } finally {
    // Re-enable button and restore original content
    if (clickedButton && originalContent) {
      clickedButton.disabled = false;
      clickedButton.classList.remove('opacity-75', 'cursor-not-allowed');
      clickedButton.innerHTML = originalContent;
    }
  }
}

window.updateConfig = updateConfig;
window.createBackup = createBackup;
window.loadBackups = loadBackups;
window.restoreBackup = restoreBackup;
window.exportData = exportData;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettings);
} else {
  initSettings();
}
