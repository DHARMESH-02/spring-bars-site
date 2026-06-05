<?php
session_start();

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Only POST requests are allowed.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$action = trim((string)($_POST['action'] ?? $input['action'] ?? ''));
$email = trim((string)($_POST['email'] ?? $input['email'] ?? ''));
$otpCode = trim((string)($_POST['otp'] ?? $input['otp'] ?? ''));
$name = trim((string)($_POST['name'] ?? $input['name'] ?? ''));

if (!$action) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Action is required.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'A valid email address is required.']);
    exit;
}

const OTP_EXPIRY_SECONDS = 600;
const OTP_SENDER_EMAIL = 'dharmeshdabhi455@gmail.com';
const OTP_SENDER_NAME = 'Vijay Spring Bars';
const OTP_SUBJECT = 'Your verification code for Vijay Spring Bars';
const OTP_SMTP_HOST = 'smtp.gmail.com';
const OTP_SMTP_PORT = 465;
const OTP_SMTP_USER = 'dharmeshdabhi455@gmail.com';
const OTP_SMTP_PASSWORD = 'csmadyzthfsyeyjk';

function respond(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

function sendOtpMail(string $email, string $otp, string $name): bool
{
    $message = "Hello";
    if ($name) {
        $message .= " $name";
    }
    $message .= ",\n\n";
    $message .= "Your one-time verification code is: $otp\n";
    $message .= "This code expires in " . (OTP_EXPIRY_SECONDS / 60) . " minutes.\n\n";
    $message .= "If you did not request this code, please ignore this email.\n";
    $message .= "\nThanks,\nVijay Spring Bars\n";

    if (OTP_SMTP_USER && OTP_SMTP_PASSWORD) {
        return smtpSendMail($email, OTP_SUBJECT, $message, OTP_SENDER_EMAIL, OTP_SENDER_NAME);
    }

    $sender = OTP_SENDER_NAME . ' <' . OTP_SENDER_EMAIL . '>';
    $headers = [];
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    $headers[] = 'From: ' . $sender;
    $headers[] = 'Reply-To: ' . OTP_SENDER_EMAIL;

    return mail($email, OTP_SUBJECT, $message, implode("\r\n", $headers));
}

function smtpSendMail(string $to, string $subject, string $body, string $fromEmail, string $fromName): bool
{
    $socket = fsockopen('ssl://' . OTP_SMTP_HOST, OTP_SMTP_PORT, $errno, $errstr, 15);
    if (!$socket) {
        return false;
    }

    stream_set_timeout($socket, 15);
    if (substr(smtpRead($socket), 0, 3) !== '220') {
        fclose($socket);
        return false;
    }

    if (!smtpCommand($socket, 'EHLO ' . gethostname(), '250')) {
        fclose($socket);
        return false;
    }
    if (!smtpCommand($socket, 'AUTH LOGIN', '334')) {
        fclose($socket);
        return false;
    }
    if (!smtpCommand($socket, base64_encode(OTP_SMTP_USER), '334')) {
        fclose($socket);
        return false;
    }
    if (!smtpCommand($socket, base64_encode(OTP_SMTP_PASSWORD), '235')) {
        fclose($socket);
        return false;
    }
    if (!smtpCommand($socket, 'MAIL FROM:<' . $fromEmail . '>', '250')) {
        fclose($socket);
        return false;
    }
    if (!smtpCommand($socket, 'RCPT TO:<' . $to . '>', '250')) {
        fclose($socket);
        return false;
    }
    if (!smtpCommand($socket, 'DATA', '354')) {
        fclose($socket);
        return false;
    }

    $headers = [
        'Date: ' . date('r'),
        'From: ' . $fromName . ' <' . $fromEmail . '>',
        'Reply-To: ' . $fromEmail,
        'To: ' . $to,
        'Subject: ' . $subject,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 7bit',
    ];

    $payload = implode("\r\n", $headers) . "\r\n\r\n" . $body . "\r\n.";
    if (!smtpCommand($socket, $payload, '250')) {
        fclose($socket);
        return false;
    }

    smtpCommand($socket, 'QUIT', '221');
    fclose($socket);
    return true;
}

function smtpRead($socket): string
{
    $response = '';
    while (!feof($socket)) {
        $line = fgets($socket, 515);
        if ($line === false) {
            break;
        }
        $response .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }
    return $response;
}

function smtpCommand($socket, string $command, string $expected): bool
{
    fwrite($socket, $command . "\r\n");
    $response = smtpRead($socket);
    return substr($response, 0, 3) === $expected;
}

switch ($action) {
    case 'send':
        $otp = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $emailKey = strtolower($email);
        $_SESSION['otp_data'] = [
            'email' => $emailKey,
            'otp' => $otp,
            'expires_at' => time() + OTP_EXPIRY_SECONDS,
        ];

        if (!sendOtpMail($email, $otp, $name)) {
            respond(['success' => false, 'message' => 'Unable to send email. Check your PHP mail configuration.'], 500);
        }

        respond(['success' => true, 'message' => 'OTP sent successfully.']);
        break;

    case 'verify':
        if (!$otpCode) {
            respond(['success' => false, 'message' => 'OTP code is required.'], 400);
        }

        if (empty($_SESSION['otp_data']) || !is_array($_SESSION['otp_data'])) {
            respond(['success' => false, 'message' => 'No OTP request was found for this session.'], 400);
        }

        $stored = $_SESSION['otp_data'];
        $expectedEmail = strtolower((string)$stored['email']);
        $expectedOtp = (string)$stored['otp'];
        $expiresAt = (int)($stored['expires_at'] ?? 0);

        if ($expectedEmail !== strtolower($email)) {
            respond(['success' => false, 'message' => 'The provided email does not match the OTP request.'], 400);
        }

        if (time() > $expiresAt) {
            unset($_SESSION['otp_data']);
            respond(['success' => false, 'message' => 'The OTP has expired. Please request a new one.'], 400);
        }

        if ($otpCode !== $expectedOtp) {
            respond(['success' => false, 'message' => 'The OTP code is incorrect.'], 400);
        }

        unset($_SESSION['otp_data']);
        $_SESSION['otp_verified'] = [
            'email' => $expectedEmail,
            'verified_at' => time(),
        ];

        respond(['success' => true, 'message' => 'OTP verified successfully.']);
        break;

    default:
        respond(['success' => false, 'message' => 'Unknown action. Use "send" or "verify".'], 400);
}
