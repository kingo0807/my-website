# 开发记录

记录过往 Codex 会话中做过的事情，便于后续工作参考。

## 会话记录

### 2026-09-03 · 网站复制按钮功能（01a064fa-f8d5-71f2-80c9-f414b914a612）

- 需求：给网站加一个按钮，按下自动复制对应内容。
- 做法：用 `data-copy-target` 属性让每个按钮指向对应内容，配合 `document.querySelectorAll` 统一绑定事件。
- 要点：支持多个复制按钮；每组内容用 `.copy_item` / `.copy_box` 包裹；`#copy_status` 做复制结果提示。

### 2026-09-03 · 本地文档上线到网站（01a06521-7167-7ab3-955a-9b7c56713c66）

- 需求：把桌面上的 `teedoc_local_build_preview_merged.md`、`域名与网站上线入门指南.md`、`git.md` 放进网站不同页面。
- 结果：文档已分页面整理并部署到 GitHub Pages。
- 上线地址：
  - https://wangyuyue.xyz/
  - https://wangyuyue.xyz/guides/
  - https://wangyuyue.xyz/guides/teedoc/
  - https://wangyuyue.xyz/guides/domain-hosting/
  - https://wangyuyue.xyz/guides/git/

### 2026-09-04 · 网站公开访问（01a06b79-d151-73d0-9293-83354a426b5b）

- 需求：怎样让别人也能访问我的网站。
- 结果：讲解了 GitHub Pages + 自定义域名的发布流程，网站已公开可访问。
- 下一步建议：在首页加一个「我的项目」区域，展示项目名称、简介和链接。

### 2026-09-08 · CC Switch 深链导入配置详解（01a07e91-c095-70d2-9e57-8e72629a1189）

- 需求：讲解某配置（CC Switch deep link 导入 OpenAI provider）的实现原理；探讨能否按名字修改已有 OpenAI 配置。
- 结论：
  - 只靠现有 `ccswitch://` 深链：不能按名字更新。
  - 不改源码：删除旧 OpenAI 再重新导入。
  - 改源码：给深链加 `updateByName=true` 参数，调用已有 `ProviderService::update` 接口按名字更新。
  - 最稳定方案：按内部 `provider_id` 更新，而非按显示名称。

### 2026-09-14 · 手机版「家庭 AI 助手」（纯网页 + PWA）

- 需求：让亲人在手机上用，能拍照/传文件提问，尽量像手机应用。
- 结论：不需要自建后端。DeepSeek 官方接口允许跨域（预检会回显 Origin），静态网页可以直接调用。
- 做法要点：
  - 模型改用 deepseek-flash（支持图像理解）；旧的 deepseek-chat / deepseek-reasoner 已不在模型列表里。
  - 照片在手机本地压缩后以 base64 发送；PDF 用 pdf.js 在本地逐页转成图片；docx 在浏览器里直接解压读取正文。
  - API Key 不写进网页源码，只存在使用者手机的 localStorage 里。
  - 做成 PWA：有图标、可添加到主屏幕、独立窗口打开，并带离线外壳缓存。
- 上线地址：https://wangyuyue.xyz/chat/
- 源码：chat/ 目录；本地测试脚本在 C:\Users\wyy\Documents\phone-ai（执行 node test-all.mjs，26 项自检）。

### 2026-09-22 · 后端指南上线为第 4 篇（session-6008e45b-3f32-4f9a-aeae-d3211ecec4f4）

- 需求：盘点这个网站还有哪些可以学的；选定先把「给静态网站加后端」搬上线。
- 做法：把 `_chat-src/guide/backend-guide.md`（原第 24–32 节）整理成独立指南 `_guides/backend-serverless.md`，章节重编为 1–9，补 front matter（`order: 4`）与前置知识链接。
- 变更：`_guides/domain-hosting.md` 第 9 节增加指向新指南的链接；新指南由 guides 集合自动出现在 /guides/ 目录页。
- 上线地址：https://wangyuyue.xyz/guides/backend-serverless/
- 待办（盘点时发现，尚未处理）：
  - 没有 CI：`test-all.mjs` 要手动跑，上线靠手动 push；
  - 站点缺 SEO 基础件：无 description / og:* / favicon / robots.txt / sitemap.xml / 404 页；
  - `sw.js` 的 `CACHE` 版本号要手改，改了网页不升版本家人可能看旧页面；
  - `_chat-src/backend-server.mjs`、`_chat-src/backend-worker.js` 与 `backend/` 下的文件逐字节相同，`deploy.mjs` 不同步它们；
  - `gen-icons.mjs:4` 把 sharp 路径写死到 `C:/Users/wyy/deepseek-harness/node_modules/.pnpm/sharp@0.35.3...`。

### 2026-09-23 · 第 5 篇指南《发布与回滚》上线（session-8bd9c78a-4a1f-47ab-8da3-f2dd05102b7e）

- 需求：问「这个网站关于运维还有什么可以学的」。先做运维向盘点，再选定把「发布与回滚」写成第 5 篇。
- 做法：把仓库里现成但没成文的运维素材（`deploy.mjs` 的产物同步、`sw.js` 的缓存策略、`test-all.mjs` 的 26 项自检、`wrangler.toml` 的域名自动化）整理成独立指南 `_guides/publish-and-rollback.md`，章节 1–11，front matter `order: 5`，由 guides 集合自动出现在 /guides/ 目录页。
- 盘点结论（运维向）分三层：
  - 已成文：`domain-hosting.md` 12–23 节（SSH、Docker、反代、证书、安全基线、分层排障）、`backend-serverless.md` 5–9 节（部署、密钥、验证清单）、`git.md` 附录 A（发布链路故障）。
  - 有实物没成文：源/产物分离与漂移检测、`sw.js` 缓存版本、Worker 与 Node 两种后端形态、`test-all.mjs` 闸门、密钥与口令治理、两份不受管的后端副本。
  - 仍缺：CI、监控告警、备份与恢复演练、版本 tag、SEO 基础件、无服务器形态的安全加固、依赖可复现。
- 核实到的仓库事实（2026-09-23）：
  - `_chat-src/` 与 `chat/` 的 7 个同名文件 SHA256 全部一致，当前无漂移；
  - `git tag` 数量为 0，发布没有版本节点；
  - `_chat-src/backend-worker.js`、`_chat-src/backend-server.mjs` 与 `backend/` 下同名文件逐字节相同，而 `deploy.mjs` 不同步这四个 → 已写进指南 2.2 节作为隐患；
  - 仓库无 `.github/`、无 robots.txt / sitemap.xml / 404.html，`_config.yml` 未启用插件（与上一轮待办一致）。
- 修正上一轮记录里的一处不准：「`sw.js` 版本号不改、家人可能看旧页面」。实际导航请求是网络优先（改 `index.html` 立刻生效），缓存优先的只有图标与 `manifest.json`；且新 SW 安装时 `install` 会用 `addAll(SHELL)` 重新抓一遍外壳。指南按代码写清了机制，没有照抄旧结论。
- 文档：`_guides/backend-serverless.md` 第 9 节末尾补一条指向新指南的交叉链接。
- 上线地址：https://wangyuyue.xyz/guides/publish-and-rollback/
- 环境备注：受限沙箱下 `git push` 会先后被 schannel（`SEC_E_NO_CREDENTIALS`）和凭据助手的命名管道（`Win32 error 5`）挡住，需要更宽权限才能推送与联网验证；同理，`curl` 直连也拿不到证书。
- 仍未处理：没有 CI；站点缺 SEO 基础件；`CACHE` 版本号仍要手改；`gen-icons.mjs` 仍写死 sharp 路径。

### 2026-09-23 · 盘点后分批落地：基础件、阅读体验、CI、手机助手增强（session-a334fcba-75a1-4d39-a7d5-939c9ebb5b0e）

- 需求：先问「这个网站还能加什么」，拿到清单后要求「都做」。
- 第一批（站点基础件）：新增 `assets/favicon.svg`、`robots.txt`、`sitemap.xml`、404 页；`_config.yml` 加 `description` / `author`；首页与 `_layouts/article.html` 补 description、canonical、`og:*`。
- 过程中发现并修掉两个真问题：
  - 404 页原写成 `404.html`，而 Jekyll 只对 `.md` 跑 Markdown 转换，正文被当纯文本输出 → 改成 `404.md` 并保留 `permalink: /404.html`。
  - `{% for guide in site.guides | sort: 'order' %}` 在 GitHub Pages 上**不生效**，线上顺序退回 Jekyll 默认的"先日期、后路径"。先试把键名 `order` 改成 `guide_order`（无效），最终改成两步写法 `{% assign sorted = site.guides | sort: 'guide_order' %}` 才生效；目录页、`sitemap.xml`、404 三处模板同步。
- 第二批（阅读体验）：新增 `assets/js/article.js`（本页目录、代码块复制、深色模式、阅读进度、回到顶部，全部渐进增强）；`assets/css/article.css` 改用 CSS 变量并支持跟随系统 + 手动切换深色。
- 第三批（分享封面）：用本地 sharp 渲染 `assets/og-image.png`（1200×630，渲染脚本内联执行未留文件），`og:image` 与 `twitter:card=summary_large_image` 指向它。
- 第四批（记录治理）：`_config.yml` 加 `exclude`，`NOTES.md` / `README.md` 不再发布（线上 `/NOTES.md` 由 200 变 404）；新增公开更新日志 `updates.md`（`/updates/`），首页与文章页导航加入口。
- 第五批（CI 与版本节点）：新增 `_tools/check.mjs`（源/产物漂移、副本一致、模板 Liquid、指南 front matter、`_config.yml` 仍排除 NOTES 的回归、站内链接）与 `.github/workflows/ci.yml`；打 tag `site-2026-09-23`。
- 第六批（手机助手）：多会话历史（`fa_sessions` / `fa_session_current`，最多 20 条，新建/切换/删除，老的单条 `fa_chat` 自动迁移）、语音输入（webkitSpeechRecognition）、回答朗读（speechSynthesis）、`sw.js` 缓存升到 `family-assistant-v2`、manifest 加「说话」快捷方式（`?action=mic`）；两种后端都加每日额度（Worker 用 Cache API 按机房计数、Node 版进程内存计数；`DAILY_LIMIT` 默认 200，0 表示不限，记账失败一律放行）。自检从 26 项扩到 47 项。
- 核实过的机制：`{% for x in y | sort: 'k' %}` 与 `{% assign s = y | sort: 'k' %}` 在 GitHub Pages 上的行为差异（前者静默不排序）；`Get-Content` 默认按 GBK 读 UTF-8 文件会把中文读坏，做语法校验时要显式 `-Encoding UTF8`。
- 仍待处理：Worker 的额度改动要 `npx wrangler deploy` 才生效（沙箱内无法联网执行）；额度按机房计数属"大致额度"，要精确得换 KV；文章页视觉效果需人工在浏览器确认；`gen-icons.mjs` 仍写死 sharp 绝对路径。

### 2026-09-23 · 本轮收尾：部署后端、补一条发布链路经验（session-a334fcba-75a1-4d39-a7d5-939c9ebb5b0e）

- 权限变化后完成了原先做不了的两件事：
  - `node _chat-src/backend/node_modules/wrangler/bin/wrangler.js deploy` 部署 Worker 成功（版本 `bc606c6c-5e35-4697-9467-7376c11fb5e2`，域名 `api.wangyuyue.xyz`）。注意 wrangler 包的 `bin` 里 `cf-wrangler.js` 只有 `dev|build` 两个子命令（Cloudflare 内部用的包装），真正能用的是 `bin/wrangler.js`。
  - 用 `wrangler dev --port 8799 --var DEEPSEEK_API_KEY:sk-test --var DAILY_LIMIT:2` 在本地实测额度：连打三次 `/chat`，前两次 401（上游拒绝了假钥匙）且响应头 `X-Quota-Remaining` 依次为 1、0，第三次 429。**说明 Cache API 记账确实生效、没有静默失败。**
- 新踩到的坑：本轮最后一次 push（含站点内容改动）之后，GitHub Pages **没有自动触发构建**——Actions 里只有新加的 CI 工作流，`pages build and deployment` 没有新记录，线上仍是上一版。用 `gh api -X POST repos/kingo0807/my-website/pages/builds` 手动排队后立刻恢复（`status=built`、`commit` 跟上）。这条已写进《发布与回滚》第 3 节。
- 结论：以后 push 完要**打开具体页面**确认内容变了，不能只看 push 输出或 Actions 列表里有没有 CI。

### 2026-09-24 · 手机助手：撤掉语音输入与朗读（session-a334fcba-75a1-4d39-a7d5-939c9ebb5b0e）

- 起因：用户在华为手机（`com.huawei.hmos.brows`）上反馈「有麦克风权限但语音没法用，朗读也没法用」。
- 排查结论：华为浏览器把 `webkitSpeechRecognition` 接口暴露出来，但调用时一律返回 `not-allowed`。用 `getUserMedia` 预检可以证明**麦克风本身没问题**（预检成功），卡住的是浏览器自己的语音识别服务——网页里无解。朗读一侧则是部分手机没有中文语音包（`speechSynthesis.getVoices()` 为空）。
- 中途做过的加固（现已随功能一起删除，但知识留下）：
  - 朗读要等 `voiceschanged`、优先挑中文语音；`cancel()` 之后**立刻** `speak()` 在 Chrome/Android 上会被吞掉，要隔 150ms；失败要显式报错而不是静默。
  - 语音识别应先用 `getUserMedia` 真取一次麦克风，把「权限被拒」和「识别服务被拒」区分开，否则提示会指错方向。
- 决定与结果：用户要求直接删除语音功能。已删除：`btn-mic`、语音识别整块逻辑（错误码表 / askMic / startRecognition）、朗读整块（speak / stopSpeaking / zhVoice）、设置里的语音诊断面板、`.voice-report` 与 `.icon-btn.rec` 样式、`?action=mic` 深链、manifest 的「说话」快捷方式；输入框提示回到「打字或拍照问我」。`sw.js` 缓存升到 `family-assistant-v3`（manifest 变了，外壳要换）。自检 64 → 58 项，其中新增 5 项是「语音相关代码必须已移除」的断言。
- 给用户的替代方案：点输入框，用**输入法自带的麦克风**说话（识别在输入法内完成，不依赖浏览器服务）；如果以后要做真正的网页语音输入，正确路径是「浏览器录音 → 后端 `/asr` → 第三方 ASR」，因为 Worker 跑在 Cloudflare 边缘（不在国内），能直连 OpenAI Whisper 一类的服务——需要单独申请 ASR key。
