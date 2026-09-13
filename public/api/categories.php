<?php
// public/api/categories.php
require_once __DIR__ . '/../../autoloader.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$db = Database::getInstance()->getConnection();
$stmt = $db->prepare("SELECT id, name, color_hex FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY name");
$stmt->execute([$_SESSION['user_id']]);
$categories = $stmt->fetchAll();
echo json_encode($categories);
?>