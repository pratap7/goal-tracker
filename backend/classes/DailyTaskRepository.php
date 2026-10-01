<?php
declare(strict_types=1);

/**
 * DailyTaskRepository
 * 
 * Object-oriented Data Access Layer for custom daily tasks on Today's command center.
 */
class DailyTaskRepository {
    private Database $db;

    public function __construct(?Database $db = null) {
        $this->db = $db ?? Database::getInstance();
    }

    /**
     * Get all daily custom tasks ordered by creation time.
     */
    public function getAll(): array {
        $rows = $this->db->fetchAll("SELECT id, task_date, title, done, created_at FROM daily_tasks ORDER BY created_at ASC");
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
     * Get custom tasks for a specific date.
     */
    public function getByDate(string $date): array {
        $sql = "SELECT id, task_date, title, done, created_at FROM daily_tasks WHERE task_date = :tdate ORDER BY created_at ASC";
        $rows = $this->db->fetchAll($sql, [':tdate' => $date]);
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
     * Save or update custom task title and done status.
     */
    public function save(string $id, string $taskDate, string $title, ?bool $done = null): bool {
        if ($done !== null) {
            $sql = "INSERT INTO daily_tasks (id, task_date, title, done, created_at)
                    VALUES (:id, :tdate, :title, :done, NOW())
                    ON DUPLICATE KEY UPDATE title = VALUES(title), done = VALUES(done)";
            return $this->db->execute($sql, [
                ':id' => $id,
                ':tdate' => $taskDate,
                ':title' => $title,
                ':done' => $done ? 1 : 0
            ]);
        } else {
            $sql = "INSERT INTO daily_tasks (id, task_date, title, done, created_at)
                    VALUES (:id, :tdate, :title, 0, NOW())
                    ON DUPLICATE KEY UPDATE title = VALUES(title)";
            return $this->db->execute($sql, [
                ':id' => $id,
                ':tdate' => $taskDate,
                ':title' => $title
            ]);
        }
    }

    /**
     * Toggle completion state.
     */
    public function toggle(string $id, bool $done): bool {
        return $this->db->execute("UPDATE daily_tasks SET done = :done WHERE id = :id", [
            ':id' => $id,
            ':done' => $done ? 1 : 0
        ]);
    }

    /**
     * Delete a custom task.
     */
    public function delete(string $id): bool {
        return $this->db->execute("DELETE FROM daily_tasks WHERE id = :id", [':id' => $id]);
    }
}
