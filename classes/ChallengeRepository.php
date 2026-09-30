<?php
declare(strict_types=1);

/**
 * ChallengeRepository
 * 
 * Object-oriented Data Access Layer for Habit Sprint Challenges.
 */
class ChallengeRepository
{
    private Database $db;

    public function __construct(?Database $db = null)
    {
        $this->db = $db ?? Database::getInstance();
    }

    /**
     * Get all challenges ordered by creation date descending.
     */
    public function getAll(): array
    {
        $sql = "SELECT id, title, days, start_date, status, created_at, reward, completion_note, reward_redeemed, redeemed_at, end_time, archived_at 
                FROM challenges 
                ORDER BY created_at DESC";
        $rows = $this->db->fetchAll($sql);
        $challenges = [];

        foreach ($rows as $crow) {
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

        return $challenges;
    }

    /**
     * Get count of currently active challenges.
     */
    public function getActiveCount(): int
    {
        return (int)$this->db->fetchColumn("SELECT COUNT(*) FROM challenges WHERE status = 'active'");
    }

    /**
     * Check if a challenge exists by id.
     */
    public function exists(string $id): bool
    {
        $res = $this->db->fetchOne("SELECT id FROM challenges WHERE id = :id", [':id' => $id]);
        return $res !== null;
    }

    /**
     * Save or update a habit challenge.
     */
    public function save(
        string $id,
        string $title,
        int $days,
        string $startDate,
        string $status = 'active',
        string $reward = '',
        string $note = '',
        bool $rewardRedeemed = false
    ): bool {
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

        return $this->db->execute($sql, [
            ':id' => $id,
            ':title' => $title,
            ':days' => $days,
            ':sdate' => $startDate,
            ':status' => $status,
            ':reward' => $reward,
            ':note' => $note,
            ':redeemed' => $rewardRedeemed ? 1 : 0
        ]);
    }

    /**
     * Redeem challenge reward with note.
     */
    public function redeem(string $id, string $completionNote): bool
    {
        $sql = "UPDATE challenges 
                SET reward_redeemed = 1, 
                    redeemed_at = NOW(), 
                    completion_note = :note, 
                    status = 'completed'
                WHERE id = :id";

        return $this->db->execute($sql, [
            ':id' => $id,
            ':note' => $completionNote
        ]);
    }

    /**
     * Archive an expired or finished challenge.
     */
    public function archive(string $id): bool
    {
        $sql = "UPDATE challenges SET status = 'archived', archived_at = NOW() WHERE id = :id";
        return $this->db->execute($sql, [':id' => $id]);
    }

    /**
     * Unarchive a challenge back to active.
     */
    public function unarchive(string $id): bool
    {
        $sql = "UPDATE challenges SET status = 'active', archived_at = NULL WHERE id = :id";
        return $this->db->execute($sql, [':id' => $id]);
    }

    /**
     * Delete a challenge completely.
     */
    public function delete(string $id): bool
    {
        return $this->db->execute("DELETE FROM challenges WHERE id = :id", [':id' => $id]);
    }
}
