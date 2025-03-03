const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 数据文件路径
const DATA_FILE = path.join(__dirname, 'members.json');

// 确保数据文件存在
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]), 'utf8');
}

// 读取会员数据
function readMembersData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取会员数据失败:', error);
        return [];
    }
}

// 保存会员数据
function saveMembersData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('保存会员数据失败:', error);
        return false;
    }
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// 处理静态文件请求
function serveStaticFile(req, res) {
    const filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    const extname = path.extname(filePath);
    
    const contentTypeMap = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif'
    };
    
    const contentType = contentTypeMap[extname] || 'text/plain';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('文件未找到');
            } else {
                res.writeHead(500);
                res.end(`服务器错误: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    
    // API路由
    if (parsedUrl.pathname === '/api/members') {
        // 获取所有会员
        if (req.method === 'GET') {
            const members = readMembersData();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(members));
        }
        // 添加新会员
        else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', () => {
                try {
                    const member = JSON.parse(body);
                    const members = readMembersData();
                    
                    // 添加ID和创建时间
                    member.id = generateId();
                    member.createdAt = new Date().toISOString();
                    
                    members.push(member);
                    
                    if (saveMembersData(members)) {
                        res.writeHead(201, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(member));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: '保存数据失败' }));
                    }
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: '无效的请求数据' }));
                }
            });
        }
    }
    // 单个会员操作
    else if (parsedUrl.pathname.match(/\/api\/members\/[\w-]+/)) {
        const id = parsedUrl.pathname.split('/').pop();
        const members = readMembersData();
        const memberIndex = members.findIndex(m => m.id === id);
        
        // 会员不存在
        if (memberIndex === -1 && req.method !== 'OPTIONS') {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '会员不存在' }));
            return;
        }
        
        // 获取单个会员
        if (req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(members[memberIndex]));
        }
        // 更新会员
        else if (req.method === 'PUT') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', () => {
                try {
                    const updatedMember = JSON.parse(body);
                    // 保留原ID和创建时间
                    updatedMember.id = id;
                    updatedMember.createdAt = members[memberIndex].createdAt;
                    updatedMember.updatedAt = new Date().toISOString();
                    
                    members[memberIndex] = updatedMember;
                    
                    if (saveMembersData(members)) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(updatedMember));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: '保存数据失败' }));
                    }
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: '无效的请求数据' }));
                }
            });
        }
        // 删除会员
        else if (req.method === 'DELETE') {
            members.splice(memberIndex, 1);
            
            if (saveMembersData(members)) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } else {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '保存数据失败' }));
            }
        }
    }
    // 静态文件请求
    else {
        serveStaticFile(req, res);
    }
});

const PORT = process.env.PORT || 3050;

server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});