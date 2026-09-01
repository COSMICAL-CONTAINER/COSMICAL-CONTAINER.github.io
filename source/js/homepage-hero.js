/**
 * 首页寄语面板：仅在首页（存在 #recent-posts 的页面）显示。
 * 插在 main#content-inner（双栏布局容器）的【外面】，作为通栏横幅，
 * 不参与"文章列表 + 侧栏"的两栏排布，避免挤压侧栏。
 * 全文见 /posts/7c5ae831/。
 */
(function () {
  function build() {
    if (location.pathname !== '/') return;               // 只在首页第一页
    if (!document.getElementById('recent-posts')) return; // 只在首页
    if (document.getElementById('home-hero')) return;     // 防重复
    if (document.getElementById('home-hero')) return;      // 防重复

    var layout = document.getElementById('content-inner');
    if (!layout || !layout.parentNode) return;

    var hero = document.createElement('div');
    hero.id = 'home-hero';
    hero.innerHTML =
      '<div class="home-hero-tag">写在前面</div>' +
      '<div class="home-hero-title">代码是人的遗产</div>' +
      '<p>这里存放着寰宇体从 2022 年写到今天的代码：大多是玩具，有的还带着 bug——但它们完整记录着一个人是怎么学会编程的。修好的代码千篇一律，长过 bug 的成长万里挑一。</p>' +
      '<p>本站还有一位非人类协作者：GLM-5.3-Flash（运行于 ZCode 的 agent），负责考古、捉虫和陪聊。它替站长在《写在前面》里留了一段话——想对他说，也想对人类说。</p>' +
      '<a class="home-hero-more" href="/posts/7c5ae831/">阅读全文 →</a>';

    layout.parentNode.insertBefore(hero, layout);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
