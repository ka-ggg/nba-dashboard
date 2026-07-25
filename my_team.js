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

var STORAGE_KEY = 'nba_my_team_v1';
var myTeam = null;

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

function loadTeam() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      myTeam = JSON.parse(raw);
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

window.NBA = window.NBA || {};

NBA.openMyTeam = function() {
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

NBA.closeMyTeam = function() {
  var overlay = document.getElementById('myTeamOverlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
};

NBA.selectMyTeam = function(teamName) {
  var team = T.find(function(t) { return t.name === teamName; });
  if (!team) return;
  var roster = team.players.map(function(p) { return p.player; });
  myTeam = { team: teamName, roster: roster };
  saveTeam();
  renderTeamManagement();
};

NBA.changeMyTeam = function() {
  myTeam = null;
  saveTeam();
  renderTeamSelect();
};

NBA.tradePlayer = function(name) {
  if (!myTeam) return;
  var clause = getClause(name);
  if (clause === 'ntc') {
    showTradeResult(name, '该球员拥有不可交易条款，无法被交易！', 'error');
    return;
  }
  if (clause === 'recently_acquired') {
    showTradeResult(name, '该球员刚加盟球队，暂时无法被交易！', 'error');
    return;
  }
  if (myTeam.roster.length <= 13) {
    showTradeResult(name, '球队最少需要13名球员，无法继续交易！', 'error');
    return;
  }
  var salary = getSalary(name);
  var bonus = 0;
  if (clause === 'trade_kicker') {
    bonus = salary * 0.15;
  }
  var idx = myTeam.roster.indexOf(name);
  if (idx >= 0) {
    myTeam.roster.splice(idx, 1);
    saveTeam();
    var msg = bonus > 0
      ? '已交易 ' + name + '，释放 $' + salary.toFixed(2) + 'M 薪资（含交易保证金 $' + bonus.toFixed(2) + 'M）'
      : '已交易 ' + name + '，释放 $' + salary.toFixed(2) + 'M 薪资';
    showTradeResult(name, msg, 'success');
    renderTeamManagement();
  }
};

NBA.signPlayer = function(name) {
  if (!myTeam) return;
  if (myTeam.roster.length >= 15) {
    showTradeResult(name, '球队最多15名球员，无法继续签约！', 'error');
    return;
  }
  if (myTeam.roster.indexOf(name) >= 0) {
    showTradeResult(name, '该球员已在阵容中！', 'error');
    return;
  }
  myTeam.roster.push(name);
  saveTeam();
  var salary = getSalary(name);
  showTradeResult(name, '已签约 ' + name + '，薪资 $' + salary.toFixed(2) + 'M', 'success');
  renderTeamManagement();
  // Keep search state
  var input = document.getElementById('mtSearchInput');
  if (input) {
    setTimeout(function() { input.focus(); }, 50);
  }
};

NBA.searchMyTeamPlayers = function() {
  var q = (document.getElementById('mtSearchInput').value || '').trim().toLowerCase();
  var list = document.getElementById('mtPlayerList');
  if (!list) return;
  if (!q) {
    list.innerHTML = '<div class="mt-search-hint">输入球员姓名搜索可签约球员</div>';
    return;
  }
  var available = P.filter(function(p) {
    return (p.player.toLowerCase().indexOf(q) !== -1 || p.team.toLowerCase().indexOf(q) !== -1)
      && myTeam.roster.indexOf(p.player) < 0;
  }).slice(0, 30);
  if (available.length === 0) {
    list.innerHTML = '<div class="mt-search-hint">未找到匹配球员</div>';
    return;
  }
  list.innerHTML = available.map(function(p) {
    var salary = getSalary(p.player);
    var clause = getClause(p.player);
    var clauseInfo = TRADE_CLAUSE_INFO[clause] || TRADE_CLAUSE_INFO.none;
    var clauseHtml = clause !== 'none'
      ? '<span class="mt-clause-tag" style="color:' + clauseInfo.color + '">' + clauseInfo.icon + ' ' + clauseInfo.label + '</span>'
      : '';
    return '<div class="mt-player-row">' +
      '<div class="mt-player-info">' +
        '<span class="mt-player-name">' + p.player + '</span>' +
        '<span class="mt-player-team">' + p.team + '</span>' +
        '<span class="mt-player-salary">$' + salary.toFixed(2) + 'M</span>' +
        clauseHtml +
      '</div>' +
      '<button class="mt-sign-btn" onclick="NBA.signPlayer(\'' + p.player.replace(/'/g, "\\'") + '\')">签约</button>' +
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
  }, 2500);
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
  var totalSalary = calcTotalSalary(myTeam.roster);
  var capStatus = getCapStatus(totalSalary);
  var rosterCount = myTeam.roster.length;

  var capBarHtml = renderCapBar(totalSalary, capStatus);

  var html = '<div class="mt-mgmt-header">' +
    '<div class="mt-mgmt-team">' +
      '<img src="' + logoUrl(tid) + '" loading="lazy" decoding="async" onerror="this.src=\'' + logoSvg(myTeam.team.substring(0,2), 36) + '\'" alt="' + myTeam.team + '">' +
      '<div><h2>' + myTeam.team + '</h2><span class="mt-mgmt-roster-count">' + rosterCount + '/15名球员</span></div>' +
    '</div>' +
    '<div class="mt-mgmt-actions">' +
      '<button class="mt-btn-secondary" onclick="NBA.changeMyTeam()">更换球队</button>' +
      '<button class="mt-btn-danger" onclick="NBA.clearMyTeam()">清空重选</button>' +
    '</div>' +
  '</div>';

  // Roster count warning
  if (rosterCount > 15) {
    html += '<div class="mt-warning-banner">⚠️ 球队当前' + rosterCount + '人，超过上限15人，请交易' + (rosterCount - 15) + '名球员以符合规定</div>';
  } else if (rosterCount < 13) {
    html += '<div class="mt-warning-banner">⚠️ 球队至少需要13名球员，当前仅' + rosterCount + '人，请签约更多球员</div>';
  } else if (rosterCount >= 15) {
    html += '<div class="mt-info-banner">球队已达上限15人，如需签约新球员请先交易现有球员</div>';
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

  // Roster list
  html += '<div class="mt-roster-section">' +
    '<h3>当前阵容 <span class="mt-roster-count-badge">' + rosterCount + '/15</span></h3>' +
    '<div class="mt-roster-list">';

  // Sort roster by salary descending
  var sortedRoster = myTeam.roster.slice().sort(function(a, b) {
    return getSalary(b) - getSalary(a);
  });

  sortedRoster.forEach(function(name) {
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

    var canTrade = clause !== 'ntc' && clause !== 'recently_acquired' && rosterCount > 13;
    var tradeBtnClass = canTrade ? 'mt-trade-btn' : 'mt-trade-btn-disabled';
    var tradeBtnText = clause === 'ntc' ? '🔒 不可交易' : (clause === 'recently_acquired' ? '⏳ 暂不可交易' : (rosterCount <= 13 ? '最少13人' : '交易'));

    var ptsStr = p ? p.pts.toFixed(1) : '-';
    var rebStr = p ? p.reb.toFixed(1) : '-';
    var astStr = p ? p.ast.toFixed(1) : '-';
    var teamStr = p ? p.team : '-';

    html += '<div class="mt-roster-card">' +
      '<div class="mt-roster-avatar">' + avatarHtml + '</div>' +
      '<div class="mt-roster-info">' +
        '<div class="mt-roster-name-row">' +
          '<span class="mt-roster-name">' + name + '</span>' +
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
      '<button class="' + tradeBtnClass + '" ' + (canTrade ? 'onclick="NBA.tradePlayer(\'' + name.replace(/'/g, "\\'") + '\')"' : 'disabled') + '>' + tradeBtnText + '</button>' +
    '</div>';
  });

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
  '</div>';

  body.innerHTML = html;
  body.scrollTop = 0;
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

// Auto-init button
function initMyTeamButton() {
  if (document.getElementById('myTeamBtn')) return;
  var btn = document.createElement('button');
  btn.id = 'myTeamBtn';
  btn.className = 'my-team-fab';
  btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg><span>自选球队</span>';
  btn.onclick = function() { NBA.openMyTeam(); };
  document.body.appendChild(btn);

  // Create overlay if not exists
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
}

// Init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMyTeamButton);
} else {
  initMyTeamButton();
}

})();
