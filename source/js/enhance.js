// 阅读与代码增强：
// 1) 文章内复制自动附加版权与原文链接（可在版权区开关，localStorage 记忆）
// 2) 代码块工具栏加「复制为图片」按钮（剪贴板优先，失败降级下载），并补齐复制按钮悬浮提示
(function () {
  var SITE = { name: '寰宇体的世界', author: '寰宇体', base: 'https://cosmical-container.github.io' };
  var LS_KEY = 'copy-append-enabled';

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

  // ---- 代码块「复制为图片」（剪贴板优先）----
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
        var target = fig.querySelector('table') || fig.querySelector('pre');
        if (!target || !window.htmlToImage) return;
        btn.dataset.busy = '1';
        btn.style.opacity = '.35';
        window.htmlToImage.toPng(target, { pixelRatio: 2, backgroundColor: '#1e1e1e' })
          .then(function (dataUrl) {
            btn.style.opacity = '';
            delete btn.dataset.busy;
            if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
              navigator.clipboard.write([new ClipboardItem({ 'image/png': dataUrlToBlob(dataUrl) })])
                .then(function () { toast('代码图片已复制到剪贴板'); })
                .catch(function () { downloadImage(dataUrl); toast('剪贴板不可用，已保存为图片'); });
            } else {
              downloadImage(dataUrl);
              toast('浏览器不支持剪贴板图片，已保存为图片');
            }
          })
          .catch(function () {
            btn.style.opacity = '';
            delete btn.dataset.busy;
            toast('图片生成失败');
          });
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

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
