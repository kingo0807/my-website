---
layout: article
title: "发布与回滚：一次改动怎样才算真的上线"
date: 2026-09-23
description: "产物、自检、Pages 构建、浏览器缓存四层关卡，以及出问题时从哪一层退回去。"
guide_order: 5
---

# 发布与回滚：一次改动怎样才算真的上线

> 适用对象：网站已经在跑、改动开始变多，并且遇到过「我这儿是新的、你那儿还是旧的」的人  
> 前置知识：同站的[《给静态网站加后端（无服务器函数）》](/guides/backend-serverless/)（部署、密钥、验证清单）与[《域名、网站上线与 Ubuntu 服务器指南》](/guides/domain-hosting/)（DNS、HTTPS、分层排障）  
> 当前实例：`wangyuyue.xyz`——网页在 GitHub Pages，`/chat/` 是一个带离线缓存的 PWA，接口挂在 Cloudflare Worker 上  
> 更新日期：2026-09-23

前两篇讲的是"怎么上线""怎么加后端"。这一篇讲**改完之后的事**：一次改动要穿过四层关卡才算真的到用户手里，以及出了问题该从哪一层退回去。

## 1. 一次改动要穿过四层

```text
你的编辑器
   ↓  ①源目录 → 产物目录      （_chat-src/ → chat/，靠 deploy.mjs）
   ↓  ②自检                  （test-all.mjs，绿灯才继续）
   ↓  ③Git 提交 → Pages 构建   （push 触发，构建结果在 Actions）
   ↓  ④浏览器缓存             （HTTP 缓存 + Service Worker 缓存）
用户手机上看到的页面
```

每一层都有自己的"我这儿是正常的"：脚本跑成功、自检全绿、构建成功，都**不代表**用户看到了新版本。真正要背下来的是这张表：

| 层 | 谁负责 | 怎么验证 | 怎么退回去 |
| --- | --- | --- | --- |
| 源 → 产物 | `_chat-src/deploy.mjs` | 两边同名文件哈希一致 | 重跑同步脚本 |
| 自检 | `_chat-src/test-all.mjs` | 输出 `失败 0 项` | 修代码，不要跳过 |
| 提交 → 构建 | Git + GitHub Pages | Actions 里构建成功 | `git revert` 后再 push |
| 浏览器缓存 | `chat/sw.js` | DevTools，或换台设备试 | 只能发一个修好的新版本 |

## 2. 第一层：源目录与产物目录

这个站有两个最容易混的目录：

| 目录 | 身份 | 会不会被发布 |
| --- | --- | --- |
| `_chat-src/` | 源码、脚本、后端 | 不会。Jekyll 忽略 `_` 开头的目录 |
| `chat/` | 线上网页的**产物** | 会，线上地址是 `/chat/` |

规矩只有一条，写在 `_chat-src/README.md` 里：**只改源码，不改 `chat/`**。那边是产物，下次同步就被覆盖。

同步由 `_chat-src/deploy.mjs` 完成：

```bash
cd _chat-src
node deploy.mjs
```

它做三件事：

1. 把 7 个文件复制到 `../chat/`：`index.html`、`manifest.json`、`sw.js` 和四个图标；
2. 少一个文件就打印 `!! 缺少 <文件名>`，而不是静默跳过——**发布脚本最怕的不是报错，是安静地少发一个文件**；
3. 顺带把 `_data/projects.yml` 里首页项目卡片的描述换成新版。

路径是相对脚本自身算的，所以整个目录搬走也不用改代码；重复跑结果一样，不用担心跑两次出问题。

### 2.1 发布前先做一次"漂移检测"

源码和产物一旦不一致，你改的东西就永远不会上线。**发布前比一次哈希，比盯着屏幕看靠谱**：

```powershell
# 在仓库根目录执行：比较 _chat-src/ 与 chat/ 下的同名文件
function Get-H12([string]$p) { (Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.Substring(0,12) }
foreach ($f in @('index.html','manifest.json','sw.js','icon-180.png','icon-192.png','icon-512.png','icon-512-maskable.png')) {
  $a = Get-H12 "_chat-src/$f"; $b = Get-H12 "chat/$f"
  "{0,-24} {1}  {2}  {3}" -f $f, $a, $b, $(if ($a -eq $b) { 'OK' } else { '<<< 漂移' })
}
```

判断标准：全部 `OK` 才能提交；出现 `<<< 漂移` 说明产物比源码旧、或者有人手改了产物，先跑 `node deploy.mjs` 再继续。

> 2026-09-23 实测：这 7 个文件当前全部一致。这段检测已经固化成 `node _tools/check.mjs`，不用再手敲。

### 2.2 一个已知隐患：两份不受管的后端副本

`_chat-src/backend-worker.js`、`_chat-src/backend-server.mjs` 与 `_chat-src/backend/worker.js`、`_chat-src/backend/server.mjs` **逐字节相同**，但 `deploy.mjs` 只管 `chat/` 那一组，**不管这四个文件**。

也就是说：改后端时如果只改了一处，另一份会悄悄变成旧版本。**现在 `node _tools/check.mjs` 会把这两对副本做逐字节比较**，改漏一处 CI 直接变红——"有没有漂移"解决了，"到底该改哪一份"还没解决。两条出路，选一条：

- 让同步脚本把这四份一起管起来（保留副本，但纳入同步）；
- 或者删掉重复的两份，只留 `backend/` 下的正本，在 README 里指路过去。

**判断标准很简单：仓库里不该存在"内容相同、但谁也不知道该改哪一份"的文件。**

## 3. 第二层：自检闸门

`_chat-src/test-all.mjs` 是这个站的"发布前体检"：

```bash
cd _chat-src
node test-all.mjs      # 通过 47 项，失败 0 项
```

它覆盖四类东西，这个分类比数字本身更值得记：

| 类别 | 例子 | 为什么值得进自检 |
| --- | --- | --- |
| 能不能解析 | 页面脚本、`sw.js`、`manifest.json` | 语法错误的文件发上去就是白屏 |
| 关键常量 | 必须出现 `deepseek-flash`，不许再出现已下线的模型名 | 这类字符串最容易在重构时被改丢 |
| 安全回归 | `<script>` 被转义、`onerror` 被转义、`javascript:` 链接失效 | 渲染函数改一次就可能漏一次 |
| 纯逻辑 | 用真实 ZIP、真实 deflate 构造 docx 再解析 | 解析器不靠手工点，靠构造数据验 |

失败时脚本会设 `process.exitCode = 1`——这才是它真正的价值：**任何自动化都能拿它当闸门**。2026-09-23 起，`.github/workflows/ci.yml` 每次 push 都会替你跑它和 `node _tools/check.mjs`，忘了跑也拦得住。

## 4. 第三层：提交与 Pages 构建

Pages 是"分支发布"模式：`main` 分支、根目录、由 Jekyll 构建。所以 push 完成时，真正的构建才刚开始。

- **构建结果不在 `git push` 的输出里**。push 成功只代表代码到了 GitHub；构建在仓库的 Actions 页，工作流通常叫 `pages build and deployment`。**"push 成功但线上没变"十有八九是这一步失败了**，这时别去改 DNS。
- **偶尔连构建都不会被触发**：Actions 里只有你自己的 CI 工作流，压根没有新的 `pages build and deployment` 记录，线上自然一动不动。这不是你的代码有问题，可以手动请求一次构建：

  ```bash
  gh api -X POST repos/<owner>/<repo>/pages/builds        # 排队一次构建
  gh api repos/<owner>/<repo>/pages/builds/latest         # 看 status 和 commit
  ```

  2026-09-23 本站遇到过一次：一次包含站点内容改动的 push 之后，Pages 始终没有自动构建，线上还是上一版；用上面第一条命令触发后，`status` 变成 `built`、`commit` 也跟上了，站点随即更新。**所以"push 完看一眼线上"要落到具体页面上，而不是只看 push 的输出。**
- 新增一篇指南不需要碰任何配置：在 `_guides/` 放一个带 front matter 的 `.md`（`layout: article`、`title`、`description`、`guide_order`），它就会自动出现在 `/guides/` 目录页，`guide_order` 决定排序。
- **不要对 `main` 强推**：历史一改，发布记录跟着乱。改写历史的判断方式见[《Git 笔记》](/guides/git/)第三部分。

## 5. 第四层：浏览器缓存（最容易骗人的一层）

`chat/sw.js` 只做一件事：缓存应用外壳，让手机断网也能打开。它的策略可以直接读出来：

```js
var CACHE = 'family-assistant-v3';
var SHELL = ['./', './index.html', './manifest.json', './icon-192.png', /* ... */];
```

| 请求 | 策略 | 结果 |
| --- | --- | --- |
| 打开页面（`req.mode === 'navigate'`） | 网络优先，失败回落缓存 | 改 `index.html` **立刻生效** |
| 其他同源静态资源（GET） | 缓存优先，未命中才联网 | 图标、`manifest.json` **会一直用旧的** |
| 跨域请求、非 GET | 直接放行 | 接口请求永远不被缓存 |

`install` 阶段把 `SHELL` 里每个文件抓一份进 `CACHE`，然后 `skipWaiting()`；`activate` 阶段删掉**名字不等于 `CACHE`** 的旧缓存，然后 `clients.claim()`。

由此可以推出三件常被说反的事：

1. **"改了网页家人却看旧的"通常不是 HTML 的问题**。`index.html` 走网络优先，只要联网打开就是新的；真正会滞留的是图标和 `manifest.json` 这类缓存优先的资源。
2. **新 Service Worker 一旦装好，会往同一个 `CACHE` 名里重新抓一遍 `SHELL`**，所以即使不改版本号，外壳文件也会被刷新。而把 `CACHE` 改名（`v1` → `v2`）的作用是**把整个旧缓存删掉**——当新版本删掉或改名了某个资源时，这才是清理旧条目的手段。
3. **Service Worker 脚本自身的更新不走 HTTP 缓存**。`updateViaCache` 的默认值是 `imports`，意思是浏览器更新 SW 时**不会**拿 HTTP 缓存里的旧 `sw.js` 糊弄你（只有被 `importScripts()` 引入的脚本才会查 HTTP 缓存）。所以"改了 `sw.js` 但浏览器不更新"这个担心，方向是错的；更常见的是**页面根本没被重新打开**，SW 自然没机会检查更新。

`skipWaiting()` + `clients.claim()` 的代价也要知道：新 SW 会立刻接管，正在使用的页面会在中途换掉缓存实现。对这个小工具是好事（更新及时），对复杂应用就要谨慎。

验证缓存到底换没换：

```text
F12 → Application → Service Workers   看当前运行的是不是新的
F12 → Application → Cache Storage     看 family-assistant-v3 里存了哪些文件
```

手机上还可以"把主屏幕图标删掉重新添加"，这等于清掉这个应用的独立缓存。

**结论：版本号是发布的一部分，不是发布之后才想的事。**

## 6. 上线后的验证清单

按顺序做完这 5 步，才算"上线完成"：

```bash
# 1. Pages 构建是否成功：仓库 Actions 页看 pages build and deployment

# 2. 三个入口是否都在（能拿到状态码，说明 TLS 和路由都通）
curl -s -o /dev/null -w "%{http_code}  /\n"        https://wangyuyue.xyz/
curl -s -o /dev/null -w "%{http_code}  /guides/\n" https://wangyuyue.xyz/guides/
curl -s -o /dev/null -w "%{http_code}  /chat/\n"   https://wangyuyue.xyz/chat/

# 3. 静态页有没有真的换成新内容（拿一个刚改过的字符串去搜）
curl -s https://wangyuyue.xyz/guides/ | Select-String "刚改过的标题"

# 4. 后端还在不在（详见上一篇第 7 节）
curl -s -o /dev/null -w "%{http_code}\n" https://api.wangyuyue.xyz/balance

# 5. 密钥还在不在：期望 200 + JSON，而不是 500「后端还没有配置 DEEPSEEK_API_KEY」
```

第 3 步最容易被跳过：状态码 200 只说明"服务器在"，不说明"内容是新的"。

## 7. 回滚：四层各有各的动作

| 层 | 动作 | 生效速度 | 要注意 |
| --- | --- | --- | --- |
| 产物 | 重跑 `node deploy.mjs` | 立即（本地） | 产物是生成物，不要手改 |
| 源码 | `git revert <commit>` 后 push | 一个构建周期 | 不改写历史，只加一个反向提交 |
| 后端 | `wrangler deployments list` 看历史，`wrangler rollback` 退回上一版 | 很快 | **密钥不跟着回滚** |
| 浏览器 | **退不回去** | — | 只能发一个"修好的新版本" |

最后一行是这一节的重点：**已经装到用户设备上的 Service Worker，你收不回来**。你的"回滚"对用户来说就是"再发一版"。所以前端带离线缓存时，容错点不在"能不能撤回"，而在：

- 出错的功能要能被新版本盖掉，而不是必须清缓存才能修；
- 后端要有兜底（模型临时不可用时给一句人话提示），别让用户面对白屏；
- 想清楚"最坏情况下用户多久能拿到修复"——对这个站来说，是"他下次打开页面"。

**密钥为什么不回滚**：它存在平台的环境变量里，和代码是两条独立的线。回滚代码不会回滚密钥；密钥泄露时正确的动作是**轮换**（删旧的、建新的、覆盖变量）。这一条在[《给静态网站加后端》](/guides/backend-serverless/)第 6 节讲过。

> Cloudflare Workers 的部署历史与回滚命令以官方文档为准：[Rollbacks · Cloudflare Workers docs](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)。回滚只针对代码版本，并且需要本机 `wrangler` 已登录。

## 8. 给"哪一版"起个名字

现在的状态：提交信息已经是约定式提交（`feat(site):` / `chore:` / `fix(site):`），但**仓库里一个 tag 都没有**。结果是出问题时，没人能一句话回答"用户现在拿到的是哪一版"。

低成本的做法：

1. 每次"用户能感知"的改动打一个 tag，例如 `site-2026-09-23`；
2. `chat/sw.js` 里的 `CACHE` 名字带上同一串版本，例如 `family-assistant-2026-09-23`；
3. 提交信息写清"用户会看到什么变化"，而不是"更新文件"。

这样两边的版本号能对上：**页面上是哪一版、缓存里是哪一版，一眼可查。**

## 9. 常见故障：先判断在哪一层

| 现象 | 先查 |
| --- | --- |
| 我这台是新的，家人手机上还是旧的 | 第 4 层：SW 缓存（换个设备或清缓存复现一次） |
| `git push` 成功，线上完全没变 | 第 3 层：Actions 里的构建是否失败 |
| 页面变了，但主屏幕图标和名称没变 | 第 4 层：`manifest.json` 与图标是缓存优先 |
| 线上 404，本地正常 | `_` 开头目录不会被 Jekyll 发布 / 文件名大小写 / 相对路径 |
| `node deploy.mjs` 打印 `!! 缺少 xxx` | 第 1 层：源目录真的少了文件 |
| 接口 500「后端还没有配置 DEEPSEEK_API_KEY」 | 密钥层，不是代码层 |
| 新指南没出现在目录里 | front matter：`layout: article` 和 `guide_order` 有没有写 |

## 10. 一条最小发布流程

发布前：

- [ ] `node test-all.mjs` → 失败 0 项
- [ ] `node deploy.mjs` → 没有 `!! 缺少`
- [ ] `node _tools/check.mjs` → 全部通过

发布中：

- [ ] 提交信息写清"用户会看到什么变化"
- [ ] push 到 `main`（不 force）
- [ ] 用户可感知的改动打 tag

发布后：

- [ ] Actions 里 `pages build and deployment` 成功（连新记录都没有时，手动 `gh api -X POST repos/<owner>/<repo>/pages/builds`）
- [ ] 三个入口 `curl` 都是 200
- [ ] 抽一个刚改过的字符串，确认内容真的换了
- [ ] 后端 `/balance` 通
- [ ] 手机实测一次（电脑和手机是两套缓存）

出事时：

- [ ] 先定位层次（第 9 节），不要乱改 DNS
- [ ] 代码问题：`git revert` 后重新发布
- [ ] 后端问题：查部署历史并回滚
- [ ] 缓存问题：发一个新版本，别指望"撤回"

## 11. 关键结论

1. 发布不是"push 成功"，而是**四层全部到位**：产物、自检、构建、缓存；
2. 发布脚本必须会报错——安静地少发一个文件，比报错危险得多；
3. 自检的价值不在 47 这个数字，而在退出码：它能被自动化当闸门；
4. `push` 成功 ≠ 上线成功，构建失败要去 Actions 看，连构建都可能压根没被触发；
5. 缓存优先的资源（图标、`manifest.json`）是"看到旧版本"的头号嫌疑；
6. 已经下发的 Service Worker 收不回来，能做的只有"快速再发一版"；
7. 回滚分四层；密钥不跟着代码回滚，泄露了就轮换；
8. 版本号要从一开始就跟着发布走，事后补是补不回来的。

## 参考资料

- [Cloudflare Workers：部署回滚（官方文档）](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
- [MDN：ServiceWorkerRegistration.updateViaCache](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updateViaCache)
- [MDN：Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [GitHub Docs：配置 Pages 发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
