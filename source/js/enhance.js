// 阅读与代码增强：
// 1) 文章内复制自动附加版权与原文链接（可在版权区开关，localStorage 记忆）
// 2) 代码块工具栏加「保存为图片」按钮（html-to-image）
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

  // ---- 代码块「保存为图片」 ----
  function attachImageButtons() {
    var figs = document.querySelectorAll('#article-container figure.highlight');
    var missing = 0;
    figs.forEach(function (fig) {
      var tools = fig.querySelector('.highlight-tools');
      if (!tools) { missing++; return; }
      if (tools.querySelector('.copy-image-btn')) return;
      var btn = document.createElement('i');
      btn.className = 'fas fa-camera copy-image-btn';
      btn.title = '代码保存为图片';
      tools.appendChild(btn);
      btn.addEventListener('click', function () {
        if (btn.dataset.busy) return;
        var target = fig.querySelector('table') || fig.querySelector('pre');
        if (!target || !window.htmlToImage) return;
        btn.dataset.busy = '1';
        btn.style.opacity = '.35';
        window.htmlToImage.toPng(target, { pixelRatio: 2, backgroundColor: '#212121' })
          .then(function (dataUrl) {
            var a = document.createElement('a');
            a.download = 'code-' + new Date().toISOString().slice(0, 10) + '.png';
            a.href = dataUrl;
            a.click();
            try {
              if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
                navigator.clipboard.write([new ClipboardItem({ 'image/png': dataUrlToBlob(dataUrl) })]).catch(function () {});
              }
            } catch (err) { /* 剪贴板不可用时忽略，已下载 */ }
            btn.style.opacity = '';
            delete btn.dataset.busy;
          })
          .catch(function () { btn.style.opacity = ''; delete btn.dataset.busy; });
      });
    });
    return missing;
  }

  function initCodeImage() {
    if (attachImageButtons() > 0) {
      // Butterfly 的工具栏由其脚本在 DOMContentLoaded 后生成，轮询等待
      var tries = 0;
      var timer = setInterval(function () {
        if (attachImageButtons() === 0 || ++tries >= 20) clearInterval(timer);
      }, 300);
    }
  }

  function init() {
    initCopyAppend();
    initCodeImage();
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
