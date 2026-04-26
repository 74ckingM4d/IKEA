# Functional test case matrix — IKEA Commissary

**Purpose:** Manual / exploratory functional verification after deployment or release.  
**How to use:** Execute each row; in **Result**, write **Passed** if behavior matches **Expected result**, or **Fail** if it does not (note the defect or reason).

**Roles reference:** `admin`, `purchaser`, `stock_handler`, `kitchen_staff` (see `js/layout.js`).

---

| TC-ID | What to test | Expected result | Result |
|-------|----------------|-----------------|--------|
| **Authentication & session** | | | |
| AUTH-001 | Open `login.php` with valid username and password | User is authenticated; redirected to role-appropriate landing (dashboard); session restored on refresh where applicable | Pending |
| AUTH-002 | Login with wrong password | Error shown; user not logged in; no access to app pages | Pending |
| AUTH-003 | Login with empty username or password | Validation / error; login not submitted successfully | Pending |
| AUTH-004 | Logout from user menu | Session cleared; redirect to login; protected pages redirect to login | Pending |
| AUTH-005 | Open `index.php` (or any app page) while not logged in | Redirect to `login.php` | Pending |
| AUTH-006 | Password field: show/hide (eye) toggle on login | Toggles between masked and visible password without losing input | Pending |
| **Password change (logged-in user)** | | | |
| PWD-001 | Change Password: request verification code (valid logged-in user) | Code flow starts; success or email error handled per configuration | Pending |
| PWD-002 | Change Password: wrong / expired code | Appropriate error; password not changed | Pending |
| PWD-003 | Change Password: new password meets strength rules | Password updates; success message; can log in with new password | Pending |
| PWD-004 | Change Password: weak password (no upper/lower/digit/special or &lt; 8 chars) | Rejected with clear validation message | Pending |
| **Navigation & layout (by role)** | | | |
| NAV-001 | **Admin** sidebar | Dashboard, History, Inventory Management, Payment Management, Reports & Analytics, User Management, System Settings visible | Pending |
| NAV-002 | **Purchaser** sidebar | Dashboard, Purchases, History visible; admin links hidden | Pending |
| NAV-003 | **Stock handler** sidebar | Dashboard, Inventory (Raw + Prepared), Make Set, Kitchen Requests, History visible | Pending |
| NAV-004 | **Kitchen staff** sidebar | Dashboard, Set Request, Kitchen Requests, History visible | Pending |
| NAV-005 | Header shows correct user name, role, and initial | Matches logged-in user from `getState` / session | Pending |
| NAV-006 | Mobile menu: open/close sidebar and overlay | Sidebar toggles; overlay closes menu as designed | Pending |
| **Dashboard (`index.php`)** | | | |
| DASH-001 | Welcome text includes user’s display name | “Welcome back, {name}” (from `dashboard.js`) | Pending |
| DASH-002 | Stat cards reflect inventory value, low stock, pending purchases, pending requests | Numbers consistent with data in system | Pending |
| DASH-003 | **Admin:** “Total Spent Over Time” chart | Chart section visible and renders without JS error | Pending |
| DASH-004 | **Non-admin:** chart area | Chart hidden or not shown for roles without admin chart logic | Pending |
| DASH-005 | Alerts for low stock / pending requests / deliveries | Relevant alerts shown when data exists | Pending |
| **Purchases (`purchases.php`)** | | | |
| PUR-001 | **Purchaser:** Add purchase (valid data) | Purchase created; appears in list; API `addPurchase` succeeds | Pending |
| PUR-002 | Upload receipt (if applicable to flow) | File accepted or clear error; record updated if supported | Pending |
| PUR-003 | Confirm full delivery | Status updated; inventory/records reflect delivery | Pending |
| PUR-004 | Confirm partial delivery | Partial quantities handled; state consistent | Pending |
| PUR-005 | Delete purchase (where permitted) | Removed or archived per business rules; list updates | Pending |
| PUR-006 | **Non-purchaser / non-stock** access | Add/confirm actions not available or API returns unauthorized | Pending |
| **Inventory — raw (`inventory.php`)** | | | |
| INV-001 | **Stock handler:** view inventory list | Items load from state/API | Pending |
| INV-002 | Update item (quantity / fields as UI allows) | `updateInventoryItem` succeeds; UI reflects change | Pending |
| INV-003 | Expiry / low-stock indicators (if implemented in UI) | Correct visual state vs. thresholds | Pending |
| **Prepared / packed items (`packed-items.php`)** | | | |
| PCK-001 | List packaged items | Data loads; sorting/grouping acceptable | Pending |
| PCK-002 | Create package (`createPackage`) | New package appears; linked data correct | Pending |
| PCK-003 | Delete package (`deletePackage`) | Removed after confirm; no orphan errors | Pending |
| **Make set / ingredient sets (`ingredients.php`)** | | | |
| ING-001 | **Stock handler:** create ingredient set | `addIngredientSet` succeeds; set listed | Pending |
| ING-002 | Delete ingredient set | `deleteIngredientSet` succeeds | Pending |
| **Set request / recipe sets (`recipe-sets.php`)** | | | |
| REC-001 | **Kitchen staff:** view and submit set request flow | Request created; visible to processors | Pending |
| **Kitchen requests (`requests.php`)** | | | |
| REQ-001 | **Kitchen:** create request (`addRequest` / single item if used) | Request appears as pending | Pending |
| REQ-002 | **Stock handler:** process request (`processRequest`) | Status moves to processed; inventory impact correct | Pending |
| REQ-003 | Delete request (if allowed) | `deleteRequest` succeeds | Pending |
| **History (`history.php`)** | | | |
| HIS-001 | All roles: open History | Audit/history data loads; filters readable | Pending |
| HIS-002 | Entries match recent actions | Logged actions appear after purchases/requests/etc. | Pending |
| **Admin — inventory management (`inventory-management.php`)** | | | |
| ADM-INV-001 | Add / edit inventory master data (as UI provides) | Persisted in DB; visible on raw inventory where linked | Pending |
| ADM-INV-002 | Dispose inventory item (`disposeInventoryItem`) | Quantity or status updated; disposal recorded | Pending |
| ADM-INV-003 | **Non-admin** direct URL access | Unauthorized or redirect; API rejects | Pending |
| **Admin — payments (`payments.php`)** | | | |
| PAY-001 | View payment batches / purchases | Lists load | Pending |
| PAY-002 | Update payment status (`updatePaymentStatus`) | Status persists; totals consistent | Pending |
| **Admin — reports (`reports.php`)** | | | |
| RPT-001 | Generate or view key reports (inventory, expiry, spend, etc.) | Data matches source; export/print if present works | Pending |
| RPT-002 | Date / filter parameters | Filtered results match criteria | Pending |
| **Admin — users (`users.php`)** | | | |
| USR-001 | List users (`getUsers`) | All users shown with roles | Pending |
| USR-002 | Create user (`createUser`) with strong password | User can log in | Pending |
| USR-003 | Update user (`updateUser`) | Changes saved | Pending |
| USR-004 | Reset user password (`resetUserPassword`) | New password works on login | Pending |
| USR-005 | Deactivate / activate user (`updateUserStatus`) if used | Login behavior matches status | Pending |
| USR-006 | Delete user (`deleteUser`) | User removed or soft-deleted per design | Pending |
| USR-007 | **Non-admin** access | Blocked | Pending |
| **Admin — system settings (`settings.php`)** | | | |
| SET-001 | View system config (`getSystemConfig`) | Values displayed | Pending |
| SET-002 | Update config (`updateSystemConfig`) | Values persist after reload | Pending |
| SET-003 | Database backup (`backupDatabase`) | Backup created; success message or file listed | Pending |
| SET-004 | List backups (`listBackups`) | List matches files / DB records | Pending |
| SET-005 | Restore (`restoreDatabase`) — **use test environment only** | Restore completes or clear failure; app still usable | Pending |
| SET-006 | Export data (`exportData`) | File downloads or path returned per implementation | Pending |
| SET-007 | Reset data (`resetData`) — **test environment only** | Data reset per spec; warnings respected | Pending |
| **Notifications** | | | |
| NOTIF-001 | Notification bell / low-stock alerts (if enabled) | Bell shows count; panel opens; links work | Pending |
| **API / integration (smoke)** | | | |
| API-001 | `GET .../api/index.php?action=getState` with valid session | JSON `success: true` and app state payload | Pending |
| API-002 | `POST login` with JSON body | Returns user object on success | Pending |
| API-003 | Unauthorized admin action as non-admin | `success: false` and unauthorized message | Pending |
| **Non-functional (light)** | | | |
| NFR-001 | No obvious JS errors on main pages (browser console) | No critical errors on Dashboard, Purchases, Inventory, Requests | Pending |
| NFR-002 | Responsive layout: tablet width | Sidebar and tables usable without horizontal break | Pending |

---

## Notes

- **Expected results** assume a working DB and email configuration where features depend on them (verification codes, notifications).
- If a test cannot be run (e.g. DB down, mail not configured), record **Fail** or keep **Pending** and note the reason separately.
- Replace **Pending** with **Passed** or **Fail** after you execute each case.
- After schema or role changes, re-verify **NAV-*** and **ADM-*** rows.

**Document version:** 1.0 (aligned with API actions in `api/index.php` and navigation in `js/layout.js`).
