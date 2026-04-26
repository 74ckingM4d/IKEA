<?php
require_once __DIR__ . '/config/database.php';
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recipe Set Request - Commissary Inventory & Recipe Management System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Prevent image zooming */
        img {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-user-drag: none;
            -khtml-user-drag: none;
            -moz-user-drag: none;
            -o-user-drag: none;
            pointer-events: none;
            touch-action: none;
        }
        /* Prevent double-tap zoom on mobile */
        * {
            touch-action: manipulation;
        }
    </style>
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
                    <h2 class="text-lg font-semibold text-gray-800 ml-4 lg:ml-0" id="pageTitle">Recipe Set Request</h2>
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
                                <h1 class="text-2xl font-bold text-gray-900">Recipe Set Request</h1>
                                <p class="text-sm text-gray-600 mt-1">Click the image to Add recipe sets to cart, then submit all at once</p>
                            </div>
                            <button onclick="openCartModal()" class="relative px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                </svg>
                                <span>Cart</span>
                                <span id="cartBadge" class="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center" style="display: none;">0</span>
                            </button>
                        </div>
                        <div id="recipeSetsContainer" class="pb-8">
                            <p class="text-gray-500">Loading...</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>
    
    <!-- Request Quantity Modal -->
    <div id="requestQuantityModal" class="hidden fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onclick="closeRequestQuantityModal()"></div>
            <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div class="sm:flex sm:items-start">
                        <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Add to Cart</h3>
                            <form id="requestQuantityForm" onsubmit="handleRequestSubmit(event)">
                                <input type="hidden" id="requestSetId" value="">
                                
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Recipe Name</label>
                                        <p id="requestRecipeName" class="text-base font-semibold text-green-600"></p>
                                    </div>
                                    
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Quantity (Number of Sets) *</label>
                                        <input type="number" id="requestQuantity" step="1" min="1" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter quantity">
                                        <p class="mt-1 text-xs text-gray-500">Enter how many sets of this recipe you need</p>
                                    </div>
                                </div>
                                
                                <div class="mt-6 flex justify-end gap-3">
                                    <button type="button" onclick="closeRequestQuantityModal()" class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Add to Cart</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Cart Modal -->
    <div id="cartModal" class="hidden fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onclick="closeCartModal()"></div>
            <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg leading-6 font-medium text-gray-900">Request Cart</h3>
                        <button onclick="closeCartModal()" class="text-gray-400 hover:text-gray-500">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div id="cartList" class="max-h-96 overflow-y-auto">
                        <!-- Cart items will be rendered here -->
                    </div>
                    <div class="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4">
                        <button onclick="closeCartModal()" class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button>
                        <button id="submitAllBtn" onclick="submitAllRequests()" class="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700">Submit All Requests</button>
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
    <script src="js/recipe-sets.js"></script>
</body>
</html>
