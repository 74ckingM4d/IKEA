// History page initialization
let allLogs = [];

async function initPage() {
  await loadState();
  renderHistory();
  subscribeState(() => renderHistory());
}

function renderHistory() {
  if (!isAuthenticated()) {
    window.location.href = 'login.php';
    return;
  }

  updateUserInfo();
  updateNavigation();
  updatePageTitle();

  const state = getAppState();
  allLogs = state.auditLogs || [];
  applyFilters();
}

function applyFilters() {
  const container = document.getElementById('historyContainer');
  if (!container) return;

  const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const actionFilter = document.getElementById('actionFilter')?.value || '';
  const dateFrom = document.getElementById('dateFrom')?.value || '';
  const dateTo = document.getElementById('dateTo')?.value || '';

  let filteredLogs = [...allLogs];

  // Apply search filter
  if (searchTerm) {
    filteredLogs = filteredLogs.filter(log => 
      log.details?.toLowerCase().includes(searchTerm) ||
      log.action?.toLowerCase().includes(searchTerm) ||
      log.userRole?.toLowerCase().includes(searchTerm)
    );
  }

  // Apply action filter
  if (actionFilter) {
    filteredLogs = filteredLogs.filter(log => 
      log.action?.toLowerCase().includes(actionFilter.toLowerCase())
    );
  }

  // Apply date filters
  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    fromDate.setHours(0, 0, 0, 0);
    filteredLogs = filteredLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= fromDate;
    });
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    filteredLogs = filteredLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate <= toDate;
    });
  }

  displayFilteredLogs(filteredLogs);
}

function displayFilteredLogs(logs) {
  const container = document.getElementById('historyContainer');
  if (!container) return;

  if (logs.length === 0) {
    container.innerHTML = '<div class="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-gray-500">No history entries found matching your filters.</div>';
    return;
  }

  container.innerHTML = `
    <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div class="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <p class="text-sm text-gray-600">Showing ${logs.length} of ${allLogs.length} entries</p>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${logs.map(log => `
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${new Date(log.timestamp).toLocaleString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded capitalize">
                    ${escapeHtml(log.action)}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                  ${escapeHtml(log.userRole?.replace('_', ' ') || 'N/A')}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                  ${escapeHtml(log.details || '')}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function clearFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('actionFilter').value = '';
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';
  applyFilters();
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function exportAuditLogs(format) {
  const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const actionFilter = document.getElementById('actionFilter')?.value || '';
  const dateFrom = document.getElementById('dateFrom')?.value || '';
  const dateTo = document.getElementById('dateTo')?.value || '';

  let filteredLogs = [...allLogs];

  // Apply same filters as display
  if (searchTerm) {
    filteredLogs = filteredLogs.filter(log => 
      log.details?.toLowerCase().includes(searchTerm) ||
      log.action?.toLowerCase().includes(searchTerm) ||
      log.userRole?.toLowerCase().includes(searchTerm)
    );
  }

  if (actionFilter) {
    filteredLogs = filteredLogs.filter(log => 
      log.action?.toLowerCase().includes(actionFilter.toLowerCase())
    );
  }

  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    fromDate.setHours(0, 0, 0, 0);
    filteredLogs = filteredLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= fromDate;
    });
  }

  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    filteredLogs = filteredLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate <= toDate;
    });
  }

  if (format === 'csv') {
    // Create CSV content
    const headers = ['Timestamp', 'Action', 'User Role', 'Details'];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.action || '',
      log.userRole?.replace('_', ' ') || '',
      (log.details || '').replace(/"/g, '""') // Escape quotes
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.exportAuditLogs = exportAuditLogs;

function handleLogout() {
  logout();
}

window.handleLogout = handleLogout;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
