// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {

    // ---------- GAME STATE ----------
    let currentNumbers = [];
    let targetOrder = [];
    let swapCount = 0;
    let timeLeft = 0;
    let timerId = null;
    let gameRunning = false;
    let gamePaused = false;
    let selectedIndex = null;
    let currentGridSize = 6;
    let livesleft=3,

    // DOM elements
    const boardDiv = document.getElementById('board');
    const swapSpan = document.getElementById('swapCount');
    const timeSpan = document.getElementById('timeLeft');
    const sizeSpan = document.getElementById('gridSize');
    const msgSpan = document.getElementById('message');
    const targetSpan = document.getElementById('targetSeq');
    const livesSpan = document.getElementById('livesLeft');

    // ---------- AUDIO (your custom files) ----------
    let soundStart = null;
    let soundWin = null;
    let soundLose = null;
    let soundWarn = null;
    let soundBg = null;

    function initAudio() {
        if (!soundStart) {
            soundStart = new Audio("start.mp3");
            soundStart.preload = "auto";
        }
        if (!soundWin) {
            soundWin = new Audio("win.mp3");
            soundWin.preload = "auto";
        }
        if (!soundLose) {
            soundLose = new Audio("fail.mp3");
            soundLose.preload = "auto";
        }
        if (!soundWarn) {
            soundWarn = new Audio("warning.mp3");
            soundWarn.preload = "auto";
        }
        if (!soundBg) {
            soundBg = new Audio("bgmusic.mp3");
            soundBg.loop = true;
            soundBg.volume = 0.2;
            soundBg.preload = "auto";
        }
    }

    function playStartSound() {
        initAudio();
        if (soundStart) {
            soundStart.currentTime = 0;
            soundStart.play().catch(e => console.log("start error", e));
        }
    }

    function playWinSound() {
        initAudio();
        if (soundWin) {
            soundWin.currentTime = 0;
            soundWin.play().catch(e => console.log("win error", e));
        }
    }

    function playLoseSound() {
        initAudio();
        if (soundLose) {
            soundLose.currentTime = 0;
            soundLose.play().catch(e => console.log("lose error", e));
        }
    }

    function playWarnSound() {
        initAudio();
        if (soundWarn) {
            soundWarn.currentTime = 0;
            soundWarn.play().catch(e => console.log("warn error", e));
        }
    }

    function startBgMusic() {
        initAudio();
        if (soundBg && soundBg.paused) {
            soundBg.currentTime = 0;
            soundBg.play().catch(e => console.log("bg error", e));
        }
    }

    function pauseBgMusic() {
        if (soundBg && !soundBg.paused) {
            soundBg.pause();
        }
    }

    function resumeBgMusic() {
        if (soundBg && soundBg.paused && gameRunning && !gamePaused) {
            soundBg.play().catch(e => console.log("bg resume error", e));
        }
    }

    function stopBgMusic() {
        if (soundBg && !soundBg.paused) {
            soundBg.pause();
            soundBg.currentTime = 0;
        }
    }

    // ---------- HELPERS ----------
    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function generateRandomGrid(size) {
        let arr = [];
        for (let i = 1; i <= size; i++) arr.push(i);
        return shuffleArray(arr);
    }

    function isAscending(arr) {
        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] > arr[i + 1]) return false;
        }
        return true;
    }

    function stopTimer() {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
    }

    function startTimer(limit) {
        if (timerId) stopTimer();
        timeLeft = limit;
        timeSpan.innerText = timeLeft + 's';
        timerId = setInterval(() => {
            if (timeLeft === 0) {
                livesLeft--;
                livesSpan.innerText = livesLeft;
                stopTimer();
                pauseBgMusic();
                playLoseSound();
                selectedIndex = null;
            
                if (livesLeft <= 0) {
                    gameRunning = false;
                    gamePaused = false;
                    msgSpan.innerHTML = ' GAME OVER! No lives left. Press restart.';
                    renderBoard();
                    document.querySelectorAll('.tile').forEach(t => t.style.opacity = '0.5');
                } else {
                    msgSpan.innerHTML = `Time up! ${livesLeft} life${livesLeft === 1 ? '' : 'ves'} remaining. Starting next round...`;
                    renderBoard();
                    setTimeout(() => resetGame(currentGridSize, true), 2000);
                }
            }
        }, 1000);
    }

    function renderBoard() {
        boardDiv.innerHTML = '';
        for (let i = 0; i < currentNumbers.length; i++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            if (selectedIndex === i) tile.classList.add('selectedTile');
            tile.textContent = currentNumbers[i];
            tile.addEventListener('click', (idx => () => onTileClick(idx))(i));
            boardDiv.appendChild(tile);
        }
        sizeSpan.innerText = currentGridSize;
        targetSpan.innerText = targetOrder.join(' → ');
    }

    function checkWin() {
        if (isAscending(currentNumbers)) {
            gameRunning = false;
            gamePaused = false;
            stopTimer();
            pauseBgMusic();
            playWinSound();
            msgSpan.innerHTML = '🎉🎊✨ SORTED! PERFECT! ✨🎊🎉<br>😊🙌🎈 CONGRATULATIONS! 🎈🙌😊';
            document.querySelectorAll('.tile').forEach(t => t.classList.add('winGlow'));
            return true;
        }
        return false;
    }

    function areNeighbours(a, b) {
        return Math.abs(a - b) === 1;
    }

    function attemptSwap(i, j) {
        if (!gameRunning || gamePaused) {
            msgSpan.innerHTML = gamePaused ? '⏸ game paused — press resume' : 'game not started — press start';
            return false;
        }
        if (!areNeighbours(i, j)) {
            msgSpan.innerHTML = '⚠️ only adjacent tiles! bubble rule.';
            return false;
        }
        if (i === j) return false;
        const left = Math.min(i, j);
        const right = Math.max(i, j);
        if (currentNumbers[left] < currentNumbers[right]) {
            msgSpan.innerHTML = `⛔ already correct: ${currentNumbers[left]} < ${currentNumbers[right]} (ascending wants small → big). no swap needed.`;
            playWarnSound();
            const tiles = document.querySelectorAll('.tile');
            if (tiles[left]) tiles[left].classList.add('vibrate');
            if (tiles[right]) tiles[right].classList.add('vibrate');
            setTimeout(() => {
                if (tiles[left]) tiles[left].classList.remove('vibrate');
                if (tiles[right]) tiles[right].classList.remove('vibrate');
            }, 300);
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(200);
            }
            return false;
        }
        [currentNumbers[i], currentNumbers[j]] = [currentNumbers[j], currentNumbers[i]];
        swapCount++;
        swapSpan.innerText = swapCount;
        renderBoard();
        const allTiles = document.querySelectorAll('.tile');
        allTiles.forEach(t => t.style.transform = 'rotate(1deg)');
        setTimeout(() => allTiles.forEach(t => t.style.transform = ''), 100);
        const won = checkWin();
        if (won) selectedIndex = null;
        return true;
    }

    function onTileClick(clickedIdx) {
        if (!gameRunning || gamePaused) {
            msgSpan.innerHTML = gamePaused ? '⏸ game paused — resume first' : 'game not active — press start';
            return;
        }
        if (selectedIndex === null) {
            selectedIndex = clickedIdx;
            renderBoard();
            msgSpan.innerHTML = `👉 selected ${currentNumbers[clickedIdx]} — now tap a neighbour`;
            return;
        }
        const first = selectedIndex;
        const second = clickedIdx;
        selectedIndex = null;
        if (first === second) {
            renderBoard();
            msgSpan.innerHTML = '✨ selection cleared — pick again';
            return;
        }
        const swapped = attemptSwap(first, second);
        if (swapped && gameRunning) {
            msgSpan.innerHTML = `🔄 swapped ${currentNumbers[second]} ↔ ${currentNumbers[first]}`;
        }
    }

    // ---------- GAME CONTROLS ----------
    function resetGame(size, autoStart = false,resetlives=false) {
         if (resetLives) {
            livesLeft = 3;
            livesSpan.innerText = livesLeft;
        }
        stopTimer();
        pauseBgMusic();
        gameRunning = false;
        gamePaused = false;
        currentGridSize = size;
        currentNumbers = generateRandomGrid(currentGridSize);
        targetOrder = [...currentNumbers].sort((a, b) => a - b);
        swapCount = 0;
        selectedIndex = null;
        swapSpan.innerText = '0';
        sizeSpan.innerText = currentGridSize;
        let limit = currentGridSize === 4 ? 30 : (currentGridSize === 6 ? 45 : 60);
        timeSpan.innerText = limit + 's';
        msgSpan.innerHTML = '🔄 game ready. press START to begin!';
        renderBoard();
        document.querySelectorAll('.tile').forEach(t => {
            t.style.opacity = '';
            t.classList.remove('winGlow');
        });
        if (autoStart) {
            startGame();
        }
    }

    function startGame() {
        if (gameRunning && !gamePaused) {
            msgSpan.innerHTML = 'game already running!';
            return;
        }
        if (gamePaused) {
            resumeGame();
            return;
        }
        gameRunning = true;
        gamePaused = false;
        let limit = currentGridSize === 4 ? 30 : (currentGridSize === 6 ? 45 : 60);
        startTimer(limit);
        startBgMusic();
        playStartSound();
        msgSpan.innerHTML = '🎮 game started! good luck!';
    }

    function pauseGame() {
        if (!gameRunning) {
            msgSpan.innerHTML = 'game not active — cannot pause';
            return;
        }
        if (gamePaused) {
            msgSpan.innerHTML = 'already paused';
            return;
        }
        gamePaused = true;
        pauseBgMusic();
        stopTimer();
        msgSpan.innerHTML = '⏸ game paused — press resume to continue';
    }

    function resumeGame() {
        if (!gameRunning) {
            msgSpan.innerHTML = 'game not active — start a new game first';
            return;
        }
        if (!gamePaused) {
            msgSpan.innerHTML = 'game is not paused';
            return;
        }
        gamePaused = false;
        startTimer(timeLeft);
        resumeBgMusic();
        msgSpan.innerHTML = '▶ game resumed!';
    }

    function giveHint() {
        if (!gameRunning || gamePaused) {
            msgSpan.innerHTML = gamePaused ? '⏸ game paused — resume to use hint' : 'game not started — press start';
            return;
        }
        for (let i = 0; i < currentNumbers.length - 1; i++) {
            if (currentNumbers[i] > currentNumbers[i + 1]) {
                msgSpan.innerHTML = `💡 hint: swap ${currentNumbers[i]} and ${currentNumbers[i+1]} (positions ${i}, ${i+1}) — they are out of order.`;
                const tiles = document.querySelectorAll('.tile');
                if (tiles[i] && tiles[i+1]) {
                    tiles[i].style.backgroundColor = '#ffe0b5';
                    tiles[i+1].style.backgroundColor = '#ffe0b5';
                    setTimeout(() => {
                        if (tiles[i]) tiles[i].style.backgroundColor = '';
                        if (tiles[i+1]) tiles[i+1].style.backgroundColor = '';
                    }, 700);
                }
                return;
            }
        }
        msgSpan.innerHTML = '✅ no adjacent errors — maybe you already won?';
    }

    // ---------- EVENT LISTENERS ----------
    function bindEvents() {
        document.querySelectorAll('.diffBtn').forEach(btn => {
            btn.addEventListener('click', () => {
                const newSize = parseInt(btn.getAttribute('data-size'), 10);
                resetGame(newSize, false);
                document.querySelectorAll('.diffBtn').forEach(b => b.classList.remove('activeDiff'));
                btn.classList.add('activeDiff');
            });
        });
        document.getElementById('startBtn').addEventListener('click', startGame);
        document.getElementById('pauseBtn').addEventListener('click', pauseGame);
        document.getElementById('resumeBtn').addEventListener('click', resumeGame);
        document.getElementById('restartBtn').addEventListener('click', () => {
            resetGame(currentGridSize, false, true);
            gameRunning = false;
            gamePaused = false;
            stopTimer();
            pauseBgMusic();
            msgSpan.innerHTML = 'game reset. press START to play.';
        });
      
    // ---------- INITIALISE ----------
    function init() {
        bindEvents();
        resetGame(6, false);
    }

    init();
});
