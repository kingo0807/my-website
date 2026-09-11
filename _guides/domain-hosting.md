---
layout: article
title: "域名、网站上线与 Ubuntu 服务器指南"
date: 2026-09-03
description: "域名解析、网站上线与 Ubuntu 服务器操作指南。"
---

# 域名、网站上线与 Ubuntu 服务器实操指南

> 适用对象：第一次购买域名、准备把静态网页发布到互联网的人  
> 当前实例：`wangyuyue.xyz` + GitHub Pages  
> 更新日期：2026-09-03  
> 扩展环境：Proxmox 中的 Ubuntu 虚拟机、宝塔面板、Docker  
> 本文不展开 Git 的日常提交、分支和推送操作；只介绍受限网络下转移 GitHub 仓库所需的最小操作。

## 使用前先选择上线方式

本文包含两条彼此独立、也可以并存的上线路线：

| 路线 | 适合场景 | 域名入口 | HTTPS 由谁处理 |
| --- | --- | --- | --- |
| GitHub Pages | 纯静态网页、个人主页、项目介绍 | 当前根域名 `wangyuyue.xyz` | GitHub Pages 自动管理 |
| Ubuntu 自托管 | Docker、PHP、数据库、后端服务 | 建议新建 `app.wangyuyue.xyz` 等子域名 | 宝塔/Nginx、Caddy 或隧道平台 |

建议保留当前已经生效的 GitHub Pages 根域名，不要为了测试服务器反复修改现有的四条 A 记录。需要把虚拟机里的服务公开时，优先增加一个新的子域名，例如 `app.wangyuyue.xyz`。这样两条路线互不影响，也更容易排障和回退。

## 1. 先分清四个东西

### 域名

域名是网站的地址，例如 `wangyuyue.xyz`。购买域名只代表你取得了这个名称在注册期内的使用权，不会自动产生网页，也不会自动提供服务器。

### 网站内容

网站内容是浏览器最终显示的文件。静态网站通常至少需要一个入口文件：

```text
index.html
```

还可以有 CSS、JavaScript、图片、字体等资源。

### 网站托管

托管服务负责保存网站文件，并在访客访问时把内容发给浏览器。本例使用 GitHub Pages。它适合个人主页、作品集、说明页和纯前端网站，不适合直接运行 PHP、传统数据库程序或需要长期运行的后端服务。

### DNS

DNS 类似互联网通讯录，负责告诉浏览器：“这个域名应该去哪里找网站”。DNS 只负责指路，不保存网页内容，也不能修复网页本身的 404 或代码错误。

## 2. 一次访问是怎样发生的

```text
访客输入 https://wangyuyue.xyz
              ↓
DNS 查询域名指向哪里
              ↓
返回 GitHub Pages 的服务地址
              ↓
GitHub Pages 识别自定义域名
              ↓
返回网站中的 index.html
```

因此，一个网站能正常打开，需要同时满足：

1. 网站文件已经成功发布；
2. DNS 记录正确并已传播；
3. 托管平台已经绑定该域名；
4. HTTPS 证书已经签发并生效。

## 3. 常见 DNS 记录

| 记录类型 | 作用 | 常见用途 |
| --- | --- | --- |
| `A` | 把名称指向 IPv4 地址 | 根域名指向服务器或托管平台 |
| `AAAA` | 把名称指向 IPv6 地址 | 网站支持 IPv6 时使用 |
| `CNAME` | 把一个名称指向另一个域名 | `www` 指向托管平台提供的域名 |
| `TXT` | 保存文本验证信息 | 域名所有权、证书、邮件安全验证 |
| `MX` | 指定邮件服务器 | 使用 `name@example.com` 邮箱 |
| `NS` | 指定权威 DNS 服务商 | 决定由哪家平台管理整个域名解析 |

### 主机记录中的 `@` 和 `www`

- `@` 表示根域名，即 `wangyuyue.xyz`；
- `www` 表示 `www.wangyuyue.xyz`；
- 主机记录通常只填前缀，不填完整域名；
- 根域名和 `www` 是两个不同的 DNS 名称，需要分别配置。

### TTL 是什么

TTL 是 DNS 缓存时间。修改记录后，旧结果可能继续被部分网络缓存一段时间。TTL 为 10 分钟不代表所有平台恰好 10 分钟完成检查；托管平台自身还有独立的后台轮询和证书签发过程。

## 4. 当前域名映射配置

`wangyuyue.xyz` 当前使用以下记录：

| 主机记录 | 类型 | 记录值 |
| --- | --- | --- |
| `@` | `A` | `185.199.108.153` |
| `@` | `A` | `185.199.109.153` |
| `@` | `A` | `185.199.110.153` |
| `@` | `A` | `185.199.111.153` |
| `www` | `CNAME` | `kingo0807.github.io` |

GitHub Pages 中的 Custom domain 应填写：

```text
wangyuyue.xyz
```

不要填写 `https://`，不要填写网页路径，也不要写成 `wangyuyue.xyz/my-website`。

截至 2026-09-03，Cloudflare 公共 DNS `1.1.1.1` 和 Google 公共 DNS `8.8.8.8` 均已返回上述四个 A 记录，并且 `www.wangyuyue.xyz` 已指向 `kingo0807.github.io`。这说明当前 DNS 映射已经公开生效。

## 5. 从网页文件到正式域名的完整顺序

### 第一步：准备首页

发布目录根部应存在 `index.html`。文件名、扩展名和大小写都要正确。

### 第二步：启用 GitHub Pages

在网站项目的 `Settings → Pages` 中选择：

```text
Source: Deploy from a branch
Branch: main
Folder: /(root)
```

这里只是使用 Pages 的必要界面设置，本文不展开 Git 的版本管理知识。

### 第三步：先验证临时网址

先访问：

```text
https://kingo0807.github.io/my-website/
```

临时网址能够显示首页，才说明网站文件和 Pages 发布基本正常。若这里已经 404，应先检查 `index.html` 和 Pages 发布设置，而不是继续修改 DNS。

### 第四步：在 Pages 绑定自定义域名

在 Custom domain 中填写 `wangyuyue.xyz` 并保存。托管平台必须知道这个域名属于哪个网站；仅添加 DNS 记录并不能代替这一步。

### 第五步：配置阿里云 DNS

为 `@` 添加四条 A 记录，为 `www` 添加一条 CNAME 记录。记录值见本文第 4 节。不要同时给 `www` 添加互相冲突的 A 和 CNAME 记录。

### 第六步：等待 DNS 检查

GitHub 显示 `DNS check in progress` 时，代表后台还在验证。公共 DNS 已正确时，不要频繁删除、重建相同记录；这样只会重新触发缓存和检查过程。官方说明 DNS 变化可能需要最长约 24 小时传播。

### 第七步：开启 HTTPS

GitHub 显示 DNS 检查成功后，勾选 `Enforce HTTPS`。GitHub Pages 会为正确绑定的域名申请和管理证书，通常不需要另外购买阿里云 SSL 证书。

最终应使用：

```text
https://wangyuyue.xyz
https://www.wangyuyue.xyz
```

## 6. 如何判断故障在哪一层

### 临时网址也显示 404

问题通常在网站发布层，而非域名层。重点检查：

- 发布目录内是否真的有 `index.html`；
- Pages 选择的分支和目录是否正确；
- 文件名是否误写成 `index.html.txt`；
- 页面资源路径是否写错。

### 临时网址正常，自定义域名打不开

问题通常在 DNS 或 Custom domain：

- 检查 Custom domain 是否只填写了域名；
- 检查 `@` 的 A 记录是否完整；
- 检查 `www` 的 CNAME 是否正确；
- 检查是否存在冲突或过期的 A、AAAA、CNAME 记录；
- 等待缓存和平台检查完成。

### 显示证书或隐私错误

这通常表示 DNS 已经到达托管平台，但 HTTPS 证书尚未签发或配置尚未稳定。先确认 DNS 检查成功，再等待证书生成并启用 `Enforce HTTPS`。不要忽略浏览器警告强行对外发布。

### 页面能打开，但样式或图片丢失

这通常是网页资源路径问题，不是 DNS 问题。优先使用以当前网站根路径为准的正确相对路径，并检查文件名大小写。Windows 对大小写不敏感，但网站服务器可能区分大小写。

## 7. DNS 检查方法

Windows PowerShell 可以只读检查，不会修改任何配置：

```powershell
Resolve-DnsName -Name wangyuyue.xyz -Type A -Server 1.1.1.1 -DnsOnly
Resolve-DnsName -Name wangyuyue.xyz -Type A -Server 8.8.8.8 -DnsOnly
Resolve-DnsName -Name www.wangyuyue.xyz -Type CNAME -Server 1.1.1.1 -DnsOnly
```

判断标准：

- 两个公共解析器都返回四个正确 IP，说明根域名已经传播；
- `www` 返回 `kingo0807.github.io`，说明 CNAME 已生效；
- DNS 正确但 GitHub 仍在检查，应优先等待，而不是重复改记录。

## 8. 备案、服务器位置与访问稳定性

域名在哪里买，与是否必须备案不是一回事。决定因素主要是网站实际使用的服务器或接入服务所在地：

- 使用中国内地服务器对外提供网站服务，通常需要完成 ICP 备案；
- 使用中国内地以外的托管服务，一般不走中国内地服务器的备案接入流程；
- 如果以后迁移到阿里云中国内地服务器，应先按接入商要求办理备案；
- GitHub Pages 面向中国内地访客时，访问速度和稳定性不一定可控。正式商业网站应根据受众、可靠性和合规要求选择托管位置。

备案与具体合规要求可能变化，正式运营前应以接入商和主管部门的最新规定为准。

## 9. 静态网站能做什么，不能做什么

适合 GitHub Pages 的内容：

- 个人介绍和简历；
- 项目或作品展示；
- 产品说明和活动页面；
- 文档、博客和纯前端小工具。

通常需要其他后端服务的功能：

- 用户注册和登录；
- 数据库读写；
- 订单、支付和会员系统；
- 需要隐藏密钥的接口；
- 传统 PHP、Java、Python 常驻服务。

前端代码会被访客下载到浏览器，因此任何密码、Token、API 密钥都不能直接写入网页文件。

## 10. 日常维护清单

- [ ] 在域名到期前续费，避免域名失效或被他人重新注册；
- [ ] 保留正确的 DNS 记录，不随意启用不明的通配符记录；
- [ ] 定期确认 `https://wangyuyue.xyz` 可以访问；
- [ ] 更新网站后，同时检查电脑和手机显示效果；
- [ ] 不在公开网页或截图中泄露身份证号、邮箱、账号、Token 等信息；
- [ ] 若更换托管平台，先记录旧 DNS，再按新平台要求逐项迁移；
- [ ] 出现故障时按“网页发布 → DNS → 域名绑定 → HTTPS”的顺序定位。

## 11. 关键结论

1. 域名只是地址，网站内容必须放在托管平台上；
2. DNS 负责指路，Custom domain 负责让托管平台认领这个域名；
3. 根域名和 `www` 是两个独立名称；
4. DNS 正确不代表网页文件一定正确，404 往往属于发布层；
5. HTTPS 应在域名验证成功后启用；
6. 当前 `wangyuyue.xyz` 的公共 DNS 映射已经生效，无需反复修改。

---

# 第二部分：Ubuntu 虚拟机、宝塔与 Docker

## 12. 当前实验环境与已验证边界

前面的实际操作得到以下结果：

| 项目 | 已观察或已验证的状态 |
| --- | --- |
| 虚拟机 | Proxmox 中的 Ubuntu，APT 源显示为 Ubuntu 24.04 `noble` |
| 虚拟机地址 | 实验时使用 `192.168.2.165` |
| Docker | Docker Engine 29.7.2，服务为 `active` |
| Compose | Docker Compose v5.5.0 |
| 容器验证 | 离线导入 `hello-world` 后出现 `Hello from Docker!`，说明客户端、守护进程和容器运行链路正常 |
| 宝塔 | 修复阶段版本文件显示 13.0.0；`bt 14` 能输出面板信息 |
| 宝塔网页 | 不能仅凭 `bt 14` 判断网页入口完全正常，仍应在浏览器中重新验证登录页和站点功能 |

这里最重要的边界是：**Docker 已安装并成功运行过容器；宝塔 7.7.0 并未被可靠地验证为最终运行版本。** 修复期间把旧版 7.7.0 文件覆盖到新版面板环境，曾引发数据库结构不匹配。后续不要再用“直接覆盖程序目录”的方式降级宝塔。

文档不保存宝塔密码、面板安全入口、Token、公网地址等敏感信息。密码遗忘时应重置，不应从聊天截图或历史记录中继续复用。

## 13. Windows 通过 SSH 管理虚拟机

### 13.1 连接

在 Windows Terminal 或 PowerShell 中执行：

```powershell
ssh <ubuntu-user>@<vm-ip>
```

第一次连接会要求确认主机指纹。应先确认 IP 是自己的虚拟机，再输入 `yes`。随后输入的是 Ubuntu 用户 `wyy` 的密码；输入密码时终端不会显示星号，这是正常现象。

如果 IP 或用户名以后改变，替换命令中的对应部分即可。检查本机是否自带 SSH：

```powershell
ssh -V
```

### 13.2 临时进入和退出 root

```bash
sudo -i
```

看到提示符从 `$` 变为 `#`，说明已经进入 root shell。退出 root、回到普通用户：

```bash
exit
```

也可以按 `Ctrl+D`。如果是连续执行了多层 `sudo -i` 或 SSH，会需要多次 `exit`；每次只退出一层。

### 13.3 从 Windows 复制文件到虚拟机

```powershell
scp "$env:USERPROFILE\Downloads\文件名" <ubuntu-user>@<vm-ip>:/home/<ubuntu-user>/
```

复制整个目录：

```powershell
scp -r "$env:USERPROFILE\Downloads\目录名" <ubuntu-user>@<vm-ip>:/home/<ubuntu-user>/
```

`scp` 走 SSH 的 22 端口。复制失败时，先确认 `ssh <ubuntu-user>@<vm-ip>` 本身能够登录。

## 14. 宝塔面板：查看、恢复与版本风险

### 14.1 常用命令

```bash
# 显示面板地址、用户名等基本信息
sudo bt 14

# 查看当前面板版本文件
sudo cat /www/server/panel/data/version.pl

# 按交互提示重置面板密码
sudo bt 5

# 查看面板服务状态
sudo /etc/init.d/bt status

# 重启面板
sudo /etc/init.d/bt restart
```

`bt 14` 中出现：

```text
cat: /www/server/panel/default.pl: No such file or directory
```

通常只是说明保存“首次安装默认密码”的临时文件已经不存在，并不等于整个面板损坏。首次密码文件被删除后，`bt 14` 可能只显示用户名而不显示密码；这时使用 `bt 5` 设置新密码即可。

### 14.2 为什么不应把新版面板直接覆盖降级到 7.7.0

宝塔面板的程序代码、Python 环境和 SQLite 数据库结构必须互相匹配。把 7.7.0 文件覆盖到较新的面板目录，可能造成：

- 新代码和旧表结构互不兼容，或反过来；
- `users` 等表字段形态与程序预期不同；
- 面板命令能启动，但登录、路由或插件页面报错；
- 后续升级脚本继续改写数据库，使恢复更困难。

如果确实必须测试 7.7.0，正确做法是：

1. 在 Proxmox 新建隔离虚拟机或先制作快照；
2. 使用与 7.7.0 匹配的系统、安装脚本和全新数据库；
3. 不承载公网正式业务；
4. 不把新版本数据库直接交给旧代码使用；
5. 测试完成后销毁实验虚拟机，而不是把它继续当生产服务器。

7.7.0 是历史版本，不适合长期暴露在公网。正式站点应使用仍在维护的版本，并把面板入口限制在内网或 VPN。

### 14.3 修改前备份

至少备份面板数据库和网站数据：

```bash
sudo cp -a /www/server/panel/data/default.db \
  "/root/default.db.before-change.$(date +%Y%m%d-%H%M%S)"

sudo tar -C /www -czf \
  "/root/www-backup.$(date +%Y%m%d-%H%M%S).tar.gz" \
  wwwroot server/panel/data
```

更稳妥的做法是先在 Proxmox 创建虚拟机快照。数据库物理损坏或表结构异常时，应先停止面板、复制原数据库，再诊断；不要在唯一副本上直接执行来源不明的修复 SQL。

## 15. Docker 安装、验证与权限

### 15.1 使用 Docker 官方 APT 仓库安装

以下命令适用于当前 Ubuntu 环境：

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings

sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

不要同时混装发行版的 `docker.io` 与 Docker 官方的 `docker-ce`，以免包和配置冲突。

### 15.2 判断是否安装成功

```bash
docker version
docker compose version
systemctl is-active docker
sudo docker run --rm hello-world
```

判断标准：

- `docker version` 同时出现 Client 和 Server；
- `docker compose version` 能输出版本；
- `systemctl is-active docker` 输出 `active`；
- `hello-world` 输出 `Hello from Docker!`。

如果只有 Client、没有 Server，说明命令行装了，但守护进程没运行或当前用户无权连接。

### 15.3 普通用户出现 permission denied

最稳妥的用法是给 Docker 命令加 `sudo`：

```bash
sudo docker ps
```

如果为了方便，把 `wyy` 加入 `docker` 组：

```bash
sudo usermod -aG docker wyy
```

然后完全退出 SSH 或桌面会话并重新登录。需要明确：**`docker` 组几乎等价于 root 权限**，因为组内用户可以启动挂载宿主机文件系统的容器。多用户服务器上不要随意添加成员。

## 16. 没有 0.2 网关时下载 GitHub 与 Docker 镜像

“没有 `192.168.2.2` 网关”不等于一定无法下载。应先分清三种东西：

- **默认网关**：负责把整个系统的流量送出本地网络；
- **DNS**：只负责把域名解析成地址；
- **HTTP/HTTPS 代理**：应用主动把请求交给代理转发，不要求代理成为默认网关。

只要代理地址从虚拟机可达，Docker 可以单独走代理，不必把系统默认网关改成代理主机。前面的实验中，虚拟机对 `192.168.2.2` 不可达，因此把 Docker 指向该地址不会有效。

### 16.1 先定位故障层

```bash
ip -br address
ip route
resolvectl status

getent ahostsv4 registry-1.docker.io
getent ahostsv6 registry-1.docker.io
curl -4 -I --connect-timeout 10 https://registry-1.docker.io/v2/
```

正常情况下，最后一条访问 Docker Registry 常会返回 `401 Unauthorized`；这反而说明 DNS、TCP 和 TLS 已经打通，只是请求未登录。若连接超时，则重点检查出口路由、防火墙、DNS 污染或上游网络限制。

测试某个候选代理是否真的可达：

```bash
ping -c 2 192.168.2.2
nc -vz -w 3 192.168.2.2 7890
```

必须先确认 IP 和端口可达，才能继续配置代理。

### 16.2 给 Docker 守护进程设置代理

编辑 `/etc/docker/daemon.json`，将代理地址和端口换成已经测试可达的真实值。若文件已有其他配置，应合并 JSON 字段，不要直接覆盖：

```json
{
  "proxies": {
    "http-proxy": "http://<proxy-ip>:<port>",
    "https-proxy": "http://<proxy-ip>:<port>",
    "no-proxy": "localhost,127.0.0.1,192.168.0.0/16"
  }
}
```

验证 JSON 和 Docker 配置，再重启：

```bash
sudo dockerd --validate --config-file=/etc/docker/daemon.json
sudo systemctl restart docker
sudo docker info
```

示例中的 `<proxy-ip>:<port>` 只有在该主机确实提供 HTTP 代理且端口可达时才成立。`<proxy-ip>` 如果只是 DNS 或普通路由器，就不能这样填写。

### 16.3 使用镜像加速服务

可在 `/etc/docker/daemon.json` 中加入镜像地址，例如：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io"
  ]
}
```

然后验证并重启：

```bash
sudo dockerd --validate --config-file=/etc/docker/daemon.json
sudo systemctl restart docker
docker info | sed -n '/Registry Mirrors:/,/Live Restore/p'
```

也可以显式增加镜像前缀：

```bash
sudo docker pull m.daocloud.io/docker.io/library/hello-world:latest
sudo docker tag m.daocloud.io/docker.io/library/hello-world:latest \
  hello-world:latest
```

公共镜像属于第三方服务，可能限速、缺少某些镜像或同步滞后。正式部署应固定版本，重要镜像最好记录 digest。清华 TUNA 的 Docker CE 镜像主要用于安装 Docker 软件包，并不等于 Docker Hub 容器镜像加速器。

### 16.4 在 Windows 下载 Docker 镜像后离线导入

先启动 Docker Desktop，并确认 Linux 引擎正常：

```powershell
docker context use desktop-linux
docker info
```

拉取与虚拟机相同架构的镜像：

```powershell
docker pull --platform linux/amd64 hello-world:latest
docker save -o "$env:USERPROFILE\Downloads\hello-world.tar" hello-world:latest
```

如果 Windows 也无法直连 Docker Hub，可以先从可用镜像源拉取，再改回标准名称：

```powershell
docker pull --platform linux/amd64 m.daocloud.io/docker.io/library/hello-world:latest
docker tag m.daocloud.io/docker.io/library/hello-world:latest hello-world:latest
docker save -o "$env:USERPROFILE\Downloads\hello-world.tar" hello-world:latest
```

传到虚拟机：

```powershell
scp "$env:USERPROFILE\Downloads\hello-world.tar" <ubuntu-user>@<vm-ip>:/home/<ubuntu-user>/
```

在 Ubuntu 中导入和运行：

```bash
sudo docker load -i /home/<ubuntu-user>/hello-world.tar
sudo docker image ls
sudo docker run --rm hello-world
```

这条离线路径已经在当前实验环境中成功验证。

### 16.5 在 Windows 下载 GitHub 仓库后离线转移

普通源代码可以在 Windows 下载后用 `scp -r` 上传。若要完整保留 Git 历史、分支、标签和文件模式，更稳妥的是制作 bundle：

```powershell
git clone --mirror https://github.com/OWNER/REPO.git repo.git
git -C .\repo.git bundle create ..\repo.bundle --all
scp .\repo.bundle <ubuntu-user>@<vm-ip>:/home/<ubuntu-user>/
```

然后在 Ubuntu 中恢复：

```bash
cd /home/<ubuntu-user>
git clone repo.bundle repo
cd repo
git branch -a
```

只需要 GitHub Release 中的二进制文件时，可在 Windows 浏览器下载官方发布附件，再使用 `scp` 上传。不要从来路不明的网盘或二次打包站下载可执行文件。

## 17. 网络地址、0.4 网关与 DNS 应怎样填写

实验中出现过以下参数：

```text
地址：192.168.2.165
原默认路由：192.168.0.1
DNS：192.168.0.4
```

如果明确要让 `192.168.0.4` 同时充当网关和 DNS，并且它确实具备路由/NAT 与 DNS 功能，GNOME 手动 IPv4 可填：

| 字段 | 值 |
| --- | --- |
| 地址 | `192.168.2.165` |
| 子网掩码 | `255.255.0.0`，即 `/16` |
| 网关 | `192.168.0.4` |
| DNS | `192.168.0.4` |

这里必须用 `/16`，因为主机是 `192.168.2.165`，网关是 `192.168.0.4`；使用 `/24` 时两者不在同一直接连接子网，通常无法把 `.0.4` 当普通网关访问。

但如果 `.0.4` **只提供 DNS**，正确做法是保留能够上网的真实网关（例如原来的 `.0.1`），只把 DNS 填成 `.0.4`。如果 `.0.4` **只提供代理**，则网关和 DNS都不必改，只在 Docker、APT、Git 等应用中配置代理。

应用设置前先测试：

```bash
ping -c 2 192.168.0.4
ip route
resolvectl status
```

改网络可能立即中断 SSH。应打开 Proxmox 控制台后再改，以便失联时恢复。应用后检查：

```bash
ip -br address
ip route
ping -c 2 192.168.0.4
getent hosts github.com
curl -I --connect-timeout 10 https://github.com
```

启动画面长时间停在 `systemd-networkd-wait-online.service`，说明系统等待网络达到 online 状态。可以临时取消等待以恢复启动速度：

```bash
sudo systemctl disable --now systemd-networkd-wait-online.service
sudo systemctl mask systemd-networkd-wait-online.service
```

这只是不再等待，**不会修复错误的 IP、网关或 DNS**。服务器依赖开机网络服务时，更应该修正连接配置，而不是长期掩盖问题。

## 18. Ubuntu 桌面中文与终端问题

### 18.1 安装中文语言包

```bash
sudo apt update
sudo apt install -y language-pack-zh-hans \
  language-pack-gnome-zh-hans fonts-noto-cjk
sudo update-locale LANG=zh_CN.UTF-8 LANGUAGE=zh_CN:zh
sudo reboot
```

重新登录后也可以在“设置 → 区域与语言”中选择中文。字体包 `fonts-noto-cjk` 可减少中文方框和缺字。

### 18.2 出现 “No Terminal”

先确认终端程序存在：

```bash
dpkg -s gnome-terminal
gnome-terminal
```

如果未安装：

```bash
sudo apt update
sudo apt install -y gnome-terminal
```

如需重新指定默认终端：

```bash
sudo update-alternatives --set x-terminal-emulator \
  /usr/bin/gnome-terminal.wrapper
```

`gsettings` 命令应在图形桌面的普通用户终端中执行，不要在 root SSH 会话里执行：

```bash
gsettings set org.gnome.desktop.default-applications.terminal exec 'gnome-terminal'
gsettings set org.gnome.desktop.default-applications.terminal exec-arg ''
```

即使桌面图标的“在终端打开”仍报错，也可以从应用列表直接打开 Terminal，或通过 Windows SSH 管理虚拟机。

## 19. 把域名映射到这台虚拟机

### 19.1 私网地址不能直接写进公网 DNS

`192.168.2.165` 是私网地址。把公网 DNS 的 A 记录指向它，对互联网访客没有意义。DNS 也不能指定端口；端口由访问协议、路由器端口转发或反向代理决定。

建议保留：

```text
wangyuyue.xyz      → GitHub Pages
www.wangyuyue.xyz  → GitHub Pages
```

给虚拟机服务新建：

```text
app.wangyuyue.xyz  → Ubuntu 自托管服务
```

### 19.2 有公网 IPv4 时

完整链路是：

```text
app.wangyuyue.xyz
        ↓ A 记录
家庭/公司出口公网 IPv4
        ↓ 路由器端口转发 TCP 80、443
192.168.2.165
        ↓ 宝塔 Nginx 反向代理
127.0.0.1:容器端口
```

步骤：

1. 在路由器查看 WAN IPv4；
2. 在 Ubuntu 执行 `curl -4 ifconfig.me`，比较外部看到的地址；
3. 在阿里云 DNS 添加 `app` 的 A 记录，值为公网 IPv4；
4. 路由器把 TCP 80、443 转发到 `192.168.2.165`；
5. 宝塔“网站”中创建 `app.wangyuyue.xyz` 站点；
6. 如果应用运行在 Docker 中，让 Nginx 反向代理到本机容器端口；
7. 从手机蜂窝网络访问测试，避免路由器不支持 NAT 回环造成误判。

不要把宝塔面板端口一起转发到公网。

### 19.3 没有公网 IPv4 或处于 CGNAT 时

如果路由器 WAN 地址属于以下范围，或者 WAN 地址与外网查询结果不同，通常存在私网/CGNAT：

```text
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16
100.64.0.0/10
```

此时普通端口转发通常不能从公网访问。可选方案：

- Cloudflare Tunnel：虚拟机主动连接 Cloudflare，不需要公网入站端口；
- 使用有公网 IP 的 VPS，通过 FRP、WireGuard 或 SSH 反向隧道转发；
- 向运营商申请公网 IPv4；
- 使用可公网访问的 IPv6，但必须正确配置 AAAA、防火墙和入站规则。

Cloudflare Tunnel 解决的是“外部如何到达内网服务”。DNS-01 证书验证只解决“如何证明域名所有权”，**不会自动让内网网站变得可访问**。

### 19.4 Docker 服务建议只绑定本机

如果由宝塔 Nginx 对外提供 HTTPS，容器端口最好只监听回环地址：

```bash
sudo docker run -d --name myapp \
  -p 127.0.0.1:8080:80 \
  IMAGE:VERSION
```

Compose 示例：

```yaml
services:
  app:
    image: IMAGE:VERSION
    ports:
      - "127.0.0.1:8080:80"
    restart: unless-stopped
```

然后在宝塔站点的“反向代理”中把目标地址设为：

```text
http://127.0.0.1:8080
```

这样公网只看到 Nginx 的 80/443，不会直接暴露容器端口。

## 20. 签发可信 SSL 证书

### 20.1 GitHub Pages 路线

当前根域名继续使用 GitHub Pages 时，在 Pages 的 DNS 检查成功后启用 `Enforce HTTPS`。证书由 GitHub 管理，不需要再在宝塔中为同一个站点签发。

### 20.2 宝塔站点使用 HTTP-01

适合条件：

- 域名已经解析到正确公网入口；
- TCP 80 能从互联网到达宝塔/Nginx；
- 没有其他设备劫持或占用 80 端口；
- 宝塔站点已经绑定申请证书的全部域名。

宝塔中的一般流程：

```text
网站 → 选择站点 → SSL → Let's Encrypt
→ 勾选域名 → 申请 → 开启强制 HTTPS
```

HTTP-01 的验证请求必须能通过公网 80 端口到达站点。只开放 443 而封闭 80，通常会导致首次签发或续期失败。

### 20.3 使用 DNS-01

DNS-01 通过 DNS TXT 记录证明域名控制权，适合：

- 没有公网 80 端口；
- 需要通配符证书，例如 `*.wangyuyue.xyz`；
- DNS 服务商提供可自动更新记录的 API。

DNS-01 可以签发证书，但不会建立公网访问路径。阿里云 DNS API 密钥应使用最小权限的子账号或 RAM 用户，不能把主账号密钥写进脚本、镜像、Git 仓库或网页。

### 20.4 使用 Cloudflare Tunnel

通过 Tunnel 发布 HTTP 服务时，浏览器到 Cloudflare 边缘的证书通常由 Cloudflare 管理。Cloudflare 到源站可使用本机 HTTP、公共证书或 Cloudflare Origin Certificate，具体取决于源站 TLS 模式。不要把 Cloudflare Origin Certificate 当作浏览器直接信任的公共证书使用。

### 20.5 证书检查

```bash
curl -I http://app.wangyuyue.xyz
curl -Iv https://app.wangyuyue.xyz
openssl s_client -connect app.wangyuyue.xyz:443 \
  -servername app.wangyuyue.xyz </dev/null
```

应检查证书域名、颁发者、有效期、完整证书链，以及 HTTP 是否正确跳转到 HTTPS。浏览器出现证书警告时，不要直接忽略并对外发布。

## 21. 最低安全基线

### 21.1 暴露端口原则

| 端口 | 建议 |
| --- | --- |
| 22/SSH | 仅可信来源、VPN 或跳板机可访问 |
| 80/HTTP | 对公开网站开放，用于跳转和证书验证 |
| 443/HTTPS | 对公开网站开放 |
| 宝塔面板端口 | 只允许内网/VPN/固定管理 IP，不直接暴露公网 |
| Docker 应用端口 | 优先绑定 `127.0.0.1`，由 Nginx 统一转发 |
| Docker API 2375 | 禁止公开；未加密远程 API 等同交出 root |

### 21.2 SSH

先配置并验证密钥登录，再考虑关闭密码登录：

```powershell
ssh-keygen -t ed25519
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub" | ssh <ubuntu-user>@<vm-ip> "umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys"
```

修改 SSH 配置前保留当前会话，另开窗口确认密钥能登录。可在 `/etc/ssh/sshd_config.d/99-hardening.conf` 中设置：

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

验证配置后再重载：

```bash
sudo sshd -t
sudo systemctl reload ssh
```

如果密钥尚未验证成功，不要关闭密码登录，否则可能把自己锁在服务器外。

### 21.3 宝塔

- 使用受维护版本、强随机密码和随机安全入口；
- 支持时启用二次验证；
- 面板只经内网、VPN 或管理 IP 访问；
- 定期备份站点、数据库、证书和面板配置；
- 不安装来源不明的破解插件或“一键优化”脚本；
- 不在截图、文档和群聊中公开面板完整 URL。

### 21.4 Docker

- 不挂载 `/var/run/docker.sock`，除非明确理解 root 风险；
- 避免 `--privileged`，按需添加最少 capability；
- 镜像固定具体版本，关键环境记录 digest；
- 应用以非 root 用户运行，文件系统能只读时使用只读；
- 设置 CPU、内存和日志大小限制；
- 密钥放在权限受控的环境文件或 secret 中，不写进 Dockerfile 和 Git；
- 对数据卷做独立备份，镜像不是数据备份；
- 发布端口前从另一台机器实际测试防火墙。

Docker 官方特别提醒：容器的已发布端口可能绕过 UFW/firewalld 的常规规则。需要细粒度限制时，应结合 Docker 的 `DOCKER-USER` 链设计规则；最简单可靠的策略仍是只把应用端口绑定到 `127.0.0.1`，统一从 Nginx 入口暴露。

### 21.5 变更与恢复

- 重大升级、网络修改、宝塔修复前先做 Proxmox 快照；
- 数据库和容器卷另做文件级备份，快照不能代替长期备份；
- 一次只改一层：网络、DNS、反向代理、应用、证书不要同时修改；
- 保留变更前配置，并记录验证命令和结果；
- 不使用 `chmod -R 777`、不明脚本或直接覆盖系统目录来“快速修复”。

## 22. 分层排障速查

网站访问链路可以按以下顺序检查：

```text
服务进程/容器
    ↓
本机端口监听
    ↓
宝塔 Nginx / 反向代理
    ↓
Ubuntu 与 Docker 防火墙
    ↓
路由器端口转发或隧道
    ↓
公网 DNS
    ↓
SSL 证书与浏览器
```

对应命令：

```bash
# 容器是否运行
sudo docker ps
sudo docker logs --tail 100 容器名

# 本机是否监听端口
sudo ss -lntp

# 本机直接访问应用
curl -I http://127.0.0.1:8080

# Nginx 配置和服务
sudo nginx -t
sudo systemctl status nginx --no-pager

# DNS
getent hosts app.wangyuyue.xyz

# HTTP/HTTPS
curl -I http://app.wangyuyue.xyz
curl -Iv https://app.wangyuyue.xyz
```

判断方法：

- `127.0.0.1:8080` 不通：先修容器或应用；
- 本机应用通、域名 HTTP 不通：查 Nginx、端口转发、隧道和防火墙；
- HTTP 通、HTTPS 不通：查证书、443 监听和证书链；
- 外网通、局域网域名不通：查 NAT 回环或内网 DNS；
- 域名解析错误：先修 DNS，不要反复重装 Docker 或宝塔。

## 23. 针对当前环境的推荐下一步

1. 保持 `wangyuyue.xyz` 和 `www.wangyuyue.xyz` 继续服务于已生效的 GitHub Pages；
2. 在 Ubuntu 上用 `docker version`、`systemctl is-active docker` 和 `hello-world` 再做一次状态确认；
3. 确认 `192.168.0.4` 究竟是网关、DNS 还是代理，不要把三个角色混为一谈；
4. 需要发布容器时，新建 `app.wangyuyue.xyz`，容器只监听 `127.0.0.1`；
5. 先判断是否有公网 IP，再选择“80/443 端口转发”或“Cloudflare Tunnel/VPS 隧道”；
6. 用宝塔 Nginx 做反向代理，再申请与 `app.wangyuyue.xyz` 对应的证书；
7. 最后从手机蜂窝网络进行外网验证，并收紧 SSH、面板和容器端口。

## 参考资料

- [GitHub Pages 是什么](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages 发布来源设置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub Pages 自定义域名配置](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [GitHub Pages 自定义域名排障](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages)
- [阿里云：添加公网 DNS 解析记录](https://help.aliyun.com/zh/dns/pubz-add-parsing-record/)
- [阿里云：通过 A 记录把域名指向网站服务器](https://help.aliyun.com/zh/dns/pubz-add-website-parsing)
- [Docker Engine：Ubuntu 官方安装说明](https://docs.docker.com/engine/install/ubuntu/)
- [Docker Engine：守护进程代理配置](https://docs.docker.com/engine/daemon/proxy/)
- [Docker Hub：Registry mirror 说明](https://docs.docker.com/docker-hub/image-library/mirror/)
- [Docker Engine：安全模型](https://docs.docker.com/engine/security/)
- [DaoCloud 公共镜像项目](https://github.com/DaoCloud/public-image-mirror)
- [清华 TUNA：Docker CE 软件源帮助](https://mirrors.tuna.tsinghua.edu.cn/help/docker-ce/)
- [Let's Encrypt：验证方式说明](https://letsencrypt.org/docs/challenge-types/)
- [Cloudflare：创建本地管理的 Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/create-local-tunnel/)
- [Ubuntu：更改语言](https://help.ubuntu.com/stable/ubuntu-help/session-language.html.zh-CN)
