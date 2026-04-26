<?php
require_once __DIR__ . '/config/database.php';
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reports & Analytics - Commissary Inventory & Recipe Management System</title>
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
                    <h2 class="text-lg font-semibold text-gray-800 ml-4 lg:ml-0" id="pageTitle">Reports & Analytics</h2>
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
                            <h1 class="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                            <div class="flex gap-2">
                                <button id="printReportBtn" onclick="printCurrentReport()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2">
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                                    </svg>
                                    Print Report
                                </button>
                                <button onclick="exportCurrentReport()" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2">
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        <!-- Report Tabs -->
                        <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div class="border-b border-gray-200 overflow-x-auto">
                                <nav class="flex -mb-px">
                                    <button onclick="showReportTab('lowstock')" id="tab-lowstock" class="px-4 py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600 whitespace-nowrap">
                                        Low Stock Report
                                    </button>
                                    <button onclick="showReportTab('expiry')" id="tab-expiry" class="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent whitespace-nowrap">
                                        Expiry Tracking
                                    </button>
                                    <button onclick="showReportTab('disposals')" id="tab-disposals" class="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent whitespace-nowrap">
                                        Waste/Disposal Report
                                    </button>
                                    <button onclick="showReportTab('purchases')" id="tab-purchases" class="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent whitespace-nowrap">
                                        Purchase Analysis
                                    </button>
                                    <button onclick="showReportTab('consumption')" id="tab-consumption" class="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent whitespace-nowrap">
                                        Most Consumed Items
                                    </button>
                                </nav>
                            </div>
                            <div class="p-6" id="reportContentContainer">
                                <div id="reportContent">
                                    <!-- Report content will be rendered here -->
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
    <script src="js/reports.js"></script>
    <style>
        @media print {
            body * {
                visibility: hidden;
            }
            #reportContent, #reportContent * {
                visibility: visible;
            }
            #reportContent {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
            }
            .no-print {
                display: none !important;
            }
            .print-header {
                display: block !important;
                margin-bottom: 20px;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
            }
            .print-table-container {
                overflow: visible !important;
            }
            .print-table {
                width: 100% !important;
                font-size: 10px;
            }
            .print-table th,
            .print-table td {
                padding: 4px 6px !important;
                font-size: 10px !important;
            }
            .print-table th {
                font-size: 9px !important;
            }
            table {
                page-break-inside: auto;
            }
            tr {
                page-break-inside: avoid;
                page-break-after: auto;
            }
        }
        .print-header {
            display: none;
        }
    </style>
</body>
</html>
