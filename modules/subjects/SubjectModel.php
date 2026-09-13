<?php
// modules/subjects/SubjectModel.php
class SubjectModel {
    public $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    // ===== SUBJECT CRUD =====
    public function getSubjects($userId) {
        $sql = "SELECT s.*, c.name as category_name, c.color_hex, p.rank as priority_rank, p.label as priority_label
                FROM subjects s
                LEFT JOIN categories c ON s.category_id = c.id
                LEFT JOIN priorities p ON s.priority_id = p.id
                WHERE s.user_id = ?
                ORDER BY s.name ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $subjects = $stmt->fetchAll();
        
        // Fetch sessions for each subject
        foreach ($subjects as &$subject) {
            $subject['sessions'] = $this->getSessions($subject['id'], $userId);
        }
        
        return $subjects;
    }

    public function getSubject($id, $userId) {
        $sql = "SELECT s.*, c.name as category_name, c.color_hex, p.rank as priority_rank, p.label as priority_label
                FROM subjects s
                LEFT JOIN categories c ON s.category_id = c.id
                LEFT JOIN priorities p ON s.priority_id = p.id
                WHERE s.id = ? AND s.user_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id, $userId]);
        return $stmt->fetch();
    }

    public function createSubject($data) {
        $sql = "INSERT INTO subjects (user_id, name, full_name, category_id, priority_id, color_hex, description)
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            $data['user_id'],
            $data['name'],
            $data['full_name'] ?? '',
            $data['category_id'] ?? 1,
            $data['priority_id'] ?? 2,
            $data['color_hex'] ?? '#58A6FF',
            $data['description'] ?? ''
        ]);
    }

    public function updateSubject($id, $userId, $data) {
        $sql = "UPDATE subjects SET
                    name = ?,
                    full_name = ?,
                    category_id = ?,
                    priority_id = ?,
                    color_hex = ?,
                    description = ?
                WHERE id = ? AND user_id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            $data['name'],
            $data['full_name'] ?? '',
            $data['category_id'] ?? 1,
            $data['priority_id'] ?? 2,
            $data['color_hex'] ?? '#58A6FF',
            $data['description'] ?? '',
            $id,
            $userId
        ]);
    }

    public function deleteSubject($id, $userId) {
        $sql = "DELETE FROM subjects WHERE id = ? AND user_id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$id, $userId]);
    }

    // ===== SESSION CRUD =====
    public function getSessions($subjectId, $userId) {
        $sql = "SELECT ss.*, s.user_id
                FROM subject_sessions ss
                JOIN subjects s ON ss.subject_id = s.id
                WHERE ss.subject_id = ? AND s.user_id = ?
                ORDER BY ss.day_of_week, ss.start_hour";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$subjectId, $userId]);
        return $stmt->fetchAll();
    }

    public function getSession($id, $userId) {
        $sql = "SELECT ss.*, s.user_id
                FROM subject_sessions ss
                JOIN subjects s ON ss.subject_id = s.id
                WHERE ss.id = ? AND s.user_id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id, $userId]);
        return $stmt->fetch();
    }

    public function createSession($data) {
        $sql = "INSERT INTO subject_sessions (subject_id, day_of_week, start_hour, duration, venue, start_date, end_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            $data['subject_id'],
            $data['day_of_week'],
            $data['start_hour'],
            $data['duration'] ?? 1,
            $data['venue'] ?? '',
            $data['start_date'],
            $data['end_date'] ?? null
        ]);
    }

    public function updateSession($id, $userId, $data) {
        $sql = "UPDATE subject_sessions ss
                JOIN subjects s ON ss.subject_id = s.id
                SET ss.day_of_week = ?,
                    ss.start_hour = ?,
                    ss.duration = ?,
                    ss.venue = ?,
                    ss.start_date = ?,
                    ss.end_date = ?
                WHERE ss.id = ? AND s.user_id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            $data['day_of_week'],
            $data['start_hour'],
            $data['duration'] ?? 1,
            $data['venue'] ?? '',
            $data['start_date'],
            $data['end_date'] ?? null,
            $id,
            $userId
        ]);
    }

    public function deleteSession($id, $userId) {
        $sql = "DELETE ss FROM subject_sessions ss
                JOIN subjects s ON ss.subject_id = s.id
                WHERE ss.id = ? AND s.user_id = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$id, $userId]);
    }

    // ===== GENERATE EVENTS FROM SUBJECT SESSIONS =====
    public function generateEventsFromSubject($subjectId, $userId, $startDate, $endDate) {
        $sessions = $this->getSessions($subjectId, $userId);
        $subject = $this->getSubject($subjectId, $userId);
        
        if (!$subject || empty($sessions)) {
            return [];
        }

        $events = [];
        $start = new DateTime($startDate);
        $end = new DateTime($endDate);
        $end->modify('+1 day');

        foreach ($sessions as $session) {
            $current = clone $start;
            $dayOfWeek = $session['day_of_week'];
            
            $currentDay = (int)$current->format('N') - 1;
            $diff = ($dayOfWeek - $currentDay + 7) % 7;
            if ($diff > 0) {
                $current->modify("+{$diff} days");
            }

            while ($current < $end) {
                if ($session['end_date']) {
                    $sessionEnd = new DateTime($session['end_date']);
                    if ($current > $sessionEnd) {
                        break;
                    }
                }

                $dateStr = $current->format('Y-m-d');
                $events[] = [
                    'title' => $subject['name'],
                    'description' => $subject['description'],
                    'venue' => $session['venue'],
                    'event_date' => $dateStr,
                    'start_hour' => $session['start_hour'],
                    'duration' => $session['duration'],
                    'category_id' => $subject['category_id'],
                    'priority_id' => $subject['priority_id'],
                    'color_hex' => $subject['color_hex'],
                    'category_name' => $subject['category_name'],
                    'priority_rank' => $subject['priority_rank'],
                    'priority_label' => $subject['priority_label'],
                ];

                $current->modify('+7 days');
            }
        }

        return $events;
    }

    public function lastInsertId() {
        return $this->db->lastInsertId();
    }
}
?>