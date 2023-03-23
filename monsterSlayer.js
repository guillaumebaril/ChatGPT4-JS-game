const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let keysPressed = {};

let score = 0;

class Tile {
    constructor(x, y, size, color) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = color;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

class Map {
    constructor(width, height, tileSize) {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        this.tiles = this.generateTiles();
    }

    generateTiles() {
        const tiles = [];
        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                const color = `hsl(${Math.random() * 360}, 50%, 75%)`;
                const tile = new Tile(x * this.tileSize, y * this.tileSize, this.tileSize, color);
                row.push(tile);
            }
            tiles.push(row);
        }
        return tiles;
    }

    draw(translateX, translateY) {
        const startCol = Math.floor((-translateX) / this.tileSize);
        const endCol = Math.ceil((-translateX + canvas.width) / this.tileSize);
        const startRow = Math.floor((-translateY) / this.tileSize);
        const endRow = Math.ceil((-translateY + canvas.height) / this.tileSize);

        for (let row = startRow; row < endRow; row++) {
            for (let col = startCol; col < endCol; col++) {
                if (row >= 0 && row < this.height && col >= 0 && col < this.width) {
                    this.tiles[row][col].draw();
                }
            }
        }
    }
}


class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.color = 'red';
        this.health = 100;
        this.rotation = 0;
        this.speed = 0;
        this.maxSpeed = 8;
        this.acceleration = 0.4;
        this.deceleration = 0.1;
        this.rotationSpeed = 5 * (Math.PI / 180);
        this.swordSwinging = false;
        this.swordSwingDuration = 150;
        this.isInvincible = false;
        this.invincibleStartTime = 0;
        this.invincibleDuration = 3000; // 3 seconds
        this.collisionStartTime = 0;
        this.collisionDuration = 1000; // 1 second
    }

    getSwordTip() {
        const swordLength = this.width * 2;
        const swordTipX = this.x + swordLength * Math.cos(this.rotation);
        const swordTipY = this.y + swordLength * Math.sin(this.rotation);
        return { x: swordTipX, y: swordTipY };
    }

    update() {
        if (this.speed !== 0) {
            this.x += Math.cos(this.rotation) * this.speed;
            this.y += Math.sin(this.rotation) * this.speed;

            // Keep the player within the map bounds
            this.x = Math.min(Math.max(this.x, 0), gameMap.width * gameMap.tileSize - this.width);
            this.y = Math.min(Math.max(this.y, 0), gameMap.height * gameMap.tileSize - this.height);
        }
    
        if (this.speed > 0) {
            this.speed -= this.deceleration;
        } else if (this.speed < 0) {
            this.speed += this.deceleration;
        }

        // Check for player collisions with monsters
        let isColliding = false;
        monsters.forEach(monster => {
            if (circleIntersect(this.x, this.y, this.width, monster.x, monster.y, monster.radius)) {
                isColliding = true;
            }
        });

        const currentTime = performance.now();
        if (isColliding) {
            if (this.collisionStartTime === 0) {
                this.collisionStartTime = currentTime;
            } else if (currentTime - this.collisionStartTime >= this.collisionDuration && !this.isInvincible) {
                this.health-=6;
                this.isInvincible = true;
                this.invincibleStartTime = currentTime;
            }
        } else {
            this.collisionStartTime = 0;
        }

        if (this.isInvincible && currentTime - this.invincibleStartTime >= this.invincibleDuration) {
            this.isInvincible = false;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        if (this.isInvincible) {
            const invincibleTimeElapsed = performance.now() - this.invincibleStartTime;
            const flashInterval = 100; // Adjust this value to control the flashing speed
            if (Math.floor(invincibleTimeElapsed / flashInterval) % 2 === 0) {
                
                ctx.fillStyle = 'white';
                ctx.globalAlpha = 0.5;
                ctx.beginPath();
                ctx.arc(0, 0, this.width, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    drawEyes() {
        const eyesSvg = document.getElementById('eyesSvg');
        const svgUrl = new XMLSerializer().serializeToString(eyesSvg);
        const img = new Image();
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgUrl);

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation - Math.PI/2);
        ctx.drawImage(img, -this.width / 2, 0, 30, 15);        
        ctx.restore();
    }

    drawSword() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation + Math.PI / 2);

        // Draw sword handle
        ctx.fillStyle = 'saddlebrown';
        ctx.fillRect(-2, -25, 4, 20);

        // Draw sword blade
        ctx.fillStyle = 'silver';
        ctx.beginPath();
        ctx.moveTo(-2, -25);
        ctx.lineTo(-6, -45);
        ctx.lineTo(0, -60); // Tip of the sword
        ctx.lineTo(6, -45);
        ctx.lineTo(2, -25);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // Check for collision with a monster
    isCollidingWith(monster) {
        const dx = this.x + this.width / 2 - monster.x;
        const dy = this.y + this.height / 2 - monster.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.width / 2 + monster.radius;
    }

    increaseSpeed() {
        this.speed += this.acceleration;
        if (this.speed > this.maxSpeed) {
            this.speed = this.maxSpeed;
        }
    }

    decreaseSpeed() {
        this.speed -= this.acceleration;
        if (this.speed < -this.maxSpeed / 2) {
            this.speed = -this.maxSpeed / 2;
        }
    }

    rotateLeft() {
        this.rotation -= this.rotationSpeed;
    }

    rotateRight() {
        this.rotation += this.rotationSpeed;
    }

    swingSword() {
        this.swordSwinging = true;
        setTimeout(() => {
            this.swordSwinging = false;
        }, this.swordSwingDuration);
    }
}

class Monster {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20 + Math.random() * 20; // Random size between 20 and 40 pixels
        this.color = getRandomColor();
        this.health = this.radius * 2; // Health proportional to size
        this.speed = (40 - this.radius) / 40 + 0.5; // Set speed based on monster size
        this.breathingFactor = 0;
        this.breathingDirection = 1;
        this.isHit = false;
    }

    update(translateX, translateY) {
        // Calculate the speed multiplier based on whether the monster is in the viewport
        const speedMultiplier = (this.x < -translateX - this.radius || this.x > -translateX + canvas.width + this.radius || this.y < -translateY - this.radius || this.y > -translateY + canvas.height + this.radius) ? 2 : 1;

        // Move the monster towards the player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.x += (dx / distance) * this.speed * speedMultiplier;
        this.y += (dy / distance) * this.speed * speedMultiplier;
    }

    draw(translateX, translateY) {

         // Don't render if the monster is not in the viewport
         if (this.x < -translateX - this.radius || this.x > -translateX + canvas.width + this.radius || this.y < -translateY - this.radius || this.y > -translateY + canvas.height + this.radius) {
            return;
        }

        this.breathing();

        // Draw monster body
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + this.breathingFactor, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();

        // Draw monster eyes
        const eyeDistance = (this.radius + this.breathingFactor) / 2;
        const eyeRadius = (this.radius + this.breathingFactor) / 4;
        ctx.beginPath();
        ctx.arc(this.x - eyeDistance, this.y - eyeDistance, eyeRadius, 0, Math.PI * 2);
        ctx.arc(this.x + eyeDistance, this.y - eyeDistance, eyeRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.isHit ? 'red' : 'white';
        ctx.fill();
        ctx.closePath();

        // Reset the hit status after drawing
        this.isHit = false;

        // Draw monster legs
        const legLength = this.radius / 2;
        const legWidth = this.radius / 8;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.rect(this.x + i * legWidth * 2 - legWidth * 3, this.y + this.radius, legWidth, legLength);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.closePath();
        }
    }

    breathing() {
        this.breathingFactor += this.breathingDirection * 0.05;
        if (this.breathingFactor > 2 || this.breathingFactor < -2) {
            this.breathingDirection *= -1;
        }
    }

    drawMonsterHealthBar() {
        const healthPercentage = this.health / this.maxHealth;
        const barWidth = 30;
        const barHeight = 5;
    
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x - barWidth / 2, this.y - 15, barWidth, barHeight);
    
        ctx.fillStyle = healthPercentage > 0.5 ? 'green' : healthPercentage > 0.25 ? 'yellow' : 'red';
        ctx.fillRect(this.x - barWidth / 2, this.y - 15, barWidth * healthPercentage, barHeight);
    }

    takeDamage(damage) {
        this.health -= damage;
        this.isHit = true;
        this.radius = Math.max(10, this.radius - damage);
        if (this.health <= 0) {            
            const index = monsters.indexOf(this);
            if (index > -1) {
                monsters.splice(index, 1);
            }
        }
    }
}

function drawScore() {
    ctx.fillStyle = 'black';
    ctx.font = '18px Arial';
    ctx.fillText(`Score: ${score}`, 20, 30);
}

function getRandomColor() {
    const colors = ['blue', 'green', 'purple', 'orange'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function spawnMonster() {
    const edge = Math.floor(Math.random() * 4);
    let x, y;

    switch (edge) {
        case 0: // Top edge
            x = Math.random() * canvas.width;
            y = -30;
            break;
        case 1: // Right edge
            x = canvas.width + 30;
            y = Math.random() * canvas.height;
            break;
        case 2: // Bottom edge
            x = Math.random() * canvas.width;
            y = canvas.height + 30;
            break;
        case 3: // Left edge
            x = -30;
            y = Math.random() * canvas.height;
            break;
    }

    monsters.push(new Monster(x, y));
}

function drawHealthBar() {
    ctx.fillStyle = 'black';
    ctx.fillRect(20, canvas.height - 40, 200, 20);
    ctx.fillStyle = 'green';
    ctx.fillRect(22, canvas.height - 38, player.health * 2, 16);
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.fillText(`${player.health}/100`, 90, canvas.height - 24);
}

function updatePlayerPosition(e) {
    if (e.key === 'w' || e.key === 'W') {
        if (player.speed < player.maxSpeed) {
            player.speed += player.acceleration;
        }
    } else if (e.key === 'a' || e.key === 'A') {
        player.rotation -= player.rotationSpeed;
    } else if (e.key === 's' || e.key === 'S') {
        if (player.speed > -player.maxSpeed / 2) {
            player.speed -= player.acceleration;
        }
    } else if (e.key === 'd' || e.key === 'D') {
        player.rotation += player.rotationSpeed;
    }
}

function checkMonstersCollidingWithSword() {

    monsters.forEach(monster => {
        const swordTip = player.getSwordTip();
        if (circleIntersect(swordTip.x, swordTip.y, 10, monster.x, monster.y, monster.radius + monster.breathingFactor)) {
            monster.takeDamage(5);
        }
    });
}


function circleIntersect(x1, y1, r1, x2, y2, r2) {
    const distanceSquared = (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
    const radiusSum = r1 + r2;
    return distanceSquared <= radiusSum * radiusSum;
}



function gameLoop() {

    let translateX = -player.x + canvas.width / 2;
    let translateY = -player.y + canvas.height / 2;

    // Clamp the translation values to keep the map within the viewport
    translateX = Math.min(0, Math.max(translateX, -gameMap.width * gameMap.tileSize + canvas.width));
    translateY = Math.min(0, Math.max(translateY, -gameMap.height * gameMap.tileSize + canvas.height));

    ctx.save();
    ctx.translate(translateX, translateY);

    
    gameMap.draw(translateX, translateY);

    handlePlayerInput();
    player.update();
    player.draw();
    player.drawEyes();
    if (player.swordSwinging) {
        player.drawSword();
        checkMonstersCollidingWithSword();
    }


    
    monsters.forEach(monster => {
        monster.update(translateX, translateY);
        monster.draw(translateX, translateY);
    });

    ctx.restore();

    drawHealthBar();
    drawScore();  

    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (event) => {
    keysPressed[event.code] = true;

    if (event.code === 'Space' && !player.swordSwinging) {
        player.swingSword();
    }
});

document.addEventListener('keyup', (event) => {
    delete keysPressed[event.code];
});

function handlePlayerInput() {
    if (keysPressed['KeyW']) {
        player.increaseSpeed();
    }
    if (keysPressed['KeyS']) {
        player.decreaseSpeed();
    }
    if (keysPressed['KeyA']) {
        player.rotateLeft();
    }
    if (keysPressed['KeyD']) {
        player.rotateRight();
    }
}

setInterval(spawnMonster, 1000 + Math.random() * 2000);

const player = new Player(400, 300);
const monsters = [];
const gameMap = new Map(500, 500, 32);

gameLoop();
