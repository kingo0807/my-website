# 第三部分：给静态网站加后端（无服务器函数）

## 24. 为什么静态网页不能自己当后端

GitHub Pages 这类静态托管只能"把文件发出去"：它不执行你的代码，也没有地方保存密码。

访客打开网页时，网页的全部内容（包括 JavaScript）都会下载到他的浏览器里。因此：

- 任何写进网页文件的 API Key，等于**公开发布**；
- 前端也做不了"只有我知道的判断"，例如校验一个口令。

所以"用网页做后端"这句话，正确的形态是：

> **页面留在原域名上，后端另挂一个能保密的计算服务。**

两者可以是不同平台、不同域名，浏览器跨域访问即可（前提见下一节）。

## 25. 前提一：浏览器跨域（CORS）

浏览器默认禁止一个网页调用另一个域名的接口，除非对方在响应头里明确允许。

判断方法不用写代码，一条命令就够：

```bash
curl -s -i -X OPTIONS "https://api.deepseek.com/chat/completions" \
  -H "Origin: https://wangyuyue.xyz" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type"
```

看返回里有没有 `access-control-allow-origin`：

- 有，并且值和你的站点一致 → 网页可以直接调这个接口，**本来就不需要后端**；
- 没有，或值不匹配 → 浏览器会拦掉，必须自己加一层后端转发。

DeepSeek 官方接口属于前者：它会按请求回显 `Origin`，并带 `vary: origin`，说明允许任意站点直接调用。

那什么时候才需要后端？—— **当你不想把 Key 放在别人设备上时。**

## 26. 前提二：HTTPS 是硬约束

页面本身是 `https://`，浏览器会拦截它去请求 `http://` 的资源，这叫**混合内容（mixed content）**。

因此：

- 后端地址**必须**是 `https://`；
- `http://192.168.1.5:8787` 这种写法**一定失败**，不必尝试；
- 自建服务器必须配好证书（宝塔可申请 Let's Encrypt），或者套一层隧道。

另外：国内家宽的 **80 / 443 端口常被运营商封**，自建时往往要换高位端口（如 8443），地址写成 `https://域名:8443`。

## 27. 选型：三种后端形态

| 形态 | 例子 | 优点 | 代价 |
| --- | --- | --- | --- |
| 无服务器函数 | Cloudflare Worker | 免费、7×24、自带 HTTPS、无需公网 IP 和端口转发 | 需要注册平台账号 |
| 自己的服务器 | 家里的 Ubuntu + 宝塔 | 完全自主可控 | 必须一直开机、要有公网 IP、要端口转发、要管证书 |
| 云服务器 | 阿里云 / 腾讯云轻量 | 稳定 | 要花钱；域名指向境内服务器需要备案 |

无服务器函数把"HTTPS、常驻在线、公网可达"这三件事一次性解决了，而这三件恰好是自建服务器最费劲的地方。

一个预防性提醒：Cloudflare 免费版默认给的 `*.workers.dev` 域名在国内**经常连不上**（未实测，属于规避）。如果域名本身就托管在 Cloudflare，可以直接把 Worker 绑到自己的子域名上，绕开这个问题。

## 28. 部署流程（以 Cloudflare Worker 为例）

### 28.1 前置条件

- Node.js 18 以上；
- 域名已托管在 Cloudflare（用 `curl -s -L https://rdap.org/domain/你的域名` 可以查到当前名称服务器）；
- 一个 Cloudflare 账号。

### 28.2 工程目录

```text
backend/
├── worker.js        # Worker 代码：转发请求，并在服务器端补上 API Key
├── wrangler.toml    # 部署配置
└── package.json
```

`wrangler.toml` 内容：

```toml
name = "my-backend"
main = "worker.js"
compatibility_date = "2026-09-01"

[[routes]]
pattern = "api.你的域名"
custom_domain = true
```

`custom_domain = true` 会让 Cloudflare **自动创建 DNS 记录并签发证书**，不需要手动加解析。

### 28.3 安装 wrangler 并登录

```powershell
npm install wrangler --no-fund --no-audit
npx wrangler --version
npx wrangler login
```

`wrangler login` 会打开浏览器要求授权。授权后凭据存在本机，不会明文出现在任何命令里。

### 28.4 部署

```powershell
npx wrangler deploy
```

成功时会看到类似输出，其中包含绑定到的自定义域：

```text
Uploaded my-backend (1.44 sec)
Deployed my-backend triggers (2.94 sec)
  api.你的域名 (custom domain)
```

### 28.5 配置密钥

**密钥不写进代码，而是作为加密环境变量存在平台上**：

```powershell
npx wrangler secret put DEEPSEEK_API_KEY
```

回车后粘贴值，**不回显是正常的**。查看已配置的密钥名（只看得到名字，看不到值）：

```powershell
npx wrangler secret list
```

改了密钥之后**不需要重新部署**，下一次请求就会用新值。

## 29. 密钥管理

### 29.1 三条铁律

1. 不写进网页文件；
2. 不写进代码仓库；
3. 不贴到聊天窗口、截图或 Issue 里 —— 一旦贴出，就当它已经泄露，立刻轮换。

### 29.2 密钥与代码分离

密钥只以**环境变量**的形式存在于平台，代码里只写变量名。这样：

- 换密钥不需要改代码、不需要重新部署；
- 代码仓库即使公开，也不含任何密钥。

### 29.3 轮换流程

1. 到服务商后台删掉旧 Key，新建一个；
2. 用 `wrangler secret put` 覆盖平台上的变量；
3. 验证一次接口仍能正常回答。

网页文件**不需要改动**，因为它只认后端地址，不认密钥本身。

### 29.4 访问控制

后端一旦部署，地址通常是公开可达的：任何知道地址的人都能调用它并消耗你的额度。部署前应想清楚这一点 —— 在平台上打开用量告警，并确认是否需要额外的访问限制。

## 30. 部署后的验证清单

按顺序做完这几项，才算真的可用（`<密钥>` 换成实际值，域名换成自己的）：

```bash
# 1. DNS 是否解析
nslookup api.wangyuyue.xyz

# 2. 证书是否就绪（能拿到状态码就说明 TLS 握手成功）
curl -s -o /dev/null -w "%{http_code}\n" https://api.wangyuyue.xyz/

# 3. 预检是否放行来自自己站点的请求
curl -s -i -X OPTIONS https://api.wangyuyue.xyz/chat \
  -H "Origin: https://wangyuyue.xyz" \
  -H "Access-Control-Request-Method: POST"

# 4. 无权限的请求是否被拒绝
curl -s -X POST https://api.wangyuyue.xyz/chat \
  -H "Origin: https://wangyuyue.xyz" -H "Content-Type: application/json" \
  -d '{"model":"deepseek-flash","messages":[{"role":"user","content":"hi"}]}'
# 期望被拒绝，而不是拿到回答

# 5. 有权限的请求是否真的回答
curl -s -X POST https://api.wangyuyue.xyz/chat \
  -H "Origin: https://wangyuyue.xyz" -H "Content-Type: application/json" \
  -d '{"model":"deepseek-flash","messages":[{"role":"user","content":"Reply OK"}],"stream":false}'
# 期望 200，且 choices[0].message.content 有内容

# 6. 流式是否正常（网页逐字显示依赖这个）
curl -s -N -X POST https://api.wangyuyue.xyz/chat \
  -H "Origin: https://wangyuyue.xyz" -H "Content-Type: application/json" \
  -d '{"model":"deepseek-flash","messages":[{"role":"user","content":"Count 1 to 5"}],"stream":true}'
# 期望多行 data: {...}，最后一行 data: [DONE]
```

第 3、4、6 项最容易被忽略：预检不通浏览器就直接拦掉；没有访问控制等于把额度挂在网上；流式不通则"逐字显示"会变成"等半天一次性出现"。

## 31. 常见坑与排错

### 31.1 npm 报 "node 不是内部或外部命令"

现象：执行 `npm install` 时，某个依赖的安装脚本通过 `cmd.exe` 调用 `node` 失败，但当前 PowerShell 里 `node --version` 明明是好的。

原因：PATH 里存在**畸形路径**（例如多了一个引号），导致 `cmd.exe` 解析 PATH 时找不到 node。

解决：在命令里显式补一次干净的路径：

```powershell
$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
```

### 31.2 PowerShell 把 UTF-8 文件显示成乱码

现象：用 `Get-Content` 读 UTF-8 的 JSON/YAML，中文变成 `瀹跺涵` 这类乱码，甚至让 `ConvertFrom-Json` 报错。

原因：Windows PowerShell 5.1 默认按系统 ANSI 代码页（简体中文为 GBK）解码，**不是文件坏了**。

判断方法：

```powershell
# 按 UTF-8 明确读取
$text = [IO.File]::ReadAllText($path)
# 检查有没有替换字符（有就说明真的解错了）
$text.Contains([char]0xFFFD)
```

用 Node 验证最稳：`node -e "console.log(JSON.parse(require('fs').readFileSync(p,'utf8')).name)"`

### 31.3 笔记里的 DNS 说明会过时

域名一旦迁移过 DNS 服务商，旧笔记就会把人带向错误的排查方向。

**排查 DNS 问题的第一步，永远是用 WHOIS/RDAP 查当前真实的名称服务器**，而不是相信笔记：

```bash
curl -s -L https://rdap.org/domain/你的域名
```

返回的 `nameservers` 字段才是权威答案。

### 31.4 Jekyll 不会发布以点开头的目录

GitHub Pages 用 Jekyll 构建时会**忽略以 `.` 开头的文件和目录**。所以要让站点提供 `/.well-known/assetlinks.json`（把网页打包成安卓应用时需要）这类文件，必须在 `_config.yml` 里加：

```yaml
include: [".well-known"]
```

否则文件推上去了，线上依然 404。

## 32. 成本与日常运维

| 项目 | 说明 |
| --- | --- |
| 无服务器函数 | 免费额度通常远超个人或家庭用量 |
| 模型调用 | 按 token 计费，在服务商的用量页面查看 |
| 查看后端日志 | Cloudflare 在 `dash.cloudflare.com` → Workers & Pages → 对应 Worker → 实时日志 |
| 暂停后端 | 同一页面里可以停用或删除 |

**注意**：停用后端后，网页会退回"需要自己填 Key"或直接报连不上，但不会泄露任何东西。

