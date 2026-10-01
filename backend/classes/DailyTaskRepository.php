<?php
declare(strict_types=1);

/**
 * DailyTaskRepository
 * 
 * Object-oriented Data Access Layer for custom daily tasks on Today's command center.
 * Fully multi-tenant with strict user scoping.
 */
class DailyTaskRepository {
    private Database $db;

    public function __construct(?Database $db = null) {
        $this->db = $db ?? Database::getInstance();
    }

    /**
     * Get all daily custom tasks for a user ordered by creation time.
     */
    public function getAll(int $userId = 1): array {
        $sql = "SELECT id, task_date, title, done, created_at FROM daily_tasks WHERE user_id = :uid ORDER BY created_at ASC";
        $rows = $this->db->fetchAll($sql, [':uid' => $userId]);
        $tasks = [];
        foreach ($rows as $drow) {
            $tasks[] = [
                'id' => $drow['id'],
                'taskDate' => $drow['task_date'],
                'title' => $drow['title'],
                'done' => (bool)$drow['done'],
                'createdAt' => $drow['created_at']
            ];
        }
        return $tasks;
    }

    /**
     * Get custom tasks for a specific date and user.
     */
    public function getByDate(int $userId, string $date): array {
        $sql = "SELECT id, task_date, title, done, created_at FROM daily_tasks WHERE user_id = :uid AND task_date = :tdate ORDER BY created_at ASC";
        $rows = $this->db->fetchAll($sql, [':uid' => $userId, ':tdate' => $date]);
        $tasks = [];
        foreach ($rows as $drow) {
            $tasks[] = [
                'id' => $drow['id'],
                'taskDate' => $drow['task_date'],
                'title' => $drow['title'],
                'done' => (bool)$drow['done'],
                'createdAt' => $drow['created_at']
            ];
        }
        return $tasks;
    }

    /**
     * Save or update custom task title and done status for a user.
     */
    public function save(int $userId, string $id, string $taskDate, string $title, ?bool $done = null): bool {
        if ($done !== null) {
            $sql = "INSERT INTO daily_tasks (id, user_id, task_date, title, done, created_at)
                    VALUES (:id, :uid, :tdate, :title, :done, NOW())
                    ON DUPLICATE KEY UPDATE title = VALUES(title), done = VALUES(done)";
            return $this->db->execute($sql, [
                ':id' => $id,
                ':uid' => $userId,
                ':tdate' => $taskDate,
                ':title' => $title,
                ':done' => $done ? 1 : 0
            ]);
        } else {
            $sql = "INSERT INTO daily_tasks (id, user_id, task_date, title, done, created_at)
                    VALUES (:id, :uid, :tdate, :title, 0, NOW())
                    ON DUPLICATE KEY UPDATE title = VALUES(title)";
            return $this->db->execute($sql, [
                ':id' => $id,
                ':uid' => $userId,
                ':tdate' => $taskDate,
                ':title' => $title
            ]);
        }
    }

    /**
     * Toggle completion state for a user.
     */
    public function toggle(int $userId, string $id, bool $done): bool {
        return $this->db->execute("UPDATE daily_tasks SET done = :done WHERE user_id = :uid AND id = :id", [
            ':uid' => $userId,
            ':id' => $id,
            ':done' => $done ? 1 : 0
        ]);
    }

    /**
     * Delete a custom task for a user.
     */
    public function delete(int $userId, string $id): bool {
        return $this->db->execute("DELETE FROM daily_tasks WHERE user_id = :uid AND id = :id", [
            ':uid' => $userId,
            ':id' => $id
        ]);
    }
}
