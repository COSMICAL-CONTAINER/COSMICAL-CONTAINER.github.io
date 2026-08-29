// 生成期输出文章发布记录，供 /activity/ 贡献热力图使用
hexo.extend.generator.register('postActivity', function (locals) {
  const posts = locals.posts.sort('date').map(function (p) {
    return { d: p.date.format('YYYY-MM-DD'), t: p.title, u: '/' + p.path };
  });
  return { path: 'activity.json', data: JSON.stringify(posts) };
});
