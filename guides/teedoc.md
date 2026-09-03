---
layout: article
title: "teedoc 本地构建、预览与排错"
permalink: /guides/teedoc/
---

# teedoc 本地构建、预览与排错命令整理

> 本文件由 `teedoc_commands.md` 和 `1.md` 的内容合并整理而成，用于 teedoc 文档的本地安装、构建、预览和排错。
>
> 公开文档中请不要写入个人真实路径、用户名、GitHub Token、Cookie、SSH 私钥等敏感信息。命令里的占位符请按实际环境替换。

## 1. 常用占位符说明

- `<repo-dir>`：teedoc 文档项目根目录，例如 `C:\path\to\sipeed_wiki`
- `<project-path>`：项目路径，例如 MaixPy 仓库路径
- `<docs-dir>`：teedoc 文档目录，通常是 `<project-path>/docs`
- `<script-path>`：本地构建脚本路径，例如 `/mnt/c/path/to/rebuild-nanokvm-go-structure.sh`
- `<out-dir>`：静态页面输出目录，例如 `C:\path\to\sipeed_wiki\out`
- `<log-path>`：Windows 侧日志路径
- `<wsl-log-path>`：WSL 侧日志路径，例如 `/mnt/c/path/to/rebuild-nanokvm-go-structure.log`
- `<generated-html-path>`：生成后的 HTML 文件路径
- `<keyword>` / `<keyword-or-file-name>`：要搜索的关键词或文件名

## 2. 推荐快速流程

### 2.1 使用 teedoc 原生命令预览

适合 MaixPy 这类 teedoc 配置位于 `docs` 目录下的项目。

```bash
wsl
cd <project-path>/docs
python3 -m pip install --user -U teedoc
~/.local/bin/teedoc install
~/.local/bin/teedoc serve --host 127.0.0.1 --port 2333
```

浏览器访问：

```text
http://127.0.0.1:2333/maixpy/
```

也可以直接打开某个页面，例如：

```text
http://127.0.0.1:2333/maixpy/doc/zh/vision/maixhub_train.html
```

### 2.2 使用本地构建脚本后预览

适合已经准备了构建脚本的项目，例如针对某个文档目录做结构重建、资源处理或局部构建。

```powershell
cd <repo-dir>
wsl bash <script-path>
python -m http.server 2334 --bind 127.0.0.1 --directory <out-dir>
```

示例：

```powershell
cd C:\path\to\sipeed_wiki
wsl bash /mnt/c/path/to/rebuild-nanokvm-go-structure.sh
python -m http.server 2334 --bind 127.0.0.1 --directory C:\path\to\sipeed_wiki\out
```

浏览器访问：

```text
http://127.0.0.1:2334/
```

## 3. 安装、检查和更新 teedoc

### 3.1 检查 teedoc 是否已安装

```bash
teedoc --version
```

如果 `teedoc` 命令找不到，也可以检查用户目录下的安装路径：

```bash
~/.local/bin/teedoc --version
```

查看帮助：

```bash
teedoc --help
```

或：

```bash
~/.local/bin/teedoc --help
```

### 3.2 安装或更新 teedoc

```bash
python3 -m pip install --user -U teedoc
```

国内网络访问 PyPI 较慢时，可以使用清华源：

```bash
python3 -m pip install --user -U teedoc -i https://pypi.tuna.tsinghua.edu.cn/simple
```

如果安装后仍提示找不到 `teedoc`，把用户安装目录加入 `PATH`：

```bash
export PATH="$HOME/.local/bin:$PATH"
```

### 3.3 安装项目依赖插件

第一次运行本地文档前，需要在 teedoc 文档目录执行：

```bash
cd <docs-dir>
teedoc install
```

如果使用完整路径：

```bash
~/.local/bin/teedoc install
```

国内网络较慢时可使用镜像源：

```bash
teedoc -i https://pypi.tuna.tsinghua.edu.cn/simple install
```

或：

```bash
~/.local/bin/teedoc -i https://pypi.tuna.tsinghua.edu.cn/simple install
```

## 4. 构建静态网站

### 4.1 直接构建

在 teedoc 文档目录中运行：

```bash
cd <docs-dir>
teedoc build
```

或：

```bash
cd <docs-dir>
~/.local/bin/teedoc build
```

构建完成后，输出文件通常在 `out` 目录中。

### 4.2 在 PowerShell 中通过 WSL 构建

```powershell
wsl bash -lc "cd /mnt/c/Users/<your-name>/Desktop/MaixPy/docs && ~/.local/bin/teedoc build"
```

启动本地预览也可以写成：

```powershell
wsl bash -lc "cd /mnt/c/Users/<your-name>/Desktop/MaixPy/docs && ~/.local/bin/teedoc serve --host 127.0.0.1 --port 2333"
```

### 4.3 运行本地构建脚本

```powershell
wsl bash <script-path>
```

示例：

```powershell
wsl bash /mnt/c/path/to/rebuild-nanokvm-go-structure.sh
```

如果需要设置超时并在结束后输出日志：

```powershell
wsl bash -lc "timeout 240 bash <script-path>; tail -120 <wsl-log-path>"
```

示例：

```powershell
wsl bash -lc "timeout 240 bash /mnt/c/path/to/rebuild-nanokvm-go-structure.sh; tail -120 /mnt/c/path/to/rebuild-nanokvm-go-structure.log"
```

### 4.4 构建脚本内部 teedoc 命令参考

构建脚本中实际调用 teedoc 的形式大致如下：

```bash
teedoc serve -d <repo-dir> --host 127.0.0.1 --port 2341 --thread 1 --fast
```

常用参数说明：

- `serve`：启动 teedoc 本地服务并生成页面
- `-d <repo-dir>`：指定文档项目目录
- `--host 127.0.0.1`：只允许本机访问
- `--port 2341`：指定 teedoc 临时服务端口
- `--thread 1`：使用单线程构建
- `--fast`：快速构建模式

## 5. 本地预览

### 5.1 使用 teedoc serve 预览

在 teedoc 文档目录运行：

```bash
cd <docs-dir>
teedoc serve --host 127.0.0.1 --port 2333
```

如果使用完整路径：

```bash
cd <docs-dir>
~/.local/bin/teedoc serve --host 127.0.0.1 --port 2333
```

浏览器访问：

```text
http://127.0.0.1:2333/maixpy/
```

### 5.2 使用 Python 静态服务器预览 out 目录

```powershell
python -m http.server 2334 --bind 127.0.0.1 --directory <out-dir>
```

示例：

```powershell
python -m http.server 2334 --bind 127.0.0.1 --directory C:\path\to\sipeed_wiki\out
```

浏览器访问：

```text
http://127.0.0.1:2334/
```

看到 `Serving HTTP on 127.0.0.1 port 2334 ...` 表示服务器已经启动成功。这个窗口会一直占用，属于正常现象。

### 5.3 后台启动预览服务器

```powershell
Start-Process powershell -ArgumentList '-NoExit','-Command','python -m http.server 2334 --bind 127.0.0.1 --directory <out-dir>'
```

### 5.4 停止预览服务器

在运行服务器的终端窗口按：

```text
Ctrl + C
```

### 5.5 端口被占用时换端口

如果 `2333` 端口被占用，teedoc serve 可以换成其它端口：

```bash
teedoc serve --host 127.0.0.1 --port 2334
```

或：

```bash
~/.local/bin/teedoc serve --host 127.0.0.1 --port 2334
```

对应访问地址也要同步修改：

```text
http://127.0.0.1:2334/maixpy/
```

如果 Python 静态服务器的 `2334` 端口被占用，可以换成 `2335`：

```powershell
python -m http.server 2335 --bind 127.0.0.1 --directory <out-dir>
```

浏览器访问：

```text
http://127.0.0.1:2335/
```

## 6. 修改文档后的常用预览流程

```bash
cd <docs-dir>
~/.local/bin/teedoc install
~/.local/bin/teedoc serve --host 127.0.0.1 --port 2333
```

然后在浏览器中访问：

```text
http://127.0.0.1:2333/maixpy/
```

修改 Markdown、图片或目录配置后，保持 `teedoc serve` 运行，刷新浏览器即可查看效果。

如果页面没有更新，可以按顺序检查：

```powershell
wsl bash <script-path>
python -m http.server 2334 --bind 127.0.0.1 --directory <out-dir>
```

然后浏览器强制刷新：

```text
Ctrl + F5
```

## 7. 常用检查命令

### 7.1 确认当前目录

```bash
pwd
```

### 7.2 确认是否在 teedoc 文档目录

```bash
ls
```

### 7.3 查看 teedoc 命令位置

```bash
which teedoc
```

如果系统找不到 `teedoc`，查看用户安装路径：

```bash
ls ~/.local/bin/teedoc
```

### 7.4 查看 teedoc 构建日志

```powershell
Get-Content -Wait -Tail 80 <log-path>
```

示例：

```powershell
Get-Content -Wait -Tail 80 C:\path\to\rebuild-nanokvm-go-structure.log
```

### 7.5 检查生成页面是否包含指定内容

```powershell
rg -n "<keyword>" <generated-html-path>
```

示例：

```powershell
rg -n "系统更新|<hr" C:\path\to\sipeed_wiki\out\hardware\zh\kvm\NanoKVM_Go\system\updating.html
```

### 7.6 检查源文件中是否还有旧资源引用

```powershell
rg -n "<keyword-or-file-name>" <docs-dir>
```

示例：

```powershell
rg -n "nanokvm-go-menu-demo|查看演示视频" C:\path\to\sipeed_wiki\docs\hardware\zh\kvm\NanoKVM_Go
```

## 8. 常见问题处理

### 8.1 构建时临时补充缺失目录

如果构建过程中遇到某些临时目录或插件搜索目录不存在，可以先创建目录：

```bash
mkdir -p /tmp/teedoc_plugin_search
```

再构建：

```bash
cd <docs-dir>
~/.local/bin/teedoc build
```

PowerShell 调用 WSL 的写法：

```powershell
wsl bash -lc "mkdir -p /tmp/teedoc_plugin_search && cd /mnt/c/Users/<your-name>/Desktop/MaixPy/docs && ~/.local/bin/teedoc build"
```

### 8.2 API sidebar 缺失时的临时处理

如果本地构建时提示 `docs/api/sidebar.yml` 缺失，可以临时创建一个最小 sidebar 文件用于本地构建检查：

```bash
mkdir -p docs/api
```

```bash
cat > docs/api/sidebar.yml <<'EOF'
items:
- label: API docs
  file: README2.md
EOF
```

然后重新构建：

```bash
~/.local/bin/teedoc build
```

构建检查完成后，如果这个文件只是临时生成的，不准备提交，可以删除：

```bash
rm docs/api/sidebar.yml
```

### 8.3 构建卡住时停止 teedoc 残留进程

```powershell
wsl bash -lc "pkill -f 'teedoc serve.*2341' || true"
```

### 8.4 恢复 teedoc 构建产生的 locale 副作用

teedoc 构建后可能会自动修改 locale 文件。如无意提交这些文件，可恢复：

```powershell
git restore -- layout/locales/en/LC_MESSAGES/messages.po layout/locales/messages.pot layout/locales/zh/LC_MESSAGES/messages.po
```

### 8.5 终端停在 `Serving HTTP on ...`

这是正常现象，表示本地预览服务器正在运行。打开浏览器访问对应地址即可。

### 8.6 构建脚本长时间没有输出

可能是脚本把 teedoc 输出写入日志文件了。可以另开一个终端查看日志：

```powershell
Get-Content -Wait -Tail 80 <log-path>
```

## 9. 重新安装和重新启动

重新安装 teedoc：

```bash
python3 -m pip install --user -U teedoc
```

重新安装项目插件：

```bash
~/.local/bin/teedoc install
```

重新启动预览：

```bash
~/.local/bin/teedoc serve --host 127.0.0.1 --port 2333
```
