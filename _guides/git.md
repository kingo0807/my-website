---
layout: article
title: "Git 笔记：从基础到进阶"
date: 2026-09-29
description: "从基础到进阶的 Git 命令与工作流笔记。"
guide_order: 1
---

# Git 笔记：从基础到进阶

> 更新日期：2026-09-29（正文与本地长期笔记同步）

这是一份“先走通主流程，再按问题查专题”的 Git 手册。前三部分按基础、中等、进阶递进；低频的 GitHub 服务、鉴权和发布问题集中放在附录，避免打断学习主线。

命令中的 `<...>` 都是占位符，执行时必须替换为自己的仓库、分支、commit 或路径。示例默认使用功能分支，不建议直接在 `main` 上开发。任何 Token、Cookie、密码和 SSH 私钥都不得写入命令示例、日志或仓库。

## 使用说明：每次操作都要形成闭环

不要把“命令返回成功”当成完成。可靠的 Git 操作始终包含四步：

1. **检查**：确认当前目录、分支、工作区、目标 remote 和远端 SHA。
2. **操作**：一次只做一个意图明确的动作。
3. **验收**：用独立的状态、diff、日志、测试或远端查询确认结果。
4. **恢复**：危险操作前准备备份分支；出错时先 abort、reflog 或从备份恢复。

| 场景 | 操作前 | 操作后 | 出错时 |
| --- | --- | --- | --- |
| 日常提交 | `status`、`diff` | `diff --cached`、测试、`show` | 撤销暂存后重新分组 |
| 同步远端 | `fetch`、比较两边提交 | `status`、`log` | 停止并选择 merge/rebase |
| 改写历史 | 工作区干净、备份分支、记录远端 SHA | `range-diff`、最终树对比 | `rebase --abort`、备份、`reflog` |
| 远端写入 | 核对仓库、分支和预期旧 SHA | `ls-remote` / `gh ... view` | 先查远端是否已生效，禁止盲目重试 |

### 学习路线

- **基础**：理解工作区、暂存区、commit 和 remote；独立完成一次分支开发、提交、推送和 PR。
- **中等**：让每个 commit 与 PR 都可审查、可测试、可继续维护。
- **进阶**：处理历史改写、冲突、worktree、分支分叉和 Release，并且知道如何恢复。

### 逐行说明的阅读约定

- 所有 `bash` 和 `powershell` 命令块都按物理行编号解释；带 `\` 的多行写法仍是一条逻辑命令，续行参数会单独说明。
- 以 `#` 开头的是注释或待替换步骤，不会被 shell 执行。
- `text` 代码块用于展示提交格式、错误信息、历史图或键盘输入，`markdown` 代码块用于展示语法；它们不是可执行命令，含义由紧邻的正文和字段说明解释。
- 逐行说明解释命令作用，不等于授权执行。涉及删除、历史改写、远端写入或凭据时，仍需先满足该节列出的适用条件和安全检查。

本轮逐行说明已用本机 Git 2.55 的命令帮助交叉检查，并以 [git-fetch](https://git-scm.com/docs/git-fetch)、[git-diff](https://git-scm.com/docs/git-diff)、[git-push](https://git-scm.com/docs/git-push)、[git-reset](https://git-scm.com/docs/git-reset)、[GitHub fork 同步接口](https://docs.github.com/en/rest/branches/branches#sync-a-fork-branch-with-the-upstream-repository) 和 [GitHub CLI 手册](https://cli.github.com/manual/) 为语义依据。

### 一条完整的协作流程

下面以“从个人 fork 向上游仓库提交 PR”为例。只有一个远端时可省略 `upstream`，但检查—操作—验收—恢复的顺序不变。

#### 1. 获取仓库并核对身份

```bash
git clone https://github.com/<your-owner>/<repo>.git <local-directory>
cd <local-directory>
git remote -v
git remote add upstream https://github.com/<upstream-owner>/<repo>.git
git fetch --prune origin
git fetch --prune upstream
```

逐行说明：

1. `git clone https://github.com/<your-owner>/<repo>.git <local-directory>`：从给定 URL 克隆仓库，并把本地工作目录明确创建为最后一个参数。
2. `cd <local-directory>`：切换 shell 到项目目录，后续不带 `-C` 的 Git 命令都在此执行。
3. `git remote -v`：列出所有 remote 的 fetch/push URL，核对实际连接的仓库。
4. `git remote add upstream https://github.com/<upstream-owner>/<repo>.git`：新增 `upstream` remote，并把后面的 URL 保存为它的远端地址。
5. `git fetch --prune origin`：从指定 remote 下载对象并按 refspec 更新远端跟踪引用；`--prune` 还清理远端已删除分支的陈旧引用，不改当前工作区。
6. `git fetch --prune upstream`：从指定 remote 下载对象并按 refspec 更新远端跟踪引用；`--prune` 还清理远端已删除分支的陈旧引用，不改当前工作区。

`origin` 通常指个人 fork，`upstream` 通常指原始仓库。名称只是约定，真正依据是 `git remote -v` 的 URL。

#### 2. 从最新上游创建独立分支

```bash
git status --short --branch
git switch --no-track -c <topic-branch> upstream/<base-branch>
```

逐行说明：

1. `git status --short --branch`：用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。
2. `git switch --no-track -c <topic-branch> upstream/<base-branch>`：从指定基准新建并切换到功能分支；`--no-track` 防止它自动跟踪上游仓库分支。

只有工作区状态符合预期时才继续。`--no-track` 避免功能分支错误跟踪只读的上游分支；第一次推送时再让它跟踪自己的 fork。

#### 3. 编辑、检查、测试

```bash
git status --short --branch
git diff --check
git diff --stat
git diff
# 运行仓库规定的测试、格式检查和构建
```

逐行说明：

1. `git status --short --branch`：用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。
2. `git diff --check`：检查未暂存补丁中的尾随空格等空白错误。
3. `git diff --stat`：统计未暂存改动涉及的文件和增删规模。
4. `git diff`：显示工作区相对暂存区的完整未暂存差异。
5. `# 运行仓库规定的测试、格式检查和构建`：注释行，不执行；提醒执行者运行仓库规定的测试、格式检查和构建。

先看完整改动，再决定如何分 commit；不要先 `git add -A` 再猜自己暂存了什么。

#### 4. 精确暂存并提交

```bash
git add -- <path-1> <path-2>
git diff --cached --name-status
git diff --cached --check
git diff --cached
git commit -m "<type>(<scope>): <single-purpose-description>"
git show --stat --oneline HEAD
```

逐行说明：

1. `git add -- <path-1> <path-2>`：把指定路径加入暂存区；`--` 明确分隔选项与路径。
2. `git diff --cached --name-status`：以文件名和状态字母列出暂存区相对 `HEAD` 的待提交清单。
3. `git diff --cached --check`：检查暂存补丁中的空白错误或冲突标记。
4. `git diff --cached`：显示暂存区相对 `HEAD` 的完整差异，即下一次 commit 的候选内容。
5. `git commit -m "<type>(<scope>): <single-purpose-description>"`：把当前暂存区保存为新 commit；`-m` 后是提交信息。
6. `git show --stat --oneline HEAD`：显示最新 commit；`--stat` 给出文件统计，`--oneline` 压缩提交头。

暂存内容不对时用 `git restore --staged -- <path>` 撤销暂存，工作区修改仍保留。一个 commit 应表达一个可独立理解和验证的目的。

#### 5. 推送前同步并验收本地结果

```bash
git fetch --prune upstream
git rebase upstream/<base-branch>
git status --short --branch
git log --oneline upstream/<base-branch>..HEAD
git diff --check upstream/<base-branch>...HEAD
# 再运行测试
```

逐行说明：

1. `git fetch --prune upstream`：从指定 remote 下载对象并按 refspec 更新远端跟踪引用；`--prune` 还清理远端已删除分支的陈旧引用，不改当前工作区。
2. `git rebase upstream/<base-branch>`：把当前分支独有提交重放到目标分支之上；适用于未共享的个人历史。
3. `git status --short --branch`：用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。
4. `git log --oneline upstream/<base-branch>..HEAD`：列出右侧可达而左侧不可达的 commit，用于查看分支新增历史。
5. `git diff --check upstream/<base-branch>...HEAD`：检查从共同祖先到右侧分支的补丁是否存在空白错误。
6. `# 再运行测试`：注释行，不执行；提醒执行者再运行测试。

这里的 rebase 适用于尚未共享的个人功能分支。若该分支已被他人使用，改用 merge 或先协商，避免改写别人依赖的历史。冲突时按进阶章节处理；不确定就 `git rebase --abort` 回到开始前。

#### 6. 推送并创建 PR

```bash
git push -u origin <topic-branch>
gh pr create --repo <upstream-owner>/<repo> --base <base-branch> \
  --head <your-owner>:<topic-branch> --title "<title>" --body "<body>"
```

逐行说明：

1. `git push -u origin <topic-branch>`：首次推送分支，并用 `-u` 建立后续 pull/push 使用的上游跟踪关系。
2. `gh pr create --repo <upstream-owner>/<repo> --base <base-branch> \`：创建 PR；`--repo` 指定目标仓库，`--base` 指定合入分支，末尾反斜杠表示续行。
3. `  --head <your-owner>:<topic-branch> --title "<title>" --body "<body>"`：续接上一行，指定来源 fork/分支以及 PR 标题和正文。

也可以在 GitHub 网页创建 PR；Git 本身不提供 PR 对象。创建后检查目标仓库、base、head、文件列表、CI 和正文是否正确。

#### 7. 根据评审继续修改

```bash
git add -- <path>...
git diff --cached
git commit -m "<type>(<scope>): <description>"
git push origin <topic-branch>
```

逐行说明：

1. `git add -- <path>...`：把指定路径加入暂存区；`--` 明确分隔选项与路径。
2. `git diff --cached`：显示暂存区相对 `HEAD` 的完整差异，即下一次 commit 的候选内容。
3. `git commit -m "<type>(<scope>): <description>"`：把当前暂存区保存为新 commit；`-m` 后是提交信息。
4. `git push origin <topic-branch>`：把指定本地分支或 refspec 推送到目标 remote；普通 push 不允许破坏性的非快进覆盖。

普通追加 commit 只需普通 push。只有 amend/rebase 等改写已推送历史后才需要 `--force-with-lease`，而且必须先核对远端没有新增提交。

#### 8. 合并后收尾

```bash
git fetch --prune upstream
git switch <base-branch>
git merge --ff-only upstream/<base-branch>
git branch --merged
git branch -d <topic-branch>
```

逐行说明：

1. `git fetch --prune upstream`：从指定 remote 下载对象并按 refspec 更新远端跟踪引用；`--prune` 还清理远端已删除分支的陈旧引用，不改当前工作区。
2. `git switch <base-branch>`：切换到指定本地分支；若会覆盖未提交改动，Git 通常会拒绝。
3. `git merge --ff-only upstream/<base-branch>`：只允许当前分支快进到目标；双方分叉时安全失败，不创建 merge commit。
4. `git branch --merged`：列出分支尖端已经合入当前 `HEAD` 历史的本地分支。
5. `git branch -d <topic-branch>`：安全删除本地分支；Git 判断尚未合并时会拒绝。

`git branch -d` 会在分支尚未合入当前历史时拒绝删除；若平台使用 squash merge，它也可能安全拒绝。此时先在 GitHub 确认 PR 已合并，并核对功能分支没有唯一需要保留的内容，再决定是否强制删除本地分支。远端分支是否删除取决于团队策略，不是流程的强制步骤。

判断「这个已完成 PR 的本地分支到底还有没有未合并内容」时，不要只看 `git branch -vv` 或 `git rev-list --count <base>..<branch>` 报出的领先数：平台用 squash 或 rebase 合并后，原分支的 commit 不是基线分支的祖先，计数仍会显示「领先 N」，这只说明 hash 不同，不代表内容没合进去。删分支前补两条内容证据（补丁等价性的完整说明见本文件 cherry-pick 一节）：

```bash
git cherry -v <base> <branch>
git diff --name-status <base> <branch>
```

逐行说明：

1. `git cherry -v <base> <branch>`：列出 `<branch>` 独有 commit，前缀 `-` 表示该补丁在上游已有等价内容，`+` 表示还没有。
2. `git diff --name-status <base> <branch>`：直接比较两端最终内容。输出为空，或只剩基线分支比它新、它本身从未拥有过的文件，才说明该分支的内容已被 `<base>` 覆盖。

两条都指向「已合并」时再删除分支；任一条存疑就保留分支，或先 `git branch backup/<name> <branch>` 留下备份引用再删，之后仍可用 `git reflog` 或该备份找回。`git diff <base> <branch>` 的残留文件只反映「分支基线比 `<base>` 旧」，不要把它误读成「这次 PR 还有没提交的改动」。

到这里闭环完成：上游包含改动，本地主分支已快进，临时分支已在确认后清理；若中途失败，则依据对应阶段回到备份、abort 或重新检查，而不是用 `reset --hard`/`--force` 掩盖原因。

## 第一部分：基础——独立完成日常开发

### 1. 工作区、暂存区与 commit

- 工作区：你正在编辑的文件。
- 暂存区：执行 `git add` 后，准备进入下一次 commit 的内容。
- commit：一次已经保存到 Git 历史里的快照。

常用查看命令：

```bash
git status --short --branch
git diff
git diff --stat
git log --oneline --decorate -5
```

逐行说明：

1. `git status --short --branch`：用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。
2. `git diff`：显示工作区相对暂存区的完整未暂存差异。
3. `git diff --stat`：统计未暂存改动涉及的文件和增删规模。
4. `git log --oneline --decorate -5`：用单行格式查看最近提交；`--decorate` 显示分支/标签指针，数字限制条数。

### 2. 看懂 `git status --short`

短格式中，文件名前的第一列表示暂存区状态，第二列表示工作区状态：

- `A `：新增文件已暂存。
- `M `：修改已暂存。
- ` M`：工作区有修改，但尚未暂存。
- `??`：未跟踪文件。

因此，先精确执行 `git add -- <path>...`，再检查 `git status --short`，可以确认哪些内容会进入下一次 commit。

如果 `git add -- <path>` 报 `fatal: pathspec '<path>' did not match any files`，表示当前工作树中没有匹配该路径的文件；这不是暂存成功，也通常不是换行或 remote 问题。先用 `git status --short`、`ls <path>` 或 `git stash show -u --name-status 'stash@{0}'` 确认文件是否仍在 stash、位于其他分支，或路径/大小写是否写错。文件尚在 stash 时先恢复，再执行 `git add`；不要用 `git add -A` 掩盖路径错误，否则可能把无关生成文件一起暂存。

### 3. 克隆到明确目录

使用 `git clone <URL> <目标目录>` 可以在下载仓库时明确指定本地目录名和位置：

```powershell
git clone https://github.com/<owner>/<repo>.git <absolute-or-relative-directory>
git -C <absolute-or-relative-directory> remote -v
git -C <absolute-or-relative-directory> status --short --branch
```

逐行说明：

1. `git clone https://github.com/<owner>/<repo>.git <absolute-or-relative-directory>`：从给定 URL 克隆仓库，并把本地工作目录明确创建为最后一个参数。
2. `git -C <absolute-or-relative-directory> remote -v`：让 Git 临时以 `<absolute-or-relative-directory>` 为工作目录；列出所有 remote 的 fetch/push URL，核对实际连接的仓库。
3. `git -C <absolute-or-relative-directory> status --short --branch`：让 Git 临时以 `<absolute-or-relative-directory>` 为工作目录；用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。

- `git clone` 会创建目标目录、下载对象，并检出远端默认分支；它不会修改远端仓库。
- 目标目录已经存在且非空时，Git 会安全失败。不要为了重试而直接删除目录；先确认目录内容，或改用一个新的目录名。
- 克隆后用 `remote -v` 核对 `origin` 是否指向预期仓库，再用 `status --short --branch` 核对当前分支和工作区状态。尤其是同时使用官方仓库与个人 fork 时，不要只根据本地文件夹名判断远端身份。

### 4. `origin`、`upstream` 与 `remote`

常见 remote：

- `origin`：通常是你自己的 fork，例如 `<your-owner>/<repo>`。
- `upstream`：通常是原始上游仓库，例如 `<upstream-owner>/<repo>`。

查看远端：

```bash
git remote -v
```

逐行说明：

1. `git remote -v`：列出所有 remote 的 fetch/push URL，核对实际连接的仓库。

添加上游：

```bash
git remote add upstream https://github.com/<owner>/<repo>.git
```

逐行说明：

1. `git remote add upstream https://github.com/<owner>/<repo>.git`：新增 `upstream` remote，并把后面的 URL 保存为它的远端地址。

拉取远端信息，但不改当前工作区：

```bash
git fetch origin
git fetch upstream
```

逐行说明：

1. `git fetch origin`：从指定 remote 下载对象并按 refspec 更新远端跟踪引用；`--prune` 还清理远端已删除分支的陈旧引用，不改当前工作区。
2. `git fetch upstream`：从指定 remote 下载对象并按 refspec 更新远端跟踪引用；`--prune` 还清理远端已删除分支的陈旧引用，不改当前工作区。

`git fetch origin` 的意思是：把 `origin` 上的最新分支、commit、tag 信息同步到本地的远端引用，例如 `origin/main`，但不会自动合并到你的当前分支。

### 5. 日常提交流程

进入项目：

```bash
cd <project-path>
```

逐行说明：

1. `cd <project-path>`：切换 shell 到项目目录，后续不带 `-C` 的 Git 命令都在此执行。

查看状态：

```bash
git status --short --branch
```

逐行说明：

1. `git status --short --branch`：用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。

查看改动：

```bash
git diff
git diff --check
```

逐行说明：

1. `git diff`：显示工作区相对暂存区的完整未暂存差异。
2. `git diff --check`：检查未暂存补丁中的尾随空格等空白错误。

添加指定文件：

```bash
git add <file-or-directory>
```

逐行说明：

1. `git add <file-or-directory>`：把指定文件或目录的当前内容加入暂存区。

添加所有改动：

```bash
git add -A
```

逐行说明：

1. `git add -A`：把工作树中的新增、修改和删除全部暂存；只有它们属于同一目的时才使用。

只有确认当前所有新增、修改和删除都属于同一个提交时才使用 `git add -A`；否则优先精确暂存路径或使用 `git add -p`。

提交：

```bash
git commit -m "docs(<scope>): <short-description>"
```

逐行说明：

1. `git commit -m "docs(<scope>): <short-description>"`：把当前暂存区保存为新 commit；`-m` 后是提交信息。

推送：

```bash
git push origin <branch-name>
```

逐行说明：

1. `git push origin <branch-name>`：把指定本地分支或 refspec 推送到目标 remote；普通 push 不允许破坏性的非快进覆盖。

第一次推送新分支：

```bash
git push -u origin <branch-name>
```

逐行说明：

1. `git push -u origin <branch-name>`：首次推送分支，并用 `-u` 建立后续 pull/push 使用的上游跟踪关系。

### 6. 约定式提交

基本格式：

```text
<type>[可选 scope][可选 !]: <description>
```

例如中文描述可以直接使用：

```text
perf(automation): 复用截图与识别缓存
fix(mirror): 修正道路与节点层的映射
feat(config)!: 调整队伍配置结构
```

三行示例分别表示：第 1 行是 `automation` 范围的性能优化；第 2 行是 `mirror` 范围的错误修复；第 3 行是 `config` 范围的新功能，`!` 明确表示存在破坏性变更。

- `type` 和 `scope` 通常使用小写英文；`description` 可以使用中文。
- `feat` 表示新增功能，`fix` 表示修复错误；也可按项目约定使用 `perf`、`refactor`、`docs`、`test`、`build`、`ci`、`chore` 等类型。
- `scope` 是可选的影响范围，例如 `automation`、`mirror`、`config`。
- 破坏性变更可在冒号前添加 `!`，并在 footer 中使用 `BREAKING CHANGE: <说明>` 详细解释。
- 如果项目采用 squash merge 或检查 PR 标题，PR 标题也应使用相同格式；PR 正文不要求写成提交标题格式。

### 7. `fetch`、`pull` 与快进同步

`git fetch <remote>` 只更新本地保存的远端引用（例如 `origin/main`），不自动改当前分支和工作区。`git pull` 则先 fetch，再按配置执行 merge 或 rebase；因此它不应被无条件理解为“fetch + merge”。

为了看清每一步，优先把获取和整合分开：

```bash
git fetch --prune origin
git status --short --branch
git log --oneline --left-right HEAD...origin/<branch>
git merge --ff-only origin/<branch>
```

逐行说明：

1. `git fetch --prune origin`：从指定 remote 下载对象并按 refspec 更新远端跟踪引用；`--prune` 还清理远端已删除分支的陈旧引用，不改当前工作区。
2. `git status --short --branch`：用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。
3. `git log --oneline --left-right HEAD...origin/<branch>`：列出两端对称差集中的独有 commit，并标记它属于左侧还是右侧。
4. `git merge --ff-only origin/<branch>`：只允许当前分支快进到目标；双方分叉时安全失败，不创建 merge commit。

`--ff-only` 只允许当前分支指针向前移动；一旦双方各有独立 commit 就安全失败，不会悄悄产生 merge commit。确认当前分支确实跟踪目标远端时，也可简写为 `git pull --ff-only`。失败后先审查两边独有提交，再选择 merge 或 rebase，不要直接强推。

### 8. 推送、创建 PR 与继续修改

普通推送：

```bash
git push origin <branch-name>
```

逐行说明：

1. `git push origin <branch-name>`：把指定本地分支或 refspec 推送到目标 remote；普通 push 不允许破坏性的非快进覆盖。

第一次推送功能分支并建立跟踪关系：

```bash
git push -u origin <branch-name>
```

逐行说明：

1. `git push -u origin <branch-name>`：首次推送分支，并用 `-u` 建立后续 pull/push 使用的上游跟踪关系。

基础流程不应使用 `--force`。改写已经推送的个人分支后，才按进阶章节核对远端 SHA 并使用 `--force-with-lease`。

创建 PR，使用 GitHub CLI：

```bash
gh pr create --repo <upstream-owner>/<repo> --base <base-branch> --head <your-owner>:<branch-name> --title "<title>" --body "<body>"
```

逐行说明：

1. `gh pr create --repo <upstream-owner>/<repo> --base <base-branch> --head <your-owner>:<branch-name> --title "<title>" --body "<body>"`：创建 PR；`--repo` 指定目标仓库，`--base` 指定合入分支，末尾反斜杠表示续行。

Git 本身不能创建 GitHub PR。创建 PR 要么用 `gh pr create`，要么用 GitHub 网页。

如果 PR 还没合并，继续改文件，然后：

```bash
git status --short --branch
git add <file-or-directory>
git commit -m "docs(<scope>): <short-description>"
git push origin <branch-name>
```

逐行说明：

1. `git status --short --branch`：用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。
2. `git add <file-or-directory>`：把指定文件或目录的当前内容加入暂存区。
3. `git commit -m "docs(<scope>): <short-description>"`：把当前暂存区保存为新 commit；`-m` 后是提交信息。
4. `git push origin <branch-name>`：把指定本地分支或 refspec 推送到目标 remote；普通 push 不允许破坏性的非快进覆盖。

GitHub PR 会自动更新。

#### PR 已合并后要继续提交：从最新上游重开分支

PR 一旦合并（squash 或 rebase 合并同样算），原分支就不要再追加 commit。新 PR 的三点差异以「新基线与该分支的共同祖先」为起点，该分支独有的旧提交会再次出现在 `Files changed` 中，维护者看到的是上一轮已经合并的内容。

```bash
gh pr list --repo <upstream-owner>/<repo> --author <your-owner> --state all --limit 20 --json number,headRefName,state
```

逐行说明：

1. `gh pr list --repo <upstream-owner>/<repo> --author <your-owner> --state all --limit 20 --json number,headRefName,state`：读取目标仓库中自己提交过的 PR；`--state all` 包含已合并和已关闭的，`--json` 只返回需要核对的字段。某个 `headRefName` 对应的 `state` 是 `MERGED` 时，这个分支名就不能再复用。

正确做法是先取最新上游基线，再新建分支把新改动带过去：

```bash
git fetch --prune upstream
git diff --stat HEAD upstream/<base-branch> -- <path-1> <path-2>
git switch --no-track -c <new-topic-branch> upstream/<base-branch>
git add -- <path-1> <path-2>
git diff --cached --name-status
git commit -m "<type>(<scope>): <description>"
git push -u origin <new-topic-branch>
```

逐行说明：

1. `git fetch --prune upstream`：更新上游远端跟踪引用，并清理上游已删除分支的陈旧引用；不改工作区。
2. `git diff --stat HEAD upstream/<base-branch> -- <path-1> <path-2>`：只比较本次要带走的路径在新旧基线之间是否相同。输出为空表示两边内容一致。
3. `git switch --no-track -c <new-topic-branch> upstream/<base-branch>`：以最新上游分支为基线新建并切换分支。工作区中未提交的改动会被原样保留，前提是这些文件在新旧 commit 之间内容相同（即上一步输出为空）；内容不同时 Git 会拒绝切换并保持原状，不会丢改动。
4. `git add -- <path-1> <path-2>`：只暂存本次要提交的路径，避免把工作区里其它无关改动一起带走。
5. `git diff --cached --name-status`：提交前核对暂存清单，确认只有预期文件。
6. `git commit -m "<type>(<scope>): <description>"`：把当前暂存区保存为新 commit。
7. `git push -u origin <new-topic-branch>`：首次推送新分支并建立跟踪关系；不要用 `--force` 复用旧分支名。

- 用途与适用条件：适用于「上一轮 PR 已合并，本轮只是对同一批文件的后续修正」。它比 stash 少一步，也不会污染其它分支。
- 检查方法：推送后用 GitHub 比较接口预演 PR 内容，确认新增提交数和文件清单都符合预期：

```bash
gh api repos/<upstream-owner>/<repo>/compare/<base-branch>...<your-owner>:<new-topic-branch> --jq '{status: .status, ahead_by: .ahead_by, behind_by: .behind_by, files: [.files[].filename]}'
```

1. `gh api repos/.../compare/... --jq '{...}'`：服务端返回的 `ahead_by` 是新增提交数，`files` 是 PR 将显示的文件清单；两项都与预期一致才算可以提 PR。
- 风险与恢复：旧分支保持原状，不要删除也不要强推；确认新 PR 合入后再清理本地和 fork 上的旧分支。

#### 推送前确认自己对该仓库有没有写权限

「推到官方仓库」和「有权限推官方仓库」是两件事。fork 工作流中个人账号通常对上游只有只读权限，先查一次可以避免把权限拒绝误判成凭据故障：

```bash
gh api repos/<upstream-owner>/<repo> --jq '{push: .permissions.push, admin: .permissions.admin, default: .default_branch}'
```

逐行说明：

1. `gh api repos/<upstream-owner>/<repo> --jq '{...}'`：读取仓库元数据中当前登录账号的权限位。`push` 为 `false` 表示只能走 fork + PR，不能直接向上游推送；此时把分支推到自己的 fork，再让维护者合并。

#### 开 PR 前确认这个改动是不是已经有 PR 了

从别人的分支、PR 或本地游离提交 cherry-pick 之后再向同一上游提 PR 时，先花三条只读命令确认它没有被别人提过、也没有被上游合过，比等维护者指出重复要省事。如果提交信息里有 `(cherry picked from commit <sha>)`，就用那个来源 commit 作为 `<sha>`：

```bash
git for-each-ref --contains <sha> --format="%(refname)"
gh api repos/<upstream-owner>/<repo>/commits/<sha> --jq '{sha: .sha, author: .commit.author.name, date: .commit.author.date}'
gh api repos/<upstream-owner>/<repo>/commits/<sha>/pulls --jq '.[] | {number, title, state, head: .head.label, base: .base.ref, merged: .merged_at}'
```

逐行说明：

1. `git for-each-ref --contains <sha> --format="%(refname)"`：列出本仓库所有包含该 commit 的引用（本地分支、远端跟踪分支、标签）。输出为空说明它不在本地的任何分支或标签上，很可能只是某次单独 fetch 或 cherry-pick 带进来的对象。
2. `gh api repos/<upstream-owner>/<repo>/commits/<sha>`：读取该仓库网络中是否存在这个 commit。**能返回数据不等于它在某个分支上**：fork 网络里对象存在就可能被查到，所以这一步只证明「这个 hash 真实存在」，不证明「内容已经合进主干」。
3. `gh api repos/<upstream-owner>/<repo>/commits/<sha>/pulls`：列出把这个 commit 包含在内的 PR。返回 `[]` 表示还没有人为它开过 PR；返回条目时先看 `state` 与 `merged`，已合并或已有 open PR 就不该再开一个重复的。

- 用途与适用条件：适用于「改动来自别处、由自己代为向上游提交」的场景。第 2 条对上游仓库和 fork 都可以查，第 3 条要对真正接收 PR 的那个仓库查。
- 检查方法：三条命令之后，还要确认上游基线分支里这段内容是否已经存在（直接读基线分支上的文件文本，或看该文件在基线分支上的最新提交），最后用比较接口核对本次 PR 会显示的文件清单，见本文件「查看 PR 相对上游的改动」一节。
- 风险与恢复：这些命令全部只读，不改工作区、暂存区、本地历史或远端。注意 `git for-each-ref --contains` 输出为空只反映**本地**引用状况，不能据此断定「这个 commit 不存在」或「这个改动是新的」；结论要以上游实际文本为准。

### 9. 用 stash 临时隔离改动

如果 rebase 或 revert 时看到：

```text
error: cannot rebase: You have unstaged changes.
Please commit or stash them.
```

第 1 行说明 rebase 因未暂存改动而拒绝启动；第 2 行给出处理方向——先把改动正式提交，或临时放入 stash。这里的提示不是要求盲目提交，仍应先确认改动是否完整。

说明工作区不干净。一种常用的隔离方式是先 stash（`-u` 会包含未跟踪文件，但不包含被忽略文件）：

```bash
git stash push -u -m "wip before rebase"
```

逐行说明：

1. `git stash push -u -m "wip before rebase"`：保存已跟踪改动及 `-u` 包含的未跟踪文件，并给 stash 添加说明。

如果命令先显示 `Saved working directory and index state ...`，随后又报 `unable to create temporary file ... File exists` 或 `Could not reset index file`，说明 stash 条目可能已经创建，但清理工作区或重置索引没有完全成功。Windows 上常见原因是目标文件被编辑器、构建进程占用，或临时文件冲突。不要立即重复执行 stash；先核对并保留现有条目：

```bash
git status --short --branch
git stash list
git stash show -u --name-status 'stash@{0}'
```

确认内容后，优先用 `git stash apply 'stash@{0}'` 恢复，因为 `apply` 会保留 stash 作为备份；确认恢复和提交无误后，再用 `git stash drop 'stash@{0}'` 清理备份。LF/CRLF 警告本身不是导致 stash 失败的原因。

如果工作区已有不应覆盖的改动，`git stash apply` 可能产生冲突；此时可以按路径从 stash 恢复。stash 中原本已跟踪的文件使用 `git restore --source='stash@{0}' -- <path>...`，由 `-u` 保存的未跟踪文件位于 stash 的第三个父提交，可使用 `git restore --source='stash@{0}^3' -- <path>...` 恢复。恢复前先用 `git stash show -u --name-status 'stash@{0}'` 核对路径，恢复后用 `git status --short` 验收；不要因此删除或重置无关的工作区改动。

查看 stash：

```bash
git stash list
```

逐行说明：

1. `git stash list`：按新到旧列出 stash 条目。

恢复：

```bash
git stash apply 'stash@{0}'
```

逐行说明：

1. `git stash apply 'stash@{0}'`：把指定 stash 应用回工作区，同时保留该 stash 作为副本。

确认恢复无误后，可以删除 stash：

```bash
git stash drop 'stash@{0}'
```

逐行说明：

1. `git stash drop 'stash@{0}'`：删除指定 stash；只在恢复结果核验后执行。

### 10. LF/CRLF 换行警告

`warning: LF will be replaced by CRLF the next time Git touches it` 是换行符转换提示，不代表 `git add` 或提交失败。可用以下命令确认配置来源和文件的换行状态：

```bash
git config --show-origin --get core.autocrlf
git ls-files --eol -- <file>
```

逐行说明：

1. `git config --show-origin --get core.autocrlf`：显示 `core.autocrlf` 的有效值及配置文件来源。
2. `git ls-files --eol -- <file>`：显示指定文件在索引和工作区中的换行形式及属性判定。

优先遵循仓库的 `.gitattributes`。不要为了消除一次提示而随意切换换行配置，或把无关文件批量转换换行符后混入同一个 commit。

### 11. Git 打开 Vim 时如何退出

如果 Git 打开 Vim 编辑 commit message：

保存并退出：

```text
Esc
:wq
Enter
```

三行依次表示：按 `Esc` 回到普通模式，输入 `:wq` 要求写入并退出，按 `Enter` 执行该命令。

不保存退出：

```text
Esc
:q!
Enter
```

三行依次表示：按 `Esc` 回到普通模式，输入 `:q!` 要求不保存并强制退出，按 `Enter` 执行；未保存的编辑器内容会丢失。

如果看到 Vim swap 文件警告：

```text
E325: ATTENTION
Swap file ... already exists
```

第 1 行是 Vim 的 E325 警告编号；第 2 行说明同一目标文件已有 swap，可能来自仍在运行的编辑器，也可能是上次异常退出留下的文件。

先确认是否仍有另一个 Vim 正在编辑同一文件。不能确认时按：

```text
Q
```

### 12. Git 差异查看器底部显示 `(END)`

`git diff`、`git log` 等命令输出较长时，Git 可能通过 `less` 分页显示。底部出现 `(END)` 表示已经看到输出末尾，不是报错，也不是命令仍在等待参数。

```text
q
```

按 `q` 退出分页器并返回 shell 提示符；这不会修改文件、暂存区或提交历史。

这只会退出当前打开尝试，不会解决残留 swap。确认没有其他编辑进程后，可在 Vim 提示中选择恢复内容或删除确认为陈旧的 swap；处理完成后再执行 `git status`，确认 rebase 状态与提交信息无误，最后运行 `git rebase --continue`。不要在不清楚 swap 来源时直接删除它。

## 第二部分：中等——让提交和 PR 可审查、可维护

### 1. 暂存前审查未跟踪文件

普通 `git diff` 比较工作区中的受跟踪文件与暂存区，不会显示 `git status --short` 中标记为 `??` 的未跟踪文件。需要在 `git add` 之前审查一个全新文件时，可以把操作系统的空设备与该文件进行无索引比较：

```powershell
# Windows PowerShell / Git for Windows
git diff --no-index -- NUL <new-file>
```

逐行说明：

1. `# Windows PowerShell / Git for Windows`：注释行，不执行；提醒执行者Windows PowerShell / Git for Windows。
2. `git diff --no-index -- NUL <new-file>`：直接把空设备与新文件比较，以显示未跟踪文件的完整新增内容；发现差异时退出码为 1。

```bash
# Linux / macOS
git diff --no-index -- /dev/null <new-file>
```

逐行说明：

1. `# Linux / macOS`：注释行，不执行；提醒执行者Linux / macOS。
2. `git diff --no-index -- /dev/null <new-file>`：直接把空设备与新文件比较，以显示未跟踪文件的完整新增内容；发现差异时退出码为 1。

- 用途与适用条件：`--no-index` 直接比较两个文件系统路径，因此可把新文件显示成相对于空文件的完整新增内容，也可以在 Git 工作树之外运行。它只读取文件，不修改工作区、暂存区、提交历史或远端。
- 检查方法：执行前后运行 `git status --short -- <new-file>`，状态都应保持 `??`；需要进一步确认时可比较文件哈希。大文件或二进制文件先加 `--stat` 查看规模，避免把大量内容输出到终端。
- 易混淆风险：`--no-index` 隐含 `--exit-code`，发现差异时返回 `1`，无差异时返回 `0`；脚本不能把预期的退出码 `1` 当成命令故障。出现 LF/CRLF 警告也不表示文件已被改写，应以状态和哈希为准。
- 恢复方案：该命令是只读操作，正常情况下无需恢复；输出过多时中断命令即可。若状态或哈希意外变化，说明还有其他进程或命令修改了文件，应先停止后续暂存，再通过编辑器历史、备份或仓库已有版本恢复，不能把变化归因于 `--no-index` 本身。

### 2. 按文件追溯修改来源

排查某个文件或几行代码是何时引入、由哪个提交最后修改时，可以先列出文件历史，再定位行级提交，最后查看具体补丁：

```bash
git log --follow --date=iso --format='%h %ad %s' -- <file>
git blame -L <start>,<end> -- <file>
git show <commit> -- <file>
```

逐行说明：

1. `git log --follow --date=iso --format='%h %ad %s' -- <file>`：按指定格式追踪单个文件历史，并尝试跨越文件重命名。
2. `git blame -L <start>,<end> -- <file>`：标注指定行范围最后由哪些 commit 修改；不能单独据此判断根因。
3. `git show <commit> -- <file>`：显示最新 commit；`--stat` 给出文件统计，`--oneline` 压缩提交头。

- 用途与适用条件：`git log --follow -- <file>` 会在文件改名后继续追踪历史，但 `--follow` 只适用于单个文件；`git blame -L` 只标注指定行范围及其最后修改提交；`git show` 用来查看该提交对目标文件的实际差异。三者应组合使用，不能把 `blame` 显示的最后修改者直接当成问题根因。
- 检查方法：先用 `git status --short --branch` 和 `git rev-parse HEAD` 记录当前分支与提交，再确认 `<file>` 是目标分支中的正确路径。需要追溯远端最新代码时先 `git fetch --prune <remote>`，再对明确的远端引用运行日志或 blame；浅克隆只能看到本地已有历史。
- 风险与恢复：这些查询本身只读，不改工作区、暂存区、提交历史或远端。`blame` 可能把格式化、移动代码或合并提交标记为最后修改，不能单凭它判断责任或因果；历史不完整时也不能据此断言“没有更早改动”。若需要补齐浅克隆历史，`git fetch --unshallow` 会增加本地对象，执行前确认磁盘空间和网络条件。
- 恢复方案：只读查询无需恢复；若只是补齐了浅克隆历史，可继续保留这些本地对象，或在确认不是需要的分析副本后按既有安全流程清理，不要为“恢复历史”执行 `reset --hard`。

### 3. 查看 PR 相对上游的改动

查看 PR 里有哪些 commit：

```bash
git log --oneline upstream/main..main
```

逐行说明：

1. `git log --oneline upstream/main..main`：列出右侧可达而左侧不可达的 commit，用于查看分支新增历史。

查看改了哪些文件：

```bash
git diff --name-status upstream/main...main
```

逐行说明：

1. `git diff --name-status upstream/main...main`：从共同祖先到右侧分支列出新增、修改和删除的文件。

查看统计：

```bash
git diff --stat upstream/main...main
```

逐行说明：

1. `git diff --stat upstream/main...main`：从共同祖先到右侧分支统计文件和行数变化。

查看完整差异：

```bash
git diff upstream/main...main
```

逐行说明：

1. `git diff upstream/main...main`：显示从两端共同祖先到右侧分支的完整差异，适合查看 PR 最终内容。

注意：

- `A..B` 常用于看 B 比 A 多了哪些 commit。
- `A...B` 常用于看 PR 分支相对共同祖先的完整 diff。

本地命令看的是本地引用；推送后想让 GitHub 按服务端实际状态再算一次同一份三点差异，用比较接口：

```bash
gh api repos/<upstream-owner>/<repo>/compare/<base-branch>...<fork-owner>:<topic-branch> --jq '{status: .status, ahead_by: .ahead_by, behind_by: .behind_by, files: [.files[].filename]}'
```

逐行说明：

1. `gh api repos/<upstream-owner>/<repo>/compare/<base-branch>...<fork-owner>:<topic-branch> --jq '{...}'`：调用 GitHub 的比较接口并按 JSON 字段筛选输出。路径里的 `<fork-owner>:<topic-branch>` 用冒号把 fork 所有者和分支名连起来，专门用来比较「上游基线」与「自己 fork 里的分支」；`ahead_by` 是领先提交数，`behind_by` 是落后提交数，`files` 是 PR 会显示的文件清单。

- 用途与适用条件：推送到 fork 之后、创建 PR 之前各跑一次，同时确认「只有预期的提交数」和「只有预期的文件」，比只看本地 diff 更接近维护者实际看到的内容。
- 注意：`behind_by` 不为 0 不等于 PR 有问题，只说明基线分支又前进了；若希望 PR 的 diff 保持最小，先同步基线再推送。`files` 里出现与本次主题无关的文件时，说明分支基线过期或暂存时带上了多余改动，应停下重新建分支，而不是让维护者替你筛。`behind_by` 不为 0 时，再用 `git ls-remote <upstream> refs/heads/<base-branch>` 或 `gh api repos/<upstream-owner>/<repo>/commits/<base-branch> --jq .sha` 独立核对基线 tip：一次 `fetch` 后远端引用没更新不一定代表上游没动，也可能是 `fetch` 自己失败、而错误信息被管道里的 `Select-String`/`Where-Object` 过滤条件一起丢掉了（只保留「包含 main 的行」就会漏掉 `fatal: unable to access ...`）。
- 判断「PR 能不能合」要看 pulls 接口，而不是 compare 接口：

```bash
gh api repos/<upstream-owner>/<repo>/pulls/<pr-number> --jq '{mergeable: .mergeable, mergeable_state: .mergeable_state, base_sha: .base.sha}'
```

逐行说明：

1. `gh api repos/<upstream-owner>/<repo>/pulls/<pr-number> --jq '{...}'`：读取服务端对该 PR 的合并判定与当前基线 SHA。`mergeable` 为 `true` 且 `mergeable_state` 为 `clean` 表示三方合并可以自动完成；刚推送完时 `mergeStateStatus` 可能短暂显示 `UNKNOWN`，过几秒再查一次即可。

- compare 接口返回 `status: diverged` 与 `mergeable_state: clean` 并不矛盾：`diverged` 只表示双方各有独有提交（`ahead_by > 0` 且 `behind_by > 0`），不是冲突信号。两个接口的分工是：compare 看「PR 会显示哪些提交和文件」，pulls 看「能不能合」。
- 基线前进后还要查**语义重叠**，不能只看文本冲突：上游可能改了同一批文件、甚至删掉了同目录的另一篇文档，而三方合并依旧是 `clean`，此时 PR 的内容已经过时或与上游方向相反。

```bash
git fetch --prune upstream
git log --oneline <old-base>..upstream/main -- <path-1> <path-2>
git diff --stat <old-base> upstream/main -- <path-1> <path-2>
```

逐行说明：

1. `git fetch --prune upstream`：更新上游远端跟踪引用，确认基线 tip 是否真的前进；不改工作区与本地历史。
2. `git log --oneline <old-base>..upstream/main -- <path-1> <path-2>`：列出上游新增提交中碰过本次路径的那些；输出为空说明这批文件在基线前进期间没被动过。`<old-base>` 用分支的基线提交（分支起点，或上次同步时的 `upstream/<base-branch>`）。
3. `git diff --stat <old-base> upstream/main -- <path-1> <path-2>`：看上游相对旧基线在这些路径上的增删规模，用来判断是否需要先同步基线再让维护者评审。

第 2 条输出非空不等于必须 rebase：只要改动落在文件的不同位置，普通合并依旧干净；但应在 PR 描述或评论里说明已核对上游对同批文件的改动，必要时先同步基线再推送。

- 易踩坑（Windows PowerShell）：`gh api ... --jq` 的表达式里只要含内嵌双引号，就会被拆成两个参数并报 `gh: accepts 1 arg(s), received 2`，看起来像接口、字段或权限写错，其实是本地传参问题。实测（Windows PowerShell 5.1.26100，同一 compare 接口）：`.files[] | "\(.status)  \(.filename)"`、`.files[0].filename + " X"`、以及把同一表达式先存入变量再传，三种写法全部失败；改成不含双引号的 `.files[] | [.status, .filename] | @tsv` 或 `.files[].filename` 立即正常。需要「状态 + 文件名」这类组合输出时用 `@tsv`，或每次只取一个字段、分多次调用。

### 4. 把一批未提交改动拆成多个 commit

当工作区同时包含多个独立功能时，不要直接使用 `git add -A`。先按依赖顺序规划提交，再显式暂存属于当前 commit 的文件：

```bash
git status --short
git diff --stat
git add <file-1> <file-2>
git diff --cached --check
git diff --cached --stat
git commit -m "<本次提交的单一目的>"
```

逐行说明：

1. `git status --short`：用紧凑格式显示工作区和暂存区状态。
2. `git diff --stat`：统计未暂存改动涉及的文件和增删规模。
3. `git add <file-1> <file-2>`：只把列出的两个路径加入暂存区，其他工作区改动保持未暂存。
4. `git diff --cached --check`：检查暂存补丁中的空白错误或冲突标记。
5. `git diff --cached --stat`：统计暂存区相对 `HEAD` 的文件和行数变化。
6. `git commit -m "<本次提交的单一目的>"`：把当前暂存区保存为新 commit；`-m` 后是提交信息。

- `git add <file...>` 只改变暂存区，不删除工作区内容；未暂存的改动可以继续留给后续 commit。
- `git diff --cached` 用于检查即将提交的内容，避免把其他功能混入当前 commit。
- 需要只发布一组明确文件时，暂存后用 `git diff --cached --name-status` 核对暂存清单，再用 `git diff --name-status` 查看仍未暂存的受跟踪改动；后者不会显示 `??`，所以还要同时检查 `git status --short --untracked-files=all`。清单不符合预期时，先执行 `git restore --staged -- <path>...` 修正，不要直接提交。
- 如果同一个文件里的不同代码块需要进入不同 commit，可使用 `git add -p <file>` 逐块选择。
- 如果暂存错了文件，使用 `git restore --staged <file>` 只撤销暂存，不会丢弃工作区修改。
- 提交顺序应先放底层能力，再放依赖它的业务改动，使每个 commit 都尽量可独立理解、测试和回退。

需要把少量指定差异转移到内容略有变化的新基准分支时，可以生成零上下文补丁：

```bash
git diff --unified=0 -- <path>... > <patch-file>
git apply --check --unidiff-zero <patch-file>
git apply --unidiff-zero <patch-file>
```

1. `git diff --unified=0 -- <path>... > <patch-file>`：只为指定路径生成不包含周边上下文行的补丁文件，不修改工作区或历史。
2. `git apply --check --unidiff-zero <patch-file>`：允许零上下文补丁并预检能否应用；只检查，不修改文件。
3. `git apply --unidiff-zero <patch-file>`：把已通过预检的补丁应用到工作区，不自动暂存或提交。

`--unified=0` 与 `--unidiff-zero` 必须配套；否则普通 `git apply` 会按默认上下文要求处理，可能报告 `patch does not apply`。零上下文补丁缺少周边定位信息，误匹配风险高于普通补丁，因此必须限制路径、先执行 `--check`，应用后再用 `git diff -- <path>...` 审查。预检失败时不要强制应用；重新核对目标分支和补丁内容，必要时从目标分支直接编辑。

全部提交完成后统一检查：

```bash
git status --short --branch
git log --oneline <base>..HEAD
git diff --check <base>...HEAD
```

逐行说明：

1. `git status --short --branch`：用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。
2. `git log --oneline <base>..HEAD`：列出右侧可达而左侧不可达的 commit，用于查看分支新增历史。
3. `git diff --check <base>...HEAD`：检查从共同祖先到右侧分支的补丁是否存在空白错误。

这些命令只检查本地状态；执行 `git push` 后才会修改远端分支。

### 5. 修改最近一次 commit

只在最近一次 commit 尚未被他人依赖，或你明确接受改写历史时使用 amend。先精确暂存本次要补入的路径，避免 `git add -A` 把无关改动一起带入：

```bash
git status --short --branch
git add -- <path>...
git diff --cached --check
git diff --cached
git commit --amend --no-edit
```

逐行说明：

1. `git status --short --branch`：用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。
2. `git add -- <path>...`：把指定路径加入暂存区；`--` 明确分隔选项与路径。
3. `git diff --cached --check`：检查暂存补丁中的空白错误或冲突标记。
4. `git diff --cached`：显示暂存区相对 `HEAD` 的完整差异，即下一次 commit 的候选内容。
5. `git commit --amend --no-edit`：用当前暂存区重建最近一次 commit 并保留原提交信息；hash 会改变。

若只修改提交信息，直接执行 `git commit --amend`。amend 会生成新 commit hash：尚未推送时普通 push 即可；已经推送到个人分支时，先 fetch 并核对远端，再使用 `--force-with-lease`。公共或共享分支优先追加修复 commit，不改写历史。

恢复：amend 前的 commit 通常仍可通过 `git reflog` 找回；在确认新结果前，不要删除备份引用或做仓库清理。

### 6. 判断 PR 测试是否接入 CI

不要只根据 PR 页面暂时没有检查结果就删除测试。先查看工作流实际执行的命令和测试框架的收集配置，例如：

```bash
rg -n "pytest|testpaths" .github pyproject.toml
gh run list --repo <upstream-owner>/<repo> --branch <pr-branch> --limit 5
gh pr view <pr-number> --json statusCheckRollup,mergeStateStatus,url
```

逐行说明：

1. `rg -n "pytest|testpaths" .github pyproject.toml`：在工作流和配置中搜索测试入口与 pytest 收集规则。
2. `gh run list --repo <upstream-owner>/<repo> --branch <pr-branch> --limit 5`：列出目标仓库和分支最近 5 次工作流运行。
3. `gh pr view <pr-number> --json statusCheckRollup,mergeStateStatus,url`：读取 PR 远端信息；选项限定仓库、评论或 JSON 字段。

- 工作流执行 `pytest`，且测试文件位于 `testpaths` 指定目录并符合 `test_*.py` 等收集规则时，测试已经接入 CI。
- fork PR 的工作流显示 `action_required` 且没有测试 job，通常表示需要上游仓库维护者批准运行，不等于测试失败或没有接入 CI。
- 本地测试通过只能证明当前环境的结果；PR 中应同时说明 CI 的收集依据，并等待维护者批准后的远端结果。

### 7. PowerShell 发布中文 PR 内容时避免乱码

Windows PowerShell 5 把 here-string 通过管道传给 `gh ... --body-file -` 时，可能按非 UTF-8 编码写入标准输入，导致中文在 GitHub 上变成 `?`。最稳妥的方式是手动在 GitHub 编辑器粘贴，或先生成明确的 UTF-8 文件再交给 `gh`：

```powershell
$content = @'
<中文正文>
'@
[System.IO.File]::WriteAllText(
    "<absolute-utf8-body-file>",
    $content,
    [System.Text.UTF8Encoding]::new($false)
)
gh pr comment <pr-number> --body-file <absolute-utf8-body-file>
```

逐行说明：

1. `$content = @'`：开始 PowerShell 单引号 here-string，内部内容不会展开变量。
2. `<中文正文>`：正文占位行，替换为实际中文多行内容。
3. `'@`：结束 here-string，并把完整文本赋给 `$content`。
4. `[System.IO.File]::WriteAllText(`：开始调用 .NET 文本写入方法。
5. `    "<absolute-utf8-body-file>",`：第一个参数：要写入的正文文件绝对路径。
6. `    $content,`：第二个参数：前面保存的正文内容。
7. `    [System.Text.UTF8Encoding]::new($false)`：第三个参数：不带 BOM 的 UTF-8 编码。
8. `)`：结束前面开始的 .NET 方法调用。
9. `gh pr comment <pr-number> --body-file <absolute-utf8-body-file>`：把明确编码的文件内容作为评论发布到指定 PR。

发布后立即读取远端内容确认中文正常；若已产生乱码，应编辑或删除错误评论，不要再用同一条管道重复发送：

```bash
gh pr view <pr-number> --comments
```

逐行说明：

1. `gh pr view <pr-number> --comments`：读取 PR 远端信息；选项限定仓库、评论或 JSON 字段。

### 8. 在 PR 正文中嵌入图片

先区分图片的用途：

- 一次性的性能曲线、运行截图和评审证明材料，只服务于当前 PR，应通过 GitHub PR 编辑器拖放/粘贴到正文或评论中，使用 GitHub 生成的附件地址，不要提交进仓库。这样图片能在 PR 中展示，但不会出现在文件列表、发布包和项目历史里。
- 项目长期需要维护的说明图、界面资源或文档素材，才适合提交到仓库并由正文引用。

如果维护者明确接受图片成为仓库文档，可将它作为独立文档提交到 PR 分支；`git add`、`git commit` 和 `git push` 会依次修改暂存区、本地历史和远端分支：

```bash
git add <image-path>
git commit -m "docs(<scope>): <description>"
git push origin <branch-name>
```

逐行说明：

1. `git add <image-path>`：把指定图片文件加入暂存区。
2. `git commit -m "docs(<scope>): <description>"`：把当前暂存区保存为新 commit；`-m` 后是提交信息。
3. `git push origin <branch-name>`：把指定本地分支或 refspec 推送到目标 remote；普通 push 不允许破坏性的非快进覆盖。

图片推送后，可使用完整 commit hash 生成不随分支移动而变化的链接：

```markdown
![<alt-text>](https://raw.githubusercontent.com/<owner>/<repo>/<full-commit-hash>/<image-path>)
```

这一行中，`<alt-text>` 是图片无法显示时的替代文字；`<owner>/<repo>` 定位仓库；`<full-commit-hash>` 把链接固定到不可变提交；`<image-path>` 是图片在该提交中的仓库相对路径。

先推送再引用，否则 GitHub 无法读取该图片。使用完整 commit hash 还能避开分支名含 `/` 时的 ref/path 解析歧义；如果以后删除 fork 或希望图片长期由上游仓库托管，应在合并后把链接更新为上游仓库中仍可访问的位置。

若一次性图片已经进入 PR 文件列表，先把 PR 正文中的图片换成 GitHub 附件地址，再用普通删除提交移出最终差异，无需改写历史：

```bash
git rm -- <image-path>
git commit -m "docs(<scope>): 移除仓库中的一次性验证图片"
git push origin <branch-name>
gh pr view <pr-number> --json files,url
```

逐行说明：

1. `git rm -- <image-path>`：从工作区和暂存区删除指定受跟踪文件，使删除进入下次 commit。
2. `git commit -m "docs(<scope>): 移除仓库中的一次性验证图片"`：把当前暂存区保存为新 commit；`-m` 后是提交信息。
3. `git push origin <branch-name>`：把指定本地分支或 refspec 推送到目标 remote；普通 push 不允许破坏性的非快进覆盖。
4. `gh pr view <pr-number> --json files,url`：读取 PR 远端信息；选项限定仓库、评论或 JSON 字段。

最后一条命令用于确认图片已不在 PR 文件列表中。删除提交不会自动删除 PR 正文中的旧链接，因此必须单独检查正文仍能正常显示。

通过 API 更新已有 PR 正文只修改 GitHub 上的 PR 元数据，不改本地工作区或 Git 历史：

```bash
gh api repos/<upstream-owner>/<repo>/pulls/<pr-number> \
  -X PATCH \
  -f "body=<complete-body>"
```

逐行说明：

1. `gh api repos/<upstream-owner>/<repo>/pulls/<pr-number> \`：调用指定 GitHub REST 端点；反斜杠表示参数续到下一行。
2. `  -X PATCH \`：续接上一行，把 HTTP 方法设为 PATCH，并继续下一行。
3. `  -f "body=<complete-body>"`：续接上一行，把完整 PR 正文作为 `body` 字段发送并覆盖旧正文。

多行正文的引号规则取决于当前 shell；更新后应同时确认正文和图片地址：

```bash
gh pr view <pr-number> --repo <upstream-owner>/<repo> --json body,url
curl -I "https://raw.githubusercontent.com/<owner>/<repo>/<full-commit-hash>/<image-path>"
```

逐行说明：

1. `gh pr view <pr-number> --repo <upstream-owner>/<repo> --json body,url`：读取 PR 远端信息；选项限定仓库、评论或 JSON 字段。
2. `curl -I "https://raw.githubusercontent.com/<owner>/<repo>/<full-commit-hash>/<image-path>"`：只读取 URL 响应头，用状态码和 `Content-Type` 核验图片。

`curl -I` 只读取响应头；预期看到 `200 OK` 和正确的图片 `Content-Type`。

### 9. 同名分支落后远端时避免覆盖历史

当 `git status --short --branch` 显示本地分支落后其同名远端分支，例如 `[behind <n>]`，而当前工作区又包含一批需要发布的本地改动时，不要直接强推同名分支，也不要为了绕过拒绝而使用 `--force`。如果这些改动确实要作为独立版本保留，可从当前提交创建一个全新的发布分支，再分组提交并首次推送：

```bash
git status --short --branch
git branch -vv
git log --oneline --left-right origin/<old-branch>...<old-branch>
git switch -c release/<version-or-date>
git add -- <file-1> <file-2>
git diff --cached --check
git diff --cached --stat
git commit -m "<type>(<scope>): <single-purpose-description>"
# 对其余独立改动重复精确暂存、检查和提交
git log --oneline <base>..HEAD
git diff --check <base>...HEAD
git push -u origin release/<version-or-date>
```

逐行说明：

1. `git status --short --branch`：用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。
2. `git branch -vv`：列出本地分支、当前指针、跟踪分支及 ahead/behind 信息。
3. `git log --oneline --left-right origin/<old-branch>...<old-branch>`：列出两端对称差集中的独有 commit，并标记它属于左侧还是右侧。
4. `git switch -c release/<version-or-date>`：从当前 commit 新建并切换到指定分支。
5. `git add -- <file-1> <file-2>`：把指定路径加入暂存区；`--` 明确分隔选项与路径。
6. `git diff --cached --check`：检查暂存补丁中的空白错误或冲突标记。
7. `git diff --cached --stat`：统计暂存区相对 `HEAD` 的文件和行数变化。
8. `git commit -m "<type>(<scope>): <single-purpose-description>"`：把当前暂存区保存为新 commit；`-m` 后是提交信息。
9. `# 对其余独立改动重复精确暂存、检查和提交`：注释行，不执行；提醒执行者对其余独立改动重复精确暂存、检查和提交。
10. `git log --oneline <base>..HEAD`：列出右侧可达而左侧不可达的 commit，用于查看分支新增历史。
11. `git diff --check <base>...HEAD`：检查从共同祖先到右侧分支的补丁是否存在空白错误。
12. `git push -u origin release/<version-or-date>`：首次推送分支，并用 `-u` 建立后续 pull/push 使用的上游跟踪关系。

- 用途与适用条件：适合“保留远端原分支不动，同时发布当前本地成果”。`git switch -c` 只在当前提交创建并切换本地分支；后续 commit 只进入新分支；`git push -u` 首次创建同名远端发布分支并设置跟踪关系。它不会自动合并远端旧分支的 `<n>` 个提交。
- 发布前检查：先用 `git branch -vv` 确认落后关系，再用带 `--left-right` 的日志分别审查两边独有提交；分组提交时继续使用精确 `git add -- <path>...` 和 `git diff --cached`，避免把脏工作区中的无关修改一起发布。推送后用 `git status --short --branch`、`git log --oneline --decorate -5` 和 `git ls-remote origin refs/heads/release/<version-or-date>` 核对本地跟踪关系及远端 SHA。
- 风险：新分支保住了两边历史，但如果发布内容依赖远端旧分支独有的提交，仍可能构建失败或缺少修复。应在新分支独立运行测试；需要真正同步两边时，仍须另行 merge、rebase 或按依赖 cherry-pick，不能把“换分支发布”误当成“已经同步远端”。
- 恢复：尚未推送时，可切回旧分支；新分支提交仍可通过分支名找回。已经推送后若需要撤回，应先确认没有 Release、部署或协作者依赖，再删除明确的新发布分支；若只是代码有误，优先在该发布分支追加修复或 `git revert <commit>`，避免改写已公开历史。

## 第三部分：进阶——改写历史、解决冲突并可恢复

### 1. 先决定历史能否改写

- **公共/共享历史**：优先追加修复 commit 或 `git revert`；不要 rebase 后强推。
- **个人且尚未共享的功能分支**：可以 amend/rebase，但先保证工作区干净并创建备份分支。
- **已经推送的个人 PR 分支**：确需改写时，先记录远端旧 SHA；验收后使用带精确预期值的 lease。

```bash
git status --short --branch
git fetch --prune origin
git log --oneline --decorate -10
git branch backup/before-rewrite
git ls-remote origin refs/heads/<branch>
```

逐行说明：

1. `git status --short --branch`：用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。
2. `git fetch --prune origin`：从指定 remote 下载对象并按 refspec 更新远端跟踪引用；`--prune` 还清理远端已删除分支的陈旧引用，不改当前工作区。
3. `git log --oneline --decorate -10`：用单行格式查看最近提交；`--decorate` 显示分支/标签指针，数字限制条数。
4. `git branch backup/before-rewrite`：在当前或明确指定的 commit 创建备份分支引用，作为恢复点。
5. `git ls-remote origin refs/heads/<branch>`：只读查询远端引用及 SHA，不更新本地工作区或跟踪分支。

精确 lease 的形式是：

```bash
git push --force-with-lease=refs/heads/<branch>:<expected-old-sha> \
  origin HEAD:refs/heads/<branch>
```

逐行说明：

1. `git push --force-with-lease=refs/heads/<branch>:<expected-old-sha> \`：执行非快进更新，但仅当远端目标仍等于明确给出的旧 SHA；不匹配即拒绝。
2. `  origin HEAD:refs/heads/<branch>`：续接上一行，把本地 `HEAD` 写到 origin 的明确分支。

它要求远端分支仍等于你记录的旧 SHA；如果已变化，push 会拒绝覆盖。失败不是让你改用 `--force` 的理由，而是说明必须重新获取和审查远端更新。

### 2. 撤销最近一次 commit

先决定要保留到哪里：

- 保留改动并保持为“已暂存”：`git reset --soft HEAD~1`。它只移动 `HEAD`，暂存区和工作区不变。
- 保留改动但撤销暂存：`git reset HEAD~1`（默认 mixed）。它移动 `HEAD` 并重置暂存区，工作区文件保留。
- 同时丢弃 commit、暂存区和工作区内容：`git reset --hard HEAD~1`。这是不可逆风险最高的选项，只有确认内容无需保留且有恢复点时才使用。

安全顺序：

```bash
git status --short --branch
git log --oneline --decorate -5
git branch backup/before-reset
git reset --soft HEAD~1
git status --short --branch
git diff --cached
```

逐行说明：

1. `git status --short --branch`：用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。
2. `git log --oneline --decorate -5`：用单行格式查看最近提交；`--decorate` 显示分支/标签指针，数字限制条数。
3. `git branch backup/before-reset`：在当前或明确指定的 commit 创建备份分支引用，作为恢复点。
4. `git reset --soft HEAD~1`：只移动 `HEAD` 到目标 commit，暂存区和工作区保持不变，因此撤下的提交内容仍处于已暂存状态。
5. `git status --short --branch`：用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。
6. `git diff --cached`：显示暂存区相对 `HEAD` 的完整差异，即下一次 commit 的候选内容。

如果该 commit 已在公共或共享分支上，优先使用 `git revert <commit>` 新增反向提交。reset 后发现选错，可从 `backup/before-reset` 或 `git reflog` 找回原 commit；不要在证据未核对时继续 hard reset 或强推。

### 3. 删除某个旧 commit，保留后续 commit

假设 PR 历史是：

```text
A -- C1 -- C2 -- C3  <branch>
     ↑     ↑     ↑
   要删   保留  保留
```

要删除 `C1`，保留 `C2` 和 `C3`，使用：

```bash
git branch backup/before-drop-C1
git rebase --onto C1^ C1 <branch>
```

逐行说明：

1. `git branch backup/before-drop-C1`：在当前或明确指定的 commit 创建备份分支引用，作为恢复点。
2. `git rebase --onto C1^ C1 <branch>`：把选定提交序列重放到新基准上；被重放的 commit hash 会变化。

含义：

- `C1^`：要删除的 commit 的父提交，也是新的接入点。
- 第二个 `C1`：从它后面的 commit 开始重放。
- `<branch>`：要被改写的个人分支。

结果会从：

```text
A -- C1 -- C2 -- C3
```

变成：

```text
A -- C2' -- C3'
```

注意：后两个 commit 会被重新生成，所以 hash 会变化。

完成后推送：

```bash
git push --force-with-lease origin <branch>
```

逐行说明：

1. `git push --force-with-lease origin <branch>`：允许非快进更新，但要求 lease 仍有效；精确 SHA 形式比隐式 lease 更可靠。

若分支已经推送，优先使用本部分第 1 节给出的精确 lease，并在推送前后比较远端 SHA。公共或共享分支不要用这套方法删除历史，应改用 `git revert`。

### 4. 修改已推送 commit 的提交信息

修改已经推送到 PR 的 commit message 会改写 commit hash。安全顺序：

```bash
git fetch origin
git status --short --branch
git branch backup/before-reword
git rebase -i <base>
git range-diff <base>..backup/before-reword <base>..HEAD
git diff --exit-code backup/before-reword HEAD
git push --force-with-lease origin <branch-name>
```

逐行说明：

1. `git fetch origin`：从指定 remote 下载对象并按 refspec 更新远端跟踪引用；`--prune` 还清理远端已删除分支的陈旧引用，不改当前工作区。
2. `git status --short --branch`：用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。
3. `git branch backup/before-reword`：在当前或明确指定的 commit 创建备份分支引用，作为恢复点。
4. `git rebase -i <base>`：从指定基准之后启动交互式 rebase，可重排、压缩、删除或改写 commit。
5. `git range-diff <base>..backup/before-reword <base>..HEAD`：逐个比较重写前后两段提交序列，核对补丁对应关系。
6. `git diff --exit-code backup/before-reword HEAD`：比较两个引用的最终文件树；相同返回 0，不同返回 1。
7. `git push --force-with-lease origin <branch-name>`：允许非快进更新，但要求 lease 仍有效；精确 SHA 形式比隐式 lease 更可靠。

- `git range-diff` 用于确认每个旧 commit 与新 commit 的对应关系；如果只改标题，内容 diff 应保持一致。
- `git diff --exit-code backup/before-reword HEAD` 用于确认重写前后的最终文件树完全相同。
- `--force-with-lease` 会在远端分支已被他人更新时拒绝覆盖，比 `--force` 安全。
- 推送前发现问题可使用 `git rebase --abort`；重写完成后仍可从 `backup/before-reword` 找回旧历史。若要恢复分支，先确认工作区干净，再把分支重置到备份并使用 `--force-with-lease` 推送。

### 5. rebase 冲突处理

rebase 过程中如果看到：

```text
CONFLICT (content): Merge conflict in <file>
error: could not apply <commit>
```

第 1 行说明 `<file>` 出现内容冲突；第 2 行说明 Git 当前无法自动重放 `<commit>`。二者只定位失败位置，不代表应该保留哪一侧内容。

说明 Git 正在重放某个 commit，但这个 commit 和当前基底冲突了。

查看状态：

```bash
git status
```

逐行说明：

1. `git status`：完整显示当前 Git 操作、冲突、暂存和未暂存状态。

打开冲突文件：

```bash
code <file>
```

逐行说明：

1. `code <file>`：用 VS Code 打开目标冲突文件进行人工语义合并。

冲突标记长这样：

```text
<<<<<<< HEAD
当前基底内容
=======
正在重放的 commit 内容
>>>>>>> <commit>
```

五行依次表示：冲突区起点及当前 `HEAD` 一侧、当前基底的实际内容、两侧分隔符、正在重放提交的实际内容、冲突区终点及对应 commit。解决时必须删除三条标记线并整理出唯一正确的最终内容。

在 VS Code 里：

- `Accept Current Change`：保留当前基底内容。
- `Accept Incoming Change`：保留正在重放的 commit 内容。
- `Accept Both Changes`：两边都保留。
- `Compare Changes`：对比两边差异。

不要仅凭按钮名称机械选择一侧。rebase 时 `ours/current` 通常是新的基底，`theirs/incoming` 通常是正在重放的个人提交，但编辑器文案可能不同。先用 `git status` 确认正在重放哪个 commit，再比较共同祖先和两侧内容；最终文件必须表达真正要保留的语义，并通过测试。

解决完冲突后：

```bash
git add <file>
git rebase --continue
```

逐行说明：

1. `git add <file>`：把已经解决冲突的文件加入暂存区，向 rebase 标记该文件已处理。
2. `git rebase --continue`：当前冲突解决并暂存后，继续重放下一个 commit。

PowerShell / Git for Windows 下不要照搬 `git -c core.editor=true rebase --continue`：`true` 可能不是可执行文件，会报 `cannot spawn true`。直接执行 `git rebase --continue`；如果打开 Vim，按本文“Vim 里怎么退出”的方法保存退出。自动化环境若要跳过编辑器，`core.editor` 必须指向一个已经验证可执行的脚本或程序，不能假设 Unix 的 `true` 在 Windows `PATH` 中。

如果还有冲突，重复：

```bash
git status
code <file>
git add <file>
git rebase --continue
```

逐行说明：

1. `git status`：完整显示当前 Git 操作、冲突、暂存和未暂存状态。
2. `code <file>`：用 VS Code 打开目标冲突文件进行人工语义合并。
3. `git add <file>`：把本轮已经解决冲突的文件加入暂存区。
4. `git rebase --continue`：当前冲突解决并暂存后，继续重放下一个 commit。

如果中途不想继续：

```bash
git rebase --abort
```

逐行说明：

1. `git rebase --abort`：放弃整个 rebase，并恢复到开始前的状态。

`git rebase --abort` 会回到 rebase 开始前的状态。

### 6. `revert` 与 `rebase --onto` 的选择

`git revert <commit>`：

- 不删除历史。
- 新增一个反向 commit，用来抵消指定 commit 的改动。
- 适合公共分支、多人协作分支、已经合并的 commit。

```bash
git revert <commit>
git push origin <branch-name>
```

逐行说明：

1. `git revert <commit>`：创建新 commit 反向抵消目标补丁，不删除公共历史。
2. `git push origin <branch-name>`：把指定本地分支或 refspec 推送到目标 remote；普通 push 不允许破坏性的非快进覆盖。

`git rebase --onto <commit>^ <commit> <branch>`：

- 会改写历史。
- 指定 commit 会从分支历史中消失。
- 后续 commit 会重新生成新 hash。
- 适合自己的 PR 分支。

```bash
git rebase --onto <commit>^ <commit> <branch>
git push --force-with-lease origin <branch>
```

逐行说明：

1. `git rebase --onto <commit>^ <commit> <branch>`：把选定提交序列重放到新基准上；被重放的 commit hash 会变化。
2. `git push --force-with-lease origin <branch>`：允许非快进更新，但要求 lease 仍有效；精确 SHA 形式比隐式 lease 更可靠。

决策建议：

- 想让 PR 历史干净：用 `rebase --onto`。
- 不想强推，或者别人也在基于这个分支开发：用 `revert`。

### 7. 工作区不干净时用 worktree 隔离修复 PR 冲突

当前 PR 分支所在工作区不干净时，不要直接在其中 merge 或 rebase。可以从远端 PR 分支建立临时 worktree，让原工作区的未提交改动保持原样：

```bash
git fetch --prune origin
git fetch --prune upstream
git status --short --branch
git worktree add -b <temporary-branch> <absolute-temporary-path> origin/<pr-branch>
git -C <absolute-temporary-path> merge --no-ff upstream/main \
  -m "chore(sync): 合并上游 main 并解决冲突"
```

逐行说明：

1. `git fetch --prune origin`：从指定 remote 下载对象并按 refspec 更新远端跟踪引用；`--prune` 还清理远端已删除分支的陈旧引用，不改当前工作区。
2. `git fetch --prune upstream`：从指定 remote 下载对象并按 refspec 更新远端跟踪引用；`--prune` 还清理远端已删除分支的陈旧引用，不改当前工作区。
3. `git status --short --branch`：用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。
4. `git worktree add -b <temporary-branch> <absolute-temporary-path> origin/<pr-branch>`：创建新分支及独立 worktree；它与主工作树共享对象库但隔离文件。
5. `git -C <absolute-temporary-path> merge --no-ff upstream/main \`：让 Git 临时以 `<absolute-temporary-path>` 为工作目录；把目标分支合入当前分支；`--no-ff` 保留 merge commit，`-m` 指定其信息。
6. `  -m "chore(sync): 合并上游 main 并解决冲突"`：续接 merge 命令并指定 merge commit 信息。

- `git worktree add` 会让同一仓库拥有另一个独立工作目录，但共享对象库和分支元数据。因为一个本地分支不能同时被两个 worktree 检出，这里应创建临时分支，不能直接再次检出正在使用的 PR 本地分支。
- 合并冲突时不能机械选择 “current” 或 “incoming”；应比较共同祖先、PR 版本和上游版本，整理出同时满足两边意图的最终代码。
- merge 会新增一个提交，但不改写已有 PR commit，因此通常可以普通推送；如果项目要求线性历史，再改用 rebase，并在验证后使用 `--force-with-lease`。

当冲突文件的一侧已经整体重构时，可以先把该侧版本恢复到工作区，作为手工语义合并的起点；这不是“自动解决冲突”：

```bash
git status --short
git ls-files -u -- <file>
git restore --theirs --worktree -- <file>
# 等价旧写法：git checkout --theirs -- <file>
# 手工重新接入另一侧仍需保留的逻辑，然后检查、测试并暂存
git diff --check -- <file>
git add -- <file>
git diff --cached --check
```

逐行说明：

1. `git status --short`：用紧凑格式显示工作区和暂存区状态。
2. `git ls-files -u -- <file>`：列出冲突文件在索引 stage 1/2/3 中的未合并条目。
3. `git restore --theirs --worktree -- <file>`：把冲突索引中的 `theirs` 版本写入工作区，作为人工语义合并起点。
4. `# 等价旧写法：git checkout --theirs -- <file>`：注释行，不执行；提醒执行者等价旧写法：git checkout --theirs -- <file>。
5. `# 手工重新接入另一侧仍需保留的逻辑，然后检查、测试并暂存`：注释行，不执行；提醒执行者手工重新接入另一侧仍需保留的逻辑，然后检查、测试并暂存。
6. `git diff --check -- <file>`：只检查指定文件的未暂存补丁是否存在空白错误。
7. `git add -- <file>`：把指定路径加入暂存区；`--` 明确分隔选项与路径。
8. `git diff --cached --check`：检查暂存补丁中的空白错误或冲突标记。

- 在普通 `git merge <other-branch>` 中，`ours` 是开始合并时当前分支的版本，`theirs` 是 `<other-branch>` 的版本；要以当前分支为起点时，把示例中的 `--theirs` 改为 `--ours`。
- 在 `rebase` 或 `pull --rebase` 中不要沿用上述直觉：Git 将重放所基于的目标分支视为 `ours`，将正在重放的个人提交视为 `theirs`。先用 `git status` 确认当前操作和正在应用的 commit，再选择，不能只根据编辑器里的 “current/incoming” 按钮名判断。
- 这类命令会用一侧的完整文件覆盖工作区版本，但尚未 `git add` 时，索引仍保留未合并的 stage 2/3。风险是漏掉另一侧必要逻辑；必须比较共同祖先和两侧版本，并运行相关测试。若选错且尚未暂存，可用 `git restore --merge --worktree -- <file>` 重新生成冲突结果；若已经暂存且无法可靠还原，保存需要保留的手工片段后执行 `git merge --abort` 或 `git rebase --abort`，再重新开始，不能用 `reset --hard` 掩盖问题。

解决并验证后，先确认远端 PR 分支在处理期间没有被别人更新，再推送：

```bash
git -C <absolute-temporary-path> status --short --branch
git -C <absolute-temporary-path> diff --check upstream/main...HEAD
git ls-remote origin refs/heads/<pr-branch>
git -C <absolute-temporary-path> push origin HEAD:<pr-branch>
gh pr view <pr-number> --repo <upstream-owner>/<repo> \
  --json mergeable,mergeStateStatus,headRefOid,baseRefOid,url
```

逐行说明：

1. `git -C <absolute-temporary-path> status --short --branch`：让 Git 临时以 `<absolute-temporary-path>` 为工作目录；用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。
2. `git -C <absolute-temporary-path> diff --check upstream/main...HEAD`：让 Git 临时以 `<absolute-temporary-path>` 为工作目录；检查从共同祖先到右侧分支的补丁是否存在空白错误。
3. `git ls-remote origin refs/heads/<pr-branch>`：只读查询远端引用及 SHA，不更新本地工作区或跟踪分支。
4. `git -C <absolute-temporary-path> push origin HEAD:<pr-branch>`：让 Git 临时以 `<absolute-temporary-path>` 为工作目录；把指定本地分支或 refspec 推送到目标 remote；普通 push 不允许破坏性的非快进覆盖。
5. `gh pr view <pr-number> --repo <upstream-owner>/<repo> \`：读取 PR 远端信息；选项限定仓库、评论或 JSON 字段。
6. `  --json mergeable,mergeStateStatus,headRefOid,baseRefOid,url`：续接上一行，限定 PR 核验所需 JSON 字段。

- 推送前把 `git ls-remote` 返回值与开始处理时记录的远端 commit 比较；若已变化，停止推送并重新 fetch、审查新改动，避免覆盖协作者更新。
- GitHub 返回 `mergeable: MERGEABLE` 表示内容冲突已经消失；`mergeStateStatus: UNSTABLE` 还可能由检查失败或外部贡献者工作流等待维护者批准造成，应继续查看 Actions，而不是重复改冲突代码。
- 合并提交前可以用 `git merge --abort` 恢复临时 worktree；已经提交但尚未推送时，直接移除临时 worktree 和临时分支即可放弃结果，原工作区不会受影响。
- 推送并确认 PR 正常后，再运行 `git worktree remove <absolute-temporary-path>` 和 `git branch -d <temporary-branch>` 清理。清理前必须确认临时 worktree 干净、提交已推送且路径精确，避免删除唯一存在的改动。

如果创建 worktree 后移动或重命名了主仓库目录，关联 worktree 的 `.git` 文件可能仍指向旧的主仓库路径，导致 `git -C <worktree> status` 报“not a git repository”。不要手工拼改 `.git` 指针；从当前有效的主仓库执行 Git 自带修复：

```bash
git worktree list --porcelain
git worktree repair <absolute-worktree-path>
git -C <absolute-worktree-path> status --short --branch
```

逐行说明：

1. `git worktree list --porcelain`：以稳定格式列出主工作树和关联 worktree 元数据。
2. `git worktree repair <absolute-worktree-path>`：修复仓库或 worktree 移动后失效的管理路径。
3. `git -C <absolute-worktree-path> status --short --branch`：让 Git 临时以 `<absolute-worktree-path>` 为工作目录；用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。

- 用途与适用条件：`git worktree repair` 用于主仓库或关联 worktree 被文件管理器移动后修复双方管理路径；它修复 worktree 元数据，不重置工作区文件，也不改写 commit 历史。
- 操作前检查：先确认 `<absolute-worktree-path>` 确实是原关联目录，并读取其中 `.git` 文件核对它指向已经失效的旧路径；主仓库本身必须能够正常执行 `git status`。
- 风险与恢复：传错路径可能修复错误的 worktree 记录，因此必须使用经过 `Resolve-Path` 或资源管理器确认的绝对路径。修复后若分支、HEAD 或工作区状态与预期不符，应停止 merge/push，保留目录并用 `git worktree list --porcelain` 重新核对，不能用 `reset --hard` 掩盖元数据问题。

如果临时 worktree 的目录已经被手工删除或被系统临时目录清理掉，`git worktree list` 会在该条目后标注 `prunable`。这时它的路径已经不存在，靠路径去操作已经没有意义，改用 `prune` 清除管理记录：

```bash
git worktree list
git worktree prune -n -v
git worktree prune
git worktree list
```

逐行说明：

1. `git worktree list`：列出主工作树和关联 worktree；目录已消失的条目会带上 `prunable` 标记。
2. `git worktree prune -n -v`：预演并说明会删除哪些记录；`-n` 只报告不执行，`-v` 输出原因（例如 `gitdir file points to non-existent location`）。
3. `git worktree prune`：删除指向已不存在目录的 worktree 元数据。
4. `git worktree list`：确认陈旧条目已经消失。

- 用途与适用条件：只用于目录确实已经不存在的 worktree 记录。`prune` 清掉的是 `.git/worktrees/` 下的管理元数据，不删除任何工作区文件、分支或 commit；目录还在时不要用 `prune` 绕过 `git worktree remove` 对未提交改动和锁定状态的检查。
- 检查方法：先跑 `-n -v` 预演并核对将被删除的条目名与预期路径一致，再执行真正的 `prune`，最后用 `git worktree list` 验收。
- 易混淆风险：`-n -v` 的报告内容写在标准错误上，包装脚本不应把这段输出当成命令失败。另外 `git worktree remove` 没有 `-n`/`--dry-run`（Git 2.55 的用法只有 `[-f] <worktree>`），所以不要靠它去试探一个已消失的目录，预演一律用 `git worktree prune -n -v`。
- 风险与恢复：记录删除后，`git worktree remove` 和 `git worktree repair` 都不再能通过该路径定位这个 worktree；因此执行前先确认该路径下确实没有需要保留的内容。分支本身不受影响，仍可用 `git branch -vv` 查看。

### 8. 把混合 PR 拆成多个独立 PR

当一个 PR 同时包含性能优化、平台修复和业务稳定性修复时，优先按“可独立审查、测试和合并”拆分，而不是只按 commit 标题移动提交。建议顺序：

```bash
git fetch --prune origin
git fetch --prune upstream
git branch backup/<old-pr>-before-split origin/<old-pr-branch>
git worktree add -b <category-branch> <temporary-path> upstream/main
git -C <temporary-path> cherry-pick <category-commit>...
git -C <temporary-path> diff --check upstream/main...HEAD
git -C <temporary-path> push -u origin <category-branch>
```

逐行说明：

1. `git fetch --prune origin`：从指定 remote 下载对象并按 refspec 更新远端跟踪引用；`--prune` 还清理远端已删除分支的陈旧引用，不改当前工作区。
2. `git fetch --prune upstream`：从指定 remote 下载对象并按 refspec 更新远端跟踪引用；`--prune` 还清理远端已删除分支的陈旧引用，不改当前工作区。
3. `git branch backup/<old-pr>-before-split origin/<old-pr-branch>`：在当前或明确指定的 commit 创建备份分支引用，作为恢复点。
4. `git worktree add -b <category-branch> <temporary-path> upstream/main`：创建新分支及独立 worktree；它与主工作树共享对象库但隔离文件。
5. `git -C <temporary-path> cherry-pick <category-commit>...`：让 Git 临时以 `<temporary-path>` 为工作目录；把指定 commit 的补丁和信息复制到当前分支，生成新 hash。
6. `git -C <temporary-path> diff --check upstream/main...HEAD`：让 Git 临时以 `<temporary-path>` 为工作目录；检查从共同祖先到右侧分支的补丁是否存在空白错误。
7. `git -C <temporary-path> push -u origin <category-branch>`：让 Git 临时以 `<temporary-path>` 为工作目录；首次推送分支，并用 `-u` 建立后续 pull/push 使用的上游跟踪关系。

- 每个新 PR 应直接以目标基准分支（通常是 `upstream/main`）建立；除非有意制作 stacked PR，否则不要把另一个待合并 PR 当基准。
- Cherry-pick 成功只说明文本补丁能应用，不代表功能独立。还要搜索新 API、配置项和资源依赖，并在该分支单独运行测试。
- 多个分类修改同一文件时，可用 `git merge-tree --write-tree <branch-a> <branch-b>` 做只读合并模拟；仍应再建立临时集成分支，把所有分类合并后运行完整测试。
- 新分类分支全部推送成功后，再精简原 PR。重写原 PR 分支前先读取远端 SHA，并使用精确 lease：

```bash
git ls-remote origin refs/heads/<old-pr-branch>
git push --force-with-lease=refs/heads/<old-pr-branch>:<expected-old-sha> \
  origin <new-head>:<old-pr-branch>
```

逐行说明：

1. `git ls-remote origin refs/heads/<old-pr-branch>`：只读查询远端引用及 SHA，不更新本地工作区或跟踪分支。
2. `git push --force-with-lease=refs/heads/<old-pr-branch>:<expected-old-sha> \`：执行非快进更新，但仅当远端目标仍等于明确给出的旧 SHA；不匹配即拒绝。
3. `  origin <new-head>:<old-pr-branch>`：续接上一行，用新历史更新旧 PR 分支。

这会改写原 PR 的提交历史。风险是其他协作者基于旧分支的提交会失去直接祖先关系；本地 `backup/<old-pr>-before-split` 可用于核对或恢复。若远端 SHA 已变化，精确 lease 会拒绝覆盖，此时应停止并重新审查远端更新。

### 9. 快进同步 fork

GitHub 网页在 fork 首页显示“此分支已过时”时，不要只根据落后提交数直接覆盖个人分支。先获取双方最新引用，并确认个人分支没有独有提交、而且确实是上游分支的祖先：

```bash
git fetch --prune origin
git fetch --prune upstream
git rev-list --left-right --count origin/<branch>...upstream/<branch>
git merge-base --is-ancestor origin/<branch> upstream/<branch>
```

逐行说明：

1. `git fetch --prune origin`：从指定 remote 下载对象并按 refspec 更新远端跟踪引用；`--prune` 还清理远端已删除分支的陈旧引用，不改当前工作区。
2. `git fetch --prune upstream`：从指定 remote 下载对象并按 refspec 更新远端跟踪引用；`--prune` 还清理远端已删除分支的陈旧引用，不改当前工作区。
3. `git rev-list --left-right --count origin/<branch>...upstream/<branch>`：统计比较式左右两端各自独有的 commit 数。
4. `git merge-base --is-ancestor origin/<branch> upstream/<branch>`：判断左侧引用是否为右侧引用祖先；成功返回 0。

- `rev-list` 输出为 `0 <n>`，并且 `merge-base --is-ancestor` 返回成功，表示个人分支只落后、可以纯快进同步。
- 左侧不是 `0` 表示个人分支存在上游没有的提交。此时应先审查提交并决定 merge、rebase 或保留独立分支，不能把它当作普通“更新分支”。
- 同步前应记录并比较 GitHub 上个人分支的实际 SHA，防止检查后远端又被其他操作更新。

对于 GitHub fork，可以使用已认证的官方接口执行和网页“更新分支”相同的操作：

```bash
gh api --method POST repos/<fork-owner>/<repo>/merge-upstream -f branch=<branch>
```

逐行说明：

1. `gh api --method POST repos/<fork-owner>/<repo>/merge-upstream -f branch=<branch>`：向 fork 同步端点发送已认证 POST 请求，并用表单字段指定分支。

- 成功响应中的 `merge_type: fast-forward` 证明没有制造额外 merge commit，也没有改写历史。
- 该操作只更新指定的 fork 分支，不会切换本地当前分支，也不会修改其他优化分支、PR 或已有 Release；但执行后仍应读取这些关键引用验证。
- 如果个人分支已分叉、目标分支不存在或上游关系异常，接口可能失败。不要改用强推绕过；先重新 `fetch`，审查两边独有提交。

同步后刷新并核对本地远端引用：

```bash
git fetch --prune origin
git rev-parse origin/<branch>
git rev-parse upstream/<branch>
```

逐行说明：

1. `git fetch --prune origin`：从指定 remote 下载对象并按 refspec 更新远端跟踪引用；`--prune` 还清理远端已删除分支的陈旧引用，不改当前工作区。
2. `git rev-parse origin/<branch>`：把给定引用解析为确定的对象 ID，用于精确比较 commit。
3. `git rev-parse upstream/<branch>`：把给定引用解析为确定的对象 ID，用于精确比较 commit。

两个 SHA 应完全相同。若写操作返回超时，应先用 `gh api repos/<fork-owner>/<repo>/git/ref/heads/<branch>` 只读核对远端 SHA，再决定是否重试，避免重复操作。

### 10. 大型仓库的浅克隆、部分克隆与稀疏检出

只需分析大型仓库里的少量目录，且不需要完整历史时，可以组合浅克隆、部分克隆和稀疏检出：

```bash
git clone --depth 1 --filter=blob:none --sparse <URL> <local-directory>
git -C <local-directory> sparse-checkout set <path>
```

逐行说明：

1. `git clone --depth 1 --filter=blob:none --sparse <URL> <local-directory>`：浅克隆仓库：只取最近一层历史、延迟下载 Blob，并启用稀疏检出；最后一个参数是本地目录。
2. `git -C <local-directory> sparse-checkout set <path>`：让 Git 临时以 `<local-directory>` 为工作目录；把稀疏检出集合替换为指定路径，并调整工作区可见文件。

- `--depth 1` 只取得默认分支最近一层历史；`--filter=blob:none` 先不下载文件内容，检出实际需要的路径时再向远端按需取 Blob；`--sparse` 初始化 cone 模式的稀疏工作树。它们只改变本地下载量、可用历史和工作区范围，不会修改远端。
- 适用条件：服务器支持 partial clone，目标主要是读取或分析少量目录。若服务器不支持过滤，Git 可能警告后退化为下载更多对象；若之后要离线浏览其他目录或完整历史，这种副本不合适。
- 检查方法：

```bash
git -C <local-directory> rev-parse --is-shallow-repository
git -C <local-directory> config --bool remote.origin.promisor
git -C <local-directory> config --get remote.origin.partialclonefilter
git -C <local-directory> config --bool core.sparseCheckout
git -C <local-directory> sparse-checkout list
git -C <local-directory> status --short --branch
```

逐行说明：

1. `git -C <local-directory> rev-parse --is-shallow-repository`：让 Git 临时以 `<local-directory>` 为工作目录；判断仓库是否为浅克隆，输出 `true` 或 `false`。
2. `git -C <local-directory> config --bool remote.origin.promisor`：让 Git 临时以 `<local-directory>` 为工作目录；检查 `origin` 是否允许缺失对象按需获取。
3. `git -C <local-directory> config --get remote.origin.partialclonefilter`：让 Git 临时以 `<local-directory>` 为工作目录；读取 partial clone 过滤规则，示例预期为 `blob:none`。
4. `git -C <local-directory> config --bool core.sparseCheckout`：让 Git 临时以 `<local-directory>` 为工作目录；检查是否启用了 sparse checkout。
5. `git -C <local-directory> sparse-checkout list`：让 Git 临时以 `<local-directory>` 为工作目录；列出当前稀疏检出包含的路径。
6. `git -C <local-directory> status --short --branch`：让 Git 临时以 `<local-directory>` 为工作目录；用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。

预期分别看到 shallow 为 `true`、promisor 为 `true`、过滤器为 `blob:none`、sparse checkout 为 `true`，并且 `list` 仅列出目标路径、工作区没有意外改动。

- `sparse-checkout set <path>` 会用新集合替换当前稀疏路径；保留现有路径并追加时使用 `sparse-checkout add <path>`。两者会改变本地工作区中可见的受跟踪文件，执行前先用 `status --short` 确认没有未提交改动，避免路径收缩时误判文件“消失”。
- 恢复完整工作树可执行 `git -C <local-directory> sparse-checkout disable`；恢复完整历史可执行 `git -C <local-directory> fetch --unshallow`。partial clone 的缺失 Blob 仍会在访问时按需下载；若需要真正自包含的离线副本，应在联网时显式访问或重新获取所需对象。恢复操作只增加本地文件或对象，若结果不符合预期，可重新运行 `sparse-checkout set <path>` 收窄工作区；不需要保留该分析副本时，先核对绝对路径和未提交改动，再删除整个明确的克隆目录。

#### 浅克隆遇到远端强制更新或 `unrelated histories`

浅克隆的历史边界可能制造“假分叉”。如果远端分支被强制更新，或者用 `--depth=1` 重新获取了新尖端，本地旧 commit 可能仍是新 commit 的真实祖先，却因为共同祖先在浅边界之外而暂时不可见。此时 `git status` 可能显示两边各有一个 commit，`git merge --ff-only origin/<branch>` 还可能报 `refusing to merge unrelated histories`；这不能直接证明两个项目真的没有共同历史。

先确认工作区、两端 SHA 和浅克隆状态，再逐步加深历史：

```bash
git -C <local-directory> status --short --branch
git -C <local-directory> rev-parse HEAD
git -C <local-directory> rev-parse origin/<branch>
git -C <local-directory> rev-parse --is-shallow-repository
git -C <local-directory> fetch --deepen=<n> origin <branch>
git -C <local-directory> merge-base --is-ancestor HEAD origin/<branch>
git -C <local-directory> merge --ff-only origin/<branch>
```

逐行说明：

1. 前四条命令分别记录工作区、当前 commit、远端跟踪引用和是否为浅克隆；它们只读，不改变工作区或历史。
2. `git -C <local-directory> fetch --deepen=<n> origin <branch>`：从 `origin` 下载更多历史并把浅边界向前推进 `<n>` 层，同时更新 `origin/<branch>`；不会自动切换分支、合并提交或修改远端。`<n>` 应按仓库历史规模选择，先小后大。
3. `git -C <local-directory> merge-base --is-ancestor HEAD origin/<branch>`：检查当前 commit 是否已成为远端尖端的祖先；退出码为 0 才表示快进条件成立，仍只读。
4. `git -C <local-directory> merge --ff-only origin/<branch>`：在确认祖先关系且工作区干净后只做快进；若仍无法快进会安全失败，不会创建合并提交。

如果加深后仍找不到共同祖先，先用 `git log --graph --oneline HEAD origin/<branch>` 审查两边历史，确认是否真的是换仓库、换分支或远端重写成了独立历史；不要直接使用 `--allow-unrelated-histories`，也不要用 `reset --hard` 掩盖问题。需要完整历史时，可在确认磁盘和网络条件后执行 `git -C <local-directory> fetch --unshallow origin <branch>`；若本地尖端含有必须保留的独立 commit，先创建备份分支并改用显式的 merge、rebase 或重新克隆方案。

本条已用本机 Git 2.55.0.windows.3 验证：浅副本在远端强制更新后先出现 `refusing to merge unrelated histories`，执行 `fetch --deepen=100` 补齐祖先后，`merge --ff-only` 成功快进。`fetch --deepen` 只增加本地对象和历史可见范围；真正改变当前分支指针和工作树的是后续的快进合并。

### 11. 本地非裸仓库作为 remote 时拒绝更新已检出分支

如果 `git remote -v` 显示 remote 是另一个本地工作目录，而不是 GitHub URL，向它当前检出的分支执行 `git push` 会被 Git 拒绝：

```text
refusing to update checked out branch
```

这是保护目标仓库索引和工作树一致性的正常行为。不要为了绕过它而把目标仓库的 `receive.denyCurrentBranch` 改成 `ignore` 或 `warn`；那可能让目标仓库的 `HEAD` 已经变化，但磁盘文件仍保持旧内容。

若真正目标是 GitHub，直接从已测试的源仓库推到明确的 GitHub URL，然后在本地目标副本中快进同步：

```bash
git push https://github.com/<owner>/<repo>.git HEAD:refs/heads/<branch>
git -C <local-copy> pull --ff-only origin <branch>
```

逐行说明：

1. `git push https://github.com/<owner>/<repo>.git HEAD:refs/heads/<branch>`：把当前 `HEAD` 直接推到给定 GitHub URL 的明确目标分支。
2. `git -C <local-copy> pull --ff-only origin <branch>`：让 Git 临时以 `<local-copy>` 为工作目录；获取指定远端分支后只允许快进整合；分叉时拒绝。

- 第一条命令只更新明确的 GitHub 分支，不会修改另一个本地工作目录；执行前应核对 `<owner>/<repo>` 和分支名，避免推到官方仓库或错误仓库。
- 第二条命令在目标副本工作区干净且没有分叉时，以 fast-forward 同步提交和磁盘文件；若无法快进会安全失败，不应改用强推或 `reset --hard` 绕过。
- 如果目标只是两个本地仓库之间传递提交，也可先把源提交推到一个未检出的临时分支，再在目标仓库内审查后 merge；不要直接覆盖已检出分支。

### 12. 用公开 GitHub Release 做免配置更新

如果 Windows 更新器需要在另一台电脑上做到“不安装 Git/Python、不配置 Token，双击即可更新”，最简单的分发面是公开仓库的 latest Release。私有仓库无法同时满足完全免配置和不内置凭据；不要把 PAT 打进 EXE。

公开仓库也不应只依赖未认证 GitHub REST API：未认证请求的 primary rate limit 是每个来源 IP 每小时 60 次，同一出口网络中的多台电脑可能共享这 60 次。收到 `HTTP 403: rate limit exceeded` 说明 API 配额已用完，不代表 Release 或资产不存在。可把公开资产直链作为只在网络/限流错误时启用的回退：

```text
https://github.com/<owner>/<repo>/releases/latest/download/<manifest-asset>
https://github.com/<owner>/<repo>/releases/download/<version>/<package-asset>
```

- 第一条先取得 latest Release 的公开清单，不消耗 REST API 配额；再用清单中的版本和资产名构造第二条固定版本下载地址。
- 回退不能降低完整性检查：版本号与资产名必须限制为安全的单段值，下载后仍须核对清单声明的大小和 SHA-256。
- 只应捕获 API 请求的 403、429、超时或连接错误；API 响应结构损坏、清单格式错误和摘要不合法应直接停止，不能用回退掩盖。
- 不要用“把 PAT 内置进公开更新器”解决限流。PAT 会被提取并扩大账号或仓库风险，公开 Release 的免配置客户端不需要这种凭据。

`git push` 只更新分支和 commit，不会自动创建 GitHub Release，也不会替换 Release 资产。若更新器读取的是 `releases/latest`，仅推送源码后客户端仍会下载上一个 Release；必须另外从目标 commit 构建资产、创建或更新 Release，并核对 `targetCommitish` 和资产摘要。反过来，使用源码目录测试时才通过 `git pull`/`fetch` 获取分支提交，不要把“分支已推送”和“二进制更新已发布”混为一谈。

GitHub 还会为每个 Release 自动生成 `Source code (zip/tar.gz)` 标签源码快照，它不等于项目上传的二进制/升级资产，不能当作发布产物；核对真实资产需结合远端标签和 `gh release view --json assets`（必要时再加 `--jq '.[].name'` 或按资产名筛选），并把标签与资产一一对应。

稳定发布可包含三个资产：完整 ZIP、独立更新器、带版本、文件名、大小和 SHA-256 的 JSON 清单。更新器先读取 `releases/latest`，下载到缓存并校验清单，再解压到 staging；保护用户配置、日志、录像和本地 ZIP 后，创建完整备份，在原目录内逐文件写入临时文件并用 `os.replace` 原子替换，根目录本身不改名、不删除。Windows 短暂占用时对文件操作退避重试；失败时从完整备份执行文件级回滚，成功后保留旧版备份。若用户手动下载 ZIP，优先直接读取目标目录中的包，避免再次复制大文件到系统临时目录；即使更新器会先把自身复制为临时 worker，也只应把原 ZIP 的绝对路径传给 worker，不能把数百 MB 的 ZIP 一起复制。

发布二进制必须与 Release 标签指向的源码对应。若本地工作区在标签之后还有未提交修复，不应直接用这个工作区生成对外资产；可从标签提交创建 detached worktree，并在那里构建：

```bash
git worktree add --detach <temp-dir> <tag-or-commit>
git -C <temp-dir> status --short --branch
# 在 <temp-dir> 构建
git worktree remove <temp-dir>
```

逐行说明：

1. `git worktree add --detach <temp-dir> <tag-or-commit>`：从指定 tag/commit 创建 detached HEAD 临时工作树，隔离正式构建。
2. `git -C <temp-dir> status --short --branch`：让 Git 临时以 `<temp-dir>` 为工作目录；用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。
3. `# 在 <temp-dir> 构建`：注释行，不执行；提醒执行者在 <temp-dir> 构建。
4. `git worktree remove <temp-dir>`：移除已核验干净的 worktree；默认拒绝删除有未提交改动的工作树。

普通 `git worktree remove` 会在工作树包含未提交改动时拒绝删除，这是应保留的安全检查；只有确认临时目录内没有唯一改动时才考虑 `--force`。

在 Conda 环境中用 PyInstaller 构建 Release 时，优先通过 `conda run` 启动完整环境，不要只直接调用 `envs/<env>/python.exe`。后者可能没有把 Conda 的 `Library/bin` 加入 DLL 搜索路径：构建即使返回退出码 0，也可能漏掉 `liblzma.dll`、`LIBBZ2.dll`、`libcrypto-3-x64.dll` 等运行库。已经验证的构建形式是：

```powershell
conda run -n <env> --no-capture-output python scripts/build.py --version <tag>
```

逐行说明：

1. `conda run -n <env> --no-capture-output python scripts/build.py --version <tag>`：在指定 Conda 环境运行构建脚本，并原样输出日志。

- 用途与适用条件：用于 Conda 环境中的 PyInstaller 正式构建；`--no-capture-output` 让 PyInstaller 日志原样显示，便于发现缺失 DLL，而不是只看到最终退出码。
- 发布前检查：读取 `build/<spec>/warn-<spec>.txt`，搜索关键 DLL 名称；再递归统计 `dist/<app>/_internal` 中预期 DLL 的实际数量。两项都正常后，仍须校验压缩包完整性、清单版本、资产大小和 SHA-256。
- 风险与恢复：缺失运行库的包可能只在另一台电脑启动时才报错。发现警告或 DLL 缺失时不要上传资产；切回 `conda run` 重新构建并复验。若错误包已经发布，应创建与修复提交对应的新 Release，避免用新二进制静默覆盖旧标签所指向的源码。

创建源码与二进制严格对应的 Release 时，`gh release create --target` 优先传入已经推送到目标仓库的完整 commit hash。只在本地可解析的短 hash 可能被 GitHub API 拒绝为 `HTTP 422: Release.target_commitish is invalid`：

```powershell
$targetCommit = git rev-parse HEAD
gh release create <tag> <assets...> --repo <owner>/<repo> --target $targetCommit
```

逐行说明：

1. `$targetCommit = git rev-parse HEAD`：把当前完整 commit SHA 保存到 `$targetCommit`。
2. `gh release create <tag> <assets...> --repo <owner>/<repo> --target $targetCommit`：创建 Release、上传资产，并用完整 commit SHA 指定标签目标。

- 用途与适用条件：适合要求 Release 标签明确指向当前构建提交的场景；`git rev-parse HEAD` 只读取本地完整 hash，`gh release create` 会在 GitHub 创建标签、Release 并上传资产。
- 发布前检查：比较 `git ls-remote origin refs/heads/<branch>` 返回的远端分支 hash 与 `$targetCommit`，确认该提交已经推送；否则即使使用完整 hash，GitHub 仍可能无法解析目标。
- 风险与恢复：收到 422 后不要盲目重复上传。先用 `gh release view <tag> --repo <owner>/<repo>` 检查 Release 是否存在；不存在时改用完整且已推送的 hash 重试，存在时则先核对其目标提交和资产，避免制造重复发布。

上传后用服务器端元数据核对目标分支、资产大小与 GitHub 计算的摘要：

```bash
gh release view <tag> --repo <owner>/<repo> \
  --json url,tagName,targetCommitish,assets,isDraft,isPrerelease
```

逐行说明：

1. `gh release view <tag> --repo <owner>/<repo> \`：读取 Release 服务器端元数据，只返回 `--json` 指定字段。
2. `  --json url,tagName,targetCommitish,assets,isDraft,isPrerelease`：续接上一行，限定 Release 核验字段。

`assets[].state` 应为 `uploaded`，`digest` 应与本地 `Get-FileHash -Algorithm SHA256` 一致。仅核对上传成功还不够，最好再从公开 Release 实际下载一次，用编译后的更新器在临时旧安装目录中验证：入口文件已替换、个人配置和日志未变、版本标记正确、旧版本备份可恢复。

### 13. 发布二进制 Release 后核验资产

发布 EXE、压缩包等二进制文件后，不应只以 `gh release create` 返回成功作为完成依据。读取线上资产信息并重新下载，可以确认名称、大小、目标 commit 和文件摘要都正确：

```bash
gh release view <tag> --repo <owner>/<repo> --json assets,targetCommitish,url
gh release download <tag> --repo <owner>/<repo> --pattern <asset-name> --dir <temporary-directory>
```

逐行说明：

1. `gh release view <tag> --repo <owner>/<repo> --json assets,targetCommitish,url`：读取 Release 服务器端元数据，只返回 `--json` 指定字段。
2. `gh release download <tag> --repo <owner>/<repo> --pattern <asset-name> --dir <temporary-directory>`：把名称匹配的 Release 资产下载到明确临时目录。

下载后使用操作系统的哈希工具计算 SHA-256，并与发布前的本地文件比较；Windows PowerShell 可使用：

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath <downloaded-file>
```

逐行说明：

1. `Get-FileHash -Algorithm SHA256 -LiteralPath <downloaded-file>`：计算下载文件 SHA-256，用于和发布前文件或清单比较。

- `gh release view` 和 `gh release download` 是只读核验，不会修改 Git 历史或 Release。
- `gh release view --json` 当前不提供 `isLatest` 字段；要验证某个标签是否真是 latest，应分别读取 `repos/<owner>/<repo>/releases/tags/<tag>` 与 `repos/<owner>/<repo>/releases/latest`，比较两者的 `tag_name`。不要把“普通非预发布 Release”直接等同于 latest。
- GitHub 可能规范化包含非 ASCII 字符的资产名；面向下载者发布 Windows 程序时，优先使用清晰的 ASCII 资产名，避免它被改成与主程序相同或容易混淆的名称。
- 哈希不一致时不要发布或分发该文件；先删除错误资产、重新上传，再从线上重新下载复验。Release 资产删除不会改写分支提交历史，但旧下载链接会失效。

### 14. 一条可复核的历史整理顺序

整理 PR 历史前，按这个顺序来：

```bash
git status --short --branch
git log --oneline upstream/<base-branch>..<branch>
git diff --stat upstream/<base-branch>...<branch>
git branch backup/before-rewrite
```

逐行说明：

1. `git status --short --branch`：用紧凑格式显示当前分支、跟踪关系以及工作区/暂存区状态。
2. `git log --oneline upstream/<base-branch>..<branch>`：列出右侧可达而左侧不可达的 commit，用于查看分支新增历史。
3. `git diff --stat upstream/<base-branch>...<branch>`：从共同祖先到右侧分支统计文件和行数变化。
4. `git branch backup/before-rewrite`：在当前或明确指定的 commit 创建备份分支引用，作为恢复点。

开始 rebase：

```bash
git rebase --onto <commit-to-drop>^ <commit-to-drop> <branch>
```

逐行说明：

1. `git rebase --onto <commit-to-drop>^ <commit-to-drop> <branch>`：把选定提交序列重放到新基准上；被重放的 commit hash 会变化。

解决冲突后：

```bash
git add <file>
git rebase --continue
```

逐行说明：

1. `git add <file>`：把已经解决冲突的文件加入暂存区，供 `rebase --continue` 使用。
2. `git rebase --continue`：当前冲突解决并暂存后，继续重放下一个 commit。

完成后检查：

```bash
git log --oneline upstream/<base-branch>..<branch>
git diff --stat upstream/<base-branch>...<branch>
```

逐行说明：

1. `git log --oneline upstream/<base-branch>..<branch>`：列出右侧可达而左侧不可达的 commit，用于查看分支新增历史。
2. `git diff --stat upstream/<base-branch>...<branch>`：从共同祖先到右侧分支统计文件和行数变化。

最后推送：

```bash
git push --force-with-lease origin <branch>
```

逐行说明：

1. `git push --force-with-lease origin <branch>`：允许非快进更新，但要求 lease 仍有效；精确 SHA 形式比隐式 lease 更可靠。

### 15. 把一个提交摘到当前分支（cherry-pick）

口语里说的“pick 一下某个 commit”，指的就是 `git cherry-pick`：把**指定 commit 的补丁和提交信息**复制到**当前分支**，生成一个**新 commit（新 hash）**。它与 merge、rebase 的分工不同：

- `merge`：把一条分支的历史整体并入，保留原有 commit，并产生合并点；
- `rebase`：把**自己**的一串 commit 搬到新基底上，重写这些 commit 的 hash；
- `cherry-pick`：只挑出**指定的几个 commit** 复制过来，原分支和原 commit 都不动，因此**别人 fork 里的提交也能摘**。

操作前先确认这三件事，否则容易摘到重复、已废弃或根本没下载下来的改动：

```bash
git remote -v
git cat-file -t <commit>
git branch -a --contains <commit>
```

逐行说明：

1. `git remote -v`：列出所有 remote 的 fetch/push URL，确认改动来源仓库是否已经添加。
2. `git cat-file -t <commit>`：只读查询对象类型（commit/tree/blob）；报 `could not get object info` 说明该对象还没进入本地对象库，需要先 fetch。
3. `git branch -a --contains <commit>`：列出包含该 commit 的本地与远端分支，用来判断改动是否已经在目标分支（例如 `upstream/main`）里。

从第三方 fork 摘一个提交的完整流程：

```bash
git remote add <contributor> https://github.com/<owner>/<repo>.git
git fetch <contributor>
git switch -c <new-branch> upstream/main
git cherry-pick -x <commit>
git show --stat --oneline HEAD
```

逐行说明：

1. `git remote add <contributor> https://github.com/<owner>/<repo>.git`：为第三方 fork 新增 remote；命名用 fork 所有者，避免和 `origin`（自己的 fork）、`upstream`（上游）混淆。
2. `git fetch <contributor>`：下载该 fork 的对象和远端跟踪引用，不改当前工作区。
3. `git switch -c <new-branch> upstream/main`：以目标基准分支（通常是上游 main）新建工作分支；不要直接在正在提 PR 的分支上摘，否则会把无关改动混进那个 PR。
4. `git cherry-pick -x <commit>`：把该 commit 的补丁应用到当前分支并生成新 commit；`-x` 在提交信息里追加 `(cherry picked from commit <sha>)`，保留来源追溯，跨仓库摘提交时建议始终加上。
5. `git show --stat --oneline HEAD`：核对新提交实际改了哪些文件。

补充判断与风险：

- **hash 一定变了**：pick 之后 commit id 不同，不能再用 hash 判断“是否已经摘过”。判断补丁等价性用 patch-id 系列命令：`git cherry -v <upstream> <head>` 中前缀 `-` 表示上游已有等价补丁、`+` 表示还没有；`git log --cherry-mark --left-right <a>...<b>` 可批量标注等价提交。
- **补丁已存在**：若改动已在上游，cherry-pick 会遇到“变成空提交”而停下（`--empty` 取 `stop|drop|keep`，默认为停止）。确认确实重复后用 `git cherry-pick --skip` 跳过，不要用 `--allow-empty` 硬造空提交。
- **冲突**：解决冲突后 `git add <file>`，再 `git cherry-pick --continue`；要完全放弃、回到 pick 之前用 `git cherry-pick --abort`；只跳过当前这个 commit 用 `--skip`。处于冲突状态时 `git status` 会提示当前在 cherry-pick 序列中，不要中途遗忘收尾。
- **二进制文件（图片、PDF、固件等）**：Git 无法对二进制做三方合并，冲突时只能整份二选一（`git checkout --theirs -- <file>` 取被摘的那一侧，`--ours` 取当前分支那一侧），没有“两边自动融合”。这类资源通常不 cherry-pick，而是直接在目标分支重做，避免把不想要的整份文件覆盖进来。
- **作者归属**：cherry-pick 保留原作者（author），只把 committer 换成本次执行的人，这是正确行为，不要手工改成自己。
- **恢复路径**：`git cherry-pick --abort` 可退回序列开始前的状态；若已产生提交才发现摘错，用 `git reflog` 找到 pick 之前的 HEAD，再 `git reset --hard <sha>`（执行前确认工作区没有需要保留的改动）。

### 16. 把已推送分支的多个 commit 压成一个（squash）

评审要求「一个提交说清一件事」时，常要把自己 PR 分支上的多个提交压成一个。当分支就是「基线 + N 个提交」这种简单形态、且不需要顺带变基时，不必开交互式 rebase，用软重置重建一次提交更可控：

```bash
git show -s --format=%T HEAD                        # 压缩前记录树哈希
git branch backup/<name>-before-squash HEAD         # 留恢复路径
git reset --soft <true-base>                        # 只移动 HEAD，暂存区仍是分支最终内容
git commit -m "<PR 标题>"
git show -s --format=%T HEAD                        # 与压缩前逐字符相同才算内容零变化
git push --force-with-lease=refs/heads/<branch>:<expected-old-sha> origin <branch>
```

逐行说明：

1. `git show -s --format=%T HEAD`：只输出该提交的树哈希。压缩只应改变提交粒度、不应改变内容，所以前后两次 `%T` 必须完全一致；这比「diff 看起来一样」更硬。
2. `git branch backup/<name>-before-squash HEAD`：强推前用本地备份引用指向旧历史。恢复时 `git reset --soft backup/<name>-before-squash` 再强推即可，工作区不受影响。
3. `git reset --soft <true-base>`：把 HEAD 移回分支真正的基线，暂存区仍保持分支最终内容，所以下一条 `git commit` 正好重建出「基线 + 一个提交」。`<true-base>` 用 `git merge-base <branch> upstream/<base-branch>` 取，不要图省事写成已经前进的上游分支名，否则新提交会把上游期间别人的改动一并「回退」进去。
4. `git commit -m "<PR 标题>"`：压缩后的提交信息直接用 PR 标题，符合多数仓库以 PR 标题作为最终提交信息的约定。
5. `git show -s --format=%T HEAD`：与第 1 步输出比较。
6. `git push --force-with-lease=refs/heads/<branch>:<expected-old-sha> origin <branch>`：改写已推送历史只能强推；把预期旧 SHA 写全，远端在期间被他人更新时会安全拒绝而不是覆盖。

- 用途与适用条件：适用于自己 fork 上的 PR 分支。基线已前进（`behind_by > 0`）时本流程不改变基线，只压缩提交粒度；顺手变基属于另一个决定，不要混在同一次操作里。
- 检查方法：压缩后除树哈希外，再用 `git log --oneline <base>..HEAD` 确认只剩一个提交、用 `git show --name-only --format= HEAD` 核对文件数不变；强推后以 `git ls-remote origin refs/heads/<branch>` 比对本地 `HEAD`，并 `git fetch origin <branch>` 后比较 `git show -s --format=%T origin/<branch>` 与本地一致，最后确认 PR 页面的提交数已变为 1。
- 风险与恢复：强推会丢弃远端旧历史，协作分支必须先协商。若强推后发现问题，`git reset --soft backup/<name>-before-squash` 恢复旧提交（工作区不动），再用带预期 SHA 的 `--force-with-lease` 推回；确认新历史无误后再删备份分支。
- PowerShell 提示：树哈希用 `--format=%T` 读取。`HEAD^{tree}` 这类带花括号的写法在某些 shell/工具封装下会被外层解释器改写，报 `fatal: ambiguous argument '<乱码>'`，`%T` 没有这个风险。

## 附录 A：GitHub 专题与故障排查

### A.1 GitHub Pages 自定义域名一直显示 DNS 检查中

GitHub Pages 的 `DNS check in progress` 是异步状态，不能仅凭页面长时间转圈就判断 DNS 填错。先区分三层状态：仓库 Pages 是否部署成功、公共 DNS 是否已传播、GitHub 是否已完成域名和 HTTPS 检查。根域名通常按 GitHub 当前官方文档配置 `A`/`ALIAS`/`ANAME`，`www` 子域名用 `CNAME` 直接指向 `<username>.github.io`；使用具体 IP 前应再次核对 [GitHub 官方自定义域名文档](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)，不要照抄过期地址。

Windows PowerShell 可分别询问本机、Cloudflare 和 Google 公共解析器：

```powershell
Resolve-DnsName -Name <domain> -Type A
Resolve-DnsName -Name <domain> -Type A -Server 1.1.1.1 -DnsOnly
Resolve-DnsName -Name <domain> -Type A -Server 8.8.8.8 -DnsOnly
Resolve-DnsName -Name www.<domain> -Type CNAME -Server 1.1.1.1 -DnsOnly
Resolve-DnsName -Name <domain> -Type AAAA -Server 1.1.1.1 -DnsOnly
```

逐行说明：

1. `Resolve-DnsName -Name <domain> -Type A`：用系统默认解析器查询根域名 IPv4 A 记录。
2. `Resolve-DnsName -Name <domain> -Type A -Server 1.1.1.1 -DnsOnly`：向 Cloudflare DNS 查询根域名 IPv4 A 记录。
3. `Resolve-DnsName -Name <domain> -Type A -Server 8.8.8.8 -DnsOnly`：向 Google DNS 查询根域名 IPv4 A 记录。
4. `Resolve-DnsName -Name www.<domain> -Type CNAME -Server 1.1.1.1 -DnsOnly`：向公共 DNS 查询 `www` 子域名的 CNAME。
5. `Resolve-DnsName -Name <domain> -Type AAAA -Server 1.1.1.1 -DnsOnly`：向公共 DNS 查询根域名的 IPv6 AAAA 记录。

- 用途与适用条件：确认根域名的 A 记录、`www` 的 CNAME，以及是否残留错误的 AAAA 记录。还可把 `-Server` 换成域名的权威 DNS 服务器，对比“权威记录已正确”和“公共缓存已更新”是不是同时成立。这些命令只查询 DNS，不改仓库、域名记录或 Git 历史。
- 判定规则：多个公共解析器都返回 GitHub 文档规定的目标时，通常不应继续反复修改 DNS；GitHub 页面仍显示检查中多半是其后台尚未完成轮询。DNS 传播可能需要最长约 24 小时，HTTPS 证书也可能稍后才可启用。等待期间刷新 Pages 设置页即可。
- 继续排障：超过传播窗口仍未通过时，检查仓库 `Settings -> Pages` 的发布分支和目录、发布目录内是否存在入口 `index.html`、Custom domain 是否只填域名而没有 `https://`，并删除冲突的同名 A/AAAA/CNAME 或危险的通配符记录。域名解析正确但页面 404 属于部署或入口文件问题，不是 DNS 问题。
- 重启证书签发：如果权威 DNS 与多个公共解析器都已返回正确记录、HTTP 已能命中目标 Pages 站点、仓库根部的 `CNAME` 也正确，但 HTTPS 仍返回仅覆盖 `*.github.io` 的证书且 Pages 长时间显示检查中，可以按 GitHub 官方 HTTPS 排障流程，在 `Settings -> Pages` 点击 Custom domain 旁的 `Remove`，随即重新输入同一域名并保存。该操作会取消并重新启动域名验证及证书签发，不需要删除正确的 DNS 记录或改动网站内容。
- 操作风险与验收：移除到重新保存之间，自定义域会短暂解除绑定；应事先核对仓库和域名，缩短这段间隔，不要同时修改 DNS。重新保存后，等页面显示 `DNS check successful`，确认 `Enforce HTTPS` 已可用再勾选；最后分别验证根域名 HTTPS 返回页面、`www` 的 HTTPS 安全跳转，以及证书的 Subject Alternative Name 同时覆盖实际要使用的域名。只看到 HTTP 200 或浏览器缓存中的旧页面，不足以证明证书已经修复。
- 风险与恢复：DNS 查询无须恢复。修改解析前先导出或截图现有记录；误改后应恢复已核对的原记录并等待 TTL，而不是不断删除、重建正确记录。GitHub 建议先在 Pages 中添加或验证自定义域名，再去 DNS 服务商配置，以减少域名被他人错误绑定的风险。

### A.2 GitHub 仓库链接返回 404 时的判别与核验

访问 GitHub 仓库页面、REST API 或执行 `git clone`/`git fetch` 时看到 `404 Not Found`，不能单凭状态码断言仓库已被删除。私有仓库在未认证或当前账号无权访问时也可能返回 404；公开仓库还可能是 owner/repository 拼写或大小写错误、ref/path 错误、仓库转移、账号或组织改名，或者确实被删除。先区分地址、权限和仓库状态，再决定是否替换链接。

GitHub 官方说明：仓库改名后，旧地址的网页访问以及针对旧地址的 `git clone`、`git fetch`、`git push` 通常会自动重定向到新地址。因此“旧地址没有重定向”可以作为“不是简单改名”的线索，但不是删除或私有化的证明；旧名称日后被重新使用时，原重定向也可能失效。

可按以下顺序做只读核验：

```bash
git ls-remote <repository-url>
gh repo view <owner>/<repo> --json nameWithOwner,isPrivate,url
git remote -v
```

逐行说明：

1. `git ls-remote <repository-url>`：只读查询远端引用及 SHA，不更新本地工作区或跟踪分支。
2. `gh repo view <owner>/<repo> --json nameWithOwner,isPrivate,url`：用当前登录会话读取仓库名称、可见性和 URL，以核验地址与权限。
3. `git remote -v`：列出所有 remote 的 fetch/push URL，核对实际连接的仓库。

- `git ls-remote` 检查地址当前能否读取远端引用，不会修改本地仓库、工作区或远端；认证失败、地址错误和仓库不存在都可能表现为失败，不能单独据此判断原因。
- 已登录且应有权限时，用 `gh repo view` 查看规范仓库名、是否私有和当前 URL；若仍返回 404，继续核对登录账号、组织授权、仓库名大小写以及分支/路径，而不是反复请求旧地址。
- 如果在官方文档中找到新的仓库地址，应先确认它确实由原项目维护者或官方组织发布，并核对 README、分支和构建流程是否与原教程匹配；不要因为名称相似就把个人镜像或非官方 fork 当作官方替代品。

确认新地址后，已有本地克隆才修改 remote：

```bash
git remote set-url origin <verified-url>
git remote -v
git ls-remote origin
```

逐行说明：

1. `git remote set-url origin <verified-url>`：把本地 `origin` 的 URL 改成已核验的新地址，不修改远端历史。
2. `git remote -v`：列出所有 remote 的 fetch/push URL，核对实际连接的仓库。
3. `git ls-remote origin`：只读查询远端引用及 SHA，不更新本地工作区或跟踪分支。

`git remote set-url` 只修改本地 `.git/config`，不改提交历史或远端；执行前记录旧 URL，若发现判断错误，可用同一命令换回旧地址。若只是要查证链接状态，不必执行 `set-url`。

### A.3 私有仓库 raw 链接 404：按 Blob SHA 下载并校验

`raw.githubusercontent.com` 返回 `404` 不足以证明文件不存在：私有仓库、未携带有效认证、路径或 ref 错误都可能表现为 404。已经通过 `gh auth status` 确认登录且账号应有读取权限时，先用已认证的 GitHub API 读取文件元数据；API 也返回 404 时，再检查仓库、ref、大小写路径和权限，不要反复请求 raw 链接。

需要取得与 Git 对象完全相同的字节（尤其是 ZIP、EXE 等二进制文件）时，可以先记录 Contents API 返回的 Blob SHA，再按这个不可变 SHA 下载和校验。PowerShell 示例：

```powershell
$meta = gh api "repos/<owner>/<repo>/contents/<path>?ref=<ref>" | ConvertFrom-Json
$expectedBlob = $meta.sha
$blob = gh api "repos/<owner>/<repo>/git/blobs/$expectedBlob" | ConvertFrom-Json
[IO.File]::WriteAllBytes(
    "<new-temporary-file>",
    [Convert]::FromBase64String(($blob.content -replace '\s', ''))
)
$actualBlob = git hash-object --no-filters -- "<new-temporary-file>"
$expectedBlob
$actualBlob
```

逐行说明：

1. `$meta = gh api "repos/<owner>/<repo>/contents/<path>?ref=<ref>" | ConvertFrom-Json`：读取指定 ref/path 的文件元数据并解析 JSON。
2. `$expectedBlob = $meta.sha`：保存元数据中的 Blob SHA 作为期望值。
3. `$blob = gh api "repos/<owner>/<repo>/git/blobs/$expectedBlob" | ConvertFrom-Json`：按不可变 Blob SHA 读取对象内容。
4. `[IO.File]::WriteAllBytes(`：开始调用二进制写入方法。
5. `    "<new-temporary-file>",`：第一个参数：新的临时文件路径，避免覆盖现有文件。
6. `    [Convert]::FromBase64String(($blob.content -replace '\s', ''))`：第二个参数：移除空白并 Base64 解码为原始字节。
7. `)`：结束前面开始的 .NET 方法调用。
8. `$actualBlob = git hash-object --no-filters -- "<new-temporary-file>"`：计算下载文件的实际 Git Blob ID。
9. `$expectedBlob`：输出期望 Blob SHA。
10. `$actualBlob`：输出实际 Blob SHA，必须与上一行一致。

- 用途与适用条件：适合已获授权读取的仓库，或 raw 下载无法认证但 `gh api` 可以使用当前登录会话的情况。按 Blob SHA 读取还能避免分支在“查元数据”和“下载文件”之间移动而取到另一版本。
- 检查方法：`$expectedBlob` 与 `$actualBlob` 必须完全相同。这里比较的是 Git Blob 对象 ID，它包含对象头和文件字节，不是 `Get-FileHash -Algorithm SHA256` 计算的普通文件 SHA-256；不要把两类摘要直接比较。`--no-filters` 表示按下载到的原始字节计算，且没有 `-w` 时不会把对象写入本地仓库。
- 风险：认证成功和 Blob 校验只证明“读取到了该 Git 对象”，不证明文件安全；不要执行未知二进制。命令会写入指定的本地文件，优先使用全新的临时路径，避免覆盖现有文件；不要把 Token、API 响应头或私有文件内容写进日志和提交。
- 恢复：两值不一致时停止使用该文件，删除或隔离临时副本并按记录的 Blob SHA 重新下载；若重新查询 Contents API 得到不同 SHA，先判断是不是目标分支已更新。上述 `gh api` 和 `git hash-object` 都不会修改远端、分支或提交历史。

### A.4 用私有仓库存放诊断日志

需要跨电脑收集程序日志时，可以建立专用私有仓库，避免把日志混进源码历史：

```bash
gh repo create <owner>/<log-repo> --private --description "运行日志"
git init -b main <local-log-directory>
git -C <local-log-directory> remote add origin https://github.com/<owner>/<log-repo>.git
```

逐行说明：

1. `gh repo create <owner>/<log-repo> --private --description "运行日志"`：创建专用私有 GitHub 仓库，并设置描述。
2. `git init -b main <local-log-directory>`：在指定目录初始化仓库，并把初始分支命名为 `main`。
3. `git -C <local-log-directory> remote add origin https://github.com/<owner>/<log-repo>.git`：让 Git 临时以 `<local-log-directory>` 为工作目录；新增名为 `origin` 的 remote，并把后面的私有仓库 URL 保存为其地址。

- `--private` 限制普通公众访问，但上传前仍应检查并删除 Token、Cookie、密码、私钥和不必要的个人路径信息；私有仓库不能替代敏感信息脱敏。
- 每次运行使用独立目录，并附带版本、commit、机器代号、开始/结束时间和是否人工干预，才能把日志差异与代码版本对应起来。
- GitHub 普通 Git 对象不适合频繁存放大型录像；单文件超过 GitHub 限制时应改用专门的文件存储，不要强行提交。
- 日志提交和推送会永久进入 Git 历史。若误传凭据，仅删除最新文件不够：应立即吊销凭据，再按敏感信息清理流程重写历史。

另一台电脑只需要“一键上传”而不适合安装 Git 时，可以让专用上传器调用 GitHub API，但凭据与权限应按最小化原则设计：

- 使用 Fine-grained personal access token，只选择目标日志仓库，并只授予 `Contents: Read and write`；设置合理的过期时间，不要使用能访问账号全部仓库的宽权限 Token。
- 不要把 Token 写进源码、配置模板、打包后的 EXE 或 Git 历史。在 Windows 上可用当前用户的 DPAPI 加密后保存在 `%LOCALAPPDATA%`；这能防止密文被直接复制到其他用户或电脑解密，但不能抵御已经控制当前 Windows 用户会话的恶意程序。
- 上传前仍要扫描日志与元数据中的 Token、私钥等特征；仓库保持私有并不等于日志已经脱敏。发现凭据后应拒绝上传，而不是只弹出警告后继续。
- 需要同时上传压缩包和元数据时，可用 Git Data API 先创建 blobs 和 tree，再创建一个 commit，最后以非强制方式更新分支引用；这样两个文件在同一提交中出现，避免分步上传留下半完成记录。

### A.5 私有仓库上传器返回 HTTP 404

GitHub 对无权查看的私有仓库可能返回 `404 Not Found`，所以 404 不足以证明仓库不存在。若程序访问的是固定仓库，应先用另一个已经确认有权限的会话做只读核验：

```bash
gh repo view <owner>/<private-repo> --json nameWithOwner,isPrivate,url
```

逐行说明：

1. `gh repo view <owner>/<private-repo> --json nameWithOwner,isPrivate,url`：用当前登录会话读取仓库名称、可见性和 URL，以核验地址与权限。

如果仓库存在，而使用 Fine-grained personal access token 的上传器仍返回 404，依次检查：

- `Resource owner` 是否选中了仓库所属账号或组织；登录另一个 GitHub 账号创建的 Token 不会自动获得目标私有仓库权限。
- `Repository access` 是否为 `Only select repositories`，并且确实勾选了目标仓库；只写仓库名或只选择公开仓库不够。
- `Repository permissions` 中 `Contents` 是否为 `Read and write`；`Metadata: Read-only` 通常由 GitHub 自动附带。
- Token 是否已过期、被吊销，或在组织仓库场景中仍等待管理员批准。

修复时在 GitHub 重新创建满足上述最小权限的 Token，然后在上传器中清除旧的加密凭据并重新配置。不要在终端输出 Token，也不要把它写入命令历史、日志或截图。若旧 Token 的暴露情况不确定，应直接吊销而不是继续复用。`gh repo view` 只证明当前 `gh` 登录会话能读取仓库，不能替代对上传器所保存 Token 的权限检查。

### A.6 用 GitHub 仓库分发 Codex Skill

Codex Skill 是一个至少包含 `SKILL.md` 的目录；可以把它作为普通文件提交到公开或私有 GitHub 仓库。使用者不需要手工克隆整个仓库，可以在 Codex 中让内置 `$skill-installer` 按 GitHub 仓库路径安装：

```text
请用 $skill-installer 从 https://github.com/<owner>/<repo>/tree/<ref>/<path-to-skill> 安装这个 skill。
```

- 用途与适用条件：适合从明确的 GitHub 仓库、分支或标签及子目录安装独立 Skill。公开仓库默认可直接下载；私有仓库需要使用者本机已有 Git 凭据，或本机的 `GITHUB_TOKEN`/`GH_TOKEN`，不得把 Token 写入仓库、安装提示或聊天记录。
- 仓库布局：`<path-to-skill>/SKILL.md` 是必需入口；可按需加入 `scripts/`、`references/`、`assets/` 和 `agents/openai.yaml`。Skill 目录名应稳定，发布说明中优先给出固定标签或 commit 对应的 URL；长期指向 `main` 虽便于自动取得最新内容，但可复现性较差。
- 安装行为：安装器把目录复制到使用者的 Codex 用户 Skill 位置，并在目标目录已存在时安全终止，不会自动覆盖。新安装的 Skill 通常从下一轮对话可用；未出现时重启 Codex。因此“从零安装并立即执行配置”不能可靠地压缩成同一轮，通常是先一句安装提示，再在下一轮显式调用 `$<skill-name>`。
- 检查方法：安装后确认 Skill 出现在 Codex 的 Skill 列表中，再用一个只读或模拟请求测试触发范围；涉及环境变量、用户级配置或删除旧文件的 Skill，仍应在真正写入前展示目标和差异并按 Codex 权限机制确认。仓库中的 Skill 指令不是绕过审批或沙盒的授权。
- 面向零基础用户时，可以把重复的操作放进 Skill 的 `scripts/`，让用户只输入自然语言；不要要求用户复制命令或把密钥发到聊天。若产品要求“零密钥输入”，公开 Skill 不能内置共享密钥，必须由管理员、安装包或设备策略预置凭据；检测不到时应直接停止，而不是弹输入框或输出命令。使用通用变量名时，可同时预置不含秘密的用途标记，防止把原本用于其他域名的同名凭据误发给第三方。安装器与 Skill 执行通常分属不同轮次。
- 更新与恢复：发布新版时先在新标签上验证 `SKILL.md` 及脚本，再让使用者审查更新。安装器不会覆盖同名目录，更新不能假定为静默覆盖；需要按当前 Codex 支持的更新/重装流程处理。回退时安装一个已验证的旧标签版本；不要用 `git reset --hard` 清理用户的 Skill 目录。

若目标是面向大量用户的可安装分发，而不是个人试用或仓库内工作流，官方建议把 Skill 打包成 Codex/ChatGPT Plugin；GitHub 上的独立 Skill 更适合开发、实验和通过 `$skill-installer` 分发。

### A.7 推送或 GitHub 写操作超时后先核对远端

`git push`、`gh pr edit`、`gh release create` 等写操作遇到 TLS 断开、连接超时或 GraphQL 读取失败时，客户端报错只说明没有收到完整的成功响应，不能据此断定远端完全没有生效。盲目重复执行可能造成重复评论、重复 Release，或把已经成功的推送再次当成失败处理。

先按操作类型做只读核验：

```bash
git ls-remote --exit-code origin refs/heads/<branch-name>
gh pr view <pr-number> --repo <owner>/<repo> --json headRefOid,title,body,url
gh release view <tag> --repo <owner>/<repo> --json assets,targetCommitish,url
```

逐行说明：

1. `git ls-remote --exit-code origin refs/heads/<branch-name>`：直接读取远端指定引用的 SHA；引用不存在时返回非零退出码。
2. `gh pr view <pr-number> --repo <owner>/<repo> --json headRefOid,title,body,url`：读取 PR 远端信息；选项限定仓库、评论或 JSON 字段。
3. `gh release view <tag> --repo <owner>/<repo> --json assets,targetCommitish,url`：读取 Release 服务器端元数据，只返回 `--json` 指定字段。

- 推送分支：比较 `git ls-remote` 返回的远端 SHA 与本地 `git rev-parse HEAD`。相同表示推送已生效；不同或分支不存在时，再检查 `git status --short --branch` 和远端更新后重试普通 push。改写历史时仍使用带预期 SHA 的 `--force-with-lease`，不要因为网络报错改用 `--force`。
- PR、评论或 Release：读取目标对象的正文、标签或资产列表，确认预期内容是否已经存在。读取接口本身若超时，可改用 GitHub REST API 或网页核对；不要把一次读取失败误判为前面的写入失败。
- 风险与恢复：重复创建了 PR、评论或 Release 时，先确认哪一个对象包含正确内容，再关闭或删除重复对象；删除 Release 资产会使旧下载链接失效。若远端分支出现非预期 SHA，停止推送，先 `git fetch origin` 并审查远端提交，必要时从本地备份分支或 reflog 恢复。

### A.8 GitHub 推送被本机代理阻断

如果 Git 报告 `proxyconnect tcp: dial tcp 127.0.0.1:9`、`Could not connect to server` 等错误，先检查代理来源。Git 官方文档把 HTTP(S) 代理的标准环境变量列为 `http_proxy`、`https_proxy` 和 `all_proxy`；Windows 环境变量名称不区分大小写，所以 PowerShell 也常显示为大写。`no_proxy` 是“不走代理”的主机例外清单，不是代理地址。`GIT_HTTP_PROXY` 和 `GIT_HTTPS_PROXY` 并不是 Git 官方定义的通用代理 URL 变量；不要把名称相近的 `GIT_HTTP_PROXY_AUTHMETHOD` 误当成代理地址。代理也可能来自 Git 的 `http.proxy`、URL 专用 `http.<url>.proxy` 或 `remote.<name>.proxy` 配置。语义依据见 Git 官方 [git-config](https://git-scm.com/docs/git-config) 文档。

PowerShell 中仅在确认当前网络允许直连时，临时清除当前进程的标准代理变量，并为这一次 Git 命令显式禁用通用及目标 remote 的代理配置。先保存原值，确保成功或失败后都会恢复：

```powershell
$oldHttpProxy = $env:http_proxy
$oldHttpsProxy = $env:https_proxy
$oldAllProxy = $env:all_proxy
try {
    Remove-Item Env:http_proxy, Env:https_proxy, Env:all_proxy -ErrorAction SilentlyContinue
    git -c http.proxy= -c "remote.<remote>.proxy=" push <remote> <branch>
} finally {
    $env:http_proxy = $oldHttpProxy
    $env:https_proxy = $oldHttpsProxy
    $env:all_proxy = $oldAllProxy
}
```

逐行说明：

1. `$oldHttpProxy = $env:http_proxy`：保存当前进程的 HTTP 代理原值；只读环境变量，不改 Git 状态。
2. `$oldHttpsProxy = $env:https_proxy`：保存当前进程的 HTTPS 代理原值。
3. `$oldAllProxy = $env:all_proxy`：保存当前进程的通用代理原值。
4. `try {`：开始需要临时改变代理环境的操作区间。
5. `Remove-Item Env:http_proxy, Env:https_proxy, Env:all_proxy -ErrorAction SilentlyContinue`：只清除当前 PowerShell 进程及其后续子进程可见的三个代理变量；不存在时不报错，不改用户级或系统级环境变量。
6. `git -c http.proxy= -c "remote.<remote>.proxy=" push <remote> <branch>`：`-c` 只为本次命令把通用 HTTP(S) 代理和目标 remote 的代理设为空，再普通推送指定分支；必须把两处 `<remote>` 替换为同一个实际 remote 名称。普通 push 不允许破坏性的非快进覆盖。
7. `} finally {`：无论 Git 成功、失败还是抛出异常，都进入恢复区间。
8. `$env:http_proxy = $oldHttpProxy`：恢复原 HTTP 代理；原值为空时仍保持未配置。
9. `$env:https_proxy = $oldHttpsProxy`：恢复原 HTTPS 代理。
10. `$env:all_proxy = $oldAllProxy`：恢复原通用代理。
11. `}`：结束恢复区间。

- 用途与适用条件：只适用于已经确认代理地址失效、目标 remote 使用 HTTP(S)、且当前网络允许直连的场景。环境变量变更只短暂影响当前 PowerShell 及其子进程，两个 `-c` 配置只影响这一条 Git 命令；`push` 成功时会修改目标远端分支，但不会改本地工作区。SSH remote 不受这些 HTTP 代理设置控制。
- 检查方法：先用 `Get-ChildItem Env: | Where-Object { $_.Name -match '(?i)proxy' }` 查看当前进程环境，再用 `git config --show-origin --get-regexp '\.proxy$'` 检查通用、URL 专用和 remote 专用的代理配置；命令返回状态 1 也可能只是没有匹配项。推送后用 `git ls-remote <remote> refs/heads/<branch>` 或已认证的 `gh api repos/<owner>/<repo>/git/ref/heads/<branch>` 比较远端 SHA 与 `git rev-parse HEAD`。如果 Git 的凭据助手仍不可用，先修复凭据或使用本机已认证的安全凭据助手，不要把 Token 写入命令行、仓库或日志。
- 风险与恢复：绕过企业代理可能违反网络策略或使连接失败；不确定是否允许直连时不要执行。`finally` 会恢复进程级代理变量；如果 PowerShell 在恢复前被强制终止，新开的 PowerShell 会重新继承父进程的原环境。写操作超时或断线时不要盲目重试，先核对远端引用是否已更新；若远端出现非预期 SHA，停止推送并按远端写入恢复流程处理，不要改用 `--force`。

### A.9 GitHub CLI 已登录但 Git HTTPS 凭据助手失败

`gh auth status` 显示已登录，不等于 Git 的 HTTPS 凭据助手一定能正常工作。如果 `git fetch` 或 `git push` 报 Schannel 凭据初始化错误，随后又提示 `No anonymous write access` 或 `Authentication failed`，先判断为本机凭据助手/TLS 后端问题，不要把 Token 写进 remote URL、命令参数或日志。

两类报错签名要先分清，处理方式不同：

- 只读操作（`git fetch`、`git ls-remote`）报 `schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS (0x8009030e)`：这是 TLS 后端问题，与登录状态无关，只给本次命令换后端即可，不需要动凭据。

```bash
git -c http.sslBackend=openssl ls-remote --heads upstream   # 只读探测远端分支，验证换后端后能否连通
git -c http.sslBackend=openssl fetch --prune upstream       # 拉取并清理陈旧远端引用，仍不改工作区
```

- `git push` 同时出现 `fatal: could not read Username for 'https://github.com': terminal prompts disabled` 与 MSYS/Cygwin 的 `sh.exe: *** fatal error - CreateFileMapping S-1-5-... Win32 error 5.  Terminating.`：说明 Git 通过 `sh` 启动 `!` 形式的凭据助手（本机配置为 `!'C:\Program Files\GitHub CLI\gh.exe' auth git-credential`）时被拒，创建共享内存映射失败；受限执行环境（沙箱或受限令牌）也常报 `sh.exe: *** fatal error - couldn't create signal pipe, Win32 error 5`，属于同一类管道/共享内存创建被拒，不要据此重置 Token。此时 `gh auth status` 往往完全正常，不要因此重置 Token，也不要把 remote 改写成含明文 Token 的 URL。先用 `git config --show-origin --get-all credential.helper` 确认助手来源，再在权限不受限的普通终端重跑同一条 `git push`；是否真的推上去仍以 `git ls-remote origin refs/heads/<branch>` 与 `git rev-parse HEAD` 是否一致为准。

- `git push` 报 `error: failed to execute prompt script (exit code 66)`，随后是 `fatal: could not read Username for 'https://github.com': No such file or directory` 以及 `sh.exe`/`bash.exe: *** fatal error - couldn't create signal pipe, Win32 error 5`：这与上一条同源，都是凭据助手启动的 shell 无法创建管道，**不代表凭据失效，也不代表 TLS 后端是瓶颈**。先判断限制来自哪里，再选方案，不要一上来就套用替代凭据助手：

  1. **限制来自执行环境时，解除限制后原样重跑即可。** 若 `push` 运行在沙箱、受限令牌等禁止创建管道/共享内存的环境里，先放宽该环境权限，再重跑同一条 `git -c http.sslBackend=openssl push -u origin <branch>`。已验证：限制解除后这条命令能直接推送成功（输出 `* [new branch]` 并建立跟踪关系），既不需要 `GIT_ASKPASS`，也不需要 `extraheader`。判别依据是同一会话里 `fetch`/`ls-remote` 换后端后已能连通，而 `push` 报的是 shell 管道错误而不是 `Authentication failed`——这说明卡点是管道创建权限，不是凭据内容。
  2. **限制确实无法解除时，才退到替代方案。** `GIT_ASKPASS` 同样要启动 shell，常会一并失败；此时用下面的 `GIT_CONFIG_*` + `http.https://github.com/.extraheader` 一次性请求头方案。

  两条路径的成功判据相同：`git -c http.sslBackend=openssl ls-remote origin refs/heads/<branch>` 与 `git rev-parse HEAD` 一致。另外，`-c http.sslBackend=openssl` 只影响当前命令，不要为了让某条命令通过而改写全局 `http.sslBackend`。

优先尝试已配置的 SSH 密钥；没有可用密钥时，可以用一次性的 `GIT_ASKPASS` 程序从 `gh auth token` 读取当前登录凭据，并禁用本次命令的其他 credential helper：

```powershell
$env:GIT_ASKPASS = '<temporary-askpass-script>'
$env:GIT_TERMINAL_PROMPT = '0'
git -c http.sslBackend=openssl -c credential.helper= push -u origin <branch>
Remove-Item Env:GIT_ASKPASS
Remove-Item Env:GIT_TERMINAL_PROMPT
```

其中临时 askpass 程序只在收到密码提示时调用 `gh auth token`，Token 通过标准输出管道交给 Git，不应写入文件内容；命令完成后立即删除该程序。`http.sslBackend=openssl` 仅对当前命令生效，用于绕过已确认有问题的 Schannel，不改变全局 Git 配置。

如果受限环境连 `GIT_ASKPASS` 启动的 shell 也无法创建，可以把 GitHub CLI 已登录凭据转换为本次 Git 子进程专用的 HTTP 请求头。不要把 Token 或编码后的请求头写进 remote URL、命令文本、文件或日志：

```powershell
$token = (gh auth token).Trim()
$basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$token"))
$env:GIT_CONFIG_COUNT = '2'
$env:GIT_CONFIG_KEY_0 = 'http.sslBackend'
$env:GIT_CONFIG_VALUE_0 = 'openssl'
$env:GIT_CONFIG_KEY_1 = 'http.https://github.com/.extraheader'
$env:GIT_CONFIG_VALUE_1 = "AUTHORIZATION: basic $basic"
try {
    git push origin <branch>
} finally {
    Remove-Item Env:GIT_CONFIG_COUNT,Env:GIT_CONFIG_KEY_0,Env:GIT_CONFIG_VALUE_0,Env:GIT_CONFIG_KEY_1,Env:GIT_CONFIG_VALUE_1
    $token = $null
    $basic = $null
}
```

这组 `GIT_CONFIG_*` 变量只给当前 PowerShell 及其子进程提供临时 Git 配置；`finally` 确保成功或失败后都清理变量。它适用于 `gh auth status` 已确认登录、普通凭据助手失败且 SSH 不可用的场景；它不会修改全局 Git 配置，但当前进程和子进程在执行期间能读取请求头，因此不要同时运行不受信任的程序。若 `git push` 失败，先清理变量并保留本地 commit，再核对远端，不要输出变量内容或把它改成含明文 Token 的 URL。

推送后必须用 `git ls-remote origin refs/heads/<branch>` 比较远端 SHA 与 `git rev-parse HEAD`；一致才算推送成功。若失败，保留本地 commit，先检查 GitHub CLI 登录状态、远端 URL 和网络，不要改用明文 Token 或 `--force`。

### A.10 用 GitHub 隐私邮箱提交

Git 提交会永久记录作者和提交者的姓名、邮箱；公开仓库中的这些信息也会公开。若不希望公开私人邮箱，应先到 GitHub 的 `Settings → Emails` 复制 GitHub 实际提供的 `noreply` 地址，不要自行猜测地址格式。GitHub 官方说明：命令行提交使用本机 Git 配置的邮箱；使用账户设置中提供的 `noreply` 地址，既能隐藏私人邮箱，也能让 GitHub 正确关联贡献记录。

只为当前仓库设置隐私邮箱，并修正尚未推送的最新提交：

```bash
git config --local user.email "<GitHub 提供的 noreply 地址>"
git config --show-origin --get user.email
git commit --amend --no-edit --reset-author
git show -s --format=fuller HEAD
```

逐行说明：

1. `git config --local user.email ...`：把邮箱写入当前仓库的 `.git/config`，覆盖本仓库中的全局邮箱设置；不会影响其他仓库、工作区文件或远端。
2. `git config --show-origin --get user.email`：显示当前生效的邮箱及配置来源，用于确认确实来自当前仓库。
3. `git commit --amend --no-edit --reset-author`：重建最新提交，保留原提交说明，并用当前姓名和邮箱重置作者信息；会改变最新 commit 的哈希，但不改工作区文件。
4. `git show -s --format=fuller HEAD`：检查最新提交的 `Author`、`Commit`、`AuthorDate` 和 `CommitDate`，不修改任何状态。

- 适用条件：`--amend` 只用于尚未推送、尚未分享的最新提交。执行前先用 `git status --short --branch` 确认分支关系；若担心误操作，可先创建本地备份分支。
- 风险与恢复：amend 会改写本地历史；若结果不对，可以从备份分支或 `git reflog` 找回原提交。备份分支仍可能保留旧邮箱，但只要未推送就不会因此公开。
- 已发布历史：更改 Git 配置只影响之后新建或重建的提交，不会自动清除旧提交里的邮箱。不要仅为隐藏旧邮箱就随意改写共享分支；这会改变后续所有 commit 哈希，并可能需要协作方重新同步。先设置未来提交的隐私邮箱；确需清理公开历史时，应单独评估影响并使用有明确通知和恢复方案的历史重写流程。
- 额外保护：可以在 GitHub 的邮箱设置中启用阻止暴露私人邮箱的命令行推送；它能在检测到私人邮箱时拒绝推送，但不能替代提交前检查。

### A.11 PowerShell 把 git 的 stderr 进度当成错误

Windows PowerShell 会把外部程序写到 stderr 的正常进度信息包装成 `NativeCommandError`，因此 `git fetch`、`git push`、`git clone` 即使已经成功，也可能显示成一片红字报错，例如（实测 Windows PowerShell 5.1）：

```text
git : From https://github.com/<owner>/<repo>
所在位置 行:3 字符: 1
+ git -C <repo> fetch --prune upstream 2>&1 | Select-Object -First 5
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (From https://gi...eed/sipeed_wiki:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError

   a9e06c9f..d76c2cbe  main       -> upstream/main
```

最后一行才是真正的结果行：`<old-sha>..<new-sha>  <branch> -> <branch>` 表示引用已经更新。

判断与处理：

- 看动作行本身：`From <url>`、`* [new branch]`、`<old-sha>..<new-sha>  <branch> -> <branch>` 这类行出现在红字里，就说明操作其实成功了。
- 用独立命令验收，不要只凭观感：`git status --short --branch`、`git ls-remote <remote> refs/heads/<branch>`、`git rev-parse HEAD` 三者比对是否一致。
- `2>&1` 会把 stderr 一起送进管道；再接 `Select-String` / `Where-Object` 过滤时，`fatal:` 之类的关键行可能被过滤条件丢掉，看起来像「命令没有输出」。核对远端写入时先看完整输出，再做过滤（与「查看 PR 相对上游的改动」一节的同类提醒一致）。
- 该现象只影响显示，不影响 Git 行为；不要因此重跑推送、改用 `--force` 或重设凭据。
