<?php
declare(strict_types=1);

/**
 * db.php - OOP Database Bootstrap & Autoloader for GoalTracker Pro
 * 
 * Provides object-oriented connection management via Database singleton,
 * class auto-loading, and backwards-compatible procedural wrappers.
 */

// Register Class Autoloader for classes/ directory
spl_autoload_register(function (string $className): void {
    $file = __DIR__ . '/classes/' . str_replace('\\', '/', $className) . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

// Require core Database class
require_once __DIR__ . '/classes/Database.php';

/**
 * Backwards-compatibility wrapper for legacy calls.
 * Returns the underlying PDO connection from the OOP Database singleton.
 */
function getDbConnection(): PDO
{
    return Database::getInstance()->getConnection();
}

/**
 * Backwards-compatibility wrapper for schema migration.
 */
function ensureSchema(PDO $pdo): void
{
    Database::getInstance()->ensureSchema();
}
