(function() {
'use strict';

var P = window.NBA_PLAYERS || [];
var T = window.NBA_TEAMS || [];
var S = window.NBA_SALARIES || {};
var PID = window.NBA_PLAYER_IDS || {};

// 2025-26 NBA Salary Cap Data (in millions USD)
var CAP = {
  salaryCap: 154.647,
  luxuryTax: 187.895,
  firstApron: 195.945,
  secondApron: 207.824,
  teamMin: 139.182,
  fullMLE: 14.104,
  taxpayerMLE: 5.685,
  roomMLE: 8.781,
  biAnnual: 5.134,
};

var TRADE_CLAUSE_INFO = {
  ntc: { label: '不可交易条款', icon: '🔒', color: '#f56c6c', desc: '该球员拥有不可交易条款(NTC)，无法被交易离队' },
  trade_kicker: { label: '交易保证金', icon: '💰', color: '#e6a23c', desc: '该球员拥有交易保证金，交易时需额外支付15%薪资' },
  recently_acquired: { label: '刚加盟限制', icon: '⏳', color: '#409EFF', desc: '该球员刚加盟球队，暂时无法被交易' },
  none: { label: '', icon: '', color: '', desc: '' }
};

var STORAGE_KEY = 'nba_my_team_v2';
var myTeam = null;
var tradeState = null; // { myPlayer: name, step: 1|2|3, opponentTeam: name, opponentPlayer: name }

function logoUrl(tid) {
  return 'https://cdn.nba.com/logos/nba/' + tid + '/primary/L/logo.svg';
}
function logoSvg(text, size) {
  size = size || 24;
  return 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
    '<circle cx="' + (size/2) + '" cy="' + (size/2) + '" r="' + (size/2-2) + '" fill="#252d3f" stroke="#3b82f6" stroke-width="2"/>' +
    '<text x="' + (size/2) + '" y="' + (size/2+5) + '" text-anchor="middle" fill="#6b7a90" font-size="' + (size*0.55) + '" font-weight="700" font-family="sans-serif">' + text + '</text>' +
    '</svg>'
  );
}

function getSalary(name) {
  var s = S[name];
  return s ? s.salary : 2.0;
}
function getClause(name) {
  var s = S[name];
  return s ? s.trade_clause : 'none';
}
function getPlayerInfo(name) {
  return P.find(function(p) { return p.player === name; });
}

// Migrate old data format to v2
function loadTeam() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      myTeam = JSON.parse(raw);
      if (!myTeam.twoWayRoster) myTeam.twoWayRoster = [];
    } else {
      // Try old format
      var oldRaw = localStorage.getItem('nba_my_team_v1');
      if (oldRaw) {
        myTeam = JSON.parse(oldRaw);
        myTeam.twoWayRoster = [];
        saveTeam();
        localStorage.removeItem('nba_my_team_v1');
      }
    }
  } catch(e) { myTeam = null; }
}
function saveTeam() {
  try {
    if (myTeam) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(myTeam));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch(e) {}
}

function calcTotalSalary(roster) {
  var total = 0;
  roster.forEach(function(name) {
    total += getSalary(name);
  });
  return Math.round(total * 1000) / 1000;
}

function getCapStatus(total) {
  if (total > CAP.secondApron) return { level: 5, label: '超第二土豪线', color: '#f56c6c', desc: '球队薪资超过第二土豪线，交易受到严格限制' };
  if (total > CAP.firstApron) return { level: 4, label: '超第一土豪线', color: '#e6a23c', desc: '球队薪资超过第一土豪线，无法使用全额中产、禁止先签后换' };
  if (total > CAP.luxuryTax) return { level: 3, label: '超奢侈税线', color: '#e6a23c', desc: '球队薪资超过奢侈税线，需缴纳奢侈税' };
  if (total > CAP.salaryCap) return { level: 2, label: '超工资帽', color: '#409EFF', desc: '球队薪资超过工资帽，但未超过奢侈税线' };
  if (total < CAP.teamMin) return { level: 0, label: '低于最低工资', color: '#8899aa', desc: '球队薪资低于最低工资标准' };
  return { level: 1, label: '工资帽以下', color: '#67C23A', desc: '球队薪资在工资帽以下，拥有充足空间' };
}

function getAllRoster() {
  if (!myTeam) return [];
  return myTeam.roster.concat(myTeam.twoWayRoster || []);
}

window.NBA = window.NBA || {};

// ===== Taskbar Menu (Task 4) =====
NBA.openMyTeam = function() {
  loadTeam();
  closeTaskbarMenu();
  var overlay = document.getElementById('myTeamOverlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  if (myTeam && myTeam.team) {
    renderTeamManagement();
  } else {
    renderTeamSelect();
  }
};

NBA.closeMyTeam = function() {
  var overlay = document.getElementById('myTeamOverlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
  tradeState = null;
};

// Taskbar menu toggle
NBA.toggleTaskbarMenu = function() {
  var menu = document.getElementById('taskbarMenu');
  if (!menu) return;
  if (menu.classList.contains('open')) {
    closeTaskbarMenu();
  } else {
    menu.classList.add('open');
  }
};

function closeTaskbarMenu() {
  var menu = document.getElementById('taskbarMenu');
  if (menu) menu.classList.remove('open');
}

// "球队" button in taskbar menu - shows NBA team selection
NBA.openTeamSelectFromTaskbar = function() {
  closeTaskbarMenu();
  loadTeam();
  var overlay = document.getElementById('myTeamOverlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  renderTeamSelect();
};

// "自选球队" button in taskbar menu
NBA.openMyTeamFromTaskbar = function() {
  closeTaskbarMenu();
  loadTeam();
  var overlay = document.getElementById('myTeamOverlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  if (myTeam && myTeam.team) {
    renderTeamManagement();
  } else {
    renderTeamSelect();
  }
};

NBA.selectMyTeam = function(teamName) {
  var team = T.find(function(t) { return t.name === teamName; });
  if (!team) return;
  var roster = team.players.map(function(p) { return p.player; });
  myTeam = { team: teamName, roster: roster, twoWayRoster: [] };
  saveTeam();
  renderTeamManagement();
};

NBA.changeMyTeam = function() {
  myTeam = null;
  saveTeam();
  renderTeamSelect();
};

// ===== Trade Functionality (Task 3) =====
// Start trade flow: show opponent team selection
NBA.startTrade = function(myPlayerName) {
  if (!myTeam) return;
  var clause = getClause(myPlayerName);
  if (clause === 'ntc') {
    showTradeResult(myPlayerName, '该球员拥有不可交易条款，无法被交易！', 'error');
    return;
  }
  if (clause === 'recently_acquired') {
    showTradeResult(myPlayerName, '该球员刚加盟球队，暂时无法被交易！', 'error');
    return;
  }
  // Check if player is in active roster (two-way players can't be traded this way)
  if (myTeam.twoWayRoster.indexOf(myPlayerName) >= 0) {
    showTradeResult(myPlayerName, '双向合同球员无法通过此方式交易！', 'error');
    return;
  }
  tradeState = { myPlayer: myPlayerName, step: 1 };
  renderTradeModal();
};

NBA.selectOpponentTeam = function(teamName) {
  if (!tradeState) return;
  tradeState.opponentTeam = teamName;
  tradeState.step = 2;
  renderTradeModal();
};

NBA.selectOpponentPlayer = function(playerName) {
  if (!tradeState) return;
  tradeState.opponentPlayer = playerName;
  tradeState.step = 3;
  renderTradeModal();
};

NBA.confirmTrade = function() {
  if (!tradeState || !tradeState.myPlayer || !tradeState.opponentPlayer) return;
  
  var myPlayer = tradeState.myPlayer;
  var oppPlayer = tradeState.opponentPlayer;
  
  // Validate trade clause on opponent player
  var oppClause = getClause(oppPlayer);
  if (oppClause === 'recently_acquired') {
    showTradeResult(oppPlayer, '对方球员刚加盟，暂时无法被交易！', 'error');
    return;
  }
  
  // Calculate salaries
  var mySalary = getSalary(myPlayer);
  var oppSalary = getSalary(oppPlayer);
  
  // Trade kicker bonus
  var myClause = getClause(myPlayer);
  var bonus = 0;
  if (myClause === 'trade_kicker') {
    bonus = mySalary * 0.15;
  }
  var oppBonus = 0;
  if (oppClause === 'trade_kicker') {
    oppBonus = oppSalary * 0.15;
  }
  
  // Execute trade: remove my player, add opponent player
  var idx = myTeam.roster.indexOf(myPlayer);
  if (idx >= 0) {
    myTeam.roster.splice(idx, 1);
  }
  myTeam.roster.push(oppPlayer);
  saveTeam();
  
  var salaryDiff = oppSalary - mySalary;
  var msg = '交易完成！\n' + myPlayer + ' ($' + mySalary.toFixed(2) + 'M) ↔ ' + oppPlayer + ' ($' + oppSalary.toFixed(2) + 'M)';
  if (bonus > 0) msg += '\n交易保证金: +$' + bonus.toFixed(2) + 'M';
  if (oppBonus > 0) msg += '\n对方交易保证金: +$' + oppBonus.toFixed(2) + 'M';
  if (salaryDiff > 0) msg += '\n薪资增加: +$' + salaryDiff.toFixed(2) + 'M';
  else if (salaryDiff < 0) msg += '\n薪资减少: -$' + Math.abs(salaryDiff).toFixed(2) + 'M';
  
  showTradeResult('', msg, 'success');
  tradeState = null;
  closeTradeModal();
  renderTeamManagement();
};

NBA.cancelTrade = function() {
  tradeState = null;
  closeTradeModal();
};

function closeTradeModal() {
  var modal = document.getElementById('tradeModal');
  if (modal) modal.style.display = 'none';
}

function renderTradeModal() {
  var modal = document.getElementById('tradeModal');
  if (!modal) return;
  modal.style.display = 'flex';
  var body = document.getElementById('tradeModalBody');
  if (!body) return;
  
  var myPlayer = tradeState.myPlayer;
  var myPlayerInfo = getPlayerInfo(myPlayer);
  var mySalary = getSalary(myPlayer);
  var myClause = getClause(myPlayer);
  var clauseInfo = TRADE_CLAUSE_INFO[myClause] || TRADE_CLAUSE_INFO.none;
  
  var html = '';
  
  // Trade header showing my player
  html += '<div class="mt-trade-header">' +
    '<div class="mt-trade-player-card">' +
      '<div class="mt-trade-player-name">' + myPlayer + '</div>' +
      '<div class="mt-trade-player-detail">' + (myPlayerInfo ? myPlayerInfo.team : '') + ' · $' + mySalary.toFixed(2) + 'M</div>' +
      (myClause !== 'none' ? '<span class="mt-clause-tag" style="color:' + clauseInfo.color + '">' + clauseInfo.icon + ' ' + clauseInfo.label + '</span>' : '') +
    '</div>' +
    '<div class="mt-trade-arrow">⇄</div>' +
    '<div class="mt-trade-player-card mt-trade-target">';
  
  if (tradeState.step === 3 && tradeState.opponentPlayer) {
    var oppPlayer = tradeState.opponentPlayer;
    var oppInfo = getPlayerInfo(oppPlayer);
    var oppSalary = getSalary(oppPlayer);
    var oppClause = getClause(oppPlayer);
    var oppClauseInfo = TRADE_CLAUSE_INFO[oppClause] || TRADE_CLAUSE_INFO.none;
    html += '<div class="mt-trade-player-name">' + oppPlayer + '</div>' +
      '<div class="mt-trade-player-detail">' + (oppInfo ? oppInfo.team : '') + ' · $' + oppSalary.toFixed(2) + 'M</div>' +
      (oppClause !== 'none' ? '<span class="mt-clause-tag" style="color:' + oppClauseInfo.color + '">' + oppClauseInfo.icon + ' ' + oppClauseInfo.label + '</span>' : '');
  } else {
    html += '<div class="mt-trade-placeholder">选择交易对象</div>';
  }
  html += '</div></div>';
  
  // Step content
  if (tradeState.step === 1) {
    // Step 1: Select opponent team
    html += '<div class="mt-trade-step"><h3>第1步：选择对方球队</h3>';
    html += '<div class="mt-trade-team-grid">';
    T.forEach(function(t) {
      if (t.name === myTeam.team) return;
      html += '<div class="mt-trade-team-card" onclick="NBA.selectOpponentTeam(\'' + t.name + '\')">' +
        '<img src="' + logoUrl(t.id) + '" loading="lazy" decoding="async" onerror="this.src=\'' + logoSvg(t.name.substring(0,2), 32) + '\'" alt="' + t.name + '">' +
        '<span>' + t.name + '</span>' +
        '<span class="mt-trade-team-count">' + t.count + '人</span>' +
      '</div>';
    });
    html += '</div></div>';
  } else if (tradeState.step === 2) {
    // Step 2: Select opponent player
    var oppTeam = T.find(function(t) { return t.name === tradeState.opponentTeam; });
    html += '<div class="mt-trade-step">' +
      '<div class="mt-trade-step-header">' +
        '<button class="mt-back-btn" onclick="tradeState.step=1;renderTradeModal()">← 返回</button>' +
        '<h3>第2步：选择对方球员（' + tradeState.opponentTeam + '）</h3>' +
      '</div>';
    
    // Search box
    html += '<div class="mt-search-box"><input type="text" id="tradeSearchInput" placeholder="搜索球员..." oninput="NBA.filterTradePlayers()" autocomplete="off"></div>';
    
    html += '<div class="mt-trade-player-list" id="tradePlayerList">';
    if (oppTeam) {
      var sortedPlayers = oppTeam.players.slice().sort(function(a, b) {
        return getSalary(b.player) - getSalary(a.player);
      });
      sortedPlayers.forEach(function(p) {
        var salary = getSalary(p.player);
        var clause = getClause(p.player);
        var clauseInfo = TRADE_CLAUSE_INFO[clause] || TRADE_CLAUSE_INFO.none;
        var clauseHtml = clause !== 'none'
          ? '<span class="mt-clause-tag" style="color:' + clauseInfo.color + '">' + clauseInfo.icon + ' ' + clauseInfo.label + '</span>'
          : '';
        var ptsStr = p.pts ? p.pts.toFixed(1) : '-';
        var rebStr = p.reb ? p.reb.toFixed(1) : '-';
        var astStr = p.ast ? p.ast.toFixed(1) : '-';
        html += '<div class="mt-trade-player-option" onclick="NBA.selectOpponentPlayer(\'' + p.player.replace(/'/g, "\\'") + '\')">' +
          '<div class="mt-trade-player-info">' +
            '<span class="mt-trade-player-name">' + p.player + '</span>' +
            '<span class="mt-trade-player-stats">' + ptsStr + '分 ' + rebStr + '板 ' + astStr + '助 · $' + salary.toFixed(2) + 'M</span>' +
            clauseHtml +
          '</div>' +
          '<span class="mt-trade-select-icon">→</span>' +
        '</div>';
      });
    }
    html += '</div></div>';
  } else if (tradeState.step === 3) {
    // Step 3: Confirm trade
    var oppPlayer = tradeState.opponentPlayer;
    var oppSalary = getSalary(oppPlayer);
    var oppClause = getClause(oppPlayer);
    var oppClauseInfo = TRADE_CLAUSE_INFO[oppClause] || TRADE_CLAUSE_INFO.none;
    
    var salaryDiff = oppSalary - mySalary;
    var newTotal = calcTotalSalary(myTeam.roster) - mySalary + oppSalary;
    var newCapStatus = getCapStatus(newTotal);
    
    html += '<div class="mt-trade-step">' +
      '<div class="mt-trade-step-header">' +
        '<button class="mt-back-btn" onclick="tradeState.step=2;renderTradeModal()">← 返回</button>' +
        '<h3>第3步：确认交易</h3>' +
      '</div>';
    
    html += '<div class="mt-trade-confirm-box">' +
      '<div class="mt-trade-confirm-row">' +
        '<span>送出球员</span><strong>' + myPlayer + '</strong>' +
      '</div>' +
      '<div class="mt-trade-confirm-row">' +
        '<span>送出薪资</span><strong>$' + mySalary.toFixed(2) + 'M</strong>' +
      '</div>' +
      (myClause === 'trade_kicker' ? '<div class="mt-trade-confirm-row mt-trade-warn"><span>交易保证金</span><strong>+$' + (mySalary * 0.15).toFixed(2) + 'M</strong></div>' : '') +
      '<div class="mt-trade-confirm-divider"></div>' +
      '<div class="mt-trade-confirm-row">' +
        '<span>得到球员</span><strong>' + oppPlayer + '</strong>' +
      '</div>' +
      '<div class="mt-trade-confirm-row">' +
        '<span>得到薪资</span><strong>$' + oppSalary.toFixed(2) + 'M</strong>' +
      '</div>' +
      '<div class="mt-trade-confirm-divider"></div>' +
      '<div class="mt-trade-confirm-row">' +
        '<span>薪资变化</span><strong style="color:' + (salaryDiff > 0 ? '#f56c6c' : '#67C23A') + '">' + (salaryDiff > 0 ? '+' : '') + '$' + salaryDiff.toFixed(2) + 'M</strong>' +
      '</div>' +
      '<div class="mt-trade-confirm-row">' +
        '<span>交易后总薪资</span><strong style="color:' + newCapStatus.color + '">$' + newTotal.toFixed(2) + 'M (' + newCapStatus.label + ')</strong>' +
      '</div>' +
    '</div>';
    
    html += '<div class="mt-trade-actions">' +
      '<button class="mt-btn-danger" onclick="NBA.cancelTrade()">取消</button>' +
      '<button class="mt-btn-primary" onclick="NBA.confirmTrade()">确认交易</button>' +
    '</div>';
    
    html += '</div>';
  }
  
  body.innerHTML = html;
  body.scrollTop = 0;
  
  // Focus search if in step 2
  if (tradeState.step === 2) {
    var input = document.getElementById('tradeSearchInput');
    if (input) setTimeout(function() { input.focus(); }, 50);
  }
}

NBA.filterTradePlayers = function() {
  var q = (document.getElementById('tradeSearchInput').value || '').trim().toLowerCase();
  var list = document.getElementById('tradePlayerList');
  if (!list) return;
  var cards = list.querySelectorAll('.mt-trade-player-option');
  cards.forEach(function(card) {
    var name = card.querySelector('.mt-trade-player-name').textContent.toLowerCase();
    card.style.display = (!q || name.indexOf(q) !== -1) ? '' : 'none';
  });
};

// ===== Sign/Release Players (Task 2) =====
NBA.signPlayer = function(name) {
  if (!myTeam) return;
  if (getAllRoster().indexOf(name) >= 0) {
    showTradeResult(name, '该球员已在阵容中！', 'error');
    return;
  }
  if (myTeam.roster.length >= 15) {
    showTradeResult(name, '正式球员已达15人上限！可签约为双向合同球员，或先交易现有球员', 'error');
    return;
  }
  myTeam.roster.push(name);
  saveTeam();
  var salary = getSalary(name);
  showTradeResult(name, '已签约 ' + name + ' 为正式球员，薪资 $' + salary.toFixed(2) + 'M', 'success');
  renderTeamManagement();
  var input = document.getElementById('mtSearchInput');
  if (input) {
    setTimeout(function() { input.focus(); }, 50);
  }
};

NBA.signTwoWayPlayer = function(name) {
  if (!myTeam) return;
  if (getAllRoster().indexOf(name) >= 0) {
    showTradeResult(name, '该球员已在阵容中！', 'error');
    return;
  }
  if (!myTeam.twoWayRoster) myTeam.twoWayRoster = [];
  if (myTeam.twoWayRoster.length >= 3) {
    showTradeResult(name, '双向合同球员已达3人上限！', 'error');
    return;
  }
  myTeam.twoWayRoster.push(name);
  saveTeam();
  showTradeResult(name, '已签约 ' + name + ' 为双向合同球员', 'success');
  renderTeamManagement();
  var input = document.getElementById('mtSearchInput');
  if (input) {
    setTimeout(function() { input.focus(); }, 50);
  }
};

NBA.releasePlayer = function(name) {
  if (!myTeam) return;
  var idx = myTeam.roster.indexOf(name);
  if (idx >= 0) {
    myTeam.roster.splice(idx, 1);
    saveTeam();
    showTradeResult(name, '已释放 ' + name, 'success');
    renderTeamManagement();
    return;
  }
  var twIdx = myTeam.twoWayRoster.indexOf(name);
  if (twIdx >= 0) {
    myTeam.twoWayRoster.splice(twIdx, 1);
    saveTeam();
    showTradeResult(name, '已释放双向合同球员 ' + name, 'success');
    renderTeamManagement();
  }
};

// Promote two-way player to active roster
NBA.promoteTwoWay = function(name) {
  if (!myTeam) return;
  var twIdx = myTeam.twoWayRoster.indexOf(name);
  if (twIdx < 0) return;
  if (myTeam.roster.length >= 15) {
    showTradeResult(name, '正式球员已达15人上限，无法转正！', 'error');
    return;
  }
  myTeam.twoWayRoster.splice(twIdx, 1);
  myTeam.roster.push(name);
  saveTeam();
  showTradeResult(name, name + ' 已转为正式球员', 'success');
  renderTeamManagement();
};

// Demote active player to two-way
NBA.demoteToTwoWay = function(name) {
  if (!myTeam) return;
  var idx = myTeam.roster.indexOf(name);
  if (idx < 0) return;
  if (!myTeam.twoWayRoster) myTeam.twoWayRoster = [];
  if (myTeam.twoWayRoster.length >= 3) {
    showTradeResult(name, '双向合同球员已达3人上限！', 'error');
    return;
  }
  myTeam.roster.splice(idx, 1);
  myTeam.twoWayRoster.push(name);
  saveTeam();
  showTradeResult(name, name + ' 已转为双向合同球员', 'success');
  renderTeamManagement();
};

NBA.searchMyTeamPlayers = function() {
  var q = (document.getElementById('mtSearchInput').value || '').trim().toLowerCase();
  var list = document.getElementById('mtPlayerList');
  if (!list) return;
  if (!q) {
    list.innerHTML = '<div class="mt-search-hint">输入球员姓名搜索可签约球员</div>';
    return;
  }
  var allRoster = getAllRoster();
  var available = P.filter(function(p) {
    return (p.player.toLowerCase().indexOf(q) !== -1 || p.team.toLowerCase().indexOf(q) !== -1)
      && allRoster.indexOf(p.player) < 0;
  }).slice(0, 30);
  if (available.length === 0) {
    list.innerHTML = '<div class="mt-search-hint">未找到匹配球员</div>';
    return;
  }
  var activeFull = myTeam.roster.length >= 15;
  var twoWayFull = (myTeam.twoWayRoster || []).length >= 3;
  list.innerHTML = available.map(function(p) {
    var salary = getSalary(p.player);
    var clause = getClause(p.player);
    var clauseInfo = TRADE_CLAUSE_INFO[clause] || TRADE_CLAUSE_INFO.none;
    var clauseHtml = clause !== 'none'
      ? '<span class="mt-clause-tag" style="color:' + clauseInfo.color + '">' + clauseInfo.icon + ' ' + clauseInfo.label + '</span>'
      : '';
    var signBtn = activeFull
      ? (twoWayFull ? '<button class="mt-sign-btn" disabled>已满</button>' : '<button class="mt-sign-btn mt-sign-tw" onclick="NBA.signTwoWayPlayer(\'' + p.player.replace(/'/g, "\\'") + '\')">双向签约</button>')
      : '<div class="mt-sign-group"><button class="mt-sign-btn" onclick="NBA.signPlayer(\'' + p.player.replace(/'/g, "\\'") + '\')">正式签约</button>' +
        (twoWayFull ? '' : '<button class="mt-sign-btn mt-sign-tw" onclick="NBA.signTwoWayPlayer(\'' + p.player.replace(/'/g, "\\'") + '\')">双向</button>') + '</div>';
    return '<div class="mt-player-row">' +
      '<div class="mt-player-info">' +
        '<span class="mt-player-name">' + p.player + '</span>' +
        '<span class="mt-player-team">' + p.team + '</span>' +
        '<span class="mt-player-salary">$' + salary.toFixed(2) + 'M</span>' +
        clauseHtml +
      '</div>' +
      signBtn +
    '</div>';
  }).join('');
};

NBA.clearMyTeam = function() {
  if (confirm('确定要清空自选球队并重新选择吗？')) {
    myTeam = null;
    saveTeam();
    renderTeamSelect();
  }
};

function showTradeResult(name, msg, type) {
  var toast = document.getElementById('mtToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'mt-toast ' + type + ' show';
  setTimeout(function() {
    toast.className = 'mt-toast ' + type;
  }, 3000);
}

function renderTeamSelect() {
  var body = document.getElementById('myTeamBody');
  if (!body) return;
  var html = '<div class="mt-select-header">' +
    '<h2>选择你的球队</h2>' +
    '<p>从NBA 30支球队中选择一支，开始组建你的冠军阵容</p>' +
  '</div><div class="mt-team-grid">';
  T.forEach(function(t) {
    html += '<div class="mt-team-card" onclick="NBA.selectMyTeam(\'' + t.name + '\')">' +
      '<img src="' + logoUrl(t.id) + '" loading="lazy" decoding="async" onerror="this.src=\'' + logoSvg(t.name.substring(0,2), 40) + '\'" alt="' + t.name + '">' +
      '<span class="mt-team-card-name">' + t.name + '</span>' +
      '<span class="mt-team-card-count">' + t.count + '人</span>' +
    '</div>';
  });
  html += '</div>';
  body.innerHTML = html;
  body.scrollTop = 0;
}

function renderTeamManagement() {
  if (!myTeam) { renderTeamSelect(); return; }
  var body = document.getElementById('myTeamBody');
  if (!body) return;
  var team = T.find(function(t) { return t.name === myTeam.team; });
  var tid = team ? team.id : 0;
  
  var activeCount = myTeam.roster.length;
  var twoWayCount = (myTeam.twoWayRoster || []).length;
  var totalCount = activeCount + twoWayCount;
  var totalSalary = calcTotalSalary(myTeam.roster); // Only active roster counts for salary cap
  var capStatus = getCapStatus(totalSalary);

  var capBarHtml = renderCapBar(totalSalary, capStatus);

  var html = '<div class="mt-mgmt-header">' +
    '<div class="mt-mgmt-team">' +
      '<img src="' + logoUrl(tid) + '" loading="lazy" decoding="async" onerror="this.src=\'' + logoSvg(myTeam.team.substring(0,2), 36) + '\'" alt="' + myTeam.team + '">' +
      '<div><h2>' + myTeam.team + '</h2><span class="mt-mgmt-roster-count">正式 ' + activeCount + '/15 · 双向 ' + twoWayCount + '/3</span></div>' +
    '</div>' +
    '<div class="mt-mgmt-actions">' +
      '<button class="mt-btn-secondary" onclick="NBA.changeMyTeam()">更换球队</button>' +
      '<button class="mt-btn-danger" onclick="NBA.clearMyTeam()">清空重选</button>' +
    '</div>' +
  '</div>';

  // Roster count warnings
  if (activeCount > 15) {
    html += '<div class="mt-warning-banner">⚠️ 正式球员' + activeCount + '人，超过上限15人，需交易或释放' + (activeCount - 15) + '人</div>';
  } else if (activeCount < 13) {
    html += '<div class="mt-warning-banner">⚠️ 正式球员至少需要13人，当前仅' + activeCount + '人</div>';
  }

  // Salary dashboard
  html += '<div class="mt-salary-dashboard">' +
    '<div class="mt-salary-header">' +
      '<h3>薪资总览</h3>' +
      '<span class="mt-cap-status" style="background:' + capStatus.color + '20;color:' + capStatus.color + ';border:1px solid ' + capStatus.color + '">' + capStatus.label + '</span>' +
    '</div>' +
    capBarHtml +
    '<div class="mt-salary-summary">' +
      '<div class="mt-salary-item"><span class="mt-salary-label">球队总薪资</span><span class="mt-salary-value">$' + totalSalary.toFixed(2) + 'M</span></div>' +
      '<div class="mt-salary-item"><span class="mt-salary-label">工资帽空间</span><span class="mt-salary-value" style="color:' + (totalSalary > CAP.salaryCap ? '#f56c6c' : '#67C23A') + '">$' + (CAP.salaryCap - totalSalary).toFixed(2) + 'M</span></div>' +
      '<div class="mt-salary-item"><span class="mt-salary-label">距奢侈税线</span><span class="mt-salary-value" style="color:' + (totalSalary > CAP.luxuryTax ? '#f56c6c' : '#67C23A') + '">$' + (CAP.luxuryTax - totalSalary).toFixed(2) + 'M</span></div>' +
      '<div class="mt-salary-item"><span class="mt-salary-label">距第一土豪线</span><span class="mt-salary-value" style="color:' + (totalSalary > CAP.firstApron ? '#f56c6c' : '#e6a23c') + '">$' + (CAP.firstApron - totalSalary).toFixed(2) + 'M</span></div>' +
      '<div class="mt-salary-item"><span class="mt-salary-label">距第二土豪线</span><span class="mt-salary-value" style="color:' + (totalSalary > CAP.secondApron ? '#f56c6c' : '#e6a23c') + '">$' + (CAP.secondApron - totalSalary).toFixed(2) + 'M</span></div>' +
    '</div>' +
    (capStatus.desc ? '<div class="mt-cap-desc">' + capStatus.desc + '</div>' : '') +
    '<div class="mt-cap-legend">' +
      '<div class="mt-legend-item"><span class="mt-legend-color" style="background:#67C23A"></span>工资帽 $' + CAP.salaryCap.toFixed(1) + 'M</div>' +
      '<div class="mt-legend-item"><span class="mt-legend-color" style="background:#409EFF"></span>奢侈税线 $' + CAP.luxuryTax.toFixed(1) + 'M</div>' +
      '<div class="mt-legend-item"><span class="mt-legend-color" style="background:#e6a23c"></span>第一土豪线 $' + CAP.firstApron.toFixed(1) + 'M</div>' +
      '<div class="mt-legend-item"><span class="mt-legend-color" style="background:#f56c6c"></span>第二土豪线 $' + CAP.secondApron.toFixed(1) + 'M</div>' +
    '</div>' +
  '</div>';

  // Active roster section (Task 2)
  html += '<div class="mt-roster-section">' +
    '<div class="mt-roster-section-header">' +
      '<h3>正式阵容 <span class="mt-roster-count-badge">' + activeCount + '/15</span></h3>' +
      '<span class="mt-roster-hint">正式球员（计入薪资帽）</span>' +
    '</div>' +
    '<div class="mt-roster-list">';

  var sortedRoster = myTeam.roster.slice().sort(function(a, b) {
    return getSalary(b) - getSalary(a);
  });

  sortedRoster.forEach(function(name) {
    html += renderRosterCard(name, 'active', activeCount);
  });

  html += '</div></div>';

  // Two-way roster section (Task 2)
  html += '<div class="mt-roster-section mt-tw-section">' +
    '<div class="mt-roster-section-header">' +
      '<h3>双向合同 <span class="mt-roster-count-badge mt-tw-badge">' + twoWayCount + '/3</span></h3>' +
      '<span class="mt-roster-hint">双向合同球员（不计入15人上限和薪资帽）</span>' +
    '</div>' +
    '<div class="mt-roster-list">';

  if (myTeam.twoWayRoster && myTeam.twoWayRoster.length > 0) {
    var sortedTW = myTeam.twoWayRoster.slice().sort(function(a, b) {
      return getSalary(b) - getSalary(a);
    });
    sortedTW.forEach(function(name) {
      html += renderRosterCard(name, 'tw', activeCount);
    });
  } else {
    html += '<div class="mt-empty-tw">暂无双向合同球员，可在签约时选择双向合同</div>';
  }

  html += '</div></div>';

  // Add player section
  html += '<div class="mt-add-section">' +
    '<h3>签约球员</h3>' +
    '<div class="mt-search-box">' +
      '<input type="text" id="mtSearchInput" placeholder="搜索球员姓名或球队..." oninput="NBA.searchMyTeamPlayers()" autocomplete="off">' +
    '</div>' +
    '<div class="mt-player-list" id="mtPlayerList">' +
      '<div class="mt-search-hint">输入球员姓名搜索可签约球员</div>' +
    '</div>' +
  '</div>';

  // Trade clause info section
  html += '<div class="mt-clause-info-section">' +
    '<h3>NBA交易条款说明</h3>' +
    '<div class="mt-clause-info-item">' +
      '<span class="mt-clause-info-icon" style="background:#f56c6c20;color:#f56c6c">🔒</span>' +
      '<div><strong>不可交易条款 (No-Trade Clause)</strong><p>球员在合同中拥有否决交易的权利。拥有此条款的球员可以拒绝被交易到任何球队。获得NTC资格需满足：8年以上NBA经验且在同一球队效力4年以上。</p></div>' +
    '</div>' +
    '<div class="mt-clause-info-item">' +
      '<span class="mt-clause-info-icon" style="background:#e6a23c20;color:#e6a23c">💰</span>' +
      '<div><strong>交易保证金 (Trade Kicker)</strong><p>球员被交易时，可获得剩余合同金额15%的额外补偿。这会增加接收球队薪资负担，但球员仍可被交易。</p></div>' +
    '</div>' +
    '<div class="mt-clause-info-item">' +
      '<span class="mt-clause-info-icon" style="background:#409EFF20;color:#409EFF">⏳</span>' +
      '<div><strong>刚加盟限制 (Recently Acquired)</strong><p>新签约或刚被交易的球员在一定期限内无法再次被交易。自由球员签约后需等待3个月或至12月15日，交易获得球员需等待60天。</p></div>' +
    '</div>' +
    '<div class="mt-clause-info-item">' +
      '<span class="mt-clause-info-icon" style="background:#67C23A20;color:#67C23A">✅</span>' +
      '<div><strong>自由交易</strong><p>无任何交易限制的球员，可自由交易到任何球队。</p></div>' +
    '</div>' +
    '<div class="mt-clause-info-item">' +
      '<span class="mt-clause-info-icon" style="background:#90939920;color:#909399">📋</span>' +
      '<div><strong>双向合同 (Two-Way Contract)</strong><p>双向合同球员可在NBA和发展联盟之间往返，最多3人，不计入15人正式阵容上限和薪资帽。可在签约时选择双向合同，也可将正式球员转为双向。</p></div>' +
    '</div>' +
  '</div>';

  body.innerHTML = html;
  body.scrollTop = 0;
}

function renderRosterCard(name, type, activeCount) {
  var p = getPlayerInfo(name);
  var salary = getSalary(name);
  var clause = getClause(name);
  var clauseInfo = TRADE_CLAUSE_INFO[clause] || TRADE_CLAUSE_INFO.none;
  var playerId = PID[name];
  var photoVer = 'v4';
  var avatarHtml = playerId
    ? '<img src="headshots/' + playerId + '.png?' + photoVer + '" alt="' + name + '" loading="lazy" decoding="async" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span style="display:none;font-weight:700;color:var(--accent)">#' + (p ? p.jersey : '?') + '</span>'
    : '<span style="font-weight:700;color:var(--accent)">#' + (p ? p.jersey : '?') + '</span>';

  var clauseHtml = '';
  if (clause !== 'none') {
    clauseHtml = '<span class="mt-clause-badge" style="background:' + clauseInfo.color + '20;color:' + clauseInfo.color + ';border:1px solid ' + clauseInfo.color + '" title="' + clauseInfo.desc + '">' + clauseInfo.icon + ' ' + clauseInfo.label + '</span>';
  }

  var ptsStr = p ? p.pts.toFixed(1) : '-';
  var rebStr = p ? p.reb.toFixed(1) : '-';
  var astStr = p ? p.ast.toFixed(1) : '-';
  var teamStr = p ? p.team : '-';

  var actionBtns = '';
  if (type === 'active') {
    var canTrade = clause !== 'ntc' && clause !== 'recently_acquired' && activeCount > 13;
    var tradeBtnClass = canTrade ? 'mt-trade-btn' : 'mt-trade-btn-disabled';
    var tradeBtnText = clause === 'ntc' ? '🔒 不可交易' : (clause === 'recently_acquired' ? '⏳ 暂不可交易' : (activeCount <= 13 ? '最少13人' : '交易'));
    var twFull = (myTeam.twoWayRoster || []).length >= 3;
    actionBtns = '<div class="mt-roster-actions">' +
      '<button class="mt-btn-sm mt-btn-tw-toggle" onclick="NBA.demoteToTwoWay(\'' + name.replace(/'/g, "\\'") + '\')"' + (twFull ? ' disabled title="双向合同已满"' : '') + '>转双向</button>' +
      '<button class="' + tradeBtnClass + '" ' + (canTrade ? 'onclick="NBA.startTrade(\'' + name.replace(/'/g, "\\'") + '\')"' : 'disabled') + '>' + tradeBtnText + '</button>' +
      '<button class="mt-btn-sm mt-btn-release" onclick="if(confirm(\'确定释放 ' + name + '？\'))NBA.releasePlayer(\'' + name.replace(/'/g, "\\'") + '\')">释放</button>' +
    '</div>';
  } else {
    // Two-way player
    actionBtns = '<div class="mt-roster-actions">' +
      '<button class="mt-btn-sm mt-btn-promote" onclick="NBA.promoteTwoWay(\'' + name.replace(/'/g, "\\'") + '\')"' + (activeCount >= 15 ? ' disabled title="正式阵容已满"' : '') + '>转正</button>' +
      '<button class="mt-btn-sm mt-btn-release" onclick="if(confirm(\'确定释放 ' + name + '？\'))NBA.releasePlayer(\'' + name.replace(/'/g, "\\'") + '\')">释放</button>' +
    '</div>';
  }

  var typeBadge = type === 'tw' ? '<span class="mt-tw-tag">双向</span>' : '';

  return '<div class="mt-roster-card' + (type === 'tw' ? ' mt-roster-card-tw' : '') + '">' +
    '<div class="mt-roster-avatar">' + avatarHtml + '</div>' +
    '<div class="mt-roster-info">' +
      '<div class="mt-roster-name-row">' +
        '<span class="mt-roster-name">' + name + '</span>' +
        typeBadge +
        clauseHtml +
      '</div>' +
      '<div class="mt-roster-stats">' +
        '<span>' + teamStr + '</span>' +
        '<span style="color:var(--accent)">' + ptsStr + '分</span>' +
        '<span style="color:var(--accent2)">' + rebStr + '板</span>' +
        '<span style="color:var(--accent3)">' + astStr + '助</span>' +
        '<span class="mt-roster-salary">$' + salary.toFixed(2) + 'M</span>' +
      '</div>' +
      (clause === 'trade_kicker' ? '<div class="mt-clause-note">交易保证金: +$' + (salary * 0.15).toFixed(2) + 'M</div>' : '') +
    '</div>' +
    actionBtns +
  '</div>';
}

function renderCapBar(totalSalary, capStatus) {
  var maxScale = CAP.secondApron * 1.15;
  var pct = function(val) { return Math.min(100, (val / maxScale) * 100); };

  var markers = [
    { val: CAP.salaryCap, label: '帽', color: '#67C23A' },
    { val: CAP.luxuryTax, label: '税', color: '#409EFF' },
    { val: CAP.firstApron, label: '一土', color: '#e6a23c' },
    { val: CAP.secondApron, label: '二土', color: '#f56c6c' },
  ];

  var markersHtml = markers.map(function(m) {
    var left = pct(m.val);
    var isActive = totalSalary >= m.val;
    return '<div class="mt-cap-marker" style="left:' + left + '%">' +
      '<div class="mt-cap-marker-line" style="background:' + m.color + ';opacity:' + (isActive ? 1 : 0.4) + '"></div>' +
      '<div class="mt-cap-marker-label" style="color:' + m.color + '">' + m.label + '</div>' +
    '</div>';
  }).join('');

  var barWidth = pct(totalSalary);
  var barColor = capStatus.color;

  return '<div class="mt-cap-bar-container">' +
    '<div class="mt-cap-bar-track">' +
      '<div class="mt-cap-bar-fill" style="width:' + barWidth + '%;background:' + barColor + '"></div>' +
      markersHtml +
    '</div>' +
    '<div class="mt-cap-bar-value" style="color:' + barColor + '">$' + totalSalary.toFixed(1) + 'M</div>' +
  '</div>';
}

// Auto-init: taskbar button + overlay + trade modal
function initMyTeamButton() {
  // Create taskbar button (Task 4) - in the top-left area
  if (!document.getElementById('myTeamTaskbarBtn')) {
    var topbar = document.querySelector('.topbar');
    if (topbar) {
      // Insert button after the menu button
      var menuBtn = topbar.querySelector('.menu-btn');
      var btn = document.createElement('button');
      btn.id = 'myTeamTaskbarBtn';
      btn.className = 'menu-btn mt-taskbar-btn';
      btn.setAttribute('aria-label', '自选球队');
      btn.title = '自选球队';
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg>';
      btn.onclick = function(e) { e.stopPropagation(); NBA.toggleTaskbarMenu(); };
      if (menuBtn && menuBtn.nextSibling) {
        topbar.insertBefore(btn, menuBtn.nextSibling);
      } else {
        topbar.appendChild(btn);
      }
    }
  }

  // Create taskbar dropdown menu (Task 4)
  if (!document.getElementById('taskbarMenu')) {
    var menu = document.createElement('div');
    menu.id = 'taskbarMenu';
    menu.className = 'mt-taskbar-menu';
    menu.innerHTML =
      '<div class="mt-taskbar-menu-item" onclick="NBA.openMyTeamFromTaskbar()">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg>' +
        '<span>自选球队</span>' +
      '</div>' +
      '<div class="mt-taskbar-menu-item" onclick="NBA.openTeamSelectFromTaskbar()">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' +
        '<span>球队</span>' +
      '</div>';
    document.body.appendChild(menu);

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      var menuEl = document.getElementById('taskbarMenu');
      var btnEl = document.getElementById('myTeamTaskbarBtn');
      if (menuEl && menuEl.classList.contains('open') && !menuEl.contains(e.target) && e.target !== btnEl && !btnEl.contains(e.target)) {
        closeTaskbarMenu();
      }
    });
  }

  // Create main overlay
  if (!document.getElementById('myTeamOverlay')) {
    var overlay = document.createElement('div');
    overlay.id = 'myTeamOverlay';
    overlay.className = 'my-team-overlay';
    overlay.style.display = 'none';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML =
      '<div class="my-team-modal">' +
        '<div class="my-team-modal-header">' +
          '<h2>🏟️ 自选球队管理</h2>' +
          '<button class="my-team-close" onclick="NBA.closeMyTeam()" aria-label="关闭">&times;</button>' +
        '</div>' +
        '<div class="my-team-modal-body" id="myTeamBody"></div>' +
      '</div>' +
      '<div class="mt-toast" id="mtToast"></div>';
    overlay.onclick = function(e) { if (e.target === overlay) NBA.closeMyTeam(); };
    document.body.appendChild(overlay);
  }

  // Create trade modal (Task 3)
  if (!document.getElementById('tradeModal')) {
    var tradeOverlay = document.createElement('div');
    tradeOverlay.id = 'tradeModal';
    tradeOverlay.className = 'my-team-overlay mt-trade-overlay';
    tradeOverlay.style.display = 'none';
    tradeOverlay.setAttribute('role', 'dialog');
    tradeOverlay.setAttribute('aria-modal', 'true');
    tradeOverlay.innerHTML =
      '<div class="my-team-modal mt-trade-modal">' +
        '<div class="my-team-modal-header">' +
          '<h2>🔄 球员交易</h2>' +
          '<button class="my-team-close" onclick="NBA.cancelTrade()" aria-label="关闭">&times;</button>' +
        '</div>' +
        '<div class="my-team-modal-body" id="tradeModalBody"></div>' +
      '</div>';
    tradeOverlay.onclick = function(e) { if (e.target === tradeOverlay) NBA.cancelTrade(); };
    document.body.appendChild(tradeOverlay);
  }
}

// Init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMyTeamButton);
} else {
  initMyTeamButton();
}

})();
