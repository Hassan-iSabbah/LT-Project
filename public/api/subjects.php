<?php
// public/api/subjects.php
require_once __DIR__ . '/../../autoloader.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$controller = new SubjectController();

switch ($method) {
    case 'GET':
        if ($action === 'generate') {
            $controller->handleGenerateEvents();
        } elseif (isset($_GET['id'])) {
            $controller->handleGetSubject();
        } else {
            $controller->handleGetSubjects();
        }
        break;
    
    case 'POST':
        if ($action === 'session') {
            $controller->handlePostSession();
        } else {
            $controller->handlePostSubject();
        }
        break;
    
    case 'PUT':
        $controller->handlePutSubject();
        break;
    
    case 'DELETE':
        if ($action === 'session') {
            $controller->handleDeleteSession();
        } else {
            $controller->handleDeleteSubject();
        }
        break;
    
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
?>