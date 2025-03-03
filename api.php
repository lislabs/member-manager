<?php
header('Content-Type: application/json');

// 允许跨域请求
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// 如果是OPTIONS请求，直接返回
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// 引入数据库配置
require_once 'db_config.php';

// 初始化数据库
initDatabase();

// 获取当前时间
function getCurrentTime() {
    return date('Y-m-d H:i:s');
}

// 生成唯一ID
function generateId() {
    return substr(time() . uniqid(), 0, 32);
}

// 验证密码
function verifyPassword($password) {
    $conn = getDbConnection();
    if (!$conn) {
        return false;
    }
    
    try {
        $stmt = $conn->prepare("SELECT password FROM config ORDER BY id DESC LIMIT 1");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result && $password === $result['password'];
    } catch(PDOException $e) {
        error_log("验证密码失败: " . $e->getMessage());
        return false;
    }
}

// 更新密码
function updatePassword($oldPassword, $newPassword) {
    if (!verifyPassword($oldPassword)) {
        http_response_code(401);
        echo json_encode(['error' => '原密码错误']);
        exit;
    }
    
    $conn = getDbConnection();
    if (!$conn) {
        http_response_code(500);
        echo json_encode(['error' => '数据库连接失败']);
        exit;
    }
    
    try {
        $stmt = $conn->prepare("UPDATE config SET password = ? WHERE id = (SELECT id FROM (SELECT id FROM config ORDER BY id DESC LIMIT 1) as temp)");
        $stmt->execute([$newPassword]);
        echo json_encode(['message' => '密码更新成功']);
    } catch(PDOException $e) {
        http_response_code(500);
        error_log("更新密码失败: " . $e->getMessage());
        echo json_encode(['error' => '更新密码失败']);
    }
}

// 读取会员数据
function readMembers() {
    $conn = getDbConnection();
    if (!$conn) {
        return [];
    }
    
    try {
        $stmt = $conn->query("SELECT * FROM members ORDER BY created_at DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch(PDOException $e) {
        error_log("读取会员数据失败: " . $e->getMessage());
        return [];
    }
}

// 保存会员数据
function saveMembers($members) {
    // 此函数在MySQL实现中不再需要，因为我们直接操作数据库
    // 保留此函数是为了兼容性，但不执行任何操作
    return true;
}

// 获取请求路径
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/api', '', $path);

// 路由处理
switch (true) {
    case '/verify' === $path:
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            $result = verifyPassword($data['password']);
            echo json_encode(['valid' => $result]);
        }
        break;
        
    case '/change-password' === $path:
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            updatePassword($data['oldPassword'], $data['newPassword']);
        }
        break;
        
    case '/members' === $path:
        switch ($_SERVER['REQUEST_METHOD']) {
            case 'GET':
                echo json_encode(readMembers());
                break;
                
            case 'POST':
                $data = json_decode(file_get_contents('php://input'), true);
                $conn = getDbConnection();
                if (!$conn) {
                    http_response_code(500);
                    echo json_encode(['error' => '数据库连接失败']);
                    break;
                }
                
                try {
                    $id = generateId();
                    $stmt = $conn->prepare("INSERT INTO members (id, name, credits, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
                    $currentTime = getCurrentTime();
                    $stmt->execute([
                        $id,
                        $data['name'],
                        $data['credits'],
                        $data['note'] ?? '',
                        $currentTime,
                        $currentTime
                    ]);
                    
                    $newMember = [
                        'id' => $id,
                        'name' => $data['name'],
                        'credits' => $data['credits'],
                        'note' => $data['note'] ?? '',
                        'created_at' => $currentTime,
                        'updated_at' => $currentTime
                    ];
                    echo json_encode($newMember);
                } catch(PDOException $e) {
                    http_response_code(500);
                    error_log("添加会员失败: " . $e->getMessage());
                    echo json_encode(['error' => '添加会员失败']);
                }
                break;
        }
        break;
        
    case (preg_match('/\/members\/([^\/?]+)/', $path, $matches) ? $path : false):
        $id = $matches[1];
        $conn = getDbConnection();
        if (!$conn) {
            http_response_code(500);
            echo json_encode(['error' => '数据库连接失败']);
            break;
        }
        
        try {
            $stmt = $conn->prepare("SELECT * FROM members WHERE id = ?");
            $stmt->execute([$id]);
            $member = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$member) {
                http_response_code(404);
                echo json_encode(['error' => '会员不存在']);
                break;
            }
            
            switch ($_SERVER['REQUEST_METHOD']) {
                case 'GET':
                    echo json_encode($member);
                    break;
                    
                case 'PUT':
                    $data = json_decode(file_get_contents('php://input'), true);
                    $stmt = $conn->prepare("UPDATE members SET name = ?, credits = ?, note = ?, updated_at = ? WHERE id = ?");
                    $currentTime = getCurrentTime();
                    $stmt->execute([
                        $data['name'],
                        $data['credits'],
                        $data['note'] ?? $member['note'],
                        $currentTime,
                        $id
                    ]);
                    
                    $updatedMember = [
                        'id' => $id,
                        'name' => $data['name'],
                        'credits' => $data['credits'],
                        'note' => $data['note'] ?? $member['note'],
                        'created_at' => $member['created_at'],
                        'updated_at' => $currentTime
                    ];
                    echo json_encode($updatedMember);
                    break;
                    
                case 'DELETE':
                    $stmt = $conn->prepare("DELETE FROM members WHERE id = ?");
                    $stmt->execute([$id]);
                    echo json_encode(['message' => '删除成功']);
                    break;
            }
        } catch(PDOException $e) {
            http_response_code(500);
            error_log("会员操作失败: " . $e->getMessage());
            echo json_encode(['error' => '会员操作失败']);
        }
        break;
        
    case '/export' === $path:
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            header('Content-Type: application/json');
            header('Content-Disposition: attachment; filename="members_backup.json"');
            echo json_encode(readMembers(), JSON_PRETTY_PRINT);
        }
        break;
        
    default:
        http_response_code(404);
        echo json_encode(['error' => '接口不存在']);
}