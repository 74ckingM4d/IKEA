# Hostinger Deployment Guide

## Pre-Deployment Checklist

### 1. Prepare Your Files
- [ ] Ensure all files are ready for upload
- [ ] Remove any test files (e.g., `test_quantity_fix.php`, `diagnose_inventory.php`)
- [ ] Backup your local database
- [ ] Export your local database using phpMyAdmin

### 2. Database Setup on Hostinger

1. **Access Hostinger Control Panel (hPanel)**
   - Log in to your Hostinger account
   - Navigate to **Databases** → **MySQL Databases**

2. **Create Database**
   - Create a new MySQL database (e.g., `u123456789_ikea_inventory`)
   - Note down the database name

3. **Create Database User**
   - Create a new MySQL user
   - Assign a strong password
   - Note down: username, password, and host (usually `localhost`)

4. **Import Database Schema**
   - Go to **phpMyAdmin** in hPanel
   - Select your database
   - Click **Import** tab
   - Upload the `database/schema.sql` file
   - Or run the SQL commands manually

### 3. Upload Files to Hostinger

1. **Access File Manager or Use FTP**
   - Option A: Use Hostinger's **File Manager** in hPanel
   - Option B: Use FTP client (FileZilla, WinSCP, etc.)
     - FTP Host: `ftp.yourdomain.com` or IP address
     - Username: Your Hostinger FTP username
     - Password: Your Hostinger FTP password
     - Port: 21 (or 22 for SFTP)

2. **Upload Files**
   - Navigate to `public_html` folder (or your domain's root folder)
   - Upload all project files maintaining the folder structure:
     ```
     public_html/
     ├── api/
     ├── assets/
     ├── backend/
     ├── config/
     ├── css/
     ├── database/
     ├── js/
     ├── uploads/
     └── *.php files
     ```

3. **Set Permissions**
   - Set `uploads/` folder permissions to **755** or **775**
   - Ensure PHP files have **644** permissions

### 4. Configure Database Connection

1. **Update Database Config**
   - Edit `config/database.php` on Hostinger
   - Update with your Hostinger database credentials:
     ```php
     'host' => 'localhost',  // Usually 'localhost' on Hostinger
     'dbname' => 'u123456789_ikea_inventory',  // Your database name
     'username' => 'u123456789_dbuser',  // Your database username
     'password' => 'your_secure_password',  // Your database password
     ```

### 5. Environment-Specific Configuration

The application now supports environment detection. The `config/database.php` file will automatically detect if you're on Hostinger and use production settings.

**For Production (Hostinger):**
- Database credentials are read from environment variables or the config file
- Make sure your database credentials in `config/database.php` match your Hostinger MySQL setup

### 6. Security Considerations

1. **Protect Sensitive Files**
   - The `.htaccess` file has been created to protect config files
   - Ensure `.gitignore` is not uploaded (or doesn't expose sensitive info)

2. **File Permissions**
   - PHP files: **644**
   - Folders: **755**
   - `uploads/` folder: **755** or **775** (writable by web server)

3. **Remove Test Files**
   - Delete `test_quantity_fix.php`
   - Delete `diagnose_inventory.php`
   - Or move them outside `public_html`

### 7. Test Your Deployment

1. **Access Your Application**
   - Visit: `https://yourdomain.com/login.php`
   - Try logging in with default credentials:
     - Username: `admin`
     - Password: `password123`

2. **Test Key Features**
   - [ ] Login works
   - [ ] Dashboard loads
   - [ ] Database queries work
   - [ ] File uploads work (test receipt upload)
   - [ ] All pages are accessible

### 8. Post-Deployment Tasks

1. **Change Default Passwords**
   - Log in as admin
   - Go to Users page
   - Change all default passwords

2. **Configure Domain (if using custom domain)**
   - Point your domain to Hostinger nameservers
   - Wait for DNS propagation (24-48 hours)

3. **Enable SSL Certificate**
   - Hostinger usually provides free SSL
   - Enable it in hPanel → **SSL** section
   - Force HTTPS redirect (already configured in `.htaccess`)

4. **Set Up Backups**
   - Configure automatic backups in Hostinger
   - Or set up manual backup schedule

## Troubleshooting

### Database Connection Errors
- Verify database credentials in `config/database.php`
- Check if database user has proper permissions
- Ensure database exists in phpMyAdmin

### 500 Internal Server Error
- Check file permissions
- Review error logs in Hostinger hPanel → **Error Logs**
- Verify `.htaccess` syntax is correct

### File Upload Issues
- Check `uploads/` folder permissions (should be 755 or 775)
- Verify PHP upload settings in Hostinger
- Check `php.ini` settings: `upload_max_filesize` and `post_max_size`

### Page Not Found (404)
- Verify all files are uploaded correctly
- Check if `.htaccess` is present
- Ensure you're accessing the correct URL

## Hostinger-Specific Notes

- **PHP Version**: Hostinger supports multiple PHP versions. Use PHP 7.4 or higher
- **MySQL Host**: Usually `localhost` (not `127.0.0.1`)
- **Database Prefix**: Hostinger databases often have prefixes like `u123456789_`
- **File Paths**: Use relative paths (which your app already does)
- **Session Storage**: Sessions should work automatically with default PHP settings

## Support

If you encounter issues:
1. Check Hostinger's error logs
2. Enable error reporting temporarily (remove from production after debugging)
3. Contact Hostinger support for server-specific issues
