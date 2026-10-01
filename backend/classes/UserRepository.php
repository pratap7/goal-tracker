<?php
declare(strict_types=1);

/**
 * UserRepository
 * 
 * Object-oriented Data Access Layer for SaaS User Authentication.
 * Supports frictionless signup and signin using Email + 4-digit PIN.
 */
class UserRepository
{
    private Database $db;

    public function __construct(?Database $db = null)
    {
        $this->db = $db ?? Database::getInstance();
    }

    /**
     * Register a new user with email and a 4-digit PIN.
     */
    public function register(string $email, string $pin): array
    {
        $cleanEmail = strtolower(trim($email));

        if (!filter_var($cleanEmail, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'error' => 'Please enter a valid email address.'];
        }

        $cleanPin = trim($pin);
        if (!preg_match('/^\d{4}$/', $cleanPin)) {
            return ['success' => false, 'error' => 'Password must be exactly a 4-digit PIN (e.g. 1234).'];
        }

        // Check if user already exists
        $existing = $this->db->fetchOne("SELECT id FROM users WHERE email = :email", [':email' => $cleanEmail]);
        if ($existing) {
            return [
                'success' => false, 
                'error' => 'An account with this email already exists. Please log in with your 4-digit PIN.'
            ];
        }

        // Hash the 4-digit PIN securely
        $pinHash = password_hash($cleanPin, PASSWORD_BCRYPT);
        $authToken = bin2hex(random_bytes(32));

        $sql = "INSERT INTO users (email, pin_hash, auth_token, created_at, updated_at) 
                VALUES (:email, :pin_hash, :token, NOW(), NOW())";
        
        $inserted = $this->db->execute($sql, [
            ':email' => $cleanEmail,
            ':pin_hash' => $pinHash,
            ':token' => $authToken
        ]);

        if (!$inserted) {
            return ['success' => false, 'error' => 'Failed to create user account. Please try again.'];
        }

        $userId = (int)$this->db->getConnection()->lastInsertId();

        return [
            'success' => true,
            'user' => [
                'id' => $userId,
                'email' => $cleanEmail
            ],
            'token' => $authToken
        ];
    }

    /**
     * Authenticate an existing user with email and 4-digit PIN.
     */
    public function login(string $email, string $pin): array
    {
        $cleanEmail = strtolower(trim($email));
        $cleanPin = trim($pin);

        if (!filter_var($cleanEmail, FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'error' => 'Please enter a valid email address.'];
        }

        if (!preg_match('/^\d{4}$/', $cleanPin)) {
            return ['success' => false, 'error' => 'Password must be exactly a 4-digit PIN (e.g. 1234).'];
        }

        $user = $this->db->fetchOne("SELECT id, email, pin_hash FROM users WHERE email = :email", [':email' => $cleanEmail]);
        if (!$user) {
            return ['success' => false, 'error' => 'No account found with this email. Please sign up first.'];
        }

        if (!password_verify($cleanPin, $user['pin_hash'])) {
            return ['success' => false, 'error' => 'Incorrect 4-digit PIN. Please try again.'];
        }

        // Issue fresh auth token
        $authToken = bin2hex(random_bytes(32));
        $this->db->execute("UPDATE users SET auth_token = :token, updated_at = NOW() WHERE id = :id", [
            ':token' => $authToken,
            ':id' => $user['id']
        ]);

        return [
            'success' => true,
            'user' => [
                'id' => (int)$user['id'],
                'email' => $user['email']
            ],
            'token' => $authToken
        ];
    }

    /**
     * Retrieve user record by active auth token.
     */
    public function authenticate(string $token): ?array
    {
        if (empty($token) || strlen($token) < 16) {
            return null;
        }

        $user = $this->db->fetchOne(
            "SELECT id, email, created_at FROM users WHERE auth_token = :token LIMIT 1",
            [':token' => $token]
        );

        if (!$user) {
            return null;
        }

        return [
            'id' => (int)$user['id'],
            'email' => $user['email'],
            'createdAt' => $user['created_at']
        ];
    }

    /**
     * Terminate active session.
     */
    public function logout(string $token): bool
    {
        if (empty($token)) {
            return true;
        }

        return $this->db->execute("UPDATE users SET auth_token = NULL WHERE auth_token = :token", [
            ':token' => $token
        ]);
    }
}
