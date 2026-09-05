/**
 * 评论区使用指南入口
 * 在评论区标题上方插入一条指南链接，帮助第一次留言的访客。
 * 评论区懒加载，轮询等评论头渲染后插入一次即可。
 */
(function () {
  var timer = setInterval(function () {
    var head = document.querySelector('#post-comment .comment-head');
    if (!head || head.parentNode.querySelector('.comment-guide')) return;
    var tip = document.createElement('div');
    tip.className = 'comment-guide';
    tip.innerHTML =
      '💬 第一次留言？<a href="/posts/ea06439e/">点我看《评论区使用指南》</a>，两种评论方式都有说明';
    head.parentNode.insertBefore(tip, head);
    clearInterval(timer);
  }, 600);
  setTimeout(function () { clearInterval(timer); }, 30000);
})();
