// 配置
const SERVER_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : window.location.origin;

let students = [];
let questions = [];
let users = [];
let currentEditId = null;
let currentEditType = null;

// 防抖函数（防止频繁触发）
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========== 密码保护 ==========
const ADMIN_PASSWORD = 'HUA967101';

function checkPassword() {
    const savedPassword = sessionStorage.getItem('adminPassword');
    
    if (savedPassword === ADMIN_PASSWORD) {
        return true;
    }
    
    const password = prompt('🔒 请输入管理后台密码:');
    
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminPassword', password);
        return true;
    } else if (password === null) {
        alert('❌ 需要密码才能访问管理后台');
        window.location.href = 'index.html';
        return false;
    } else {
        alert('❌ 密码错误!');
        window.location.href = 'index.html';
        return false;
    }
}

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    // 先验证密码
    if (!checkPassword()) {
        return;
    }
    
    initTabs();
    initModals();
    initButtons();
    loadAllData();
});

// 标签页切换
function initTabs() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            if (tabName === 'students') loadStudents();
            if (tabName === 'questions') loadQuestions();
            if (tabName === 'users') loadUsers();
        });
    });
}

// 初始化弹窗
function initModals() {
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('show');
        }
    };
}

// 关闭弹窗
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// 初始化按钮
function initButtons() {
    // 退出登录
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm('确定要退出登录吗?')) {
            sessionStorage.removeItem('adminPassword');
            alert('已退出登录');
            window.location.href = 'index.html';
        }
    });
    
    // 学生管理
    document.getElementById('addStudentBtn').addEventListener('click', () => {
        currentEditId = null;
        currentEditType = 'add';
        document.getElementById('studentModalTitle').textContent = '添加学生';
        document.getElementById('studentForm').reset();
        document.getElementById('studentModal').classList.add('show');
    });
    
    document.getElementById('studentForm').addEventListener('submit', saveStudent);
    document.getElementById('searchStudent').addEventListener('input', debounce(filterStudents, 300));
    
    // 题目管理
    document.getElementById('addQuestionBtn').addEventListener('click', () => {
        currentEditId = null;
        currentEditType = 'add';
        document.getElementById('questionModalTitle').textContent = '添加题目';
        document.getElementById('questionForm').reset();
        document.getElementById('questionModal').classList.add('show');
    });
    
    document.getElementById('questionForm').addEventListener('submit', saveQuestion);
    document.getElementById('searchQuestion').addEventListener('input', debounce(filterQuestions, 300));
    document.getElementById('filterDifficulty').addEventListener('change', filterQuestions);
    
    // 用户管理
    document.getElementById('searchUser').addEventListener('input', debounce(filterUsers, 300));
    document.getElementById('filterClass').addEventListener('change', filterUsers);
    document.getElementById('editUserForm').addEventListener('submit', saveUserData);
    
    // 批量导入
    document.getElementById('importStudentsBtn').addEventListener('click', importStudents);
    document.getElementById('importQuestionsBtn').addEventListener('click', importQuestions);
    document.getElementById('fileUpload').addEventListener('change', handleFileSelect);
    document.getElementById('uploadFileBtn').addEventListener('click', uploadFile);
    
    // 备份和导出
    document.getElementById('downloadDataBtn').addEventListener('click', downloadDataFile);
    document.getElementById('backupBtn').addEventListener('click', backupData);
    document.getElementById('exportBtn').addEventListener('click', exportAllData);
}

// ========== 加载数据 ==========
async function loadAllData() {
    await testConnection();
    await loadStudents();
    await loadQuestions();
    await loadUsers();
}

// 测试服务器连接
async function testConnection() {
    try {
        const response = await fetch(`${SERVER_URL}/api/classes`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        console.log('✅ 服务器连接成功');
    } catch (error) {
        console.error('❌ 服务器连接失败:', error);
        alert(`⚠️ 无法连接到服务器!\n\n请检查:\n1. 服务器是否正在运行? (npm start)\n2. 端口是否正确? (${SERVER_URL})\n\n错误信息: ${error.message}`);
    }
}

async function loadStudents() {
    try {
        const response = await fetch(`${SERVER_URL}/api/admin/students`);
        students = await response.json();
        renderStudents(students);
        updateStudentStats();
    } catch (error) {
        console.error('加载学生失败:', error);
        alert('加载学生数据失败');
    }
}

async function loadQuestions() {
    try {
        const response = await fetch(`${SERVER_URL}/api/admin/questions`);
        questions = await response.json();
        renderQuestions(questions);
        updateQuestionStats();
    } catch (error) {
        console.error('加载题目失败:', error);
        alert('加载题目数据失败');
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${SERVER_URL}/api/admin/users`);
        users = await response.json();
        renderUsers(users);
        updateUserStats();
        updateClassFilter();
    } catch (error) {
        console.error('加载用户失败:', error);
        alert('加载用户数据失败');
    }
}

// ========== 渲染表格 ==========
function renderStudents(data) {
    const tbody = document.querySelector('#studentsTable tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-state-icon">📚</div>
                    <div class="empty-state-text">暂无学生数据</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map((student, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${student.className}</td>
            <td>${student.name}</td>
            <td>${student.account}</td>
            <td class="action-btns">
                <button class="btn btn-info" onclick="editStudent(${index})">编辑</button>
                <button class="btn btn-danger" onclick="deleteStudent(${index})">删除</button>
            </td>
        </tr>
    `).join('');
}

function renderQuestions(data) {
    const tbody = document.querySelector('#questionsTable tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-state-icon">❓</div>
                    <div class="empty-state-text">暂无题目数据</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map((q, index) => `
        <tr>
            <td>${q.id}</td>
            <td style="max-width: 400px;">${q.question}</td>
            <td>${q.answer}</td>
            <td><span class="badge-${q.difficulty || '简单'}">${q.difficulty || '简单'}</span></td>
            <td class="action-btns">
                <button class="btn btn-info" onclick="editQuestion(${index})">编辑</button>
                <button class="btn btn-danger" onclick="deleteQuestion(${index})">删除</button>
            </td>
        </tr>
    `).join('');
}

function renderUsers(data) {
    const tbody = document.querySelector('#usersTable tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-state-icon">👤</div>
                    <div class="empty-state-text">暂无用户数据</div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map((user, index) => {
        const totalElements = Object.values(user.elements || {}).reduce((a, b) => a + b, 0);
        return `
            <tr>
                <td>${user.className}</td>
                <td>${user.name}</td>
                <td><strong style="color: #f6ad55;">Lv.${user.level}</strong></td>
                <td>总计: ${totalElements} 个</td>
                <td class="action-btns">
                    <button class="btn btn-info" onclick="viewUserDetail(${index})">查看详情</button>
                    <button class="btn btn-warning" onclick="editUser(${index})">✏️ 编辑</button>
                    <button class="btn btn-danger" onclick="deleteUser(${index})">删除</button>
                </td>
            </tr>
        `;
    }).join('');
}

// ========== 统计信息 ==========
function updateStudentStats() {
    document.getElementById('totalStudents').textContent = students.length;
    const classes = [...new Set(students.map(s => s.className))];
    document.getElementById('totalClasses').textContent = classes.length;
}

function updateQuestionStats() {
    document.getElementById('totalQuestions').textContent = questions.length;
    document.getElementById('easyQuestions').textContent = 
        questions.filter(q => (q.difficulty || '简单') === '简单').length;
    document.getElementById('mediumQuestions').textContent = 
        questions.filter(q => q.difficulty === '中等').length;
    document.getElementById('hardQuestions').textContent = 
        questions.filter(q => q.difficulty === '困难').length;
}

function updateUserStats() {
    document.getElementById('activeUsers').textContent = users.length;
    const avgLevel = users.length > 0 
        ? (users.reduce((sum, u) => sum + u.level, 0) / users.length).toFixed(1)
        : 0;
    document.getElementById('avgLevel').textContent = avgLevel;
}

function updateClassFilter() {
    const select = document.getElementById('filterClass');
    const classes = [...new Set(users.map(u => u.className))];
    select.innerHTML = '<option value="">全部班级</option>' +
        classes.map(c => `<option value="${c}">${c}</option>`).join('');
}

// ========== 学生操作 ==========
function editStudent(index) {
    const student = students[index];
    currentEditId = index;
    currentEditType = 'edit';
    
    document.getElementById('studentModalTitle').textContent = '编辑学生';
    document.getElementById('studentClass').value = student.className;
    document.getElementById('studentName').value = student.name;
    document.getElementById('studentAccount').value = student.account;
    document.getElementById('studentModal').classList.add('show');
}

async function saveStudent(e) {
    e.preventDefault();
    
    const studentData = {
        className: document.getElementById('studentClass').value.trim(),
        name: document.getElementById('studentName').value.trim(),
        account: document.getElementById('studentAccount').value.trim()
    };
    
    try {
        const url = currentEditType === 'add' 
            ? `${SERVER_URL}/api/admin/students`
            : `${SERVER_URL}/api/admin/students/${currentEditId}`;
        
        const response = await fetch(url, {
            method: currentEditType === 'add' ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentData)
        });
        
        const result = await response.json();
        if (result.success) {
            alert(currentEditType === 'add' ? '添加成功!' : '更新成功!');
            closeModal('studentModal');
            loadStudents();
        } else {
            alert(result.message || '操作失败');
        }
    } catch (error) {
        console.error('保存学生失败:', error);
        alert('保存失败');
    }
}

async function deleteStudent(index) {
    if (!confirm('确定要删除这个学生吗?')) return;
    
    try {
        const response = await fetch(`${SERVER_URL}/api/admin/students/${index}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        if (result.success) {
            alert('删除成功!');
            loadStudents();
        } else {
            alert(result.message || '删除失败');
        }
    } catch (error) {
        console.error('删除学生失败:', error);
        alert('删除失败');
    }
}

function filterStudents() {
    const keyword = document.getElementById('searchStudent').value.toLowerCase();
    const filtered = students.filter(s => 
        s.name.toLowerCase().includes(keyword) || 
        s.className.toLowerCase().includes(keyword) ||
        s.account.toLowerCase().includes(keyword)
    );
    renderStudents(filtered);
}

// ========== 题目操作 ==========
function editQuestion(index) {
    const question = questions[index];
    currentEditId = index;
    currentEditType = 'edit';
    
    document.getElementById('questionModalTitle').textContent = '编辑题目';
    document.getElementById('questionText').value = question.question;
    document.getElementById('questionAnswer').value = question.answer;
    document.getElementById('questionExplanation').value = question.explanation;
    document.getElementById('questionDifficulty').value = question.difficulty || '简单';
    document.getElementById('questionModal').classList.add('show');
}

async function saveQuestion(e) {
    e.preventDefault();
    
    const questionData = {
        question: document.getElementById('questionText').value.trim(),
        answer: document.getElementById('questionAnswer').value.trim(),
        explanation: document.getElementById('questionExplanation').value.trim(),
        difficulty: document.getElementById('questionDifficulty').value
    };
    
    try {
        const url = currentEditType === 'add' 
            ? `${SERVER_URL}/api/admin/questions`
            : `${SERVER_URL}/api/admin/questions/${currentEditId}`;
        
        const response = await fetch(url, {
            method: currentEditType === 'add' ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questionData)
        });
        
        const result = await response.json();
        if (result.success) {
            alert(currentEditType === 'add' ? '添加成功!' : '更新成功!');
            closeModal('questionModal');
            loadQuestions();
        } else {
            alert(result.message || '操作失败');
        }
    } catch (error) {
        console.error('保存题目失败:', error);
        alert('保存失败');
    }
}

async function deleteQuestion(index) {
    if (!confirm('确定要删除这道题目吗?')) return;
    
    try {
        const response = await fetch(`${SERVER_URL}/api/admin/questions/${index}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        if (result.success) {
            alert('删除成功!');
            loadQuestions();
        } else {
            alert(result.message || '删除失败');
        }
    } catch (error) {
        console.error('删除题目失败:', error);
        alert('删除失败');
    }
}

function filterQuestions() {
    const keyword = document.getElementById('searchQuestion').value.toLowerCase();
    const difficulty = document.getElementById('filterDifficulty').value;
    
    const filtered = questions.filter(q => {
        const matchKeyword = q.question.toLowerCase().includes(keyword) || 
                           q.answer.toLowerCase().includes(keyword);
        const matchDifficulty = !difficulty || (q.difficulty || '简单') === difficulty;
        return matchKeyword && matchDifficulty;
    });
    
    renderQuestions(filtered);
}

// ========== 用户操作 ==========
function viewUserDetail(index) {
    const user = users[index];
    const content = document.getElementById('userDetailContent');
    
    const elementNames = {
        fire: '火🔥', water: '水💧', wind: '风🌪️', rock: '岩🪨',
        grass: '草🌿', thunder: '雷⚡', ice: '冰❄️'
    };
    
    content.innerHTML = `
        <div class="user-detail-section">
            <h3>基本信息</h3>
            <p><strong>班级:</strong> ${user.className}</p>
            <p><strong>姓名:</strong> ${user.name}</p>
            <p><strong>等级:</strong> Lv.${user.level}</p>
        </div>
        
        <div class="user-detail-section">
            <h3>元素统计</h3>
            <div class="element-grid">
                ${Object.entries(user.elements || {}).map(([key, value]) => `
                    <div class="element-item">
                        <div>${elementNames[key]}</div>
                        <div><strong>${value}</strong></div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="user-detail-section">
            <h3>错题记录</h3>
            <p>错题数量: <strong>${(user.wrongQuestions || []).length}</strong></p>
        </div>
    `;
    
    document.getElementById('userDetailModal').classList.add('show');
}

// 编辑用户数据
function editUser(index) {
    const user = users[index];
    currentEditId = index;
    
    // 填充用户信息
    document.getElementById('editUserClass').textContent = user.className;
    document.getElementById('editUserName').textContent = user.name;
    document.getElementById('editUserLevel').value = user.level;
    
    // 填充元素数量
    document.getElementById('editElementFire').value = user.elements.fire || 0;
    document.getElementById('editElementWater').value = user.elements.water || 0;
    document.getElementById('editElementWind').value = user.elements.wind || 0;
    document.getElementById('editElementRock').value = user.elements.rock || 0;
    document.getElementById('editElementGrass').value = user.elements.grass || 0;
    document.getElementById('editElementThunder').value = user.elements.thunder || 0;
    document.getElementById('editElementIce').value = user.elements.ice || 0;
    
    document.getElementById('editUserModal').classList.add('show');
}

// 保存用户数据
async function saveUserData(e) {
    e.preventDefault();
    
    const userData = {
        level: parseInt(document.getElementById('editUserLevel').value),
        elements: {
            fire: parseInt(document.getElementById('editElementFire').value),
            water: parseInt(document.getElementById('editElementWater').value),
            wind: parseInt(document.getElementById('editElementWind').value),
            rock: parseInt(document.getElementById('editElementRock').value),
            grass: parseInt(document.getElementById('editElementGrass').value),
            thunder: parseInt(document.getElementById('editElementThunder').value),
            ice: parseInt(document.getElementById('editElementIce').value)
        }
    };
    
    try {
        const response = await fetch(`${SERVER_URL}/api/admin/users/${currentEditId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        if (result.success) {
            alert('✅ 用户数据更新成功!');
            closeModal('editUserModal');
            loadUsers();
        } else {
            alert(result.message || '更新失败');
        }
    } catch (error) {
        console.error('更新用户数据失败:', error);
        alert('更新失败');
    }
}

async function deleteUser(index) {
    if (!confirm('确定要删除这个用户的游戏数据吗?')) return;
    
    try {
        const response = await fetch(`${SERVER_URL}/api/admin/users/${index}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        if (result.success) {
            alert('删除成功!');
            loadUsers();
        } else {
            alert(result.message || '删除失败');
        }
    } catch (error) {
        console.error('删除用户失败:', error);
        alert('删除失败');
    }
}

function filterUsers() {
    const keyword = document.getElementById('searchUser').value.toLowerCase();
    const className = document.getElementById('filterClass').value;
    
    const filtered = users.filter(u => {
        const matchKeyword = u.name.toLowerCase().includes(keyword) || 
                           u.className.toLowerCase().includes(keyword);
        const matchClass = !className || u.className === className;
        return matchKeyword && matchClass;
    });
    
    renderUsers(filtered);
}

// ========== 批量导入 ==========
async function importStudents() {
    const data = document.getElementById('studentImportData').value.trim();
    if (!data) {
        alert('请输入要导入的数据');
        return;
    }
    
    const lines = data.split('\n').filter(line => line.trim());
    const studentsToImport = [];
    const errors = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(',').map(p => p.trim());
        
        if (parts.length < 3) {
            errors.push(`第 ${i + 1} 行格式错误: "${line}" (需要3个字段: 班级,姓名,账号)`);
            continue;
        }
        
        if (!parts[0] || !parts[1] || !parts[2]) {
            errors.push(`第 ${i + 1} 行有空字段: "${line}"`);
            continue;
        }
        
        studentsToImport.push({
            className: parts[0],
            name: parts[1],
            account: parts[2]
        });
    }
    
    // 显示错误信息
    if (errors.length > 0) {
        const errorMsg = `发现 ${errors.length} 个格式错误:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...(更多错误已省略)' : ''}`;
        console.error('数据格式错误:', errors);
        if (!confirm(`${errorMsg}\n\n是否继续导入有效的 ${studentsToImport.length} 条数据?`)) {
            return;
        }
    }
    
    if (studentsToImport.length === 0) {
        alert('没有有效的数据可以导入!\n\n正确格式示例:\n一班,张三,zs001\n二班,李四,ls002');
        return;
    }
    
    try {
        console.log('开始导入学生数据:', studentsToImport);
        
        const response = await fetch(`${SERVER_URL}/api/admin/students/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ students: studentsToImport })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('导入结果:', result);
        
        if (result.success) {
            alert(`✅ 成功导入 ${studentsToImport.length} 个学生!${errors.length > 0 ? `\n⚠️ 跳过 ${errors.length} 条错误数据` : ''}`);
            document.getElementById('studentImportData').value = '';
            loadStudents();
        } else {
            alert(`❌ 导入失败: ${result.message || '未知错误'}`);
        }
    } catch (error) {
        console.error('导入学生失败:', error);
        alert(`❌ 导入失败!\n\n错误信息: ${error.message}\n\n请检查:\n1. 服务器是否正在运行?\n2. 网络连接是否正常?\n3. 数据格式是否正确?`);
    }
}

async function importQuestions() {
    const data = document.getElementById('questionImportData').value.trim();
    if (!data) {
        alert('请输入要导入的数据');
        return;
    }
    
    const lines = data.split('\n').filter(line => line.trim());
    const questionsToImport = [];
    
    for (let line of lines) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 3) {
            questionsToImport.push({
                question: parts[0],
                answer: parts[1],
                explanation: parts[2],
                difficulty: parts[3] || '简单'
            });
        }
    }
    
    if (questionsToImport.length === 0) {
        alert('没有有效的数据');
        return;
    }
    
    try {
        const response = await fetch(`${SERVER_URL}/api/admin/questions/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questions: questionsToImport })
        });
        
        const result = await response.json();
        if (result.success) {
            alert(`成功导入 ${questionsToImport.length} 道题目!`);
            document.getElementById('questionImportData').value = '';
            loadQuestions();
        } else {
            alert(result.message || '导入失败');
        }
    } catch (error) {
        console.error('导入题目失败:', error);
        alert('导入失败');
    }
}

// 文件上传
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('fileName').textContent = `已选择: ${file.name}`;
    }
}

async function uploadFile() {
    const fileInput = document.getElementById('fileUpload');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('请先选择文件');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const content = e.target.result;
        const fileType = document.getElementById('fileType').value;
        
        if (fileType === 'students') {
            document.getElementById('studentImportData').value = content;
            await importStudents();
        } else {
            document.getElementById('questionImportData').value = content;
            await importQuestions();
        }
        
        fileInput.value = '';
        document.getElementById('fileName').textContent = '';
    };
    
    reader.readAsText(file);
}

// ========== 备份和导出 ==========
// ========== 数据备份和导出 ==========
// 下载数据文件（原始 data.json）
async function downloadDataFile() {
    try {
        const timestamp = new Date().toISOString().split('T')[0];
        const a = document.createElement('a');
        a.href = `${SERVER_URL}/api/admin/download-data`;
        a.download = `data_${timestamp}.json`;
        a.click();
        
        // 延迟提示，让下载先开始
        setTimeout(() => {
            alert('✅ 数据文件下载开始！\n\n文件名: data_' + timestamp + '.json');
        }, 500);
    } catch (error) {
        console.error('下载数据文件失败:', error);
        alert('下载失败');
    }
}

async function backupData() {
    try {
        const response = await fetch(`${SERVER_URL}/api/admin/backup`);
        const result = await response.json();
        
        if (result.success) {
            alert(`备份成功! 文件: ${result.filename}`);
        } else {
            alert('备份失败');
        }
    } catch (error) {
        console.error('备份失败:', error);
        alert('备份失败');
    }
}

async function exportAllData() {
    try {
        const response = await fetch(`${SERVER_URL}/api/admin/export`);
        const data = await response.json();
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bbk_game_data_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        alert('导出成功!');
    } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败');
    }
}

// 添加难度徽章样式
const style = document.createElement('style');
style.textContent = `
    .badge-简单 { color: #48bb78; font-weight: bold; }
    .badge-中等 { color: #f6ad55; font-weight: bold; }
    .badge-困难 { color: #f56565; font-weight: bold; }
`;
document.head.appendChild(style);
