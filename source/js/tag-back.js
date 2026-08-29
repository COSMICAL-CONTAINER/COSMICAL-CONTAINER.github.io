// 标签详情页（/tags/xxx/）顶部插入「← 全部标签」返回按钮
(function () {
  function init() {
    // 只在标签详情页生效，/tags/ 列表页本身不加
    if (!/^\/tags\/[^/]+\/?$/.test(decodeURIComponent(location.pathname))) return;
    if (document.getElementById('back-to-tags')) return;
    var title = document.querySelector('#tag .article-sort-title');
    if (!title) return;
    var a = document.createElement('a');
    a.id = 'back-to-tags';
    a.className = 'back-to-tags';
    a.href = '/tags/';
    a.textContent = '← 全部标签';
    title.insertAdjacentElement('afterend', a);
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
