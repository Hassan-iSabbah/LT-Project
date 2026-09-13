<?php
// public/api/events.php
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
$controller = new EventController();

switch ($method) {
    case 'GET':
        $controller->handleGet();
        break;
    case 'POST':
        if ($action === 'toggle-complete') {
            $controller->handleToggleComplete();
        } elseif ($action === 'complete-with-sync') {
            $controller->handleCompleteWithSync();
        } elseif ($action === 'auto-push') {
            $controller->handleAutoPush();
        } else {
            $controller->handlePost();
        }
        break;
    case 'PUT':
        $controller->handlePut();
        break;
    case 'DELETE':
        $controller->handleDelete();
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
?>