<?php
// modules/events/EventController.php
require_once __DIR__ . '/EventModel.php';

class EventController {
    private $model;

    public function __construct() {
        $this->model = new EventModel();
        header('Content-Type: application/json');
    }

    // ============================================================
    // GET — Fetch events in date range
    // ============================================================

    public function handleGet() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $start = $_GET['start'] ?? date('Y-m-d');
        $end   = $_GET['end'] ?? date('Y-m-d', strtotime('+7 days'));

        $events = $this->model->getEventsForUser($_SESSION['user_id'], $start, $end);
        echo json_encode($events);
    }

    // ============================================================
    // POST — Create a new event (with recurrence support)
    // ============================================================

    public function handlePost() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON', 'raw' => $raw]);
            return;
        }

        // Validate required fields
        if (empty($data['title']) || empty($data['event_date']) || !isset($data['start_hour'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields: title, event_date, start_hour']);
            return;
        }

        $data['user_id'] = $_SESSION['user_id'];

        // Set defaults if not provided
        $data['duration'] = $data['duration'] ?? 1;
        $data['priority_id'] = $data['priority_id'] ?? 2;
        $data['category_id'] = $data['category_id'] ?? 1;
        $data['description'] = $data['description'] ?? '';
        $data['venue'] = $data['venue'] ?? '';
        $data['is_completed'] = $data['is_completed'] ?? 0;
        $data['recurrence_rule'] = $data['recurrence_rule'] ?? null;
        $data['recurrence_end_date'] = $data['recurrence_end_date'] ?? null;
        $data['parent_event_id'] = $data['parent_event_id'] ?? null;

        $success = $this->model->createEvent($data);

        if ($success) {
            $id = $this->model->lastInsertId();
            echo json_encode([
                'success' => true,
                'id' => $id,
                'message' => 'Event created successfully',
                'recurrence_generated' => !empty($data['recurrence_rule'])
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database insert failed']);
        }
    }

    // ============================================================
    // PUT — Update an existing event (with recurrence regeneration)
    // ============================================================

    public function handlePut() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing event ID']);
            return;
        }

        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON']);
            return;
        }

        // First, fetch the existing event to merge with partial updates
        $existing = $this->model->getEventById($id, $_SESSION['user_id']);
        if (!$existing) {
            http_response_code(404);
            echo json_encode(['error' => 'Event not found']);
            return;
        }

        // Merge: use provided values, fallback to existing
        $merged = array_merge($existing, $data);

        // Ensure required fields are present
        if (empty($merged['title']) || empty($merged['event_date']) || !isset($merged['start_hour'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }

        // Handle recurrence data properly
        if (!isset($merged['recurrence_rule'])) {
            $merged['recurrence_rule'] = null;
        }
        if (!isset($merged['recurrence_end_date'])) {
            $merged['recurrence_end_date'] = null;
        }

        $success = $this->model->updateEvent($id, $_SESSION['user_id'], $merged);

        echo json_encode([
            'success' => $success,
            'message' => $success ? 'Event updated successfully' : 'Update failed'
        ]);
    }

    // ============================================================
    // DELETE — Delete an event (with cascade to children)
    // ============================================================

    public function handleDelete() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing event ID']);
            return;
        }

        $success = $this->model->deleteEvent($id, $_SESSION['user_id']);
        echo json_encode([
            'success' => $success,
            'message' => $success ? 'Event deleted successfully' : 'Delete failed'
        ]);
    }

    // ============================================================
    // POST — Toggle completion status (with goal progress recalculation)
    // ============================================================

    public function handleToggleComplete() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing event ID']);
            return;
        }

        $success = $this->model->toggleComplete($id, $_SESSION['user_id']);
        
        // === RECALCULATE GOAL PROGRESS ===
        if ($success) {
            $this->model->recalculateGoalProgress($id, $_SESSION['user_id']);
        }

        echo json_encode([
            'success' => $success,
            'message' => $success ? 'Completion toggled successfully' : 'Toggle failed'
        ]);
    }

    // ============================================================
    // POST — Complete event with sync data (with goal progress recalculation)
    // ============================================================

    public function handleCompleteWithSync() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $eventId = $data['id'] ?? null;
        $actualDuration = $data['actual_duration'] ?? null;

        if (!$eventId || !$actualDuration || $actualDuration <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing event ID or valid actual duration']);
            return;
        }

        // Get the event to calculate sync %
        $event = $this->model->getEventById($eventId, $_SESSION['user_id']);
        if (!$event) {
            http_response_code(404);
            echo json_encode(['error' => 'Event not found']);
            return;
        }

        $plannedDuration = $event['duration'] * 60; // Convert hours to minutes
        $syncPercentage = min(100, round(($plannedDuration / $actualDuration) * 100, 2));

        $success = $this->model->updateSyncData($eventId, $_SESSION['user_id'], $actualDuration, $syncPercentage);

        // === RECALCULATE GOAL PROGRESS ===
        if ($success) {
            $this->model->recalculateGoalProgress($eventId, $_SESSION['user_id']);
        }

        echo json_encode([
            'success' => $success,
            'sync_percentage' => $syncPercentage,
            'planned_duration' => $plannedDuration,
            'actual_duration' => $actualDuration,
            'message' => $success ? 'Sync data saved successfully' : 'Save failed'
        ]);
    }

    // ============================================================
    // POST — Auto-push (find next available slot)
    // ============================================================

    public function handleAutoPush() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $startHour = $data['start_hour'] ?? 0;
        $date = $data['event_date'] ?? date('Y-m-d');

        $slot = $this->model->findNextAvailableSlot(
            $_SESSION['user_id'],
            $startHour,
            $date
        );

        echo json_encode($slot ?? ['error' => 'No available slot found']);
    }
}
?>