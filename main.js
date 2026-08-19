const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { spawn, execFile } = require('child_process');
const path = require('path');
const os = require('os');

// —— 可配置项（若环境变化，改这里）——
const PORT = 3080;
const APP_URL = `http://127.0.0.1:${PORT}`;
// node 可执行文件：默认从 PATH 解析；可用环境变量 DSH_NODE_EXE 覆盖
const NODE_EXE = process.env.DSH_NODE_EXE || 'node';
const DSH_BIN_JS = path.join(
  os.homedir(),
  'AppData', 'Roaming', 'npm', 'node_modules',
  '@deepseek-ai', 'dsh', 'lib', 'bin.js'
);
const NETSTAT = 'C:/Windows/System32/netstat.exe';
const TASKKILL = 'C:/Windows/System32/taskkill.exe';

let win = null;
let cleanedUp = false;

function run(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { maxBuffer: 10 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      resolve({ err, stdout: (stdout || '').trim(), stderr: (stderr || '').trim() });
    });
  });
}

// 找出监听指定端口的 PID；未运行返回 null
async function getListenerPid(port) {
  const { stdout } = await run(NETSTAT, ['-ano']);
  for (const line of stdout.split(/\r?\n/)) {
    const p = line.trim().split(/\s+/);
    if (p.length >= 5 && p[3] === 'LISTENING' && p[1].endsWith(':' + port)) {
      return parseInt(p[4], 10);
    }
  }
  return null;
}

async function isRunning() {
  return (await getListenerPid(PORT)) !== null;
}

function startService() {
  spawn(NODE_EXE, [DSH_BIN_JS, 'web'], {
    detached: true, stdio: 'ignore', windowsHide: true, cwd: os.homedir(),
  }).unref();
}

async function stopService() {
  const pid = await getListenerPid(PORT);
  if (!pid) return 'not-running';
  await run(TASKKILL, ['/PID', String(pid), '/T', '/F']);
  await new Promise((r) => setTimeout(r, 800));
  return 'stopped';
}

async function waitReady(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isRunning()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function ensureService() {
  if (await isRunning()) return true;
  startService();
  return waitReady();
}

async function restartService() {
  await stopService();
  startService();
  return waitReady();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 940,
    minHeight: 620,
    title: 'DeepSeek Harness',
    autoHideMenuBar: true,
    backgroundColor: '#1e1e2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });
  win.loadFile(path.join(__dirname, 'app.html'));
  win.on('closed', () => { win = null; });
}

// —— IPC ——
ipcMain.handle('dsh:status', async () => {
  const pid = await getListenerPid(PORT);
  return pid ? { running: true, pid, url: APP_URL } : { running: false };
});
ipcMain.handle('dsh:start', async () => ({ ok: await ensureService() }));
ipcMain.handle('dsh:restart', async () => ({ ok: await restartService() }));
ipcMain.handle('dsh:openBrowser', () => shell.openExternal(APP_URL));

app.whenReady().then(() => {
  createWindow();

  // 后台拉起服务，就绪后通知渲染进程
  ensureService()
    .then((ok) => {
      if (win && !win.isDestroyed()) win.webContents.send('dsh:ready', ok);
    })
    .catch(() => {});
});

// 关闭窗口 → 停止服务 → 退出
app.on('before-quit', (event) => {
  if (cleanedUp) return;
  event.preventDefault();
  cleanedUp = true;
  stopService().finally(() => app.quit());
});

app.on('window-all-closed', () => {
  app.quit();
});
