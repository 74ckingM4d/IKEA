// User Management page initialization
async function initPage() {
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
  renderUsers();
  subscribeState(() => renderUsers());
}

function renderUsers() {
  if (!isAdmin()) return;
  
  const container = document.getElementById('usersContainer');
  if (!container) return;
  
  container.innerHTML = '<div class="p-8 text-center text-gray-500">Loading users...</div>';
  
  API.getUsers()
    .then(response => {
      if (response.success) {
        const users = response.data || [];
        displayUsers(users);
      } else {
        container.innerHTML = `<div class="p-8 text-center text-red-500">Error: ${response.error || 'Failed to load users'}</div>`;
      }
    })
    .catch(error => {
      console.error('Error loading users:', error);
      container.innerHTML = `<div class="p-8 text-center text-red-500">Error loading users: ${error.message}</div>`;
    });
}

function displayUsers(users) {
  const container = document.getElementById('usersContainer');
  if (!container) return;
  
  if (users.length === 0) {
    container.innerHTML = '<div class="p-8 text-center text-gray-500">No users found.</div>';
    return;
  }
  
  const state = getAppState();
  const currentUserId = state.currentUser?.id;
  
  const html = `
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        ${users.map(user => `
          <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${escapeHtml(user.username)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${escapeHtml(user.name)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${escapeHtml(user.email || '-')}</td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 text-xs font-medium rounded-full ${
                user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                user.role === 'purchaser' ? 'bg-blue-100 text-blue-800' :
                user.role === 'stock_handler' ? 'bg-green-100 text-green-800' :
                'bg-orange-100 text-orange-800'
              }">
                ${escapeHtml(user.role.replace('_', ' '))}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              ${new Date(user.created_at).toLocaleDateString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 text-xs font-medium rounded-full ${
                (user.status || 'active') === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }">
                ${(user.status || 'active') === 'active' ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <div class="flex items-center justify-end gap-2">
                ${user.id !== currentUserId ? `
                  <button onclick="deleteUser('${user.id}', '${escapeHtml(user.username)}')" class="text-red-600 hover:text-red-900">Remove</button>
                ` : '<span class="text-gray-400">Cannot modify</span>'}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openUserModal(userId = null) {
  const modal = document.getElementById('userModal');
  const form = document.getElementById('userForm');
  const modalTitle = document.getElementById('modalTitle');
  const passwordInput = document.getElementById('password');
  const passwordHint = document.getElementById('passwordHint');
  
  const statusField = document.getElementById('statusField');
  
  if (userId) {
    modalTitle.textContent = 'Edit User';
    passwordInput.required = false;
    passwordHint.style.display = 'block';
    if (statusField) statusField.style.display = 'block';
    
    API.getUser(userId)
      .then(response => {
        if (response.success) {
          const user = response.data;
          document.getElementById('userId').value = user.id;
          document.getElementById('username').value = user.username;
          document.getElementById('name').value = user.name;
          document.getElementById('email').value = user.email || '';
          document.getElementById('role').value = user.role;
          const statusSelect = document.getElementById('userStatus');
          if (statusSelect) {
            statusSelect.value = user.status || 'active';
          }
          passwordInput.value = '';
        } else {
          showNotification('Error loading user: ' + (response.error || 'Unknown error'), 'error');
        }
      })
      .catch(error => {
        showNotification('Error loading user: ' + error.message, 'error');
      });
  } else {
    modalTitle.textContent = 'Add User';
    passwordInput.required = true;
    passwordHint.style.display = 'none';
    if (statusField) statusField.style.display = 'none';
    form.reset();
    document.getElementById('userId').value = '';
  }
  
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeUserModal() {
  const modal = document.getElementById('userModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.getElementById('userForm').reset();
}

async function editUser(userId) {
  openUserModal(userId);
}

async function resetUserPassword(userId, username) {
  const newPassword = prompt(`Enter new password for user "${username}":`);
  if (!newPassword) {
    return;
  }
  
  if (newPassword.length < 6) {
    showNotification('Password must be at least 6 characters long', 'error');
    return;
  }
  
  if (!confirm(`Are you sure you want to reset the password for "${username}"?`)) {
    return;
  }
  
  try {
    const response = await API.resetUserPassword(userId, newPassword);
    if (response.success) {
      showNotification('Password reset successfully', 'success');
      renderUsers();
      await loadState();
    } else {
      showNotification('Error resetting password: ' + (response.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    showNotification('Error resetting password: ' + error.message, 'error');
  }
}

async function toggleUserStatus(userId, currentStatus, username) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const action = newStatus === 'active' ? 'activate' : 'deactivate';
  
  if (!confirm(`Are you sure you want to ${action} user "${username}"?`)) {
    return;
  }
  
  try {
    const response = await API.updateUserStatus(userId, newStatus);
    if (response.success) {
      showNotification(`User ${action}d successfully`, 'success');
      renderUsers();
      await loadState();
    } else {
      showNotification('Error updating user status: ' + (response.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    showNotification('Error updating user status: ' + error.message, 'error');
  }
}

async function deleteUser(userId, username) {
  if (!confirm(`Are you sure you want to remove user "${username}"? This action cannot be undone.`)) {
    return;
  }
  
  try {
    const response = await API.deleteUser(userId);
    if (response.success) {
      showNotification('User removed successfully', 'success');
      renderUsers();
      await loadState();
    } else {
      showNotification('Error removing user: ' + (response.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    showNotification('Error removing user: ' + error.message, 'error');
  }
}

document.getElementById('userForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const userId = document.getElementById('userId').value;
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const role = document.getElementById('role').value;
  
  try {
    let response;
    if (userId) {
      // Update user
      const status = document.getElementById('userStatus')?.value || null;
      response = await API.updateUser({
        id: userId,
        username,
        name,
        email,
        role,
        updatePassword: password.length > 0,
        password: password || undefined,
        status: status
      });
    } else {
      // Create user
      if (!password) {
        showNotification('Password is required for new users', 'error');
        return;
      }
      response = await API.createUser({
        username,
        password,
        name,
        email,
        role
      });
    }
    
    if (response.success) {
      showNotification(userId ? 'User updated successfully' : 'User created successfully', 'success');
      closeUserModal();
      renderUsers();
      await loadState();
    } else {
      showNotification('Error: ' + (response.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    showNotification('Error: ' + error.message, 'error');
  }
});

window.openUserModal = openUserModal;
window.closeUserModal = closeUserModal;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.resetUserPassword = resetUserPassword;
window.toggleUserStatus = toggleUserStatus;

// Initialize page
initPage();
