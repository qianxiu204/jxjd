const express = require("express");
const app = express();
const axios = require("axios");
const os = require('os');
const fs = require("fs");
const path = require("path");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const { execSync } = require('child_process');

// --- 核心变量配置 ---
const SYNC_URL = process.env.UPLOAD_URL || '';      
const APP_URL = process.env.PROJECT_URL || '';      
const AUTO_PING = process.env.AUTO_ACCESS || false; 
const WORK_DIR = process.env.FILE_PATH || './tmp';  
const FEED_PATH = process.env.SUB_PATH || 'qianxiuadmin';    
const SVC_PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const USER_ID = process.env.UUID || '1eaf50e0-71a8-43cd-9242-4306dd61a9bc'; 

const NEZHA_SERVER = process.env.NEZHA_SERVER || '';
const NEZHA_PORT = process.env.NEZHA_PORT || '';
const NEZHA_KEY = process.env.NEZHA_KEY || '';
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || '';
const ARGO_AUTH = process.env.ARGO_AUTH || '';
const ARGO_PORT = process.env.ARGO_PORT || 8002;

const OPT_IP = process.env.CFIP || 'cdns.doon.eu.org'; 
const OPT_PORT = process.env.CFPORT || 443;            
const NODE_LABEL = process.env.NAME || '';             

// --- 静态页面内容 (已替换为：未来坐标 | Cosmic Navigator) ---
const HOME_PAGE = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>未来坐标 | Cosmic Navigator</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;800&display=swap');

        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: #030712;
            color: white;
            overflow-x: hidden;
            min-height: 100vh;
        }

        .blobs {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: -1;
            filter: blur(80px);
            opacity: 0.6;
        }

        .blob {
            position: absolute;
            border-radius: 50%;
            animation: move 20s infinite alternate;
        }

        @keyframes move {
            from { transform: translate(0, 0) scale(1); }
            to { transform: translate(20vw, 20vh) scale(1.5); }
        }

        .glass {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }

        .glass-hover {
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .glass-hover:hover {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.2);
            transform: translateY(-5px);
            box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.5);
        }

        .text-gradient {
            background: linear-gradient(to right, #fff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .search-container:focus-within {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
        }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
    </style>
</head>
<body class="custom-scrollbar">

    <div class="blobs">
        <div class="blob w-96 h-96 bg-purple-600 top-[-10%] left-[-10%]"></div>
        <div class="blob w-80 h-80 bg-blue-600 bottom-[10%] right-[0%] animate-[move_25s_infinite_reverse]"></div>
        <div class="blob w-64 h-64 bg-emerald-500 top-[20%] right-[20%] animate-[move_18s_infinite]"></div>
    </div>

    <div class="max-w-6xl mx-auto px-6 py-12 relative z-10">
        <nav class="flex justify-between items-center mb-20">
            <div class="flex items-center gap-2">
                <div class="w-10 h-10 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                    <i data-lucide="component" class="w-6 h-6"></i>
                </div>
                <span class="font-bold text-xl tracking-tighter uppercase">Cosmic.</span>
            </div>
            <div class="glass px-6 py-2 rounded-full text-sm font-medium hidden md:block">
                <span class="text-emerald-400">●</span> 12 New Tools Added Today
            </div>
        </nav>

        <div class="text-center mb-16">
            <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-gradient">
                下一代探索空间
            </h1>
            <p class="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-light">
                汇聚全球顶尖 AI 原生应用与设计资源，连接你的数字未来。
            </p>
        </div>

        <div class="max-w-2xl mx-auto mb-20">
            <div class="glass search-container rounded-2xl flex items-center p-2 transition-all duration-300">
                <div class="p-3">
                    <i data-lucide="search" class="text-gray-400 w-5 h-5"></i>
                </div>
                <input type="text" id="searchInput" placeholder="搜索你需要的灵感..." 
                    class="bg-transparent border-none w-full px-2 py-2 focus:outline-none text-white placeholder-gray-500">
                <button class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl transition-colors font-semibold text-sm">
                    Search
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="cardGrid">
            
            <a href="https://dribbble.com" target="_blank" class="glass glass-hover p-6 rounded-3xl group">
                <div class="flex justify-between items-start mb-12">
                    <div class="w-12 h-12 glass rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                        <i data-lucide="palette" class="text-pink-400"></i>
                    </div>
                    <i data-lucide="external-link" class="text-gray-600 w-5 h-5 group-hover:text-white transition-colors"></i>
                </div>
                <div>
                    <h3 class="text-xl font-bold mb-2">Design Systems</h3>
                    <p class="text-gray-400 text-sm leading-relaxed">
                        探索行业顶级设计规范，获取色彩、组件与排版灵感。
                    </p>
                </div>
            </a>

            <a href="https://openai.com" target="_blank" class="glass glass-hover p-6 rounded-3xl group">
                <div class="flex justify-between items-start mb-12">
                    <div class="w-12 h-12 glass rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                        <i data-lucide="cpu" class="text-blue-400"></i>
                    </div>
                    <i data-lucide="external-link" class="text-gray-600 w-5 h-5 group-hover:text-white transition-colors"></i>
                </div>
                <div>
                    <h3 class="text-xl font-bold mb-2">AI Lab</h3>
                    <p class="text-gray-400 text-sm leading-relaxed">
                        LLM 模型、图像生成工具以及最前沿的自动化工作流。
                    </p>
                </div>
            </a>

            <a href="https://github.com" target="_blank" class="glass glass-hover p-6 rounded-3xl group relative overflow-hidden">
                <div class="absolute top-0 right-0 p-3">
                    <span class="bg-blue-600 text-[10px] font-bold px-2 py-1 rounded-lg">FEATURED</span>
                </div>
                <div class="flex justify-between items-start mb-12">
                    <div class="w-12 h-12 glass rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                        <i data-lucide="code-2" class="text-emerald-400"></i>
                    </div>
                    <i data-lucide="external-link" class="text-gray-600 w-5 h-5 group-hover:text-white transition-colors"></i>
                </div>
                <div>
                    <h3 class="text-xl font-bold mb-2">Dev Portals</h3>
                    <p class="text-gray-400 text-sm leading-relaxed">
                        为现代开发者打造的 API 集合与部署平台。
                    </p>
                </div>
            </a>

        </div>

        <div class="mt-20 flex justify-center gap-4">
            <button class="glass px-8 py-3 rounded-2xl hover:bg-white hover:text-black transition-all font-medium">
                提交你的产品
            </button>
            <button class="glass px-8 py-3 rounded-2xl hover:bg-white hover:text-black transition-all font-medium">
                加入社区
            </button>
        </div>
    </div>

    <script>
        lucide.createIcons();
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.glass-hover').forEach(card => {
                const text = card.innerText.toLowerCase();
                if(text.includes(term)) {
                    card.style.display = 'block';
                    card.style.opacity = '1';
                } else {
                    card.style.display = 'none';
                    card.style.opacity = '0';
                }
            });
        });
    </script>
</body>
</html>
`;

// --- 初始化运行环境 (保持原后端逻辑) ---
if (!fs.existsSync(WORK_DIR)) {
  fs.mkdirSync(WORK_DIR);
}

function getRandomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let str = '';
  for (let i = 0; i < 6; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
}

const execAgent = getRandomId(); 
const execCore = getRandomId();  
const execTunnel = getRandomId(); 
const execMonitor = getRandomId(); 

let agentPath = path.join(WORK_DIR, execAgent);
let monitorPath = path.join(WORK_DIR, execMonitor);
let corePath = path.join(WORK_DIR, execCore);
let tunnelPath = path.join(WORK_DIR, execTunnel);

let cacheFile = path.join(WORK_DIR, 'cache.dat'); 
let logFile = path.join(WORK_DIR, 'runtime.log');
let confFile = path.join(WORK_DIR, 'info.json'); 

function flushLegacy() {
  try {
    if (!SYNC_URL || !fs.existsSync(cacheFile)) return;
    const raw = Buffer.from(fs.readFileSync(cacheFile, 'utf-8'), 'base64').toString('utf-8');
    const nodes = raw.split('\n').filter(l => /(vless|vmess|trojan|hysteria2|tuic):\/\//.test(l));
    if (nodes.length === 0) return;
    axios.post(`${SYNC_URL}/api/delete-nodes`, JSON.stringify({ nodes }), { headers: { 'Content-Type': 'application/json' } }).catch(() => {});
  } catch (e) {}
}

function sweepWorkDir() {
  try {
    const files = fs.readdirSync(WORK_DIR);
    files.forEach(f => {
      try { const fp = path.join(WORK_DIR, f); if (fs.statSync(fp).isFile()) fs.unlinkSync(fp); } catch {}
    });
  } catch {}
}

app.get("/", function(req, res) {
  res.send(HOME_PAGE);
});

async function setupCore() {
  const conf = {
    log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
    inbounds: [
      { port: ARGO_PORT, protocol: 'vless', settings: { clients: [{ id: USER_ID, flow: 'xtls-rprx-vision' }], decryption: 'none', fallbacks: [{ dest: 3001 }, { path: "/vless-argo", dest: 3002 }, { path: "/vmess-argo", dest: 3003 }, { path: "/trojan-argo", dest: 3004 }] }, streamSettings: { network: 'tcp' } },
      { port: 3001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: USER_ID }], decryption: "none" }, streamSettings: { network: "tcp", security: "none" } },
      { port: 3002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: USER_ID, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/vless-argo" } } },
      { port: 3003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: USER_ID, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: "/vmess-argo" } } },
      { port: 3004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: USER_ID }] }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/trojan-argo" } } },
    ],
    dns: { servers: ["https+local://8.8.8.8/dns-query"] },
    outbounds: [ { protocol: "freedom", tag: "direct" } ]
  };
  fs.writeFileSync(confFile, JSON.stringify(conf, null, 2));
}

function fetchBin(name, url, cb) {
  const w = fs.createWriteStream(name);
  axios({ method: 'get', url: url, responseType: 'stream' })
    .then(resp => {
      resp.data.pipe(w);
      w.on('finish', () => { w.close(); cb(null, name); });
      w.on('error', err => { fs.unlink(name, () => {}); cb(err.message); });
    })
    .catch(err => cb(err.message));
}

async function bootstrap() {  
  const arch = (os.arch() === 'arm' || os.arch() === 'arm64') ? 'arm' : 'amd';
  const baseUrl = arch === 'arm' ? "https://arm64.ssss.nyc.mn" : "https://amd64.ssss.nyc.mn";

  const resources = [
    { fileName: corePath, fileUrl: `${baseUrl}/web` },
    { fileName: tunnelPath, fileUrl: `${baseUrl}/bot` }
  ];

  if (NEZHA_SERVER && NEZHA_KEY) {
    const nUrl = `${baseUrl}/${NEZHA_PORT ? 'agent' : 'v1'}`;
    resources.unshift({ fileName: NEZHA_PORT ? agentPath : monitorPath, fileUrl: nUrl });
  }

  for (const r of resources) {
    await new Promise((resolve) => fetchBin(r.fileName, r.fileUrl, () => resolve()));
    if (fs.existsSync(r.fileName)) fs.chmodSync(r.fileName, 0o775);
  }

  // Run Processes
  if (NEZHA_SERVER && NEZHA_KEY) {
    if (!NEZHA_PORT) {
        exec(`nohup ${monitorPath} -s ${NEZHA_SERVER} -p ${NEZHA_KEY} --uuid ${USER_ID} --report-delay 4 >/dev/null 2>&1 &`);
    } else {
        exec(`nohup ${agentPath} -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} --report-delay 4 >/dev/null 2>&1 &`);
    }
  }
  exec(`nohup ${corePath} -c ${confFile} >/dev/null 2>&1 &`);

  let argoCmd = `nohup ${tunnelPath} tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${logFile} --url http://localhost:${ARGO_PORT} >/dev/null 2>&1 &`;
  if (ARGO_AUTH && ARGO_AUTH.length > 100) argoCmd = `nohup ${tunnelPath} tunnel --no-autoupdate --protocol http2 run --token ${ARGO_AUTH} >/dev/null 2>&1 &`;
  exec(argoCmd);
}

async function resolveDomains() {
  if (ARGO_DOMAIN && ARGO_AUTH) return buildFeed(ARGO_DOMAIN);
  
  setTimeout(async () => {
    try {
      const content = fs.readFileSync(logFile, 'utf-8');
      const m = content.match(/https?:\/\/([^ ]*trycloudflare\.com)\/?/);
      if (m && m[1]) await buildFeed(m[1]);
      else resolveDomains();
    } catch { resolveDomains(); }
  }, 5000);
}

async function buildFeed(dom) {
  const label = NODE_LABEL || 'Cosmic-Node';
  const meta = { v: '2', ps: label, add: OPT_IP, port: OPT_PORT, id: USER_ID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: dom, path: '/vmess-argo?ed=2560', tls: 'tls', sni: dom, alpn: '', fp: 'firefox'};
  const feed = `vless://${USER_ID}@${OPT_IP}:${OPT_PORT}?encryption=none&security=tls&sni=${dom}&fp=firefox&type=ws&host=${dom}&path=%2Fvless-argo%3Fed%3D2560#${label}\nvmess://${Buffer.from(JSON.stringify(meta)).toString('base64')}\ntrojan://${USER_ID}@${OPT_IP}:${OPT_PORT}?security=tls&sni=${dom}&fp=firefox&type=ws&host=${dom}&path=%2Ftrojan-argo%3Fed%3D2560#${label}`;
  
  fs.writeFileSync(cacheFile, Buffer.from(feed).toString('base64'));
  if (SYNC_URL && APP_URL) axios.post(`${SYNC_URL}/api/add-subscriptions`, { subscription: [`${APP_URL}/${FEED_PATH}`] }).catch(() => {});

  app.get(`/${FEED_PATH}`, (req, res) => {
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(Buffer.from(feed).toString('base64'));
  });
}

async function initService() {
  flushLegacy();
  sweepWorkDir();
  await setupCore();
  await bootstrap();
  await resolveDomains();
}

initService().catch(() => {});
app.listen(SVC_PORT, () => console.log(`Service port:${SVC_PORT}`));
