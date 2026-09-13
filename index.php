<?php
// index.php
require_once __DIR__ . '/autoloader.php';
session_start();

$page = $_GET['page'] ?? 'calendar';
$auth = new AuthController();

if ($page === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $auth->handleLogin();
    exit;
}
if ($page === 'register' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $auth->handleRegister();
    exit;
}
if ($page === 'logout') {
    $auth->handleLogout();
    exit;
}

if (!isset($_SESSION['user_id']) && !in_array($page, ['login', 'register'])) {
    header('Location: ' . BASE_PATH . '?page=login');
    exit;
}

require_once __DIR__ . '/includes/header.inc.php';

switch ($page) {
    case 'login':
        echo '<div class="auth-page">';
        $auth->showLogin();
        echo '</div>';
        break;
    case 'register':
        echo '<div class="auth-page">';
        $auth->showRegister();
        echo '</div>';
        break;
    case 'subjects':
        echo '<div id="subject-manager-container"></div>';
        break;
    case 'hindsight':
        echo '<div id="app-calendar" data-user-id="' . $_SESSION['user_id'] . '"></div>';
        break;
    case 'goals':
        echo '<div id="goals-container" data-user-id="' . $_SESSION['user_id'] . '"></div>';
        break;
    case 'calendar':
    default:
        echo '<div id="app-calendar" data-user-id="' . $_SESSION['user_id'] . '"></div>';
        break;
}

require_once __DIR__ . '/includes/footer.inc.php';
?>