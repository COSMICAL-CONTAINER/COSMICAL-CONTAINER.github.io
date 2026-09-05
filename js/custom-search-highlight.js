/**
 * 站内搜索关键词高亮的修补：
 * Butterfly 的 ?highlight=xxx 会扫全部文本节点（含代码块和代码框标题），
 * 造成代码里的标识符被拦腰高亮（如搜 auto 命中 AutoWrite）。
 * 本脚本在高亮完成后，把代码相关区域内的 search-keyword 标记还原为纯文本，
 * 只保留正文段落里的高亮。
 */
(function () {
  var CODE_SELECTOR = 'figure.highlight, pre, .highlight-tools, figcaption';

  function cleanCodeHighlight() {
    var marks = document.querySelectorAll('mark.search-keyword');
    for (var i = 0; i < marks.length; i++) {
      var mark = marks[i];
      if (!mark.closest || !mark.closest(CODE_SELECTOR)) continue;
      var parent = mark.parentNode;
      if (!parent) continue;
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    }
  }

  function run() {
    // 主题的高亮挂在 window load 上，多跑几遍保证在其之后清理
    cleanCodeHighlight();
    setTimeout(cleanCodeHighlight, 100);
    setTimeout(cleanCodeHighlight, 500);
  }

  if (document.readyState === 'complete') {
    run();
  } else {
    window.addEventListener('load', run);
  }
})();
