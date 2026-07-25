(function() {
'use strict';
var T = window.NBA_TEAMS;
var P = window.NBA_PLAYERS;
var curTeam = null;
var chartInst = null;
var sliderCleanup = null;
var playerIdMap = window.NBA_PLAYER_IDS || {};
var echartsLoading = false;
var echartsPromise = null;
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
function loadECharts() {
if (typeof echarts !== 'undefined') return Promise.resolve();
if (echartsPromise) return echartsPromise;
echartsPromise = new Promise(function(resolve, reject) {
var s = document.createElement('script');
s.src = 'https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js';
s.onload = resolve;
s.onerror = reject;
document.head.appendChild(s);
});
return echartsPromise;
}
function buildNavs() {
var dl = document.getElementById('drawerList');
var ds = document.getElementById('desktopSidebar');
T.forEach(function(t) {
var fbSvg = logoSvg(t.name.substring(0,2), 30);
var row = document.createElement('button');
row.className = 'team-row';
row.innerHTML = '<span class="team-logo-wrap"><img src="' + logoUrl(t.id) + '" loading="lazy" decoding="async" onerror="this.src=\'' + fbSvg + '\'" alt="' + t.name + '"></span><span class="team-name">' + t.name + '</span><span class="team-count">' + t.count + '人</span>';
row.onclick = function() { NBA.selectTeam(t.name); NBA.closeDrawer(); };
row.dataset.team = t.name;
dl.appendChild(row);
var di = document.createElement('button');
di.className = 'ds-item';
di.title = t.name + ' (' + t.count + '人)';
di.innerHTML = '<span class="ds-logo-wrap"><img src="' + logoUrl(t.id) + '" loading="lazy" decoding="async" onerror="this.src=\'' + fbSvg + '\'" alt="' + t.name + '"></span><span class="badge">' + t.count + '</span>';
di.onclick = function() { NBA.selectTeam(t.name); };
di.dataset.team = t.name;
ds.appendChild(di);
});
}
window.NBA = {};
NBA.openDrawer = function() {
document.getElementById('drawer').classList.add('open');
document.getElementById('drawerOverlay').classList.add('open');
};
NBA.closeDrawer = function() {
document.getElementById('drawer').classList.remove('open');
document.getElementById('drawerOverlay').classList.remove('open');
};
NBA.selectTeam = function(name) {
curTeam = name;
document.querySelectorAll('.team-row,.ds-item').forEach(function(el) { el.classList.remove('active'); });
document.querySelectorAll('[data-team="' + name + '"]').forEach(function(r) { r.classList.add('active'); });
document.getElementById('searchInput').value = '';
renderTeam(name);
};
NBA.showAll = function() {
curTeam = null;
document.querySelectorAll('.team-row,.ds-item').forEach(function(el) { el.classList.remove('active'); });
document.getElementById('searchInput').value = '';
renderAll();
};
var searchTimer = null;
NBA.search = function() {
var q = document.getElementById('searchInput').value.trim().toLowerCase();
if (searchTimer) clearTimeout(searchTimer);
searchTimer = setTimeout(function() {
if (!q) { if (curTeam) renderTeam(curTeam); else renderAll(); return; }
var f = P.filter(function(p) { return p.player.toLowerCase().indexOf(q) !== -1 || p.team.toLowerCase().indexOf(q) !== -1; });
renderSearch(f, true);
}, 120);
};
NBA.closeModal = function() {
var overlay = document.getElementById('modalOverlay');
if (overlay.classList.contains('closing')) return;
overlay.classList.add('closing');
setTimeout(function() {
overlay.style.display = 'none';
overlay.classList.remove('closing');
document.body.style.overflow = '';
if (sliderCleanup) { sliderCleanup(); sliderCleanup = null; }
if (chartInst) { chartInst.dispose(); chartInst = null; }
}, 200);
};
NBA.hideChartDetail = function() {
var o = document.getElementById('chartDetailOverlay');
if (o) o.classList.remove('show');
};
var isTransitioning = false;
function animateContent(container) {
var sections = container.querySelectorAll('.team-section');
sections.forEach(function(sec, i) {
sec.style.opacity = '0';
sec.style.transform = 'translateY(10px)';
setTimeout(function() { sec.style.opacity = ''; sec.style.transform = ''; }, i * 40 + 30);
});
var cards = container.querySelectorAll('.player-card');
cards.forEach(function(card, i) {
card.style.opacity = '0';
card.style.transform = 'scale(0.92) translateY(6px)';
var delay = Math.min(i * 0.018, 0.3);
setTimeout(function() { card.style.opacity = ''; card.style.transform = ''; }, delay * 1000 + 50);
});
}
function renderWithTransition(renderFn, skipFade) {
var main = document.getElementById('mainContent');
if (skipFade || isTransitioning) {
renderFn();
main.scrollTop = 0;
animateContent(main);
return;
}
isTransitioning = true;
main.classList.add('fading');
setTimeout(function() {
renderFn();
main.scrollTop = 0;
main.classList.remove('fading');
animateContent(main);
isTransitioning = false;
}, 180);
}
function renderAll() {
renderWithTransition(function() {
var h = '';
T.forEach(function(t) { h += teamSection(t); });
document.getElementById('mainContent').innerHTML = h || '<div class="empty-state"><h3>暂无数据</h3></div>';
});
}
function renderTeam(name) {
var t = T.find(function(x) { return x.name === name; });
if (!t) return;
renderWithTransition(function() {
document.getElementById('mainContent').innerHTML = teamSection(t);
});
}
function renderSearch(players, skipFade) {
renderWithTransition(function() {
var main = document.getElementById('mainContent');
if (players.length === 0) {
main.innerHTML = '<div class="empty-state"><div class="icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></div><h3>未找到匹配的球员</h3><p>尝试使用其他关键词</p></div>';
return;
}
var g = {};
players.forEach(function(p) { if (!g[p.team]) g[p.team] = []; g[p.team].push(p); });
var h = '';
Object.keys(g).forEach(function(tn) {
var tp = g[tn];
var t = T.find(function(x) { return x.name === tn; });
var tid = t ? t.id : 0;
h += '<div class="team-section"><div class="team-header"><span class="th-logo"><img src="' + logoUrl(tid) + '" loading="lazy" decoding="async" onerror="this.src=\'' + logoSvg(tn.substring(0,2), 28) + '\'" alt="' + tn + '"></span><h2>' + tn + ' <span class="count">' + tp.length + '人</span></h2></div><div class="player-grid">' + tp.map(pCard).join('') + '</div></div>';
});
main.innerHTML = h;
}, skipFade);
}
function teamSection(t) {
return '<div class="team-section"><div class="team-header"><span class="th-logo"><img src="' + logoUrl(t.id) + '" loading="lazy" decoding="async" onerror="this.src=\'' + logoSvg(t.name.substring(0,2), 28) + '\'" alt="' + t.name + '"></span><h2>' + t.name + ' <span class="count">' + t.count + '名球员</span></h2></div><div class="player-grid">' + t.players.map(pCard).join('') + '</div></div>';
}
function pCard(p) {
var jersey = p.jersey || 'N/A';
var safeName = p.player.replace(/'/g, "\\'");
var playerId = playerIdMap[p.player];
var photoVer = 'v4';
var avatarHtml = playerId
? '<img src="headshots/' + playerId + '.png?' + photoVer + '" alt="' + p.player + '" loading="lazy" decoding="async" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span style="display:none;font-weight:700;color:var(--accent)">#' + jersey + '</span>'
: '<span style="font-weight:700;color:var(--accent)">#' + jersey + '</span>';
return '<div class="player-card" onclick="NBA.openDetail(\'' + safeName + '\')"><div class="avatar">' + avatarHtml + '</div><div class="info"><div class="name">' + p.player + '</div><div class="mini-stats"><span style="color:var(--accent)">' + p.pts.toFixed(1) + '分</span><span style="color:var(--accent2)">' + p.reb.toFixed(1) + '板</span><span style="color:var(--accent3)">' + p.ast.toFixed(1) + '助</span></div></div><div class="rank">#' + jersey + '</div></div>';
}
NBA.openDetail = function(name) {
var p = P.find(function(x) { return x.player === name; });
if (!p) return;
document.getElementById('modalTitle').textContent = p.player + ' \u00b7 ' + p.team;
var body = document.getElementById('modalBody');
var honors = [];
if (p.mvp > 0) honors.push('MVP\u00d7' + p.mvp);
if (p.dpoy > 0) honors.push('DPOY\u00d7' + p.dpoy);
if (p.roy > 0) honors.push('最佳新秀');
if (p.sixth_man > 0) honors.push('最佳第六人\u00d7' + p.sixth_man);
if (p.mip > 0) honors.push('进步最快球员');
if (p.finals_mvp > 0) honors.push('FMVP\u00d7' + p.finals_mvp);
if (p.all_nba > 0) honors.push('最佳阵容\u00d7' + p.all_nba);
if (p.all_nba_1st > 0) honors.push('一阵\u00d7' + p.all_nba_1st);
body.innerHTML =
'<div class="player-hero">' +
'<div class="player-portrait" id="playerPortrait">' +
'<div class="fallback-img"><div class="jersey">#' + (p.jersey || 'N/A') + '</div><span style="font-size:11px;color:var(--muted)">加载中...</span></div>' +
'<div class="season-tag">25-26定妆照</div>' +
'</div>' +
'<div class="player-info-card">' +
'<div class="stat-cell"><div class="label">场均得分</div><div class="value pts">' + p.pts.toFixed(1) + '</div></div>' +
'<div class="stat-cell"><div class="label">场均篮板</div><div class="value reb">' + p.reb.toFixed(1) + '</div></div>' +
'<div class="stat-cell"><div class="label">场均助攻</div><div class="value ast">' + p.ast.toFixed(1) + '</div></div>' +
'<div class="stat-cell"><div class="label">场均抢断</div><div class="value stl">' + p.stl.toFixed(2) + '</div></div>' +
'<div class="stat-cell"><div class="label">出场</div><div class="value">' + p.games + '</div></div>' +
'<div class="stat-cell"><div class="label">上场时间</div><div class="value">' + p.minutes.toFixed(1) + '</div></div>' +
'<div class="stat-cell"><div class="label">盖帽</div><div class="value">' + p.blk.toFixed(2) + '</div></div>' +
'<div class="stat-cell"><div class="label">VORP</div><div class="value">' + p.vorp.toFixed(2) + '</div></div>' +
'<div class="stat-cell"><div class="label">投篮%</div><div class="value">' + (p.fg_pct*100).toFixed(1) + '%</div></div>' +
'<div class="stat-cell"><div class="label">三分%</div><div class="value">' + (p.fg3_pct*100).toFixed(1) + '%</div></div>' +
'<div class="stat-cell"><div class="label">罚球%</div><div class="value">' + (p.ft_pct*100).toFixed(1) + '%</div></div>' +
'<div class="stat-cell"><div class="label">真实命中率</div><div class="value">' + (p.ts_pct*100).toFixed(1) + '%</div></div>' +
(honors.length > 0 ? '<div class="full-row">' + honors.map(function(h) { return '<span class="honor-tag">' + h + '</span>'; }).join('') + '</div>' : '') +
'</div>' +
'</div>' +
'<div class="chart-section">' +
'<h3>历史赛季数据趋势</h3>' +
'<div class="chart-wrapper" id="chartWrapper">' +
'<div id="historyChart" style="width:100%;height:100%"></div>' +
'<div class="chart-detail-overlay" id="chartDetailOverlay">' +
'<button class="close-det" onclick="NBA.hideChartDetail()">&times;</button>' +
'<h4 id="chartDetailTitle"></h4>' +
'<div class="detail-grid" id="chartDetailGrid"></div>' +
'</div>' +
'</div>' +
'<div class="chart-hint">左右拖动滑块查看不同赛季 | 点击数据点查看详情</div>' +
'<div class="cs-container" id="customSlider" style="display:none">' +
'<div class="cs-track-wrap" id="csTrackWrap">' +
'<div class="cs-track"></div>' +
'<div class="cs-window" id="csWindow">' +
'<div class="cs-handle" id="csHandleL" style="left:0%"></div>' +
'<div class="cs-handle" id="csHandleR" style="left:100%"></div>' +
'</div>' +
'</div>' +
'<div class="cs-labels"><span id="csLabelStart"></span><span id="csLabelEnd"></span></div>' +
'</div>' +
'</div>';
var statCells = body.querySelectorAll('.player-info-card .stat-cell');
statCells.forEach(function(cell, i) {
cell.style.animationDelay = (i * 0.03) + 's';
});
var honorTags = body.querySelectorAll('.honor-tag');
honorTags.forEach(function(tag, i) {
tag.style.animationDelay = (0.2 + i * 0.05) + 's';
});
document.getElementById('modalOverlay').style.display = 'flex';
document.body.style.overflow = 'hidden';
loadPhoto(p);
lazyLoadHistory(function() {
loadECharts().then(function() {
NBA.renderChart(p);
}).catch(function() {
var cw = document.getElementById('chartWrapper');
if (cw) cw.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)">图表加载失败，请刷新重试</div>';
});
});
};
var _historyLoaded = false;
function lazyLoadHistory(cb) {
if (_historyLoaded) { cb(); return; }
var s = document.createElement('script');
s.src = 'player_history.js?v=20260726op';
s.onload = function() { _historyLoaded = true; cb(); };
s.onerror = function() { _historyLoaded = true; cb(); };
document.head.appendChild(s);
}
function loadPhoto(p) {
var portrait = document.getElementById('playerPortrait');
if (!portrait) return;
var jerseyNum = (p.jersey && p.jersey !== 'N/A' && p.jersey !== '0') ? p.jersey : 'N/A';
function fallback() {
portrait.innerHTML = '<div class="fallback-img"><div class="jersey">#' + jerseyNum + '</div><span style="font-size:11px;color:var(--muted)">' + p.player + '</span></div><div class="season-tag">25-26定妆照</div>';
}
var playerId = playerIdMap[p.player];
if (!playerId) { fallback(); return; }
var img = new Image();
img.onload = function() {
portrait.innerHTML = '<img src="headshots/' + playerId + '.png?v4" alt="' + p.player + '" decoding="async" fetchpriority="high"><div class="season-tag">25-26定妆照</div>';
};
img.onerror = function() { fallback(); };
img.src = 'headshots/' + playerId + '.png?v4';
}
function genHistory(player) {
var hist = window.NBA_HISTORY && window.NBA_HISTORY[player.player];
if (hist && hist.length > 0) return hist;
var base = { pts: player.pts, reb: player.reb, ast: player.ast, stl: player.stl };
var hash = 0;
for (var i = 0; i < player.player.length; i++) hash = ((hash << 5) - hash) + player.player.charCodeAt(i);
var seed = Math.abs(hash) / 2147483647;
var seasons = ['19-20', '20-21', '21-22', '22-23', '23-24', '24-25', '25-26'];
return seasons.map(function(s, idx) {
var progress = idx / (seasons.length - 1);
var factor = 0.55 + 0.45 * progress;
function noise(i) { return 1 + (Math.sin(seed * 100 + i * 2.7) * 0.12 + Math.sin(seed * 200 + i * 1.3) * 0.08); }
return {
season: s,
pts: +(base.pts * factor * noise(0)).toFixed(1),
reb: +(base.reb * factor * noise(1)).toFixed(1),
ast: +(base.ast * factor * noise(2)).toFixed(1),
stl: +(base.stl * factor * noise(3)).toFixed(2),
fg_pct: +(player.fg_pct * (0.78 + 0.22 * progress + (seed - 0.5) * 0.07)).toFixed(3),
fg3_pct: +(player.fg3_pct * (0.78 + 0.22 * progress + (seed - 0.5) * 0.07)).toFixed(3),
ft_pct: +(player.ft_pct * (0.85 + 0.15 * progress + (seed - 0.5) * 0.04)).toFixed(3),
minutes: +(player.minutes * factor).toFixed(1),
games: Math.round(player.games * factor),
};
});
}
function setupSlider(chart, total, visible, labels) {
var trackWrap = document.getElementById('csTrackWrap');
var winEl = document.getElementById('csWindow');
var labelStart = document.getElementById('csLabelStart');
var labelEnd = document.getElementById('csLabelEnd');
if (!trackWrap || !winEl) return;
var winSize = (visible / total) * 100;
var startVal = 0;
var endVal = winSize;
var isDragging = false;
var dragStartX = 0;
var dragStartStart = 0;
var dragStartEnd = 0;
var rafId = null;
function updateUI() {
winEl.style.left = startVal + '%';
winEl.style.width = (endVal - startVal) + '%';
var si = Math.round(startVal / 100 * total);
var ei = Math.round(endVal / 100 * total) - 1;
si = Math.max(0, Math.min(total - 1, si));
ei = Math.max(0, Math.min(total - 1, ei));
if (labelStart) labelStart.textContent = labels[si];
if (labelEnd) labelEnd.textContent = labels[ei];
}
function updateChart() {
if (rafId) cancelAnimationFrame(rafId);
rafId = requestAnimationFrame(function() {
chart.dispatchAction({ type: 'dataZoom', start: startVal, end: endVal });
});
}
function onStart(e) {
e.preventDefault();
e.stopPropagation();
isDragging = true;
var touch = e.touches ? e.touches[0] : e;
dragStartX = touch.clientX;
dragStartStart = startVal;
dragStartEnd = endVal;
}
function onMove(e) {
if (!isDragging) return;
e.preventDefault();
var touch = e.touches ? e.touches[0] : e;
var dx = touch.clientX - dragStartX;
var trackWidth = trackWrap.offsetWidth;
if (trackWidth <= 0) return;
var deltaPercent = (dx / trackWidth) * 100;
var newStart = dragStartStart + deltaPercent;
var newEnd = dragStartEnd + deltaPercent;
if (newStart < 0) { newStart = 0; newEnd = winSize; }
if (newEnd > 100) { newEnd = 100; newStart = 100 - winSize; }
startVal = newStart;
endVal = newEnd;
updateUI();
updateChart();
}
function onEnd() { isDragging = false; }
winEl.addEventListener('mousedown', onStart);
winEl.addEventListener('touchstart', onStart, { passive: false });
document.addEventListener('mousemove', onMove);
document.addEventListener('mouseup', onEnd);
document.addEventListener('touchmove', onMove, { passive: false });
document.addEventListener('touchend', onEnd);
chart.on('dataZoom', function() {
if (isDragging) return;
var opt = chart.getOption();
var dz = opt.dataZoom && opt.dataZoom[0];
if (dz) { startVal = dz.start; endVal = dz.end; updateUI(); }
});
updateUI();
return function() {
winEl.removeEventListener('mousedown', onStart);
winEl.removeEventListener('touchstart', onStart);
document.removeEventListener('mousemove', onMove);
document.removeEventListener('mouseup', onEnd);
document.removeEventListener('touchmove', onMove);
document.removeEventListener('touchend', onEnd);
if (rafId) cancelAnimationFrame(rafId);
};
}
NBA.renderChart = function(player) {
var history = genHistory(player);
var container = document.getElementById('historyChart');
if (!container) return;
if (chartInst) chartInst.dispose();
var style = getComputedStyle(document.documentElement);
var accent = style.getPropertyValue('--accent').trim();
var accent2 = style.getPropertyValue('--accent2').trim();
var accent3 = style.getPropertyValue('--accent3').trim();
var gold = style.getPropertyValue('--gold').trim();
var ink = style.getPropertyValue('--ink').trim();
var muted = style.getPropertyValue('--muted').trim();
var rule = style.getPropertyValue('--rule').trim();
var bg2 = style.getPropertyValue('--bg2').trim();
chartInst = echarts.init(container, null, { renderer: 'svg' });
var seasonLabels = history.map(function(h) { return h.season; });
var totalSeasons = history.length;
var visibleCount = Math.min(totalSeasons, 5);
var needZoom = totalSeasons > visibleCount;
var endPercent = needZoom ? (visibleCount / totalSeasons * 100) : 100;
var seriesCommon = {
type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
lineStyle: { width: 2.5 },
itemStyle: { borderColor: bg2, borderWidth: 1.5 },
emphasis: { symbolSize: 12, itemStyle: { borderWidth: 2.5 } },
animation: true, animationDuration: 800, animationDurationUpdate: 0, animationEasing: 'cubicOut',
};
function makeSeries(name, data, color, delayOffset) {
var s = Object.assign({}, seriesCommon);
s.name = name; s.data = data;
s.lineStyle.color = color;
s.itemStyle.color = color;
s.animationDelay = function(idx) { return idx * 40 + delayOffset; };
return s;
}
var option = {
tooltip: {
trigger: 'axis',
backgroundColor: 'rgba(19,24,32,0.96)',
borderColor: rule, borderWidth: 1,
textStyle: { color: ink, fontSize: 11 },
confine: true,
},
legend: {
data: ['得分', '篮板', '助攻', '抢断'],
top: -6,
textStyle: { color: muted, fontSize: 10, padding: [0, 8, 0, 2] },
itemWidth: 12, itemHeight: 2, icon: 'roundRect', itemGap: 12,
},
grid: { left: 44, right: 16, top: 24, bottom: 28 },
xAxis: {
type: 'category', data: seasonLabels,
axisLine: { lineStyle: { color: rule } },
axisTick: { show: false },
axisLabel: { color: muted, fontSize: 9, rotate: history.length > 12 ? 45 : 0, margin: 8 },
},
yAxis: {
type: 'value',
splitLine: { lineStyle: { color: rule, type: 'dashed' } },
axisLabel: { color: muted, fontSize: 9 },
},
dataZoom: needZoom ? [{
type: 'slider', show: false,
start: 0, end: endPercent, zoomLock: true,
}] : [],
animation: true, animationDuration: 600, animationDurationUpdate: 0, animationEasing: 'cubicOut',
series: [
makeSeries('得分', history.map(function(h) { return h.pts; }), accent, 0),
makeSeries('篮板', history.map(function(h) { return h.reb; }), accent2, 100),
makeSeries('助攻', history.map(function(h) { return h.ast; }), accent3, 200),
makeSeries('抢断', history.map(function(h) { return h.stl; }), gold, 300),
],
};
chartInst.setOption(option);
if (sliderCleanup) { sliderCleanup(); sliderCleanup = null; }
var csContainer = document.getElementById('customSlider');
if (needZoom && csContainer) {
csContainer.style.display = 'block';
sliderCleanup = setupSlider(chartInst, totalSeasons, visibleCount, seasonLabels);
} else if (csContainer) {
csContainer.style.display = 'none';
}
chartInst.on('click', function(params) {
if (params.componentType === 'series') {
var idx = params.dataIndex;
var h = history[idx];
var overlay = document.getElementById('chartDetailOverlay');
document.getElementById('chartDetailTitle').textContent = h.season + '赛季' + (idx === history.length - 1 ? ' (25-26)' : '');
document.getElementById('chartDetailGrid').innerHTML =
'<div class="detail-cell"><div class="dl">得分</div><div class="dv pts">' + h.pts.toFixed(1) + '</div></div>' +
'<div class="detail-cell"><div class="dl">篮板</div><div class="dv reb">' + h.reb.toFixed(1) + '</div></div>' +
'<div class="detail-cell"><div class="dl">助攻</div><div class="dv ast">' + h.ast.toFixed(1) + '</div></div>' +
'<div class="detail-cell"><div class="dl">抢断</div><div class="dv stl">' + h.stl.toFixed(2) + '</div></div>' +
'<div class="detail-cell"><div class="dl">出场</div><div class="dv">' + h.games + '</div></div>' +
'<div class="detail-cell"><div class="dl">上场时间</div><div class="dv">' + h.minutes.toFixed(1) + '</div></div>' +
'<div class="detail-cell"><div class="dl">投篮%</div><div class="dv">' + (h.fg_pct*100).toFixed(1) + '%</div></div>' +
'<div class="detail-cell"><div class="dl">三分%</div><div class="dv">' + (h.fg3_pct*100).toFixed(1) + '%</div></div>';
overlay.classList.add('show');
}
});
window.addEventListener('resize', function() { if (chartInst) chartInst.resize(); });
};
document.addEventListener('keydown', function(e) {
if (e.key === 'Escape') { NBA.closeModal(); NBA.closeDrawer(); }
});
buildNavs();
renderAll();
})();