<?php
// modules/reflections/ReflectionModel.php
class ReflectionModel {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function saveReflection($userId, $type, $question, $answer, $eventId = null) {
        $sql = "INSERT INTO reflection_logs (user_id, event_id, reflection_type, question, answer, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$userId, $eventId, $type, $question, $answer]);
    }

    public function getReflections($userId, $type = null, $limit = 50) {
        $sql = "SELECT * FROM reflection_logs WHERE user_id = ?";
        $params = [$userId];
        if ($type) {
            $sql .= " AND reflection_type = ?";
            $params[] = $type;
        }
        $sql .= " ORDER BY created_at DESC LIMIT ?";
        $params[] = $limit;
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getReflectionForEvent($userId, $eventId) {
        $sql = "SELECT * FROM reflection_logs WHERE user_id = ? AND event_id = ? AND reflection_type = 'event' ORDER BY created_at DESC LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId, $eventId]);
        return $stmt->fetch();
    }

    public function updateReflectionForEvent($userId, $eventId, $answer) {
        // Check if exists
        $existing = $this->getReflectionForEvent($userId, $eventId);
        if ($existing) {
            $sql = "UPDATE reflection_logs SET answer = ? WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$answer, $existing['id']]);
        } else {
            return $this->saveReflection($userId, 'event', 'Reflection for event', $answer, $eventId);
        }
    }
}
?>