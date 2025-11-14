const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');
const scoreDisplay = document.getElementById('score');
const instructionsScreen = document.getElementById('instructions');
const startButton = document.getElementById('startButton');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// Мобильные кнопки
const mobileControls = document.getElementById('mobileControls');
const jumpButton = document.getElementById('jumpButton');
const duckButton = document.getElementById('duckButton');

let gameRunning = false;
let score = 0;
let lastFrameTime = 0;
let deltaTime = 0;
let isMobileDevice = false; 

// === Настройки Игры ===
const BASE_GAME_SPEED = 200; 
const SPEED_INCREMENT = 0.005;
let currentSpeed = BASE_GAME_SPEED;

// Параметры прыжка
const GRAVITY = 1000;    
const JUMP_VELOCITY = -500; 
const SHORT_JUMP_GRAVITY_MULTIPLIER = 3; 

const PLAYER_STAND_HEIGHT = 80;
const PLAYER_DUCK_HEIGHT = 40;
const PLAYER_WIDTH = 50;
const GROUND_HEIGHT = 50;
const MAX_GAME_WIDTH = 800; 
const MAX_GAME_HEIGHT = 1000; 
// Дополнительная высота, которую нужно вычесть из высоты холста на мобильном телефоне
const MOBILE_CONTROLS_HEIGHT = 150; // Примерно 150px для мобильных кнопок и запаса

// === Препятствия ===
const OBSTACLE_CACTUS = 0; 
const OBSTACLE_BIRD = 1; 

// Размеры препятствий
const OBSTACLE_CACTUS_WIDTH = 30; 
const OBSTACLE_CACTUS_HEIGHT = 50; 
const OBSTACLE_BIRD_SIZE = 40; 

const OBSTACLE_BIRD_Y = []; 

let obstacles = [];
let nextObstacleTime = 0;
let obstacleInterval = 1500; 

// === Состояние Игрока ===
let player = {
    x: 50,
    y: 0,
    width: PLAYER_WIDTH,
    height: PLAYER_STAND_HEIGHT,
    isDucking: false,
    velocityY: 0,
    onGround: true,
    isJumping: false,
};

// === Цикл День/Ночь и Декор ===
let dayNightCycle = 0; 
const DAY_COLOR = '#87CEEB';
const NIGHT_COLOR = '#191970';
let decors = [];

// Изображения игрока
const walkImage = new Image(); 
walkImage.src = 'walk.png'; 

const jumpImage = new Image(); 
jumpImage.src = 'jump.png'; 

const sitImage = new Image(); 
sitImage.src = 'sit.png'; 

// Изображения препятствий
const squareImage = new Image();
squareImage.src = 'square.png'; 

const birdImage = new Image();
birdImage.src = 'bird.png'; 


// Функция для настройки размеров холста (ИСПРАВЛЕНИЕ)
function resizeCanvas() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Обновляем флаг мобильного устройства
    isMobileDevice = viewportWidth < 768;
    mobileControls.style.display = isMobileDevice ? 'flex' : 'none';

    if (isMobileDevice) {
        // На мобильных устройствах, уменьшаем высоту холста, чтобы оставить место для кнопок
        canvas.width = viewportWidth;
        // Вычитаем высоту мобильных контроллеров и небольшой запас
        canvas.height = viewportHeight - MOBILE_CONTROLS_HEIGHT;
        
        // Ограничиваем контейнер, чтобы он не прокручивался
        gameContainer.style.maxWidth = '100vw';
        gameContainer.style.maxHeight = '100vh';
        
    } else {
        // На десктопе используем максимальные значения
        canvas.width = Math.min(viewportWidth, MAX_GAME_WIDTH);
        canvas.height = Math.min(viewportHeight, MAX_GAME_HEIGHT);
        gameContainer.style.maxWidth = `${MAX_GAME_WIDTH}px`;
        gameContainer.style.maxHeight = `${MAX_GAME_HEIGHT}px`;
    }

    // Сброс позиции игрока на землю
    player.y = canvas.height - GROUND_HEIGHT - player.height;
    
    // Обновляем возможные высоты птиц
    OBSTACLE_BIRD_Y[0] = canvas.height - GROUND_HEIGHT - OBSTACLE_BIRD_SIZE - 5; 
    OBSTACLE_BIRD_Y[1] = canvas.height - GROUND_HEIGHT - OBSTACLE_BIRD_SIZE - 60;
    OBSTACLE_BIRD_Y[2] = canvas.height - GROUND_HEIGHT - OBSTACLE_BIRD_SIZE - 120;
}

function initGame() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    player.height = PLAYER_STAND_HEIGHT;
    player.isDucking = false;
    player.x = canvas.width / 4;
    player.y = canvas.height - GROUND_HEIGHT - player.height;
    player.velocityY = 0;
    player.onGround = true;
    player.isJumping = false;

    score = 0;
    currentSpeed = BASE_GAME_SPEED;
    scoreDisplay.textContent = `Счет: ${score}`;
    obstacles = [];
    dayNightCycle = 0;
    obstacleInterval = 1500;

    canvas.style.backgroundColor = DAY_COLOR;
    
    decors.forEach(d => gameContainer.removeChild(d.element));
    decors = [];
    
    gameRunning = false; 
    instructionsScreen.style.display = 'block';
    gameOverScreen.style.display = 'none';
}

function startGame() {
    if (gameRunning) return; 

    instructionsScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameRunning = true;
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameRunning = false;
    finalScoreDisplay.textContent = Math.floor(score);
    gameOverScreen.style.display = 'block';
}

function gameLoop(currentTime) {
    if (!gameRunning) return;

    deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

function update(dt) {
    score += dt * 10;
    currentSpeed += SPEED_INCREMENT * dt * 1000; 
    scoreDisplay.textContent = `Счет: ${Math.floor(score)}`;
    dayNightCycle = Math.floor(score);

    canvas.style.backgroundColor = (dayNightCycle % 700 < 350) ? DAY_COLOR : NIGHT_COLOR;

    if (!player.onGround) {
        let currentGravity = GRAVITY;
        if (!player.isJumping && player.velocityY < 0) { 
            currentGravity *= SHORT_JUMP_GRAVITY_MULTIPLIER; 
        }
        
        player.velocityY += currentGravity * dt;
        player.y += player.velocityY * dt;
    }
    
    const groundY = canvas.height - GROUND_HEIGHT - player.height;
    if (player.y >= groundY) {
        player.y = groundY;
        player.velocityY = 0;
        player.onGround = true;
        if(!player.isJumping) player.isJumping = false; 
    }
    
    nextObstacleTime -= dt * 1000;
    if (nextObstacleTime <= 0) {
        spawnObstacle(Math.floor(score));
        obstacleInterval = Math.max(400, 1500 - (Math.floor(score) * 2)); 
        nextObstacleTime = obstacleInterval / (currentSpeed / BASE_GAME_SPEED); 
    }

    if (Math.random() < 0.01) { 
        spawnDecor();
    }

    for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].x -= currentSpeed * dt;

        if (checkCollision(player, obstacles[i])) {
            endGame(); 
            return;
        }

        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            i--; 
        }
    }
    
    for (let i = 0; i < decors.length; i++) {
        const decorElement = decors[i].element;
        const newX = decors[i].x - (currentSpeed * dt * decors[i].speedFactor);
        decorElement.style.left = `${newX}px`;
        decors[i].x = newX;

        if (newX + 50 < 0) {
            gameContainer.removeChild(decorElement);
            decors.splice(i, 1);
            i--;
        }
    }
}

function checkCollision(p, o) {
    return (
        p.x < o.x + o.width &&
        p.x + p.width > o.x &&
        p.y < o.y + o.height &&
        p.y + p.height > o.y
    );
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#7CFC00';
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);

    let playerImage = walkImage; 
    if (player.isDucking) {
        playerImage = sitImage; 
    } else if (player.isJumping || !player.onGround) {
        playerImage = jumpImage; 
    }

    if (playerImage.complete) {
        ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    } else {
        ctx.fillStyle = player.isDucking ? 'orange' : 'blue';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    obstacles.forEach(obstacle => {
        if (obstacle.type === OBSTACLE_CACTUS) {
            if (squareImage.complete) {
                ctx.drawImage(squareImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            } else {
                ctx.fillStyle = '#32CD32'; 
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }

        } else if (obstacle.type === OBSTACLE_BIRD) {
            if (birdImage.complete) {
                ctx.drawImage(birdImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            } else {
                ctx.fillStyle = '#FF4500'; 
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
        }
    });
}

function spawnObstacle(currentScore) {
    const obstacleX = canvas.width;
    let newObstacle;

    let obstacleType = OBSTACLE_CACTUS;
    let groundOnlyChance = 0.8;
    
    if (currentScore > 50) groundOnlyChance = 0.6; 
    if (currentScore > 150) groundOnlyChance = 0.4;

    if (Math.random() > groundOnlyChance) {
        obstacleType = OBSTACLE_BIRD;
    } else {
        obstacleType = OBSTACLE_CACTUS;
    }
    
    if (obstacleType === OBSTACLE_CACTUS) {
        newObstacle = {
            x: obstacleX,
            y: canvas.height - GROUND_HEIGHT - OBSTACLE_CACTUS_HEIGHT,
            width: OBSTACLE_CACTUS_WIDTH,
            height: OBSTACLE_CACTUS_HEIGHT,
            type: OBSTACLE_CACTUS
        };
        obstacles.push(newObstacle);

        if (currentScore > 100 && Math.random() < 0.4) { 
            const secondCactus = {
                x: obstacleX + OBSTACLE_CACTUS_WIDTH + (Math.random() * 10 + 10), 
                y: canvas.height - GROUND_HEIGHT - OBSTACLE_CACTUS_HEIGHT,
                width: OBSTACLE_CACTUS_WIDTH,
                height: OBSTACLE_CACTUS_HEIGHT,
                type: OBSTACLE_CACTUS
            };
            obstacles.push(secondCactus);

            if (currentScore > 300 && Math.random() < 0.3) { 
                const thirdCactus = {
                    x: secondCactus.x + OBSTACLE_CACTUS_WIDTH + (Math.random() * 10 + 10),
                    y: canvas.height - GROUND_HEIGHT - OBSTACLE_CACTUS_HEIGHT,
                    width: OBSTACLE_CACTUS_WIDTH,
                    height: OBSTACLE_CACTUS_HEIGHT,
                    type: OBSTACLE_CACTUS
                };
                obstacles.push(thirdCactus);
            }
        }

    } else if (obstacleType === OBSTACLE_BIRD) {
        const birdY = OBSTACLE_BIRD_Y[Math.floor(Math.random() * OBSTACLE_BIRD_Y.length)];
        newObstacle = {
            x: obstacleX,
            y: birdY,
            width: OBSTACLE_BIRD_SIZE,
            height: OBSTACLE_BIRD_SIZE,
            type: OBSTACLE_BIRD
        };
        obstacles.push(newObstacle);
    }
}

function spawnDecor() {
    const isDay = dayNightCycle % 700 < 350;
    const emoji = isDay ? '☁️' : '✨';
    const randomY = Math.random() * (canvas.height / 3);
    const speedFactor = Math.random() * 0.5 + 0.1; 

    const decorElement = document.createElement('div');
    decorElement.className = 'decor';
    decorElement.textContent = emoji;
    decorElement.style.top = `${randomY}px`;
    decorElement.style.left = `${canvas.width}px`;
    gameContainer.appendChild(decorElement);

    decors.push({
        element: decorElement,
        x: canvas.width,
        y: randomY,
        speedFactor: speedFactor
    });
}


// --- Действия Игрока ---

function jumpStart() {
    if (player.onGround) {
        player.isJumping = true; 
        player.onGround = false;
        player.velocityY = JUMP_VELOCITY; 
        if (player.isDucking) unduck();
    }
}

function jumpEnd() {
    if (player.isJumping && player.velocityY < 0) { 
        player.isJumping = false; 
        player.velocityY = player.velocityY * 0.5; 
    }
}

function duck() {
    if (player.onGround && !player.isDucking) {
        player.isDucking = true;
        player.y += player.height - PLAYER_DUCK_HEIGHT;
        player.height = PLAYER_DUCK_HEIGHT;
    }
}

function unduck() {
    if (player.isDucking) {
        player.isDucking = false;
        player.height = PLAYER_STAND_HEIGHT;
        player.y -= PLAYER_STAND_HEIGHT - PLAYER_DUCK_HEIGHT;
    }
}

// --- Обработка ввода (Клавиатура) ---

document.addEventListener('keydown', (e) => {
    if (!gameRunning && (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        startGame();
    }
    
    if (gameRunning) {
        if ((e.key === 'ArrowUp' || e.key === ' ') && player.onGround) { 
            jumpStart();
        } else if (e.key === 'ArrowDown') {
            duck();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (gameRunning) {
        if (e.key === 'ArrowUp' || e.key === ' ') {
            jumpEnd();
        } else if (e.key === 'ArrowDown') {
            unduck();
        }
    }
});

// --- Обработка ввода (Мобильные кнопки) ---

jumpButton.addEventListener('touchstart', (e) => {
    e.preventDefault(); 
    if (!gameRunning) {
        startGame();
    } else if (player.onGround) {
        jumpStart();
    }
});

jumpButton.addEventListener('touchend', (e) => {
    e.preventDefault(); 
    if (gameRunning) {
        jumpEnd();
    }
});

duckButton.addEventListener('touchstart', (e) => {
    e.preventDefault(); 
    if (!gameRunning) {
        startGame();
    } else if (player.onGround) {
        duck();
    }
});

duckButton.addEventListener('touchend', (e) => {
    e.preventDefault(); 
    if (gameRunning) {
        unduck();
    }
});


// --- Обработка ввода (Главные кнопки) ---

startButton.addEventListener('click', startGame);

restartButton.addEventListener('click', () => {
    initGame();
    startGame();
});

initGame();