<?php
// modules/auth/AuthController.php
class AuthController {
    private $model;

    public function __construct() {
        $this->model = new AuthModel();
    }

    public function handleRegister() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') return;

        $username = trim($_POST['username'] ?? '');
        $email    = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';

        if (strlen($username) < 3 || strlen($password) < 6 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $_SESSION['error'] = 'Invalid input. Username ≥3 chars, Password ≥6, valid email.';
            header('Location: ' . BASE_PATH . '?page=register');
            exit;
        }

        if ($this->model->register($username, $email, $password)) {
            $_SESSION['success'] = 'Registration successful! Please login.';
            header('Location: ' . BASE_PATH . '?page=login');
        } else {
            $_SESSION['error'] = 'Username or email already taken.';
            header('Location: ' . BASE_PATH . '?page=register');
        }
        exit;
    }

    public function handleLogin() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') return;

        $username = trim($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';

        $user = $this->model->login($username, $password);
        if ($user) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            header('Location: ' . BASE_PATH . '?page=calendar');
        } else {
            $_SESSION['error'] = 'Invalid credentials.';
            header('Location: ' . BASE_PATH . '?page=login');
        }
        exit;
    }

    public function handleLogout() {
        session_destroy();
        header('Location: ' . BASE_PATH . '?page=login');
        exit;
    }

    public function showLogin() {
        require_once __DIR__ . '/AuthView.php';
        AuthView::renderLogin();
    }

    public function showRegister() {
        require_once __DIR__ . '/AuthView.php';
        AuthView::renderRegister();
    }
}
?>