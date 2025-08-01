class DiceGame {
    constructor() {
        this.currentNumber = 1;
        this.rollHistory = [];
        this.isRolling = false;
        
        this.initializeElements();
        this.bindEvents();
        this.updateDisplay();
    }

    initializeElements() {
        this.dice = document.getElementById('dice');
        this.rollBtn = document.getElementById('rollBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.currentNumberSpan = document.getElementById('currentNumber');
        this.historyList = document.getElementById('historyList');
        this.totalRollsSpan = document.getElementById('totalRolls');
        this.averageSpan = document.getElementById('average');
    }

    bindEvents() {
        // 摇骰子按钮事件
        this.rollBtn.addEventListener('click', () => this.rollDice());
        
        // 重置按钮事件
        this.resetBtn.addEventListener('click', () => this.resetGame());
        
        // 骰子点击事件
        this.dice.addEventListener('click', () => this.rollDice());
        
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.rollDice();
            } else if (e.code === 'KeyR') {
                this.resetGame();
            }
        });
    }

    rollDice() {
        if (this.isRolling) return;
        
        this.isRolling = true;
        this.rollBtn.disabled = true;
        
        // 添加滚动动画
        this.dice.classList.add('rolling');
        
        // 播放音效（如果需要可以添加）
        this.playRollSound();
        
        // 生成随机数字
        const randomNumber = Math.floor(Math.random() * 6) + 1;
        
        // 动画持续时间
        setTimeout(() => {
            this.currentNumber = randomNumber;
            this.showFace(randomNumber);
            this.addToHistory(randomNumber);
            this.updateDisplay();
            
            this.dice.classList.remove('rolling');
            this.isRolling = false;
            this.rollBtn.disabled = false;
        }, 1000);
    }

    showFace(number) {
        // 隐藏所有面
        const faces = this.dice.querySelectorAll('.face');
        faces.forEach(face => face.style.display = 'none');
        
        // 显示对应的面
        const targetFace = this.dice.querySelector(`.face-${number}`);
        if (targetFace) {
            targetFace.style.display = 'flex';
        }
        
        // 设置骰子旋转角度以显示正确的面
        this.setDiceRotation(number);
    }

    setDiceRotation(number) {
        let rotationX = 0;
        let rotationY = 0;
        
        switch (number) {
            case 1:
                rotationX = 0;
                rotationY = 0;
                break;
            case 2:
                rotationX = 0;
                rotationY = -90;
                break;
            case 3:
                rotationX = 0;
                rotationY = 180;
                break;
            case 4:
                rotationX = 0;
                rotationY = 90;
                break;
            case 5:
                rotationX = -90;
                rotationY = 0;
                break;
            case 6:
                rotationX = 90;
                rotationY = 0;
                break;
        }
        
        this.dice.style.transform = `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;
    }

    addToHistory(number) {
        this.rollHistory.unshift(number);
        
        // 限制历史记录数量
        if (this.rollHistory.length > 20) {
            this.rollHistory.pop();
        }
        
        // 保存到本地存储
        this.saveToLocalStorage();
    }

    updateDisplay() {
        // 更新当前数字
        this.currentNumberSpan.textContent = this.currentNumber;
        
        // 更新历史记录
        this.updateHistoryDisplay();
        
        // 更新统计信息
        this.updateStats();
    }

    updateHistoryDisplay() {
        this.historyList.innerHTML = '';
        
        this.rollHistory.forEach((number, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.textContent = number;
            
            // 最新的记录高亮显示
            if (index === 0 && this.rollHistory.length > 1) {
                historyItem.style.background = '#28a745';
                historyItem.style.animation = 'pulse 0.5s ease-in-out';
            }
            
            this.historyList.appendChild(historyItem);
        });
    }

    updateStats() {
        const totalRolls = this.rollHistory.length;
        this.totalRollsSpan.textContent = totalRolls;
        
        if (totalRolls > 0) {
            const sum = this.rollHistory.reduce((a, b) => a + b, 0);
            const average = (sum / totalRolls).toFixed(2);
            this.averageSpan.textContent = average;
        } else {
            this.averageSpan.textContent = '0';
        }
    }

    resetGame() {
        // 确认重置
        if (this.rollHistory.length > 0) {
            if (!confirm('确定要重置游戏吗？这将清除所有历史记录。')) {
                return;
            }
        }
        
        this.currentNumber = 1;
        this.rollHistory = [];
        this.showFace(1);
        this.updateDisplay();
        
        // 清除本地存储
        localStorage.removeItem('diceGameHistory');
        
        // 显示重置动画
        this.dice.style.animation = 'resetPulse 0.5s ease-in-out';
        setTimeout(() => {
            this.dice.style.animation = '';
        }, 500);
    }

    playRollSound() {
        // 创建简单的音效（使用 Web Audio API）
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            // 如果音频不支持，忽略错误
            console.log('音频播放不支持');
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('diceGameHistory', JSON.stringify({
                currentNumber: this.currentNumber,
                rollHistory: this.rollHistory
            }));
        } catch (error) {
            console.log('本地存储不可用');
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('diceGameHistory');
            if (saved) {
                const data = JSON.parse(saved);
                this.currentNumber = data.currentNumber || 1;
                this.rollHistory = data.rollHistory || [];
                this.showFace(this.currentNumber);
                this.updateDisplay();
            }
        } catch (error) {
            console.log('加载本地存储失败');
        }
    }

    // 获取统计信息
    getStatistics() {
        if (this.rollHistory.length === 0) {
            return {
                total: 0,
                average: 0,
                distribution: {},
                mostCommon: null,
                leastCommon: null
            };
        }

        const distribution = {};
        for (let i = 1; i <= 6; i++) {
            distribution[i] = this.rollHistory.filter(n => n === i).length;
        }

        const total = this.rollHistory.length;
        const sum = this.rollHistory.reduce((a, b) => a + b, 0);
        const average = sum / total;

        const sortedDistribution = Object.entries(distribution)
            .sort(([,a], [,b]) => b - a);
        
        const mostCommon = parseInt(sortedDistribution[0][0]);
        const leastCommon = parseInt(sortedDistribution[sortedDistribution.length - 1][0]);

        return {
            total,
            average: average.toFixed(2),
            distribution,
            mostCommon,
            leastCommon
        };
    }
}

// 添加一些CSS动画类
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
    
    @keyframes resetPulse {
        0% { transform: scale(1); }
        50% { transform: scale(0.9); opacity: 0.7; }
        100% { transform: scale(1); opacity: 1; }
    }
`;
document.head.appendChild(style);

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    const game = new DiceGame();
    
    // 尝试从本地存储加载游戏状态
    game.loadFromLocalStorage();
    
    // 将游戏实例添加到全局作用域，便于调试
    window.diceGame = game;
    
    // 添加一些键盘快捷键提示
    console.log('🎲 摇骰子游戏已启动！');
    console.log('快捷键：');
    console.log('- 空格键：摇骰子');
    console.log('- R 键：重置游戏');
    console.log('- 可以直接点击骰子来摇骰子');
});

// 防止页面意外刷新时丢失数据
window.addEventListener('beforeunload', (e) => {
    if (window.diceGame && window.diceGame.rollHistory.length > 0) {
        window.diceGame.saveToLocalStorage();
    }
});