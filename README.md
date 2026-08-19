# DeepSeek Harness Desktop

一个把 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh web`）网页界面封装成独立桌面应用的小工具。双击图标即可启动服务并以内嵌窗口显示网页，无需打开浏览器，体验类似原生软件。

## 功能特性

- **双击即用**：启动应用时自动拉起 `dsh web` 服务，并在应用窗口内嵌显示其网页界面（非浏览器）。
- **界面内重启**：工具栏「重启服务」按钮对应停止 + 启动服务，之后自动刷新页面。
- **状态可视**：工具栏实时显示服务运行状态（运行中 PID / 未运行）。
- **关闭即停**：关闭窗口时自动停止服务，不留后台残留进程。
- **自包含**：服务生命周期由应用内部管理（基于 `netstat` + `taskkill` 精确控制），不依赖额外脚本。

## 前置要求

| 依赖 | 版本/说明 |
|---|---|
| Windows | Windows 10/11（本工具面向 Windows） |
| Node.js | ≥ 22.19（`dsh` 要求），且 `node` 需在 PATH 中 |
| DeepSeek Harness | 全局安装：`npm install -g @deepseek-ai/dsh` |
| DeepSeek API Key | 用于调用模型 |

## 安装

### 1. 安装 Node.js

前往 [nodejs.org](https://nodejs.org) 下载 LTS 版本（≥ 22.19）安装，确保 `node -v` 可正常输出。

### 2. 安装 DeepSeek Harness

```bash
npm install -g @deepseek-ai/dsh
dsh --version   # 应输出类似 0.1.0-rc.7
```

### 3. 获取本项目并安装依赖

```bash
git clone <本仓库地址> deepseek-harness-desktop
cd deepseek-harness-desktop
npm install
```

> 国内网络若 electron 二进制下载缓慢或失败，使用镜像安装：
> ```bash
> ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
> ```

### 4. 创建桌面快捷方式（可选但推荐）

在 PowerShell 中运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File create-shortcut.ps1
```

会在桌面生成「DeepSeek Harness」快捷方式，之后双击即可启动。

## 配置

首次使用前需配置 DeepSeek 凭据与默认模型，文件位于 `~/.dsh/`（即 `C:\Users\<你>\.dsh\`）。

### 凭据：`~/.dsh/.credentials.yaml`

```yaml
DEEPSEEK_API_KEY: sk-你的密钥
```

> 键名固定为 `DEEPSEEK_API_KEY`，服务会热加载该文件，改完无需重启。

### 默认模型：`~/.dsh/settings.yaml`

```yaml
agent-default-model:
  provider: deepseek-official
  model: deepseek-v4-pro
```

`model` 可选 `deepseek-v4-pro`、`deepseek-v4-flash` 等目录内模型。

## 使用

- **启动**：双击桌面快捷方式（或运行 `npm start` / 双击 `启动 DeepSeek Harness.cmd`）。
- **重启**：点击应用工具栏的「重启服务」。
- **状态**：工具栏常显运行状态；也可点「浏览器打开」在外部浏览器查看。
- **停止**：直接关闭窗口（点 ×），服务随之停止。

## 工作原理

应用通过 Electron 内嵌 `<webview>` 加载 `http://127.0.0.1:3080`（`dsh web` 的默认地址）。服务生命周期如下：

| 事件 | 行为 |
|---|---|
| 应用启动 | 检测端口 3080 是否已在监听；未运行则用 `node <dsh>/lib/bin.js web` 后台拉起，就绪后加载页面 |
| 点击「重启服务」 | 通过 `netstat` 定位监听进程 PID，`taskkill /T /F` 停止，再重新拉起，随后刷新页面 |
| 关闭窗口 | `before-quit` 钩子中停止服务，再退出应用 |

服务的启动/停止均通过 Windows 自带 `netstat.exe` 与 `taskkill.exe` 完成，**按端口精确定位进程**，不会误杀其他 `node` 进程。

## 配置项说明（`main.js`）

| 常量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3080` | `dsh web` 服务端口 |
| `NODE_EXE` | `process.env.DSH_NODE_EXE \|\| 'node'` | node 可执行文件；默认从 PATH 解析，可用环境变量 `DSH_NODE_EXE` 覆盖 |
| `DSH_BIN_JS` | `%APPDATA%\npm\node_modules\@deepseek-ai\dsh\lib\bin.js` | dsh 入口脚本（按 npm 全局默认路径解析） |

## 文件结构

```
.
├── main.js                 # Electron 主进程：窗口 + 服务生命周期管理
├── preload.js              # contextBridge 安全通信桥
├── app.html                # 界面：工具栏 + 内嵌 webview
├── package.json            # 项目配置
├── create-shortcut.ps1     # 生成桌面快捷方式
└── 启动 DeepSeek Harness.cmd  # 备用启动器（双击直接运行）
```

## 常见问题

**Q：双击后窗口空白 / 一直显示「正在启动服务」？**
确认 `dsh` 已全局安装（`dsh --version`），且 `~/.dsh/.credentials.yaml` 已填入有效密钥。

**Q：端口 3080 被占用？**
结束占用进程，或修改 `main.js` 中的 `PORT`（注意需与 dsh 服务端口一致）。

**Q：提示找不到 node？**
确保 `node` 在 PATH 中；或设置环境变量 `DSH_NODE_EXE` 指向 node.exe 的完整路径。

**Q：electron 安装失败 / 下载慢？**
使用镜像：`ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install`。

## License

MIT
