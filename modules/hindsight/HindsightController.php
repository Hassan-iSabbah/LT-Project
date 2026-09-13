<?php
// modules/hindsight/HindsightController.php
require_once __DIR__ . '/HindsightModel.php';

class HindsightController {
    private $model;

    public function __construct() {
        $this->model = new HindsightModel();
        header('Content-Type: application/json');
    }

    /**
     * GET /api/hindsight.php
     * Returns past events with SQL filters applied
     */
    public function handleGet() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        // Collect filters from GET parameters
        $filters = [
            'search' => $_GET['search'] ?? '',
            'category' => $_GET['category'] ?? 'all',
            'recurrence' => $_GET['recurrence'] ?? 'all',
            'completion' => $_GET['completion'] ?? 'all',
            'date_range' => $_GET['date_range'] ?? 'all',
            'custom_start_date' => $_GET['custom_start_date'] ?? null
        ];

        // Get filtered events (SQL does the heavy lifting)
        $result = $this->model->getPastEvents($_SESSION['user_id'], $filters);
        
        // Get filter stats
        $stats = $this->model->getFilterStats($_SESSION['user_id']);
        
        // Get filter options for the UI
        $options = $this->model->getFilterOptions($_SESSION['user_id']);
        
        echo json_encode([
            'events' => $result['events'],
            'count' => $result['count'],
            'total' => $stats['total'] ?? 0,
            'stats' => $stats,
            'filters' => $filters,
            'options' => $options
        ]);
    }

    /**
     * GET /api/hindsight.php?action=event&id=N
     */
    public function handleGetEvent() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $eventId = $_GET['id'] ?? null;
        if (!$eventId) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing event ID']);
            return;
        }

        $event = $this->model->getEventWithReflection($eventId, $_SESSION['user_id']);
        if (!$event) {
            http_response_code(404);
            echo json_encode(['error' => 'Event not found']);
            return;
        }

        echo json_encode($event);
    }

    /**
     * GET /api/hindsight.php?action=options
     * Returns filter options for the UI
     */
    public function handleGetOptions() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $options = $this->model->getFilterOptions($_SESSION['user_id']);
        echo json_encode($options);
    }

    /**
     * GET /api/hindsight.php?action=stats
     */
    public function handleGetStats() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $stats = $this->model->getFilterStats($_SESSION['user_id']);
        echo json_encode($stats);
    }
}
?>