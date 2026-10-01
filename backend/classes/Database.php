<?php
declare(strict_types=1);

/**
 * Database
 * 
 * OOP Singleton Database Manager for MySQL with PDO.
 * Handles automatic schema initialization, migrations, and Unix socket fallback.
 */
class Database
{
    private static ?Database $instance = null;
    private ?PDO $pdo = null;

    private string $host;
    private string $port;
    private string $user;
    private string $pass;
    private string $dbname;
    private string $socket;

    /**
     * Private constructor for Singleton pattern.
     */
    private function __construct(
        string $host = '127.0.0.1',
        string $port = '3306',
        string $user = 'root',
        string $pass = '',
        string $dbname = 'goal_tracker_db',
        string $socket = '/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock'
    ) {
        $this->host = $host;
        $this->port = $port;
        $this->user = $user;
        $this->pass = $pass;
        $this->dbname = $dbname;
        $this->socket = $socket;

        $this->initialize();
    }

    /**
     * Prevent cloning.
     */
    private function __clone() {}

    /**
     * Prevent unserializing.
     */
    public function __wakeup()
    {
        throw new \Exception("Cannot unserialize singleton");
    }

    /**
     * Get the singleton Database instance.
     */
    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Initialize connection and ensure schema.
     */
    private function initialize(): void
    {
        $this->ensureDatabaseExists();
        $this->connectDatabase();
        $this->ensureSchema();
    }

    /**
     * Ensure the target database exists on MySQL server.
     */
    public function ensureDatabaseExists(): void
    {
        $dsnServer = "mysql:host={$this->host};port={$this->port};charset=utf8mb4";
        try {
            $serverConn = new PDO($dsnServer, $this->user, $this->pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 3
            ]);
        } catch (Exception $e) {
            if (file_exists($this->socket)) {
                $dsnSocket = "mysql:unix_socket={$this->socket};charset=utf8mb4";
                $serverConn = new PDO($dsnSocket, $this->user, $this->pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_TIMEOUT => 3
                ]);
            } else {
                throw $e;
            }
        }

        $serverConn->exec("CREATE DATABASE IF NOT EXISTS `{$this->dbname}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    }

    /**
     * Connect directly to the target database.
     */
    private function connectDatabase(): void
    {
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ];

        try {
            $this->pdo = new PDO(
                "mysql:host={$this->host};port={$this->port};dbname={$this->dbname};charset=utf8mb4",
                $this->user,
                $this->pass,
                $options
            );
        } catch (Exception $e) {
            if (file_exists($this->socket)) {
                $this->pdo = new PDO(
                    "mysql:unix_socket={$this->socket};dbname={$this->dbname};charset=utf8mb4",
                    $this->user,
                    $this->pass,
                    $options
                );
            } else {
                throw $e;
            }
        }
    }

    /**
     * Get underlying PDO instance.
     */
    public function getConnection(): PDO
    {
        if ($this->pdo === null) {
            $this->initialize();
        }
        return $this->pdo;
    }

    /**
     * Execute migrations and ensure table structures.
     */
    public function ensureSchema(): void
    {
        $schema = "
        CREATE TABLE IF NOT EXISTS trackers (
            id VARCHAR(50) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            total_days INT NOT NULL DEFAULT 100,
            start_date DATE NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS tracker_days (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tracker_id VARCHAR(50) NOT NULL,
            day_number INT NOT NULL,
            tasks JSON NULL,
            note TEXT NULL,
            metrics JSON NULL,
            done_tasks INT DEFAULT 0,
            total_tasks INT DEFAULT 0,
            is_completed TINYINT(1) DEFAULT 0,
            log_date DATE NULL,
            custom_title VARCHAR(255) NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_tracker_day (tracker_id, day_number),
            INDEX idx_tracker (tracker_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS tracker_goals (
            tracker_id VARCHAR(50) PRIMARY KEY,
            goals JSON NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS tracker_rewards (
            tracker_id VARCHAR(50) PRIMARY KEY,
            rewards JSON NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS challenges (
            id VARCHAR(64) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            days INT NOT NULL DEFAULT 7,
            start_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(20) DEFAULT 'active',
            reward VARCHAR(255) NULL,
            completion_note TEXT NULL,
            reward_redeemed TINYINT(1) DEFAULT 0,
            redeemed_at DATETIME NULL,
            end_time DATETIME NULL,
            archived_at DATETIME NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS daily_tasks (
            id VARCHAR(64) PRIMARY KEY,
            task_date DATE NOT NULL,
            title VARCHAR(255) NOT NULL,
            done TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_task_date (task_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";

        $this->pdo->exec($schema);

        // Incremental column migrations for challenges table
        $cols = [
            'reward' => 'VARCHAR(255) NULL',
            'completion_note' => 'TEXT NULL',
            'reward_redeemed' => 'TINYINT(1) DEFAULT 0',
            'redeemed_at' => 'DATETIME NULL',
            'end_time' => 'DATETIME NULL',
            'archived_at' => 'DATETIME NULL'
        ];
        foreach ($cols as $col => $type) {
            $check = $this->pdo->query("SHOW COLUMNS FROM challenges LIKE '{$col}'")->fetch();
            if (!$check) {
                $this->pdo->exec("ALTER TABLE challenges ADD COLUMN {$col} {$type}");
            }
        }

        // Incremental column migrations for tracker_days table
        $checkTitle = $this->pdo->query("SHOW COLUMNS FROM tracker_days LIKE 'custom_title'")->fetch();
        if (!$checkTitle) {
            $this->pdo->exec("ALTER TABLE tracker_days ADD COLUMN custom_title VARCHAR(255) NULL");
        }

        // Incremental column migrations for trackers table
        $trackerCols = [
            'emoji' => "VARCHAR(32) DEFAULT '🎯'",
            'subtitle' => 'VARCHAR(255) NULL',
            'theme' => "VARCHAR(50) DEFAULT 'theme-german'",
            'status' => "VARCHAR(20) DEFAULT 'active'"
        ];
        foreach ($trackerCols as $col => $type) {
            $check = $this->pdo->query("SHOW COLUMNS FROM trackers LIKE '{$col}'")->fetch();
            if (!$check) {
                $this->pdo->exec("ALTER TABLE trackers ADD COLUMN {$col} {$type}");
            }
        }

        // Populate default tracker metadata for built-in goals
        $this->pdo->exec("
            UPDATE trackers SET emoji = '🇩🇪', subtitle = 'Grammar • 1 Book Lesson • Song • Teach-back Video • Speaking AI', theme = 'theme-german' 
            WHERE id = 'german' AND (subtitle IS NULL OR subtitle = '');
            UPDATE trackers SET emoji = '📘', subtitle = 'Daily Input • 1 Lesson • 10 New Words • Speaking Practice', theme = 'theme-english' 
            WHERE id = 'english' AND (subtitle IS NULL OR subtitle = '');
            UPDATE trackers SET emoji = '🌿', subtitle = 'Movement • Balanced Eating • Mindfulness • Sleep • Daily Metrics', theme = 'theme-health' 
            WHERE id = 'health' AND (subtitle IS NULL OR subtitle = '');
        ");
    }

    /**
     * Prepare a statement.
     */
    public function prepare(string $sql): PDOStatement
    {
        return $this->getConnection()->prepare($sql);
    }

    /**
     * Execute a query with optional parameters.
     */
    public function query(string $sql, array $params = []): PDOStatement
    {
        if (empty($params)) {
            return $this->getConnection()->query($sql);
        }
        $stmt = $this->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    /**
     * Execute an INSERT/UPDATE/DELETE statement.
     */
    public function execute(string $sql, array $params = []): bool
    {
        $stmt = $this->prepare($sql);
        return $stmt->execute($params);
    }

    /**
     * Fetch all records as an array.
     */
    public function fetchAll(string $sql, array $params = []): array
    {
        return $this->query($sql, $params)->fetchAll();
    }

    /**
     * Fetch a single row as an associative array.
     */
    public function fetchOne(string $sql, array $params = []): ?array
    {
        $res = $this->query($sql, $params)->fetch();
        return $res !== false ? $res : null;
    }

    /**
     * Fetch a single column value.
     */
    public function fetchColumn(string $sql, array $params = []): mixed
    {
        return $this->query($sql, $params)->fetchColumn();
    }

    /**
     * Get the last inserted ID.
     */
    public function lastInsertId(): string
    {
        return $this->getConnection()->lastInsertId();
    }

    /**
     * Transaction helpers.
     */
    public function beginTransaction(): bool
    {
        return $this->getConnection()->beginTransaction();
    }

    public function commit(): bool
    {
        return $this->getConnection()->commit();
    }

    public function rollBack(): bool
    {
        return $this->getConnection()->rollBack();
    }
}
