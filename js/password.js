// Password Change Management

let changePasswordStep = 1; // 1: email, 2: verify code, 3: new password

function showChangePasswordModal() {
  const state = getAppState();
  const user = state.currentUser;
  
  if (!user || !user.email) {
    showAlertModal('Error', 'Your account does not have an email address. Please contact your administrator.', 'error');
    return;
  }
  
  changePasswordStep = 1;
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 overflow-y-auto';
  modal.id = 'changePasswordModal';
  modal.innerHTML = `
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onclick="closeChangePasswordModal()"></div>
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="mb-4">
            <h3 class="text-lg font-medium text-gray-900 mb-1">Change Password</h3>
            <p class="text-sm text-gray-500">We'll send a verification code to your email</p>
          </div>
          
          <!-- Step 1: Email Confirmation -->
          <div id="step1" class="space-y-4">
            <div class="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p class="text-sm text-blue-800">
                <span class="font-medium">Your Email:</span> ${escapeHtml(user.email)}
              </p>
            </div>
            <p class="text-sm text-gray-600">Click "Send Verification Code" to receive a 6-digit code via email.</p>
          </div>
          
          <!-- Step 2: Enter Verification Code -->
          <div id="step2" class="hidden space-y-4">
            <div class="p-3 bg-green-50 border border-green-200 rounded-md">
              <p class="text-sm text-green-800">
                <svg class="inline h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Verification code sent to ${escapeHtml(user.email)}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
              <input type="text" id="verificationCode" maxlength="6" placeholder="000000" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" autocomplete="off">
              <p class="mt-1 text-xs text-gray-500">Enter the 6-digit code from your email</p>
            </div>
          </div>
          
          <!-- Step 3: New Password -->
          <div id="step3" class="hidden space-y-4">
            <div class="p-3 bg-green-50 border border-green-200 rounded-md">
              <p class="text-sm text-green-800">
                <svg class="inline h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Code verified! Now set your new password
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" id="newPassword" required placeholder="Enter new password" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
              <div id="passwordRequirements" class="mt-2 space-y-1">
                <p class="text-xs font-medium text-gray-700 mb-2">Password must contain:</p>
                <div class="space-y-1 text-xs">
                  <div id="req-length" class="flex items-center text-gray-500" data-original-text="At least 8 characters">
                    <span class="mr-2">•</span>
                    <span>At least 8 characters</span>
                  </div>
                  <div id="req-uppercase" class="flex items-center text-gray-500" data-original-text="One uppercase letter (A-Z)">
                    <span class="mr-2">•</span>
                    <span>One uppercase letter (A-Z)</span>
                  </div>
                  <div id="req-lowercase" class="flex items-center text-gray-500" data-original-text="One lowercase letter (a-z)">
                    <span class="mr-2">•</span>
                    <span>One lowercase letter (a-z)</span>
                  </div>
                  <div id="req-number" class="flex items-center text-gray-500" data-original-text="One number (0-9)">
                    <span class="mr-2">•</span>
                    <span>One number (0-9)</span>
                  </div>
                  <div id="req-special" class="flex items-center text-gray-500" data-original-text="One special character (!@#$%^&*)">
                    <span class="mr-2">•</span>
                    <span>One special character (!@#$%^&*)</span>
                  </div>
                </div>
              </div>
              <div id="passwordStrength" class="mt-2 hidden">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs font-medium text-gray-700">Strength:</span>
                  <div id="strengthBar" class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div id="strengthFill" class="h-full transition-all duration-300" style="width: 0%"></div>
                  </div>
                  <span id="strengthText" class="text-xs font-medium"></span>
                </div>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input type="password" id="confirmPassword" required placeholder="Confirm new password" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
              <div id="passwordMatch" class="mt-1 hidden">
                <p id="passwordMatchText" class="text-xs"></p>
              </div>
            </div>
          </div>
          
          <!-- Error Message -->
          <div id="passwordError" class="hidden mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p class="text-sm text-red-800" id="passwordErrorMessage"></p>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button type="button" id="passwordNextBtn" onclick="handlePasswordStep()" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm">
            Send Verification Code
          </button>
          <button type="button" onclick="closeChangePasswordModal()" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  window.currentModal = modal;
  
  // Focus on verification code input when it appears
  setTimeout(() => {
    const codeInput = document.getElementById('verificationCode');
    if (codeInput) {
      codeInput.addEventListener('input', function(e) {
        // Auto-format: only numbers, max 6 digits
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 6);
        if (this.value.length === 6) {
          // Auto-submit when 6 digits entered
          setTimeout(() => handlePasswordStep(), 300);
        }
      });
    }
  }, 100);
}

// Password strength validation functions
function validatePasswordStrength(password) {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };
  
  return requirements;
}

function updatePasswordRequirements(password) {
  const reqs = validatePasswordStrength(password);
  
  // Update requirement indicators
  updateRequirement('req-length', reqs.length);
  updateRequirement('req-uppercase', reqs.uppercase);
  updateRequirement('req-lowercase', reqs.lowercase);
  updateRequirement('req-number', reqs.number);
  updateRequirement('req-special', reqs.special);
  
  // Calculate strength
  const metCount = Object.values(reqs).filter(v => v).length;
  const strength = calculatePasswordStrength(password, metCount);
  
  // Update strength indicator
  updatePasswordStrengthIndicator(strength, metCount);
  
  return Object.values(reqs).every(v => v);
}

function updateRequirement(id, met) {
  const element = document.getElementById(id);
  if (!element) return;
  
  // Get the text span (second child)
  const textSpan = element.querySelector('span:last-child');
  if (!textSpan) return;
  
  // Store original text if not already stored
  if (!element.dataset.originalText) {
    element.dataset.originalText = textSpan.textContent.trim();
  }
  
  const originalText = element.dataset.originalText;
  const iconSpan = element.querySelector('span:first-child');
  
  if (met) {
    element.classList.remove('text-gray-500');
    element.classList.add('text-green-600');
    textSpan.classList.remove('text-gray-500');
    textSpan.classList.add('text-green-600');
    if (iconSpan) {
      iconSpan.textContent = '✓';
      iconSpan.className = 'text-green-600 mr-2';
    }
  } else {
    element.classList.remove('text-green-600');
    element.classList.add('text-gray-500');
    textSpan.classList.remove('text-green-600');
    textSpan.classList.add('text-gray-500');
    if (iconSpan) {
      iconSpan.textContent = '•';
      iconSpan.className = 'mr-2';
    }
  }
}

function calculatePasswordStrength(password, metCount) {
  if (password.length === 0) {
    return { level: 0, text: '', color: '' };
  }
  
  let strength = 0;
  
  // Base strength from requirements met
  strength += metCount * 20;
  
  // Bonus for length
  if (password.length >= 12) strength += 10;
  if (password.length >= 16) strength += 10;
  
  // Bonus for complexity
  const uniqueChars = new Set(password).size;
  if (uniqueChars > password.length * 0.7) strength += 10;
  
  // Cap at 100
  strength = Math.min(100, strength);
  
  let level, text, color;
  if (strength < 40) {
    level = 1;
    text = 'Weak';
    color = 'bg-red-500';
  } else if (strength < 60) {
    level = 2;
    text = 'Fair';
    color = 'bg-orange-500';
  } else if (strength < 80) {
    level = 3;
    text = 'Good';
    color = 'bg-yellow-500';
  } else {
    level = 4;
    text = 'Strong';
    color = 'bg-green-500';
  }
  
  return { level, text, color, percentage: strength };
}

function updatePasswordStrengthIndicator(strength, metCount) {
  const strengthDiv = document.getElementById('passwordStrength');
  const strengthFill = document.getElementById('strengthFill');
  const strengthText = document.getElementById('strengthText');
  
  if (!strengthDiv || !strengthFill || !strengthText) return;
  
  if (strength.percentage === 0) {
    strengthDiv.classList.add('hidden');
    return;
  }
  
  strengthDiv.classList.remove('hidden');
  strengthFill.style.width = strength.percentage + '%';
  strengthFill.className = 'h-full transition-all duration-300 ' + strength.color;
  strengthText.textContent = strength.text;
  strengthText.className = 'text-xs font-medium ' + 
    (strength.level <= 2 ? 'text-red-600' : 
     strength.level === 3 ? 'text-yellow-600' : 'text-green-600');
}

function checkPasswordMatch() {
  const newPassword = document.getElementById('newPassword')?.value || '';
  const confirmPassword = document.getElementById('confirmPassword')?.value || '';
  const matchDiv = document.getElementById('passwordMatch');
  const matchText = document.getElementById('passwordMatchText');
  
  if (!matchDiv || !matchText) return;
  
  if (confirmPassword.length === 0) {
    matchDiv.classList.add('hidden');
    return;
  }
  
  matchDiv.classList.remove('hidden');
  
  if (newPassword === confirmPassword) {
    matchText.textContent = '✓ Passwords match';
    matchText.className = 'text-xs text-green-600';
  } else {
    matchText.textContent = '✗ Passwords do not match';
    matchText.className = 'text-xs text-red-600';
  }
}

function isStrongPassword(password) {
  const reqs = validatePasswordStrength(password);
  return Object.values(reqs).every(v => v);
}

function closeChangePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) {
    modal.remove();
    window.currentModal = null;
  }
  changePasswordStep = 1;
}

async function handlePasswordStep() {
  const state = getAppState();
  const user = state.currentUser;
  const errorDiv = document.getElementById('passwordError');
  const errorMsg = document.getElementById('passwordErrorMessage');
  const nextBtn = document.getElementById('passwordNextBtn');
  
  // Hide error initially
  if (errorDiv) errorDiv.classList.add('hidden');
  
  if (changePasswordStep === 1) {
    // Step 1: Send verification code
    nextBtn.disabled = true;
    nextBtn.textContent = 'Sending...';
    
    try {
      const response = await API.sendPasswordVerificationCode(user.email);
      if (response.success) {
        changePasswordStep = 2;
        document.getElementById('step1').classList.add('hidden');
        document.getElementById('step2').classList.remove('hidden');
        nextBtn.textContent = 'Verify Code';
        nextBtn.disabled = false;
        // Focus on code input
        setTimeout(() => {
          const codeInput = document.getElementById('verificationCode');
          if (codeInput) codeInput.focus();
        }, 100);
      } else {
        if (errorDiv && errorMsg) {
          errorMsg.textContent = response.error || 'Failed to send verification code';
          errorDiv.classList.remove('hidden');
        }
        nextBtn.disabled = false;
        nextBtn.textContent = 'Send Verification Code';
      }
    } catch (error) {
      if (errorDiv && errorMsg) {
        errorMsg.textContent = error.message || 'Failed to send verification code';
        errorDiv.classList.remove('hidden');
      }
      nextBtn.disabled = false;
      nextBtn.textContent = 'Send Verification Code';
    }
  } else if (changePasswordStep === 2) {
    // Step 2: Verify code
    const code = document.getElementById('verificationCode').value.trim();
    
    if (!code || code.length !== 6) {
      if (errorDiv && errorMsg) {
        errorMsg.textContent = 'Please enter a valid 6-digit verification code';
        errorDiv.classList.remove('hidden');
      }
      return;
    }
    
    nextBtn.disabled = true;
    nextBtn.textContent = 'Verifying...';
    
    try {
      const response = await API.verifyPasswordCode(code);
      if (response.success) {
        changePasswordStep = 3;
        document.getElementById('step2').classList.add('hidden');
        document.getElementById('step3').classList.remove('hidden');
        nextBtn.textContent = 'Change Password';
        nextBtn.disabled = false;
        // Focus on new password input and add real-time validation
        setTimeout(() => {
          const newPasswordInput = document.getElementById('newPassword');
          const confirmPasswordInput = document.getElementById('confirmPassword');
          
          if (newPasswordInput) {
            newPasswordInput.focus();
            newPasswordInput.addEventListener('input', function() {
              updatePasswordRequirements(this.value);
              checkPasswordMatch();
            });
          }
          
          if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', function() {
              checkPasswordMatch();
            });
          }
        }, 100);
      } else {
        if (errorDiv && errorMsg) {
          errorMsg.textContent = response.error || 'Invalid verification code';
          errorDiv.classList.remove('hidden');
        }
        nextBtn.disabled = false;
        nextBtn.textContent = 'Verify Code';
      }
    } catch (error) {
      if (errorDiv && errorMsg) {
        errorMsg.textContent = error.message || 'Failed to verify code';
        errorDiv.classList.remove('hidden');
      }
      nextBtn.disabled = false;
      nextBtn.textContent = 'Verify Code';
    }
  } else if (changePasswordStep === 3) {
    // Step 3: Change password
    const code = document.getElementById('verificationCode').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate strong password
    if (!newPassword) {
      if (errorDiv && errorMsg) {
        errorMsg.textContent = 'Please enter a new password';
        errorDiv.classList.remove('hidden');
      }
      return;
    }
    
    if (!isStrongPassword(newPassword)) {
      if (errorDiv && errorMsg) {
        errorMsg.textContent = 'Password does not meet strength requirements. Please check all requirements above.';
        errorDiv.classList.remove('hidden');
      }
      return;
    }
    
    if (newPassword !== confirmPassword) {
      if (errorDiv && errorMsg) {
        errorMsg.textContent = 'Passwords do not match';
        errorDiv.classList.remove('hidden');
      }
      return;
    }
    
    nextBtn.disabled = true;
    nextBtn.textContent = 'Changing Password...';
    
    try {
      const response = await API.changePassword(code, newPassword, confirmPassword);
      if (response.success) {
        showAlertModal('Success', 'Your password has been changed successfully!', 'success', () => {
          closeChangePasswordModal();
        });
      } else {
        if (errorDiv && errorMsg) {
          errorMsg.textContent = response.error || 'Failed to change password';
          errorDiv.classList.remove('hidden');
        }
        nextBtn.disabled = false;
        nextBtn.textContent = 'Change Password';
      }
    } catch (error) {
      if (errorDiv && errorMsg) {
        errorMsg.textContent = error.message || 'Failed to change password';
        errorDiv.classList.remove('hidden');
      }
      nextBtn.disabled = false;
      nextBtn.textContent = 'Change Password';
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make functions globally available
window.showChangePasswordModal = showChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.handlePasswordStep = handlePasswordStep;
