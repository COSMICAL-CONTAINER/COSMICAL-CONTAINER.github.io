// 将 html-to-image 的 UMD 构建在生成期暴露为 /js/lib/html-to-image.js
// （库本身是 package.json 里的正式依赖，本地与 CI 构建均可复现）
const fs = require('fs');
const path = require('path');

hexo.extend.generator.register('vendor-html-to-image', function () {
  const file = path.join(hexo.base_dir, 'node_modules', 'html-to-image', 'dist', 'html-to-image.js');
  try {
    return [{ path: 'js/lib/html-to-image.js', data: fs.readFileSync(file, 'utf8') }];
  } catch (e) {
    hexo.log.warn('html-to-image 未安装，代码转图片功能不可用');
    return [];
  }
});
