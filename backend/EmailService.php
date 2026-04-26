<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../vendor/autoload.php';

class EmailService {
    private $mailer;
    
    public function __construct() {
        $this->mailer = new PHPMailer(true);
        
        // Enable verbose debug output (set to 0 in production)
        $this->mailer->SMTPDebug = 0; // 0 = off, 1 = client messages, 2 = client and server messages
        $this->mailer->Debugoutput = function($str, $level) {
            error_log("PHPMailer Debug (level $level): $str");
        };
        
        // Configure SMTP settings
        // You can set these via environment variables or config file
        $this->mailer->isSMTP();
        
        // Gmail SMTP Configuration
        $email = getenv('SMTP_USERNAME') ?: 'lorencapuyan91@gmail.com';
        $smtpHost = getenv('SMTP_HOST') ?: 'smtp.gmail.com';
        $smtpPassword = getenv('SMTP_PASSWORD') ?: 'avfciihxwdmvwsoj';
        
        // Gmail Settings
        $this->mailer->Host = $smtpHost;
        $this->mailer->Port = getenv('SMTP_PORT') ?: 587;
        $this->mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        
        $this->mailer->SMTPAuth = true;
        $this->mailer->Username = $email;
        
        // Get password - remove all spaces and ensure it's clean
        $this->mailer->Password = trim(str_replace(' ', '', $smtpPassword));
        
        // Additional authentication settings for better compatibility
        $this->mailer->AuthType = 'LOGIN';
        
        // Additional SMTP options for better compatibility
        $this->mailer->SMTPOptions = array(
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            )
        );
        
        // Set timeout values
        $this->mailer->Timeout = 30;
        $this->mailer->SMTPKeepAlive = false;
        
        // Set default from address (use same as username for Gmail)
        $this->mailer->setFrom(
            getenv('SMTP_FROM_EMAIL') ?: $email,
            getenv('SMTP_FROM_NAME') ?: 'IKEA Commissary System'
        );
        
        $this->mailer->CharSet = 'UTF-8';
        $this->mailer->isHTML(true);
    }
    
    /**
     * Send password verification code to user's email
     */
    public function sendPasswordVerificationCode($email, $name, $code) {
        try {
            $this->mailer->clearAddresses();
            $this->mailer->addAddress($email, $name);
            
            $this->mailer->Subject = 'Password Change Verification Code - IKEA Commissary';
            
            $this->mailer->Body = "
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #FAD1E8 0%, #CDEFD8 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
                        .code-box { background: #f5f5f5; border: 2px dashed #00A451; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
                        .code { font-size: 32px; font-weight: bold; color: #00A451; letter-spacing: 5px; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='header'>
                            <h2 style='margin: 0; color: #382E2E;'>IKEA Commissary</h2>
                        </div>
                        <div class='content'>
                            <h3>Password Change Verification</h3>
                            <p>Hello {$name},</p>
                            <p>You have requested to change your password. Please use the verification code below:</p>
                            
                            <div class='code-box'>
                                <div class='code'>{$code}</div>
                            </div>
                            
                            <div class='warning'>
                                <strong>⚠️ Security Notice:</strong> This code will expire in 10 minutes. If you did not request this password change, please ignore this email and contact your administrator.
                            </div>
                            
                            <p>Enter this code in the password change form to verify your identity.</p>
                            
                            <p>Best regards,<br>IKEA Commissary System</p>
                        </div>
                        <div class='footer'>
                            <p>This is an automated message. Please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>
            ";
            
            $this->mailer->AltBody = "
                Password Change Verification Code - IKEA Commissary
                
                Hello {$name},
                
                You have requested to change your password. Please use the verification code below:
                
                Verification Code: {$code}
                
                This code will expire in 10 minutes.
                
                If you did not request this password change, please ignore this email and contact your administrator.
                
                Best regards,
                IKEA Commissary System
            ";
            
            if (!$this->mailer->send()) {
                $errorInfo = $this->mailer->ErrorInfo;
                error_log("Email sending failed: " . $errorInfo);
                error_log("SMTP Username: " . $this->mailer->Username);
                error_log("SMTP Host: " . $this->mailer->Host);
                error_log("SMTP Port: " . $this->mailer->Port);
                throw new Exception("Failed to send verification email: " . $errorInfo);
            }
            return true;
        } catch (Exception $e) {
            $errorInfo = $this->mailer->ErrorInfo ?? $e->getMessage();
            error_log("Email sending exception: " . $e->getMessage());
            error_log("PHPMailer ErrorInfo: " . $errorInfo);
            throw new Exception("Failed to send verification email: " . ($errorInfo ?: $e->getMessage()));
        }
    }
}
