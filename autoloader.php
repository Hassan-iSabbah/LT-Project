<?php
// autoloader.php
$appConfig = require_once __DIR__ . '/config/app.php';
define('BASE_PATH', $appConfig['base_path']);
define('BASE_URL', $appConfig['base_url']);

spl_autoload_register(function ($class) {
    // Base directories to search
    $baseDirs = [
        __DIR__ . '/classes/',
        __DIR__ . '/modules/',
    ];
    
    // Recursively find all subdirectories
    $allDirs = [];
    foreach ($baseDirs as $baseDir) {
        if (!is_dir($baseDir)) continue;
        
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($baseDir, RecursiveDirectoryIterator::SKIP_DOTS)
        );
        foreach ($iterator as $file) {
            if ($file->isDir()) {
                $allDirs[] = $file->getPathname() . '/';
            }
        }
        $allDirs[] = $baseDir; // include base dir itself
    }
    
    // Also scan all module subdirectories (explicit)
    $moduleDirs = glob(__DIR__ . '/modules/*', GLOB_ONLYDIR);
    foreach ($moduleDirs as $moduleDir) {
        $allDirs[] = $moduleDir . '/';
    }
    
    $allDirs = array_unique($allDirs);
    
    // Search each directory for the class file
    foreach ($allDirs as $dir) {
        $file = $dir . $class . '.php';
        if (file_exists($file)) {
            require_once $file;
            return;
        }
    }
});
?>