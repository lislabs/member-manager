const dirctory = '/z';
const apiUrl = `${directory}/api.php`;

document.addEventListener('DOMContentLoaded', () => {
    // 元素引用
    const loginModal = document.getElementById('loginModal');
    const changePasswordModal = document.getElementById('changePasswordModal');
    const memberForm = document.getElementById('memberForm');
    const memberNameInput = document.getElementById('memberName');
    const memberCreditsInput = document.getElementById('memberCredits');
    const memberNoteInput = document.getElementById('memberNote');
    const membersList = document.getElementById('membersList');
    const notification = document.getElementById('notification');
    const exportBtn = document.getElementById('exportBtn');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    
    // 当前编辑的会员ID
    let currentEditingId = null;
    // 存储认证令牌
    let authToken = '';
    
    // 登录处理
    document.getElementById('loginBtn').addEventListener('click', async () => {
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch(`${apiUrl}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                authToken = password;
                loginModal.classList.remove('show');
                showNotification('登录成功', 'success');
                loadMembers();
            } else {
                showNotification(data.error || '登录失败', 'error');
            }
        } catch (error) {
            showNotification('登录失败: ' + error.message, 'error');
        }
    });
    
    // 修改密码相关事件处理
    changePasswordBtn.addEventListener('click', () => {
        changePasswordModal.classList.add('show');
    });
    
    document.getElementById('cancelChangePasswordBtn').addEventListener('click', () => {
        changePasswordModal.classList.remove('show');
        document.getElementById('oldPassword').value = '';
        document.getElementById('newPassword').value = '';
    });
    
    document.getElementById('confirmChangePasswordBtn').addEventListener('click', async () => {
        const oldPassword = document.getElementById('oldPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        
        if (!oldPassword || !newPassword) {
            showNotification('请输入完整的密码信息', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${apiUrl}/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Password': authToken
                },
                body: JSON.stringify({ oldPassword, newPassword })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                authToken = newPassword;
                changePasswordModal.classList.remove('show');
                document.getElementById('oldPassword').value = '';
                document.getElementById('newPassword').value = '';
                showNotification('密码修改成功', 'success');
            } else {
                showNotification(data.error || '密码修改失败', 'error');
            }
        } catch (error) {
            showNotification('密码修改失败: ' + error.message, 'error');
        }
    });
    
    // 导出数据
    exportBtn.addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = `${apiUrl}/export?t=${Date.now()}`;
        a.download = 'members_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
    
    // 表单提交处理
    memberForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = memberNameInput.value.trim();
        const credits = parseInt(memberCreditsInput.value);
        const note = memberNoteInput.value.trim();
        
        if (!name || isNaN(credits) || credits < 0) {
            showNotification('请输入有效的会员信息', 'error');
            return;
        }
        
        const memberData = {
            name,
            credits,
            note
        };
        
        try {
            if (currentEditingId) {
                // 更新会员
                await updateMember(currentEditingId, memberData);
                showNotification('会员信息已更新', 'success');
                currentEditingId = null;
                memberForm.querySelector('button[type="submit"]').textContent = '添加会员';
            } else {
                // 添加新会员
                await addMember(memberData);
                showNotification('会员添加成功', 'success');
            }
            
            // 重置表单并刷新会员列表
            memberForm.reset();
            loadMembers();
        } catch (error) {
            showNotification(`操作失败: ${error.message}`, 'error');
        }
    });
    
    // 加载会员列表
    async function loadMembers() {
        try {
            const response = await fetch(`${apiUrl}/members`, {
                headers: {
                    'X-Password': authToken
                }
            });
            
            if (!response.ok) throw new Error('获取会员列表失败');
            
            const members = await response.json();
            renderMembersList(members);
        } catch (error) {
            showNotification(`加载会员列表失败: ${error.message}`, 'error');
        }
    }
    
    // 渲染会员列表
    function renderMembersList(members) {
        membersList.innerHTML = '';
        
        if (members.length === 0) {
            membersList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <div class="empty-state-text">暂无会员数据</div>
                </div>
            `;
            return;
        }
        
        members.forEach(member => {
            const memberElement = document.createElement('div');
            memberElement.className = 'member-item';
            memberElement.innerHTML = `
                <div class="member-header">
                    <div class="member-id">ID: ${member.id}</div>
                    <div class="member-name">${member.name}</div>
                </div>
                <div class="member-credits">剩余次数: ${member.credits}</div>
                <div class="member-dates">
                    <div>创建时间: ${member.created_at}</div>
                    <div>更新时间: ${member.updated_at}</div>
                </div>
                ${member.note ? `<div class="member-note">${member.note}</div>` : ''}
                <div class="member-actions">
                    <button class="btn btn-primary edit-btn" data-id="${member.id}">编辑</button>
                    <button class="btn btn-danger delete-btn" data-id="${member.id}">删除</button>
                </div>
            `;
            
            // 添加编辑按钮事件
            const editBtn = memberElement.querySelector('.edit-btn');
            editBtn.addEventListener('click', () => editMember(member));
            
            // 添加删除按钮事件
            const deleteBtn = memberElement.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteMember(member.id));
            
            membersList.appendChild(memberElement);
        });
    }
    
    // 添加会员
    async function addMember(memberData) {
        const response = await fetch(`${apiUrl}/members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Password': authToken
            },
            body: JSON.stringify(memberData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '添加会员失败');
        }
        
        return await response.json();
    }
    
    // 编辑会员
    function editMember(member) {
        // 填充表单
        memberNameInput.value = member.name;
        memberCreditsInput.value = member.credits;
        memberNoteInput.value = member.note || '';
        currentEditingId = member.id;
        
        // 更改按钮文本
        memberForm.querySelector('button[type="submit"]').textContent = '更新会员';
        
        // 滚动到表单
        memberForm.scrollIntoView({ behavior: 'smooth' });
    }
    
    // 更新会员
    async function updateMember(id, memberData) {
        const response = await fetch(`${apiUrl}/members/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Password': authToken
            },
            body: JSON.stringify(memberData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '更新会员失败');
        }
        
        return await response.json();
    }
    
    // 删除会员
    async function deleteMember(id) {
        if (!confirm('确定要删除这个会员吗？')) return;
        
        try {
            const response = await fetch(`${apiUrl}/members/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-Password': authToken
                }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '删除会员失败');
            }
            
            showNotification('会员已删除', 'success');
            loadMembers();
        } catch (error) {
            showNotification(`删除失败: ${error.message}`, 'error');
        }
    }
    
    // 显示通知
    function showNotification(message, type) {
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
});