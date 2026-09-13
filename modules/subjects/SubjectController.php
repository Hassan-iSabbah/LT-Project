<?php
// modules/subjects/SubjectController.php
require_once __DIR__ . '/SubjectModel.php';

class SubjectController {
    private $model;

    public function __construct() {
        $this->model = new SubjectModel();
        header('Content-Type: application/json');
    }

    // ===== SUBJECT ENDPOINTS =====
    public function handleGetSubjects() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $subjects = $this->model->getSubjects($_SESSION['user_id']);
        echo json_encode($subjects);
    }

    public function handleGetSubject() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing subject ID']);
            return;
        }
        $subject = $this->model->getSubject($id, $_SESSION['user_id']);
        if (!$subject) {
            http_response_code(404);
            echo json_encode(['error' => 'Subject not found']);
            return;
        }
        $sessions = $this->model->getSessions($id, $_SESSION['user_id']);
        $subject['sessions'] = $sessions;
        echo json_encode($subject);
    }

    public function handlePostSubject() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        $data['user_id'] = $_SESSION['user_id'];
        $success = $this->model->createSubject($data);
        echo json_encode([
            'success' => $success,
            'id' => $success ? $this->model->lastInsertId() : null
        ]);
    }

    public function handlePutSubject() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing subject ID']);
            return;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        $success = $this->model->updateSubject($id, $_SESSION['user_id'], $data);
        echo json_encode(['success' => $success]);
    }

    public function handleDeleteSubject() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing subject ID']);
            return;
        }
        $success = $this->model->deleteSubject($id, $_SESSION['user_id']);
        echo json_encode(['success' => $success]);
    }

    // ===== SESSION ENDPOINTS =====
    public function handlePostSession() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        $success = $this->model->createSession($data);
        echo json_encode([
            'success' => $success,
            'id' => $success ? $this->model->lastInsertId() : null
        ]);
    }

    public function handleDeleteSession() {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing session ID']);
            return;
        }
        $success = $this->model->deleteSession($id, $_SESSION['user_id']);
        echo json_encode(['success' => $success]);
    }

    // ===== GENERATE EVENTS =====
    // ===== GENERATE EVENTS =====
public function handleGenerateEvents() {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        return;
    }
    
    $subjectId = $_GET['subject_id'] ?? null;
    $startDate = $_GET['start_date'] ?? date('Y-m-d');
    $endDate = $_GET['end_date'] ?? date('Y-m-d', strtotime('+4 weeks'));
    
    if (!$subjectId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing subject_id']);
        return;
    }
    
    // Get the events to generate
    $events = $this->model->generateEventsFromSubject(
        $subjectId,
        $_SESSION['user_id'],
        $startDate,
        $endDate
    );
    
    // Count how many were created
    $created = 0;
    $errors = 0;
    
    // Insert each event into the events table
    foreach ($events as $eventData) {
        // Check if event already exists for this date/hour/subject
        // Use a unique identifier — we'll store subject_id in a new column or use a flag
        // For now, we'll check if an event with same title, date, hour exists
        $existing = $this->checkEventExists(
            $_SESSION['user_id'],
            $eventData['title'],
            $eventData['event_date'],
            $eventData['start_hour']
        );
        
        if (!$existing) {
            $success = $this->createEventFromSubject($eventData, $_SESSION['user_id']);
            if ($success) {
                $created++;
            } else {
                $errors++;
            }
        } else {
            // Skip duplicates
            $errors++;
        }
    }
    
    echo json_encode([
        'success' => true,
        'generated' => count($events),
        'created' => $created,
        'errors' => $errors,
        'events' => $events
    ]);
}

private function checkEventExists($userId, $title, $date, $hour) {
    $sql = "SELECT id FROM events WHERE user_id = ? AND title = ? AND event_date = ? AND start_hour = ?";
    $stmt = $this->model->db->prepare($sql);
    $stmt->execute([$userId, $title, $date, $hour]);
    return $stmt->fetch();
}

private function createEventFromSubject($eventData, $userId) {
    $sql = "INSERT INTO events (user_id, title, description, venue, event_date, start_hour, duration, category_id, priority_id, is_completed, recurrence_rule, recurrence_end_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $this->model->db->prepare($sql);
    return $stmt->execute([
        $userId,
        $eventData['title'],
        $eventData['description'] ?? '',
        $eventData['venue'] ?? '',
        $eventData['event_date'],
        $eventData['start_hour'],
        $eventData['duration'] ?? 1,
        $eventData['category_id'] ?? 1,
        $eventData['priority_id'] ?? 2,
        0, // is_completed
        null, // recurrence_rule (events are individual, not recurring)
        null  // recurrence_end_date
    ]);
}
}
?>