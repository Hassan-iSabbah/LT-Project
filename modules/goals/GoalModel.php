<?php
// modules/goals/GoalModel.php
class GoalModel {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    // ============================================================
    // CRUD OPERATIONS
    // ============================================================

    public function create($data) {
        $sql = "INSERT INTO goals (user_id, parent_goal_id, category_id, title, description, status)
                VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            $data['user_id'],
            $data['parent_goal_id'] ?? null,
            $data['category_id'] ?? null,
            $data['title'],
            $data['description'] ?? '',
            $data['status'] ?? 'not_started'
        ]);
    }

    public function getById($id, $userId) {
        $sql = "SELECT g.*, c.name as category_name, c.color_hex
                FROM goals g
                LEFT JOIN categories c ON g.category_id = c.id
                WHERE g.id = ? AND g.user_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id, $userId]);
        return $stmt->fetch();
    }

    public function getByUser($userId, $filters = []) {
        $sql = "SELECT g.*, c.name as category_name, c.color_hex,
                       (SELECT COUNT(*) FROM goals WHERE parent_goal_id = g.id) as sub_goal_count
                FROM goals g
                LEFT JOIN categories c ON g.category_id = c.id
                WHERE g.user_id = ?";

        $params = [$userId];

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $sql .= " AND g.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['category']) && $filters['category'] !== 'all') {
            $sql .= " AND g.category_id = ?";
            $params[] = $filters['category'];
        }

        if (!empty($filters['archived'])) {
            $sql .= " AND g.is_archived = ?";
            $params[] = $filters['archived'];
        } else {
            $sql .= " AND g.is_archived = 0";
        }

        if (!empty($filters['parent'])) {
            if ($filters['parent'] === 'root') {
                $sql .= " AND g.parent_goal_id IS NULL";
            } else {
                $sql .= " AND g.parent_goal_id = ?";
                $params[] = $filters['parent'];
            }
        }

        $sql .= " ORDER BY g.created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function update($id, $userId, $data) {
        $fields = [];
        $params = [];

        $allowed = ['parent_goal_id', 'category_id', 'title', 'description', 'status', 'progress', 'is_archived'];
        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = ?";
                $params[] = $data[$field];
            }
        }

        if (empty($fields)) {
            return false;
        }

        $params[] = $id;
        $params[] = $userId;

        $sql = "UPDATE goals SET " . implode(', ', $fields) . " WHERE id = ? AND user_id = ?";
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute($params);

        // If progress was updated, check for auto-completion
        if ($success && isset($data['progress'])) {
            $goal = $this->getById($id, $userId);
            if ($goal && $goal['progress'] >= 100 && $goal['status'] !== 'completed') {
                $this->autoComplete($id, $userId);
            }
            // Also recalculate parent goals
            if ($goal && $goal['parent_goal_id']) {
                $this->calculateProgress($goal['parent_goal_id'], $userId);
            }
        }

        return $success;
    }

    public function delete($id, $userId) {
        $sql = "DELETE FROM goals WHERE id = ? AND user_id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$id, $userId]);
    }

    // ============================================================
    // NESTING METHODS
    // ============================================================

    public function getSubGoals($goalId, $userId) {
        $sql = "SELECT g.*, c.name as category_name, c.color_hex
                FROM goals g
                LEFT JOIN categories c ON g.category_id = c.id
                WHERE g.parent_goal_id = ? AND g.user_id = ? AND g.is_archived = 0
                ORDER BY g.created_at";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$goalId, $userId]);
        return $stmt->fetchAll();
    }

    public function getGoalTree($goalId, $userId) {
        $goal = $this->getById($goalId, $userId);
        if (!$goal) {
            return null;
        }
        $goal['sub_goals'] = $this->getSubGoals($goalId, $userId);
        foreach ($goal['sub_goals'] as &$sub) {
            $sub['sub_goals'] = $this->getSubGoals($sub['id'], $userId);
        }
        return $goal;
    }

    public function getRootGoals($userId, $filters = []) {
        $filters['parent'] = 'root';
        return $this->getByUser($userId, $filters);
    }

    public function getParentGoal($goalId, $userId) {
        $goal = $this->getById($goalId, $userId);
        if (!$goal || !$goal['parent_goal_id']) {
            return null;
        }
        return $this->getById($goal['parent_goal_id'], $userId);
    }

    // ============================================================
    // PROGRESS CALCULATION
    // ============================================================

    public function calculateProgress($goalId, $userId) {
        $goal = $this->getById($goalId, $userId);
        if (!$goal) {
            return 0;
        }

        $subGoals = $this->getSubGoals($goalId, $userId);

        if (count($subGoals) > 0) {
            $total = count($subGoals);
            $completed = 0;
            foreach ($subGoals as $sub) {
                if ($sub['status'] === 'completed') {
                    $completed++;
                }
            }
            $progress = ($total > 0) ? round(($completed / $total) * 100, 2) : 0;
        } else {
            $linkedEvents = $this->getLinkedEvents($goalId, $userId);
            $total = count($linkedEvents);
            if ($total === 0) {
                $progress = 0;
            } else {
                $completed = 0;
                foreach ($linkedEvents as $event) {
                    if ($event['is_completed']) {
                        $completed++;
                    }
                }
                $progress = round(($completed / $total) * 100, 2);
            }
        }

        $this->update($goalId, $userId, ['progress' => $progress]);

        if ($progress >= 100) {
            $this->autoComplete($goalId, $userId);
        }

        return $progress;
    }

    // ============================================================
    // AUTO-COMPLETION
    // ============================================================

    public function autoComplete($goalId, $userId) {
        $goal = $this->getById($goalId, $userId);
        if (!$goal || $goal['status'] === 'completed') {
            return false;
        }

        return $this->update($goalId, $userId, [
            'status' => 'completed',
            'completed_at' => date('Y-m-d H:i:s')
        ]);
    }

    // ============================================================
    // EVENT LINKING
    // ============================================================

    public function linkEvent($eventId, $goalId, $userId) {
        $eventCheck = $this->db->prepare("SELECT id FROM events WHERE id = ? AND user_id = ?");
        $eventCheck->execute([$eventId, $userId]);
        if (!$eventCheck->fetch()) {
            return false;
        }

        $goalCheck = $this->db->prepare("SELECT id FROM goals WHERE id = ? AND user_id = ?");
        $goalCheck->execute([$goalId, $userId]);
        if (!$goalCheck->fetch()) {
            return false;
        }

        // Check if already linked
        $linkCheck = $this->db->prepare("SELECT id FROM event_goal_links WHERE event_id = ? AND goal_id = ?");
        $linkCheck->execute([$eventId, $goalId]);
        if ($linkCheck->fetch()) {
            return true; // Already linked
        }

        $sql = "INSERT INTO event_goal_links (event_id, goal_id) VALUES (?, ?)";
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute([$eventId, $goalId]);

        // Recalculate progress for the goal
        if ($success) {
            $this->calculateProgress($goalId, $userId);
        }

        return $success;
    }

    public function unlinkEvent($eventId, $goalId, $userId) {
        $sql = "DELETE egl FROM event_goal_links egl
                JOIN events e ON egl.event_id = e.id
                JOIN goals g ON egl.goal_id = g.id
                WHERE egl.event_id = ? AND egl.goal_id = ? AND e.user_id = ? AND g.user_id = ?";
        $stmt = $this->db->prepare($sql);
        $success = $stmt->execute([$eventId, $goalId, $userId, $userId]);

        if ($success) {
            $this->calculateProgress($goalId, $userId);
        }

        return $success;
    }

    public function getLinkedEvents($goalId, $userId) {
        $sql = "SELECT e.*, c.name as category_name, c.color_hex
                FROM events e
                JOIN event_goal_links egl ON e.id = egl.event_id
                LEFT JOIN categories c ON e.category_id = c.id
                WHERE egl.goal_id = ? AND e.user_id = ?
                ORDER BY e.event_date DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$goalId, $userId]);
        return $stmt->fetchAll();
    }

    public function getLinkedGoal($eventId, $userId) {
        $sql = "SELECT g.*
                FROM goals g
                JOIN event_goal_links egl ON g.id = egl.goal_id
                WHERE egl.event_id = ? AND g.user_id = ?
                LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$eventId, $userId]);
        return $stmt->fetch();
    }

    public function getGoalsWithLinkedEvents($userId) {
        $sql = "SELECT DISTINCT g.*, c.name as category_name, c.color_hex
                FROM goals g
                JOIN event_goal_links egl ON g.id = egl.goal_id
                LEFT JOIN categories c ON g.category_id = c.id
                WHERE g.user_id = ? AND g.is_archived = 0
                ORDER BY g.title";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    // ============================================================
    // NEGLECTED EVENTS
    // ============================================================

    public function getNeglectedEvents($userId) {
        $sql = "SELECT e.*, g.id as goal_id, g.title as goal_title, c.name as category_name, c.color_hex
                FROM events e
                JOIN event_goal_links egl ON e.id = egl.event_id
                JOIN goals g ON egl.goal_id = g.id
                LEFT JOIN categories c ON e.category_id = c.id
                WHERE e.user_id = ? 
                AND e.event_date < CURDATE()
                AND e.is_completed = 0
                AND g.is_archived = 0
                ORDER BY e.event_date ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public function getGoalsWithNeglectedEvents($userId) {
        $sql = "SELECT g.*, c.name as category_name, c.color_hex,
                       COUNT(e.id) as neglected_count
                FROM goals g
                JOIN event_goal_links egl ON g.id = egl.goal_id
                JOIN events e ON egl.event_id = e.id
                LEFT JOIN categories c ON g.category_id = c.id
                WHERE e.user_id = ?
                AND e.event_date < CURDATE()
                AND e.is_completed = 0
                AND g.is_archived = 0
                GROUP BY g.id
                ORDER BY neglected_count DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    // ============================================================
    // UTILITY
    // ============================================================

    public function lastInsertId() {
        return $this->db->lastInsertId();
    }
}
?>