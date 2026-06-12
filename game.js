/**
 * 贪吃蛇游戏
 * 功能完整的网页版贪吃蛇游戏
 */

// ==================== 游戏配置模块 ====================
const GameConfig = {
    // Canvas尺寸
    canvasWidth: 500,
    canvasHeight: 500,
    
    // 网格大小
    gridSize: 20,
    
    // 难度设置（移动间隔时间，单位：毫秒）
    difficulties: {
        easy: 150,
        medium: 100,
        hard: 60
    },
    
    // 颜色配置
    colors: {
        snake: '#38ef7d',
        snakeHead: '#11998e',
        snakeBorder: '#0d7377',
        food: '#f5576c',
        foodBorder: '#c44569',
        background: '#f9f9f9',
        grid: '#e0e0e0'
    }
};

// ==================== 音效管理模块 ====================
class SoundManager {
    constructor() {
        this.enabled = true;
        this.audioContext = null;
        this.initAudioContext();
    }
    
    // 初始化音频上下文
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }
    
    // 恢复音频上下文（需要用户交互后调用）
    resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    // 播放吃到食物的音效
    playEatSound() {
        if (!this.enabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(523.25, this.audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, this.audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, this.audioContext.currentTime + 0.2); // G5
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }
    
    // 播放游戏结束音效
    playGameOverSound() {
        if (!this.enabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(392, this.audioContext.currentTime); // G4
        oscillator.frequency.setValueAtTime(349.23, this.audioContext.currentTime + 0.15); // F4
        oscillator.frequency.setValueAtTime(329.63, this.audioContext.currentTime + 0.3); // E4
        oscillator.frequency.setValueAtTime(261.63, this.audioContext.currentTime + 0.45); // C4
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.6);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.6);
    }
    
    // 播放开始游戏音效
    playStartSound() {
        if (!this.enabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(261.63, this.audioContext.currentTime); // C4
        oscillator.frequency.setValueAtTime(329.63, this.audioContext.currentTime + 0.1); // E4
        oscillator.frequency.setValueAtTime(392, this.audioContext.currentTime + 0.2); // G4
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }
    
    // 切换音效开关
    toggle(enabled) {
        this.enabled = enabled;
    }
}

// ==================== 游戏主体类 ====================
class SnakeGame {
    constructor() {
        // 获取DOM元素
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.overlay = document.getElementById('gameOverlay');
        this.overlayTitle = document.getElementById('overlayTitle');
        this.overlayMessage = document.getElementById('overlayMessage');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.difficultySelect = document.getElementById('difficulty');
        this.soundToggle = document.getElementById('soundToggle');
        
        // 初始化音效管理器
        this.soundManager = new SoundManager();
        
        // 游戏状态
        this.gameState = 'idle'; // idle, playing, paused, gameover
        this.score = 0;
        this.gameLoop = null;
        this.currentSpeed = GameConfig.difficulties.medium;
        
        // 蛇和食物
        this.snake = [];
        this.food = null;
        this.direction = 'right';
        this.nextDirection = 'right';
        
        // 初始化游戏
        this.init();
    }
    
    // 初始化游戏
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.drawGrid();
        this.showOverlay('准备开始', '按"开始游戏"按钮或空格键开始');
    }
    
    // 设置Canvas尺寸
    setupCanvas() {
        // 响应式调整Canvas大小
        const container = this.canvas.parentElement;
        const maxWidth = Math.min(container.clientWidth - 40, GameConfig.canvasWidth);
        const size = Math.floor(maxWidth / GameConfig.gridSize) * GameConfig.gridSize;
        
        this.canvas.width = size;
        this.canvas.height = size;
        this.cellCount = size / GameConfig.gridSize;
    }
    
    // 设置事件监听器
    setupEventListeners() {
        // 键盘控制
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // 按钮控制
        this.startBtn.addEventListener('click', () => this.startGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.restartBtn.addEventListener('click', () => this.restartGame());
        
        // 难度选择
        this.difficultySelect.addEventListener('change', (e) => {
            this.currentSpeed = GameConfig.difficulties[e.target.value];
            if (this.gameState === 'playing') {
                this.restartGameLoop();
            }
        });
        
        // 音效开关
        this.soundToggle.addEventListener('change', (e) => {
            this.soundManager.toggle(e.target.checked);
        });
        
        // 窗口大小改变时重新调整Canvas
        window.addEventListener('resize', () => {
            this.setupCanvas();
            if (this.gameState !== 'idle') {
                this.draw();
            } else {
                this.drawGrid();
            }
        });
    }
    
    // 处理键盘按键
    handleKeyPress(e) {
        // 恢复音频上下文
        this.soundManager.resumeContext();
        
        // 空格键：开始/暂停
        if (e.code === 'Space') {
            e.preventDefault();
            if (this.gameState === 'idle' || this.gameState === 'gameover') {
                this.startGame();
            } else if (this.gameState === 'playing' || this.gameState === 'paused') {
                this.togglePause();
            }
            return;
        }
        
        // 方向键控制
        const keyMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'KeyW': 'up',
            'KeyS': 'down',
            'KeyA': 'left',
            'KeyD': 'right'
        };
        
        const newDirection = keyMap[e.code];
        if (newDirection && this.gameState === 'playing') {
            e.preventDefault();
            this.setDirection(newDirection);
        }
    }
    
    // 设置方向（防止反向移动）
    setDirection(newDirection) {
        const opposites = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
        };
        
        // 不能反向移动
        if (opposites[newDirection] !== this.direction) {
            this.nextDirection = newDirection;
        }
    }
    
    // 开始游戏
    startGame() {
        this.soundManager.resumeContext();
        this.soundManager.playStartSound();
        
        // 初始化蛇
        const centerX = Math.floor(this.cellCount / 2);
        const centerY = Math.floor(this.cellCount / 2);
        this.snake = [
            { x: centerX, y: centerY },
            { x: centerX - 1, y: centerY },
            { x: centerX - 2, y: centerY }
        ];
        
        // 重置游戏状态
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.updateScore();
        
        // 生成食物
        this.generateFood();
        
        // 更新UI状态
        this.gameState = 'playing';
        this.hideOverlay();
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.restartBtn.disabled = false;
        this.difficultySelect.disabled = true;
        
        // 开始游戏循环
        this.startGameLoop();
    }
    
    // 开始游戏循环
    startGameLoop() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
        }
        this.gameLoop = setInterval(() => this.update(), this.currentSpeed);
    }
    
    // 重启游戏循环（用于难度变更）
    restartGameLoop() {
        this.startGameLoop();
    }
    
    // 暂停/继续游戏
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            clearInterval(this.gameLoop);
            this.pauseBtn.textContent = '继续';
            this.showOverlay('游戏暂停', '按空格键或点击"继续"按钮继续游戏');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.hideOverlay();
            this.startGameLoop();
            this.pauseBtn.textContent = '暂停';
        }
    }
    
    // 重新开始游戏
    restartGame() {
        this.gameState = 'idle';
        clearInterval(this.gameLoop);
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.pauseBtn.textContent = '暂停';
        this.restartBtn.disabled = true;
        this.difficultySelect.disabled = false;
        this.startGame();
    }
    
    // 游戏主更新逻辑
    update() {
        // 更新方向
        this.direction = this.nextDirection;
        
        // 计算新头部位置
        const head = { ...this.snake[0] };
        
        switch (this.direction) {
            case 'up':
                head.y--;
                break;
            case 'down':
                head.y++;
                break;
            case 'left':
                head.x--;
                break;
            case 'right':
                head.x++;
                break;
        }
        
        // 检测碰撞
        if (this.checkCollision(head)) {
            this.gameOver();
            return;
        }
        
        // 添加新头部
        this.snake.unshift(head);
        
        // 检测是否吃到食物
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.updateScore();
            this.soundManager.playEatSound();
            this.generateFood();
        } else {
            // 移除尾部
            this.snake.pop();
        }
        
        // 绘制游戏
        this.draw();
    }
    
    // 检测碰撞
    checkCollision(head) {
        // 检测边界碰撞
        if (head.x < 0 || head.x >= this.cellCount || head.y < 0 || head.y >= this.cellCount) {
            return true;
        }
        
        // 检测自身碰撞
        for (let i = 0; i < this.snake.length; i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                return true;
            }
        }
        
        return false;
    }
    
    // 生成食物
    generateFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * this.cellCount),
                y: Math.floor(Math.random() * this.cellCount)
            };
        } while (this.isFoodOnSnake(newFood));
        
        this.food = newFood;
    }
    
    // 检查食物是否在蛇身上
    isFoodOnSnake(food) {
        return this.snake.some(segment => segment.x === food.x && segment.y === food.y);
    }
    
    // 游戏结束
    gameOver() {
        this.gameState = 'gameover';
        clearInterval(this.gameLoop);
        this.soundManager.playGameOverSound();
        
        // 添加震动效果
        this.canvas.classList.add('shake');
        setTimeout(() => this.canvas.classList.remove('shake'), 500);
        
        this.showOverlay('游戏结束', `最终得分：${this.score}`);
        
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.restartBtn.disabled = false;
        this.difficultySelect.disabled = false;
    }
    
    // 绘制游戏
    draw() {
        // 清空画布
        this.ctx.fillStyle = GameConfig.colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格
        this.drawGrid();
        
        // 绘制食物
        this.drawFood();
        
        // 绘制蛇
        this.drawSnake();
    }
    
    // 绘制网格
    drawGrid() {
        this.ctx.strokeStyle = GameConfig.colors.grid;
        this.ctx.lineWidth = 0.5;
        
        for (let i = 0; i <= this.cellCount; i++) {
            // 垂直线
            this.ctx.beginPath();
            this.ctx.moveTo(i * GameConfig.gridSize, 0);
            this.ctx.lineTo(i * GameConfig.gridSize, this.canvas.height);
            this.ctx.stroke();
            
            // 水平线
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * GameConfig.gridSize);
            this.ctx.lineTo(this.canvas.width, i * GameConfig.gridSize);
            this.ctx.stroke();
        }
    }
    
    // 绘制蛇
    drawSnake() {
        this.snake.forEach((segment, index) => {
            const x = segment.x * GameConfig.gridSize;
            const y = segment.y * GameConfig.gridSize;
            const size = GameConfig.gridSize - 2;
            
            // 蛇头使用不同颜色
            if (index === 0) {
                this.ctx.fillStyle = GameConfig.colors.snakeHead;
            } else {
                this.ctx.fillStyle = GameConfig.colors.snake;
            }
            
            this.ctx.strokeStyle = GameConfig.colors.snakeBorder;
            this.ctx.lineWidth = 2;
            
            // 绘制圆角矩形
            this.roundRect(x + 1, y + 1, size, size, 4);
        });
    }
    
    // 绘制食物
    drawFood() {
        const x = this.food.x * GameConfig.gridSize;
        const y = this.food.y * GameConfig.gridSize;
        const size = GameConfig.gridSize - 2;
        
        this.ctx.fillStyle = GameConfig.colors.food;
        this.ctx.strokeStyle = GameConfig.colors.foodBorder;
        this.ctx.lineWidth = 2;
        
        // 绘制圆形食物
        this.ctx.beginPath();
        this.ctx.arc(x + GameConfig.gridSize / 2, y + GameConfig.gridSize / 2, size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    // 绘制圆角矩形
    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }
    
    // 更新分数显示
    updateScore() {
        this.scoreElement.textContent = this.score;
    }
    
    // 显示覆盖层
    showOverlay(title, message) {
        this.overlayTitle.textContent = title;
        this.overlayMessage.textContent = message;
        this.overlay.classList.remove('hidden');
    }
    
    // 隐藏覆盖层
    hideOverlay() {
        this.overlay.classList.add('hidden');
    }
}

// ==================== 初始化游戏 ====================
document.addEventListener('DOMContentLoaded', () => {
    const game = new SnakeGame();
});