<?php
// db.php - MySQL Database Connection & Auto-Setup for GoalTracker

function getDbConnection() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $host = '127.0.0.1';
    $port = '3306';
    $user = 'root';
    $pass = '';
    $dbname = 'goal_tracker_db';
    $socket = '/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock';

    // 1. Connect to MySQL server (without DB first, in case DB needs creation)
    $dsnServer = "mysql:host={$host};port={$port};charset=utf8mb4";
    try {
        $serverConn = new PDO($dsnServer, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 3
        ]);
    } catch (Exception $e) {
        // Fallback to socket if TCP failed
        if (file_exists($socket)) {
            $dsnSocket = "mysql:unix_socket={$socket};charset=utf8mb4";
            $serverConn = new PDO($dsnSocket, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 3
            ]);
        } else {
            throw $e;
        }
    }

    // Ensure database exists
    $serverConn->exec("CREATE DATABASE IF NOT EXISTS `{$dbname}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    // 2. Connect to the specific database
    try {
        $pdo = new PDO("mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4", $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
    } catch (Exception $e) {
        if (file_exists($socket)) {
            $pdo = new PDO("mysql:unix_socket={$socket};dbname={$dbname};charset=utf8mb4", $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
        } else {
            throw $e;
        }
    }

    // Ensure tables exist
    ensureSchema($pdo);

    return $pdo;
}

function ensureSchema(PDO $pdo) {
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
    ";

    $pdo->exec($schema);

    $cols = [
        'reward' => 'VARCHAR(255) NULL',
        'completion_note' => 'TEXT NULL',
        'reward_redeemed' => 'TINYINT(1) DEFAULT 0',
        'redeemed_at' => 'DATETIME NULL',
        'end_time' => 'DATETIME NULL',
        'archived_at' => 'DATETIME NULL'
    ];
    foreach ($cols as $col => $type) {
        $check = $pdo->query("SHOW COLUMNS FROM challenges LIKE '{$col}'")->fetch();
        if (!$check) {
            $pdo->exec("ALTER TABLE challenges ADD COLUMN {$col} {$type}");
        }
    }
}
