// GitHub 风格贡献热力图：按年分行，覆盖从第一篇博文到今年的完整发布历史
// 支持悬停查看当日发文，点击直达（多篇时弹出列表）
(function () {
  var CELL = 13, GAP = 3, LBL_H = 20, LBL_W = 32;
  var MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  var LIGHT = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
  var DARK = ['#2b3038', '#0e4429', '#006d32', '#26a641', '#39d353'];

  var dayPosts = {};   // 'YYYY-MM-DD' -> [{t, u}]

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function level(c) { return c === 0 ? 0 : c === 1 ? 1 : c === 2 ? 2 : c <= 4 ? 3 : 4; }

  function yearSvg(year, isCurrent) {
    var start = new Date(year, 0, 1);
    start.setDate(start.getDate() - start.getDay()); // 对齐到周日
    var end = isCurrent ? new Date() : new Date(year, 11, 31);
    var days = [];
    for (var d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));
    var weeks = Math.ceil(days.length / 7);
    var W = LBL_W + weeks * (CELL + GAP);
    var H = LBL_H + 7 * (CELL + GAP) + 4;

    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block">';
    var prevM = -1;
    for (var c = 0; c < weeks; c++) {
      var dd = days[c * 7];
      if (!dd) break;
      if (dd.getMonth() !== prevM) {
        prevM = dd.getMonth();
        svg += '<text x="' + (LBL_W + c * (CELL + GAP)) + '" y="12" font-size="10" fill="currentColor" opacity=".65">' + MONTHS[prevM] + '</text>';
      }
    }
    ['一', '三', '五'].forEach(function (zh, i) {
      var row = i * 2 + 1;
      svg += '<text x="0" y="' + (LBL_H + row * (CELL + GAP) + CELL - 2) + '" font-size="10" fill="currentColor" opacity=".65">' + zh + '</text>';
    });
    days.forEach(function (dd, i) {
      var key = fmt(dd);
      var cnt = (dayPosts[key] || []).length;
      var col = Math.floor(i / 7), row = i % 7;
      var tip = key + ' · 发文 ' + cnt + ' 篇' + (cnt ? '，点击查看' : '');
      svg += '<rect class="act-cell" data-lvl="' + level(cnt) + '" data-day="' + key + '" x="' + (LBL_W + col * (CELL + GAP)) +
        '" y="' + (LBL_H + row * (CELL + GAP)) + '" width="' + CELL + '" height="' + CELL +
        '" rx="2.5"><title>' + tip + '</title></rect>';
    });
    return svg + '</svg>';
  }

  function render(box, posts) {
    var years = {};
    posts.forEach(function (p) {
      (dayPosts[p.d] = dayPosts[p.d] || []).push(p);
      years[p.d.slice(0, 4)] = true;
    });
    var first = Number(posts[0].d.slice(0, 4));
    var last = new Date().getFullYear();
    var html = '';
    for (var y = last; y >= first; y--) {
      html += '<h3 style="margin:14px 0 6px;font-size:1.05em">' + y + ' 年' +
        (years[y] ? '' : ' <span style="opacity:.5;font-size:.8em">（暂无发布）</span>') + '</h3>';
      html += yearSvg(y, y === last);
    }
    box.innerHTML = html;
    applyTheme(box);
  }

  function applyTheme(box) {
    var pal = document.documentElement.getAttribute('data-theme') === 'dark' ? DARK : LIGHT;
    box.querySelectorAll('.act-cell').forEach(function (r) {
      r.setAttribute('fill', pal[Number(r.getAttribute('data-lvl'))]);
    });
  }

  // ---- 点击交互 ----
  function closePopup() {
    var p = document.getElementById('act-popup');
    if (p) p.remove();
  }

  function showPopup(day, list) {
    closePopup();
    var p = document.createElement('div');
    p.id = 'act-popup';
    var items = list.map(function (post) {
      return '<a href="' + post.u + '">' + post.t + '</a>';
    }).join('');
    p.innerHTML = '<div class="act-popup-card">' +
      '<div class="act-popup-head"><span>' + day + ' · ' + list.length + ' 篇</span>' +
      '<span class="act-popup-close" title="关闭">✕</span></div>' + items + '</div>';
    document.body.appendChild(p);
    p.addEventListener('click', function (e) {
      if (e.target === p || e.target.classList.contains('act-popup-close')) closePopup();
    });
  }

  function init() {
    var box = document.getElementById('activity-heatmap');
    if (!box || box.dataset.done) return;
    box.dataset.done = '1';
    box.innerHTML = '<p style="opacity:.6">正在加载动态…</p>';
    fetch('/activity.json').then(function (r) { return r.json(); }).then(function (posts) {
      if (!posts.length) { box.innerHTML = '<p>还没有发布过文章</p>'; return; }
      posts.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
      render(box, posts);
      var stats = document.getElementById('activity-stats');
      if (stats) {
        var y = new Date().getFullYear();
        var thisYear = posts.filter(function (p) { return p.d.indexOf(y) === 0; }).length;
        stats.innerHTML = '累计发文 <strong>' + posts.length + '</strong> 篇 · ' + y + ' 年发布 <strong>' + thisYear +
          '</strong> 篇 · 最近一篇 <strong>' + posts[posts.length - 1].d + '</strong>';
      }
    }).catch(function () { box.innerHTML = '<p>动态加载失败</p>'; });

    // 点击格子：单篇直达，多篇弹列表
    box.addEventListener('click', function (e) {
      var rect = e.target.closest('.act-cell');
      if (!rect) return;
      var list = dayPosts[rect.getAttribute('data-day')] || [];
      if (!list.length) return;
      if (list.length === 1) location.href = list[0].u;
      else showPopup(rect.getAttribute('data-day'), list);
    });

    var mo = new MutationObserver(function () { applyTheme(box); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
