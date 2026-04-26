
<?php
require_once __DIR__ . '/config/database.php';
?>


<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Login - Commissary Inventory & Recipe Management System</title>
	<style>
	@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap');
	
	/* Hide scrollbar but allow scrolling */
	html, body {
		scrollbar-width: none; /* Firefox */
		-ms-overflow-style: none; /* IE and Edge */
		color-scheme: light !important;
	}
	
	html::-webkit-scrollbar, body::-webkit-scrollbar {
		display: none; /* Chrome, Safari, Opera */
		width: 0;
		height: 0;
	}
	
	/* Force light mode - prevent dark mode */
	html[data-theme="dark"],
	body[data-theme="dark"],
	html.dark,
	body.dark,
	html[data-theme="dark"] *,
	body[data-theme="dark"] * {
		color-scheme: light !important;
		background-color: transparent !important;
	}
	
	/* Ensure all elements stay in light mode */
	* {
		color-scheme: light !important;
	}
	
	.login-container {
		background: linear-gradient(135deg, #FAD1E8 0%, #CDEFD8 100%);
		overflow: hidden;
	}
	
	.login-container section::-webkit-scrollbar {
		display: none;
	}
	
	.login-container section {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	
	.left-panel-gradient {
		background: linear-gradient(180deg, #FAD1E8 0%, #CDEFD8 100%);
	}
	
	.green-gradient-button {
		background: linear-gradient(135deg, #00A451 0%, #008E3B 100%);
		box-shadow: 0 4px 12px rgba(0, 142, 59, 0.25);
	}
	
	.green-gradient-button:hover {
		background: linear-gradient(135deg, #008E3B 0%, #007A32 100%);
		box-shadow: 0 6px 16px rgba(0, 142, 59, 0.35);
	}
	
	.script-headline {
		font-family: 'Playfair Display', serif;
		font-style: italic;
		font-size: 38px;
		line-height: 1.2;
		color: #382E2E;
	}
	
	.body-text {
		color: #4A4A4A;
		font-size: 17px;
		line-height: 1.7;
	}
	
	.location-badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 16px;
		background: rgba(255, 255, 255, 0.4);
		border-radius: 9999px;
		font-size: 14px;
		font-weight: 500;
		color: #382E2E;
	}
	
	.green-dot {
		width: 8px;
		height: 8px;
		background: #00A451;
		border-radius: 50%;
	}
	
	/* Modal Styles - Modern Design */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: linear-gradient(135deg, rgba(250, 209, 232, 0.4) 0%, rgba(205, 239, 216, 0.4) 100%);
		backdrop-filter: blur(4px) saturate(180%);
		-webkit-backdrop-filter: blur(4px) saturate(180%);
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		visibility: hidden;
		transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.4s;
		padding: 20px;
	}
	
	.modal-overlay.show {
		opacity: 1;
		visibility: visible;
	}
	
	.modal-content {
		background: white;
		border-radius: 32px;
		padding: 40px;
		max-width: 420px;
		width: 100%;
		box-shadow: 
			0 25px 50px -12px rgba(0, 0, 0, 0.25),
			0 0 0 1px rgba(0, 0, 0, 0.05);
		transform: scale(0.85) translateY(20px);
		opacity: 0;
		transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease;
		position: relative;
		overflow: hidden;
	}
	
	.modal-content::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 4px;
		background: linear-gradient(90deg, #FAD1E8 0%, #CDEFD8 100%);
	}
	
	.modal-overlay.show .modal-content {
		transform: scale(1) translateY(0);
		opacity: 1;
	}
	
	.modal-icon {
		width: 64px;
		height: 64px;
		border-radius: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 24px;
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
		transition: transform 0.3s ease;
	}
	
	.modal-overlay.show .modal-icon {
		animation: iconBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s;
	}
	
	@keyframes iconBounce {
		0% { transform: scale(0); }
		50% { transform: scale(1.1); }
		100% { transform: scale(1); }
	}
	
	.modal-icon.error {
		background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%);
		color: #DC2626;
	}
	
	.modal-icon.info {
		background: linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%);
		color: #2563EB;
	}
	
	.modal-title {
		font-size: 24px;
		font-weight: 700;
		letter-spacing: -0.5px;
		margin-bottom: 12px;
	}
	
	.modal-message {
		font-size: 15px;
		line-height: 1.6;
		color: #6B7280;
	}
	
	.modal-button {
		margin-top: 28px;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	.modal-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(0, 142, 59, 0.35);
	}
	
	.modal-button:active {
		transform: translateY(0);
	}
	</style>
</head>
<body>

<div class="h-screen login-container flex items-center justify-center px-4 py-4">
	<div class="w-full max-w-6xl h-full max-h-[95vh] bg-white rounded-[32px] shadow-2xl overflow-hidden flex" style="box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);">
		<div class="grid lg:grid-cols-2 w-full h-full">
			<!-- Left Panel - Brand Story Section -->
			<section class="hidden lg:flex flex-col justify-between items-center left-panel-gradient p-12" style="padding: 48px 60px;">
					<!-- Logo Area - Top -->
				<div class="flex flex-col items-center space-y-4">
					<!-- Square Logo -->
					<div class="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center overflow-hidden" style="box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);">
						<img src="assets/images/logo.jpg" alt="IKEA Logo" class="w-full h-full object-cover">
					</div>
					
					<!-- Location Badge -->
					<div class="location-badge">
						<span class="green-dot"></span>
						<span class="uppercase tracking-wide font-medium">ORMOC CITY, PH</span>
					</div>
				</div>
				
				<!-- Middle Content -->
				<div class="w-full max-w-md space-y-12 text-center flex-1 flex flex-col justify-start pt-16">
					<!-- Headline -->
					<h1 class="script-headline" style="font-size: 34px; margin-top: -20px;">
						Well-loved pastry and snack shop since 1990.
					</h1>
					
					<!-- Description Paragraph -->
					<p class="body-text" style="font-size: 16px; line-height: 2;">
						A snack shop in Ormoc City, Philippines. Opened in 1990 it became popular because of its chocolate and mango cake, and their specialties like Palabok, Siopao, Mami, Empanada, Arroz Caldo to name a few.
					</p>
				</div>
				
				<!-- Footer - Bottom -->
				<div class="w-full border-t border-gray-300/40 pt-4">
					<div class="flex items-center justify-center gap-2 text-sm text-gray-500">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
						<span>Serving smiles since 1990</span>
					</div>
				</div>
			</section>

			<!-- Right Panel - Login Form Section -->
			<section class="p-8 bg-white flex flex-col justify-between overflow-y-auto" style="padding: 40px 48px;">
				<!-- Main Content -->	
				<div class="max-w-md mx-auto w-full space-y-16 flex-1">
					<!-- Logo & Heading -->
					<div class="flex flex-col items-center space-y-2">
						<!-- Super-Title -->
						<p class="text-[11px] uppercase tracking-[0.15em] text-gray-500 font-semibold" style="letter-spacing: 0.15em;">DASHBOARD PORTAL</p>
						
						<!-- Main Title -->
						<h2 class="text-[28px] font-bold text-gray-900" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">Welcome</h2>
						
						<!-- Subtitle -->
						<p class="text-sm text-gray-600" style="font-family: 'Inter', sans-serif;">Sign in to access your account</p>
					</div>


					<!-- Login Form -->
					<div class="space-y-5 mt-10">
						<!-- Username Field -->
						<div class="space-y-2">
							<label for="username" class="block text-sm font-medium text-gray-700" style="font-family: 'Inter', sans-serif;">Username</label>
							<input
								type="text"
								id="username"
								name="username"
								class="w-full rounded-2xl border px-4 py-3 text-base text-gray-900 transition focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
								style="border-color: #E6E6E6; font-size: 16px; font-family: 'Inter', sans-serif; background-color: white;"
								placeholder="Enter your username"
								required
								autocomplete="username"
							/>
						</div>

						<!-- Password Field -->
						<div class="space-y-2">
							<label for="password" class="block text-sm font-medium text-gray-700" style="font-family: 'Inter', sans-serif;">Password</label>
							<div class="relative">
								<input
									type="password"
									id="password"
									name="password"
									class="w-full rounded-2xl border px-4 py-3 pr-12 text-base text-gray-900 transition focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
									style="border-color: #E6E6E6; font-size: 16px; font-family: 'Inter', sans-serif; background-color: white;"
									placeholder="Enter your password"
									required
									autocomplete="current-password"
								/>
								<button
									type="button"
									id="togglePasswordVisibility"
									class="absolute inset-y-0 right-0 flex items-center justify-center px-4 text-gray-500 hover:text-gray-700 focus:outline-none"
									aria-label="Show password"
									aria-pressed="false"
								>
									<svg id="eyeIconShow" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
										<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
									<svg id="eyeIconHide" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18" />
										<path stroke-linecap="round" stroke-linejoin="round" d="M10.477 10.48a3 3 0 004.243 4.243" />
										<path stroke-linecap="round" stroke-linejoin="round" d="M9.88 4.243A9.953 9.953 0 0112 4c4.477 0 8.268 2.943 9.542 7a10.523 10.523 0 01-4.132 5.685" />
										<path stroke-linecap="round" stroke-linejoin="round" d="M6.61 6.61A10.523 10.523 0 002.458 12c1.274 4.057 5.065 7 9.542 7 1.073 0 2.11-.168 3.083-.48" />
									</svg>
								</button>
							</div>
						</div>

						<!-- Login Button -->
						<button
							type="button"
							id="loginButton"
							onclick="handleLogin()"
							class="w-full green-gradient-button rounded-full py-4 px-6 text-base font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 mt-8"
							style="font-family: 'Inter', sans-serif; font-size: 16px;"
						>
							<svg id="loginSpinner" class="animate-spin h-5 w-5 text-white hidden" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							<span id="loginButtonText">Login</span>
						</button>
					</div>
				</div>

				<!-- Support Section - Footer -->
				<div class="max-w-md mx-auto w-full pt-6">
					<!-- Divider -->
					<div class="relative flex items-center mb-4">
						<div class="flex-grow border-t" style="border-color: #E6E6E6;"></div>
						<span class="flex-shrink mx-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500" style="font-family: 'Inter', sans-serif;">SUPPORT</span>
						<div class="flex-grow border-t" style="border-color: #E6E6E6;"></div>
					</div>
					
					<!-- Support Content -->
					<div class="text-center space-y-2">
						<p class="text-sm font-semibold" style="color: #00A451; font-family: 'Inter', sans-serif;">FORGOT CREDENTIALS?</p>
						<p class="text-sm text-gray-600" style="font-family: 'Inter', sans-serif; line-height: 1.6;">
							Check in with the Owner for access.
						</p>
					</div>
				</div>
			</section>
		</div>
	</div>
</div>

<!-- Error/Status Modal -->
<div id="errorModal" class="modal-overlay">
	<div class="modal-content">
		<div id="modalIcon" class="modal-icon error">
			<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"></path>
			</svg>
		</div>
		<h3 id="modalTitle" class="modal-title text-gray-900 text-center" style="font-family: 'Inter', sans-serif;">Error</h3>
		<p id="modalMessage" class="modal-message text-center" style="font-family: 'Inter', sans-serif;"></p>
		<button id="modalCloseBtn" class="modal-button w-full green-gradient-button rounded-full py-3.5 px-6 text-base font-semibold text-white" style="font-family: 'Inter', sans-serif;">
			Got it
		</button>
	</div>
</div>

<script>
	// Suppress browser extension errors (they don't affect functionality)
	window.addEventListener('error', function(e) {
		if (e.message && (
			e.message.includes('Receiving end does not exist') ||
			e.message.includes('Could not establish connection') ||
			e.message.includes('Extension context invalidated')
		)) {
			e.preventDefault();
			console.log('Suppressed extension error:', e.message);
			return false;
		}
	});
	
	// Suppress unhandled promise rejections from extensions
	window.addEventListener('unhandledrejection', function(e) {
		if (e.reason && e.reason.message && (
			e.reason.message.includes('Receiving end does not exist') ||
			e.reason.message.includes('Could not establish connection') ||
			e.reason.message.includes('Extension context invalidated')
		)) {
			e.preventDefault();
			console.log('Suppressed extension promise rejection:', e.reason.message);
			return false;
		}
	});
	
	// Log that scripts are starting to load
	console.log('Login page scripts starting to load...');
</script>
<script src="https://cdn.tailwindcss.com"></script>
<script src="js/api.js?v=2"></script>
<script src="js/store.js?v=2"></script>
<script>
	console.log('External scripts loaded');
	
	// Modal functions (available globally)
	function showModal(title, message, isError = true) {
			const modal = document.getElementById('errorModal');
			const modalTitle = document.getElementById('modalTitle');
			const modalMessage = document.getElementById('modalMessage');
			const modalIcon = document.getElementById('modalIcon');
			
			if (!modal || !modalTitle || !modalMessage || !modalIcon) {
				console.error('Modal elements not found');
				alert(title + ': ' + message);
				return;
			}
			
			modalTitle.textContent = title;
			modalMessage.textContent = message;
			
			// Update icon based on error type
			if (isError) {
				modalIcon.className = 'modal-icon error';
				modalIcon.innerHTML = `
					<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"></path>
					</svg>
				`;
			} else {
				modalIcon.className = 'modal-icon info';
				modalIcon.innerHTML = `
					<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
				`;
			}
			
			modal.classList.add('show');
		}
		
	function hideModal() {
		const modal = document.getElementById('errorModal');
		if (modal) {
			modal.classList.remove('show');
		}
	}
	
	// Wait for DOM to be ready
	document.addEventListener('DOMContentLoaded', function() {
		console.log('✓ DOM loaded, initializing login page...');
		
		// Close modal on button click
		const modalCloseBtn = document.getElementById('modalCloseBtn');
		if (modalCloseBtn) {
			modalCloseBtn.addEventListener('click', hideModal);
		}
		
		// Close modal on overlay click
		const errorModal = document.getElementById('errorModal');
		if (errorModal) {
			errorModal.addEventListener('click', function(e) {
				if (e.target === this) {
					hideModal();
				}
			});
		}
		
		// Allow Enter key to trigger login
		const usernameInput = document.getElementById('username');
		const passwordInput = document.getElementById('password');
		const togglePasswordBtn = document.getElementById('togglePasswordVisibility');
		const eyeIconShow = document.getElementById('eyeIconShow');
		const eyeIconHide = document.getElementById('eyeIconHide');
		
		if (togglePasswordBtn && passwordInput) {
			togglePasswordBtn.addEventListener('click', function() {
				const isHidden = passwordInput.type === 'password';
				passwordInput.type = isHidden ? 'text' : 'password';
				
				// Keep cursor position and focus stable
				passwordInput.focus({ preventScroll: true });
				
				if (eyeIconShow && eyeIconHide) {
					eyeIconShow.classList.toggle('hidden', isHidden);
					eyeIconHide.classList.toggle('hidden', !isHidden);
				}
				
				togglePasswordBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
				togglePasswordBtn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
			});
		}
		
		if (usernameInput) {
			usernameInput.addEventListener('keypress', function(e) {
				if (e.key === 'Enter') {
					if (passwordInput) {
						passwordInput.focus();
					}
				}
			});
		}
		
		if (passwordInput) {
			passwordInput.addEventListener('keypress', function(e) {
				if (e.key === 'Enter') {
					handleLogin();
				}
			});
		}
		
		console.log('✓ Login page initialized successfully - ready for login!');
	});
	
	// Also log when window loads
	window.addEventListener('load', function() {
		console.log('✓ Page fully loaded');
	});
	
	// Login handler (available globally for onclick)
	window.handleLogin = async function handleLogin() {
		const usernameInput = document.getElementById('username');
		const passwordInput = document.getElementById('password');
		const loginButton = document.getElementById('loginButton');
		const loginSpinner = document.getElementById('loginSpinner');
		const loginButtonText = document.getElementById('loginButtonText');
		
		if (!usernameInput || !passwordInput || !loginButton || !loginSpinner || !loginButtonText) {
			alert('Page elements not loaded. Please refresh the page.');
			return;
		}
		
		const username = usernameInput.value.trim();
		const password = passwordInput.value;
		
		if (!username || !password) {
			showModal('Input Required', 'Please enter both username and password.', true);
			return;
		}
		
		// Disable button and show spinner
		loginButton.disabled = true;
		loginSpinner.classList.remove('hidden');
		loginButtonText.textContent = 'Logging in...';
		
		// Add timeout to prevent infinite loading
		const loginTimeout = setTimeout(() => {
			loginButton.disabled = false;
			loginSpinner.classList.add('hidden');
			loginButtonText.textContent = 'Login';
			showModal('Connection Timeout', 'The server is taking too long to respond. Please check your connection and try again.', true);
		}, 20000); // 20 second timeout
		
		try {
			console.log('Attempting login with username:', username);
			
			// Check if API is available
			if (typeof API === 'undefined' || typeof login === 'undefined') {
				throw new Error('API or login function not loaded. Please refresh the page.');
			}
			
			console.log('API base URL:', typeof API_BASE !== 'undefined' ? API_BASE : 'api/index.php');
			
			// Test API connection first
			try {
				const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : 'api/index.php';
				const testResponse = await fetch(`${apiBase}?action=test`);
				console.log('API test response status:', testResponse.status);
			} catch (testError) {
				console.error('API test failed:', testError);
			}
			
			const success = await login(username, password);
			clearTimeout(loginTimeout);
			console.log('Login result:', success);
			
			if (success) {
				// Get user role for routing
				const state = getAppState();
				const userRole = state.currentUser?.role;
				
				// Show success message briefly
				showModal('Success', 'Login successful! Redirecting...', false);
				
				// Route based on role
				setTimeout(() => {
					routeToDashboard(userRole);
				}, 1000);
			} else {
				// Re-enable button
				loginButton.disabled = false;
				loginSpinner.classList.add('hidden');
				loginButtonText.textContent = 'Login';
				// This shouldn't happen now since we throw errors, but keep as fallback
				showModal('Login Failed', 'Login failed. Please check your credentials and try again.', true);
			}
		} catch (error) {
			clearTimeout(loginTimeout);
			console.error('Login error:', error);
			// Re-enable button
			loginButton.disabled = false;
			loginSpinner.classList.add('hidden');
			loginButtonText.textContent = 'Login';
			
			// Get error message and enhance it
			let errorMessage = error.message || 'Login failed. Please check your credentials and try again.';
			
			// Enhance error messages for better user experience
			if (errorMessage.includes('timeout')) {
				errorMessage = 'Connection timeout. Please check if the server is running and try again.';
			} else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
				errorMessage = 'Cannot connect to server. Please check if the PHP server is running on port 8000.';
			}
			
			showModal('Login Failed', errorMessage, true);
		}
	}
	
	// Role-based dashboard routing
	function routeToDashboard(role) {
		const routes = {
			'purchaser': 'index.php',
			'stock_handler': 'index.php',
			'kitchen_staff': 'index.php',
			'admin': 'index.php'
		};
		
		const destination = routes[role] || 'index.php';
		window.location.href = destination;
	}
</script>
</body>
</html>