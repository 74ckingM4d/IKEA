<?php
require_once __DIR__ . '/config/database.php';
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Commissary Inventory & Recipe Management System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
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
                    <h2 class="text-lg font-semibold text-gray-800 ml-4 lg:ml-0" id="pageTitle">Dashboard</h2>
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
                        <h1 class="text-2xl font-bold text-gray-900" id="welcomeText">Welcome back</h1>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="statsGrid"></div>
                        <div id="chartContainer" class="hidden">
                            <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                                <h3 class="text-lg font-semibold text-gray-900 mb-4">Total Spent Over Time</h3>
                                <div class="h-64">
                                    <canvas id="totalSpentChart"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="space-y-4" id="alertsContainer"></div>
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
</body>
</html>
