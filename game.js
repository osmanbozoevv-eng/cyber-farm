const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Размеры изометрии
const baseTileW = 64; 
const baseTileH = 32;
const gridSize = 15; 

// Камера
let zoom = 1;
let panX = 0;
let panY = 0;

// Состояние игры
let state = {
  coins: 1000,
  energy: 20,
  map: {}
};
const PRICES = { tree: 50, house: 150, farm: 300 };
let selectedTool = null;

// Настройка канваса
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  panX = canvas.width / 2;
  panY = canvas.height / 3;
  draw();
}
window.addEventListener('resize', resize);

// Перевод координат (математика изометрии)
function isoToScreen(x, y) {
  return {
    x: (x - y) * (baseTileW / 2) * zoom + panX,
    y: (x + y) * (baseTileH / 2) * zoom + panY
  };
}

function screenToIso(sx, sy) {
  let x = ((sx - panX) / zoom) / (baseTileW / 2);
  let y = ((sy - panY) / zoom) / (baseTileH / 2);
  return {
    x: Math.round((x + y) / 2),
    y: Math.round((y - x) / 2)
  };
}

function changeZoom(delta) {
  zoom = Math.max(0.5, Math.min(2.5, zoom + delta));
  draw();
}

// --- ОТРИСОВКА ---
function draw() {
  // Небо
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 1. Земля (Трава)
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      const pos = isoToScreen(x, y);
      ctx.fillStyle = (x + y) % 2 === 0 ? '#7CFC00' : '#6CD400';
      ctx.strokeStyle = '#55A600';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x + (baseTileW/2)*zoom, pos.y + (baseTileH/2)*zoom);
      ctx.lineTo(pos.x, pos.y + baseTileH*zoom);
      ctx.lineTo(pos.x - (baseTileW/2)*zoom, pos.y + (baseTileH/2)*zoom);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // 2. Объекты (сортируем по глубине)
  const sorted = Object.keys(state.map).sort((a, b) => {
    const [ax, ay] = a.split(',').map(Number);
    const [bx, by] = b.split(',').map(Number);
    return (ax + ay) - (bx + by);
  });

  sorted.forEach(key => {
    const [x, y] = key.split(',').map(Number);
    const item = state.map[key];
    const pos = isoToScreen(x, y);
    const cw = baseTileW * zoom;
    const ch = baseTileH * zoom;

    if (item.type === 'tree') drawTree(pos.x, pos.y, cw, ch);
    if (item.type === 'house') drawHouse(pos.x, pos.y, cw, ch);
    if (item.type === 'farm') drawFarm(pos.x, pos.y, cw, ch);
  });
}

// --- ГРАФИКА ---
function drawTree(x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + h/2, w*0.4, h*0.2, 0, 0, Math.PI*2); ctx.fill();
  
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x - w*0.05, y - h*0.2, w*0.1, h*0.4);
  
  ctx.fillStyle = '#228B22';
  ctx.beginPath(); ctx.arc(x, y - h*0.6, w*0.4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#32CD32';
  ctx.beginPath(); ctx.arc(x - w*0.1, y - h*0.7, w*0.3, 0, Math.PI*2); ctx.fill();
}

function drawHouse(x, y, w, h) {
  const wallH = h * 1.5;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + h/2, w*0.5, h*0.25, 0, 0, Math.PI*2); ctx.fill();

  // Левая стена
  ctx.fillStyle = '#F5DEB3';
  ctx.beginPath();
  ctx.moveTo(x - w/2, y + h/2); ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + h - wallH); ctx.lineTo(x - w/2, y + h/2 - wallH);
  ctx.fill();

  // Правая стена
  ctx.fillStyle = '#DEB887';
  ctx.beginPath();
  ctx.moveTo(x + w/2, y + h/2); ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + h - wallH); ctx.lineTo(x + w/2, y + h/2 - wallH);
  ctx.fill();

  // Крыша
  ctx.fillStyle = '#B22222';
  ctx.beginPath();
  ctx.moveTo(x, y - h*0.5); 
  ctx.lineTo(x - w/2 - w*0.1, y + h/2 - wallH);
  ctx.lineTo(x, y + h - wallH);
  ctx.lineTo(x + w/2 + w*0.1, y + h/2 - wallH);
  ctx.fill();
}

function drawFarm(x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y + h/2, w*0.5, h*0.25, 0, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w/2, y + h/2);
  ctx.lineTo(x, y + h); ctx.lineTo(x - w/2, y + h/2);
  ctx.fill();

  ctx.fillStyle = '#32CD32';
  ctx.fillRect(x - w*0.2, y + h*0.2, w*0.1, h*0.2);
  ctx.fillRect(x + w*0.1, y + h*0.3, w*0.1, h*0.2);
  ctx.fillRect(x - w*0.05, y + h*0.5, w*0.1, h*0.2);
}

// --- УПРАВЛЕНИЕ ---
let startX, startY, startPanX, startPanY, isDragging = false;

canvas.addEventListener('pointerdown', (e) => {
  startX = e.clientX;
  startY = e.clientY;
  startPanX = panX;
  startPanY = panY;
  isDragging = false;
});

canvas.addEventListener('pointermove', (e) => {
  if (startX === undefined) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
    isDragging = true;
    panX = startPanX + dx;
    panY = startPanY + dy;
    draw();
  }
});

canvas.addEventListener('pointerup', (e) => {
  if (startX === undefined) return;
  
  if (!isDragging && selectedTool) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const gridPos = screenToIso(clickX, clickY);

    if (gridPos.x >= 0 && gridPos.x < gridSize && gridPos.y >= 0 && gridPos.y < gridSize) {
      const key = `${gridPos.x},${gridPos.y}`;
      
      if (state.map[key]) {
        showToast('❌ Здесь уже занято!');
        return;
      }
      if (state.coins < PRICES[selectedTool]) {
        showToast('❌ Мало монет!');
        return;
      }

      state.coins -= PRICES[selectedTool];
      state.map[key] = { type: selectedTool };
      updateUI();
      draw();
      
      selectedTool = null;
      document.querySelectorAll('.shop-btn').forEach(btn => btn.classList.remove('active'));
    } else {
      showToast('❌ Слишком далеко!');
    }
  }
  
  startX = undefined;
  isDragging = false;
});

// --- UI ---
function selectBuild(type) {
  selectedTool = type;
  document.querySelectorAll('.shop-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-${type}`).classList.add('active');
  showToast('Нажми на траву, чтобы построить!');
}

function updateUI() {
  document.getElementById('ui-coins').textContent = state.coins;
  document.getElementById('ui-energy').textContent = state.energy;
}

let toastTimeout;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { t.style.opacity = '0'; }, 2000);
}

// --- СТАРТ ---
resize();
updateUI();

// Стартовые деревья
state.map['5,5'] = { type: 'tree' };
state.map['6,5'] = { type: 'tree' };
state.map['5,6'] = { type: 'tree' };
draw();