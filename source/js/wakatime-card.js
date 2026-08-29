// 把 WakaTime 每周编码时长徽章放进作者卡（头像/签名之下，社交图标之上），
// 呈现方式与用户 GitHub 主页一致：简介下方跟着徽章。
(function () {
  var WAKATIME_ID = '018b0e13-55cf-4bc6-bc0b-a8fdde9b7f14';

  function init() {
    var desc = document.querySelector('#aside-content .card-info .author-info-description');
    if (!desc || desc.parentElement.querySelector('.card-wakatime-badge')) return;
    var wrap = document.createElement('div');
    wrap.className = 'card-wakatime-badge is-center';
    wrap.style.cssText = 'padding:8px 0 4px';
    wrap.innerHTML =
      '<a href="https://wakatime.com/@' + WAKATIME_ID + '" target="_blank" rel="noopener">' +
        '<img src="https://wakatime.com/badge/user/' + WAKATIME_ID + '.svg" ' +
             'alt="WakaTime 累计编码时长" style="max-width:92%;height:auto">' +
      '</a>';
    desc.parentElement.insertBefore(wrap, desc.nextSibling);
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
