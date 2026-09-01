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
  var BG = '#212121';
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
      // 短内容（一行代码、一个变量名）多为自用，不附加版权；阈值可按需调整
      if (!text || text.replace(/\s/g, '').length < 100) return;
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
    // 文件名优先取 md 里声明的代码标题（figcaption），无标题的片段回退按语言猜
    var fname = getFigFilename(fig) || 'main.' + (EXT_MAP[lang] || 'txt');
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

    // 渐变背景（CodeSnap 风格）
    var grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#667eea');
    grad.addColorStop(1, '#764ba2');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

  // ---- 代码块文件名标签（居中白字，不影响原有语言标签） ----
  // 文件名由 md 直接声明（Hexo 原生代码标题语法 ```lang 文件名，渲染为 figcaption）。
  // 这里只负责把 figcaption 文本搬到工具栏中央展示；纯片段代码块没有 figcaption，不加标签。
  function getFigFilename(fig) {
    var cap = fig.querySelector('figcaption span') || fig.querySelector('figcaption');
    return cap ? cap.textContent.trim() : '';
  }

  function initCodeFilenames() {
    if (!/^\/posts\//.test(location.pathname)) return;
    document.querySelectorAll('#article-container figure.highlight').forEach(function (fig) {
      if (fig.dataset.fileDone) return;
      fig.dataset.fileDone = '1';

      var filename = getFigFilename(fig);
      if (!filename) return;
      fig.classList.add('has-file-title');

      var tools = fig.querySelector('.highlight-tools');
      if (!tools) return;
      var label = document.createElement('span');
      label.className = 'code-filename-label';
      label.textContent = filename;
      tools.appendChild(label);
    });
  }

  // ---- 搜索高亮提示气泡：?highlight=xxx 进入时，提示当前页面的高亮情况 ----
  // 等高亮标记生成后统计：正文里有 → 提示关键词；
  // 匹配只在代码里（代码块会被跳过高亮）→ 提示"仅出现在代码中"；两者皆无 → 不弹
  function initHighlightNotice() {
    var kw = new URL(location.href).searchParams.get('highlight');
    kw = kw ? kw.trim() : '';
    if (!kw) return;
    if (document.getElementById('highlight-notice')) return;

    var keywords = kw.split(/\s+/).filter(Boolean);

    function countMarks() {
      var prose = 0, inCode = 0;
      document.querySelectorAll('mark.search-keyword').forEach(function (m) {
        if (m.closest('figure.highlight, pre, .highlight-tools, figcaption')) inCode++;
        else prose++;
      });
      return { prose: prose, inCode: inCode };
    }

    var attempts = 0;
    var timer = setInterval(function () {
      attempts++;
      var c = countMarks();
      if (c.prose > 0) {
        clearInterval(timer);
        showNotice('当前页面已高亮关键词：' + keywords.join('、'));
      } else if (c.inCode > 0) {
        clearInterval(timer);
        showNotice('关键词仅出现在代码中，未做高亮显示');
      } else if (attempts >= 10) {
        clearInterval(timer);
        showNotice('未在当前页面找到关键词：' + keywords.join('、'));
      }
    }, 250);
  }

  function showNotice(text) {
    if (document.getElementById('highlight-notice')) return;
    var box = document.createElement('div');
    box.id = 'highlight-notice';
    var textEl = document.createElement('span');
    textEl.className = 'hn-text';
    textEl.textContent = text;
    var close = document.createElement('span');
    close.className = 'hn-close';
    close.innerHTML = '&times;';
    close.title = '关闭';
    box.appendChild(textEl);
    box.appendChild(close);
    function dismiss() {
      clearTimeout(box._timer);
      box.style.opacity = '0';
      setTimeout(function () { box.remove(); }, 300);
    }
    close.addEventListener('click', dismiss);
    box._timer = setTimeout(dismiss, 10000);
    document.body.appendChild(box);
  }

  // ---- 文案替换：本站的 categories 用于承载系列，界面统一显示为「系列」 ----
  function relabelCategoryWording() {
    document.querySelectorAll('.headline, .article-sort-title').forEach(function (el) {
      if (el.textContent.trim() === '分类') el.textContent = '系列';
      else if (el.textContent.indexOf('分类 - ') === 0) el.textContent = el.textContent.replace('分类 - ', '系列 - ');
    });
    if (document.title.indexOf('分类: ') === 0) document.title = document.title.replace('分类: ', '系列: ');
    if (document.title.indexOf('分类 - ') === 0) document.title = document.title.replace('分类 - ', '系列 - ');
  }

  // ---- 文章标签（主题默认在文末，移动到顶部横幅标题下方） ----
  function initTopTags() {
    if (!/^\/posts\//.test(location.pathname)) return;
    if (document.querySelector('.post-meta__tag-list.in-banner')) return;
    // tag_share 由 Butterfly 脚本动态生成，轮询等待其出现
    var tries = 0;
    var timer = setInterval(function () {
      var tagList = document.querySelector('.tag_share .post-meta__tag-list');
      var postInfo = document.getElementById('post-info');
      var meta = document.getElementById('post-meta');
      var title = postInfo ? postInfo.querySelector('.post-title') : null;
      if ((tagList && postInfo && meta && title) || ++tries >= 20) {
        clearInterval(timer);
        if (tagList && postInfo && meta && title && !tagList.classList.contains('in-banner')) {
          tagList.classList.add('in-banner', 'top-tags-done');
          postInfo.insertBefore(tagList, meta);   // 标题下方、发布时间上方
        }
      }
    }, 300);
  }

  // ---- 文章标题公式美化：O(N^N!) → N 的指数上标 ----
  function beautifyPostTitle() {
    if (!/^\/posts\//.test(location.pathname)) return;
    var el = document.querySelector('.post-title');
    if (el && el.textContent.indexOf('O(N^N!)') !== -1) {
      el.innerHTML = el.textContent.replace(/O\(N\^N!\)/g, 'O(N<sup>N!</sup>)');
    }
  }

  // ---- 代码块「复制为图片」 ----
  function attachImageButtons() {
    var figs = document.querySelectorAll('#article-container figure.highlight');
    var missing = 0;
    figs.forEach(function (fig) {
      var tools = fig.querySelector('.highlight-tools');
      if (!tools) { missing++; return; }

      // 补齐主题按钮的悬浮提示
      var copyBtn = tools.querySelector('.copy-button');
      if (copyBtn && !copyBtn.getAttribute('title')) copyBtn.setAttribute('title', '复制代码');
      var expandBtn = tools.querySelector('.expand');
      if (expandBtn && !expandBtn.getAttribute('title')) expandBtn.setAttribute('title', '收起 / 展开代码');

      if (tools.querySelector('.copy-image-btn')) return;
      var btn = document.createElement('i');
      btn.className = 'fas fa-camera copy-image-btn';
      btn.title = '复制为图片';
      tools.appendChild(btn);
      btn.addEventListener('click', function () {
        if (btn.dataset.busy) return;
        var target = fig.querySelector('table') || fig.querySelector('pre');
        if (!target) return;
        // 代码被收起时渲染会是空的，提示先展开
        if (!target.offsetParent) { toast('请先展开代码块再生成图片'); return; }
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

  // ---- 自动换行切换按钮 ----
  function attachWrapToggles() {
    var figs = document.querySelectorAll('#article-container figure.highlight');
    var missing = 0;
    figs.forEach(function (fig) {
      var tools = fig.querySelector('.highlight-tools');
      if (!tools) { missing++; return; }
      if (tools.querySelector('.wrap-toggle-btn')) return;
      var btn = document.createElement('i');
      btn.className = 'fas fa-align-left wrap-toggle-btn';
      btn.title = '切换自动换行';
      tools.appendChild(btn);
      btn.addEventListener('click', function () {
        var on = fig.classList.toggle('wrap-enabled');
        btn.classList.toggle('active', on);
        toast(on ? '已开启自动换行' : '已关闭自动换行');
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
    // 单个增强失败不拖垮其他增强
    [initCopyAppend, initCodeFilenames, initTopTags, beautifyPostTitle,
     initHighlightNotice, relabelCategoryWording].forEach(function (fn) {
      try { fn(); } catch (e) { /* 忽略单个功能的异常 */ }
    });
    var missing = attachImageButtons() + attachWrapToggles();
    if (missing > 0) {
      // Butterfly 的工具栏由其脚本在 DOMContentLoaded 后生成，轮询等待
      var tries = 0;
      var timer = setInterval(function () {
        if (attachImageButtons() + attachWrapToggles() === 0 || ++tries >= 20) clearInterval(timer);
      }, 300);
    }
  }

  // 调试/测试钩子
  window.__renderCodesnap = renderCodesnap;

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
