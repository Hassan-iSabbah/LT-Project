<?php
// public/api/goals.php
require_once __DIR__ . '/../../autoloader.php';
require_once __DIR__ . '/../../modules/goals/GoalController.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$controller = new GoalController();

switch ($method) {
    case 'GET':
        if ($action === 'neglected') {
            $controller->handleGetNeglected();
        } elseif ($action === 'tree') {
            $controller->handleGetTree();
        } else {
            $controller->handleGet();
        }
        break;

    case 'POST':
        if ($action === 'archive') {
            $controller->handleArchive();
        } elseif ($action === 'link-event') {
            $controller->handleLinkEvent();
        } elseif ($action === 'recalculate') {
            $controller->handleRecalculate();
        } else {
            $controller->handlePost();
        }
        break;

    case 'PUT':
        $controller->handlePut();
        break;

    case 'DELETE':
        if ($action === 'unlink-event') {
            $controller->handleUnlinkEvent();
        } else {
            $controller->handleDelete();
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
?>