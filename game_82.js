(function() {
'use strict';

// ===== 内嵌82-0游戏：用iframe在当前页面弹窗中加载游戏 =====

function initGameButton() {
  if (!document.getElementById('game82Btn')) {
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
  }

  if (!document.getElementById('game82Overlay')) {
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
          '<button class="g82-embed-close" onclick="document.getElementById(\'game82Overlay\').style.display=\'none\'" aria-label="关闭">&times;</button>' +
        '</div>' +
        '<div class="g82-embed-body">' +
          '<iframe id="game82Frame" src="about:blank" title="82-0完美阵容大挑战" allow="fullscreen"></iframe>' +
        '</div>' +
      '</div>';
    overlay.onclick = function(e) { if (e.target === overlay) { overlay.style.display = 'none'; } };
    document.body.appendChild(overlay);
  }
}

function openGame() {
  var overlay = document.getElementById('game82Overlay');
  var frame = document.getElementById('game82Frame');
  if (!overlay || !frame) return;
  if (frame.src.indexOf('game-82.html') === -1) {
    frame.src = 'game-82.html?v=1';
  }
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// 关闭时恢复滚动
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var overlay = document.getElementById('game82Overlay');
    if (overlay && overlay.style.display !== 'none') {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGameButton);
} else {
  initGameButton();
}

})();
