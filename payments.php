<?php
require_once __DIR__ . '/config/database.php';
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Management - Commissary Inventory & Recipe Management System</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <div class="flex h-screen bg-gray-50 overflow-hidden">
        <!-- Sidebar -->
        <div id="sidebar" class="fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform -translate-x-full transition-transform lg:translate-x-0 lg:static lg:inset-0">
            <div class="flex flex-col h-full">
                <div class="flex items-center gap-3 h-16 border-b border-gray-200 px-4">
                    <img src="assets/images/logo.jpg" alt="IKEA Logo" class="h-10 w-10 rounded-full object-cover flex-shrink-0">
                    <div class="flex flex-col">
                        <span class="text-sm font-bold text-gray-900 leading-tight">IKEA</span>
                        <span class="text-xs text-gray-600 leading-tight">Cakes and Snacks Commissary</span>
                    </div>
                </div>
                <nav class="flex-1 overflow-y-auto py-4">
                    <ul class="space-y-1" id="navLinks"></ul>
                </nav>
            </div>
        </div>
        <div id="sidebarOverlay" class="fixed inset-0 z-20 bg-gray-900 bg-opacity-50 transition-opacity lg:hidden opacity-0 pointer-events-none" onclick="closeSidebar()"></div>
        <div class="flex-1 flex flex-col overflow-hidden">
            <header class="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-8">
                <div class="flex items-center">
                    <button onclick="openSidebar()" class="p-2 rounded-md text-gray-500 hover:bg-gray-100 lg:hidden">
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                    <h2 class="text-lg font-semibold text-gray-800 ml-4 lg:ml-0" id="pageTitle">Payment Management</h2>
                </div>
                <div class="flex items-center gap-4">
                    <div id="notificationBellContainer"></div>
                    <div class="relative">
                        <button id="userMenuButton" onclick="toggleUserDropdown()" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <div class="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm" id="headerUserInitial">U</div>
                            <div class="hidden md:block text-left">
                                <p class="text-sm font-medium text-gray-900" id="headerUserName">User</p>
                                <p class="text-xs text-gray-500 capitalize" id="headerUserRole">Role</p>
                            </div>
                            <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </button>
                        <div id="userDropdown" class="hidden absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                            <div class="px-4 py-3 border-b border-gray-200 md:hidden">
                                <p class="text-sm font-medium text-gray-900" id="headerUserNameMobile">User</p>
                                <p class="text-xs text-gray-500 capitalize" id="headerUserRoleMobile">Role</p>
                            </div>
                            <button onclick="showChangePasswordModal(); closeUserDropdown();" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors border-b border-gray-200">
                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                                </svg>
                                Change Password
                            </button>
                            <button onclick="handleLogout(); closeUserDropdown();" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                                </svg>
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            <main class="flex-1 overflow-y-auto p-4 lg:p-8">
                <div class="max-w-7xl mx-auto">
                    <div class="space-y-6">
                        <div class="flex justify-between items-center">
                            <div>
                                <h1 class="text-2xl font-bold text-gray-900">Payment Management</h1>
                                <p class="text-sm text-gray-600 mt-1">View all purchase orders and manage payment receipts</p>
                            </div>
                        </div>
                        
                        <!-- Summary Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Total Unpaid</p>
                                        <p id="totalUnpaidAmount" class="text-2xl font-bold text-red-600 mt-1">₱0.00</p>
                                    </div>
                                    <div class="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                                        <span class="text-2xl font-bold text-red-600">₱</span>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Unpaid Batches</p>
                                        <p id="totalUnpaidBatches" class="text-2xl font-bold text-gray-900 mt-1">0</p>
                                    </div>
                                    <div class="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                                        <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-600">Unpaid Single Items</p>
                                        <p id="totalUnpaidSingle" class="text-2xl font-bold text-gray-900 mt-1">0</p>
                                    </div>
                                    <div class="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                        <svg class="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Filters -->
                        <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
                                    <input type="text" id="searchInput" placeholder="Search by supplier, item..." class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" onkeyup="applyFilters()">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                                    <select id="supplierFilter" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" onchange="applyFilters()">
                                        <option value="">All Suppliers</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Purchase Type</label>
                                    <select id="purchaseTypeFilter" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" onchange="applyFilters()">
                                        <option value="">All Types</option>
                                        <option value="delivery">Delivery</option>
                                        <option value="personal">Personal Purchase</option>
                                    </select>
                                </div>
                            </div>
                            <div class="mt-3 flex justify-end">
                                <button onclick="clearFilters()" class="text-sm text-gray-600 hover:text-gray-800">Clear Filters</button>
                            </div>
                        </div>
                        
                        <div id="paymentsContainer" class="space-y-4">
                            <p class="text-gray-500">Loading...</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>
    
    <!-- Payment Modal -->
    <div id="paymentModal" class="hidden fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onclick="closePaymentModal()"></div>
            <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div class="sm:flex sm:items-start">
                        <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4" id="paymentModalTitle">Mark as Paid</h3>
                            <form id="paymentForm" onsubmit="handlePaymentSubmit(event)">
                                <input type="hidden" id="paymentBatchId" value="">
                                <input type="hidden" id="paymentType" value=""> <!-- 'batch' or 'single' -->
                                
                                <div class="space-y-4">
                                    <div class="bg-gray-50 p-4 rounded-lg">
                                        <p class="text-sm text-gray-600 mb-2">Expected Amount</p>
                                        <p id="expectedAmount" class="text-2xl font-bold text-gray-900">₱0.00</p>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Amount Paid *</label>
                                        <input type="number" id="paidAmount" step="0.01" min="0" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00">
                                        <p id="amountError" class="mt-1 text-xs text-red-600 hidden"></p>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Payment Receipt *</label>
                                        <input type="file" id="receiptFile" accept="image/*,.pdf" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <p class="mt-1 text-xs text-gray-500">Upload receipt image or PDF (max 5MB)</p>
                                        <div id="receiptPreview" class="mt-2 hidden">
                                            <img id="receiptPreviewImg" src="" alt="Receipt preview" class="max-w-full h-32 object-contain border border-gray-300 rounded">
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                                        <textarea id="paymentNotes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Add any notes about this payment..."></textarea>
                                    </div>
                                </div>
                                
                                <div class="mt-6 flex justify-end gap-3">
                                    <button type="button" onclick="closePaymentModal()" class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Mark as Paid</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="js/api.js"></script>
    <script src="js/store.js"></script>
    <script src="js/ui.js"></script>
    <script src="js/notifications.js"></script>
    <script src="js/layout.js"></script>
    <script src="js/password.js"></script>
    <script src="js/payments.js"></script>
</body>
</html>
