<?php
// modules/hindsight/HindsightModel.php
class HindsightModel {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Get past events with SQL filters applied
     * All filtering happens in the database — no PHP array filtering
     */
    public function getPastEvents($userId, $filters = []) {
        // Build the base query with ? placeholders
        $sql = "SELECT e.*, 
                       c.name as category_name, 
                       c.color_hex, 
                       p.rank as priority_rank, 
                       p.label as priority_label,
                       e.sync_percentage,
                       e.actual_duration,
                       (SELECT answer FROM reflection_logs r 
                        WHERE r.event_id = e.id 
                        AND r.reflection_type = 'event' 
                        AND r.user_id = ?
                        ORDER BY r.created_at DESC LIMIT 1) as reflection
                FROM events e
                LEFT JOIN categories c ON e.category_id = c.id
                LEFT JOIN priorities p ON e.priority_id = p.id
                WHERE e.user_id = ? 
                AND e.event_date < CURDATE()
                AND (e.recurrence_rule IS NULL OR e.recurrence_rule = '')";

        // Parameters array — start with the subquery user_id and main user_id
        $params = [];
        $params[] = $userId; // For the subquery
        $params[] = $userId; // For the main WHERE clause

        // --- Apply SQL Filters ---

        // 1. Search filter (title, venue, description)
        if (!empty($filters['search'])) {
            $sql .= " AND (e.title LIKE ? OR e.venue LIKE ? OR e.description LIKE ?)";
            $searchTerm = '%' . $filters['search'] . '%';
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        // 2. Category filter
        if (!empty($filters['category']) && $filters['category'] !== 'all') {
            $sql .= " AND c.name = ?";
            $params[] = $filters['category'];
        }

        // 3. Recurrence filter
        if (!empty($filters['recurrence']) && $filters['recurrence'] !== 'all') {
            if ($filters['recurrence'] === 'recurring') {
                $sql .= " AND e.recurrence_rule IS NOT NULL AND e.recurrence_rule != ''";
            } elseif ($filters['recurrence'] === 'once-off') {
                $sql .= " AND (e.recurrence_rule IS NULL OR e.recurrence_rule = '')";
            }
        }

        // 4. Completion filter
        if (!empty($filters['completion']) && $filters['completion'] !== 'all') {
            $sql .= " AND e.is_completed = ?";
            $params[] = ($filters['completion'] === 'completed') ? 1 : 0;
        }

        // 5. Date range filter
        if (!empty($filters['date_range']) && $filters['date_range'] !== 'all') {
            $now = new DateTime();
            $cutoff = clone $now;

            switch ($filters['date_range']) {
                case '7days':
                    $cutoff->modify('-7 days');
                    break;
                case '30days':
                    $cutoff->modify('-30 days');
                    break;
                case '90days':
                    $cutoff->modify('-90 days');
                    break;
                case 'custom':
                    if (!empty($filters['custom_start_date'])) {
                        $cutoff = new DateTime($filters['custom_start_date']);
                    }
                    break;
                default:
                    // No date filter
                    break;
            }

            if ($cutoff) {
                $sql .= " AND e.event_date >= ?";
                $params[] = $cutoff->format('Y-m-d');
            }
        }

        // Order by most recent first
        $sql .= " ORDER BY e.event_date DESC, e.start_hour DESC";

        // Execute the query using positional placeholders
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $events = $stmt->fetchAll();

        // Return with count
        return [
            'events' => $events,
            'count' => count($events)
        ];
    }

    /**
     * Get a single event with its reflection
     */
    public function getEventWithReflection($eventId, $userId) {
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
                WHERE e.id = ? AND e.user_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$eventId, $userId]);
        $event = $stmt->fetch();

        if ($event) {
            $refSql = "SELECT * FROM reflection_logs 
                       WHERE event_id = ? AND user_id = ? AND reflection_type = 'event'
                       ORDER BY created_at DESC";
            $refStmt = $this->db->prepare($refSql);
            $refStmt->execute([$eventId, $userId]);
            $event['reflections'] = $refStmt->fetchAll();
        }

        return $event;
    }

    /**
     * Get available categories for filter dropdown
     */
    public function getCategories($userId) {
        $sql = "SELECT DISTINCT c.id, c.name, c.color_hex
                FROM categories c
                JOIN events e ON e.category_id = c.id
                WHERE e.user_id = ? AND e.event_date < CURDATE()
                ORDER BY c.name";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    /**
     * Get filter stats (counts by category, completion, recurrence)
     */
    public function getFilterStats($userId) {
        $stats = [];

        // Total past events
        $sql = "SELECT COUNT(*) as total FROM events 
                WHERE user_id = ? AND event_date < CURDATE()
                AND (recurrence_rule IS NULL OR recurrence_rule = '')";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $stats['total'] = $stmt->fetchColumn();

        // Completed vs Incomplete
        $sql = "SELECT 
                    SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN is_completed = 0 THEN 1 ELSE 0 END) as incomplete
                FROM events 
                WHERE user_id = ? AND event_date < CURDATE()
                AND (recurrence_rule IS NULL OR recurrence_rule = '')";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $stats['completion'] = $stmt->fetch();

        // Count by category
        $sql = "SELECT c.name, COUNT(*) as count
                FROM events e
                JOIN categories c ON e.category_id = c.id
                WHERE e.user_id = ? AND e.event_date < CURDATE()
                AND (e.recurrence_rule IS NULL OR e.recurrence_rule = '')
                GROUP BY c.name
                ORDER BY count DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $stats['categories'] = $stmt->fetchAll();

        return $stats;
    }

    /**
     * Get filter options for the frontend
     */
    public function getFilterOptions($userId) {
        $options = [];

        // Categories
        $options['categories'] = $this->getCategories($userId);

        // Date range presets
        $options['date_ranges'] = [
            ['value' => 'all', 'label' => 'All Time'],
            ['value' => '7days', 'label' => 'Last 7 Days'],
            ['value' => '30days', 'label' => 'Last 30 Days'],
            ['value' => '90days', 'label' => 'Last 3 Months'],
            ['value' => 'custom', 'label' => 'Custom']
        ];

        // Recurrence options
        $options['recurrence_options'] = [
            ['value' => 'all', 'label' => 'All Events'],
            ['value' => 'recurring', 'label' => 'Recurring'],
            ['value' => 'once-off', 'label' => 'Once-off']
        ];

        // Completion options
        $options['completion_options'] = [
            ['value' => 'all', 'label' => 'All Status'],
            ['value' => 'completed', 'label' => 'Completed'],
            ['value' => 'incomplete', 'label' => 'Incomplete']
        ];

        return $options;
    }
}
?>