(function() {
'use strict';

var P = window.NBA_PLAYERS || [];
var T = window.NBA_TEAMS || [];
var PID = window.NBA_PLAYER_IDS || {};

// ===== Game State =====
var gameState = {
  mode: 'normal',        // 'normal' | 'reverse' | 'dream'
  dreamStar: null,        // 圆梦模式选中的球星
  picksLeft: 5,           // 剩余选人次数
  roster: [],             // 当前阵容 [{name, team, score, ...}]
  currentTeamPool: [],    // 当前随机出的球队球员池
  currentTeamName: '',
  currentEra: '',
  results: null,          // 模拟战绩 {wins, losses, score, grade}
  history: []             // 历史记录
};

// ===== Player Rating System =====
// 评分基于常规赛场均数据，百分制
function calcPlayerScore(p) {
  if (!p) return 50;
  var pts = p.pts || 0;
  var reb = p.reb || 0;
  var ast = p.ast || 0;
  var stl = p.stl || 0;
  var blk = p.blk || 0;
  var ts = p.ts_pct || 0;
  var vorp = p.vorp || 0;
  var games = p.games || 0;

  // 基础得分：场均数据加权
  var base = pts * 1.2 + reb * 0.8 + ast * 0.9 + stl * 1.5 + blk * 1.2;
  
  // 效率加成
  var efficiency = ts * 20;
  
  // VORP加成（价值替代球员）
  var vorpBonus = vorp * 3;
  
  // 出场次数惩罚（打得太少扣分）
  var gamesFactor = Math.min(1, games / 60);
  
  // 荣誉加成
  var honorBonus = 0;
  if (p.mvp) honorBonus += 5;
  if (p.dpoy) honorBonus += 3;
  if (p.finals_mvp) honorBonus += 4;
  if (p.all_nba_1st) honorBonus += 3;
  if (p.all_nba_2nd) honorBonus += 2;
  if (p.all_nba_3rd) honorBonus += 1;

  var raw = (base + efficiency + vorpBonus + honorBonus) * gamesFactor;
  
  // 映射到 30-99.9 区间
  var score = 30 + raw * 0.8;
  score = Math.min(99.9, Math.max(30, score));
  return Math.round(score * 10) / 10;
}

function getGrade(score) {
  if (score >= 95) return { label: 'S+', color: '#f56c6c' };
  if (score >= 90) return { label: 'S', color: '#e6a23c' };
  if (score >= 85) return { label: 'A+', color: '#e6a23c' };
  if (score >= 80) return { label: 'A', color: '#409EFF' };
  if (score >= 70) return { label: 'B', color: '#67C23A' };
  if (score >= 60) return { label: 'C', color: '#8899aa' };
  if (score >= 50) return { label: 'D', color: '#8899aa' };
  return { label: 'F', color: '#8899aa' };
}

// ===== Random Team Generation =====
// 按球队分组球员，模拟"随机年代的随机球队"
var teamPlayerCache = null;
function buildTeamCache() {
  if (teamPlayerCache) return teamPlayerCache;
  teamPlayerCache = {};
  T.forEach(function(t) {
    teamPlayerCache[t.name] = t.players.slice();
  });
  return teamPlayerCache;
}

function getRandomTeamPool() {
  var cache = buildTeamCache();
  var teamNames = Object.keys(cache);
  var teamName = teamNames[Math.floor(Math.random() * teamNames.length)];
  var allPlayers = cache[teamName];
  
  // 从该球队中随机抽取 4-6 名球员供选择
  var poolSize = 4 + Math.floor(Math.random() * 3); // 4-6
  var shuffled = allPlayers.slice().sort(function() { return Math.random() - 0.5; });
  var pool = shuffled.slice(0, Math.min(poolSize, shuffled.length));
  
  // 为每个球员计算评分
  pool = pool.map(function(p) {
    var fullPlayer = P.find(function(fp) { return fp.player === p.player; }) || p;
    return {
      player: fullPlayer.player,
      team: fullPlayer.team,
      pts: fullPlayer.pts || 0,
      reb: fullPlayer.reb || 0,
      ast: fullPlayer.ast || 0,
      stl: fullPlayer.stl || 0,
      blk: fullPlayer.blk || 0,
      ts_pct: fullPlayer.ts_pct || 0,
      vorp: fullPlayer.vorp || 0,
      games: fullPlayer.games || 0,
      mvp: fullPlayer.mvp || 0,
      dpoy: fullPlayer.dpoy || 0,
      finals_mvp: fullPlayer.finals_mvp || 0,
      all_nba_1st: fullPlayer.all_nba_1st || 0,
      all_nba_2nd: fullPlayer.all_nba_2nd || 0,
      all_nba_3rd: fullPlayer.all_nba_3rd || 0,
      jersey: fullPlayer.jersey || '0',
      score: calcPlayerScore(fullPlayer)
    };
  });
  
  // 按评分排序
  pool.sort(function(a, b) { return b.score - a.score; });
  
  return { teamName: teamName, pool: pool };
}

// ===== Season Simulation =====
function simulateSeason(roster) {
  if (roster.length === 0) return { wins: 0, losses: 82, score: 0, grade: getGrade(0) };
  
  // 阵容总评分
  var totalScore = roster.reduce(function(sum, p) { return sum + p.score; }, 0);
  var avgScore = totalScore / roster.length;
  
  // 位置多样性加成（不同球队的球员搭配更好）
  var teams = {};
  roster.forEach(function(p) {
    teams[p.team] = (teams[p.team] || 0) + 1;
  });
  var diversity = Object.keys(teams).length;
  var diversityBonus = diversity >= 4 ? 5 : (diversity >= 3 ? 3 : 0);
  
  // 阵容深度加成（5人满阵优于少人）
  var depthBonus = roster.length >= 5 ? 5 : (roster.length >= 4 ? 2 : 0);
  
  // 计算预期胜率
  // avgScore 95+ -> 大概率82-0
  // avgScore 80 -> 大约55-65胜
  // avgScore 60 -> 大约25-35胜
  // avgScore 40 -> 大约5-15胜
  var adjustedScore = avgScore + diversityBonus + depthBonus;
  
  // 胜率曲线：S型映射
  var winRate;
  if (adjustedScore >= 95) {
    winRate = 0.92 + Math.random() * 0.08; // 92%-100%
  } else if (adjustedScore >= 85) {
    winRate = 0.75 + Math.random() * 0.15; // 75%-90%
  } else if (adjustedScore >= 75) {
    winRate = 0.55 + Math.random() * 0.15; // 55%-70%
  } else if (adjustedScore >= 65) {
    winRate = 0.35 + Math.random() * 0.15; // 35%-50%
  } else if (adjustedScore >= 55) {
    winRate = 0.20 + Math.random() * 0.12; // 20%-32%
  } else if (adjustedScore >= 45) {
    winRate = 0.08 + Math.random() * 0.10; // 8%-18%
  } else {
    winRate = 0.01 + Math.random() * 0.07; // 1%-8%
  }
  
  winRate = Math.min(1, Math.max(0, winRate));
  
  var wins = Math.round(winRate * 82);
  var losses = 82 - wins;
  
  return {
    wins: wins,
    losses: losses,
    avgScore: Math.round(adjustedScore * 10) / 10,
    grade: getGrade(adjustedScore),
    diversity: diversity
  };
}

// ===== Rendering =====
window.NBA_GAME = window.NBA_GAME || {};

NBA_GAME.open = function(mode) {
  gameState.mode = mode || 'normal';
  gameState.dreamStar = null;
  gameState.picksLeft = 5;
  gameState.roster = [];
  gameState.currentTeamPool = [];
  gameState.currentTeamName = '';
  gameState.results = null;
  
  var overlay = document.getElementById('game82Overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  if (gameState.mode === 'dream') {
    renderDreamSelect();
  } else {
    renderGameMain();
  }
};

NBA_GAME.close = function() {
  var overlay = document.getElementById('game82Overlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
};

// 圆梦模式：选择无冠球星
function renderDreamSelect() {
  var body = document.getElementById('game82Body');
  if (!body) return;
  
  // 筛选无冠巨星（有荣誉但无finals_mvp）
  var dreamStars = P.filter(function(p) {
    return (p.all_nba >= 1 || p.mvp >= 1) && !p.finals_mvp && p.pts >= 15;
  }).slice(0, 20);
  
  dreamStars.sort(function(a, b) { return (b.pts + b.ast + b.reb) - (a.pts + a.ast + a.reb); });
  
  var html = '<div class="g82-dream-header">' +
    '<h2>圆梦模式</h2>' +
    '<p>选择一位遗憾无冠的NBA巨星，带他夺冠圆梦</p>' +
  '</div><div class="g82-dream-grid">';
  
  dreamStars.forEach(function(p) {
    var pid = PID[p.player];
    var photoHtml = pid
      ? '<img src="headshots/' + pid + '.png?v4" alt="' + p.player + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span class="g82-dream-fallback">#' + (p.jersey || '?') + '</span>'
      : '<span class="g82-dream-fallback">#' + (p.jersey || '?') + '</span>';
    html += '<div class="g82-dream-card" onclick="NBA_GAME.selectDreamStar(\'' + p.player.replace(/'/g, "\\'") + '\')">' +
      '<div class="g82-dream-avatar">' + photoHtml + '</div>' +
      '<div class="g82-dream-name">' + p.player + '</div>' +
      '<div class="g82-dream-team">' + p.team + '</div>' +
      '<div class="g82-dream-stats">' + (p.pts||0).toFixed(1) + '分 ' + (p.reb||0).toFixed(1) + '板 ' + (p.ast||0).toFixed(1) + '助</div>' +
    '</div>';
  });
  
  html += '</div>';
  body.innerHTML = html;
  body.scrollTop = 0;
}

NBA_GAME.selectDreamStar = function(name) {
  gameState.dreamStar = name;
  gameState.roster = []; // 圆梦球星先不入阵容，选满后再加入
  renderGameMain();
};

function renderGameMain() {
  var body = document.getElementById('game82Body');
  if (!body) return;
  
  var modeLabel = gameState.mode === 'reverse' ? '反向0-82' : (gameState.mode === 'dream' ? '圆梦模式' : '82-0挑战');
  var modeIcon = gameState.mode === 'reverse' ? '🔻' : (gameState.mode === 'dream' ? '🏆' : '🏀');
  var goalText = gameState.mode === 'reverse' ? '目标：0胜82负' : '目标：82胜0负';
  
  if (gameState.dreamStar) {
    goalText = '为 ' + gameState.dreamStar + ' 圆梦夺冠！';
  }
  
  var html = '<div class="g82-game-header">' +
    '<div class="g82-game-mode">' + modeIcon + ' ' + modeLabel + '</div>' +
    '<div class="g82-game-goal">' + goalText + '</div>' +
    '<div class="g82-game-picks">剩余选人次数：<strong>' + gameState.picksLeft + '</strong></div>' +
  '</div>';
  
  // 当前阵容
  html += '<div class="g82-roster-section">' +
    '<h3>我的阵容 <span class="g82-roster-count">(' + gameState.roster.length + '/5)</span></h3>';
  
  if (gameState.roster.length === 0) {
    html += '<div class="g82-roster-empty">点击下方"随机选人"开始组建阵容</div>';
  } else {
    html += '<div class="g82-roster-grid">';
    gameState.roster.forEach(function(p, idx) {
      var grade = getGrade(p.score);
      var pid = PID[p.player];
      var photoHtml = pid
        ? '<img src="headshots/' + pid + '.png?v4" alt="' + p.player + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span class="g82-roster-fallback">#' + (p.jersey || '?') + '</span>'
        : '<span class="g82-roster-fallback">#' + (p.jersey || '?') + '</span>';
      html += '<div class="g82-roster-card">' +
        '<div class="g82-roster-avatar">' + photoHtml + '</div>' +
        '<div class="g82-roster-info">' +
          '<div class="g82-roster-name">' + p.player + '</div>' +
          '<div class="g82-roster-team">' + p.team + '</div>' +
          '<div class="g82-roster-score" style="color:' + grade.color + '">' + p.score.toFixed(1) + ' <span class="g82-grade">' + grade.label + '</span></div>' +
        '</div>' +
        '<button class="g82-remove-btn" onclick="NBA_GAME.removePlayer(' + idx + ')">&times;</button>' +
      '</div>';
    });
    html += '</div>';
  }
  html += '</div>';
  
  // 选人区域
  if (gameState.picksLeft > 0) {
    if (gameState.currentTeamPool.length > 0) {
      // 显示当前球员池
      html += '<div class="g82-pool-section">' +
        '<div class="g82-pool-header">' +
          '<h3>来自「' + gameState.currentTeamName + '」的球员</h3>' +
          '<span class="g82-pool-hint">选择一名球员加入阵容</span>' +
        '</div>' +
        '<div class="g82-pool-grid">';
      
      gameState.currentTeamPool.forEach(function(p) {
        var grade = getGrade(p.score);
        var pid = PID[p.player];
        var photoHtml = pid
          ? '<img src="headshots/' + pid + '.png?v4" alt="' + p.player + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span class="g82-pool-fallback">#' + (p.jersey || '?') + '</span>'
          : '<span class="g82-pool-fallback">#' + (p.jersey || '?') + '</span>';
        html += '<div class="g82-pool-card" onclick="NBA_GAME.pickPlayer(\'' + p.player.replace(/'/g, "\\'") + '\')">' +
          '<div class="g82-pool-avatar">' + photoHtml + '</div>' +
          '<div class="g82-pool-name">' + p.player + '</div>' +
          '<div class="g82-pool-stats">' + p.pts.toFixed(1) + '分 ' + p.reb.toFixed(1) + '板 ' + p.ast.toFixed(1) + '助</div>' +
          '<div class="g82-pool-score" style="color:' + grade.color + '">' + p.score.toFixed(1) + ' <span class="g82-grade">' + grade.label + '</span></div>' +
        '</div>';
      });
      
      html += '</div></div>';
    } else {
      html += '<div class="g82-pick-btn-section">' +
        '<button class="g82-pick-btn" onclick="NBA_GAME.randomPick()">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M8 21H3v-5"/><path d="M3 21l7-7"/><circle cx="12" cy="12" r="3"/></svg>' +
          ' 随机选人' +
        '</button>' +
      '</div>';
    }
  }
  
  // 模拟按钮
  if (gameState.roster.length >= 1 && gameState.picksLeft === 0) {
    html += '<div class="g82-simulate-section">' +
      '<button class="g82-simulate-btn" onclick="NBA_GAME.simulate()">' +
        '⚡ 模拟82场赛季' +
      '</button>' +
    '</div>';
  }
  
  // 重新开始按钮
  if (gameState.picksLeft < 5) {
    html += '<div class="g82-restart-section">' +
      '<button class="g82-restart-btn" onclick="NBA_GAME.restart()">重新开始</button>' +
    '</div>';
  }
  
  body.innerHTML = html;
  body.scrollTop = 0;
}

NBA_GAME.randomPick = function() {
  var result = getRandomTeamPool();
  gameState.currentTeamName = result.teamName;
  gameState.currentTeamPool = result.pool;
  renderGameMain();
};

NBA_GAME.pickPlayer = function(name) {
  if (gameState.picksLeft <= 0) return;
  
  var player = gameState.currentTeamPool.find(function(p) { return p.player === name; });
  if (!player) return;
  
  // 检查是否已在阵容中
  if (gameState.roster.some(function(p) { return p.player === name; })) return;
  
  gameState.roster.push(player);
  gameState.picksLeft--;
  gameState.currentTeamPool = [];
  gameState.currentTeamName = '';
  
  // 圆梦模式：最后一次选人时加入圆梦球星
  if (gameState.dreamStar && gameState.picksLeft === 0 && gameState.roster.length === 5) {
    var starData = P.find(function(p) { return p.player === gameState.dreamStar; });
    if (starData) {
      gameState.roster.unshift({
        player: starData.player,
        team: starData.team,
        pts: starData.pts || 0,
        reb: starData.reb || 0,
        ast: starData.ast || 0,
        stl: starData.stl || 0,
        blk: starData.blk || 0,
        ts_pct: starData.ts_pct || 0,
        vorp: starData.vorp || 0,
        games: starData.games || 0,
        mvp: starData.mvp || 0,
        dpoy: starData.dpoy || 0,
        finals_mvp: starData.finals_mvp || 0,
        all_nba_1st: starData.all_nba_1st || 0,
        all_nba_2nd: starData.all_nba_2nd || 0,
        all_nba_3rd: starData.all_nba_3rd || 0,
        jersey: starData.jersey || '0',
        score: calcPlayerScore(starData)
      });
    }
  }
  
  renderGameMain();
};

NBA_GAME.removePlayer = function(idx) {
  if (gameState.results) return; // 模拟后不能改
  gameState.roster.splice(idx, 1);
  gameState.picksLeft++;
  renderGameMain();
};

NBA_GAME.simulate = function() {
  gameState.results = simulateSeason(gameState.roster);
  renderResults();
};

NBA_GAME.restart = function() {
  gameState.picksLeft = 5;
  gameState.roster = [];
  gameState.currentTeamPool = [];
  gameState.currentTeamName = '';
  gameState.results = null;
  if (gameState.mode === 'dream') {
    gameState.dreamStar = null;
    renderDreamSelect();
  } else {
    renderGameMain();
  }
};

function renderResults() {
  var body = document.getElementById('game82Body');
  if (!body) return;
  
  var r = gameState.results;
  var isPerfect = (gameState.mode === 'reverse') ? (r.wins === 0) : (r.wins === 82);
  var isGood = (gameState.mode === 'reverse') ? (r.wins <= 10) : (r.wins >= 60);
  
  var html = '<div class="g82-result-header' + (isPerfect ? ' g82-result-perfect' : (isGood ? ' g82-result-good' : '')) + '">' +
    '<div class="g82-result-record">' +
      '<span class="g82-result-wins" style="color:' + (isPerfect || isGood ? '#67C23A' : 'var(--ink)') + '">' + r.wins + '</span>' +
      '<span class="g82-result-sep">-</span>' +
      '<span class="g82-result-losses">' + r.losses + '</span>' +
    '</div>';
  
  if (isPerfect) {
    html += '<div class="g82-result-badge g82-badge-perfect">' + (gameState.mode === 'reverse' ? '完美0-82！' : '完美82-0！') + '</div>';
  } else if (isGood) {
    html += '<div class="g82-result-badge g82-badge-good">出色战绩！</div>';
  }
  
  html += '<div class="g82-result-grade" style="color:' + r.grade.color + '">阵容评分 ' + r.avgScore + ' [' + r.grade.label + ']</div>';
  
  // 圆梦模式判定
  if (gameState.dreamStar && r.wins >= 60) {
    html += '<div class="g82-dream-success">🏆 ' + gameState.dreamStar + ' 圆梦夺冠！</div>';
  } else if (gameState.dreamStar) {
    html += '<div class="g82-dream-fail">' + gameState.dreamStar + ' 还需努力...</div>';
  }
  
  html += '</div>';
  
  // 阵容展示
  html += '<div class="g82-result-roster">' +
    '<h3>最终阵容</h3>' +
    '<div class="g82-result-roster-grid">';
  
  gameState.roster.forEach(function(p) {
    var grade = getGrade(p.score);
    var pid = PID[p.player];
    var photoHtml = pid
      ? '<img src="headshots/' + pid + '.png?v4" alt="' + p.player + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span class="g82-result-fallback">#' + (p.jersey || '?') + '</span>'
      : '<span class="g82-result-fallback">#' + (p.jersey || '?') + '</span>';
    html += '<div class="g82-result-roster-card">' +
      '<div class="g82-result-avatar">' + photoHtml + '</div>' +
      '<div class="g82-result-name">' + p.player + '</div>' +
      '<div class="g82-result-score" style="color:' + grade.color + '">' + p.score.toFixed(1) + ' ' + grade.label + '</div>' +
    '</div>';
  });
  
  html += '</div></div>';
  
  // 操作按钮
  html += '<div class="g82-result-actions">' +
    '<button class="g82-btn-primary" onclick="NBA_GAME.restart()">再来一局</button>' +
    '<button class="g82-btn-secondary" onclick="NBA_GAME.close()">返回</button>' +
  '</div>';
  
  body.innerHTML = html;
  body.scrollTop = 0;
}

// ===== Init: Add game button to topbar =====
function initGameButton() {
  if (!document.getElementById('game82Btn')) {
    var topbar = document.querySelector('.topbar');
    if (!topbar) return;
    
    var btn = document.createElement('button');
    btn.id = 'game82Btn';
    btn.className = 'menu-btn g82-topbar-btn';
    btn.setAttribute('aria-label', '82-0游戏');
    btn.title = '82-0阵容挑战';
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>';
    btn.onclick = function(e) { e.stopPropagation(); NBA_GAME.toggleMenu(); };
    topbar.appendChild(btn);
  }
  
  // Dropdown menu
  if (!document.getElementById('game82Menu')) {
    var menu = document.createElement('div');
    menu.id = 'game82Menu';
    menu.className = 'g82-menu';
    menu.innerHTML =
      '<div class="g82-menu-item" onclick="NBA_GAME.open(\'normal\')">' +
        '<span class="g82-menu-icon">🏀</span>' +
        '<div><div class="g82-menu-title">82-0挑战</div><div class="g82-menu-desc">组建82胜0负完美阵容</div></div>' +
      '</div>' +
      '<div class="g82-menu-item" onclick="NBA_GAME.open(\'reverse\')">' +
        '<span class="g82-menu-icon">🔻</span>' +
        '<div><div class="g82-menu-title">反向0-82</div><div class="g82-menu-desc">组建最弱阵容挑战0胜</div></div>' +
      '</div>' +
      '<div class="g82-menu-item" onclick="NBA_GAME.open(\'dream\')">' +
        '<span class="g82-menu-icon">🏆</span>' +
        '<div><div class="g82-menu-title">圆梦模式</div><div class="g82-menu-desc">为无冠巨星圆梦夺冠</div></div>' +
      '</div>';
    document.body.appendChild(menu);
    
    // Close on outside click
    document.addEventListener('click', function(e) {
      var menuEl = document.getElementById('game82Menu');
      var btnEl = document.getElementById('game82Btn');
      if (menuEl && menuEl.classList.contains('open') && !menuEl.contains(e.target) && e.target !== btnEl && !btnEl.contains(e.target)) {
        menuEl.classList.remove('open');
      }
    });
  }
  
  // Game overlay
  if (!document.getElementById('game82Overlay')) {
    var overlay = document.createElement('div');
    overlay.id = 'game82Overlay';
    overlay.className = 'g82-overlay';
    overlay.style.display = 'none';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML =
      '<div class="g82-modal">' +
        '<div class="g82-modal-header">' +
          '<h2>🏀 82-0阵容挑战</h2>' +
          '<button class="g82-close" onclick="NBA_GAME.close()" aria-label="关闭">&times;</button>' +
        '</div>' +
        '<div class="g82-modal-body" id="game82Body"></div>' +
      '</div>';
    overlay.onclick = function(e) { if (e.target === overlay) NBA_GAME.close(); };
    document.body.appendChild(overlay);
  }
}

NBA_GAME.toggleMenu = function() {
  var menu = document.getElementById('game82Menu');
  if (!menu) return;
  menu.classList.toggle('open');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGameButton);
} else {
  initGameButton();
}

})();
