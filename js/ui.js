// Reusable UI components
function createCard(title, description, children, footer, action) {
  return `
    <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
      ${title || description || action ? `
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-start">
          <div>
            ${title ? `<h3 class="text-lg font-semibold text-gray-900">${title}</h3>` : ''}
            ${description ? `<p class="mt-1 text-sm text-gray-500">${description}</p>` : ''}
          </div>
          ${action ? `<div>${action}</div>` : ''}
        </div>
      ` : ''}
      <div class="p-6">${children}</div>
      ${footer ? `<div class="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-lg">${footer}</div>` : ''}
    </div>
  `;
}

function createAlert(variant, title, message, link) {
  const variantClasses = {
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  };
  
  return `
    <div class="rounded-lg border ${variantClasses[variant]} p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <h3 class="text-sm font-medium">${title}</h3>
        </div>
      </div>
      <div class="mt-2 text-sm">
        <p>${message} ${link ? `<a href="${link.href}" class="underline ml-1 font-medium">${link.text}</a>` : ''}</p>
      </div>
    </div>
  `;
}

function createBadge(text, variant = 'default') {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  };
  
  return `<span class="px-2 py-1 text-xs font-medium rounded ${variantClasses[variant]}">${text}</span>`;
}

function createButton(text, onClick, variant = 'primary', size = 'md') {
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    success: 'bg-green-600 text-white hover:bg-green-700',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  return `<button onclick="${onClick}" class="rounded-md shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${variantClasses[variant]} ${sizeClasses[size]}">${text}</button>`;
}

function showLoading(message = 'Loading...') {
  return `<div class="flex items-center justify-center p-8">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span class="ml-3 text-gray-600">${message}</span>
  </div>`;
}

function showEmptyState(message, actionText, actionOnClick) {
  return `
    <div class="text-center py-12">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">${message}</h3>
      ${actionText && actionOnClick ? `
        <div class="mt-6">
          <button onclick="${actionOnClick}" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            ${actionText}
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

// Confirmation modal function
function showConfirmModal(title, message, onConfirm, onCancel = null) {
  return new Promise((resolve) => {
    // Remove any existing modal
    if (window.currentModal) {
      window.currentModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 overflow-y-auto';
    modal.innerHTML = `
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onclick="closeConfirmModal(false)"></div>
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="confirmModalTitle">${title}</h3>
                <div class="mt-2 text-sm text-gray-500" id="confirmModalMessage"></div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button type="button" id="confirmModalConfirm" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm">
              Confirm
            </button>
            <button type="button" id="confirmModalCancel" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    window.currentModal = modal;
    window.confirmModalResolve = resolve;

    // Set message content as HTML (to support <br> tags)
    const messageEl = document.getElementById('confirmModalMessage');
    if (messageEl) {
      messageEl.innerHTML = message;
    }

    // Set up event listeners
    document.getElementById('confirmModalConfirm').addEventListener('click', () => {
      closeConfirmModal(true);
      if (onConfirm) onConfirm();
    });

    document.getElementById('confirmModalCancel').addEventListener('click', () => {
      closeConfirmModal(false);
      if (onCancel) onCancel();
    });
  });
}

function closeConfirmModal(confirmed) {
  if (window.currentModal) {
    window.currentModal.remove();
    window.currentModal = null;
  }
  if (window.confirmModalResolve) {
    window.confirmModalResolve(confirmed);
    window.confirmModalResolve = null;
  }
}

// Alert modal function (for success, error, info, warning messages)
function showAlertModal(title, message, type = 'info', onClose = null) {
  return new Promise((resolve) => {
    // Remove any existing modal
    if (window.currentModal) {
      window.currentModal.remove();
    }

    // Define icon and colors based on type
    const typeConfig = {
      plain: {
        hideIcon: true,
        buttonBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
      },
      success: {
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        buttonBg: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
      },
      error: {
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
        buttonBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
      },
      warning: {
        iconBg: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
        iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        buttonBg: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
      },
      info: {
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        buttonBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
      }
    };

    const config = typeConfig[type] || typeConfig.info;
    const hideIcon = !!config.hideIcon;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 overflow-y-auto';
    modal.innerHTML = `
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onclick="closeAlertModal()"></div>
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              ${hideIcon ? '' : `
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${config.iconBg} sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 ${config.iconColor}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${config.iconPath}" />
                </svg>
              </div>
              `}
              <div class="mt-3 text-center sm:mt-0 ${hideIcon ? '' : 'sm:ml-4'} sm:text-left flex-1">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="alertModalTitle">${title}</h3>
                <div class="mt-2 text-sm text-gray-500" id="alertModalMessage"></div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button type="button" id="alertModalOK" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 ${config.buttonBg} text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm">
              OK
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    window.currentModal = modal;
    window.alertModalResolve = resolve;

    // Set message content as HTML (to support <br> tags)
    const messageEl = document.getElementById('alertModalMessage');
    if (messageEl) {
      messageEl.innerHTML = message;
    }

    // Set up event listeners
    document.getElementById('alertModalOK').addEventListener('click', () => {
      closeAlertModal();
      if (onClose) onClose();
    });
  });
}

function closeAlertModal() {
  if (window.currentModal) {
    window.currentModal.remove();
    window.currentModal = null;
  }
  if (window.alertModalResolve) {
    window.alertModalResolve(true);
    window.alertModalResolve = null;
  }
}

// Toast notification function (for simple success/error/info messages)
function showNotification(message, type = 'info', duration = 3000) {
  // Remove any existing notification
  const existing = document.getElementById('toastNotification');
  if (existing) {
    existing.remove();
  }

  const typeConfig = {
    success: {
      bg: 'bg-green-500',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      iconColor: 'text-white'
    },
    error: {
      bg: 'bg-red-500',
      icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
      iconColor: 'text-white'
    },
    warning: {
      bg: 'bg-yellow-500',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      iconColor: 'text-white'
    },
    info: {
      bg: 'bg-blue-500',
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      iconColor: 'text-white'
    }
  };

  const config = typeConfig[type] || typeConfig.info;

  const notification = document.createElement('div');
  notification.id = 'toastNotification';
  notification.className = `fixed top-4 right-4 z-50 ${config.bg} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-md transform transition-all duration-300 translate-x-full`;
  notification.innerHTML = `
    <svg class="h-6 w-6 ${config.iconColor} flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${config.icon}" />
    </svg>
    <p class="flex-1 text-sm font-medium">${message}</p>
    <button onclick="this.closest('#toastNotification').remove()" class="text-white hover:text-gray-200 focus:outline-none">
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  `;

  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => {
    notification.classList.remove('translate-x-full');
  }, 10);

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, duration);
  }
}

window.showConfirmModal = showConfirmModal;
window.closeConfirmModal = closeConfirmModal;
window.showAlertModal = showAlertModal;
window.closeAlertModal = closeAlertModal;
window.showNotification = showNotification;
