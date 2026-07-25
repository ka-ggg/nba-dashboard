(function() {
'use strict';

// ===== 内嵌完美球员游戏：用iframe在当前页面弹窗中加载游戏 =====

function initGameButton() {
  if (!document.getElementById('gameBpBtn')) {
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
  }

  if (!document.getElementById('gameBpOverlay')) {
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
  }

  // 绑定关闭事件（恢复页面滚动）
  var closeBtn = document.getElementById('gameBpCloseBtn');
  if (closeBtn) closeBtn.onclick = closeGame;
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
    frame.src = 'build-player.html?v=1';
  }
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// ESC键关闭
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var overlay = document.getElementById('gameBpOverlay');
    if (overlay && overlay.style.display !== 'none') {
      closeGame();
    }
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGameButton);
} else {
  initGameButton();
}

})();
