'use strict'

// 标签层级数据源
// 读取 _config.yml 里的 tag_tree（父标签 → 子标签），
// 构建时生成 /tagmap.json，供两处消费：
//   1. /tags/ 页面的两级分组（source/js/tag-group.js）
//   2. 导航栏"标签导图"页 /lab/tagmap/
// 文章 front-matter 不需要任何改动；子标签照常写，
// 没登记进 tag_tree 的标签会进"其他标签"，构建时会在终端列出来提醒归组。

hexo.extend.generator.register('tagmap', function (locals) {
  const tree = hexo.config.tag_tree || {}

  const info = Object.create(null)
  locals.tags.each(function (tag) {
    info[tag.name] = {
      count: tag.posts.length,
      slug: tag.slug,
      posts: tag.posts.map(function (p) { return p.path })
    }
  })

  const urlOf = function (name) {
    return info[name] ? '/tags/' + info[name].slug + '/' : null
  }

  const claimed = Object.create(null)
  const groups = Object.keys(tree).map(function (parent) {
    claimed[parent] = true
    const seen = Object.create(null)
    if (info[parent]) info[parent].posts.forEach(function (p) { seen[p] = 1 })

    const children = tree[parent].map(function (name) {
      claimed[name] = true
      if (info[name]) info[name].posts.forEach(function (p) { seen[p] = 1 })
      return { name: name, count: info[name] ? info[name].count : 0, url: urlOf(name) }
    })

    return {
      name: parent,
      count: info[parent] ? info[parent].count : 0,
      total: Object.keys(seen).length,
      url: urlOf(parent),
      children: children
    }
  })

  const ungrouped = locals.tags.filter(function (t) { return !claimed[t.name] })
    .map(function (t) { return { name: t.name, count: t.posts.length, url: '/tags/' + t.slug + '/' } })
    .sort(function (a, b) { return b.count - a.count })

  if (ungrouped.length) {
    hexo.log.info('[tag_tree] 未归组标签（可在 _config.yml 的 tag_tree 里登记）: ' +
      ungrouped.map(function (t) { return t.name + '(' + t.count + ')' }).join(', '))
  }

  return {
    path: 'tagmap.json',
    data: JSON.stringify({ groups: groups, ungrouped: ungrouped })
  }
})
