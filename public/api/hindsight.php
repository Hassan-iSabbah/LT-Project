<?php
// public/api/hindsight.php
require_once __DIR__ . '/../../autoloader.php';
require_once __DIR__ . '/../../modules/hindsight/HindsightController.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$controller = new HindsightController();

switch ($method) {
    case 'GET':
        if ($action === 'event') {
            $controller->handleGetEvent();
        } elseif ($action === 'options') {
            $controller->handleGetOptions();
        } elseif ($action === 'stats') {
            $controller->handleGetStats();
        } else {
            $controller->handleGet();
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
?>