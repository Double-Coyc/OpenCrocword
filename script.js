// Игровая логика для OpenCrocword

class OpenCrocwordGame {
    constructor() {
        this.currentLevel = 1;
        this.coins = parseInt(localStorage.getItem('coins')) || 100;
        this.selectedCells = [];
        this.isDrawing = false;
        this.lastSelectedCell = null;
        this.currentWord = '';
        this.completedWords = new Set();
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.lastTouchTime = 0;
        this.freeCoinsCooldown = parseInt(localStorage.getItem('freeCoinsCooldown')) || 0;
        this.audioContext = null;
        this.sounds = {};
        
        this.initializeAudio();
        this.initializeGame();
        this.setupEventListeners();
        this.updateUI();
        this.startFreeCoinsCooldown();
    }
    
    initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Создаем звуки
            this.sounds.fill = this.createTone(440, 0.1);
            this.sounds.correct = this.createTone(880, 0.2);
            this.sounds.incorrect = this.createTone(220, 0.3);
            this.sounds.shuffle = this.createTone(330, 0.15);
            this.sounds.coin = this.createTone(660, 0.2);
        } catch (e) {
            console.log('Web Audio API не поддерживается');
        }
    }
    
    createTone(frequency, duration) {
        return () => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }
    
    playSound(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }
    
    async initializeGame() {
        // Загрузка уровней
        try {
            const response = await fetch('./levels.json');
            this.levels = await response.json();
            this.loadLevel(this.currentLevel);
        } catch (error) {
            console.error('Ошибка загрузки уровней:', error);
            // Используем тестовые данные в случае ошибки
            this.levels = this.getTestLevels();
            this.loadLevel(this.currentLevel);
        }
    }
    
    getTestLevels() {
        return {
            levels: [
                {
                    id: 1,
                    name: "Первые шаги",
                    grid: [
                        ["К", "О", "Т", "", ""],
                        ["А", "", "Р", "", ""],
                        ["Т", "Е", "Л", "Е", "Ф"],
                        ["", "", "О", "", ""],
                        ["", "", "Н", "", ""]
                    ],
                    words: [
                        {
                            word: "КОТ",
                            start: [0, 0],
                            direction: "horizontal",
                            hint: "Домашнее животное, которое мяукает"
                        },
                        {
                            word: "ТЕЛЕФОН",
                            start: [2, 0],
                            direction: "horizontal",
                            hint: "Устройство для связи на расстоянии"
                        }
                    ],
                    reward: 50,
                    difficulty: "easy",
                    bonusWords: []
                }
            ]
        };
    }
    
    loadLevel(levelId) {
        const level = this.levels.levels.find(l => l.id === levelId);
        if (!level) {
            console.error('Уровень не найден');
            return;
        }
        
        this.currentGrid = JSON.parse(JSON.stringify(level.grid));
        this.levelWords = level.words;
        this.currentWord = '';
        this.selectedCells = [];
        this.completedWords.clear();
        
        this.renderGrid();
        this.renderWheel(level);
        this.updateUI();
    }
    
    renderGrid() {
        const gridElement = document.getElementById('crosswordGrid');
        gridElement.innerHTML = '';
        gridElement.style.gridTemplateColumns = `repeat(${this.currentGrid[0].length}, 1fr)`;
        
        for (let row = 0; row < this.currentGrid.length; row++) {
            for (let col = 0; col < this.currentGrid[row].length; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                if (this.currentGrid[row][col]) {
                    cell.textContent = '';
                    cell.addEventListener('click', () => this.selectCell(row, col));
                    cell.addEventListener('touchstart', (e) => this.handleTouchStart(e, row, col));
                } else {
                    cell.style.visibility = 'hidden';
                }
                
                gridElement.appendChild(cell);
            }
        }
    }
    
    renderWheel(level) {
        const wheelElement = document.getElementById('wheel');
        wheelElement.innerHTML = '';
        
        // Собираем все буквы из всех слов уровня
        const allLetters = [];
        level.words.forEach(wordObj => {
            allLetters.push(...wordObj.word.split(''));
        });
        
        // Добавляем случайные буквы, чтобы было 21 буква
        const extraLetters = 'АЕИОУЫЭЮЯБВГДЖЗКЛМНПРСТФХЦЧШЩЪЬ';
        while (allLetters.length < 21) {
            const randomLetter = extraLetters[Math.floor(Math.random() * extraLetters.length)];
            allLetters.push(randomLetter);
        }
        
        // Перемешиваем буквы
        for (let i = allLetters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allLetters[i], allLetters[j]] = [allLetters[j], allLetters[i]];
        }
        
        // Рендерим буквы
        allLetters.forEach((letter, index) => {
            const letterElement = document.createElement('div');
            letterElement.className = 'wheel-letter';
            letterElement.textContent = letter;
            letterElement.dataset.letter = letter;
            letterElement.dataset.index = index;
            
            letterElement.addEventListener('click', () => this.selectLetter(letter, index));
            letterElement.addEventListener('touchstart', (e) => this.handleTouchWheel(e, letter, index));
            
            wheelElement.appendChild(letterElement);
        });
    }
    
    shuffleLetters() {
        const wheelElement = document.getElementById('wheel');
        const letters = Array.from(wheelElement.children);
        
        // Собираем неиспользованные буквы
        const unusedLetters = letters.filter(letter => !letter.classList.contains('used'));
        
        // Перемешиваем
        for (let i = unusedLetters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [unusedLetters[i].textContent, unusedLetters[j].textContent] = [unusedLetters[j].textContent, unusedLetters[i].textContent];
            [unusedLetters[i].dataset.letter, unusedLetters[j].dataset.letter] = [unusedLetters[j].dataset.letter, unusedLetters[i].dataset.letter];
        }
        
        this.playSound('shuffle');
    }
    
    selectCell(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        
        if (this.selectedCells.some(c => c.row === row && c.col === col)) {
            // Убираем выделение, если клетка уже выбрана
            this.selectedCells = this.selectedCells.filter(c => !(c.row === row && c.col === col));
            cell.classList.remove('selected');
        } else {
            // Добавляем клетку в выделение
            this.selectedCells.push({ row, col });
            cell.classList.add('selected');
        }
        
        this.updateCurrentWord();
        this.drawConnectionLine();
    }
    
    handleTouchStart(e, row, col) {
        e.preventDefault();
        const currentTime = Date.now();
        
        if (currentTime - this.lastTouchTime < 300) {
            // Двойное нажатие - очищаем выделение
            this.clearSelection();
            return;
        }
        
        this.lastTouchTime = currentTime;
        this.isDrawing = true;
        this.lastSelectedCell = { row, col };
        this.selectCell(row, col);
    }
    
    handleTouchWheel(e, letter, index) {
        e.preventDefault();
        this.selectLetter(letter, index);
    }
    
    selectLetter(letter, index) {
        if (this.selectedCells.length === 0) return;
        
        const letterElement = document.querySelector(`[data-index="${index}"]`);
        if (letterElement.classList.contains('used')) return;
        
        // Находим следующую пустую клетку в выделении
        const nextEmptyCell = this.selectedCells.find(cell => 
            !this.currentGrid[cell.row][cell.col]
        );
        
        if (nextEmptyCell) {
            this.currentGrid[nextEmptyCell.row][nextEmptyCell.col] = letter;
            const cell = document.querySelector(`[data-row="${nextEmptyCell.row}"][data-col="${nextEmptyCell.col}"]`);
            cell.textContent = letter;
            cell.classList.add('filled', 'letter-appear');
            
            letterElement.classList.add('used');
            
            // Проверяем, заполнено ли слово
            this.checkWords();
            
            // Очищаем выделение после заполнения буквы
            setTimeout(() => {
                this.clearSelection();
                this.drawConnectionLine();
            }, 300);
        }
    }
    
    updateCurrentWord() {
        this.currentWord = this.selectedCells
            .sort((a, b) => {
                if (a.row !== b.row) return a.row - b.row;
                return a.col - b.col;
            })
            .map(cell => this.currentGrid[cell.row][cell.col])
            .join('');
    }
    
    drawConnectionLine() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.selectedCells.length < 2) return;
        
        const canvasRect = this.canvas.getBoundingClientRect();
        this.canvas.width = canvasRect.width;
        this.canvas.height = canvasRect.height;
        
        this.ctx.strokeStyle = '#6366f1';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        
        this.selectedCells.forEach((cell, index) => {
            const cellElement = document.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
            const cellRect = cellElement.getBoundingClientRect();
            const x = cellRect.left - canvasRect.left + cellRect.width / 2;
            const y = cellRect.top - canvasRect.top + cellRect.height / 2;
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        
        this.ctx.stroke();
    }
    
    clearSelection() {
        this.selectedCells.forEach(cell => {
            const cellElement = document.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
            cellElement.classList.remove('selected');
        });
        this.selectedCells = [];
        this.currentWord = '';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    checkWords() {
        this.levelWords.forEach((wordObj, index) => {
            if (this.completedWords.has(index)) return;
            
            const word = this.getWordFromGrid(wordObj);
            if (word === wordObj.word) {
                this.completedWords.add(index);
                this.markWordAsCorrect(wordObj);
                
                // Проверяем, завершены ли все слова
                if (this.completedWords.size === this.levelWords.length) {
                    setTimeout(() => this.levelComplete(), 500);
                }
            }
        });
    }
    
    getWordFromGrid(wordObj) {
        const { start, direction } = wordObj;
        const word = [];
        
        if (direction === 'horizontal') {
            for (let i = 0; i < wordObj.word.length; i++) {
                const row = start[0];
                const col = start[1] + i;
                word.push(this.currentGrid[row][col]);
            }
        } else if (direction === 'vertical') {
            for (let i = 0; i < wordObj.word.length; i++) {
                const row = start[0] + i;
                const col = start[1];
                word.push(this.currentGrid[row][col]);
            }
        }
        
        return word.join('');
    }
    
    markWordAsCorrect(wordObj) {
        const { start, direction } = wordObj;
        
        if (direction === 'horizontal') {
            for (let i = 0; i < wordObj.word.length; i++) {
                const row = start[0];
                const col = start[1] + i;
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                cell.classList.add('correct');
            }
        } else if (direction === 'vertical') {
            for (let i = 0; i < wordObj.word.length; i++) {
                const row = start[0] + i;
                const col = start[1];
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                cell.classList.add('correct');
            }
        }
    }
    
    levelComplete() {
        const level = this.levels.levels.find(l => l.id === this.currentLevel);
        const reward = level.reward;
        const message = document.getElementById('message');
        const messageTitle = document.getElementById('messageTitle');
        const messageText = document.getElementById('messageText');
        
        messageTitle.textContent = 'Поздравляем!';
        messageText.textContent = `Вы решили кроссворд! Награда: +${reward} монет`;
        
        // Добавляем монеты
        this.coins += reward;
        this.saveProgress();
        this.updateUI();
        this.playSound('correct');
        
        // Показываем сообщение
        message.classList.add('show');
        
        // Скрываем кнопку удвоения монет, если она уже использовалась
        const doubleCoinsBtn = document.getElementById('doubleCoinsBtn');
        const hasDoubled = localStorage.getItem(`level${this.currentLevel}_doubled`) === 'true';
        if (hasDoubled) {
            doubleCoinsBtn.style.display = 'none';
        }
    }
    
    showHint() {
        if (this.coins < 25) {
            this.showMessage('Недостаточно монет!', 'Вам нужно 25 монет для подсказки.');
            return;
        }
        
        // Находим незаполненные буквы в незавершенных словах
        const emptyCells = [];
        this.levelWords.forEach((wordObj, wordIndex) => {
            if (this.completedWords.has(wordIndex)) return;
            
            const { start, direction, word } = wordObj;
            
            if (direction === 'horizontal') {
                for (let i = 0; i < word.length; i++) {
                    const row = start[0];
                    const col = start[1] + i;
                    if (!this.currentGrid[row][col]) {
                        emptyCells.push({ row, col, letter: word[i] });
                    }
                }
            } else if (direction === 'vertical') {
                for (let i = 0; i < word.length; i++) {
                    const row = start[0] + i;
                    const col = start[1];
                    if (!this.currentGrid[row][col]) {
                        emptyCells.push({ row, col, letter: word[i] });
                    }
                }
            }
        });
        
        if (emptyCells.length === 0) return;
        
        // Выбираем случайную пустую клетку
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const { row, col, letter } = randomCell;
        
        // Находим соответствующую букву на колесе
        const wheelLetters = document.querySelectorAll('.wheel-letter');
        const letterElement = Array.from(wheelLetters).find(el => 
            el.dataset.letter === letter && !el.classList.contains('used')
        );
        
        if (letterElement) {
            // Списываем монеты
            this.coins -= 25;
            this.saveProgress();
            this.updateUI();
            
            // Заполняем клетку
            this.currentGrid[row][col] = letter;
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            cell.textContent = letter;
            cell.classList.add('filled', 'letter-appear');
            
            letterElement.classList.add('used');
            
            // Проверяем слова
            this.checkWords();
            this.playSound('fill');
        }
    }
    
    giveFreeCoins() {
        const now = Date.now();
        if (now < this.freeCoinsCooldown) {
            const remainingTime = Math.ceil((this.freeCoinsCooldown - now) / 1000);
            this.showMessage('Подождите!', `Следующие бесплатные монеты через ${remainingTime} секунд.`);
            return;
        }
        
        this.coins += 50;
        this.freeCoinsCooldown = now + 10000; // 10 секунд
        this.saveProgress();
        this.updateUI();
        this.playSound('coin');
        
        // Обновляем состояние кнопки
        const freeCoinsBtn = document.getElementById('freeCoinsBtn');
        freeCoinsBtn.disabled = true;
        this.updateFreeCoinsButton();
        
        // Запускаем отсчет
        this.startFreeCoinsCooldown();
    }
    
    startFreeCoinsCooldown() {
        const updateCooldown = () => {
            const now = Date.now();
            if (now < this.freeCoinsCooldown) {
                const remainingTime = Math.ceil((this.freeCoinsCooldown - now) / 1000);
                const freeCoinsBtn = document.getElementById('freeCoinsBtn');
                freeCoinsBtn.textContent = `Бесплатные монеты (${remainingTime})`;
                freeCoinsBtn.disabled = true;
                setTimeout(updateCooldown, 1000);
            } else {
                this.freeCoinsCooldown = 0;
                this.updateFreeCoinsButton();
            }
        };
        
        updateCooldown();
    }
    
    updateFreeCoinsButton() {
        const freeCoinsBtn = document.getElementById('freeCoinsBtn');
        freeCoinsBtn.textContent = 'Бесплатные монеты (+50)';
        freeCoinsBtn.disabled = false;
    }
    
    clearGrid() {
        // Очищаем только незавершенные слова
        this.levelWords.forEach((wordObj, wordIndex) => {
            if (this.completedWords.has(wordIndex)) return;
            
            const { start, direction, word } = wordObj;
            
            if (direction === 'horizontal') {
                for (let i = 0; i < word.length; i++) {
                    const row = start[0];
                    const col = start[1] + i;
                    if (!this.currentGrid[row][col]) continue;
                    
                    this.currentGrid[row][col] = '';
                    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    cell.textContent = '';
                    cell.classList.remove('filled', 'letter-appear');
                }
            } else if (direction === 'vertical') {
                for (let i = 0; i < word.length; i++) {
                    const row = start[0] + i;
                    const col = start[1];
                    if (!this.currentGrid[row][col]) continue;
                    
                    this.currentGrid[row][col] = '';
                    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    cell.textContent = '';
                    cell.classList.remove('filled', 'letter-appear');
                }
            }
        });
        
        // Восстанавливаем буквы на колесе
        document.querySelectorAll('.wheel-letter').forEach(letter => {
            letter.classList.remove('used');
        });
        
        this.clearSelection();
    }
    
    submitWord() {
        if (this.currentWord.length < 3) {
            this.showMessage('Слишком короткое слово!', 'Минимальная длина слова - 3 буквы.');
            return;
        }
        
        // Проверяем, есть ли такое слово в уровне
        let found = false;
        this.levelWords.forEach((wordObj, index) => {
            if (wordObj.word === this.currentWord && !this.completedWords.has(index)) {
                found = true;
                this.markWordAsCorrect(wordObj);
                this.completedWords.add(index);
                
                // Очищаем выделение
                this.clearSelection();
                
                // Проверяем, завершены ли все слова
                if (this.completedWords.size === this.levelWords.length) {
                    setTimeout(() => this.levelComplete(), 500);
                }
            }
        });
        
        if (!found) {
            // Встряхиваем сетку
            document.querySelector('.crossword-grid').classList.add('shake');
            setTimeout(() => {
                document.querySelector('.crossword-grid').classList.remove('shake');
            }, 500);
            
            this.showMessage('Неверное слово!', 'Попробуйте еще раз.');
            this.playSound('incorrect');
        }
    }
    
    doubleCoins() {
        const hasDoubled = localStorage.getItem(`level${this.currentLevel}_doubled`) === 'true';
        if (hasDoubled) {
            this.showMessage('Удвоение уже использовано!', 'Вы уже удвоили награду за этот уровень.');
            return;
        }
        
        const level = this.levels.levels.find(l => l.id === this.currentLevel);
        const reward = level.reward;
        this.coins += reward;
        this.saveProgress();
        this.updateUI();
        this.playSound('coin');
        
        // Скрываем кнопку удвоения
        const doubleCoinsBtn = document.getElementById('doubleCoinsBtn');
        doubleCoinsBtn.style.display = 'none';
        
        // Сохраняем, что удвоение использовано
        localStorage.setItem(`level${this.currentLevel}_doubled`, 'true');
        
        this.showMessage('Удвоение награды!', `Вы получили еще ${reward} монет!`);
    }
    
    nextLevel() {
        this.currentLevel++;
        if (this.currentLevel > this.levels.levels.length) {
            this.showMessage('Поздравляем!', 'Вы прошли все доступные уровни!');
            return;
        }
        
        // Сохраняем прогресс
        this.saveProgress();
        
        // Загружаем следующий уровень
        this.loadLevel(this.currentLevel);
        
        // Скрываем сообщение
        const message = document.getElementById('message');
        message.classList.remove('show');
    }
    
    showMessage(title, text) {
        const message = document.getElementById('message');
        const messageTitle = document.getElementById('messageTitle');
        const messageText = document.getElementById('messageText');
        
        messageTitle.textContent = title;
        messageText.textContent = text;
        
        message.classList.add('show');
        
        // Автоматически скрываем сообщение через 3 секунды
        setTimeout(() => {
            message.classList.remove('show');
        }, 3000);
    }
    
    saveProgress() {
        localStorage.setItem('coins', this.coins.toString());
        localStorage.setItem('currentLevel', this.currentLevel.toString());
        localStorage.setItem('freeCoinsCooldown', this.freeCoinsCooldown.toString());
    }
    
    updateUI() {
        document.getElementById('currentLevel').textContent = this.currentLevel;
        document.getElementById('coinCount').textContent = this.coins;
        
        // Анимация монет при изменении
        const coinElement = document.getElementById('coinCount');
        coinElement.classList.add('coin-animation');
        setTimeout(() => {
            coinElement.classList.remove('coin-animation');
        }, 500);
    }
    
    setupEventListeners() {
        // Подсказка
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
        
        // Бесплатные монеты
        document.getElementById('freeCoinsBtn').addEventListener('click', () => this.giveFreeCoins());
        
        // Перемешивание
        document.getElementById('shuffleBtn').addEventListener('click', () => this.shuffleLetters());
        
        // Очистка
        document.getElementById('clearBtn').addEventListener('click', () => this.clearGrid());
        
        // Проверка слова
        document.getElementById('submitBtn').addEventListener('click', () => this.submitWord());
        
        // Следующий уровень
        document.getElementById('nextLevelBtn').addEventListener('click', () => this.nextLevel());
        
        // Удвоение монет
        document.getElementById('doubleCoinsBtn').addEventListener('click', () => this.doubleCoins());
        
        // Touch события для свайпа
        let touchStartX = 0;
        let touchStartY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!this.isDrawing) return;
            
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            
            // Находим клетку под пальцем
            const element = document.elementFromPoint(touchX, touchY);
            if (element && element.classList.contains('cell')) {
                const row = parseInt(element.dataset.row);
                const col = parseInt(element.dataset.col);
                
                // Проверяем, что это новая клетка
                if (!this.selectedCells.some(c => c.row === row && c.col === col)) {
                    this.selectCell(row, col);
                }
            }
        });
        
        document.addEventListener('touchend', () => {
            this.isDrawing = false;
        });
        
        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            this.drawConnectionLine();
        });
        
        // Активация AudioContext при первом взаимодействии
        document.addEventListener('click', () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }, { once: true });
    }
}

// Инициализация игры при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Регистрация Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }
    
    // Инициализация игры
    const game = new OpenCrocwordGame();
});