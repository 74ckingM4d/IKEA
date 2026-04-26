# Quick Deployment Checklist for Hostinger

## Before Uploading

- [ ] Backup your local database
- [ ] Export database using phpMyAdmin (SQL format)
- [ ] Review and update `config/database.php` with Hostinger credentials
- [ ] Remove or exclude test files (`test_quantity_fix.php`, `diagnose_inventory.php`)

## On Hostinger

### Step 1: Create Database
- [ ] Log in to Hostinger hPanel
- [ ] Go to **Databases** → **MySQL Databases**
- [ ] Create new database (note the name)
- [ ] Create new database user (note username and password)
- [ ] Grant user access to the database

### Step 2: Import Database
- [ ] Open **phpMyAdmin** in hPanel
- [ ] Select your database
- [ ] Click **Import** tab
- [ ] Upload `database/schema.sql`
- [ ] Verify tables were created

### Step 3: Upload Files
- [ ] Use File Manager or FTP client
- [ ] Navigate to `public_html` (or your domain folder)
- [ ] Upload all project files maintaining folder structure
- [ ] Set `uploads/` folder permissions to **755**

### Step 4: Configure Database
- [ ] Edit `config/database.php` on server
- [ ] Update with Hostinger database credentials:
  ```php
  'dbname' => 'your_hostinger_database_name',
  'username' => 'your_hostinger_db_username',
  'password' => 'your_hostinger_db_password',
  ```

### Step 5: Test
- [ ] Visit `https://yourdomain.com/login.php`
- [ ] Login with: `admin` / `password123`
- [ ] Test key features (dashboard, inventory, uploads)
- [ ] Check for any errors

### Step 6: Security
- [ ] Change all default passwords
- [ ] Enable SSL certificate in hPanel
- [ ] Uncomment HTTPS redirect in `.htaccess` (line 9-10)
- [ ] Verify file permissions are correct

## Common Issues

**Database connection error?**
→ Check credentials in `config/database.php`
→ Verify database exists in phpMyAdmin
→ Check user permissions

**500 Internal Server Error?**
→ Check file permissions (folders: 755, files: 644)
→ Review error logs in hPanel
→ Verify `.htaccess` syntax

**File upload not working?**
→ Check `uploads/` folder permissions (755 or 775)
→ Verify PHP upload limits in Hostinger settings

**Page not found?**
→ Verify all files uploaded correctly
→ Check if `.htaccess` is present
→ Ensure correct URL path

## Files to Update on Hostinger

1. **config/database.php** - Database credentials (REQUIRED)
2. **.htaccess** - Uncomment HTTPS redirect after SSL is enabled (OPTIONAL)

## Default Login Credentials

After deployment, log in with:
- **Username:** `admin`
- **Password:** `password123`

**⚠️ IMPORTANT:** Change this password immediately after first login!
