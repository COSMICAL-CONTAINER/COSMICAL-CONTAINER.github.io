// 阅读与代码增强：
// 1) 文章内复制自动附加版权与原文链接（可在版权区开关，localStorage 记忆）
// 2) 代码块工具栏「复制为图片」：纯 Canvas 绘制 CodeSnap 风格卡片
//    （圆角 + mac 标题栏 + 文件名 + 阴影留白），剪贴板优先，失败降级下载
(function () {
  var SITE = { name: '寰宇体的世界', author: '寰宇体', base: 'https://cosmical-container.github.io' };
  var LS_KEY = 'copy-append-enabled';

  var FONT_SIZE = 14;
  var FONT_FAMILY = 'Consolas, Menlo, "Courier New", monospace';
  var LINE_H = 21;
  var PAD = 26;          // 卡片内边距
  var MARGIN = 28;       // 卡片外透明留白（放阴影）
  var BG = '#1e1e1e';
  var TITLE_BG = '#252526';
  var TEXT_COLOR = '#d4d4d4';
  // VSCode Dark+ token 配色
  var COLORS = {
    comment: '#6a9955', string: '#ce9178', number: '#b5cea8',
    keyword: '#569cd6', type: '#4ec9b0', params: '#9cdcfe',
    meta: '#c586c0', title: '#dcdcaa', function_: '#dcdcaa',
    'function': '#dcdcaa', built_in: '#dcdcaa', symbol: '#9cdcfe',
    property: '#9cdcfe', variable: '#9cdcfe', tag: '#569cd6', attr: '#9cdcfe'
  };
  var EXT_MAP = { c: 'c', cpp: 'cpp', vb: 'vb', plaintext: 'txt', java: 'java', python: 'py' };

  function copyAppendEnabled() {
    return localStorage.getItem(LS_KEY) !== '0'; // 默认开启
  }

  function dataUrlToBlob(dataUrl) {
    var bin = atob(dataUrl.split(',')[1]);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: 'image/png' });
  }

  function toast(msg) {
    var t = document.getElementById('enhance-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'enhance-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.style.opacity = '0'; }, 1800);
  }

  // ---- 复制附加版权 ----
  function initCopyAppend() {
    if (!/^\/posts\//.test(location.pathname)) return;
    var box = document.querySelector('.post-copyright');
    if (!box || document.getElementById('copy-append-switch')) return;

    var row = document.createElement('div');
    row.className = 'copyright-copy-toggle';
    row.innerHTML = '<label><input type="checkbox" id="copy-append-switch">' +
      '复制本文内容时，自动附加版权与原文链接</label>';
    box.appendChild(row);

    var sw = row.querySelector('input');
    sw.checked = copyAppendEnabled();
    sw.addEventListener('change', function () {
      localStorage.setItem(LS_KEY, sw.checked ? '1' : '0');
    });

    document.addEventListener('copy', function (e) {
      if (!sw.checked) return;
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
      var node = sel.anchorNode;
      var el = node && (node.nodeType === 1 ? node : node.parentElement);
      var article = document.getElementById('article-container');
      if (!el || !article || !article.contains(el)) return;
      var text = sel.toString();
      if (!text) return;
      var suffix = '\n\n———————————————————\n' +
        '作者：' + SITE.author + '\n' +
        '原文链接：' + SITE.base + location.pathname + '\n' +
        '来源：' + SITE.name + '（转载请注明出处）';
      e.clipboardData.setData('text/plain', text + suffix);
      e.preventDefault();
    });
  }

  // ---- Canvas 绘制 CodeSnap 卡片 ----
  function extractLines(fig) {
    // 每行 = [{ text, color }...]，未知类沿用默认色
    var lines = [];
    var lineEls = fig.querySelectorAll('td.code .line');
    if (!lineEls.length) { // 无行结构（plaintext），整块按行取文本
      var pre = fig.querySelector('pre');
      (pre ? pre.textContent.split('\n') : ['']).forEach(function (t) {
        lines.push([{ text: t, color: TEXT_COLOR }]);
      });
      return lines;
    }
    lineEls.forEach(function (lineEl) {
      var arr = [];
      (function walk(node, color) {
        node.childNodes.forEach(function (child) {
          if (child.nodeType === 3) {
            arr.push({ text: child.nodeValue.replace(/\n/g, ''), color: color });
          } else if (child.nodeType === 1) {
            var cls = (child.getAttribute('class') || '').trim();
            walk(child, COLORS[cls] || color);
          }
        });
      })(lineEl, TEXT_COLOR);
      lines.push(arr.length ? arr : [{ text: '', color: TEXT_COLOR }]);
    });
    return lines;
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function renderCodesnap(fig) {
    var lang = (fig.className.match(/highlight ([\w+#-]+)/) || [])[1] || 'txt';
    var fname = 'main.' + (EXT_MAP[lang] || 'txt');
    var lines = extractLines(fig);

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    ctx.font = FONT_SIZE + 'px ' + FONT_FAMILY;

    // 计算内容宽度
    var maxLineW = 0;
    lines.forEach(function (line) {
      var w = 0;
      line.forEach(function (tk) { w += ctx.measureText(tk.text).width; });
      if (w > maxLineW) maxLineW = w;
    });

    var BAR_H = 42;
    var cardW = Math.max(Math.ceil(maxLineW) + PAD * 2, 420);
    var cardH = BAR_H + PAD + lines.length * LINE_H + PAD;
    canvas.width = cardW + MARGIN * 2;
    canvas.height = cardH + MARGIN * 2;

    ctx = canvas.getContext('2d');
    ctx.font = FONT_SIZE + 'px ' + FONT_FAMILY;
    ctx.textBaseline = 'middle';

    // 卡片阴影 + 圆角主体
    var x = MARGIN, y = MARGIN, r = 10;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 10;
    roundRectPath(ctx, x, y, cardW, cardH, r);
    ctx.fillStyle = BG;
    ctx.fill();
    ctx.restore();

    // 标题栏
    ctx.save();
    roundRectPath(ctx, x, y, cardW, cardH, r);
    ctx.clip();
    ctx.fillStyle = TITLE_BG;
    ctx.fillRect(x, y, cardW, BAR_H);
    var dotY = y + BAR_H / 2;
    [['#ff5f56', x + 18], ['#ffbd2e', x + 38], ['#27c93f', x + 58]].forEach(function (d) {
      ctx.beginPath();
      ctx.arc(d[1], dotY, 6, 0, Math.PI * 2);
      ctx.fillStyle = d[0];
      ctx.fill();
    });
    ctx.fillStyle = '#9da5b4';
    ctx.font = '12px ' + FONT_FAMILY;
    ctx.fillText(fname, x + 78, dotY + 1);
    ctx.font = FONT_SIZE + 'px ' + FONT_FAMILY;
    ctx.restore();

    // 代码文字
    ctx.save();
    roundRectPath(ctx, x, y, cardW, cardH, r);
    ctx.clip();
    var ty = y + BAR_H + PAD + LINE_H / 2;
    lines.forEach(function (line) {
      var tx = x + PAD;
      line.forEach(function (tk) {
        ctx.fillStyle = tk.color || TEXT_COLOR;
        ctx.fillText(tk.text, tx, ty);
        tx += ctx.measureText(tk.text).width;
      });
      ty += LINE_H;
    });
    ctx.restore();

    return canvas.toDataURL('image/png');
  }

  // ---- 代码块「复制为图片」 ----
  function attachImageButtons() {
    var figs = document.querySelectorAll('#article-container figure.highlight');
    var missing = 0;
    figs.forEach(function (fig) {
      var tools = fig.querySelector('.highlight-tools');
      if (!tools) { missing++; return; }

      // 补齐主题复制按钮的悬浮提示
      var copyBtn = tools.querySelector('.copy-button');
      if (copyBtn && !copyBtn.getAttribute('title')) copyBtn.setAttribute('title', '复制代码');

      if (tools.querySelector('.copy-image-btn')) return;
      var btn = document.createElement('i');
      btn.className = 'fas fa-camera copy-image-btn';
      btn.title = '复制为图片';
      tools.appendChild(btn);
      btn.addEventListener('click', function () {
        if (btn.dataset.busy) return;
        btn.dataset.busy = '1';
        btn.style.opacity = '.35';
        try {
          var dataUrl = renderCodesnap(fig);
          if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
            navigator.clipboard.write([new ClipboardItem({ 'image/png': dataUrlToBlob(dataUrl) })])
              .then(function () { toast('代码图片已复制到剪贴板'); })
              .catch(function () { downloadImage(dataUrl); toast('剪贴板不可用，已保存为图片'); });
          } else {
            downloadImage(dataUrl);
            toast('浏览器不支持剪贴板图片，已保存为图片');
          }
        } catch (err) {
          toast('图片生成失败');
        }
        btn.style.opacity = '';
        delete btn.dataset.busy;
      });
    });
    return missing;
  }

  function downloadImage(dataUrl) {
    var a = document.createElement('a');
    a.download = 'code-' + new Date().toISOString().slice(0, 10) + '.png';
    a.href = dataUrl;
    a.click();
  }

  function init() {
    initCopyAppend();
    if (attachImageButtons() > 0) {
      // Butterfly 的工具栏由其脚本在 DOMContentLoaded 后生成，轮询等待
      var tries = 0;
      var timer = setInterval(function () {
        if (attachImageButtons() === 0 || ++tries >= 20) clearInterval(timer);
      }, 300);
    }
  }

  // 调试/测试钩子
  window.__renderCodesnap = renderCodesnap;

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
