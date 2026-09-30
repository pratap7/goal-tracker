<?php
declare(strict_types=1);

/**
 * api.php - REST API Entry Point for GoalTracker Pro
 * 
 * Powered by modern Object-Oriented Architecture:
 * - Database: Singleton PDO connection manager with automated migration
 * - Repositories: TrackerRepository, ChallengeRepository, DailyTaskRepository
 * - Controller: ApiController for request routing and validation
 * - Response: ApiResponse for standardized JSON output
 */

require_once __DIR__ . '/db.php';

// Instantiate and dispatch OOP Controller
$controller = new ApiController();
$controller->handleRequest();
