<?php
// 数据库连接配置
define('DB_HOST', 'localhost');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');
define('DB_NAME', 'your_database');

// 创建数据库连接
function getDbConnection() {
    try {
        $conn = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8",
            DB_USER,
            DB_PASS,
            array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
        );
        return $conn;
    } catch(PDOException $e) {
        error_log("数据库连接失败: " . $e->getMessage());
        return null;
    }
}

// 初始化数据库表
function initDatabase() {
    $conn = getDbConnection();
    if (!$conn) return false;

    try {
        // 创建config表
        $conn->exec("CREATE TABLE IF NOT EXISTS config (
            id INT PRIMARY KEY AUTO_INCREMENT,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");

        // 创建members表
        $conn->exec("CREATE TABLE IF NOT EXISTS members (
            id VARCHAR(32) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            credits INT NOT NULL,
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )");

        // 检查config表是否为空，如果为空则插入默认密码
        $stmt = $conn->query("SELECT COUNT(*) FROM config");
        if ($stmt->fetchColumn() == 0) {
            $conn->exec("INSERT INTO config (password) VALUES ('7890')");
        }

        return true;
    } catch(PDOException $e) {
        error_log("初始化数据库失败: " . $e->getMessage());
        return false;
    }
}