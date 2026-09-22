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
