/*
  Custom image cursor with delayed ghost trail.
  Put your cursor image at: image/my-cursor.png
*/

const CUSTOM_CURSOR_CONFIG = {
  image: "./image/my-cursor.png",

  // 鼠标图片大小
  size: 42,

  // 鼠标点击点位置
  // 如果你的鼠标尖在图片左上角，就用 0, 0
  // 如果你的鼠标尖在图片中心，就用 size / 2
  hotspotX: 6,
  hotspotY: 6,

  // 主鼠标跟随延迟，数字越小越紧跟鼠标
  followSpeed: 0.5,

  // 拖尾生成频率，数字越小拖尾越密
  trailEveryMs: 50,

  // 鼠标移动距离超过多少才生成新拖尾
  minDistance: 10,

  // 每个拖尾保留多久，单位 ms
  trailLife: 200
};

let realMouseX = window.innerWidth / 2;
let realMouseY = window.innerHeight / 2;

let cursorX = realMouseX;
let cursorY = realMouseY;

let lastTrailTime = 0;
let lastTrailX = realMouseX;
let lastTrailY = realMouseY;

let cursorMain = null;

function initCustomCursor() {
  document.documentElement.style.setProperty(
    "--cursor-image",
    `url("${CUSTOM_CURSOR_CONFIG.image}")`
  );

  document.documentElement.style.setProperty(
    "--cursor-size",
    `${CUSTOM_CURSOR_CONFIG.size}px`
  );

  cursorMain = document.createElement("div");
  cursorMain.className = "custom-cursor-main";
  document.body.appendChild(cursorMain);

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mousedown", handleMouseDown);
  window.addEventListener("mouseup", handleMouseUp);

  requestAnimationFrame(updateCursor);
}

function handleMouseMove(event) {
  realMouseX = event.clientX;
  realMouseY = event.clientY;
}

function handleMouseDown() {
  if (!cursorMain) return;
  cursorMain.style.transform += " scale(0.88)";
}

function handleMouseUp() {
  if (!cursorMain) return;
}

function updateCursor(time) {
  cursorX += (realMouseX - cursorX) * CUSTOM_CURSOR_CONFIG.followSpeed;
  cursorY += (realMouseY - cursorY) * CUSTOM_CURSOR_CONFIG.followSpeed;

  const visualX = cursorX - CUSTOM_CURSOR_CONFIG.hotspotX;
  const visualY = cursorY - CUSTOM_CURSOR_CONFIG.hotspotY;

  if (cursorMain) {
    const flickerX = Math.random() < 0.08 ? random(-3, 3) : 0;
    const flickerY = Math.random() < 0.08 ? random(-3, 3) : 0;

    cursorMain.style.transform =
      `translate(${visualX + flickerX}px, ${visualY + flickerY}px)`;
  }

  const distance = Math.hypot(realMouseX - lastTrailX, realMouseY - lastTrailY);

  if (
    time - lastTrailTime > CUSTOM_CURSOR_CONFIG.trailEveryMs &&
    distance > CUSTOM_CURSOR_CONFIG.minDistance
  ) {
    createCursorTrail(realMouseX, realMouseY);
    lastTrailTime = time;
    lastTrailX = realMouseX;
    lastTrailY = realMouseY;
  }

  requestAnimationFrame(updateCursor);
}

function createCursorTrail(x, y) {
  const trail = document.createElement("div");
  trail.className = "custom-cursor-trail";

  const delayX = random(-8, 8);
  const delayY = random(-8, 8);
  const rotate = random(-10, 10) + "deg";

  const trailX = x - CUSTOM_CURSOR_CONFIG.hotspotX + delayX;
  const trailY = y - CUSTOM_CURSOR_CONFIG.hotspotY + delayY;

  trail.style.setProperty("--x", `${trailX}px`);
  trail.style.setProperty("--y", `${trailY}px`);
  trail.style.setProperty("--r", rotate);

  trail.style.transform = `translate(${trailX}px, ${trailY}px)`;

  document.body.appendChild(trail);

  setTimeout(() => {
    trail.remove();
  }, CUSTOM_CURSOR_CONFIG.trailLife);
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCustomCursor);
} else {
  initCustomCursor();
}