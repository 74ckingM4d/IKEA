// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Load initial state
  await loadState();

  // Check authentication for protected pages
  const protectedPages = ['index.php', 'dashboard.php', 'purchases.php', 'inventory.php', 'ingredients.php', 'requests.php', 'history.php', 'packed-items.php'];
  const currentPage = window.location.pathname.split('/').pop();
  
  if (protectedPages.includes(currentPage) && !isAuthenticated()) {
    window.location.href = 'login.php';
    return;
  }

  // Initialize page-specific code
  if (typeof initPage === 'function') {
    initPage();
  }
});
