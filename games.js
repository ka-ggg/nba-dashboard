(function() {
'use strict';

// ===== 82-0 完美阵容大挑战 =====
(function() {
function initGameButton() {
  if (document.getElementById('game82Btn')) return;
  var topbar = document.querySelector('.topbar');
  if (!topbar) return;

  var btn = document.createElement('button');
  btn.id = 'game82Btn';
  btn.className = 'menu-btn g82-topbar-btn';
  btn.setAttribute('aria-label', '82-0游戏');
  btn.title = '82-0完美阵容大挑战';
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>';
  btn.onclick = function(e) {
    e.stopPropagation();
    openGame();
  };
  topbar.appendChild(btn);

  if (document.getElementById('game82Overlay')) return;
  var overlay = document.createElement('div');
  overlay.id = 'game82Overlay';
  overlay.className = 'g82-embed-overlay';
  overlay.style.display = 'none';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML =
    '<div class="g82-embed-modal">' +
      '<div class="g82-embed-header">' +
        '<h2>🏀 82-0完美阵容大挑战</h2>' +
        '<button class="g82-embed-close" id="game82CloseBtn" aria-label="关闭">&times;</button>' +
      '</div>' +
      '<div class="g82-embed-body">' +
        '<iframe id="game82Frame" src="about:blank" title="82-0完美阵容大挑战" allow="fullscreen"></iframe>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  document.getElementById('game82CloseBtn').onclick = closeGame;
  overlay.onclick = function(e) { if (e.target === overlay) closeGame(); };
}

function closeGame() {
  var overlay = document.getElementById('game82Overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function openGame() {
  var overlay = document.getElementById('game82Overlay');
  var frame = document.getElementById('game82Frame');
  if (!overlay || !frame) return;
  if (frame.src.indexOf('game-82.html') === -1) {
    frame.src = 'game-82.html?v=3';
  }
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var overlay = document.getElementById('game82Overlay');
    if (overlay && overlay.style.display !== 'none') closeGame();
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGameButton);
} else {
  initGameButton();
}
})();

// ===== 完美球员 =====
(function() {
function initGameButton() {
  if (document.getElementById('gameBpBtn')) return;
  var topbar = document.querySelector('.topbar');
  if (!topbar) return;

  var btn = document.createElement('button');
  btn.id = 'gameBpBtn';
  btn.className = 'menu-btn g82-topbar-btn';
  btn.setAttribute('aria-label', '完美球员');
  btn.title = '我创造的完美球员';
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/></svg>';
  btn.onclick = function(e) {
    e.stopPropagation();
    openGame();
  };
  topbar.appendChild(btn);

  if (document.getElementById('gameBpOverlay')) return;
  var overlay = document.createElement('div');
  overlay.id = 'gameBpOverlay';
  overlay.className = 'g82-embed-overlay';
  overlay.style.display = 'none';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML =
    '<div class="g82-embed-modal">' +
      '<div class="g82-embed-header">' +
        '<h2>🏀 我创造的完美球员</h2>' +
        '<button class="g82-embed-close" id="gameBpCloseBtn" aria-label="关闭">&times;</button>' +
      '</div>' +
      '<div class="g82-embed-body">' +
        '<iframe id="gameBpFrame" src="about:blank" title="我创造的完美球员" allow="fullscreen"></iframe>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  document.getElementById('gameBpCloseBtn').onclick = closeGame;
  var overlayEl = document.getElementById('gameBpOverlay');
  if (overlayEl) overlayEl.onclick = function(e) { if (e.target === overlayEl) closeGame(); };
}

function closeGame() {
  var overlay = document.getElementById('gameBpOverlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function openGame() {
  var overlay = document.getElementById('gameBpOverlay');
  var frame = document.getElementById('gameBpFrame');
  if (!overlay || !frame) return;
  if (frame.src.indexOf('build-player.html') === -1) {
    frame.src = 'build-player.html?v=2';
  }
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var overlay = document.getElementById('gameBpOverlay');
    if (overlay && overlay.style.display !== 'none') closeGame();
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGameButton);
} else {
  initGameButton();
}
})();

// ===== NBA王朝缔造者 (复制自腾讯体育 nbadynasty) =====
(function() {
function initGameButton() {
  if (document.getElementById('gameDynastyBtn')) return;
  var topbar = document.querySelector('.topbar');
  if (!topbar) return;

  var btn = document.createElement('button');
  btn.id = 'gameDynastyBtn';
  btn.className = 'menu-btn g82-topbar-btn';
  btn.setAttribute('aria-label', 'NBA王朝缔造者');
  btn.title = 'NBA王朝缔造者 · 82-0完美赛季大挑战';
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 7l5-4 5 4 5-4 5 4"/><path d="M4 7v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7"/><path d="M9 21V11h6v10"/></svg>';
  btn.onclick = function(e) {
    e.stopPropagation();
    openGame();
  };
  topbar.appendChild(btn);

  if (document.getElementById('gameDynastyOverlay')) return;
  var overlay = document.createElement('div');
  overlay.id = 'gameDynastyOverlay';
  overlay.className = 'g82-embed-overlay';
  overlay.style.display = 'none';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML =
    '<div class="g82-embed-modal">' +
      '<div class="g82-embed-header">' +
        '<h2>🏀 NBA王朝缔造者</h2>' +
        '<button class="g82-embed-close" id="gameDynastyCloseBtn" aria-label="关闭">&times;</button>' +
      '</div>' +
      '<div class="g82-embed-body">' +
        '<iframe id="gameDynastyFrame" src="about:blank" title="NBA王朝缔造者" allow="fullscreen"></iframe>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  document.getElementById('gameDynastyCloseBtn').onclick = closeGame;
  var overlayEl = document.getElementById('gameDynastyOverlay');
  if (overlayEl) overlayEl.onclick = function(e) { if (e.target === overlayEl) closeGame(); };
}

function closeGame() {
  var overlay = document.getElementById('gameDynastyOverlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function openGame() {
  var overlay = document.getElementById('gameDynastyOverlay');
  var frame = document.getElementById('gameDynastyFrame');
  if (!overlay || !frame) return;
  if (frame.src.indexOf('nbadynasty.html') === -1) {
    frame.src = 'nbadynasty.html?v=3';
  }
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var overlay = document.getElementById('gameDynastyOverlay');
    if (overlay && overlay.style.display !== 'none') closeGame();
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGameButton);
} else {
  initGameButton();
}
})();

})();
