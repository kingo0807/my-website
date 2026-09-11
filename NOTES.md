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
