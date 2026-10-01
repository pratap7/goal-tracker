<?php
declare(strict_types=1);

/**
 * ApiController
 * 
 * Object-oriented Controller orchestrating REST API requests for GoalTracker.
 */
class ApiController
{
    private Database $db;
    private TrackerRepository $trackerRepo;
    private ChallengeRepository $challengeRepo;
    private DailyTaskRepository $dailyTaskRepo;

    public function __construct(
        ?Database $db = null,
        ?TrackerRepository $trackerRepo = null,
        ?ChallengeRepository $challengeRepo = null,
        ?DailyTaskRepository $dailyTaskRepo = null
    ) {
        $this->db = $db ?? Database::getInstance();
        $this->trackerRepo = $trackerRepo ?? new TrackerRepository($this->db);
        $this->challengeRepo = $challengeRepo ?? new ChallengeRepository($this->db);
        $this->dailyTaskRepo = $dailyTaskRepo ?? new DailyTaskRepository($this->db);
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
     * System status / health check.
     */
    private function actionStatus(): void
    {
        $tables = ['trackers', 'tracker_days', 'tracker_goals', 'tracker_rewards', 'challenges', 'daily_tasks'];
        $counts = [];
        foreach ($tables as $t) {
            $counts[$t] = (int)$this->db->fetchColumn("SELECT COUNT(*) FROM `{$t}`");
        }

        ApiResponse::send([
            'success' => true,
            'status' => 'online',
            'database' => 'goal_tracker_db',
            'architecture' => 'OOP-PSR',
            'server_time' => date('Y-m-d H:i:s'),
            'counts' => $counts
        ]);
    }

    /**
     * Get all app state in one optimized request.
     */
    private function actionGetAll(): void
    {
        $data = [
            'trackers' => $this->trackerRepo->getTrackersMeta(),
            'days' => $this->trackerRepo->getAllDays(),
            'goals' => $this->trackerRepo->getGoals(),
            'rewards' => $this->trackerRepo->getRewards(),
            'challenges' => $this->challengeRepo->getAll(),
            'dailyTasks' => $this->dailyTaskRepo->getAll()
        ];

        ApiResponse::send([
            'success' => true,
            'data' => $data
        ]);
    }

    /**
     * Save a single day's tasks, notes, metrics, title.
     */
    private function actionSaveDay(): void
    {
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
        $input = $this->getJsonInput();
        $trackerId = trim($input['trackerId'] ?? '');
        $day = (int)($input['day'] ?? 0);
        $title = trim($input['title'] ?? '');

        if (!$trackerId || $day < 1) {
            ApiResponse::error('Missing trackerId or day', 400);
        }

        $this->trackerRepo->saveDayTitle($trackerId, $day, $title);
        ApiResponse::send(['success' => true]);
    }

    /**
     * Save tasks for a specific day.
     */
    private function actionSaveDayTasks(): void
    {
        $input = $this->getJsonInput();
        $trackerId = trim($input['trackerId'] ?? '');
        $day = (int)($input['day'] ?? 0);
        $tasks = $input['tasks'] ?? [];

        if (!$trackerId || $day < 1 || !is_array($tasks)) {
            ApiResponse::error('Missing parameters', 400);
        }

        $this->trackerRepo->saveDayTasks($trackerId, $day, $tasks);
        ApiResponse::send(['success' => true]);
    }

    /**
     * Batch save multiple days.
     */
    private function actionBatchSaveDays(): void
    {
        $input = $this->getJsonInput();
        $trackerId = trim($input['trackerId'] ?? '');
        $daysData = $input['days'] ?? [];

        if (!$trackerId || !is_array($daysData)) {
            ApiResponse::error('Invalid batch data', 400);
        }

        $count = $this->trackerRepo->batchSaveDays($trackerId, $daysData);
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
        $input = $this->getJsonInput();
        $trackerId = trim($input['trackerId'] ?? '');
        $goals = $input['goals'] ?? [];

        if (!$trackerId) {
            ApiResponse::error('Missing trackerId', 400);
        }

        $this->trackerRepo->saveGoals($trackerId, $goals);
        ApiResponse::send(['success' => true, 'message' => "Goals updated for {$trackerId}"]);
    }

    /**
     * Save rewards.
     */
    private function actionSaveRewards(): void
    {
        $input = $this->getJsonInput();
        $trackerId = trim($input['trackerId'] ?? '');
        $rewards = $input['rewards'] ?? [];

        if (!$trackerId) {
            ApiResponse::error('Missing trackerId', 400);
        }

        $this->trackerRepo->saveRewards($trackerId, $rewards);
        ApiResponse::send(['success' => true, 'message' => "Rewards updated for {$trackerId}"]);
    }

    /**
     * Save tracker meta (Add or Edit Goal).
     */
    private function actionSaveTrackerMeta(): void
    {
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

        $this->trackerRepo->saveTrackerMeta($trackerId, $title, $totalDays, $startDate, $emoji, $subtitle, $theme);
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
        $input = $this->getJsonInput();
        $trackerId = trim($input['trackerId'] ?? '');

        if (!$trackerId) {
            ApiResponse::error('Missing trackerId', 400);
        }

        $this->trackerRepo->deleteTracker($trackerId);
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

        // Limit to max 5 active challenges
        if (!$this->challengeRepo->exists($id) && $status === 'active') {
            if ($this->challengeRepo->getActiveCount() >= 5) {
                ApiResponse::error('Maximum 5 active challenges allowed. Please complete or archive an existing challenge.', 400);
            }
        }

        $this->challengeRepo->save($id, $title, $days, $startDate, $status, $reward, $note, $rewardRedeemed);
        ApiResponse::send(['success' => true, 'id' => $id, 'message' => "Challenge saved"]);
    }

    /**
     * Redeem challenge reward.
     */
    private function actionRedeemChallenge(): void
    {
        $input = $this->getJsonInput();
        $id = (string)($input['id'] ?? '');
        $note = trim((string)($input['completionNote'] ?? ''));

        if (!$id) {
            ApiResponse::error('Missing challenge id', 400);
        }

        $this->challengeRepo->redeem($id, $note);
        ApiResponse::send(['success' => true, 'message' => "Reward redeemed and note saved!"]);
    }

    /**
     * Move challenge to archive.
     */
    private function actionArchiveChallenge(): void
    {
        $input = $this->getJsonInput();
        $id = (string)($input['id'] ?? ($_GET['id'] ?? ''));

        if (!$id) {
            ApiResponse::error('Missing challenge id', 400);
        }

        $this->challengeRepo->archive($id);
        ApiResponse::send(['success' => true, 'message' => "Challenge moved to archive"]);
    }

    /**
     * Unarchive challenge.
     */
    private function actionUnarchiveChallenge(): void
    {
        $input = $this->getJsonInput();
        $id = (string)($input['id'] ?? '');

        if (!$id) {
            ApiResponse::error('Missing challenge id', 400);
        }

        if ($this->challengeRepo->getActiveCount() >= 5) {
            ApiResponse::error('Cannot unarchive: already 5 active challenges.', 400);
        }

        $this->challengeRepo->unarchive($id);
        ApiResponse::send(['success' => true, 'message' => "Challenge restored from archive"]);
    }

    /**
     * Delete a challenge.
     */
    private function actionDeleteChallenge(): void
    {
        $input = $this->getJsonInput();
        $id = (string)($input['id'] ?? ($_GET['id'] ?? ''));

        if (!$id) {
            ApiResponse::error('Missing challenge id', 400);
        }

        $this->challengeRepo->delete($id);
        ApiResponse::send(['success' => true, 'message' => "Challenge {$id} deleted"]);
    }

    /**
     * Save daily custom task.
     */
    private function actionSaveDailyTask(): void
    {
        $input = $this->getJsonInput();
        $id = (string)($input['id'] ?? ('dt_' . round(microtime(true) * 1000)));
        $taskDate = (string)($input['taskDate'] ?? date('Y-m-d'));
        $title = trim((string)($input['title'] ?? ''));

        if (!$title) {
            ApiResponse::error('Title is required', 400);
        }

        $done = isset($input['done']) ? !empty($input['done']) : null;
        $this->dailyTaskRepo->save($id, $taskDate, $title, $done);

        ApiResponse::send(['success' => true, 'id' => $id]);
    }

    /**
     * Toggle daily custom task completion.
     */
    private function actionToggleDailyTask(): void
    {
        $input = $this->getJsonInput();
        $id = (string)($input['id'] ?? '');
        $done = !empty($input['done']);

        if (!$id) {
            ApiResponse::error('Missing task id', 400);
        }

        $this->dailyTaskRepo->toggle($id, $done);
        ApiResponse::send(['success' => true]);
    }

    /**
     * Delete daily custom task.
     */
    private function actionDeleteDailyTask(): void
    {
        $input = $this->getJsonInput();
        $id = (string)($input['id'] ?? '');

        if (!$id) {
            ApiResponse::error('Missing task id', 400);
        }

        $this->dailyTaskRepo->delete($id);
        ApiResponse::send(['success' => true]);
    }

    /**
     * Reset tracker.
     */
    private function actionResetTracker(): void
    {
        $input = $this->getJsonInput();
        $trackerId = trim((string)($input['trackerId'] ?? ''));

        if (!$trackerId) {
            ApiResponse::error('Missing trackerId', 400);
        }

        $this->trackerRepo->resetTracker($trackerId);
        ApiResponse::send(['success' => true, 'message' => "Reset tracker {$trackerId} in MySQL"]);
    }

    /**
     * Export all data.
     */
    private function actionExport(): void
    {
        $trackers = $this->db->fetchAll("SELECT * FROM trackers");
        $days = $this->db->fetchAll("SELECT * FROM tracker_days");
        $goals = $this->db->fetchAll("SELECT * FROM tracker_goals");
        $rewards = $this->db->fetchAll("SELECT * FROM tracker_rewards");
        $challenges = $this->db->fetchAll("SELECT * FROM challenges");
        $dailyTasks = $this->db->fetchAll("SELECT * FROM daily_tasks");

        ApiResponse::send([
            'success' => true,
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
