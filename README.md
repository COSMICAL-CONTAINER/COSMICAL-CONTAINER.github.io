# 寰宇体的世界

[![Build & Deploy](https://github.com/COSMICAL-CONTAINER/COSMICAL-CONTAINER.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/COSMICAL-CONTAINER/COSMICAL-CONTAINER.github.io/actions/workflows/deploy.yml)
[![Hexo](https://img.shields.io/badge/Hexo-8.x-0E83CD)](https://hexo.io/)
[![Butterfly](https://img.shields.io/badge/主题-Butterfly-f9b2e5)](https://butterfly.js.org/)
[![License](https://img.shields.io/badge/文章-CC%20BY--NC--SA%204.0-lightgrey)](./LICENSE)

> never give up

我的个人博客，线上地址：**[https://cosmical-container.github.io](https://cosmical-container.github.io)**

## 关于文章时间

每篇文章的发布日期使用的都是**代码当时的创建/修改时间**，
所以在归档和动态页里能看到 2019~2025 连续的创作时间线。
还有更多项目在整理中，会陆续上传。

- **源码分支**：`main`（本分支，文章 Markdown + 主题配置 + 构建脚本）
- **发布分支**：`master`（Actions 自动构建的静态产物，Pages 从这里服务）
- **发布方式**：推送到 `main` 后 GitHub Actions 自动构建上线，约 1 分钟

---

## 📝 写博客标准流程（三步走）

### 第 1 步：写文章

```bash
cd E:\github\hexo-blog
hexo new post "文章标题"
```

会在 `source/_posts/` 生成 `文章标题.md`，同时生成**同名资源文件夹**（放图片用）。
用 VS Code 打开写正文；图片丢进同名文件夹，正文里直接写：

```markdown
![图片说明](图片文件名.png)
```

> ⚠️ 不要引用外链图床（CSDN 等），有防盗链且会失效。图片一律下载放进资源文件夹。

**代码块书写约定**（文件名显示在代码块工具栏中央，"复制为图片"的截图也会带上）：

- 正文里的**代码片段**：普通 ` ```c ` 围栏，不加标题
- 文章末尾的**完整文件**：用 Hexo 原生代码标题语法把文件名写进 md，
  标题和围栏之间隔几行说明文字也没关系：

````markdown
## V1.6 完整代码

```c Print.h
…完整文件内容…
```

## 测试程序 main.c（V1.6）

```c main.c
…完整文件内容…
```
````

### 第 2 步：本地预览（确认没问题再发布）

```bash
hexo clean        # 清理缓存（遇到页面没更新就先执行这句）
hexo server       # 启动本地预览
```

浏览器打开 <http://localhost:4000> 检查文章排版、图片、代码块。
按 `Ctrl+C` 停止预览。

### 第 3 步：发布上线

```bash
git add -A
git commit -m "发布文章：文章标题"
git push
```

推送后 GitHub Actions 自动构建（约 1 分钟），线上即可访问。
构建进度看仓库的 **Actions** 标签页。

---

## 🆕 新电脑 / 重装系统后从零恢复

```bash
# 1. 安装 Node.js LTS（https://nodejs.org）和 Git，然后：
npm install -g hexo-cli

# 2. 拉取源码（源码永远在云端，不怕电脑坏）
git clone https://github.com/COSMICAL-CONTAINER/COSMICAL-CONTAINER.github.io.git hexo-blog
cd hexo-blog
git switch main        # 切到源码分支

# 3. 装依赖
npm install

# 4. 本地预览，确认能跑
hexo server

# 5. 配置 git 身份（首次提交前）
git config --global user.name "COSMICAL-CONTAINER"
git config --global user.email "你的GitHub邮箱"
```

---

## 🔧 常用命令速查

| 命令 | 作用 |
|---|---|
| `hexo new post "标题"` | 新建文章 + 资源文件夹 |
| `hexo clean` | 清除缓存和旧产物（页面异常先跑它） |
| `hexo server` | 本地预览 <http://localhost:4000> |
| `hexo generate` | 只生成不预览（一般不用手动跑） |
| `git add -A && git commit -m "说明" && git push` | 发布上线 |
| `npm update` | 更新 Hexo 和主题依赖 |

**应急发布**（Actions 挂了时手动推）：`hexo deploy`（会直接构建并推送到 master）

---

## ❓ 常见问题

**推送后线上没变化？**
等 1–2 分钟让 Actions 构建完（Actions 标签页看进度）；浏览器 Ctrl+F5 强刷。
本地预览页面没更新？先 `hexo clean` 再 `hexo server`。

**Actions 构建报 403 权限错误？**
仓库 Settings → Actions → General → Workflow permissions 选 **Read and write permissions**，重跑失败的任务。

**文章里图片裂了？**
检查图片是否在 `source/_posts/文章名/` 文件夹里、文件名和引用是否一致（含大小写）。

**想把某篇文章下线？**
删除对应 md 文件（或加 `hidden: true` 到 front matter），提交推送即可。

---

## 📁 目录结构

```
hexo-blog/
├── _config.yml               # 站点配置（URL、短链规则、部署）
├── _config.butterfly.yml     # Butterfly 主题配置（外观、菜单、侧栏）
├── source/
│   ├── _posts/               # ★ 所有文章在这里，一篇 md + 同名资源文件夹
│   ├── activity/             # 「动态」页（贡献热力图）
│   ├── lab/                  # 实验室（重力动画测试页）
│   ├── tags/ categories/     # 标签/分类页面
│   ├── img/ images/          # 站点素材（星空封面、头像）
│   ├── 404.html              # 智能跳转页（旧链接自动重定向）
│   └── js/                   # 自定义脚本（WakaTime 徽章等）
├── scripts/post-activity.js  # 生成期脚本：输出文章发布记录给热力图
└── .github/workflows/        # Actions 自动构建发布
```

## 📄 许可证

文章内容以 [CC BY-NC-SA 4.0](./LICENSE) 授权，转载请署名并附原文链接；站点配置与脚本部分以 MIT 授权。详见 [LICENSE](./LICENSE)。

## 🙏 致谢

[Hexo](https://hexo.io/) · [Butterfly](https://butterfly.js.org/) · [GitHub Actions](https://github.com/features/actions)
