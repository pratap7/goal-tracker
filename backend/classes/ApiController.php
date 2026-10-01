<?php
declare(strict_types=1);

/**
 * ApiController
 * 
 * Object-oriented Controller orchestrating REST API requests for GoalTracker SaaS.
 * Provides multi-tenant security, session handling, and simple Email + 4-digit PIN auth.
 */
class ApiController
{
    private Database $db;
    private TrackerRepository $trackerRepo;
    private ChallengeRepository $challengeRepo;
    private DailyTaskRepository $dailyTaskRepo;
    private UserRepository $userRepo;

    public function __construct(
        ?Database $db = null,
        ?TrackerRepository $trackerRepo = null,
        ?ChallengeRepository $challengeRepo = null,
        ?DailyTaskRepository $dailyTaskRepo = null,
        ?UserRepository $userRepo = null
    ) {
        $this->db = $db ?? Database::getInstance();
        $this->trackerRepo = $trackerRepo ?? new TrackerRepository($this->db);
        $this->challengeRepo = $challengeRepo ?? new ChallengeRepository($this->db);
        $this->dailyTaskRepo = $dailyTaskRepo ?? new DailyTaskRepository($this->db);
        $this->userRepo = $userRepo ?? new UserRepository($this->db);
    }

    /**
     * Handle incoming HTTP request.
     */
    public function handleRequest(): void
    {
        $this->handleCors();

        $action = $_GET['action'] ?? ($_POST['action'] ?? 'status');

        try {
            switch ($action) {
                case 'status':
                case 'health':
                    $this->actionStatus();
                    break;

                // SaaS Authentication Endpoints
                case 'signup':
                case 'register':
                    $this->actionSignup();
                    break;

                case 'login':
                case 'signin':
                    $this->actionLogin();
                    break;

                case 'logout':
                case 'signout':
                    $this->actionLogout();
                    break;

                case 'me':
                case 'current_user':
                    $this->actionGetCurrentUser();
                    break;

                // Multi-Tenant Domain Endpoints
                case 'get_all':
                    $this->actionGetAll();
                    break;

                case 'save_day':
                    $this->actionSaveDay();
                    break;

                case 'save_day_title':
                    $this->actionSaveDayTitle();
                    break;

                case 'save_day_tasks':
                    $this->actionSaveDayTasks();
                    break;

                case 'batch_save_days':
                    $this->actionBatchSaveDays();
                    break;

                case 'save_goals':
                    $this->actionSaveGoals();
                    break;

                case 'save_rewards':
                    $this->actionSaveRewards();
                    break;

                case 'save_tracker_meta':
                    $this->actionSaveTrackerMeta();
                    break;

                case 'init_template':
                    $this->actionInitTemplate();
                    break;

                case 'save_challenge':
                    $this->actionSaveChallenge();
                    break;

                case 'redeem_challenge':
                    $this->actionRedeemChallenge();
                    break;

                case 'archive_challenge':
                    $this->actionArchiveChallenge();
                    break;

                case 'unarchive_challenge':
                    $this->actionUnarchiveChallenge();
                    break;

                case 'delete_challenge':
                    $this->actionDeleteChallenge();
                    break;

                case 'save_daily_task':
                    $this->actionSaveDailyTask();
                    break;

                case 'toggle_daily_task':
                    $this->actionToggleDailyTask();
                    break;

                case 'delete_daily_task':
                    $this->actionDeleteDailyTask();
                    break;

                case 'delete_tracker':
                    $this->actionDeleteTracker();
                    break;

                case 'reset_tracker':
                    $this->actionResetTracker();
                    break;

                case 'export':
                    $this->actionExport();
                    break;

                default:
                    ApiResponse::error("Unknown action: {$action}", 404);
            }
        } catch (\Throwable $e) {
            ApiResponse::error($e->getMessage(), 500);
        }
    }

    /**
     * Send CORS headers.
     */
    private function handleCors(): void
    {
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
            if (!headers_sent()) {
                http_response_code(200);
            }
            exit;
        }
    }

    /**
     * Parse incoming JSON request body.
     */
    private function getJsonInput(): array
    {
        $raw = file_get_contents('php://input');
        if (empty($raw)) return [];
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    /**
     * Extract bearer token from Authorization header or parameters.
     */
    private function getAuthToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
        if (empty($header) && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $header = $headers['Authorization'] ?? ($headers['authorization'] ?? '');
        }

        if (!empty($header) && preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
            return trim($matches[1]);
        }

        if (!empty($_GET['token'])) {
            return trim((string)$_GET['token']);
        }
        if (!empty($_POST['token'])) {
            return trim((string)$_POST['token']);
        }

        $input = $this->getJsonInput();
        if (!empty($input['token'])) {
            return trim((string)$input['token']);
        }

        return null;
    }

    /**
     * Retrieve currently authenticated user or null.
     */
    public function getAuthenticatedUser(): ?array
    {
        $token = $this->getAuthToken();
        if (!$token) {
            return null;
        }
        return $this->userRepo->authenticate($token);
    }

    /**
     * Enforce authentication or abort with 401 response.
     */
    private function requireUser(): array
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) {
            ApiResponse::error('Authentication required. Please log in with your email and 4-digit PIN.', 401);
            exit;
        }
        return $user;
    }

    /**
     * System status / health check.
     */
    private function actionStatus(): void
    {
        $tables = ['users', 'trackers', 'tracker_days', 'tracker_goals', 'tracker_rewards', 'challenges', 'daily_tasks'];
        $counts = [];
        foreach ($tables as $t) {
            $counts[$t] = (int)$this->db->fetchColumn("SELECT COUNT(*) FROM `{$t}`");
        }

        ApiResponse::send([
            'success' => true,
            'status' => 'online',
            'database' => 'goal_tracker_db',
            'architecture' => 'OOP-PSR SaaS Multi-Tenant',
            'server_time' => date('Y-m-d H:i:s'),
            'counts' => $counts
        ]);
    }

    /**
     * User registration with Email and 4-digit PIN.
     */
    private function actionSignup(): void
    {
        $input = $this->getJsonInput();
        $email = trim((string)($input['email'] ?? ($_POST['email'] ?? '')));
        $pin = trim((string)($input['pin'] ?? ($_POST['pin'] ?? '')));

        if (empty($email) || empty($pin)) {
            ApiResponse::error('Email and 4-digit PIN are required to sign up.', 400);
            return;
        }

        $res = $this->userRepo->register($email, $pin);
        if (!$res['success']) {
            ApiResponse::error($res['error'], 400);
            return;
        }

        ApiResponse::send($res);
    }

    /**
     * User login with Email and 4-digit PIN.
     */
    private function actionLogin(): void
    {
        $input = $this->getJsonInput();
        $email = trim((string)($input['email'] ?? ($_POST['email'] ?? '')));
        $pin = trim((string)($input['pin'] ?? ($_POST['pin'] ?? '')));

        if (empty($email) || empty($pin)) {
            ApiResponse::error('Email and 4-digit PIN are required to log in.', 400);
            return;
        }

        $res = $this->userRepo->login($email, $pin);
        if (!$res['success']) {
            ApiResponse::error($res['error'], 401);
            return;
        }

        ApiResponse::send($res);
    }

    /**
     * Logout session.
     */
    private function actionLogout(): void
    {
        $token = $this->getAuthToken();
        if ($token) {
            $this->userRepo->logout($token);
        }
        ApiResponse::send(['success' => true, 'message' => 'Logged out successfully']);
    }

    /**
     * Get current logged-in user profile.
     */
    private function actionGetCurrentUser(): void
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) {
            ApiResponse::send(['success' => false, 'user' => null]);
            return;
        }
        ApiResponse::send(['success' => true, 'user' => $user]);
    }

    /**
     * Get all app state scoped strictly to authenticated user.
     */
    private function actionGetAll(): void
    {
        $user = $this->requireUser();
        $userId = $user['id'];

        $data = [
            'trackers' => $this->trackerRepo->getTrackersMeta($userId),
            'days' => $this->trackerRepo->getAllDays($userId),
            'goals' => $this->trackerRepo->getGoals($userId),
            'rewards' => $this->trackerRepo->getRewards($userId),
            'challenges' => $this->challengeRepo->getAll($userId),
            'dailyTasks' => $this->dailyTaskRepo->getAll($userId)
        ];

        ApiResponse::send([
            'success' => true,
            'user' => $user,
            'data' => $data
        ]);
    }

    /**
     * Initialize a starter template goal for the user.
     */
    private function actionInitTemplate(): void
    {
        $user = $this->requireUser();
        $input = $this->getJsonInput();
        $templateKey = trim((string)($input['template'] ?? ''));

        $templates = [
            'german' => [
                'id' => 'german',
                'title' => 'A1 German Mastery',
                'totalDays' => 50,
                'emoji' => '🇩🇪',
                'subtitle' => 'Grammar • 1 Book Lesson • Song • Teach-back Video • Speaking AI',
                'theme' => 'theme-german'
            ],
            'english' => [
                'id' => 'english',
                'title' => 'English Fluency Pro',
                'totalDays' => 100,
                'emoji' => '📘',
                'subtitle' => 'Daily Input • 1 Lesson • 10 New Words • Speaking Practice',
                'theme' => 'theme-english'
            ],
            'health' => [
                'id' => 'health',
                'title' => 'Health & Vitality 100',
                'totalDays' => 100,
                'emoji' => '🌿',
                'subtitle' => 'Movement • Balanced Eating • Mindfulness • Sleep • Daily Metrics',
                'theme' => 'theme-health'
            ]
        ];

        if (!isset($templates[$templateKey])) {
            ApiResponse::error('Invalid template key.', 400);
            return;
        }

        $tpl = $templates[$templateKey];
        $startDate = date('Y-m-d');

        $this->trackerRepo->saveTrackerMeta(
            $user['id'],
            $tpl['id'],
            $tpl['title'],
            $tpl['totalDays'],
            $startDate,
            $tpl['emoji'],
            $tpl['subtitle'],
            $tpl['theme']
        );

        ApiResponse::send([
            'success' => true,
            'message' => "{$tpl['title']} added to your dashboard!",
            'trackerId' => $tpl['id']
        ]);
    }

    /**
     * Save a single day's tasks, notes, metrics, title.
     */
    private function actionSaveDay(): void
    {
        $user = $this->requireUser();
        $input = $this->getJsonInput();
        $trackerId = trim($input['trackerId'] ?? '');
        $day = (int)($input['day'] ?? 0);

        if (!$trackerId || $day < 1) {
            ApiResponse::error('Missing trackerId or day', 400);
        }

        $tasks = isset($input['tasks']) && is_array($input['tasks']) ? $input['tasks'] : [];
        $note = (string)($input['note'] ?? '');
        $metrics = isset($input['metrics']) && is_array($input['metrics']) ? $input['metrics'] : null;
        $doneTasks = (int)($input['doneTasks'] ?? 0);
        $totalTasks = (int)($input['totalTasks'] ?? 0);
        $isCompleted = !empty($input['isCompleted']);
        $logDate = !empty($input['logDate']) ? (string)$input['logDate'] : date('Y-m-d');
        $customTitle = isset($input['customTitle']) ? trim((string)$input['customTitle']) : null;

        $this->trackerRepo->saveDay(
            $user['id'],
            $trackerId,
            $day,
            $tasks,
            $note,
            $metrics,
            $doneTasks,
            $totalTasks,
            $isCompleted,
            $logDate,
            $customTitle
        );

        ApiResponse::send([
            'success' => true,
            'message' => "Saved day {$day} for tracker {$trackerId}",
            'savedAt' => date('Y-m-d H:i:s')
        ]);
    }

    /**
     * Save custom title for a specific day.
     */
    private function actionSaveDayTitle(): void
    {
        $user = $this->requireUser();
        $input = $this->getJsonInput();
        $trackerId = trim($input['trackerId'] ?? '');
        $day = (int)($input['day'] ?? 0);
        $title = trim($input['title'] ?? '');

        if (!$trackerId || $day < 1) {
            ApiResponse::error('Missing trackerId or day', 400);
        }

        $this->trackerRepo->saveDayTitle($user['id'], $trackerId, $day, $title);
        ApiResponse::send(['success' => true]);
    }

    /**
     * Save tasks for a specific day.
     */
    private function actionSaveDayTasks(): void
    {
        $user = $this->requireUser();
        $input = $this->getJsonInput();
        $trackerId = trim($input['trackerId'] ?? '');
        $day = (int)($input['day'] ?? 0);
        $tasks = $input['tasks'] ?? [];

        if (!$trackerId || $day < 1 || !is_array($tasks)) {
            ApiResponse::error('Missing parameters', 400);
        }

        $this->trackerRepo->saveDayTasks($user['id'], $trackerId, $day, $tasks);
        ApiResponse::send(['success' => true]);
    }

    /**
     * Batch save multiple days.
     */
    private function actionBatchSaveDays(): void
    {
        $user = $this->requireUser();
        $input = $this->getJsonInput();
        $trackerId = trim($input['trackerId'] ?? '');
        $daysData = $input['days'] ?? [];

        if (!$trackerId || !is_array($daysData)) {
            ApiResponse::error('Invalid batch data', 400);
        }

        $count = $this->trackerRepo->batchSaveDays($user['id'], $trackerId, $daysData);
        ApiResponse::send([
            'success' => true,
            'message' => "Batch saved {$count} days for {$trackerId}"
        ]);
    }

    /**
     * Save goals.
     */
    private function actionSaveGoals(): void
    {
        $user = $this->requireUser();
        $input = $this->getJsonInput();
        $trackerId = trim($input['trackerId'] ?? '');
        $goals = $input['goals'] ?? [];

        if (!$trackerId) {
            ApiResponse::error('Missing trackerId', 400);
        }

        $this->trackerRepo->saveGoals($user['id'], $trackerId, $goals);
        ApiResponse::send(['success' => true, 'message' => "Goals updated for {$trackerId}"]);
    }

    /**
     * Save rewards.
     */
    private function actionSaveRewards(): void
    {
        $user = $this->requireUser();
        $input = $this->getJsonInput();
        $trackerId = trim($input['trackerId'] ?? '');
        $rewards = $input['rewards'] ?? [];

        if (!$trackerId) {
            ApiResponse::error('Missing trackerId', 400);
        }

        $this->trackerRepo->saveRewards($user['id'], $trackerId, $rewards);
        ApiResponse::send(['success' => true, 'message' => "Rewards updated for {$trackerId}"]);
    }

    /**
     * Save tracker meta (Add or Edit Goal).
     */
    private function actionSaveTrackerMeta(): void
    {
        $user = $this->requireUser();
        $input = $this->getJsonInput();
        $trackerId = trim($input['trackerId'] ?? '');
        $title = trim($input['title'] ?? '');
        $totalDays = max(1, (int)($input['totalDays'] ?? 100));
        $startDate = !empty($input['startDate']) ? (string)$input['startDate'] : date('Y-m-d');
        $emoji = trim((string)($input['emoji'] ?? '🎯'));
        $subtitle = trim((string)($input['subtitle'] ?? ''));
        $theme = trim((string)($input['theme'] ?? 'theme-german'));

        if (!$trackerId) {
            // Auto generate ID if not supplied
            $trackerId = 'goal_' . time();
        }

        if (!$title) {
            ApiResponse::error('Missing goal title', 400);
        }

        $this->trackerRepo->saveTrackerMeta(
            $user['id'],
            $trackerId,
            $title,
            $totalDays,
            $startDate,
            $emoji,
            $subtitle,
            $theme
        );

        ApiResponse::send([
            'success' => true,
            'message' => "Goal '{$title}' saved successfully",
            'trackerId' => $trackerId
        ]);
    }

    /**
     * Delete tracker permanently.
     */
    private function actionDeleteTracker(): void
    {
        $user = $this->requireUser();
        $input = $this->getJsonInput();
        $trackerId = trim($input['trackerId'] ?? '');

        if (!$trackerId) {
            ApiResponse::error('Missing trackerId', 400);
        }

        $this->trackerRepo->deleteTracker($user['id'], $trackerId);
        ApiResponse::send([
            'success' => true,
            'message' => "Goal '{$trackerId}' deleted successfully"
        ]);
    }

    /**
     * Save or update sprint challenge.
     */
    private function actionSaveChallenge(): void
    {
        $user = $this->requireUser();
        $userId = $user['id'];

        $input = $this->getJsonInput();
        $id = (string)($input['id'] ?? ('ch_' . time()));
        $title = trim($input['title'] ?? '');
        $days = (int)($input['days'] ?? 7);
        $startDate = !empty($input['startDate']) ? (string)$input['startDate'] : date('Y-m-d');
        $status = (string)($input['status'] ?? 'active');
        $reward = trim((string)($input['reward'] ?? ''));
        $note = (string)($input['completionNote'] ?? '');
        $rewardRedeemed = !empty($input['rewardRedeemed']);

        if (!$title) {
            ApiResponse::error('Missing challenge title', 400);
        }

        // Limit to max 5 active challenges per user
        if (!$this->challengeRepo->exists($userId, $id) && $status === 'active') {
            if ($this->challengeRepo->getActiveCount($userId) >= 5) {
                ApiResponse::error('Maximum 5 active challenges allowed. Please complete or archive an existing challenge.', 400);
            }
        }

        $this->challengeRepo->save($userId, $id, $title, $days, $startDate, $status, $reward, $note, $rewardRedeemed);
        ApiResponse::send(['success' => true, 'id' => $id, 'message' => "Challenge saved"]);
    }

    /**
     * Redeem challenge reward.
     */
    private function actionRedeemChallenge(): void
    {
        $user = $this->requireUser();
        $input = $this->getJsonInput();
        $id = (string)($input['id'] ?? '');
        $note = trim((string)($input['completionNote'] ?? ''));

        if (!$id) {
            ApiResponse::error('Missing challenge id', 400);
        }

        $this->challengeRepo->redeem($user['id'], $id, $note);
        ApiResponse::send(['success' => true, 'message' => "Reward redeemed and note saved!"]);
    }

    /**
     * Move challenge to archive.
     */
    private function actionArchiveChallenge(): void
    {
        $user = $this->requireUser();
        $input = $this->getJsonInput();
        $id = (string)($input['id'] ?? ($_GET['id'] ?? ''));

        if (!$id) {
            ApiResponse::error('Missing challenge id', 400);
        }

        $this->challengeRepo->archive($user['id'], $id);
        ApiResponse::send(['success' => true, 'message' => "Challenge moved to archive"]);
    }

    /**
     * Unarchive challenge.
     */
    private function actionUnarchiveChallenge(): void
    {
        $user = $this->requireUser();
        $input = $this->getJsonInput();
        $id = (string)($input['id'] ?? '');

        if (!$id) {
            ApiResponse::error('Missing challenge id', 400);
        }

        if ($this->challengeRepo->getActiveCount($user['id']) >= 5) {
            ApiResponse::error('Cannot unarchive: already 5 active challenges.', 400);
        }

        $this->challengeRepo->unarchive($user['id'], $id);
        ApiResponse::send(['success' => true, 'message' => "Challenge restored from archive"]);
    }

    /**
     * Delete a challenge.
     */
    private function actionDeleteChallenge(): void
    {
        $user = $this->requireUser();
        $input = $this->getJsonInput();
        $id = (string)($input['id'] ?? ($_GET['id'] ?? ''));

        if (!$id) {
            ApiResponse::error('Missing challenge id', 400);
        }

        $this->challengeRepo->delete($user['id'], $id);
        ApiResponse::send(['success' => true, 'message' => "Challenge {$id} deleted"]);
    }

    /**
     * Save daily custom task.
     */
    private function actionSaveDailyTask(): void
    {
        $user = $this->requireUser();
        $input = $this->getJsonInput();
        $id = (string)($input['id'] ?? ('dt_' . round(microtime(true) * 1000)));
        $taskDate = (string)($input['taskDate'] ?? date('Y-m-d'));
        $title = trim((string)($input['title'] ?? ''));

        if (!$title) {
            ApiResponse::error('Title is required', 400);
        }

        $done = isset($input['done']) ? !empty($input['done']) : null;
        $this->dailyTaskRepo->save($user['id'], $id, $taskDate, $title, $done);

        ApiResponse::send(['success' => true, 'id' => $id]);
    }

    /**
     * Toggle daily custom task completion.
     */
    private function actionToggleDailyTask(): void
    {
        $user = $this->requireUser();
        $input = $this->getJsonInput();
        $id = (string)($input['id'] ?? '');
        $done = !empty($input['done']);

        if (!$id) {
            ApiResponse::error('Missing task id', 400);
        }

        $this->dailyTaskRepo->toggle($user['id'], $id, $done);
        ApiResponse::send(['success' => true]);
    }

    /**
     * Delete daily custom task.
     */
    private function actionDeleteDailyTask(): void
    {
        $user = $this->requireUser();
        $input = $this->getJsonInput();
        $id = (string)($input['id'] ?? '');

        if (!$id) {
            ApiResponse::error('Missing task id', 400);
        }

        $this->dailyTaskRepo->delete($user['id'], $id);
        ApiResponse::send(['success' => true]);
    }

    /**
     * Reset tracker.
     */
    private function actionResetTracker(): void
    {
        $user = $this->requireUser();
        $input = $this->getJsonInput();
        $trackerId = trim((string)($input['trackerId'] ?? ''));

        if (!$trackerId) {
            ApiResponse::error('Missing trackerId', 400);
        }

        $this->trackerRepo->resetTracker($user['id'], $trackerId);
        ApiResponse::send(['success' => true, 'message' => "Reset tracker {$trackerId} in MySQL"]);
    }

    /**
     * Export all data for authenticated user.
     */
    private function actionExport(): void
    {
        $user = $this->requireUser();
        $uid = $user['id'];

        $trackers = $this->db->fetchAll("SELECT * FROM trackers WHERE user_id = :uid", [':uid' => $uid]);
        $days = $this->db->fetchAll("SELECT * FROM tracker_days WHERE user_id = :uid", [':uid' => $uid]);
        $goals = $this->db->fetchAll("SELECT * FROM tracker_goals WHERE user_id = :uid", [':uid' => $uid]);
        $rewards = $this->db->fetchAll("SELECT * FROM tracker_rewards WHERE user_id = :uid", [':uid' => $uid]);
        $challenges = $this->db->fetchAll("SELECT * FROM challenges WHERE user_id = :uid", [':uid' => $uid]);
        $dailyTasks = $this->db->fetchAll("SELECT * FROM daily_tasks WHERE user_id = :uid", [':uid' => $uid]);

        ApiResponse::send([
            'success' => true,
            'user' => $user,
            'exported_at' => date('c'),
            'data' => [
                'trackers' => $trackers,
                'days' => $days,
                'goals' => $goals,
                'rewards' => $rewards,
                'challenges' => $challenges,
                'dailyTasks' => $dailyTasks
            ]
        ]);
    }
}
