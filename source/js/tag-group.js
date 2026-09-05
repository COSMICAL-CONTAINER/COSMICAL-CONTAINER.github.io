/**
 * 标签页两级分组
 * 只在 /tags/ 页面生效：拉取 /tagmap.json，
 * 把标签云重排为一个一个的「卡片框」：父标签做框头，子标签装在框里，
 * 没归组的标签放进「其他标签」框。数据或脚本失败时保持原样。
 */
(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn()
    else document.addEventListener('DOMContentLoaded', fn)
  }

  ready(function () {
    if (!/^\/tags\/?$/.test(location.pathname.replace(/\/+$/, '') + '/')) return
    var list = document.querySelector('.tag-cloud-list')
    if (!list) return

    fetch('/tagmap.json', { credentials: 'same-origin' })
      .then(function (r) { return r.json() })
      .then(function (data) {
        var byName = {}
        list.querySelectorAll('a').forEach(function (a) {
          byName[a.textContent.trim()] = a
        })

        function badge(text) {
          var s = document.createElement('span')
          s.className = 'tag-tree-count'
          s.textContent = text
          return s
        }

        function box(headName, headUrl, headCount, headTotal) {
          var card = document.createElement('div')
          card.className = 'tag-tree-group'
          var head = document.createElement('div')
          head.className = 'tag-tree-head'

          var title = document.createElement('span')
          title.className = 'tag-tree-parent'
          title.appendChild(document.createTextNode(headName))
          if (headUrl) {
            var link = document.createElement('a')
            link.href = headUrl
            link.className = 'tag-tree-head-link'
            link.appendChild(title)
            head.appendChild(link)
          } else {
            head.appendChild(title)
          }
          if (typeof headTotal === 'number') head.appendChild(badge('共 ' + headTotal + ' 篇'))
          card.appendChild(head)

          var kids = document.createElement('div')
          kids.className = 'tag-tree-kids'
          card.appendChild(kids)
          return { card: card, kids: kids }
        }

        var frag = document.createDocumentFragment()

        data.groups.forEach(function (g) {
          var b = box(g.name, g.url, g.count, g.total)
          g.children.forEach(function (c) {
            var a = byName[c.name]
            if (!a) return
            a.classList.add('tag-tree-child')
            b.kids.appendChild(a)
          })
          frag.appendChild(b.card)
        })

        var plain = box('其他标签', null, null, null)
        data.ungrouped.forEach(function (t) {
          var a = byName[t.name]
          if (a) plain.kids.appendChild(a)
        })
        frag.appendChild(plain.card)


        list.innerHTML = ''
        list.appendChild(frag)
        list.classList.add('tag-tree-ready')
      })
      .catch(function () { /* 保持默认标签云 */ })
  })
})()
