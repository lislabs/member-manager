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

// 数据文件路径
define('DATA_FILE', 'members.json');
define('CONFIG_FILE', 'config.json');

// 读取配置文件
function readConfig() {
    if (!file_exists(CONFIG_FILE)) {
        $config = ['password' => '7890'];
        file_put_contents(CONFIG_FILE, json_encode($config, JSON_PRETTY_PRINT));
    }
    return json_decode(file_get_contents(CONFIG_FILE), true);
}

// 保存配置
function saveConfig($config) {
    file_put_contents(CONFIG_FILE, json_encode($config, JSON_PRETTY_PRINT));
}

// 验证密码
function verifyPassword($password) {
    $config = readConfig();
    return $password === $config['password'];
}

// 更新密码
function updatePassword($oldPassword, $newPassword) {
    if (!verifyPassword($oldPassword)) {
        http_response_code(401);
        echo json_encode(['error' => '原密码错误']);
        exit;
    }
    
    $config = readConfig();
    $config['password'] = $newPassword;
    saveConfig($config);
    echo json_encode(['message' => '密码更新成功']);
}

// 读取会员数据
function readMembers() {
    if (!file_exists(DATA_FILE)) {
        file_put_contents(DATA_FILE, json_encode([]));
    }
    return json_decode(file_get_contents(DATA_FILE), true);
}

// 保存会员数据
function saveMembers($members) {
    file_put_contents(DATA_FILE, json_encode($members, JSON_PRETTY_PRINT));
}

// 生成唯一ID
function generateId() {
    return uniqid();
}

// 获取当前时间
function getCurrentTime() {
    return date('Y-m-d H:i:s');
}

// 验证请求中的密码
if (!isset($_SERVER['HTTP_X_PASSWORD']) || !verifyPassword($_SERVER['HTTP_X_PASSWORD'])) {
    if ($_SERVER['REQUEST_URI'] !== '/api.php/verify') {
        http_response_code(401);
        echo json_encode(['error' => '未授权访问']);
        exit;
    }
}

// 路由处理
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/api.php', '', $path);

switch ($path) {
    case '/verify':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = json_decode(file_get_contents('php://input'), true);
            if (verifyPassword($data['password'])) {
                echo json_encode(['message' => '验证成功']);
            } else {
                http_response_code(401);
                echo json_encode(['error' => '密码错误']);
            }
        }
        break;
        
    case '/password':
        if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            $data = json_decode(file_get_contents('php://input'), true);
            updatePassword($data['oldPassword'], $data['newPassword']);
        }
        break;
        
    case '/members':
        switch ($_SERVER['REQUEST_METHOD']) {
            case 'GET':
                echo json_encode(readMembers());
                break;
                
            case 'POST':
                $data = json_decode(file_get_contents('php://input'), true);
                $members = readMembers();
                $newMember = [
                    'id' => generateId(),
                    'name' => $data['name'],
                    'credits' => $data['credits'],
                    'note' => $data['note'] ?? '',
                    'created_at' => getCurrentTime(),
                    'updated_at' => getCurrentTime()
                ];
                $members[] = $newMember;
                saveMembers($members);
                echo json_encode($newMember);
                break;
        }
        break;
        
    case (preg_match('/\/members\/([^\/?]+)/', $path, $matches) ? $path : false):
        $id = $matches[1];
        $members = readMembers();
        $index = array_search($id, array_column($members, 'id'));
        
        if ($index === false) {
            http_response_code(404);
            echo json_encode(['error' => '会员不存在']);
            break;
        }
        
        switch ($_SERVER['REQUEST_METHOD']) {
            case 'PUT':
                $data = json_decode(file_get_contents('php://input'), true);
                $members[$index]['name'] = $data['name'];
                $members[$index]['credits'] = $data['credits'];
                $members[$index]['note'] = $data['note'] ?? $members[$index]['note'];
                $members[$index]['updated_at'] = getCurrentTime();
                saveMembers($members);
                echo json_encode($members[$index]);
                break;
                
            case 'DELETE':
                array_splice($members, $index, 1);
                saveMembers($members);
                echo json_encode(['message' => '删除成功']);
                break;
        }
        break;
        
    case '/export':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            header('Content-Type: application/json');
            header('Content-Disposition: attachment; filename="members_backup.json"');
            echo json_encode(readMembers(), JSON_PRETTY_PRINT);
        }
        break;
        
    default:
        http_response_code(404);
        echo json_encode(['error' => '未找到请求的资源']);
}