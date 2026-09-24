# 手机助手 · 源码

这里是 `https://wangyuyue.xyz/chat/` 那个网页的源码和工具。
目录名以下划线开头，Jekyll 不会发布它，所以这些东西不会出现在公网上。

## 网页本体

| 文件 | 说明 |
| --- | --- |
| `index.html` | 整个应用，单文件、无外部依赖 |
| `manifest.json` | 「添加到主屏幕」用的配置 |
| `sw.js` | Service Worker，离线外壳缓存 |
| `icon-*.png` / `icon.svg` | 图标，由 `gen-icons.mjs` 生成 |

改完源码后运行：

```bash
node deploy.mjs    # 把源码同步到 ../chat/（线上目录），然后自己 git 提交
```

**不要直接改 `../chat/` 里的文件**，那边是产物，下次同步会被覆盖。

## 自检

```bash
node test-all.mjs      # 自检：语法、模型名、Markdown/XSS 转义、docx 解压、多会话、语音、后端额度
```

## 工具

| 文件 | 说明 |
| --- | --- |
| `gen-icons.mjs` | 从 SVG 生成 192/512/180/maskable 四种 PNG 图标 |
| `deploy.mjs` | 把源码同步到 `../chat/` |
| `test-render.mjs` | 早期版本的渲染测试，保留备查 |

## 后端

见 `backend/`。线上跑的是 Cloudflare Worker（`backend/worker.js`）。
**密钥不在这个目录里**，它存在 Cloudflare 的环境变量中。

两个后端是同一套 API：`POST /chat` 与 `GET /balance`，都带「每台设备每天问几次」的额度
（环境变量 `DAILY_LIMIT`，默认 200，填 0 表示不限）：

- Worker 版用 Cache API 记账，按 Cloudflare 机房各自计数，是**大致**额度、零配置；
- Node 版用进程内存计数，重启清零。

想换成 Cloudflare KV 做全局精确计数：把 `countToday()` 里的 `caches.default` 换成 KV 读写即可，
调用方不用改。

```bash
cd backend
npx wrangler deploy          # 部署 Worker
npx wrangler secret list     # 查看已配置的密钥名（看不到值）
npx wrangler secret put X    # 设置或轮换密钥
```

`backend/server.mjs` 是同一套接口的 Node 版，用于自己的服务器（零依赖）
，不经过 Cloudflare。

## guide/

生成《域名与网站上线入门指南》第三部分用的脚本，与网页本身无关，保留备查。
