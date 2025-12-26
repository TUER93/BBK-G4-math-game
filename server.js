const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务 - 明确指定 audio 目录
app.use('/audio', express.static(path.join(__dirname, 'audio')));
app.use(express.static(__dirname));

// 数据存储目录（支持云托管持久化存储）
const DATA_DIR = process.env.DATA_DIR || __dirname;

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log(`📁 数据存储目录: ${DATA_DIR}`);

// 数据文件路径
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const DATA_TEMPLATE_FILE = path.join(__dirname, 'data.template.json');
const QUESTIONS_FILE = path.join(__dirname, 'questions.json');
const STUDENTS_FILE = path.join(__dirname, 'students.json');

// 初始化数据
let gameData = {
    users: [],
    broadcasts: []
};

// 加载数据
function loadData() {
    // 如果 data.json 不存在，但模板文件存在，则复制模板
    if (!fs.existsSync(DATA_FILE) && fs.existsSync(DATA_TEMPLATE_FILE)) {
        console.log('📋 首次启动，从模板文件初始化数据...');
        try {
            fs.copyFileSync(DATA_TEMPLATE_FILE, DATA_FILE);
            console.log('✅ 数据初始化成功');
        } catch (error) {
            console.error('❌ 复制模板文件失败:', error);
        }
    }
    
    if (fs.existsSync(DATA_FILE)) {
        try {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            gameData = JSON.parse(data);
            console.log(`✅ 已加载 ${gameData.users?.length || 0} 个用户数据`);
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    } else {
        console.log('⚠️  未找到数据文件，使用空数据');
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
            answeredChallengeQuestions: [], // 已做过的挑战题ID列表
            dailyUsage: {
                date: new Date().toDateString(),
                duration: 0, // 已使用时长（秒）
                loginTime: Date.now() // 本次登录时间
            },
            statistics: {
                totalQuestions: 0, // 总答题数
                correctQuestions: 0, // 正确题数
                accuracy: 0 // 正确率（百分比）
            },
            answerHistory: [] // 答题历史记录
        };
        gameData.users.push(user);
        saveData();
    } else {
        // 确保旧用户也有这些字段
        if (!user.answeredQuestions) user.answeredQuestions = [];
        if (!user.answeredChallengeQuestions) user.answeredChallengeQuestions = [];
        
        // 初始化统计数据
        if (!user.statistics) {
            user.statistics = {
                totalQuestions: 0,
                correctQuestions: 0,
                accuracy: 0
            };
        }
        
        // 初始化答题历史
        if (!user.answerHistory) {
            user.answerHistory = [];
        }
        
        // 初始化或重置每日使用时长
        const today = new Date().toDateString();
        if (!user.dailyUsage || user.dailyUsage.date !== today) {
            // 新的一天，重置时长
            user.dailyUsage = {
                date: today,
                duration: 0,
                loginTime: Date.now()
            };
        } else {
            // 同一天，更新登录时间
            user.dailyUsage.loginTime = Date.now();
        }
        
        saveData();
    }
    
    // 检查今日是否还有剩余时长
    const maxDuration = 30 * 60; // 30分钟 = 1800秒
    const remainingTime = maxDuration - (user.dailyUsage?.duration || 0);
    
    res.json({ 
        success: true, 
        user,
        remainingTime: Math.max(0, remainingTime)
    });
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
    
    // 确保用户有已答题记录和统计数据
    if (!user.answeredQuestions) user.answeredQuestions = [];
    if (!user.answeredChallengeQuestions) user.answeredChallengeQuestions = [];
    if (!user.statistics) {
        user.statistics = {
            totalQuestions: 0,
            correctQuestions: 0,
            accuracy: 0
        };
    }
    if (!user.answerHistory) {
        user.answerHistory = [];
    }
    
    const correct = answer.toString().trim() === question.answer.toString().trim();
    
    // 更新统计数据
    user.statistics.totalQuestions++;
    if (correct) {
        user.statistics.correctQuestions++;
    }
    user.statistics.accuracy = user.statistics.totalQuestions > 0 
        ? Math.round((user.statistics.correctQuestions / user.statistics.totalQuestions) * 100) 
        : 0;
    
    // 记录答题历史（保留最近100条）
    user.answerHistory.push({
        questionId,
        question: question.question,
        userAnswer: answer,
        correctAnswer: question.answer,
        isCorrect: correct,
        timestamp: Date.now(),
        accuracy: user.statistics.accuracy // 记录当时的累计正确率
    });
    
    // 只保留最近100条记录
    if (user.answerHistory.length > 100) {
        user.answerHistory = user.answerHistory.slice(-100);
    }
    
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
            elements: user.elements,
            statistics: user.statistics
        });
    } else {
        res.json({
            correct: false,
            correctAnswer: question.answer,
            explanation: question.explanation,
            statistics: user.statistics
        });
    }
});

// 随机掉落元素
// 水、风、岩、草：各22.5%（共90%）- 高概率
// 火、雷：各5%（共10%）- 低概率（稀有）
function getRandomElement() {
    const rand = Math.random();
    
    // 水 22.5%
    if (rand < 0.225) return 'water';
    
    // 风 22.5% (0.225 - 0.45)
    if (rand < 0.45) return 'wind';
    
    // 岩 22.5% (0.45 - 0.675)
    if (rand < 0.675) return 'rock';
    
    // 草 22.5% (0.675 - 0.90)
    if (rand < 0.90) return 'grass';
    
    // 火 5% (0.90 - 0.95)
    if (rand < 0.95) return 'fire';
    
    // 雷 5% (0.95 - 1.00)
    return 'thunder';
}

// 开始挑战
app.post('/api/challenge/start', (req, res) => {
    const { userId } = req.body;
    const user = gameData.users.find(u => u.id === userId);
    
    if (!user) {
        return res.json({ success: false, message: '用户不存在' });
    }
    
    // 扣除元素（只需要水、风、岩、草各1个）
    const required = { water: 1, wind: 1, rock: 1, grass: 1 };
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

// 获取排行榜 - 班级（前20名）
app.get('/api/rank/class/:className', (req, res) => {
    const classUsers = gameData.users
        .filter(u => u.className === req.params.className)
        .sort((a, b) => b.level - a.level)
        .slice(0, 20); // 只返回前20名
    res.json(classUsers);
});

// 获取个人答题历史
app.get('/api/answer-history/:userId', (req, res) => {
    const user = gameData.users.find(u => u.id === req.params.userId);
    
    if (!user) {
        return res.json({ success: false, message: '用户不存在' });
    }
    
    // 确保有答题历史
    if (!user.answerHistory) {
        user.answerHistory = [];
    }
    
    res.json({ 
        success: true, 
        history: user.answerHistory,
        statistics: user.statistics
    });
});

// 获取排行榜 - 总榜（前90名）
app.get('/api/rank/total', (req, res) => {
    const rankedUsers = gameData.users
        .sort((a, b) => b.level - a.level)
        .slice(0, 90); // 只返回前90名
    res.json(rankedUsers);
});

// 获取播报
app.get('/api/broadcast', (req, res) => {
    const recentBroadcasts = gameData.broadcasts.slice(0, 5);
    res.json(recentBroadcasts);
});

// 更新用户使用时长
app.post('/api/update-usage', (req, res) => {
    const { userId } = req.body;
    const user = gameData.users.find(u => u.id === userId);
    
    if (!user) {
        return res.json({ success: false, message: '用户不存在' });
    }
    
    const today = new Date().toDateString();
    
    // 如果是新的一天，重置时长
    if (!user.dailyUsage || user.dailyUsage.date !== today) {
        user.dailyUsage = {
            date: today,
            duration: 0,
            loginTime: Date.now()
        };
    }
    
    // 计算本次会话使用时长（秒）
    const sessionDuration = Math.floor((Date.now() - user.dailyUsage.loginTime) / 1000);
    user.dailyUsage.duration += sessionDuration;
    user.dailyUsage.loginTime = Date.now(); // 重置登录时间
    
    const maxDuration = 30 * 60; // 30分钟
    const remainingTime = Math.max(0, maxDuration - user.dailyUsage.duration);
    
    saveData();
    
    res.json({ 
        success: true, 
        remainingTime,
        usedTime: user.dailyUsage.duration
    });
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

// 更新用户数据（等级和元素）
app.put('/api/admin/users/:index', (req, res) => {
    const index = parseInt(req.params.index);
    const { level, elements } = req.body;
    
    if (index >= 0 && index < gameData.users.length) {
        const user = gameData.users[index];
        
        // 更新等级
        if (level !== undefined) {
            user.level = parseInt(level);
        }
        
        // 更新元素
        if (elements) {
            user.elements = {
                fire: parseInt(elements.fire) || 0,
                water: parseInt(elements.water) || 0,
                wind: parseInt(elements.wind) || 0,
                rock: parseInt(elements.rock) || 0,
                grass: parseInt(elements.grass) || 0,
                thunder: parseInt(elements.thunder) || 0,
                ice: parseInt(elements.ice) || 0
            };
        }
        
        saveData();
        res.json({ success: true, user });
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

// 下载数据文件（直接下载 data.json）
app.get('/api/admin/download-data', (req, res) => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const timestamp = new Date().toISOString().split('T')[0];
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="data_${timestamp}.json"`);
            
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            res.send(data);
        } else {
            res.status(404).json({ success: false, message: '数据文件不存在' });
        }
    } catch (error) {
        console.error('下载数据文件失败:', error);
        res.status(500).json({ success: false, message: '下载失败' });
    }
});

// 批量赠送元素给用户
app.post('/api/admin/batch-gift', (req, res) => {
    const { elementType, amount, scope, targetClass } = req.body;
    
    // 验证参数
    const validElements = ['fire', 'water', 'wind', 'rock', 'grass', 'thunder', 'ice'];
    if (!validElements.includes(elementType)) {
        return res.status(400).json({ success: false, message: '无效的元素类型' });
    }
    
    if (!amount || amount <= 0 || amount > 100) {
        return res.status(400).json({ success: false, message: '赠送数量必须在 1-100 之间' });
    }
    
    if (!scope || !['all', 'class'].includes(scope)) {
        return res.status(400).json({ success: false, message: '无效的赠送范围' });
    }
    
    if (scope === 'class' && !targetClass) {
        return res.status(400).json({ success: false, message: '请指定目标班级' });
    }
    
    try {
        // 筛选目标用户
        let targetUsers = gameData.users;
        if (scope === 'class') {
            targetUsers = gameData.users.filter(u => u.className === targetClass);
        }
        
        if (targetUsers.length === 0) {
            return res.status(404).json({ success: false, message: '没有找到目标用户' });
        }
        
        // 给每个用户赠送元素
        let affectedCount = 0;
        targetUsers.forEach(user => {
            if (!user.elements) {
                user.elements = {
                    fire: 0, water: 0, wind: 0, rock: 0,
                    grass: 0, thunder: 0, ice: 0
                };
            }
            
            user.elements[elementType] = (user.elements[elementType] || 0) + amount;
            affectedCount++;
        });
        
        // 保存数据
        saveData();
        
        const elementNames = {
            fire: '火🔥', water: '水💧', wind: '风🌪️', rock: '岩🪨',
            grass: '草🌿', thunder: '雷⚡', ice: '冰❄️'
        };
        
        console.log(`🎁 批量赠送成功: 给 ${affectedCount} 名用户赠送 ${elementNames[elementType]} × ${amount}`);
        
        res.json({ 
            success: true, 
            message: '赠送成功',
            affectedCount,
            elementType,
            amount
        });
    } catch (error) {
        console.error('批量赠送失败:', error);
        res.status(500).json({ success: false, message: '赠送失败' });
    }
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
