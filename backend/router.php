<?php
// router.php - PHP Built-in Server Router for GoalTracker Pro

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Serve static assets directly if they exist
if ($uri !== '/' && file_exists(__DIR__ . $uri)) {
    return false;
}

// Route root or index to dashboard.php
if ($uri === '/' || $uri === '/index.php') {
    require_once __DIR__ . '/dashboard.php';
    return true;
}

// Fallback to file if matching PHP file exists
$phpFile = __DIR__ . $uri . '.php';
if (file_exists($phpFile)) {
    require_once $phpFile;
    return true;
}

// Default fallback
require_once __DIR__ . '/dashboard.php';
return true;
