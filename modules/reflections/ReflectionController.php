<?php
// modules/reflections/ReflectionController.php
require_once __DIR__ . '/ReflectionModel.php';

class ReflectionController {
    private $model;

    public function __construct() {
        $this->model = new ReflectionModel();
        header('Content-Type: application/json');
    }

    // ============================================================
    // SAVE REFLECTION
    // ============================================================

    public function handleSave() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['question']) || empty($data['answer']) || empty($data['type'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }
        $success = $this->model->saveReflection(
            $_SESSION['user_id'],
            $data['type'],
            $data['question'],
            $data['answer'],
            $data['event_id'] ?? null
        );
        echo json_encode(['success' => $success]);
    }

    // ============================================================
    // GET REFLECTIONS
    // ============================================================

    public function handleGet() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $type = $_GET['type'] ?? null;
        $limit = intval($_GET['limit'] ?? 50);
        $reflections = $this->model->getReflections($_SESSION['user_id'], $type, $limit);
        echo json_encode($reflections);
    }

    // ============================================================
    // GET REFLECTION FOR EVENT
    // ============================================================

    public function handleGetEvent() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $eventId = $_GET['event_id'] ?? null;
        if (!$eventId) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing event_id']);
            return;
        }
        $reflection = $this->model->getReflectionForEvent($_SESSION['user_id'], $eventId);
        echo json_encode($reflection ?: null);
    }

    // ============================================================
    // UPDATE REFLECTION FOR EVENT
    // ============================================================

    public function handleUpdateEvent() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['event_id']) || !isset($data['answer'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing event_id or answer']);
            return;
        }
        $success = $this->model->updateReflectionForEvent(
            $_SESSION['user_id'],
            $data['event_id'],
            $data['answer']
        );
        echo json_encode(['success' => $success]);
    }

    // ============================================================
    // GET RANDOM REFLECTION — For the Banner
    // ============================================================

    public function handleGetRandom() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        
        $db = Database::getInstance()->getConnection();
        $sql = "SELECT answer, question, created_at, reflection_type 
                FROM reflection_logs 
                WHERE user_id = ? 
                AND answer IS NOT NULL 
                AND answer != '' 
                ORDER BY RAND() 
                LIMIT 1";
        $stmt = $db->prepare($sql);
        $stmt->execute([$_SESSION['user_id']]);
        $reflection = $stmt->fetch();
        
        if ($reflection) {
            echo json_encode([
                'answer' => $reflection['answer'],
                'question' => $reflection['question'],
                'created_at' => $reflection['created_at'],
                'reflection_type' => $reflection['reflection_type']
            ]);
        } else {
            echo json_encode(null);
        }
    }
}
?>