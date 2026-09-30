<?php
// api.php - REST API for GoalTracker MySQL persistence

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    if (!headers_sent()) http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

function jsonResponse($data, $status = 200) {
    if (!headers_sent()) {
        http_response_code($status);
    }
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function getJsonInput() {
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

try {
    $pdo = getDbConnection();
} catch (Exception $e) {
    jsonResponse([
        'success' => false,
        'error' => 'Database connection failed: ' . $e->getMessage()
    ], 500);
}

$action = $_GET['action'] ?? ($_POST['action'] ?? 'status');

try {
    switch ($action) {
        case 'status':
        case 'health': {
            $tables = ['trackers', 'tracker_days', 'tracker_goals', 'tracker_rewards', 'challenges'];
            $counts = [];
            foreach ($tables as $t) {
                $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM `{$t}`");
                $counts[$t] = (int)$stmt->fetchColumn();
            }
            jsonResponse([
                'success' => true,
                'status' => 'online',
                'database' => 'goal_tracker_db',
                'server_time' => date('Y-m-d H:i:s'),
                'counts' => $counts
            ]);
            break;
        }

        case 'get_all': {
            // 1. Trackers meta
            $stmt = $pdo->query("SELECT id, title, total_days, start_date FROM trackers");
            $trackersList = $stmt->fetchAll();
            $trackers = [];
            foreach ($trackersList as $tr) {
                $trackers[$tr['id']] = [
                    'id' => $tr['id'],
                    'title' => $tr['title'],
                    'totalDays' => (int)$tr['total_days'],
                    'startDate' => $tr['start_date']
                ];
            }

            // 2. Days
            $stmt = $pdo->query("SELECT tracker_id, day_number, tasks, note, metrics, done_tasks, total_tasks, is_completed, log_date FROM tracker_days ORDER BY tracker_id, day_number ASC");
            $daysRows = $stmt->fetchAll();
            $days = [];
            foreach ($daysRows as $row) {
                $tid = $row['tracker_id'];
                $dnum = (int)$row['day_number'];
                if (!isset($days[$tid])) $days[$tid] = [];

                $tasks = !empty($row['tasks']) ? json_decode($row['tasks'], true) : [];
                $metrics = !empty($row['metrics']) ? json_decode($row['metrics'], true) : null;

                $days[$tid][$dnum] = [
                    'day' => $dnum,
                    'tasks' => is_array($tasks) ? $tasks : [],
                    'note' => $row['note'] ?? '',
                    'metrics' => is_array($metrics) ? $metrics : null,
                    'doneTasks' => (int)$row['done_tasks'],
                    'totalTasks' => (int)$row['total_tasks'],
                    'isCompleted' => (bool)$row['is_completed'],
                    'logDate' => $row['log_date']
                ];
            }

            // 3. Goals
            $stmt = $pdo->query("SELECT tracker_id, goals FROM tracker_goals");
            $goalsRows = $stmt->fetchAll();
            $goals = [];
            foreach ($goalsRows as $grow) {
                $goals[$grow['tracker_id']] = json_decode($grow['goals'], true) ?: [];
            }

            // 4. Rewards
            $stmt = $pdo->query("SELECT tracker_id, rewards FROM tracker_rewards");
            $rewardsRows = $stmt->fetchAll();
            $rewards = [];
            foreach ($rewardsRows as $rrow) {
                $rewards[$rrow['tracker_id']] = json_decode($rrow['rewards'], true) ?: [];
            }

            // 5. Challenges
            $stmt = $pdo->query("SELECT id, title, days, start_date, status, created_at, reward, completion_note, reward_redeemed, redeemed_at, end_time, archived_at FROM challenges ORDER BY created_at DESC");
            $challengesRows = $stmt->fetchAll();
            $challenges = [];
            foreach ($challengesRows as $crow) {
                $challenges[] = [
                    'id' => $crow['id'],
                    'title' => $crow['title'],
                    'days' => (int)$crow['days'],
                    'startDate' => $crow['start_date'],
                    'status' => $crow['status'] ?? 'active',
                    'createdAt' => $crow['created_at'],
                    'reward' => $crow['reward'] ?? '',
                    'completionNote' => $crow['completion_note'] ?? '',
                    'rewardRedeemed' => (bool)($crow['reward_redeemed'] ?? 0),
                    'redeemedAt' => $crow['redeemed_at'],
                    'endTime' => $crow['end_time'],
                    'archivedAt' => $crow['archived_at']
                ];
            }

            // 6. Daily Custom Tasks
            $stmt = $pdo->query("SELECT id, task_date, title, done, created_at FROM daily_tasks ORDER BY created_at ASC");
            $dailyTasksRows = $stmt->fetchAll();
            $dailyTasks = [];
            foreach ($dailyTasksRows as $drow) {
                $dailyTasks[] = [
                    'id' => $drow['id'],
                    'taskDate' => $drow['task_date'],
                    'title' => $drow['title'],
                    'done' => (bool)$drow['done'],
                    'createdAt' => $drow['created_at']
                ];
            }

            jsonResponse([
                'success' => true,
                'data' => [
                    'trackers' => $trackers,
                    'days' => $days,
                    'goals' => $goals,
                    'rewards' => $rewards,
                    'challenges' => $challenges,
                    'dailyTasks' => $dailyTasks
                ]
            ]);
            break;
        }

        case 'save_day': {
            $input = getJsonInput();
            $trackerId = trim($input['trackerId'] ?? '');
            $day = (int)($input['day'] ?? 0);
            if (!$trackerId || $day < 1) {
                jsonResponse(['success' => false, 'error' => 'Missing trackerId or day'], 400);
            }

            $tasksJson = isset($input['tasks']) ? json_encode($input['tasks'], JSON_UNESCAPED_UNICODE) : '[]';
            $note = $input['note'] ?? '';
            $metricsJson = isset($input['metrics']) && is_array($input['metrics']) ? json_encode($input['metrics'], JSON_UNESCAPED_UNICODE) : null;
            $doneTasks = (int)($input['doneTasks'] ?? 0);
            $totalTasks = (int)($input['totalTasks'] ?? 0);
            $isCompleted = !empty($input['isCompleted']) ? 1 : 0;
            $logDate = !empty($input['logDate']) ? $input['logDate'] : date('Y-m-d');

            $sql = "INSERT INTO tracker_days 
                    (tracker_id, day_number, tasks, note, metrics, done_tasks, total_tasks, is_completed, log_date, updated_at)
                    VALUES (:tid, :day, :tasks, :note, :metrics, :done, :total, :completed, :logdate, NOW())
                    ON DUPLICATE KEY UPDATE 
                        tasks = VALUES(tasks),
                        note = VALUES(note),
                        metrics = VALUES(metrics),
                        done_tasks = VALUES(done_tasks),
                        total_tasks = VALUES(total_tasks),
                        is_completed = VALUES(is_completed),
                        log_date = VALUES(log_date),
                        updated_at = NOW()";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':tid' => $trackerId,
                ':day' => $day,
                ':tasks' => $tasksJson,
                ':note' => $note,
                ':metrics' => $metricsJson,
                ':done' => $doneTasks,
                ':total' => $totalTasks,
                ':completed' => $isCompleted,
                ':logdate' => $logDate
            ]);

            jsonResponse([
                'success' => true,
                'message' => "Saved day {$day} for tracker {$trackerId}",
                'savedAt' => date('Y-m-d H:i:s')
            ]);
            break;
        }

        case 'batch_save_days': {
            $input = getJsonInput();
            $trackerId = trim($input['trackerId'] ?? '');
            $daysData = $input['days'] ?? [];
            if (!$trackerId || !is_array($daysData)) {
                jsonResponse(['success' => false, 'error' => 'Invalid batch data'], 400);
            }

            $pdo->beginTransaction();
            $sql = "INSERT INTO tracker_days 
                    (tracker_id, day_number, tasks, note, metrics, done_tasks, total_tasks, is_completed, log_date, updated_at)
                    VALUES (:tid, :day, :tasks, :note, :metrics, :done, :total, :completed, :logdate, NOW())
                    ON DUPLICATE KEY UPDATE 
                        tasks = VALUES(tasks),
                        note = VALUES(note),
                        metrics = VALUES(metrics),
                        done_tasks = VALUES(done_tasks),
                        total_tasks = VALUES(total_tasks),
                        is_completed = VALUES(is_completed),
                        log_date = VALUES(log_date),
                        updated_at = NOW()";

            $stmt = $pdo->prepare($sql);
            $count = 0;
            foreach ($daysData as $dnum => $d) {
                $dayNumber = (int)$dnum;
                if ($dayNumber < 1) continue;
                $tasks = isset($d['tasks']) ? $d['tasks'] : [];
                $tasksJson = json_encode($tasks, JSON_UNESCAPED_UNICODE);
                $note = $d['note'] ?? '';
                $metricsJson = isset($d['metrics']) && is_array($d['metrics']) ? json_encode($d['metrics'], JSON_UNESCAPED_UNICODE) : null;
                $done = 0;
                if (is_array($tasks)) {
                    foreach ($tasks as $t) {
                        if (!empty($t['done'])) $done++;
                    }
                }
                $total = is_array($tasks) ? count($tasks) : 0;
                $isCompleted = ($total > 0 && $done === $total) ? 1 : 0;
                $logDate = !empty($d['logDate']) ? $d['logDate'] : date('Y-m-d');

                $stmt->execute([
                    ':tid' => $trackerId,
                    ':day' => $dayNumber,
                    ':tasks' => $tasksJson,
                    ':note' => $note,
                    ':metrics' => $metricsJson,
                    ':done' => $done,
                    ':total' => $total,
                    ':completed' => $isCompleted,
                    ':logdate' => $logDate
                ]);
                $count++;
            }
            $pdo->commit();

            jsonResponse([
                'success' => true,
                'message' => "Batch saved {$count} days for {$trackerId}"
            ]);
            break;
        }

        case 'save_goals': {
            $input = getJsonInput();
            $trackerId = trim($input['trackerId'] ?? '');
            $goals = $input['goals'] ?? [];
            if (!$trackerId) {
                jsonResponse(['success' => false, 'error' => 'Missing trackerId'], 400);
            }

            $goalsJson = json_encode($goals, JSON_UNESCAPED_UNICODE);
            $sql = "INSERT INTO tracker_goals (tracker_id, goals, updated_at) 
                    VALUES (:tid, :goals, NOW())
                    ON DUPLICATE KEY UPDATE goals = VALUES(goals), updated_at = NOW()";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':tid' => $trackerId, ':goals' => $goalsJson]);

            jsonResponse(['success' => true, 'message' => "Goals updated for {$trackerId}"]);
            break;
        }

        case 'save_rewards': {
            $input = getJsonInput();
            $trackerId = trim($input['trackerId'] ?? '');
            $rewards = $input['rewards'] ?? [];
            if (!$trackerId) {
                jsonResponse(['success' => false, 'error' => 'Missing trackerId'], 400);
            }

            $rewardsJson = json_encode($rewards, JSON_UNESCAPED_UNICODE);
            $sql = "INSERT INTO tracker_rewards (tracker_id, rewards, updated_at) 
                    VALUES (:tid, :rewards, NOW())
                    ON DUPLICATE KEY UPDATE rewards = VALUES(rewards), updated_at = NOW()";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':tid' => $trackerId, ':rewards' => $rewardsJson]);

            jsonResponse(['success' => true, 'message' => "Rewards updated for {$trackerId}"]);
            break;
        }

        case 'save_tracker_meta': {
            $input = getJsonInput();
            $trackerId = trim($input['trackerId'] ?? '');
            $title = trim($input['title'] ?? '');
            $totalDays = (int)($input['totalDays'] ?? 100);
            $startDate = !empty($input['startDate']) ? $input['startDate'] : null;

            if (!$trackerId) {
                jsonResponse(['success' => false, 'error' => 'Missing trackerId'], 400);
            }

            $sql = "INSERT INTO trackers (id, title, total_days, start_date, updated_at)
                    VALUES (:id, :title, :total, :sdate, NOW())
                    ON DUPLICATE KEY UPDATE 
                        title = IF(VALUES(title) != '', VALUES(title), title),
                        total_days = IF(VALUES(total_days) > 0, VALUES(total_days), total_days),
                        start_date = VALUES(start_date),
                        updated_at = NOW()";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':id' => $trackerId,
                ':title' => $title,
                ':total' => $totalDays,
                ':sdate' => $startDate
            ]);

            jsonResponse(['success' => true, 'message' => "Tracker meta saved for {$trackerId}"]);
            break;
        }

        case 'save_challenge': {
            $input = getJsonInput();
            $id = (string)($input['id'] ?? ('ch_' . time()));
            $title = trim($input['title'] ?? '');
            $days = (int)($input['days'] ?? 7);
            $startDate = !empty($input['startDate']) ? $input['startDate'] : date('Y-m-d');
            $status = $input['status'] ?? 'active';
            $reward = trim($input['reward'] ?? '');
            $note = $input['completionNote'] ?? '';
            $rewardRedeemed = !empty($input['rewardRedeemed']) ? 1 : 0;

            if (!$title) {
                jsonResponse(['success' => false, 'error' => 'Missing challenge title'], 400);
            }

            // Check 5 active challenges limit for new active challenges
            $checkExisting = $pdo->prepare("SELECT id, status FROM challenges WHERE id = :id");
            $checkExisting->execute([':id' => $id]);
            $existing = $checkExisting->fetch();

            if (!$existing && $status === 'active') {
                $countStmt = $pdo->query("SELECT COUNT(*) FROM challenges WHERE status = 'active'");
                $activeCount = (int)$countStmt->fetchColumn();
                if ($activeCount >= 5) {
                    jsonResponse([
                        'success' => false,
                        'error' => 'Maximum 5 active challenges allowed. Please complete or archive an existing challenge.'
                    ], 400);
                }
            }

            $sql = "INSERT INTO challenges (id, title, days, start_date, status, reward, completion_note, reward_redeemed, created_at, end_time)
                    VALUES (:id, :title, :days, :sdate, :status, :reward, :note, :redeemed, NOW(), DATE_ADD(NOW(), INTERVAL :days DAY))
                    ON DUPLICATE KEY UPDATE
                        title = VALUES(title),
                        days = VALUES(days),
                        start_date = VALUES(start_date),
                        status = VALUES(status),
                        reward = VALUES(reward),
                        completion_note = VALUES(completion_note),
                        reward_redeemed = VALUES(reward_redeemed),
                        end_time = IFNULL(end_time, DATE_ADD(created_at, INTERVAL :days DAY))";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':id' => $id,
                ':title' => $title,
                ':days' => $days,
                ':sdate' => $startDate,
                ':status' => $status,
                ':reward' => $reward,
                ':note' => $note,
                ':redeemed' => $rewardRedeemed
            ]);

            jsonResponse(['success' => true, 'id' => $id, 'message' => "Challenge saved"]);
            break;
        }

        case 'redeem_challenge': {
            $input = getJsonInput();
            $id = (string)($input['id'] ?? '');
            $note = trim($input['completionNote'] ?? '');

            if (!$id) {
                jsonResponse(['success' => false, 'error' => 'Missing challenge id'], 400);
            }

            $sql = "UPDATE challenges 
                    SET reward_redeemed = 1, 
                        redeemed_at = NOW(), 
                        completion_note = :note, 
                        status = 'completed'
                    WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id' => $id, ':note' => $note]);

            jsonResponse(['success' => true, 'message' => "Reward redeemed and note saved!"]);
            break;
        }

        case 'archive_challenge': {
            $input = getJsonInput();
            $id = (string)($input['id'] ?? ($_GET['id'] ?? ''));

            if (!$id) {
                jsonResponse(['success' => false, 'error' => 'Missing challenge id'], 400);
            }

            $sql = "UPDATE challenges SET status = 'archived', archived_at = NOW() WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id' => $id]);

            jsonResponse(['success' => true, 'message' => "Challenge moved to archive"]);
            break;
        }

        case 'unarchive_challenge': {
            $input = getJsonInput();
            $id = (string)($input['id'] ?? '');

            if (!$id) {
                jsonResponse(['success' => false, 'error' => 'Missing challenge id'], 400);
            }

            // Check if active limit reached
            $countStmt = $pdo->query("SELECT COUNT(*) FROM challenges WHERE status = 'active'");
            if ((int)$countStmt->fetchColumn() >= 5) {
                jsonResponse(['success' => false, 'error' => 'Cannot unarchive: already 5 active challenges.'], 400);
            }

            $sql = "UPDATE challenges SET status = 'active', archived_at = NULL WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id' => $id]);

            jsonResponse(['success' => true, 'message' => "Challenge restored from archive"]);
            break;
        }

        case 'delete_challenge': {
            $input = getJsonInput();
            $id = (string)($input['id'] ?? ($_GET['id'] ?? ''));
            if (!$id) {
                jsonResponse(['success' => false, 'error' => 'Missing challenge id'], 400);
            }

            $stmt = $pdo->prepare("DELETE FROM challenges WHERE id = :id");
            $stmt->execute([':id' => $id]);

            jsonResponse(['success' => true, 'message' => "Challenge {$id} deleted"]);
            break;
        }

        case 'save_daily_task': {
            $input = getJsonInput();
            $id = (string)($input['id'] ?? ('dt_' . round(microtime(true) * 1000)));
            $taskDate = (string)($input['taskDate'] ?? date('Y-m-d'));
            $title = trim($input['title'] ?? '');
            $done = !empty($input['done']) ? 1 : 0;
            if (!$title) {
                jsonResponse(['success' => false, 'error' => 'Title is required'], 400);
            }
            $sql = "INSERT INTO daily_tasks (id, task_date, title, done, created_at)
                    VALUES (:id, :tdate, :title, :done, NOW())
                    ON DUPLICATE KEY UPDATE title = VALUES(title), done = VALUES(done)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id' => $id, ':tdate' => $taskDate, ':title' => $title, ':done' => $done]);
            jsonResponse(['success' => true, 'id' => $id]);
            break;
        }

        case 'toggle_daily_task': {
            $input = getJsonInput();
            $id = (string)($input['id'] ?? '');
            $done = !empty($input['done']) ? 1 : 0;
            if (!$id) {
                jsonResponse(['success' => false, 'error' => 'Missing task id'], 400);
            }
            $stmt = $pdo->prepare("UPDATE daily_tasks SET done = :done WHERE id = :id");
            $stmt->execute([':done' => $done, ':id' => $id]);
            jsonResponse(['success' => true]);
            break;
        }

        case 'delete_daily_task': {
            $input = getJsonInput();
            $id = (string)($input['id'] ?? '');
            if (!$id) {
                jsonResponse(['success' => false, 'error' => 'Missing task id'], 400);
            }
            $stmt = $pdo->prepare("DELETE FROM daily_tasks WHERE id = :id");
            $stmt->execute([':id' => $id]);
            jsonResponse(['success' => true]);
            break;
        }

        case 'reset_tracker': {
            $input = getJsonInput();
            $trackerId = trim($input['trackerId'] ?? '');
            if (!$trackerId) {
                jsonResponse(['success' => false, 'error' => 'Missing trackerId'], 400);
            }

            $stmt = $pdo->prepare("DELETE FROM tracker_days WHERE tracker_id = :tid");
            $stmt->execute([':tid' => $trackerId]);

            $stmt = $pdo->prepare("DELETE FROM tracker_goals WHERE tracker_id = :tid");
            $stmt->execute([':tid' => $trackerId]);

            $stmt = $pdo->prepare("DELETE FROM tracker_rewards WHERE tracker_id = :tid");
            $stmt->execute([':tid' => $trackerId]);

            jsonResponse(['success' => true, 'message' => "Reset tracker {$trackerId} in MySQL"]);
            break;
        }

        case 'export': {
            $trackers = $pdo->query("SELECT * FROM trackers")->fetchAll();
            $days = $pdo->query("SELECT * FROM tracker_days")->fetchAll();
            $goals = $pdo->query("SELECT * FROM tracker_goals")->fetchAll();
            $rewards = $pdo->query("SELECT * FROM tracker_rewards")->fetchAll();
            $challenges = $pdo->query("SELECT * FROM challenges")->fetchAll();

            jsonResponse([
                'success' => true,
                'exported_at' => date('c'),
                'data' => [
                    'trackers' => $trackers,
                    'days' => $days,
                    'goals' => $goals,
                    'rewards' => $rewards,
                    'challenges' => $challenges
                ]
            ]);
            break;
        }

        default:
            jsonResponse(['success' => false, 'error' => 'Unknown action: ' . $action], 404);
    }
} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
