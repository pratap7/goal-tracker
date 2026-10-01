<?php
declare(strict_types=1);

/**
 * TrackerRepository
 * 
 * Object-oriented Data Access Layer for trackers, daily lessons, goals, and rewards.
 */
class TrackerRepository
{
    private Database $db;

    public function __construct(?Database $db = null)
    {
        $this->db = $db ?? Database::getInstance();
    }

    /**
     * Get metadata for all active trackers.
     */
    public function getTrackersMeta(): array
    {
        $rows = $this->db->fetchAll("SELECT id, title, total_days, start_date, emoji, subtitle, theme, status FROM trackers WHERE status != 'archived' ORDER BY created_at ASC");
        $trackers = [];
        foreach ($rows as $tr) {
            $trackers[$tr['id']] = [
                'id' => $tr['id'],
                'title' => $tr['title'],
                'totalDays' => (int)$tr['total_days'],
                'startDate' => $tr['start_date'],
                'emoji' => !empty($tr['emoji']) ? $tr['emoji'] : '🎯',
                'subtitle' => !empty($tr['subtitle']) ? $tr['subtitle'] : '',
                'theme' => !empty($tr['theme']) ? $tr['theme'] : 'theme-german',
                'status' => !empty($tr['status']) ? $tr['status'] : 'active'
            ];
        }
        return $trackers;
    }

    /**
     * Save or update tracker metadata.
     */
    public function saveTrackerMeta(
        string $id,
        string $title,
        int $totalDays,
        ?string $startDate,
        string $emoji = '🎯',
        string $subtitle = '',
        string $theme = 'theme-german'
    ): bool {
        $sql = "INSERT INTO trackers (id, title, total_days, start_date, emoji, subtitle, theme, status, updated_at)
                VALUES (:id, :title, :total, :sdate, :emoji, :sub, :theme, 'active', NOW())
                ON DUPLICATE KEY UPDATE 
                    title = IF(VALUES(title) != '', VALUES(title), title),
                    total_days = IF(VALUES(total_days) > 0, VALUES(total_days), total_days),
                    start_date = VALUES(start_date),
                    emoji = VALUES(emoji),
                    subtitle = VALUES(subtitle),
                    theme = VALUES(theme),
                    status = 'active',
                    updated_at = NOW()";

        return $this->db->execute($sql, [
            ':id' => $id,
            ':title' => $title,
            ':total' => $totalDays,
            ':sdate' => $startDate,
            ':emoji' => $emoji,
            ':sub' => $subtitle,
            ':theme' => $theme
        ]);
    }

    /**
     * Delete a goal tracker permanently.
     */
    public function deleteTracker(string $id): bool
    {
        $this->db->execute("DELETE FROM trackers WHERE id = :id", [':id' => $id]);
        $this->db->execute("DELETE FROM tracker_days WHERE tracker_id = :id", [':id' => $id]);
        $this->db->execute("DELETE FROM tracker_goals WHERE tracker_id = :id", [':id' => $id]);
        $this->db->execute("DELETE FROM tracker_rewards WHERE tracker_id = :id", [':id' => $id]);
        return true;
    }

    /**
     * Fetch all day progress records for all trackers.
     */
    public function getAllDays(): array
    {
        $sql = "SELECT tracker_id, day_number, tasks, note, metrics, done_tasks, total_tasks, is_completed, log_date, custom_title 
                FROM tracker_days 
                ORDER BY tracker_id, day_number ASC";
        $rows = $this->db->fetchAll($sql);
        $days = [];

        foreach ($rows as $row) {
            $tid = $row['tracker_id'];
            $dnum = (int)$row['day_number'];
            if (!isset($days[$tid])) {
                $days[$tid] = [];
            }

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
                'logDate' => $row['log_date'],
                'customTitle' => $row['custom_title'] ?? ''
            ];
        }

        return $days;
    }

    /**
     * Fetch single day record.
     */
    public function getDay(string $trackerId, int $day): ?array
    {
        $sql = "SELECT tracker_id, day_number, tasks, note, metrics, done_tasks, total_tasks, is_completed, log_date, custom_title 
                FROM tracker_days 
                WHERE tracker_id = :tid AND day_number = :day";
        $row = $this->db->fetchOne($sql, [':tid' => $trackerId, ':day' => $day]);
        if (!$row) return null;

        $tasks = !empty($row['tasks']) ? json_decode($row['tasks'], true) : [];
        $metrics = !empty($row['metrics']) ? json_decode($row['metrics'], true) : null;

        return [
            'day' => (int)$row['day_number'],
            'tasks' => is_array($tasks) ? $tasks : [],
            'note' => $row['note'] ?? '',
            'metrics' => is_array($metrics) ? $metrics : null,
            'doneTasks' => (int)$row['done_tasks'],
            'totalTasks' => (int)$row['total_tasks'],
            'isCompleted' => (bool)$row['is_completed'],
            'logDate' => $row['log_date'],
            'customTitle' => $row['custom_title'] ?? ''
        ];
    }

    /**
     * Save progress for a specific day.
     */
    public function saveDay(
        string $trackerId,
        int $day,
        array $tasks,
        string $note = '',
        ?array $metrics = null,
        int $doneTasks = 0,
        int $totalTasks = 0,
        bool $isCompleted = false,
        ?string $logDate = null,
        ?string $customTitle = null
    ): bool {
        $tasksJson = json_encode($tasks, JSON_UNESCAPED_UNICODE);
        $metricsJson = ($metrics !== null) ? json_encode($metrics, JSON_UNESCAPED_UNICODE) : null;
        $logDateStr = $logDate ?: date('Y-m-d');

        $sql = "INSERT INTO tracker_days 
                (tracker_id, day_number, tasks, note, metrics, done_tasks, total_tasks, is_completed, log_date, custom_title, updated_at)
                VALUES (:tid, :day, :tasks, :note, :metrics, :done, :total, :completed, :logdate, :ctitle, NOW())
                ON DUPLICATE KEY UPDATE 
                    tasks = VALUES(tasks),
                    note = VALUES(note),
                    metrics = VALUES(metrics),
                    done_tasks = VALUES(done_tasks),
                    total_tasks = VALUES(total_tasks),
                    is_completed = VALUES(is_completed),
                    log_date = VALUES(log_date),
                    custom_title = IFNULL(VALUES(custom_title), custom_title),
                    updated_at = NOW()";

        return $this->db->execute($sql, [
            ':tid' => $trackerId,
            ':day' => $day,
            ':tasks' => $tasksJson,
            ':note' => $note,
            ':metrics' => $metricsJson,
            ':done' => $doneTasks,
            ':total' => $totalTasks,
            ':completed' => $isCompleted ? 1 : 0,
            ':logdate' => $logDateStr,
            ':ctitle' => $customTitle
        ]);
    }

    /**
     * Update custom day title directly.
     */
    public function saveDayTitle(string $trackerId, int $day, string $title): bool
    {
        $sql = "INSERT INTO tracker_days (tracker_id, day_number, custom_title, updated_at)
                VALUES (:tid, :day, :title, NOW())
                ON DUPLICATE KEY UPDATE custom_title = VALUES(custom_title), updated_at = NOW()";

        return $this->db->execute($sql, [
            ':tid' => $trackerId,
            ':day' => $day,
            ':title' => $title
        ]);
    }

    /**
     * Update day tasks directly.
     */
    public function saveDayTasks(string $trackerId, int $day, array $tasks): bool
    {
        $tasksJson = json_encode($tasks, JSON_UNESCAPED_UNICODE);
        $doneTasks = count(array_filter($tasks, fn($t) => !empty($t['done'])));
        $totalTasks = count($tasks);
        $isCompleted = ($totalTasks > 0 && $doneTasks === $totalTasks) ? 1 : 0;

        $sql = "INSERT INTO tracker_days (tracker_id, day_number, tasks, done_tasks, total_tasks, is_completed, updated_at)
                VALUES (:tid, :day, :tasks, :done, :total, :completed, NOW())
                ON DUPLICATE KEY UPDATE 
                    tasks = VALUES(tasks),
                    done_tasks = VALUES(done_tasks),
                    total_tasks = VALUES(total_tasks),
                    is_completed = VALUES(is_completed),
                    updated_at = NOW()";

        return $this->db->execute($sql, [
            ':tid' => $trackerId,
            ':day' => $day,
            ':tasks' => $tasksJson,
            ':done' => $doneTasks,
            ':total' => $totalTasks,
            ':completed' => $isCompleted
        ]);
    }

    /**
     * Batch save days for a tracker inside a transaction.
     */
    public function batchSaveDays(string $trackerId, array $daysData): int
    {
        $this->db->beginTransaction();
        try {
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

            $stmt = $this->db->prepare($sql);
            $count = 0;

            foreach ($daysData as $dnum => $d) {
                $dayNumber = (int)$dnum;
                if ($dayNumber < 1) continue;

                $tasks = $d['tasks'] ?? [];
                $tasksJson = json_encode($tasks, JSON_UNESCAPED_UNICODE);
                $note = $d['note'] ?? '';
                $metricsJson = isset($d['metrics']) && is_array($d['metrics']) ? json_encode($d['metrics'], JSON_UNESCAPED_UNICODE) : null;
                $done = is_array($tasks) ? count(array_filter($tasks, fn($t) => !empty($t['done']))) : 0;
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

            $this->db->commit();
            return $count;
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Reset tracker days, goals, and rewards.
     */
    public function resetTracker(string $trackerId): bool
    {
        $this->db->execute("DELETE FROM tracker_days WHERE tracker_id = :tid", [':tid' => $trackerId]);
        $this->db->execute("DELETE FROM tracker_goals WHERE tracker_id = :tid", [':tid' => $trackerId]);
        $this->db->execute("DELETE FROM tracker_rewards WHERE tracker_id = :tid", [':tid' => $trackerId]);
        return true;
    }

    /**
     * Goals and rewards.
     */
    public function getGoals(): array
    {
        $rows = $this->db->fetchAll("SELECT tracker_id, goals FROM tracker_goals");
        $goals = [];
        foreach ($rows as $row) {
            $goals[$row['tracker_id']] = json_decode($row['goals'], true) ?: [];
        }
        return $goals;
    }

    public function saveGoals(string $trackerId, array $goals): bool
    {
        $sql = "INSERT INTO tracker_goals (tracker_id, goals, updated_at) 
                VALUES (:tid, :goals, NOW())
                ON DUPLICATE KEY UPDATE goals = VALUES(goals), updated_at = NOW()";

        return $this->db->execute($sql, [
            ':tid' => $trackerId,
            ':goals' => json_encode($goals, JSON_UNESCAPED_UNICODE)
        ]);
    }

    public function getRewards(): array
    {
        $rows = $this->db->fetchAll("SELECT tracker_id, rewards FROM tracker_rewards");
        $rewards = [];
        foreach ($rows as $row) {
            $rewards[$row['tracker_id']] = json_decode($row['rewards'], true) ?: [];
        }
        return $rewards;
    }

    public function saveRewards(string $trackerId, array $rewards): bool
    {
        $sql = "INSERT INTO tracker_rewards (tracker_id, rewards, updated_at) 
                VALUES (:tid, :rewards, NOW())
                ON DUPLICATE KEY UPDATE rewards = VALUES(rewards), updated_at = NOW()";

        return $this->db->execute($sql, [
            ':tid' => $trackerId,
            ':rewards' => json_encode($rewards, JSON_UNESCAPED_UNICODE)
        ]);
    }
}
