// 构建后瘦身：public/pluginsSrc 里 vendor 了全部支持的功能库（约 9MB），
// 本站只用到下面 5 个，其余（mermaid/twikoo/gitalk/mathjax/katex/各类评论系统等）全部移除。
// 用法：hexo generate 之后执行 `node prune-plugins.js`（已挂到 npm run build）。
// 注意：不要放进 scripts/ 目录——Hexo 会把 scripts/ 下的 js 当作插件在启动时自动执行。
const fs = require('fs');
const path = require('path');

const KEEP = new Set(['@fortawesome', '@fancyapps', '@egjs', 'butterfly-extsrc', 'typed.js']);

const target = path.join(__dirname, 'public', 'pluginsSrc');
if (!fs.existsSync(target)) {
  console.log('prune-plugins: public/pluginsSrc 不存在，跳过');
} else {
  let removed = 0;
  for (const name of fs.readdirSync(target)) {
    if (KEEP.has(name)) continue;
    fs.rmSync(path.join(target, name), { recursive: true, force: true });
    removed++;
  }
  console.log(`prune-plugins: 已移除 ${removed} 个未使用的库，保留 ${KEEP.size} 个`);
}
