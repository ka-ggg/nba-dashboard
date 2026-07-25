(function() {
'use strict';

// ===== Init: Add game button to topbar =====
// 跳转到虎扑原版82-0游戏页面
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
      window.open('game-82.html', '_blank');
    };
    topbar.appendChild(btn);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGameButton);
} else {
  initGameButton();
}

})();
