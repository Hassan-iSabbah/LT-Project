<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <base href="<?= BASE_URL ?>">
    <title>📅 Schedule App — My Liege</title>
    <link rel="stylesheet" href="<?= BASE_PATH ?>css/main.min.css?v=1.02">
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
</head>
<body>
    <header>
        <nav>
            <div class="nav-left">
                <span class="brand">📅 Schedule</span>
            </div>
            <div class="nav-center">
                <?php if (isset($_SESSION['user_id'])): ?>
                    <a href="<?= BASE_PATH ?>?page=calendar" class="nav-tab <?= ($_GET['page'] ?? 'calendar') === 'calendar' ? 'active' : '' ?>">📅 Calendar</a>
                    <a href="<?= BASE_PATH ?>?page=subjects" class="nav-tab <?= ($_GET['page'] ?? '') === 'subjects' ? 'active' : '' ?>">📚 Subjects</a>
                    <a href="<?= BASE_PATH ?>?page=hindsight" class="nav-tab <?= ($_GET['page'] ?? '') === 'hindsight' ? 'active' : '' ?>">🔍 Hindsight</a>
                    <a href="<?= BASE_PATH ?>?page=goals" class="nav-tab <?= ($_GET['page'] ?? '') === 'goals' ? 'active' : '' ?>">🎯 Goals</a>
                <?php endif; ?>
            </div>
            <div class="nav-right">
                <?php if (isset($_SESSION['user_id'])): ?>
                    <span class="user-greeting">👋 <?= htmlspecialchars($_SESSION['username'] ?? 'User') ?></span>
                    <a href="<?= BASE_PATH ?>?page=logout" class="nav-link">Logout</a>
                <?php else: ?>
                    <a href="<?= BASE_PATH ?>?page=login" class="nav-link">Login</a>
                    <a href="<?= BASE_PATH ?>?page=register" class="nav-link">Register</a>
                <?php endif; ?>
            </div>
        </nav>
    </header>
    <main>