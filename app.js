// 配置服务器地址 - 自动检测环境
const SERVER_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : window.location.origin;

// 全局状态
let currentUser = null;
let currentQuestion = null;
let isInChallenge = false;
let challengeTimer = null;
let cooldownTimer = null;
let broadcastInterval = null;
let usageTimer = null; // 使用时长计时器
let remainingTime = 0; // 剩余时长（秒）
let userStatistics = { totalQuestions: 0, correctQuestions: 0, accuracy: 0 }; // 用户统计数据

// 元素名称映射
const elementNames = {
    fire: { name: '火', icon: '🔥' },
    water: { name: '水', icon: '💧' },
    wind: { name: '风', icon: '🌪️' },
    rock: { name: '岩', icon: '🪨' },
    grass: { name: '草', icon: '🌿' },
    thunder: { name: '雷', icon: '⚡' },
    ice: { name: '冰', icon: '❄️' }
};

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    initGame();
    startBroadcastUpdate();
});

// ========== 登录相关 ==========
function initLogin() {
    const classSelect = document.getElementById('classSelect');
    const nameSelect = document.getElementById('nameSelect');
    const accountInput = document.getElementById('accountInput');
    const loginBtn = document.getElementById('loginBtn');

    // 加载班级列表
    loadClasses();

    classSelect.addEventListener('change', async () => {
        const className = classSelect.value;
        if (className) {
            await loadStudents(className);
            nameSelect.disabled = false;
        } else {
            nameSelect.innerHTML = '<option value="">请先选择班级</option>';
            nameSelect.disabled = true;
            accountInput.disabled = true;
            loginBtn.disabled = true;
        }
    });

    nameSelect.addEventListener('change', () => {
        if (nameSelect.value) {
            accountInput.disabled = false;
        } else {
            accountInput.disabled = true;
            loginBtn.disabled = true;
        }
    });

    accountInput.addEventListener('input', () => {
        loginBtn.disabled = !accountInput.value.trim();
    });

    loginBtn.addEventListener('click', login);
}

async function loadClasses() {
    try {
        const response = await fetch(`${SERVER_URL}/api/classes`);
        const classes = await response.json();
        const classSelect = document.getElementById('classSelect');
        
        classSelect.innerHTML = '<option value="">请选择班级</option>';
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls;
            option.textContent = cls;
            classSelect.appendChild(option);
        });
    } catch (error) {
        console.error('加载班级失败:', error);
        alert('连接服务器失败,请确保服务器已启动');
    }
}

async function loadStudents(className) {
    try {
        const response = await fetch(`${SERVER_URL}/api/students/${className}`);
        const students = await response.json();
        const nameSelect = document.getElementById('nameSelect');
        
        nameSelect.innerHTML = '<option value="">请选择姓名</option>';
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.name;
            option.dataset.account = student.account;
            option.textContent = student.name;
            nameSelect.appendChild(option);
        });
    } catch (error) {
        console.error('加载学生失败:', error);
    }
}

async function login() {
    const className = document.getElementById('classSelect').value;
    const name = document.getElementById('nameSelect').value;
    const account = document.getElementById('accountInput').value.trim();
    
    const selectedOption = document.querySelector('#nameSelect option:checked');
    const correctAccount = selectedOption.dataset.account;
    
    if (account !== correctAccount) {
        alert('账号与姓名不匹配,请重新输入!');
        return;
    }

    try {
        const response = await fetch(`${SERVER_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ className, name, account })
        });
        
        const data = await response.json();
        if (data.success) {
            currentUser = data.user;
            remainingTime = data.remainingTime || 0;
            
            // 初始化统计数据
            if (currentUser.statistics) {
                userStatistics = currentUser.statistics;
            }
            
            // 检查剩余时长
            if (remainingTime <= 0) {
                alert('⏰ 今天的使用时长已用完！\n明天再来吧~ 💪');
                return;
            }
            
            showGamePage();
        } else {
            alert(data.message || '登录失败');
        }
    } catch (error) {
        console.error('登录失败:', error);
        alert('登录失败,请重试');
    }
}

function showGamePage() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('gamePage').classList.add('active');
    
    // 更新用户信息
    document.getElementById('playerName').textContent = `${currentUser.className} - ${currentUser.name}`;
    updateUserDisplay();
    
    // 初始化并播放背景音乐
    audioManager.initAudio().then(() => {
        audioManager.playBGM();
        console.log('🎵 背景音乐已启动');
    });
    
    // 启动使用时长计时器
    startUsageTimer();
    
    // 自动加载第一道题目
    loadQuestion();
}

function updateUserDisplay() {
    document.getElementById('playerLevel').textContent = currentUser.level;
    document.getElementById('fireCount').textContent = currentUser.elements.fire;
    document.getElementById('waterCount').textContent = currentUser.elements.water;
    document.getElementById('windCount').textContent = currentUser.elements.wind;
    document.getElementById('rockCount').textContent = currentUser.elements.rock;
    document.getElementById('grassCount').textContent = currentUser.elements.grass;
    document.getElementById('thunderCount').textContent = currentUser.elements.thunder;
    document.getElementById('iceCount').textContent = currentUser.elements.ice;
    
    // 更新正确率显示
    updateAccuracyDisplay();
    
    // 更新剩余时长显示
    updateTimeDisplay();
}

function updateAccuracyDisplay() {
    const accuracyElement = document.getElementById('accuracyRate');
    if (accuracyElement) {
        accuracyElement.textContent = `${userStatistics.accuracy}%`;
        
        // 根据正确率设置颜色
        if (userStatistics.accuracy >= 90) {
            accuracyElement.style.color = '#48bb78'; // 绿色
        } else if (userStatistics.accuracy >= 70) {
            accuracyElement.style.color = '#ed8936'; // 橙色
        } else {
            accuracyElement.style.color = '#f56565'; // 红色
        }
    }
}

// ========== 答题相关 ==========
function initGame() {
    document.getElementById('submitBtn').addEventListener('click', submitAnswer);
    
    // 初始化数字键盘
    initNumberPad();
    
    // 回车提交(保留键盘输入支持)
    document.getElementById('answerInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !document.getElementById('submitBtn').disabled) {
            submitAnswer();
        }
    });
    
    // 挑战模式
    document.getElementById('challengeBtn').addEventListener('click', showChallengeModal);
    document.getElementById('confirmChallengeBtn').addEventListener('click', startChallenge);
    document.getElementById('cancelChallengeBtn').addEventListener('click', () => {
        document.getElementById('challengeModal').classList.remove('show');
    });
    
    // 赠送
    document.getElementById('giftBtn').addEventListener('click', showGiftModal);
    document.getElementById('confirmGiftBtn').addEventListener('click', confirmGift);
    document.getElementById('cancelGiftBtn').addEventListener('click', () => {
        document.getElementById('giftModal').classList.remove('show');
    });
    
    const giftClassSelect = document.getElementById('giftClassSelect');
    giftClassSelect.addEventListener('change', async () => {
        const className = giftClassSelect.value;
        if (className) {
            await loadGiftStudents(className);
        }
    });
    
    // 升级
    document.getElementById('upgradeBtn').addEventListener('click', showUpgradeModal);
    document.getElementById('confirmUpgradeBtn').addEventListener('click', confirmUpgrade);
    document.getElementById('cancelUpgradeBtn').addEventListener('click', () => {
        document.getElementById('upgradeModal').classList.remove('show');
    });
    
    // 错题本
    document.getElementById('wrongQuestionsBtn').addEventListener('click', showWrongQuestions);
    document.getElementById('downloadWrongBtn').addEventListener('click', downloadWrongQuestions);
    document.getElementById('closeWrongBtn').addEventListener('click', () => {
        document.getElementById('wrongQuestionsModal').classList.remove('show');
    });
    
    // 排行榜
    document.getElementById('rankBtn').addEventListener('click', showRankModal);
    document.getElementById('classRankTab').addEventListener('click', () => showRank('class'));
    document.getElementById('totalRankTab').addEventListener('click', () => showRank('total'));
    document.getElementById('closeRankBtn').addEventListener('click', () => {
        document.getElementById('rankModal').classList.remove('show');
    });
    
    // 个人答题统计
    document.getElementById('myStatsBtn').addEventListener('click', showMyStatsModal);
    document.getElementById('closeStatsBtn').addEventListener('click', () => {
        document.getElementById('myStatsModal').classList.remove('show');
    });
    
    // 音效控制
    document.getElementById('muteBtn').addEventListener('click', toggleMute);
}

// 初始化数字键盘
function initNumberPad() {
    const numberPad = document.getElementById('numberPad');
    const answerInput = document.getElementById('answerInput');
    
    // 为所有数字按钮添加点击事件
    const numberBtns = numberPad.querySelectorAll('.number-btn');
    numberBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const value = btn.textContent;
            
            if (value === '删除') {
                // 删除最后一个字符
                answerInput.value = answerInput.value.slice(0, -1);
            } else if (value === '-') {
                // 处理负号
                if (answerInput.value === '') {
                    answerInput.value = '-';
                } else if (answerInput.value === '-') {
                    answerInput.value = '';
                }
            } else {
                // 添加数字
                // 如果当前值是单独的'-',则追加数字
                // 否则直接追加
                answerInput.value += value;
            }
            
            // 播放点击音效(可选)
            // audioManager.playClickSound();
        });
    });
}

// 切换静音
function toggleMute() {
    const btn = document.getElementById('muteBtn');
    const isMuted = audioManager.toggleMute();
    btn.textContent = isMuted ? '🔇 静音' : '🔊 音效';
}

async function loadQuestion() {
    try {
        const url = `${SERVER_URL}/api/question?userId=${currentUser.id}&isChallenge=${isInChallenge}`;
        const response = await fetch(url);
        const data = await response.json();
        
        // 检查是否已完成所有题目
        if (data.completed) {
            document.getElementById('questionContent').innerHTML = `
                <div style="text-align: center; font-size: 32px; color: #48bb78; padding: 40px;">
                    🎉 ${data.message} 🎉
                </div>
            `;
            document.getElementById('answerInput').disabled = true;
            document.getElementById('submitBtn').disabled = true;
            document.getElementById('numberPad').style.display = 'none';
            document.getElementById('resultDisplay').classList.remove('show');
            
            // 播放胜利音效
            audioManager.playUpgradeSound();
            return;
        }
        
        currentQuestion = data;
        
        document.getElementById('questionContent').textContent = currentQuestion.question;
        document.getElementById('answerInput').value = '';
        document.getElementById('answerInput').disabled = false;
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('resultDisplay').classList.remove('show');
        
        // 显示数字键盘
        document.getElementById('numberPad').style.display = 'block';
        
        // 如果是挑战模式,启动倒计时
        if (isInChallenge) {
            startChallengeTimer();
        }
    } catch (error) {
        console.error('加载题目失败:', error);
    }
}

async function submitAnswer() {
    const userAnswer = document.getElementById('answerInput').value.trim();
    if (!userAnswer) {
        alert('请输入答案');
        return;
    }
    
    try {
        const response = await fetch(`${SERVER_URL}/api/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                questionId: currentQuestion.id,
                answer: userAnswer,
                isChallenge: isInChallenge
            })
        });
        
        const result = await response.json();
        showResult(result);
        
        // 更新用户数据
        if (result.correct) {
            currentUser.elements = result.elements;
        }
        
        // 更新统计数据
        if (result.statistics) {
            userStatistics = result.statistics;
        }
        
        updateUserDisplay();
    } catch (error) {
        console.error('提交答案失败:', error);
    }
}

function showResult(result) {
    const resultDisplay = document.getElementById('resultDisplay');
    const answerInput = document.getElementById('answerInput');
    const submitBtn = document.getElementById('submitBtn');
    const numberPad = document.getElementById('numberPad');
    
    answerInput.disabled = true;
    submitBtn.disabled = true;
    numberPad.style.display = 'none'; // 隐藏数字键盘
    
    if (result.correct) {
        // 播放音效并获取连杀信息
        const killInfo = audioManager.playCorrectSound();
        
        // 显示连杀通知
        if (killInfo.killCount >= 2) {
            showKillNotification(killInfo.killText);
        }
        
        // 更新连杀显示
        updateStreakDisplay();
        
        resultDisplay.className = 'result-display correct show';
        resultDisplay.innerHTML = `
            <div>✅ 回答正确!</div>
            ${killInfo.killCount >= 2 ? `<div style="color: #f56565; font-size: 20px; margin: 10px 0;">${killInfo.killText}</div>` : ''}
            <div class="element-reward">
                获得元素: ${elementNames[result.earnedElement].icon} ${elementNames[result.earnedElement].name} +1
            </div>
            <div style="margin-top: 10px; color: #48bb78; font-size: 14px;">2秒后自动进入下一题...</div>
        `;
        
        if (isInChallenge) {
            clearInterval(challengeTimer);
            document.getElementById('timerDisplay').textContent = '';
            isInChallenge = false;
        }
        
        // 2秒后自动加载下一题
        setTimeout(() => {
            loadQuestion();
        }, 2000);
    } else {
        // 答错播放音效
        audioManager.playWrongSound();
        // 答错重置连杀
        audioManager.resetStreak();
        updateStreakDisplay();
        
        resultDisplay.className = 'result-display wrong show';
        resultDisplay.innerHTML = `
            <div>❌ 回答错误</div>
            <div class="explanation">
                <strong>正确答案:</strong> ${result.correctAnswer}<br>
                <strong>解析:</strong> ${result.explanation}
            </div>
            <div style="margin-top: 10px; color: #f56565;">15秒后自动继续答题</div>
        `;
        
        // 记录错题
        if (!currentUser.wrongQuestions) {
            currentUser.wrongQuestions = [];
        }
        currentUser.wrongQuestions.push({
            question: currentQuestion.question,
            userAnswer: document.getElementById('answerInput').value,
            correctAnswer: result.correctAnswer,
            explanation: result.explanation,
            time: new Date().toLocaleString()
        });
        
        if (isInChallenge) {
            clearInterval(challengeTimer);
            document.getElementById('timerDisplay').textContent = '';
            isInChallenge = false;
        }
        
        // 15秒冷却后自动加载下一题
        startCooldown();
    }
}

function startCooldown() {
    let seconds = 15;
    const resultDisplay = document.getElementById('resultDisplay');
    
    cooldownTimer = setInterval(() => {
        seconds--;
        if (seconds > 0) {
            // 更新倒计时显示
            const wrongDiv = resultDisplay.querySelector('div:last-child');
            if (wrongDiv) {
                wrongDiv.textContent = `${seconds}秒后自动继续答题`;
            }
        } else {
            clearInterval(cooldownTimer);
            
            // 冷却结束后自动加载下一题
            setTimeout(() => {
                loadQuestion();
            }, 500);
        }
    }, 1000);
}

// ========== 挑战模式 ==========
function showChallengeModal() {
    document.getElementById('challengeModal').classList.add('show');
}

async function startChallenge() {
    // 检查元素是否足够（只需要水、风、岩、草）
    const required = { water: 1, wind: 1, rock: 1, grass: 1 };
    for (let [elem, count] of Object.entries(required)) {
        if (currentUser.elements[elem] < count) {
            alert(`元素不足! 需要${elementNames[elem].name}${elementNames[elem].icon}×${count}`);
            return;
        }
    }
    
    try {
        const response = await fetch(`${SERVER_URL}/api/challenge/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id })
        });
        
        const result = await response.json();
        if (result.success) {
            currentUser.elements = result.elements;
            updateUserDisplay();
            isInChallenge = true;
            document.getElementById('challengeModal').classList.remove('show');
            loadQuestion();
        }
    } catch (error) {
        console.error('开始挑战失败:', error);
    }
}

function startChallengeTimer() {
    let seconds = 60;
    const timerDisplay = document.getElementById('timerDisplay');
    timerDisplay.textContent = `⏱️ ${seconds}秒`;
    
    challengeTimer = setInterval(() => {
        seconds--;
        timerDisplay.textContent = `⏱️ ${seconds}秒`;
        
        if (seconds <= 10) {
            timerDisplay.classList.add('warning');
        }
        
        if (seconds <= 0) {
            clearInterval(challengeTimer);
            timerDisplay.textContent = '';
            timerDisplay.classList.remove('warning');
            isInChallenge = false;
            
            alert('挑战超时! 2秒后继续答题');
            document.getElementById('answerInput').disabled = true;
            document.getElementById('submitBtn').disabled = true;
            document.getElementById('numberPad').style.display = 'none';
            
            // 2秒后自动加载下一题
            setTimeout(() => {
                loadQuestion();
            }, 2000);
        }
    }, 1000);
}

// ========== 赠送功能 ==========
async function showGiftModal() {
    const modal = document.getElementById('giftModal');
    modal.classList.add('show');
    
    // 加载班级列表
    try {
        const response = await fetch(`${SERVER_URL}/api/classes`);
        const classes = await response.json();
        const giftClassSelect = document.getElementById('giftClassSelect');
        
        giftClassSelect.innerHTML = '<option value="">请选择班级</option>';
        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls;
            option.textContent = cls;
            giftClassSelect.appendChild(option);
        });
    } catch (error) {
        console.error('加载班级失败:', error);
    }
}

async function loadGiftStudents(className) {
    try {
        const response = await fetch(`${SERVER_URL}/api/students/${className}`);
        const students = await response.json();
        const nameSelect = document.getElementById('giftNameSelect');
        
        nameSelect.innerHTML = '<option value="">请选择姓名</option>';
        nameSelect.disabled = false;
        
        students.forEach(student => {
            if (student.name !== currentUser.name || className !== currentUser.className) {
                const option = document.createElement('option');
                option.value = student.name;
                option.dataset.className = className;
                option.textContent = student.name;
                nameSelect.appendChild(option);
            }
        });
    } catch (error) {
        console.error('加载学生失败:', error);
    }
}

async function confirmGift() {
    const targetClass = document.getElementById('giftClassSelect').value;
    const targetName = document.getElementById('giftNameSelect').value;
    const element = document.getElementById('giftElementSelect').value;
    const amount = parseInt(document.getElementById('giftAmountInput').value);
    
    if (!targetClass || !targetName) {
        alert('请选择赠送对象');
        return;
    }
    
    if (amount <= 0) {
        alert('赠送数量必须大于0');
        return;
    }
    
    if (currentUser.elements[element] < amount) {
        alert(`${elementNames[element].name}元素不足!`);
        return;
    }
    
    try {
        const response = await fetch(`${SERVER_URL}/api/gift`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromUser: currentUser,
                targetClass,
                targetName,
                element,
                amount
            })
        });
        
        const result = await response.json();
        if (result.success) {
            // 播放赠送音效
            audioManager.playGiftSound();
            
            currentUser.elements = result.fromElements;
            updateUserDisplay();
            alert(`💝 成功赠送${elementNames[element].icon}${elementNames[element].name}×${amount}给${targetClass}-${targetName}!`);
            document.getElementById('giftModal').classList.remove('show');
        } else {
            alert(result.message || '赠送失败');
        }
    } catch (error) {
        console.error('赠送失败:', error);
        alert('赠送失败');
    }
}

// ========== 升级功能 ==========
function showUpgradeModal() {
    const modal = document.getElementById('upgradeModal');
    document.getElementById('currentLevel').textContent = currentUser.level;
    
    // 检查升级条件
    const hasThunder = currentUser.elements.thunder >= 1;
    const hasFire = currentUser.elements.fire >= 1;
    const otherTotal = currentUser.elements.water + currentUser.elements.wind + 
                       currentUser.elements.rock + currentUser.elements.grass + 
                       currentUser.elements.ice;
    const hasOthers = otherTotal >= 10;
    
    const statusDiv = document.getElementById('upgradeStatus');
    statusDiv.innerHTML = `
        <div>雷⚡: ${currentUser.elements.thunder}/1 ${hasThunder ? '✅' : '❌'}</div>
        <div>火🔥: ${currentUser.elements.fire}/1 ${hasFire ? '✅' : '❌'}</div>
        <div>其他元素: ${otherTotal}/10 ${hasOthers ? '✅' : '❌'}</div>
    `;
    
    document.getElementById('confirmUpgradeBtn').disabled = !(hasThunder && hasFire && hasOthers);
    modal.classList.add('show');
}

async function confirmUpgrade() {
    try {
        const response = await fetch(`${SERVER_URL}/api/upgrade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id })
        });
        
        const result = await response.json();
        if (result.success) {
            // 播放升级音效
            audioManager.playUpgradeSound();
            
            currentUser.level = result.level;
            currentUser.elements = result.elements;
            updateUserDisplay();
            alert(`🎉 升级成功! 当前等级: ${result.level}`);
            document.getElementById('upgradeModal').classList.remove('show');
        } else {
            alert(result.message || '升级失败');
        }
    } catch (error) {
        console.error('升级失败:', error);
        alert('升级失败');
    }
}

// ========== 错题本 ==========
function showWrongQuestions() {
    const modal = document.getElementById('wrongQuestionsModal');
    const list = document.getElementById('wrongQuestionsList');
    
    if (!currentUser.wrongQuestions || currentUser.wrongQuestions.length === 0) {
        list.innerHTML = '<div class="empty-message">暂无错题记录</div>';
    } else {
        list.innerHTML = currentUser.wrongQuestions.map((item, index) => `
            <div class="wrong-question-item">
                <div class="question-text">${index + 1}. ${item.question}</div>
                <div class="answer-info">你的答案: ${item.userAnswer}</div>
                <div class="answer-info" style="color: #48bb78;">正确答案: ${item.correctAnswer}</div>
                <div class="explanation">${item.explanation}</div>
                <div class="answer-info" style="color: #718096; margin-top: 5px;">时间: ${item.time}</div>
            </div>
        `).join('');
    }
    
    modal.classList.add('show');
}

function downloadWrongQuestions() {
    if (!currentUser.wrongQuestions || currentUser.wrongQuestions.length === 0) {
        alert('暂无错题可下载');
        return;
    }
    
    let content = `${currentUser.className} - ${currentUser.name} 的错题本\n`;
    content += `生成时间: ${new Date().toLocaleString()}\n`;
    content += '='.repeat(50) + '\n\n';
    
    currentUser.wrongQuestions.forEach((item, index) => {
        content += `${index + 1}. ${item.question}\n`;
        content += `   你的答案: ${item.userAnswer}\n`;
        content += `   正确答案: ${item.correctAnswer}\n`;
        content += `   解析: ${item.explanation}\n`;
        content += `   时间: ${item.time}\n\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `错题本_${currentUser.name}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

// ========== 排行榜 ==========
async function showRankModal() {
    const modal = document.getElementById('rankModal');
    modal.classList.add('show');
    showRank('total');
}

async function showRank(type) {
    try {
        const url = type === 'class' 
            ? `${SERVER_URL}/api/rank/class/${currentUser.className}`
            : `${SERVER_URL}/api/rank/total`;
        
        const response = await fetch(url);
        const ranks = await response.json();
        
        const list = document.getElementById('rankList');
        
        // 添加提示信息
        const tipText = type === 'class' 
            ? `<div style="text-align: center; color: #718096; padding: 10px; font-size: 14px;">仅展示班级前20名</div>`
            : `<div style="text-align: center; color: #718096; padding: 10px; font-size: 14px;">仅展示年级前90名</div>`;
        
        list.innerHTML = tipText + ranks.map((user, index) => {
            let className = '';
            if (index === 0) className = 'top1';
            else if (index === 1) className = 'top2';
            else if (index === 2) className = 'top3';
            
            return `
                <div class="rank-item ${className}">
                    <div class="rank-number">${index + 1}</div>
                    <div class="rank-info">
                        <div class="rank-name">${user.name}</div>
                        <div class="rank-class">${user.className}</div>
                    </div>
                    <div class="rank-level">Lv.${user.level}</div>
                </div>
            `;
        }).join('');
        
        // 更新标签状态
        document.getElementById('classRankTab').classList.toggle('active', type === 'class');
        document.getElementById('totalRankTab').classList.toggle('active', type === 'total');
    } catch (error) {
        console.error('加载排行榜失败:', error);
    }
}

// ========== 个人答题统计 ==========
async function showMyStatsModal() {
    const modal = document.getElementById('myStatsModal');
    modal.classList.add('show');
    
    try {
        const response = await fetch(`${SERVER_URL}/api/answer-history/${currentUser.id}`);
        const data = await response.json();
        
        if (data.success) {
            // 显示统计信息
            const statsInfo = document.getElementById('statsInfo');
            statsInfo.innerHTML = `
                <div class="stats-summary">
                    <div class="stat-item">
                        <div class="stat-label">总答题数</div>
                        <div class="stat-value">${data.statistics.totalQuestions}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">正确题数</div>
                        <div class="stat-value" style="color: #48bb78;">${data.statistics.correctQuestions}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">错误题数</div>
                        <div class="stat-value" style="color: #f56565;">${data.statistics.totalQuestions - data.statistics.correctQuestions}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">总正确率</div>
                        <div class="stat-value" style="color: ${data.statistics.accuracy >= 90 ? '#48bb78' : data.statistics.accuracy >= 70 ? '#ed8936' : '#f56565'}; font-size: 32px;">
                            ${data.statistics.accuracy}%
                        </div>
                    </div>
                </div>
            `;
            
            // 绘制折线图
            drawAccuracyChart(data.history);
        }
    } catch (error) {
        console.error('加载答题历史失败:', error);
    }
}

function drawAccuracyChart(history) {
    const canvas = document.getElementById('accuracyChart');
    const ctx = canvas.getContext('2d');
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (history.length === 0) {
        ctx.fillStyle = '#718096';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('暂无答题记录', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // 设置画布样式
    const padding = 50;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    
    // 绘制坐标轴
    ctx.strokeStyle = '#cbd5e0';
    ctx.lineWidth = 2;
    
    // Y轴
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.stroke();
    
    // X轴
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // 绘制Y轴刻度和标签（0-100%）
    ctx.fillStyle = '#4a5568';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 10; i++) {
        const y = canvas.height - padding - (chartHeight / 10) * i;
        const value = i * 10;
        
        // 刻度线
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
        
        // 标签
        ctx.fillText(value + '%', padding - 10, y + 5);
    }
    
    // 绘制X轴标签
    ctx.textAlign = 'center';
    ctx.fillText('答题序号', canvas.width / 2, canvas.height - 10);
    
    // Y轴标签
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('正确率', 0, 0);
    ctx.restore();
    
    // 取最近50条记录
    const recentHistory = history.slice(-50);
    
    // 绘制折线
    if (recentHistory.length > 1) {
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        recentHistory.forEach((record, index) => {
            const x = padding + (chartWidth / (recentHistory.length - 1)) * index;
            const y = canvas.height - padding - (chartHeight * record.accuracy / 100);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // 绘制数据点
        recentHistory.forEach((record, index) => {
            const x = padding + (chartWidth / (recentHistory.length - 1)) * index;
            const y = canvas.height - padding - (chartHeight * record.accuracy / 100);
            
            // 圆点
            ctx.fillStyle = record.isCorrect ? '#48bb78' : '#f56565';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // 边框
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }
    
    // 显示数据点数量
    ctx.fillStyle = '#4a5568';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`最近${recentHistory.length}题`, padding, padding - 20);
    
    // 图例
    const legendX = canvas.width - padding - 120;
    const legendY = padding;
    
    // 正确点
    ctx.fillStyle = '#48bb78';
    ctx.beginPath();
    ctx.arc(legendX, legendY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a5568';
    ctx.fillText('答对', legendX + 15, legendY + 5);
    
    // 错误点
    ctx.fillStyle = '#f56565';
    ctx.beginPath();
    ctx.arc(legendX + 70, legendY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a5568';
    ctx.fillText('答错', legendX + 85, legendY + 5);
}

// ========== 实时播报 ==========
async function startBroadcastUpdate() {
    broadcastInterval = setInterval(async () => {
        try {
            const response = await fetch(`${SERVER_URL}/api/broadcast`);
            const broadcasts = await response.json();
            
            if (broadcasts.length > 0) {
                updateBroadcast(broadcasts);
            }
        } catch (error) {
            console.error('获取播报失败:', error);
        }
    }, 3000); // 每3秒更新一次
}

function updateBroadcast(broadcasts) {
    const content = document.getElementById('broadcastContent');
    const messages = broadcasts.map(b => 
        `${b.className}-${b.name} ${b.action} 获得了${elementNames[b.element].icon}${elementNames[b.element].name}元素!`
    ).join(' | ');
    
    if (messages) {
        content.textContent = messages;
    }
}

// 显示连杀通知
function showKillNotification(text) {
    const notification = document.getElementById('killNotification');
    notification.textContent = text;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

// 更新连杀显示
function updateStreakDisplay() {
    const streak = audioManager.getStreak();
    const streakDisplay = document.getElementById('streakDisplay');
    const streakCount = document.getElementById('streakCount');
    
    if (streak >= 2) {
        streakDisplay.style.display = 'inline';
        streakCount.textContent = streak;
    } else {
        streakDisplay.style.display = 'none';
    }
}

// ========== 使用时长管理 ==========
function startUsageTimer() {
    // 每秒更新一次剩余时长
    usageTimer = setInterval(() => {
        remainingTime--;
        updateTimeDisplay();
        
        // 每30秒同步一次服务器
        if (remainingTime % 30 === 0) {
            syncUsageToServer();
        }
        
        // 剩余5分钟时提醒
        if (remainingTime === 5 * 60) {
            alert('⏰ 提醒：今天还剩5分钟使用时间！');
        }
        
        // 剩余1分钟时提醒
        if (remainingTime === 60) {
            alert('⏰ 提醒：今天还剩1分钟使用时间！');
        }
        
        // 时间用完
        if (remainingTime <= 0) {
            handleTimeUp();
        }
    }, 1000);
}

function updateTimeDisplay() {
    const timeDisplay = document.getElementById('timeRemaining');
    if (!timeDisplay) return;
    
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // 时间少于5分钟时显示警告颜色
    if (remainingTime < 5 * 60) {
        timeDisplay.style.color = '#f56565';
    } else {
        timeDisplay.style.color = '#48bb78';
    }
}

async function syncUsageToServer() {
    try {
        const response = await fetch(`${SERVER_URL}/api/update-usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id })
        });
        
        const data = await response.json();
        if (data.success) {
            // 使用服务器返回的剩余时间校准本地时间
            remainingTime = data.remainingTime;
            console.log('✅ 使用时长已同步:', data.usedTime, '秒');
        }
    } catch (error) {
        console.error('同步使用时长失败:', error);
    }
}

function handleTimeUp() {
    clearInterval(usageTimer);
    clearInterval(broadcastInterval);
    
    // 最后一次同步到服务器
    syncUsageToServer();
    
    // 禁用所有操作
    document.getElementById('answerInput').disabled = true;
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('challengeBtn').disabled = true;
    document.getElementById('giftBtn').disabled = true;
    document.getElementById('upgradeBtn').disabled = true;
    
    // 停止背景音乐
    audioManager.stopBGM();
    
    alert('⏰ 今天的使用时间已用完！\n感谢你的努力学习，明天再来吧~ 💪');
    
    // 3秒后返回登录页
    setTimeout(() => {
        window.location.reload();
    }, 3000);
}

// 页面关闭或刷新时同步时长
window.addEventListener('beforeunload', () => {
    if (currentUser) {
        syncUsageToServer();
    }
});
