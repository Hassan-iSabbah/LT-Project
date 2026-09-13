<?php
// modules/auth/AuthView.php
class AuthView {
    public static function renderLogin() {
        $error = $_SESSION['error'] ?? '';
        $success = $_SESSION['success'] ?? '';
        unset($_SESSION['error'], $_SESSION['success']);
        ?>
        <div class="auth-container">
            <h2>Welcome Back</h2>
            <p class="subtitle">Log in to your schedule</p>
            <?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
            <?php if ($success): ?><div class="alert success"><?= htmlspecialchars($success) ?></div><?php endif; ?>
            <form method="POST" action="<?= BASE_PATH ?>?page=login">
                <div class="form-group">
                    <label for="username">Username or Email</label>
                    <input type="text" name="username" id="username" placeholder="Enter your username or email" required autofocus>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" name="password" id="password" placeholder="Enter your password" required>
                </div>
                <button type="submit" class="btn-primary">Log In</button>
            </form>
            <div class="auth-footer">
                Don't have an account? <a href="<?= BASE_PATH ?>?page=register">Register</a>
            </div>
            <div class="demo-hint">
                💡 <strong>Demo:</strong> Register a new account or use <code>demo</code> / <code>demo123</code> (if seeded)
            </div>
        </div>
        <?php
    }

    public static function renderRegister() {
        $error = $_SESSION['error'] ?? '';
        unset($_SESSION['error']);
        ?>
        <div class="auth-container">
            <h2>Create Account</h2>
            <p class="subtitle">Start scheduling your life</p>
            <?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
            <form method="POST" action="<?= BASE_PATH ?>?page=register">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" name="username" id="username" placeholder="Choose a username (min 3 chars)" required>
                </div>
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" name="email" id="email" placeholder="Enter your email" required>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" name="password" id="password" placeholder="Create a password (min 6 chars)" required>
                </div>
                <button type="submit" class="btn-primary">Register</button>
            </form>
            <div class="auth-footer">
                Already have an account? <a href="<?= BASE_PATH ?>?page=login">Log in</a>
            </div>
        </div>
        <?php
    }
}
?>