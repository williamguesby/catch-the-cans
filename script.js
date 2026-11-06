const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 420;
const LEVEL_WIDTH = 2780;
const GROUND_Y = 340;
const ROUND_LENGTH = 60;
const CAN_MILESTONE = 10;
const GRAVITY = 0.58;
const MAX_RUN_SPEED = 5;
const GROUND_ACCELERATION = 0.12;
const AIR_ACCELERATION = 0.06;
const GROUND_FRICTION = 0.84;
const AIR_FRICTION = 0.995;
const JUMP_POWER = 11.8;
const MAX_JUMPS = 2;
const DOUBLE_TAP_MS = 300;
const DASH_SPEED = 9;
const DASH_DURATION = 12;
const MAX_HEALTH = 3;
const ENEMY_INVULNERABILITY = 90;
const WATER_SHOT_SPEED = 8;
const WATER_SHOT_RANGE = 360;
const WATER_SHOT_COOLDOWN = 12;

const canvas = document.querySelector("#game-canvas");
const context = canvas.getContext("2d");
let pixelRatio = 1;
const scoreOutput = document.querySelector("#score");
const timerOutput = document.querySelector("#timer");
const healthBar = document.querySelector("#health-bar");
const healthCount = document.querySelector("#health-count");
const waterBar = document.querySelector("#water-bar");
const waterCount = document.querySelector("#water-count");
const message = document.querySelector("#message");
const startButton = document.querySelector("#start-button");
const resetButton = document.querySelector("#reset-button");
const confetti = document.querySelector("#confetti");
const keys = new Set();
const touchDirections = new Set();
const lastDirectionTap = new Map();

const groundSegments = [
  { x: 0, width: 650 },
  { x: 770, width: 610 },
  { x: 1495, width: 610 },
  { x: 2220, width: 560 },
];

const platforms = [
  { x: 235, y: 275, width: 138 },
  { x: 475, y: 235, width: 145 },
  { x: 855, y: 275, width: 145 },
  { x: 1110, y: 230, width: 150 },
  { x: 1580, y: 270, width: 145 },
  { x: 1835, y: 225, width: 150 },
  { x: 2310, y: 270, width: 145 },
];

const canLocations = [
  [145, 299], [315, 235], [535, 194], [585, 299],
  [865, 298], [925, 235], [1160, 189], [1280, 299],
  [1580, 297], [1650, 230], [1880, 184], [1990, 298],
  [2290, 297], [2375, 230], [2515, 298],
];

const enemyPatrols = [
  { minX: 385, maxX: 445, y: GROUND_Y, speed: 0.8, color: "#b85d45" },
  { minX: 945, maxX: 1070, y: GROUND_Y, speed: 1, color: "#8e68b5" },
  { minX: 1130, maxX: 1225, y: 230, speed: 0.75, color: "#4b8fa1" },
  { minX: 1620, maxX: 1690, y: GROUND_Y, speed: 0.9, color: "#b85d45" },
  { minX: 1850, maxX: 1940, y: 225, speed: 0.85, color: "#8e68b5" },
  { minX: 2325, maxX: 2400, y: 270, speed: 0.8, color: "#4b8fa1" },
];

const player = {
  x: 50,
  y: GROUND_Y - 49,
  width: 31,
  height: 49,
  velocityX: 0,
  velocityY: 0,
  grounded: false,
  facing: 1,
  jumpsRemaining: MAX_JUMPS,
  dashFrames: 0,
  dashDirection: 1,
};

let cans = [];
let enemies = [];
let waterShots = [];
let cameraX = 0;
let cameraTargetX = 0;
let score = 0;
let health = MAX_HEALTH;
let timeLeft = ROUND_LENGTH;
let timerInterval;
let animationFrame;
let previousFrame = 0;
let elapsed = 0;
let gameState = "ready";
let lossCause = "time";
let milestoneReached = false;
let checkpointX = 50;
let platformDropFrames = 0;
let invulnerabilityFrames = 0;
let water = 0;
let waterShotCooldown = 0;

function resetLevel() {
  cans = canLocations.map(([x, y]) => ({ x, y, collected: false }));
  enemies = enemyPatrols.map((enemy) => ({ ...enemy, x: enemy.minX, direction: 1 }));
  waterShots = [];
  health = MAX_HEALTH;
  updateHealthDisplay();
  water = 0;
  waterShotCooldown = 0;
  updateWaterDisplay();
  player.x = 50;
  player.y = GROUND_Y - player.height;
  player.velocityX = 0;
  player.velocityY = 0;
  player.grounded = true;
  player.facing = 1;
  player.jumpsRemaining = MAX_JUMPS;
  player.dashFrames = 0;
  player.dashDirection = 1;
  platformDropFrames = 0;
  invulnerabilityFrames = 0;
  cameraX = 0;
  cameraTargetX = 0;
  checkpointX = 50;
  lastDirectionTap.clear();
}

function updateHealthDisplay() {
  healthBar.value = health;
  healthBar.setAttribute("aria-label", `${health} of ${MAX_HEALTH} health`);
  healthCount.value = `${health} / ${MAX_HEALTH}`;
}

function updateWaterDisplay() {
  waterBar.value = water;
  waterBar.setAttribute("aria-label", `${water} water ${water === 1 ? "shot" : "shots"}`);
  waterCount.value = `${water} ${water === 1 ? "shot" : "shots"}`;
}

function resizeCanvas() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = VIEW_WIDTH * pixelRatio;
  canvas.height = VIEW_HEIGHT * pixelRatio;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  drawScene();
}

function roundRect(x, y, width, height, radius, fill) {
  context.fillStyle = fill;
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function drawCloud(x, y, scale = 1) {
  context.fillStyle = "rgb(255 255 255 / 78%)";
  context.beginPath();
  context.ellipse(x, y, 34 * scale, 13 * scale, 0, 0, Math.PI * 2);
  context.ellipse(x - 20 * scale, y + 3 * scale, 18 * scale, 11 * scale, 0, 0, Math.PI * 2);
  context.ellipse(x + 16 * scale, y - 5 * scale, 21 * scale, 17 * scale, 0, 0, Math.PI * 2);
  context.fill();
}

function drawBackground() {
  const sky = context.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  sky.addColorStop(0, "#83d2e8");
  sky.addColorStop(1, "#e4f5d6");
  context.fillStyle = sky;
  context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  context.fillStyle = "#ffcf4a";
  context.beginPath();
  context.arc(790, 78, 35, 0, Math.PI * 2);
  context.fill();

  drawCloud(125 - (cameraX * 0.12) % 1120, 76, 1);
  drawCloud(505 - (cameraX * 0.1) % 1120, 118, 0.8);
  drawCloud(900 - (cameraX * 0.08) % 1120, 65, 1.1);

  context.fillStyle = "#a9d8a4";
  context.beginPath();
  context.moveTo(0, 282);
  for (let x = 0; x <= VIEW_WIDTH + 40; x += 40) {
    const worldX = x + cameraX * 0.25;
    context.lineTo(x, 245 + Math.sin(worldX * 0.006) * 24 + Math.sin(worldX * 0.015) * 10);
  }
  context.lineTo(VIEW_WIDTH, VIEW_HEIGHT);
  context.lineTo(0, VIEW_HEIGHT);
  context.closePath();
  context.fill();

  context.fillStyle = "#77bd7c";
  context.beginPath();
  context.moveTo(0, 315);
  for (let x = 0; x <= VIEW_WIDTH + 30; x += 30) {
    const worldX = x + cameraX * 0.42;
    context.lineTo(x, 286 + Math.sin(worldX * 0.008) * 13);
  }
  context.lineTo(VIEW_WIDTH, VIEW_HEIGHT);
  context.lineTo(0, VIEW_HEIGHT);
  context.closePath();
  context.fill();
}

function drawGround() {
  for (const segment of groundSegments) {
    const x = segment.x - cameraX;
    if (x + segment.width < 0 || x > VIEW_WIDTH) continue;

    context.fillStyle = "#805334";
    context.fillRect(x, GROUND_Y, segment.width, VIEW_HEIGHT - GROUND_Y);
    context.fillStyle = "#51a84d";
    context.fillRect(x, GROUND_Y, segment.width, 12);
    context.fillStyle = "#83cc61";
    context.fillRect(x, GROUND_Y, segment.width, 4);

    context.fillStyle = "rgb(255 222 149 / 43%)";
    for (let mark = 0; mark < segment.width; mark += 38) {
      context.fillRect(x + mark + 7, GROUND_Y + 26 + (mark % 3) * 8, 12, 3);
    }
  }
}

function drawPlatform(platform) {
  const x = platform.x - cameraX;
  if (x + platform.width < 0 || x > VIEW_WIDTH) return;

  roundRect(x, platform.y, platform.width, 16, 5, "#85542f");
  context.fillStyle = "#45a84e";
  context.fillRect(x + 2, platform.y, platform.width - 4, 5);
  context.fillStyle = "#ba8050";
  for (let mark = 18; mark < platform.width; mark += 34) {
    context.fillRect(x + mark, platform.y + 7, 3, 7);
  }
}

function drawCan(can) {
  if (can.collected) return;

  const x = can.x - cameraX;
  if (x < -40 || x > VIEW_WIDTH + 40) return;
  const bob = Math.sin(elapsed * 4 + can.x) * 3;

  context.save();
  context.translate(x, can.y + bob);
  context.shadowColor = "rgb(45 75 29 / 25%)";
  context.shadowBlur = 7;
  context.shadowOffsetY = 4;
  roundRect(-10, -13, 20, 25, 5, "#ffcb05");
  context.shadowColor = "transparent";
  context.fillStyle = "#171717";
  context.fillRect(-6, -17, 10, 5);
  context.fillRect(-6, -17, 3, 7);
  context.fillStyle = "#fff";
  context.beginPath();
  context.arc(1, 0, 5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#2d91b5";
  context.beginPath();
  context.moveTo(1, -3);
  context.bezierCurveTo(-5, 3, -3, 7, 1, 7);
  context.bezierCurveTo(6, 6, 6, 2, 1, -3);
  context.fill();
  context.restore();
}

function drawEnemy(enemy) {
  const x = enemy.x - cameraX;
  if (x < -40 || x > VIEW_WIDTH + 40) return;

  const stunned = enemy.stunnedFrames > 0;
  const step = stunned ? 0 : Math.sin(elapsed * 9 + enemy.minX) * 2;
  context.save();
  context.translate(x, enemy.y);

  context.fillStyle = "rgb(44 43 35 / 20%)";
  context.beginPath();
  context.ellipse(0, 1, 17, 4, 0, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "#473b38";
  context.lineWidth = 3;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(-9, -5);
  context.lineTo(-12 + step, 0);
  context.moveTo(-3, -4);
  context.lineTo(-4 - step, 0);
  context.moveTo(5, -4);
  context.lineTo(7 + step, 0);
  context.moveTo(11, -5);
  context.lineTo(13 - step, 0);
  context.stroke();

  context.fillStyle = "#513a35";
  for (const spikeX of [-9, -3, 3, 9]) {
    context.beginPath();
    context.moveTo(spikeX - 3, -16);
    context.lineTo(spikeX, -22 - (Math.abs(spikeX) === 3 ? 2 : 0));
    context.lineTo(spikeX + 3, -16);
    context.closePath();
    context.fill();
  }

  context.fillStyle = stunned ? "#62c7e8" : enemy.color;
  context.beginPath();
  context.ellipse(0, -11, 16, 10, 0, Math.PI, Math.PI * 2);
  context.lineTo(16, -6);
  context.quadraticCurveTo(0, 1, -16, -6);
  context.closePath();
  context.fill();

  context.fillStyle = "#fff";
  context.beginPath();
  context.arc(-5, -12, 4, 0, Math.PI * 2);
  context.arc(5, -12, 4, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#211e1d";
  context.beginPath();
  context.arc(-4, -11, 1.5, 0, Math.PI * 2);
  context.arc(6, -11, 1.5, 0, Math.PI * 2);
  context.fill();

  if (stunned) {
    context.fillStyle = "#b8efff";
    for (const drop of [-10, 0, 10]) {
      context.beginPath();
      context.arc(drop, -28 - Math.sin(elapsed * 7 + drop) * 2, 2.5, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

function drawWaterShot(shot) {
  const x = shot.x - cameraX;
  if (x < -20 || x > VIEW_WIDTH + 20) return;

  context.save();
  context.fillStyle = "rgb(39 139 186 / 24%)";
  context.beginPath();
  context.ellipse(x - shot.direction * 7, shot.y, 10, 4, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#72d7fa";
  context.beginPath();
  context.arc(x, shot.y, 5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#e9fbff";
  context.beginPath();
  context.arc(x - 1, shot.y - 2, 1.8, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawVillage() {
  const x = 2550 - cameraX;
  if (x < -160 || x > VIEW_WIDTH + 180) return;

  context.fillStyle = "#6b482d";
  context.fillRect(x + 8, 274, 4, 66);
  context.fillRect(x + 58, 274, 4, 66);
  context.fillRect(x + 108, 274, 4, 66);
  context.fillStyle = "#e9c27b";
  context.fillRect(x + 15, 285, 42, 55);
  context.fillRect(x + 65, 291, 42, 49);

  context.fillStyle = "#b95f42";
  context.beginPath();
  context.moveTo(x + 8, 285);
  context.lineTo(x + 36, 260);
  context.lineTo(x + 64, 285);
  context.closePath();
  context.fill();
  context.beginPath();
  context.moveTo(x + 58, 291);
  context.lineTo(x + 86, 266);
  context.lineTo(x + 114, 291);
  context.closePath();
  context.fill();

  context.fillStyle = "#573e2c";
  context.fillRect(x + 31, 310, 12, 30);
  context.fillRect(x + 80, 313, 12, 27);
  context.fillStyle = "#fff1bd";
  context.fillRect(x + 19, 297, 10, 10);
  context.fillRect(x + 92, 301, 9, 9);

  context.fillStyle = "#f4e4b7";
  context.beginPath();
  context.ellipse(x + 61, 336, 85, 10, 0, 0, Math.PI * 2);
  context.fill();

  drawVillageKids(x);
}

function drawVillageKids(villageX) {
  const celebrating = gameState === "won";
  const kids = [
    { x: villageX + 139, shirt: "#e87848", skin: "#8b553b", phase: 0 },
    { x: villageX + 177, shirt: "#5b8fd1", skin: "#bd8059", phase: 1.7 },
    { x: villageX + 212, shirt: "#8e68b5", skin: "#70442f", phase: 3.2 },
  ];

  for (const kid of kids) {
    const bounce = celebrating ? Math.abs(Math.sin(elapsed * 8 + kid.phase)) * 10 : 0;
    const armRaise = celebrating ? Math.sin(elapsed * 8 + kid.phase) * 0.22 : 0;

    context.save();
    context.translate(kid.x, 330 - bounce);

    context.fillStyle = "rgb(44 43 35 / 18%)";
    context.beginPath();
    context.ellipse(0, 7 + bounce, 10, 3, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = kid.skin;
    context.lineWidth = 3;
    context.lineCap = "round";
    if (!celebrating) {
      context.beginPath();
      context.moveTo(-5, -12);
      context.lineTo(-10, -8);
      context.moveTo(5, -12);
      context.lineTo(10, -8);
      context.stroke();
    }

    roundRect(-6, -15, 12, 14, 4, kid.shirt);
    context.strokeStyle = "#374252";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(-3, -2);
    context.lineTo(-4 + Math.sin(elapsed * 8 + kid.phase) * 1.5, 5);
    context.moveTo(3, -2);
    context.lineTo(4 - Math.sin(elapsed * 8 + kid.phase) * 1.5, 5);
    context.stroke();

    context.fillStyle = kid.skin;
    context.beginPath();
    context.arc(0, -21, 6, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#49352d";
    context.beginPath();
    context.arc(0, -23, 6, Math.PI, Math.PI * 2);
    context.fill();
    context.fillRect(-6, -23, 3, 4);

    context.fillStyle = "#201d1b";
    context.beginPath();
    context.arc(2, -21, 0.8, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#513126";
    context.lineWidth = 1;
    context.beginPath();
    context.arc(1, -18.5, 2, 0.1, Math.PI - 0.1);
    context.stroke();

    if (celebrating) {
      context.strokeStyle = kid.skin;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(-5, -12);
      context.lineTo(-9, -23 - Math.sin(elapsed * 8 + kid.phase + armRaise) * 2);
      context.moveTo(5, -12);
      context.lineTo(9, -23 - Math.sin(elapsed * 8 + kid.phase + armRaise) * 2);
      context.stroke();
    }

    context.restore();
  }
}

function drawPlayer() {
  const screenX = player.x - cameraX;
  const stride = player.grounded && Math.abs(player.velocityX) > 0.1
    ? Math.sin(elapsed * 16) * 3
    : 0;
  const facing = player.facing;

  context.save();
  context.translate(screenX + player.width / 2, player.y);
  context.scale(facing, 1);
  if (invulnerabilityFrames > 0 && Math.floor(invulnerabilityFrames / 7) % 2 === 0) {
    context.globalAlpha = 0.4;
  }

  if (player.dashFrames > 0) {
    context.globalAlpha = Math.min(0.7, player.dashFrames / DASH_DURATION);
    for (let trail = 1; trail <= 3; trail += 1) {
      context.fillStyle = trail === 1 ? "#fff3ad" : "#ffffff";
      context.fillRect(-18 - trail * 10, 23 + trail * 4, 17, 4);
    }
    context.globalAlpha = 1;
  }

  context.fillStyle = "rgb(44 43 35 / 20%)";
  context.beginPath();
  context.ellipse(0, player.height + 2, 19, 5, 0, 0, Math.PI * 2);
  context.fill();

  roundRect(-15, 22, 10, 20, 5, "#347e61");
  roundRect(-12, 18, 9, 19, 4, "#65bd74");
  context.fillStyle = "#8b553b";
  context.beginPath();
  context.arc(0, 12, 10, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#352d2b";
  context.beginPath();
  context.arc(0, 9, 10, Math.PI, Math.PI * 2);
  context.lineTo(10, 11);
  context.lineTo(-10, 11);
  context.fill();
  context.fillStyle = "#ffcb05";
  context.fillRect(-12, 7, 24, 4);

  roundRect(-12, 22, 24, 20, 6, "#278b9b");
  context.fillStyle = "#f3ca54";
  context.fillRect(-8, 27, 16, 3);
  context.fillStyle = "#171717";
  context.beginPath();
  context.arc(4, 13, 1.4, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "#8b553b";
  context.lineWidth = 5;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(-9, 26);
  context.lineTo(-15, 34 + stride * 0.25);
  context.moveTo(9, 26);
  context.lineTo(15, 32 - stride * 0.25);
  context.stroke();

  context.fillStyle = "#495762";
  context.fillRect(7, 29, 13, 8);
  context.fillStyle = "#d6e8ed";
  context.fillRect(9, 30, 8, 6);
  context.fillStyle = "#278bba";
  context.fillRect(10, 31, 6, 4);
  context.fillStyle = "#495762";
  context.fillRect(18, 30, 6, 4);

  context.strokeStyle = "#31485a";
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(-6, 40);
  context.lineTo(-7 + stride, 47);
  context.moveTo(6, 40);
  context.lineTo(7 - stride, 47);
  context.stroke();

  roundRect(-14 + stride, 45, 12, 5, 2, "#49382e");
  roundRect(2 - stride, 45, 12, 5, 2, "#49382e");
  context.restore();
}

function drawScene() {
  context.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  drawBackground();
  drawGround();
  platforms.forEach(drawPlatform);
  drawVillage();
  enemies.forEach(drawEnemy);
  waterShots.forEach(drawWaterShot);
  cans.forEach(drawCan);
  drawPlayer();

  if (gameState !== "playing") {
    context.fillStyle = gameState === "won" ? "rgb(22 35 34 / 20%)" : "rgb(22 35 34 / 42%)";
    context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    context.fillStyle = "#fff";
    context.textAlign = "center";
    context.font = "800 27px Trebuchet MS, Arial, sans-serif";
    context.fillText(
      gameState === "won" ? "WATER DELIVERED!" : gameState === "lost" ? (lossCause === "health" ? "OUT OF HEARTS!" : "TIME TO HEAD HOME") : "READY FOR THE JOURNEY?",
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2 - 3,
    );
    context.font = "600 15px Trebuchet MS, Arial, sans-serif";
    context.fillText(
      gameState === "won" ? "The village welcomes you!" : gameState === "lost" ? (lossCause === "health" ? "Avoid the roaming critters next time." : "Start again and keep collecting.") : "Collect cans and reach the village",
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2 + 25,
    );
  }
}

function collectCans() {
  const playerRight = player.x + player.width;
  const playerBottom = player.y + player.height;

  for (const can of cans) {
    if (can.collected) continue;
    if (
      playerRight > can.x - 12 &&
      player.x < can.x + 12 &&
      playerBottom > can.y - 17 &&
      player.y < can.y + 14
    ) {
      can.collected = true;
      score += 1;
      water += 1;
      scoreOutput.value = String(score);
      updateWaterDisplay();
      message.textContent = `${score} ${score === 1 ? "can" : "cans"} collected. Keep going to the village!`;

      if (!milestoneReached && score >= CAN_MILESTONE) {
        milestoneReached = true;
        message.textContent = `${CAN_MILESTONE} cans collected! The village is closer!`;
        celebrate();
      }
    }
  }
}

function updateEnemies(delta) {
  for (const enemy of enemies) {
    if (enemy.stunnedFrames > 0) {
      enemy.stunnedFrames = Math.max(0, enemy.stunnedFrames - delta);
      continue;
    }

    enemy.x += enemy.direction * enemy.speed * delta;
    if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
      enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX, enemy.x));
      enemy.direction *= -1;
    }
  }
}

function updateWaterShots(delta) {
  waterShotCooldown = Math.max(0, waterShotCooldown - delta);

  for (const shot of waterShots) {
    shot.x += shot.direction * WATER_SHOT_SPEED * delta;
    shot.distance += WATER_SHOT_SPEED * delta;

    for (const enemy of enemies) {
      if (enemy.stunnedFrames > 0) continue;

      const verticalHit = shot.y >= enemy.y - 22 && shot.y <= enemy.y;
      const horizontalHit = Math.abs(shot.x - enemy.x) < 17;
      if (verticalHit && horizontalHit) {
        enemy.stunnedFrames = 150;
        enemy.direction = shot.direction;
        shot.distance = WATER_SHOT_RANGE;
        break;
      }
    }
  }

  waterShots = waterShots.filter((shot) => shot.distance < WATER_SHOT_RANGE);
}

function fireWaterGun() {
  if (gameState !== "playing" || waterShotCooldown > 0) return;
  if (water <= 0) {
    message.textContent = "Your water gun is empty. Collect a water can to refill it!";
    return;
  }

  water -= 1;
  score = water;
  scoreOutput.value = String(score);
  updateWaterDisplay();
  waterShotCooldown = WATER_SHOT_COOLDOWN;
  waterShots.push({
    x: player.x + player.width / 2 + player.facing * 22,
    y: player.y + 32,
    direction: player.facing,
    distance: 0,
  });
  message.textContent = `Splash! ${water} ${water === 1 ? "can" : "cans"} and ${water === 1 ? "shot" : "shots"} left.`;
}

function checkEnemyCollisions() {
  if (invulnerabilityFrames > 0) return;

  for (const enemy of enemies) {
    if (enemy.stunnedFrames > 0) continue;

    const overlapsHorizontally = player.x + player.width > enemy.x - 13 && player.x < enemy.x + 13;
    const overlapsVertically = player.y + player.height > enemy.y - 22 && player.y < enemy.y;
    if (!overlapsHorizontally || !overlapsVertically) continue;

    health = Math.max(0, health - 1);
    updateHealthDisplay();
    invulnerabilityFrames = ENEMY_INVULNERABILITY;
    player.velocityX = player.x + player.width / 2 < enemy.x ? -4 : 4;
    player.velocityY = -4.5;
    player.grounded = false;
    message.textContent = health > 0
      ? `Ouch! A critter got you. ${health} ${health === 1 ? "heart" : "hearts"} left!`
      : "The critters got all your hearts. Try again!";

    if (health === 0) finishGame(false, "health");
    return;
  }
}

function updatePlayer(delta) {
  if (invulnerabilityFrames > 0) invulnerabilityFrames = Math.max(0, invulnerabilityFrames - delta);
  updateEnemies(delta);
  updateWaterShots(delta);

  const left = keys.has("ArrowLeft") || keys.has("KeyA") || touchDirections.has("left");
  const right = keys.has("ArrowRight") || keys.has("KeyD") || touchDirections.has("right");
  const moveDirection = Number(right) - Number(left);
  if (player.dashFrames > 0) {
    player.velocityX = player.dashDirection * DASH_SPEED * delta;
    player.dashFrames = Math.max(0, player.dashFrames - delta);
    player.facing = player.dashDirection;
  } else if (moveDirection !== 0) {
    if (player.velocityX && Math.sign(player.velocityX) !== moveDirection) {
      player.velocityX = 0;
    } else {
      const acceleration = player.grounded ? GROUND_ACCELERATION : AIR_ACCELERATION;
      player.velocityX = Math.max(
        -MAX_RUN_SPEED,
        Math.min(MAX_RUN_SPEED, player.velocityX + moveDirection * acceleration * delta),
      );
    }
    player.facing = moveDirection;
  } else {
    const friction = player.grounded ? GROUND_FRICTION : AIR_FRICTION;
    player.velocityX *= friction ** delta;
    if (Math.abs(player.velocityX) < 0.03) player.velocityX = 0;
    if (player.velocityX) player.facing = Math.sign(player.velocityX);
  }

  const previousBottom = player.y + player.height;
  player.velocityY += GRAVITY * delta;
  player.x = Math.max(0, Math.min(LEVEL_WIDTH - player.width, player.x + player.velocityX));
  player.y += player.velocityY * delta;
  player.grounded = false;

  if (platformDropFrames > 0) {
    platformDropFrames -= delta;
  } else {
    for (const platform of platforms) {
      const overlapsPlatform = player.x + player.width > platform.x && player.x < platform.x + platform.width;
      const crossedPlatform = previousBottom <= platform.y && player.y + player.height >= platform.y;
      if (player.velocityY >= 0 && overlapsPlatform && crossedPlatform) {
        player.y = platform.y - player.height;
        player.velocityY = 0;
        player.grounded = true;
        player.jumpsRemaining = MAX_JUMPS;
      }
    }
  }

  for (const segment of groundSegments) {
    const overlapsGround = player.x + player.width > segment.x && player.x < segment.x + segment.width;
    const crossedGround = previousBottom <= GROUND_Y && player.y + player.height >= GROUND_Y;
    if (overlapsGround && crossedGround && player.velocityY >= 0) {
      player.y = GROUND_Y - player.height;
      player.velocityY = 0;
      player.grounded = true;
      player.jumpsRemaining = MAX_JUMPS;
      checkpointX = Math.max(checkpointX, segment.x + 30);
    }
  }

  if (player.y > VIEW_HEIGHT + 45) {
    player.x = checkpointX;
    player.y = GROUND_Y - player.height;
    player.velocityY = 0;
    player.grounded = true;
    player.jumpsRemaining = MAX_JUMPS;
    water = Math.max(0, water - 2);
    score = water;
    scoreOutput.value = String(score);
    updateWaterDisplay();
    message.textContent = `Whoops! You lost 2 cans. ${water} ${water === 1 ? "can" : "cans"} left—keep going!`;
  }

  checkEnemyCollisions();
  if (gameState !== "playing") return;

  collectCans();
  cameraTargetX = Math.max(0, Math.min(LEVEL_WIDTH - VIEW_WIDTH, player.x - VIEW_WIDTH * 0.35));

  if (player.x > 2530) finishGame(true);
}

function frame(timestamp) {
  if (!previousFrame) previousFrame = timestamp;
  const delta = Math.min((timestamp - previousFrame) / (1000 / 60), 2);
  previousFrame = timestamp;
  elapsed += delta / 60;

  if (gameState === "playing") {
    updatePlayer(delta);
    const cameraEase = 1 - Math.exp(-0.14 * delta);
    cameraX += (cameraTargetX - cameraX) * cameraEase;
  }
  drawScene();
  animationFrame = window.requestAnimationFrame(frame);
}

function celebrate() {
  const colors = ["#ffcb05", "#278b9b", "#fff", "#76bd7c", "#e7a444"];
  const pieces = document.createDocumentFragment();

  for (let index = 0; index < 36; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor = colors[index % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.45}s`;
    pieces.append(piece);
  }

  confetti.replaceChildren(pieces);
  window.setTimeout(() => confetti.replaceChildren(), 2300);
}

function finishGame(won, cause = "time") {
  if (gameState !== "playing") return;
  gameState = won ? "won" : "lost";
  lossCause = cause;
  window.clearInterval(timerInterval);
  keys.clear();
  touchDirections.clear();
  startButton.disabled = false;
  startButton.textContent = won ? "Play again" : "Try again";
  message.textContent = won
    ? `You delivered ${score} ${score === 1 ? "can" : "cans"} to the village!`
    : cause === "health"
      ? `You lost all your hearts. You collected ${score} cans—try again!`
      : `Time ran out. You collected ${score} cans—try again to reach the village!`;
  if (won) celebrate();
}

function startGame() {
  if (gameState === "playing") return;
  window.clearInterval(timerInterval);
  keys.clear();
  touchDirections.clear();
  resetLevel();
  score = 0;
  lossCause = "time";
  timeLeft = ROUND_LENGTH;
  milestoneReached = false;
  scoreOutput.value = "0";
  timerOutput.value = String(timeLeft);
  timerOutput.setAttribute("aria-label", `${timeLeft} seconds remaining`);
  gameState = "playing";
  startButton.disabled = true;
  startButton.textContent = "On the way…";
  message.textContent = "Collect the water cans and find a safe path to the village!";

  timerInterval = window.setInterval(() => {
    timeLeft -= 1;
    timerOutput.value = String(timeLeft);
    timerOutput.setAttribute("aria-label", `${timeLeft} seconds remaining`);
    if (timeLeft <= 0) finishGame(false);
  }, 1000);
}

function resetGame() {
  window.clearInterval(timerInterval);
  keys.clear();
  touchDirections.clear();
  resetLevel();
  score = 0;
  lossCause = "time";
  timeLeft = ROUND_LENGTH;
  milestoneReached = false;
  scoreOutput.value = "0";
  timerOutput.value = String(ROUND_LENGTH);
  timerOutput.setAttribute("aria-label", `${ROUND_LENGTH} seconds remaining`);
  gameState = "ready";
  startButton.disabled = false;
  startButton.textContent = "Start game";
  message.textContent = "Ready for the journey? Collect water and reach the village!";
  confetti.replaceChildren();
}

function jump() {
  if (gameState === "playing" && (player.grounded || player.jumpsRemaining > 0)) {
    if (player.grounded) player.jumpsRemaining = MAX_JUMPS;
    player.velocityY = -JUMP_POWER;
    player.grounded = false;
    player.jumpsRemaining -= 1;
  }
}

function tapDirection(direction) {
  const now = performance.now();
  const lastTap = lastDirectionTap.get(direction) ?? -Infinity;

  if (gameState === "playing" && now - lastTap <= DOUBLE_TAP_MS) {
    player.dashDirection = direction === "left" ? -1 : 1;
    player.dashFrames = DASH_DURATION;
    lastDirectionTap.delete(direction);
  } else {
    lastDirectionTap.set(direction, now);
  }
}

function dropThroughPlatform() {
  if (!player.grounded || gameState !== "playing") return;

  const feet = player.y + player.height;
  const standingOnPlatform = platforms.some((platform) =>
    Math.abs(feet - platform.y) < 1 &&
    player.x + player.width > platform.x &&
    player.x < platform.x + platform.width
  );

  if (standingOnPlatform) {
    player.y += 2;
    player.velocityY = 1;
    player.grounded = false;
    platformDropFrames = 24;
  }
}

function bindTouchButton(buttonId, direction) {
  const button = document.querySelector(buttonId);
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (direction === "jump") {
      jump();
    } else {
      tapDirection(direction);
      touchDirections.add(direction);
    }
    button.setPointerCapture(event.pointerId);
  });
  const release = () => touchDirections.delete(direction);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
}

document.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) event.preventDefault();
  if (!event.repeat && ["KeyF", "KeyX"].includes(event.code)) fireWaterGun();
  if (!event.repeat && ["ArrowLeft", "KeyA"].includes(event.code)) tapDirection("left");
  if (!event.repeat && ["ArrowRight", "KeyD"].includes(event.code)) tapDirection("right");
  keys.add(event.code);
  if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
    if (!event.repeat) jump();
  }
  if (event.code === "ArrowDown" || event.code === "KeyS") {
    if (!event.repeat) dropThroughPlatform();
  }
});

document.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => {
  keys.clear();
  touchDirections.clear();
});

bindTouchButton("#left-button", "left");
bindTouchButton("#right-button", "right");
bindTouchButton("#jump-button", "jump");
document.querySelector("#down-button").addEventListener("pointerdown", (event) => {
  event.preventDefault();
  dropThroughPlatform();
});
document.querySelector("#down-button").addEventListener("contextmenu", (event) => event.preventDefault());
document.querySelector("#fire-button").addEventListener("pointerdown", (event) => {
  event.preventDefault();
  fireWaterGun();
});
document.querySelector("#fire-button").addEventListener("contextmenu", (event) => event.preventDefault());
startButton.addEventListener("click", startGame);
resetButton.addEventListener("click", resetGame);
window.addEventListener("resize", resizeCanvas);

resetLevel();
resizeCanvas();
drawScene();
animationFrame = window.requestAnimationFrame(frame);
