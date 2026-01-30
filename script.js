document.addEventListener('DOMContentLoaded', async () => {
    // MODALS AND SCREENS
    const successModal = document.getElementById('success-modal');
    const startContent = document.getElementById('start-content');
    const gameContent = document.getElementById('game-content');

    // NEW ELEMENTS
    const rulesModal = document.getElementById('rules-modal');
    const welcomeMessage = document.getElementById('welcome-message');
    const playerLevelInfo = document.getElementById('player-level-info');
    const gameInfoList = document.getElementById('game-info');
    const infoBtn = document.getElementById('info-btn');
    const closeRulesBtn = document.getElementById('close-rules-btn');
    const backFromRulesBtn = document.getElementById('back-from-rules-btn');

    // GAME ELEMENTS
    const gridElement = document.getElementById('crossword-grid');
    const numberBankElement = document.getElementById('number-bank');
    const levelDisplay = document.getElementById('level-display');
    const difficultyDisplay = document.getElementById('difficulty-display');

    // BUTTONS
    const easyBtn = document.getElementById('easy-btn');
    const mediumBtn = document.getElementById('medium-btn');
    const hardBtn = document.getElementById('hard-btn');
    const resetBtn = document.getElementById('reset-btn');
    const backBtn = document.getElementById('back-btn');
    const clearBtn = document.getElementById('clear-btn');
    const nextLevelBtn = document.getElementById('next-level-btn');
    const playAgainBtn = document.getElementById('play-again-btn');

    let currentLevel = 1;
    let playerProgress = { highestLevelCompleted: 0 };
    let config = {};
    let levels = [];
    let selectedValue = null;
    let selectedElement = null;
    let placementHistory = [];
        let equationStates = new Map(); // Add this line

    // ANALYTICS
    let analytics = null;
    let levelStartTime = 0;
    let isLevelActive = false;

    const B = 'B';
    const LEVEL_COMPLETION_XP = 5;

    // AUDIO
    const correctSound = new Audio('assets/audio/correct.mp3');
    const incorrectSound = new Audio('assets/audio/incorrect.mp3');
    const completionSound = new Audio('assets/audio/completion.mp3');
    const gameAudio = new Audio('assets/audio/game-audio.mp3');

    // Set volume levels
    correctSound.volume = 0.7;    // 70% volume
    incorrectSound.volume = 0.6;  // 60% volume
    completionSound.volume = 0.8; // 80% volume
    gameAudio.volume = 0.3;       // 40% volume - background music should be softer

    // Set gameAudio to loop
    gameAudio.loop = true;

    // Preload audio files
    function preloadAudio() {
        correctSound.load();
        incorrectSound.load();
        completionSound.load();
        gameAudio.load();
    }

    // Function to play sounds
    function playSound(sound) {
        // Reset the audio to the beginning if it's already playing
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Audio play failed:", e));
    }

    // Function to start background music
    function startBackgroundMusic() {
        gameAudio.play().catch(e => {
            console.log("Background music failed to start:", e);
        });
    }

    // --- INITIALIZATION ---
    try {
        // Initialize Analytics
        // Session persists for the whole gameplay duration (until page reload/close)
        if (typeof AnalyticsManager !== 'undefined') {
            analytics = new AnalyticsManager();
            
            // Use sessionStorage to store/retrieve the session ID so it persists across page reloads
            // but is cleared when the tab/browser is closed (new session).
            let sessionId = sessionStorage.getItem('crossMath_sessionId');
            if (!sessionId) {
                sessionId = 'Session_' + Date.now();
                sessionStorage.setItem('crossMath_sessionId', sessionId);
            }
            
            analytics.initialize('CrossMath-division', sessionId);
        }

        const response = await fetch('puzzles_division.json');
        const puzzleData = await response.json();
        config = puzzleData.config;
        levels = puzzleData.levels;
        loadProgress();
        updateStartScreen();
        populateRulesModal();
        preloadAudio(); // Preload audio files
        
        // Start background music when game loads
        startBackgroundMusic();
    } catch (error) {
        console.error("Error loading puzzle data:", error);
        startContent.innerHTML = `<h1>Error</h1><p>Could not load game data. Please try again later.</p>`;
        return;
    }

    // --- PROGRESS MANAGEMENT ---
    function loadProgress() {
        const savedProgress = localStorage.getItem('crossMath-divisionPlayerProgress');
        if (savedProgress) {
            playerProgress = JSON.parse(savedProgress);
            console.log("Loaded player progress:", playerProgress);
        }
    }

    function saveProgress() {
        localStorage.setItem('crossMath-divisionPlayerProgress', JSON.stringify(playerProgress));
    }

    // --- START SCREEN UPDATES ---
    function updateStartScreen() {
        const { easy, medium, hard } = config.difficulties;

        // Update difficulty buttons
        mediumBtn.disabled = playerProgress.highestLevelCompleted < medium.unlocksAt - 1;
        hardBtn.disabled = playerProgress.highestLevelCompleted < hard.unlocksAt - 1;

        // Get the final level number from the hard difficulty range
        const finalLevel = hard.levelRange[1];

        // Update welcome message based on player progress
        if (playerProgress.highestLevelCompleted === 0) {
            welcomeMessage.textContent = "Welcome to CrossMath!";
            playerLevelInfo.innerHTML = "Solve math puzzles by completing the crossword grid.";
        } else if (playerProgress.highestLevelCompleted >= finalLevel) {
            // Player has completed all levels
            welcomeMessage.textContent = "Master Puzzler!";
            playerLevelInfo.innerHTML = "Congratulations! You've completed all levels! Play any level again.";
        } else {
            const nextLevel = playerProgress.highestLevelCompleted + 1;
            welcomeMessage.textContent = "Welcome back!";

            // Determine which difficulty the player is currently on
            let currentDifficulty = "Easy";
            if (nextLevel >= hard.levelRange[0]) {
                currentDifficulty = "Hard";
            } else if (nextLevel >= medium.levelRange[0]) {
                currentDifficulty = "Medium";
            }

            playerLevelInfo.innerHTML = `You're on <span class="current-level">Level ${nextLevel}</span> (${currentDifficulty})`;
        }
    }

    // --- RULES MODAL FUNCTIONS ---
    function populateRulesModal() {
        // Clear existing content
        gameInfoList.innerHTML = '';

        // Add total levels info
        const totalLevels = levels.length;
        const li1 = document.createElement('li');
        li1.textContent = `Total levels: ${totalLevels}`;
        gameInfoList.appendChild(li1);

        // Add difficulty info
        const { easy, medium, hard } = config.difficulties;

        const li2 = document.createElement('li');
        li2.textContent = `Easy levels: ${easy.levelRange[0]} to ${easy.levelRange[1]}`;
        gameInfoList.appendChild(li2);

        const li3 = document.createElement('li');
        li3.textContent = `Medium levels: ${medium.levelRange[0]} to ${medium.levelRange[1]} (Unlocks after level ${medium.unlocksAt - 1})`;
        gameInfoList.appendChild(li3);

        const li4 = document.createElement('li');
        li4.textContent = `Hard levels: ${hard.levelRange[0]} to ${hard.levelRange[1]} (Unlocks after level ${hard.unlocksAt - 1})`;
        gameInfoList.appendChild(li4);
    }

    function showRulesModal() {
        rulesModal.style.display = 'flex';
        setTimeout(() => {
            rulesModal.classList.add('visible');
        }, 10);
    }

    function hideRulesModal() {
        rulesModal.classList.remove('visible');
        setTimeout(() => {
            rulesModal.style.display = 'none';
        }, 300);
    }

    // --- GAME FLOW ---
    function startGame(levelNumber) {
        currentLevel = levelNumber;
        generatePuzzle(levelNumber);
        
        // Analytics
        if (analytics) {
            analytics.startLevel(`Level_${levelNumber}`);
            levelStartTime = Date.now();
            isLevelActive = true;
        }

        // UI Transition: Fade out start screen
        startContent.style.opacity = '0';
        startContent.style.transform = 'translateY(-15px)';
        startContent.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

        setTimeout(() => {
            startContent.style.display = 'none';
            // Reset styles for return
            startContent.style.opacity = '';
            startContent.style.transform = '';
            startContent.style.transition = '';
            
            gameContent.style.display = 'flex';
            
            // Ensure background music is playing when a game starts
            if (gameAudio.paused) {
                startBackgroundMusic();
            }
        }, 300);
    }

    function returnToStartScreen() {
        if (analytics && isLevelActive) {
            const timeTaken = Date.now() - levelStartTime;
            analytics.endLevel(`Level_${currentLevel}`, false, timeTaken, 0);
            analytics.submitReport();
            isLevelActive = false;
        }

        // UI Transition: Fade out game screen
        gameContent.style.opacity = '0';
        gameContent.style.transform = 'translateY(15px)';
        gameContent.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

        setTimeout(() => {
            gameContent.style.display = 'none';
            // Reset styles
            gameContent.style.opacity = '';
            gameContent.style.transform = '';
            gameContent.style.transition = '';

            startContent.style.display = 'block';
            updateStartScreen(); // Update the welcome message when returning to start screen
        }, 300);
    }

    function onPuzzleComplete() {
        if (analytics && isLevelActive) {
            const timeTaken = Date.now() - levelStartTime;
            analytics.endLevel(`Level_${currentLevel}`, true, timeTaken, LEVEL_COMPLETION_XP);
            // Submit report within the same ongoing session
            analytics.submitReport();
            isLevelActive = false;
        }

        if (currentLevel > playerProgress.highestLevelCompleted) {
            playerProgress.highestLevelCompleted = currentLevel;
            saveProgress();
            updateStartScreen(); // Update the welcome message when progress changes
        }

        // Play completion sound
        playSound(completionSound);

        successModal.style.display = 'flex';
        setTimeout(() => {
            successModal.classList.add('visible');
        }, 10);
    }

    // --- PUZZLE GENERATION ---
    function generatePuzzle(levelNumber) {
        const puzzle = levels.find(l => l.level === levelNumber);
        if (!puzzle) {
            console.error(`Puzzle for level ${levelNumber} not found!`);
            returnToStartScreen();
            return;
        }

        const difficultyKey = Object.keys(config.difficulties).find(key => {
            const diff = config.difficulties[key];
            return levelNumber >= diff.levelRange[0] && levelNumber <= diff.levelRange[1];
        });
        const difficulty = config.difficulties[difficultyKey];

        levelDisplay.textContent = `Level ${puzzle.level}`;
        difficultyDisplay.textContent = difficulty.displayName;

        gridElement.innerHTML = '';
        numberBankElement.innerHTML = '';
        placementHistory = [];
        
        // Get grid dimensions
        const gridSize = puzzle.grid.length;
        
        // Calculate cell size based on grid dimensions
        // For larger grids, make cells smaller
        let cellSize;
        if (gridSize <= 5) {
            cellSize = 50; // Original size for 5×5 grids
        } else if (gridSize === 6) {
            cellSize = 45; // Slightly smaller for 6×6
        } else {
            cellSize = 40; // Even smaller for 7×7
        }
        
        // Set grid template columns based on the number of columns in the grid
        // Use 'auto' to allow the column width to adjust based on the cell size (which is controlled by CSS/JS)
        gridElement.style.gridTemplateColumns = `repeat(${puzzle.grid[0].length}, auto)`;
        
        // Add a data attribute to the grid element for CSS targeting
        gridElement.dataset.gridSize = gridSize;

        puzzle.grid.forEach((row, r) => {
            row.forEach((content, c) => {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                
                // Set cell size dynamically
                cell.style.width = `${cellSize}px`;
                cell.style.height = `${cellSize}px`;
                
                // Adjust font size for larger grids
                if (gridSize > 5) {
                    cell.style.fontSize = `${24 - (gridSize - 5) * 2}px`;
                }

                if (puzzle.emptyCells.some(ec => ec.r === r && ec.c === c)) {
                    cell.classList.add('empty');
                    cell.addEventListener('click', () => onCellClick(cell));
                } else if (content === B) {
                    cell.classList.add('blank');
                } else {
                    // Display '×' for multiplication instead of '*'
                    cell.textContent = content === '*' ? '×' : content;
                    cell.classList.add('static');
                }
                gridElement.appendChild(cell);
            });
        });

        puzzle.numbers.sort((a, b) => a - b).forEach((num, index) => {
            const numItem = document.createElement('div');
            numItem.classList.add('number-item');
            numItem.textContent = num;
            numItem.dataset.id = `bank-${index}`;
            numItem.addEventListener('click', () => selectNumberFromBank(num, numItem));
            numberBankElement.appendChild(numItem);
        });
        equationStates.clear();

        clearSelection();
    }

    function onCellClick(cell) {
        if (selectedValue !== null) {
            placeNumber(cell);
        } else if (cell.textContent !== '') {
            pickupNumberFromGrid(cell);
        }
    }

    function selectNumberFromBank(num, element) {
        if (element.classList.contains('used')) return;
        if (selectedElement === element) { clearSelection(); return; }
        clearSelection();
        selectedValue = num;
        selectedElement = element;
        element.classList.add('selected');
    }

    function pickupNumberFromGrid(cell) {
        const num = parseInt(cell.textContent);

        const bankItems = Array.from(numberBankElement.children);
        for (let i = 0; i < bankItems.length; i++) {
            if (parseInt(bankItems[i].textContent) === num && bankItems[i].classList.contains('used')) {
                bankItems[i].classList.remove('used');
                break;
            }
        }

        cell.textContent = '';
        cell.classList.remove('correct', 'incorrect');
        placementHistory = placementHistory.filter(item => item.cell !== cell);
        validateEquations();
    }

    function placeNumber(targetCell) {
        if (targetCell.textContent !== '') { pickupNumberFromGrid(targetCell); }

        targetCell.textContent = selectedValue;
        
        // Analytics Task Recording
        if (analytics && isLevelActive) {
             const r = parseInt(targetCell.dataset.row);
             const c = parseInt(targetCell.dataset.col);
             const puzzle = levels.find(l => l.level === currentLevel);
             if (puzzle) {
                 const correctVal = puzzle.grid[r][c];
                 const isCorrect = (String(selectedValue) === String(correctVal));
                 
                 analytics.recordTask(
                     `Level_${currentLevel}`,
                     `Task_Place_${Date.now()}`,
                     `Fill Cell (${r},${c})`,
                     String(correctVal),
                     String(selectedValue),
                     0, 
                     isCorrect ? 10 : 0
                 );
             }
        }

        // Add animation feedback
        targetCell.classList.remove('animate-pop');
        void targetCell.offsetWidth; // Force reflow
        targetCell.classList.add('animate-pop');

        selectedElement.classList.add('used');
        placementHistory.push({ cell: targetCell, bankItem: selectedElement });

        clearSelection();
        validateEquations();
    }

    function clearSelection() {
        if (selectedElement) { selectedElement.classList.remove('selected'); }
        selectedValue = null;
        selectedElement = null;
    }

    function clearLastEntry() {
        if (placementHistory.length > 0) {
            const lastPlacement = placementHistory.pop();
            const lastCell = lastPlacement.cell;
            lastCell.textContent = '';
            lastCell.classList.remove('correct', 'incorrect');
            lastPlacement.bankItem.classList.remove('used');
            validateEquations();
        }
    }

    // --- EQUATION VALIDATION (Corrected for Left-to-Right Calculation) ---
    function validateEquations() {
        // Clear all previous visual styles before re-evaluating
        gridElement.querySelectorAll('.cell.correct, .cell.incorrect').forEach(c => {
            c.classList.remove('correct', 'incorrect');
        });

        const puzzle = levels.find(l => l.level === currentLevel);
        if (!puzzle) return;

        const equations = findEquations();
        const newStates = new Map(); // Temporarily store the new state of all equations
        let allEquationsCorrect = true;

        const allEmptyCellsFilled = puzzle.emptyCells.every(ec => {
            const cell = gridElement.querySelector(`[data-row='${ec.r}'][data-col='${ec.c}']`);
            return cell && cell.textContent;
        });

        equations.forEach(eq => {
            // A unique key to identify each equation (e.g., "H-0-0" for Horizontal at row 0, col 0)
            const eqKey = `${eq.type}-${eq.start.r}-${eq.start.c}`;
            
            const numbers = eq.operandCells.map(cellPos => {
                const cell = gridElement.querySelector(`[data-row='${cellPos.r}'][data-col='${cellPos.c}']`);
                return parseInt(cell.textContent, 10);
            });
            const resultVal = parseInt(gridElement.querySelector(`[data-row='${eq.resultCell.r}'][data-col='${eq.resultCell.c}']`).textContent, 10);

            let currentState;

            // Determine the current state: incomplete, correct, or incorrect
            if (numbers.some(isNaN) || isNaN(resultVal)) {
                currentState = 'incomplete';
                allEquationsCorrect = false;
            } else {
                // This equation is fully populated, so let's validate it
                let finalResult = numbers[0];
                let calculationIsValid = true;
                for (let i = 0; i < eq.operators.length; i++) {
                    const operator = eq.operators[i];
                    const nextNumber = numbers[i + 1];
                    switch (operator) {
                        case '+': finalResult += nextNumber; break;
                        case '-': finalResult -= nextNumber; break;
                        case '*': finalResult *= nextNumber; break;
                        case '/':
                            if (nextNumber === 0 || finalResult % nextNumber !== 0) {
                                calculationIsValid = false;
                            } else {
                                finalResult /= nextNumber;
                            }
                            break;
                    }
                    if (!calculationIsValid) break;
                }

                if (calculationIsValid && finalResult === resultVal) {
                    currentState = 'correct';
                } else {
                    currentState = 'incorrect';
                    allEquationsCorrect = false;
                }
            }

            // --- State Change Logic for Audio Feedback ---
            const oldState = equationStates.get(eqKey);
            if (currentState !== oldState) {
                if (currentState === 'correct') {
                    playSound(correctSound); // Play sound ONLY when it becomes correct
                } else if (currentState === 'incorrect') {
                    playSound(incorrectSound); // Play sound ONLY when it becomes incorrect
                }
            }

            // Apply visual feedback based on the current state (if not incomplete)
            if (currentState === 'correct' || currentState === 'incorrect') {
                const cssClass = currentState; // 'correct' or 'incorrect'
                eq.allCells.forEach(cellPos => {
                    const cell = gridElement.querySelector(`[data-row='${cellPos.r}'][data-col='${cellPos.c}']`);
                    if (cell) cell.classList.add(cssClass);
                });
            }

            newStates.set(eqKey, currentState); // Store the new state
        });
        
        // After checking all equations, update the global state for the next move
        equationStates = newStates;

        // Check for puzzle completion
        if (allEmptyCellsFilled && allEquationsCorrect && equations.length > 0) {
            onPuzzleComplete();
        }
    }



    // *** REWRITTEN FUNCTION ***
    // This new function is more reliable as it looks for the '=' sign to define an equation,
    // which matches the structure of your puzzle grid.
    // Update the findEquations function to work with any grid size

    // This function dynamically finds equations of any length in the grid.
    function findEquations() {
        const puzzle = levels.find(l => l.level === currentLevel);
        if (!puzzle) return [];

        const grid = puzzle.grid;
        const gridSize = grid.length;
        const equations = [];

        // Scan for HORIZONTAL equations
        for (let r = 0; r < gridSize; r++) {
            const eqIndex = grid[r].indexOf('=');
            if (eqIndex > 1 && eqIndex < grid[r].length - 1) {
                const equation = {
                    type: 'H',
                    start: { r: r, c: 0 },
                    operandCells: [],
                    operators: [],
                    resultCell: { r: r, c: eqIndex + 1 },
                    allCells: [{ r: r, c: eqIndex + 1 }]
                };
                for (let c = 0; c < eqIndex; c++) {
                    if (c % 2 === 0) {
                        equation.operandCells.push({ r: r, c: c });
                        equation.allCells.push({ r: r, c: c });
                    } else {
                        equation.operators.push(grid[r][c]);
                    }
                }
                if (equation.operandCells.length > 1) {
                    equations.push(equation);
                }
            }
        }

        // Scan for VERTICAL equations
        for (let c = 0; c < grid[0].length; c++) {
            let eqIndex = -1;
            for (let r = 0; r < gridSize; r++) { if (grid[r][c] === '=') { eqIndex = r; break; } }
            
            if (eqIndex > 1 && eqIndex < gridSize - 1) {
                const equation = {
                    type: 'V',
                    start: { r: 0, c: c },
                    operandCells: [],
                    operators: [],
                    resultCell: { r: eqIndex + 1, c: c },
                    allCells: [{ r: eqIndex + 1, c: c }]
                };
                for (let r = 0; r < eqIndex; r++) {
                    if (r % 2 === 0) {
                        equation.operandCells.push({ r: r, c: c });
                        equation.allCells.push({ r: r, c: c });
                    } else {
                        equation.operators.push(grid[r][c]);
                    }
                }
                if (equation.operandCells.length > 1) {
                    equations.push(equation);
                }
            }
        }
        return equations;
    }
    // --- Event Listeners ---
    // New event listeners for rules modal
    infoBtn.addEventListener('click', showRulesModal);
    closeRulesBtn.addEventListener('click', hideRulesModal);
    backFromRulesBtn.addEventListener('click', hideRulesModal);

    // Existing event listeners
    backBtn.addEventListener('click', returnToStartScreen);
    clearBtn.addEventListener('click', clearLastEntry);
    resetBtn.addEventListener('click', () => generatePuzzle(currentLevel));

    playAgainBtn.addEventListener('click', () => {
        successModal.classList.remove('visible');
        setTimeout(() => {
            successModal.style.display = 'none';
            generatePuzzle(currentLevel);
            
            // Analytics
            if (analytics) {
                analytics.startLevel(`Level_${currentLevel}`);
                levelStartTime = Date.now();
                isLevelActive = true;
            }
        }, 300);
    });

    nextLevelBtn.addEventListener('click', () => {
        successModal.classList.remove('visible');
        const nextLevel = currentLevel + 1;
        if (levels.find(l => l.level === nextLevel)) {
            setTimeout(() => {
                successModal.style.display = 'none';
                startGame(nextLevel);
            }, 300);
        } else {
            setTimeout(() => {
                successModal.style.display = 'none';
                alert("Congratulations! You've completed all levels!");
                returnToStartScreen();
            }, 300);
        }
    });

    easyBtn.addEventListener('click', () => {
        const startLevel = Math.max(config.difficulties.easy.levelRange[0], playerProgress.highestLevelCompleted + 1);
        startGame(startLevel > config.difficulties.easy.levelRange[1] ? config.difficulties.easy.levelRange[0] : startLevel);
    });
    mediumBtn.addEventListener('click', () => {
        const startLevel = Math.max(config.difficulties.medium.levelRange[0], playerProgress.highestLevelCompleted + 1);
        startGame(startLevel > config.difficulties.medium.levelRange[1] ? config.difficulties.medium.levelRange[0] : startLevel);
    });
    hardBtn.addEventListener('click', () => {
        const startLevel = Math.max(config.difficulties.hard.levelRange[0], playerProgress.highestLevelCompleted + 1);
        startGame(startLevel > config.difficulties.hard.levelRange[1] ? config.difficulties.hard.levelRange[0] : startLevel);
    });

    // --- DEBUG TOOLS ---
    const debugPanel = document.getElementById('debug-panel');
    const toggleDebugBtn = document.getElementById('toggle-debug-btn');
    const levelInput = document.getElementById('level-input');
    const jumpLevelBtn = document.getElementById('jump-level-btn');
    const validateGridBtn = document.getElementById('validate-grid-btn');
    const resetProgressBtn = document.getElementById('reset-progress-btn');

    // Toggle debug panel visibility
    toggleDebugBtn.addEventListener('click', () => {
        debugPanel.classList.toggle('open');
    });

    // Jump to a specific level
    jumpLevelBtn.addEventListener('click', () => {
        const levelNumber = parseInt(levelInput.value);
        if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > levels.length) {
            alert(`Please enter a valid level number between 1 and ${levels.length}`);
            return;
        }
        
        startGame(levelNumber);
        
        // Optional: Close debug panel after jumping to level
        debugPanel.classList.remove('open');
    });

    // Manually trigger validation for debugging
    validateGridBtn.addEventListener('click', () => {
        validateEquations();
        
        // Log additional debug info
        const puzzle = levels.find(l => l.level === currentLevel);
        if (puzzle) {
            const emptyCellsFilled = puzzle.emptyCells.every(ec => {
                const cell = gridElement.querySelector(`[data-row='${ec.r}'][data-col='${ec.c}']`);
                return cell && cell.textContent;
            });
            
            console.log('Debug validation info:');
            console.log('- All empty cells filled:', emptyCellsFilled);
            console.log('- Expected empty cell values:', puzzle.emptyCells.map(ec => ec.value));
            console.log('- Actual values in grid:');
            
            puzzle.emptyCells.forEach(ec => {
                const cell = gridElement.querySelector(`[data-row='${ec.r}'][data-col='${ec.c}']`);
                console.log(`  Cell [${ec.r},${ec.c}]: expected=${ec.value}, actual=${cell ? cell.textContent : 'empty'}`);
            });
        }
    });

    // Reset player progress (for testing)
    resetProgressBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all progress? This will remove all level completions.')) {
            playerProgress = { highestLevelCompleted: 0 };
            saveProgress();
            updateStartScreen();
            alert('Progress has been reset');
        }
    });

    // Update level input max value once levels are loaded
    levelInput.max = levels.length;

    // Debug mode key sequence detector
    const debugSequence = ['d', 'e', 'b', 'u', 'g'];
    let debugKeyBuffer = [];

    document.addEventListener('keydown', (e) => {
        // Only track alphabetic keys
        if (/^[a-z]$/i.test(e.key)) {
            const key = e.key.toLowerCase();
            debugKeyBuffer.push(key);
            
            // Keep only the last 5 keys
            if (debugKeyBuffer.length > 5) {
                debugKeyBuffer.shift();
            }
            
            // Check if the sequence matches
            const sequenceMatches = debugKeyBuffer.join('') === debugSequence.join('');
            
            if (sequenceMatches) {
                // Toggle debug panel visibility
                debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
                debugKeyBuffer = []; // Reset the buffer
            }
        }
    });

    // Initially hide debug panel if you want to make it hidden by default
    debugPanel.style.display = 'none';
});