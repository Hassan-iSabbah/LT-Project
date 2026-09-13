<?php
// modules/goals/GoalController.php
require_once __DIR__ . '/GoalModel.php';

class GoalController {
    private $model;

    public function __construct() {
        $this->model = new GoalModel();
        header('Content-Type: application/json');
    }

    // ============================================================
    // GET — List goals with filters
    // ============================================================

    public function handleGet() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $id = $_GET['id'] ?? null;
        $action = $_GET['action'] ?? null;

        if ($id) {
            $this->handleGetSingle($id);
            return;
        }

        if ($action === 'neglected') {
            $this->handleGetNeglected();
            return;
        }

        if ($action === 'tree') {
            $this->handleGetTree();
            return;
        }

        $filters = [
            'status' => $_GET['status'] ?? 'all',
            'category' => $_GET['category'] ?? 'all',
            'parent' => $_GET['parent'] ?? null,
            'archived' => isset($_GET['archived']) ? (int)$_GET['archived'] : 0
        ];

        $goals = $this->model->getByUser($_SESSION['user_id'], $filters);
        echo json_encode($goals);
    }

    private function handleGetSingle($id) {
        $goal = $this->model->getGoalTree($id, $_SESSION['user_id']);
        if (!$goal) {
            http_response_code(404);
            echo json_encode(['error' => 'Goal not found']);
            return;
        }
        $goal['linked_events'] = $this->model->getLinkedEvents($id, $_SESSION['user_id']);
        echo json_encode($goal);
    }

    private function handleGetTree() {
        $goalId = $_GET['goal_id'] ?? null;
        if (!$goalId) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing goal_id']);
            return;
        }
        $tree = $this->model->getGoalTree($goalId, $_SESSION['user_id']);
        echo json_encode($tree);
    }

    private function handleGetNeglected() {
        $goals = $this->model->getGoalsWithNeglectedEvents($_SESSION['user_id']);
        $events = $this->model->getNeglectedEvents($_SESSION['user_id']);
        echo json_encode([
            'goals' => $goals,
            'events' => $events
        ]);
    }

    // ============================================================
    // POST — Create goal
    // ============================================================

    public function handlePost() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['title'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Title is required']);
            return;
        }

        $data['user_id'] = $_SESSION['user_id'];
        $success = $this->model->create($data);
        echo json_encode([
            'success' => $success,
            'id' => $success ? $this->model->lastInsertId() : null
        ]);
    }

    // ============================================================
    // PUT — Update goal
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
            echo json_encode(['error' => 'Missing goal ID']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $success = $this->model->update($id, $_SESSION['user_id'], $data);

        if ($success && isset($data['progress'])) {
            // Recalculate progress for parent goals
            $this->model->calculateProgress($id, $_SESSION['user_id']);
        }

        echo json_encode(['success' => $success]);
    }

    // ============================================================
    // DELETE — Delete goal
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
            echo json_encode(['error' => 'Missing goal ID']);
            return;
        }

        $success = $this->model->delete($id, $_SESSION['user_id']);
        echo json_encode(['success' => $success]);
    }

    // ============================================================
    // POST — Archive goal
    // ============================================================

    public function handleArchive() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing goal ID']);
            return;
        }

        $isArchived = $_GET['archived'] ?? 1;
        $success = $this->model->update($id, $_SESSION['user_id'], ['is_archived' => $isArchived]);
        echo json_encode(['success' => $success]);
    }

    // ============================================================
    // POST — Link event to goal
    // ============================================================

    public function handleLinkEvent() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['event_id']) || empty($data['goal_id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing event_id or goal_id']);
            return;
        }

        $success = $this->model->linkEvent($data['event_id'], $data['goal_id'], $_SESSION['user_id']);
        echo json_encode(['success' => $success]);
    }

    // ============================================================
    // DELETE — Unlink event from goal
    // ============================================================

    public function handleUnlinkEvent() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $eventId = $_GET['event_id'] ?? null;
        $goalId = $_GET['goal_id'] ?? null;
        if (!$eventId || !$goalId) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing event_id or goal_id']);
            return;
        }

        $success = $this->model->unlinkEvent($eventId, $goalId, $_SESSION['user_id']);
        echo json_encode(['success' => $success]);
    }

    // ============================================================
    // POST — Recalculate progress
    // ============================================================

    public function handleRecalculate() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing goal ID']);
            return;
        }

        $progress = $this->model->calculateProgress($id, $_SESSION['user_id']);
        echo json_encode([
            'success' => true,
            'progress' => $progress
        ]);
    }
}
?>