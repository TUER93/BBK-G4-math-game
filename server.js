const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 数据文件路径
const DATA_FILE = path.join(__dirname, 'data.json');
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');
const STUDENTS_FILE = path.join(__dirname, 'students.json');

// 初始化数据
let gameData = {
    users: [],
    broadcasts: []
};

// 加载数据
function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            gameData = JSON.parse(data);
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }
}

// 保存数据
function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(gameData, null, 2));
    } catch (error) {
        console.error('保存数据失败:', error);
    }
}

// 加载题库
let questions = [];
function loadQuestions() {
    if (fs.existsSync(QUESTIONS_FILE)) {
        try {
            const data = fs.readFileSync(QUESTIONS_FILE, 'utf8');
            questions = JSON.parse(data);
        } catch (error) {
            console.error('加载题库失败:', error);
        }
    }
}

// 保存题库
function saveQuestions() {
    try {
        fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
    } catch (error) {
        console.error('保存题库失败:', error);
    }
}

// 加载学生信息
let students = [];
function loadStudents() {
    if (fs.existsSync(STUDENTS_FILE)) {
        try {
            const data = fs.readFileSync(STUDENTS_FILE, 'utf8');
            students = JSON.parse(data);
        } catch (error) {
            console.error('加载学生信息失败:', error);
        }
    }
}

// 保存学生信息
function saveStudents() {
    try {
        fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2));
    } catch (error) {
        console.error('保存学生信息失败:', error);
    }
}

// 初始化
loadData();
loadQuestions();
loadStudents();

// ========== API 路由 ==========

// 获取班级列表
app.get('/api/classes', (req, res) => {
    const classes = [...new Set(students.map(s => s.className))];
    res.json(classes);
});

// 获取班级学生列表
app.get('/api/students/:className', (req, res) => {
    const classStudents = students.filter(s => s.className === req.params.className);
    res.json(classStudents);
});

// 登录
app.post('/api/login', (req, res) => {
    const { className, name, account } = req.body;
    
    // 查找或创建用户
    let user = gameData.users.find(u => u.className === className && u.name === name);
    
    if (!user) {
        user = {
            id: Date.now().toString(),
            className,
            name,
            account,
            level: 1,
            elements: {
                fire: 0,
                water: 0,
                wind: 0,
                rock: 0,
                grass: 0,
                thunder: 0,
                ice: 0
            },
            wrongQuestions: [],
            answeredQuestions: [], // 已做过的题目ID列表
            answeredChallengeQuestions: [] // 已做过的挑战题ID列表
        };
        gameData.users.push(user);
        saveData();
    } else {
        // 确保旧用户也有这些字段
        if (!user.answeredQuestions) user.answeredQuestions = [];
        if (!user.answeredChallengeQuestions) user.answeredChallengeQuestions = [];
    }
    
    res.json({ success: true, user });
});

// 获取题目
app.get('/api/question', (req, res) => {
    const { userId, isChallenge } = req.query;
    
    if (questions.length === 0) {
        return res.json({
            id: Date.now(),
            question: '计算: 25 + 37 = ?',
            answer: '62',
            explanation: '25 + 37 = 62',
            difficulty: '简单'
        });
    }
    
    const user = gameData.users.find(u => u.id === userId);
    if (!user) {
        const randomIndex = Math.floor(Math.random() * questions.length);
        return res.json(questions[randomIndex]);
    }
    
    // 确保用户有已答题记录
    if (!user.answeredQuestions) user.answeredQuestions = [];
    if (!user.answeredChallengeQuestions) user.answeredChallengeQuestions = [];
    
    let availableQuestions;
    let answeredList;
    let completionMessage;
    
    if (isChallenge === 'true') {
        // 挑战模式：只选择困难题目
        availableQuestions = questions.filter(q => q.difficulty === '困难');
        answeredList = user.answeredChallengeQuestions;
        completionMessage = '恭喜你已做完挑战题';
    } else {
        // 正常模式：只选择简单和中等题目
        availableQuestions = questions.filter(q => q.difficulty === '简单' || q.difficulty === '中等');
        answeredList = user.answeredQuestions;
        completionMessage = '恭喜你已做完所有的题目';
    }
    
    // 过滤掉已做过的题
    const unansweredQuestions = availableQuestions.filter(q => !answeredList.includes(q.id));
    
    // 如果没有未做的题了
    if (unansweredQuestions.length === 0) {
        return res.json({
            completed: true,
            message: completionMessage
        });
    }
    
    // 随机选择一道未做过的题
    const randomIndex = Math.floor(Math.random() * unansweredQuestions.length);
    res.json(unansweredQuestions[randomIndex]);
});

// 提交答案
app.post('/api/answer', (req, res) => {
    const { userId, questionId, answer, isChallenge } = req.body;
    
    const user = gameData.users.find(u => u.id === userId);
    if (!user) {
        return res.json({ success: false, message: '用户不存在' });
    }
    
    const question = questions.find(q => q.id === questionId);
    if (!question) {
        return res.json({ success: false, message: '题目不存在' });
    }
    
    // 确保用户有已答题记录
    if (!user.answeredQuestions) user.answeredQuestions = [];
    if (!user.answeredChallengeQuestions) user.answeredChallengeQuestions = [];
    
    const correct = answer.toString().trim() === question.answer.toString().trim();
    
    if (correct) {
        // 记录已做过的题目（答对才记录）
        if (isChallenge) {
            if (!user.answeredChallengeQuestions.includes(questionId)) {
                user.answeredChallengeQuestions.push(questionId);
            }
        } else {
            if (!user.answeredQuestions.includes(questionId)) {
                user.answeredQuestions.push(questionId);
            }
        }
        
        // 随机掉落元素
        let earnedElement;
        if (isChallenge) {
            // 挑战模式掉落雷或火
            earnedElement = Math.random() < 0.5 ? 'thunder' : 'fire';
        } else {
            earnedElement = getRandomElement();
        }
        
        user.elements[earnedElement]++;
        
        // 添加播报
        gameData.broadcasts.unshift({
            className: user.className,
            name: user.name,
            action: isChallenge ? '挑战成功' : '答题正确',
            element: earnedElement,
            time: Date.now()
        });
        
        // 只保留最近20条播报
        if (gameData.broadcasts.length > 20) {
            gameData.broadcasts = gameData.broadcasts.slice(0, 20);
        }
        
        saveData();
        
        res.json({
            correct: true,
            earnedElement,
            elements: user.elements
        });
    } else {
        res.json({
            correct: false,
            correctAnswer: question.answer,
            explanation: question.explanation
        });
    }
});

// 随机掉落元素(火和雷稀有)
function getRandomElement() {
    const rand = Math.random();
    
    if (rand < 0.50) return 'thunder';  // 15% 雷 (提高概率)
    if (rand < 0.50) return 'fire';      // 20% 火 (提高概率)
    if (rand < 0.50) return 'water';     // 15% 水
    if (rand < 0.99) return 'wind';      // 15% 风
    if (rand < 0.80) return 'rock';      // 15% 岩
    if (rand < 0.50) return 'grass';     // 15% 草
    return 'ice';                         // 5% 冰
}

// 开始挑战
app.post('/api/challenge/start', (req, res) => {
    const { userId } = req.body;
    const user = gameData.users.find(u => u.id === userId);
    
    if (!user) {
        return res.json({ success: false, message: '用户不存在' });
    }
    
    // 扣除元素
    const required = { fire: 1, water: 1, wind: 1, rock: 1, grass: 1 };
    for (let [elem, count] of Object.entries(required)) {
        if (user.elements[elem] < count) {
            return res.json({ success: false, message: '元素不足' });
        }
    }
    
    for (let [elem, count] of Object.entries(required)) {
        user.elements[elem] -= count;
    }
    
    saveData();
    res.json({ success: true, elements: user.elements });
});

// 赠送元素
app.post('/api/gift', (req, res) => {
    const { fromUser, targetClass, targetName, element, amount } = req.body;
    
    const sender = gameData.users.find(u => u.id === fromUser.id);
    if (!sender) {
        return res.json({ success: false, message: '发送者不存在' });
    }
    
    if (sender.elements[element] < amount) {
        return res.json({ success: false, message: '元素不足' });
    }
    
    let receiver = gameData.users.find(u => u.className === targetClass && u.name === targetName);
    if (!receiver) {
        // 创建新用户
        const studentInfo = students.find(s => s.className === targetClass && s.name === targetName);
        if (!studentInfo) {
            return res.json({ success: false, message: '目标用户不存在' });
        }
        
        receiver = {
            id: Date.now().toString(),
            className: targetClass,
            name: targetName,
            account: studentInfo.account,
            level: 1,
            elements: {
                fire: 0,
                water: 0,
                wind: 0,
                rock: 0,
                grass: 0,
                thunder: 0,
                ice: 0
            },
            wrongQuestions: [],
            answeredQuestions: [],
            answeredChallengeQuestions: []
        };
        gameData.users.push(receiver);
    }
    
    sender.elements[element] -= amount;
    receiver.elements[element] += amount;
    
    saveData();
    
    res.json({ 
        success: true, 
        fromElements: sender.elements,
        toElements: receiver.elements
    });
});

// 升级
app.post('/api/upgrade', (req, res) => {
    const { userId } = req.body;
    const user = gameData.users.find(u => u.id === userId);
    
    if (!user) {
        return res.json({ success: false, message: '用户不存在' });
    }
    
    // 检查条件
    if (user.elements.thunder < 1 || user.elements.fire < 1) {
        return res.json({ success: false, message: '稀有元素不足' });
    }
    
    const otherTotal = user.elements.water + user.elements.wind + 
                       user.elements.rock + user.elements.grass + 
                       user.elements.ice;
    
    if (otherTotal < 10) {
        return res.json({ success: false, message: '其他元素不足' });
    }
    
    // 扣除元素
    user.elements.thunder -= 1;
    user.elements.fire -= 1;
    
    let remaining = 10;
    const otherElements = ['water', 'wind', 'rock', 'grass', 'ice'];
    for (let elem of otherElements) {
        const deduct = Math.min(user.elements[elem], remaining);
        user.elements[elem] -= deduct;
        remaining -= deduct;
        if (remaining === 0) break;
    }
    
    user.level += 1;
    
    saveData();
    
    res.json({ 
        success: true, 
        level: user.level,
        elements: user.elements
    });
});

// 获取排行榜 - 班级
app.get('/api/rank/class/:className', (req, res) => {
    const classUsers = gameData.users
        .filter(u => u.className === req.params.className)
        .sort((a, b) => b.level - a.level);
    res.json(classUsers);
});

// 获取排行榜 - 总榜
app.get('/api/rank/total', (req, res) => {
    const rankedUsers = gameData.users
        .sort((a, b) => b.level - a.level)
        .slice(0, 50); // 只返回前50名
    res.json(rankedUsers);
});

// 获取播报
app.get('/api/broadcast', (req, res) => {
    const recentBroadcasts = gameData.broadcasts.slice(0, 5);
    res.json(recentBroadcasts);
});

// ========== 管理后台 API ==========

// 获取所有学生
app.get('/api/admin/students', (req, res) => {
    res.json(students);
});

// 添加学生
app.post('/api/admin/students', (req, res) => {
    const { className, name, account } = req.body;
    
    // 检查是否已存在
    const exists = students.find(s => s.className === className && s.name === name);
    if (exists) {
        return res.json({ success: false, message: '该学生已存在' });
    }
    
    students.push({ className, name, account });
    saveStudents();
    res.json({ success: true });
});

// 更新学生
app.put('/api/admin/students/:index', (req, res) => {
    const index = parseInt(req.params.index);
    const { className, name, account } = req.body;
    
    if (index >= 0 && index < students.length) {
        students[index] = { className, name, account };
        saveStudents();
        res.json({ success: true });
    } else {
        res.json({ success: false, message: '学生不存在' });
    }
});

// 删除学生
app.delete('/api/admin/students/:index', (req, res) => {
    const index = parseInt(req.params.index);
    
    if (index >= 0 && index < students.length) {
        students.splice(index, 1);
        saveStudents();
        res.json({ success: true });
    } else {
        res.json({ success: false, message: '学生不存在' });
    }
});

// 批量导入学生
app.post('/api/admin/students/batch', (req, res) => {
    try {
        const { students: newStudents } = req.body;
        
        if (!Array.isArray(newStudents)) {
            return res.json({ success: false, message: '数据格式错误: students字段必须是数组' });
        }
        
        if (newStudents.length === 0) {
            return res.json({ success: false, message: '没有要导入的数据' });
        }
        
        // 验证每个学生数据
        for (let i = 0; i < newStudents.length; i++) {
            const student = newStudents[i];
            if (!student.className || !student.name || !student.account) {
                return res.json({ 
                    success: false, 
                    message: `第 ${i + 1} 个学生数据不完整: ${JSON.stringify(student)}` 
                });
            }
        }
        
        // 导入数据
        students.push(...newStudents);
        saveStudents();
        
        console.log(`成功批量导入 ${newStudents.length} 个学生`);
        res.json({ success: true, count: newStudents.length });
    } catch (error) {
        console.error('批量导入学生失败:', error);
        res.json({ success: false, message: `服务器错误: ${error.message}` });
    }
});

// 获取所有题目
app.get('/api/admin/questions', (req, res) => {
    res.json(questions);
});

// 添加题目
app.post('/api/admin/questions', (req, res) => {
    const { question, answer, explanation, difficulty } = req.body;
    
    const newQuestion = {
        id: questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1,
        question,
        answer,
        explanation,
        difficulty: difficulty || '简单'
    };
    
    questions.push(newQuestion);
    saveQuestions();
    res.json({ success: true });
});

// 更新题目
app.put('/api/admin/questions/:index', (req, res) => {
    const index = parseInt(req.params.index);
    const { question, answer, explanation, difficulty } = req.body;
    
    if (index >= 0 && index < questions.length) {
        questions[index] = {
            ...questions[index],
            question,
            answer,
            explanation,
            difficulty: difficulty || '简单'
        };
        saveQuestions();
        res.json({ success: true });
    } else {
        res.json({ success: false, message: '题目不存在' });
    }
});

// 删除题目
app.delete('/api/admin/questions/:index', (req, res) => {
    const index = parseInt(req.params.index);
    
    if (index >= 0 && index < questions.length) {
        questions.splice(index, 1);
        saveQuestions();
        res.json({ success: true });
    } else {
        res.json({ success: false, message: '题目不存在' });
    }
});

// 批量导入题目
app.post('/api/admin/questions/batch', (req, res) => {
    const { questions: newQuestions } = req.body;
    
    if (!Array.isArray(newQuestions)) {
        return res.json({ success: false, message: '数据格式错误' });
    }
    
    const startId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
    
    newQuestions.forEach((q, index) => {
        questions.push({
            id: startId + index,
            question: q.question,
            answer: q.answer,
            explanation: q.explanation,
            difficulty: q.difficulty || '简单'
        });
    });
    
    saveQuestions();
    res.json({ success: true, count: newQuestions.length });
});

// 获取所有用户数据
app.get('/api/admin/users', (req, res) => {
    res.json(gameData.users);
});

// 删除用户数据
app.delete('/api/admin/users/:index', (req, res) => {
    const index = parseInt(req.params.index);
    
    if (index >= 0 && index < gameData.users.length) {
        gameData.users.splice(index, 1);
        saveData();
        res.json({ success: true });
    } else {
        res.json({ success: false, message: '用户不存在' });
    }
});

// 备份数据
app.get('/api/admin/backup', (req, res) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(__dirname, `backup_${timestamp}.json`);
    
    const backupData = {
        students,
        questions,
        gameData,
        timestamp: new Date().toISOString()
    };
    
    try {
        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
        res.json({ success: true, filename: `backup_${timestamp}.json` });
    } catch (error) {
        res.json({ success: false, message: '备份失败' });
    }
});

// 导出所有数据
app.get('/api/admin/export', (req, res) => {
    res.json({
        students,
        questions,
        users: gameData.users,
        broadcasts: gameData.broadcasts
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║    BBK数学答题王 服务器已启动          ║
║                                        ║
║    游戏地址: http://localhost:${PORT}       ║
║    管理后台: http://localhost:${PORT}/admin.html
║                                        ║
╚════════════════════════════════════════╝
    `);
});
