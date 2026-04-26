<?php
require_once __DIR__ . '/config/database.php';
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Settings - Commissary Inventory & Recipe Management System</title>
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
                    <h2 class="text-lg font-semibold text-gray-800 ml-4 lg:ml-0" id="pageTitle">System Settings</h2>
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
                <div class="max-w-4xl mx-auto">
                    <div class="space-y-6">
                        <!-- System Configuration -->
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4">System Configuration</h3>
                            <div class="space-y-4" id="configContainer">
                                <p class="text-gray-500">Loading configuration...</p>
                            </div>
                        </div>
                        
                        <!-- Backup & Restore -->
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4">Backup & Restore</h3>
                            <div class="space-y-4">
                                <div class="flex gap-3">
                                    <button onclick="createBackup()" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2">
                                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                                        </svg>
                                        Create Backup
                                    </button>
                                    <button onclick="loadBackups()" class="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">
                                        Refresh List
                                    </button>
                                </div>
                                <div id="backupsList" class="space-y-2">
                                    <p class="text-gray-500 text-sm">Click "Refresh List" to view backups</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Data Export -->
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div class="flex items-center justify-between mb-6">
                                <div>
                                    <h3 class="text-lg font-semibold text-gray-900">Data Export</h3>
                                    <p class="text-sm text-gray-500 mt-1">Export your data in CSV format for analysis and backup</p>
                                </div>
                                <div class="hidden md:block">
                                    <svg class="h-12 w-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <!-- Export Inventory Card -->
                                <button onclick="exportData('inventory')" class="group relative bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-lg transition-all duration-200 text-left">
                                    <div class="flex items-start justify-between mb-3">
                                        <div class="p-2 bg-blue-500 rounded-lg group-hover:bg-blue-600 transition-colors">
                                            <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                                            </svg>
                                        </div>
                                        <svg class="h-5 w-5 text-blue-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                    </div>
                                    <h4 class="text-base font-semibold text-gray-900 mb-1">Export Inventory</h4>
                                    <p class="text-xs text-gray-600 mb-3">All inventory items with quantities, prices, and categories</p>
                                    <div class="flex items-center text-xs font-medium text-blue-600 group-hover:text-blue-700">
                                        <span>Download CSV</span>
                                        <svg class="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                        </svg>
                                    </div>
                                </button>

                                <!-- Export Purchases Card -->
                                <button onclick="exportData('purchases')" class="group relative bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-5 hover:border-green-400 hover:shadow-lg transition-all duration-200 text-left">
                                    <div class="flex items-start justify-between mb-3">
                                        <div class="p-2 bg-green-500 rounded-lg group-hover:bg-green-600 transition-colors">
                                            <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                            </svg>
                                        </div>
                                        <svg class="h-5 w-5 text-green-400 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                    </div>
                                    <h4 class="text-base font-semibold text-gray-900 mb-1">Export Purchases</h4>
                                    <p class="text-xs text-gray-600 mb-3">Purchase orders with suppliers, prices, and delivery dates</p>
                                    <div class="flex items-center text-xs font-medium text-green-600 group-hover:text-green-700">
                                        <span>Download CSV</span>
                                        <svg class="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                        </svg>
                                    </div>
                                </button>

                                <!-- Export Users Card -->
                                <button onclick="exportData('users')" class="group relative bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-5 hover:border-purple-400 hover:shadow-lg transition-all duration-200 text-left">
                                    <div class="flex items-start justify-between mb-3">
                                        <div class="p-2 bg-purple-500 rounded-lg group-hover:bg-purple-600 transition-colors">
                                            <svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                            </svg>
                                        </div>
                                        <svg class="h-5 w-5 text-purple-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                    </div>
                                    <h4 class="text-base font-semibold text-gray-900 mb-1">Export Users</h4>
                                    <p class="text-xs text-gray-600 mb-3">User accounts with roles, emails, and status information</p>
                                    <div class="flex items-center text-xs font-medium text-purple-600 group-hover:text-purple-700">
                                        <span>Download CSV</span>
                                        <svg class="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                        </svg>
                                    </div>
                                </button>
                            </div>
                        </div>
                        
                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 class="text-lg font-semibold text-gray-900 mb-4">Danger Zone</h3>
                            <div class="space-y-4">
                                <div class="border border-red-200 rounded-lg p-4 bg-red-50">
                                    <h4 class="font-semibold text-red-900 mb-2">Reset All Data</h4>
                                    <p class="text-sm text-red-700 mb-4">This will delete all purchases, requests, packages, and custom recipes. Only initial inventory items will remain. This action cannot be undone.</p>
                                    <button onclick="resetAllData()" class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors">
                                        Reset All Data
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <script src="js/api.js"></script>
    <script src="js/store.js"></script>
    <script src="js/ui.js"></script>
    <script src="js/notifications.js"></script>
    <script src="js/layout.js"></script>
    <script src="js/password.js"></script>
    <script src="js/dashboard.js"></script>
    <script src="js/settings.js"></script>
</body>
</html>
