<?php
// modules/events/EventModel.php
class EventModel {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    // ============================================================
    // FETCH EVENTS — WITH DYNAMIC RECURRENCE GENERATION
    // ============================================================

    public function getEventsForUser($userId, $startDate, $endDate) {
        // First, fetch all non-recurring events and the "parent" recurring events
        $sql = "SELECT e.*, 
                       c.name as category_name, 
                       c.color_hex, 
                       p.rank as priority_rank, 
                       p.label as priority_label,
                       e.sync_percentage,
                       e.actual_duration
                FROM events e
                LEFT JOIN categories c ON e.category_id = c.id
                LEFT JOIN priorities p ON e.priority_id = p.id
                WHERE e.user_id = ? 
                AND e.event_date BETWEEN ? AND ?
                AND (e.recurrence_rule IS NULL OR e.recurrence_rule = '')
                ORDER BY e.event_date, e.start_hour, p.rank ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId, $startDate, $endDate]);
        $events = $stmt->fetchAll();

        // Now fetch all recurring event "templates" (events with recurrence_rule set)
        $recurringSql = "SELECT e.*, 
                                c.name as category_name, 
                                c.color_hex, 
                                p.rank as priority_rank, 
                                p.label as priority_label
                         FROM events e
                         LEFT JOIN categories c ON e.category_id = c.id
                         LEFT JOIN priorities p ON e.priority_id = p.id
                         WHERE e.user_id = ? 
                         AND e.recurrence_rule IS NOT NULL 
                         AND e.recurrence_rule != ''
                         ORDER BY e.event_date, e.start_hour";
        $recurringStmt = $this->db->prepare($recurringSql);
        $recurringStmt->execute([$userId]);
        $recurringEvents = $recurringStmt->fetchAll();

        // Generate dynamic recurring events for the date range
        $dynamicEvents = [];
        foreach ($recurringEvents as $template) {
            $generated = $this->generateRecurringEventsForRange($template, $startDate, $endDate);
            $dynamicEvents = array_merge($dynamicEvents, $generated);
        }

        // Merge and sort events
        $allEvents = array_merge($events, $dynamicEvents);
        usort($allEvents, function($a, $b) {
            if ($a['event_date'] !== $b['event_date']) {
                return strcmp($a['event_date'], $b['event_date']);
            }
            return ($a['start_hour'] ?? 0) - ($b['start_hour'] ?? 0);
        });

        // Remove duplicates (events with same date, hour, title)
        $seen = [];
        $uniqueEvents = [];
        foreach ($allEvents as $ev) {
            $key = $ev['event_date'] . '_' . $ev['start_hour'] . '_' . $ev['title'];
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $uniqueEvents[] = $ev;
            }
        }

        return $uniqueEvents;
    }

    // ============================================================
    // GENERATE RECURRING EVENTS FOR A DATE RANGE
    // ============================================================

    public function generateRecurringEventsForRange($template, $startDate, $endDate) {
        $generated = [];
        
        if (empty($template['recurrence_rule'])) {
            return $generated;
        }

        // Parse recurrence rule
        $parts = explode(':', $template['recurrence_rule']);
        $type = $parts[0] ?? 'WEEKLY';
        $interval = intval($parts[1] ?? 1);

        $start = new DateTime($startDate);
        $end = new DateTime($endDate);
        $end->modify('+1 day');

        $templateDate = new DateTime($template['event_date']);
        $current = clone $start;

        // For weekly recurrence, find the next occurrence of the same day of week
        if ($type === 'WEEKLY') {
            $templateDayOfWeek = $templateDate->format('N');
            $currentDayOfWeek = $current->format('N');
            $diff = ($templateDayOfWeek - $currentDayOfWeek + 7) % 7;
            if ($diff > 0) {
                $current->modify("+{$diff} days");
            }
        }

        // If the template has an end date, respect it
        $templateEndDate = null;
        if (!empty($template['recurrence_end_date'])) {
            $templateEndDate = new DateTime($template['recurrence_end_date']);
        }

        while ($current <= $end) {
            // Check against template end date
            if ($templateEndDate && $current > $templateEndDate) {
                break;
            }

            // Skip if this date matches the template's original date (the template itself is already in the DB)
            if ($current->format('Y-m-d') === $templateDate->format('Y-m-d')) {
                if ($type === 'WEEKLY') {
                    $current->modify('+' . $interval . ' week');
                } else {
                    $current->modify('+' . $interval . ' day');
                }
                continue;
            }

            // Create a dynamic event for this occurrence
            $event = $template;
            $event['event_date'] = $current->format('Y-m-d');
            $event['is_dynamic'] = true;
            $generated[] = $event;

            // Move to next interval
            if ($type === 'WEEKLY') {
                $current->modify('+' . $interval . ' week');
            } else {
                $current->modify('+' . $interval . ' day');
            }
        }

        return $generated;
    }

    // ============================================================
    // CREATE EVENT
    // ============================================================

    public function createEvent($data) {
        $sql = "INSERT INTO events (user_id, title, description, venue, event_date, start_hour, duration, category_id, priority_id, is_completed, recurrence_rule, recurrence_end_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        
        $success = $stmt->execute([
            $data['user_id'],
            $data['title'],
            $data['description'] ?? '',
            $data['venue'] ?? '',
            $data['event_date'],
            $data['start_hour'],
            $data['duration'] ?? 1,
            $data['category_id'] ?? 1,
            $data['priority_id'] ?? 2,
            $data['is_completed'] ?? 0,
            $data['recurrence_rule'] ?? null,
            $data['recurrence_end_date'] ?? null
        ]);
        
        return $success;
    }

    public function getEventById($id, $userId) {
        $sql = "SELECT * FROM events WHERE id = ? AND user_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id, $userId]);
        return $stmt->fetch();
    }

    // ============================================================
    // UPDATE EVENT
    // ============================================================

    public function updateEvent($id, $userId, $data) {
        $existing = $this->getEventById($id, $userId);
        if (!$existing) {
            return false;
        }

        $sql = "UPDATE events SET
                    title = ?,
                    description = ?,
                    venue = ?,
                    event_date = ?,
                    start_hour = ?,
                    duration = ?,
                    category_id = ?,
                    priority_id = ?,
                    is_completed = ?,
                    recurrence_rule = ?,
                    recurrence_end_date = ?
                WHERE id = ? AND user_id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            $data['title'],
            $data['description'] ?? '',
            $data['venue'] ?? '',
            $data['event_date'],
            $data['start_hour'],
            $data['duration'] ?? 1,
            $data['category_id'] ?? 1,
            $data['priority_id'] ?? 2,
            $data['is_completed'] ?? 0,
            $data['recurrence_rule'] ?? null,
            $data['recurrence_end_date'] ?? null,
            $id,
            $userId
        ]);
    }

    // ============================================================
    // DELETE EVENT
    // ============================================================

    public function deleteEvent($id, $userId) {
        $sql = "DELETE FROM events WHERE id = ? AND user_id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$id, $userId]);
    }

    public function toggleComplete($id, $userId) {
        $sql = "UPDATE events SET is_completed = NOT is_completed WHERE id = ? AND user_id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$id, $userId]);
    }

    public function updateSyncData($eventId, $userId, $actualDuration, $syncPercentage) {
        $sql = "UPDATE events 
                SET actual_duration = ?, sync_percentage = ?, is_completed = 1 
                WHERE id = ? AND user_id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$actualDuration, $syncPercentage, $eventId, $userId]);
    }

    public function getSyncData($eventId, $userId) {
        $sql = "SELECT duration, actual_duration, sync_percentage, is_completed 
                FROM events 
                WHERE id = ? AND user_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$eventId, $userId]);
        return $stmt->fetch();
    }

    // ============================================================
    // GOAL PROGRESS RECALCULATION (when event is toggled/completed)
    // ============================================================

    public function recalculateGoalProgress($eventId, $userId) {
        // Find which goal this event is linked to
        $sql = "SELECT goal_id FROM event_goal_links WHERE event_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$eventId]);
        $link = $stmt->fetch();
        
        if (!$link) {
            return; // No goal linked
        }
        
        // Load the GoalModel to recalculate progress
        require_once __DIR__ . '/../goals/GoalModel.php';
        $goalModel = new GoalModel();
        $goalModel->calculateProgress($link['goal_id'], $userId);
    }

    public function lastInsertId() {
        return $this->db->lastInsertId();
    }

    public function findNextAvailableSlot($userId, $startHour, $date, $maxDays = 7) {
        $current = new DateTime($date);
        for ($i = 1; $i <= $maxDays; $i++) {
            $current->modify('+1 weekday');
            $checkDate = $current->format('Y-m-d');
            $sql = "SELECT COUNT(*) as count FROM events
                    WHERE user_id = ? AND event_date = ? AND start_hour = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$userId, $checkDate, $startHour]);
            $result = $stmt->fetch();
            if ($result['count'] == 0) {
                return ['date' => $checkDate, 'hour' => $startHour];
            }
        }
        return null;
    }
}
?>