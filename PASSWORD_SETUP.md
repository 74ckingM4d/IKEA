# Password Change Feature Setup Guide

## Overview
This feature allows users to change their passwords with email verification. When an admin creates a new user, they can set a default password, and the user can change it later using the "Change Password" option in their user menu.

## Installation Steps

### 1. Install Composer Dependencies
Run the following command in the project root directory:

**Option A: Using composer.bat (recommended)**
```bash
composer.bat install
```

**Option B: Using PHP directly**
```bash
php composer.phar install
```

**Option C: If composer is in your PATH**
```bash
composer install
```

This will install PHPMailer which is required for sending verification emails.

**Note:** If you get an error that composer is not recognized, use `composer.bat` or `php composer.phar` instead. The `composer.phar` file is already included in the project.

### 2. Database Setup
Run the SQL migration to create the verification codes table. The table definition is already in `database/schema.sql`. If you need to create it manually:

```sql
CREATE TABLE IF NOT EXISTS password_verification_codes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    code VARCHAR(6) NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_code (code),
    INDEX idx_expires_at (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. Email Configuration

#### Option A: Using Environment Variables (Recommended)
Create a `.env` file in the project root or set environment variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@ikeacommissary.com
SMTP_FROM_NAME=IKEA Commissary System
```

#### Option B: Edit EmailService.php Directly
Edit `backend/EmailService.php` and update the SMTP settings:

```php
$this->mailer->Host = 'smtp.gmail.com';
$this->mailer->Username = 'your-email@gmail.com';
$this->mailer->Password = 'your-app-password';
$this->mailer->Port = 587;
```

### 4. Gmail Setup (if using Gmail)
1. Enable 2-Step Verification on your Google account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password in your SMTP configuration

### 5. Other Email Providers
For other email providers, update the SMTP settings accordingly:
- **Outlook/Hotmail**: smtp-mail.outlook.com, Port 587
- **Yahoo**: smtp.mail.yahoo.com, Port 587
- **Custom SMTP**: Use your provider's SMTP settings

## How It Works

### For Admins:
1. When creating a new user, set a default password
2. The user will receive this password and can change it later

### For Users:
1. Click on the user menu (top right)
2. Select "Change Password"
3. Click "Send Verification Code" - a 6-digit code will be sent to their email
4. Enter the verification code
5. Enter and confirm the new password
6. Password is changed successfully!

## Security Features
- Verification codes expire after 10 minutes
- Codes can only be used once
- Email verification ensures only the account owner can change the password
- Password must be at least 6 characters long

## Troubleshooting

### Emails Not Sending
1. Check SMTP credentials are correct
2. Verify firewall allows SMTP connections
3. Check PHP error logs for detailed error messages
4. For Gmail, ensure App Password is used (not regular password)

### Verification Code Not Working
1. Ensure code is entered within 10 minutes
2. Check that code hasn't been used already
3. Verify email matches the account email

### Database Errors
1. Ensure the `password_verification_codes` table exists
2. Check database connection settings
3. Verify foreign key constraints are set up correctly

## Testing
1. Log in as a user with an email address
2. Click on user menu → "Change Password"
3. Verify email is displayed correctly
4. Send verification code and check email
5. Enter code and change password
6. Log out and log back in with new password
