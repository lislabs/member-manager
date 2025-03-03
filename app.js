document.addEventListener('DOMContentLoaded', () => {
    // 元素引用
    const memberForm = document.getElementById('memberForm');
    const memberNameInput = document.getElementById('memberName');
    const memberCreditsInput = document.getElementById('memberCredits');
    const membersList = document.getElementById('membersList');
    const notification = document.getElementById('notification');
    
    // 当前编辑的会员ID
    let currentEditingId = null;
    
    // 初始化加载会员列表
    loadMembers();
    
    // 表单提交处理
    memberForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = memberNameInput.value.trim();
        const credits = parseInt(memberCreditsInput.value);
        
        if (!name || isNaN(credits) || credits < 0) {
            showNotification('请输入有效的会员信息', 'error');
            return;
        }
        
        const memberData = {
            name,
            credits
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
            const response = await fetch('/api/members');
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
            membersList.innerHTML = '<div class="member-item">暂无会员数据</div>';
            return;
        }
        
        members.forEach(member => {
            const memberElement = document.createElement('div');
            memberElement.className = 'member-item';
            memberElement.innerHTML = `
                <div class="member-info">
                    <div class="member-id">ID: ${member.id}</div>
                    <div class="member-name">${member.name}</div>
                    <div class="member-credits">剩余次数: ${member.credits}</div>
                </div>
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
        const response = await fetch('/api/members', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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
        currentEditingId = member.id;
        
        // 更改按钮文本
        memberForm.querySelector('button[type="submit"]').textContent = '更新会员';
        
        // 滚动到表单
        memberForm.scrollIntoView({ behavior: 'smooth' });
    }
    
    // 更新会员
    async function updateMember(id, memberData) {
        const response = await fetch(`/api/members/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
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
            const response = await fetch(`/api/members/${id}`, {
                method: 'DELETE'
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