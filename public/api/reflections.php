<?php
// public/api/reflections.php
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
$controller = new ReflectionController();

switch ($method) {
    case 'GET':
        if ($action === 'random') {
            $controller->handleGetRandom();
        } elseif ($action === 'event') {
            $controller->handleGetEvent();
        } else {
            $controller->handleGet();
        }
        break;
    case 'POST':
        if ($action === 'event') {
            $controller->handleUpdateEvent();
        } else {
            $controller->handleSave();
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
?>