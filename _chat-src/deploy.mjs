import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* 把本目录（_chat-src）里的网页源码同步到 ../chat/（线上目录）。
   路径全部相对本文件，移动目录后不需要改这里。 */

const SRC = dirname(fileURLToPath(import.meta.url));
const DEST = join(SRC, '..');
const log = [];

const chatDir = join(DEST, 'chat');
mkdirSync(chatDir, { recursive: true });
const files = ['index.html', 'manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png', 'icon-180.png', 'icon-512-maskable.png'];
for (const f of files) {
  if (!existsSync(join(SRC, f))) { log.push('!! 缺少 ' + f); continue; }
  writeFileSync(join(chatDir, f), readFileSync(join(SRC, f)));
  log.push('同步 chat/' + f);
}

const ymlPath = join(DEST, '_data', 'projects.yml');
let yml = readFileSync(ymlPath, 'utf8');
const oldDesc = 'description: "在手机浏览器直接调用 DeepSeek API 的轻量聊天页，不需要后端，密钥只保存在本机。"';
const newDesc = 'description: "给家人用的手机助手：打字或拍照提问，能看照片、PDF、Word，可添加到主屏幕当 App 用。"';
if (yml.includes(oldDesc)) { writeFileSync(ymlPath, yml.replace(oldDesc, newDesc)); log.push('项目卡片描述已更新'); }

console.log(log.join('\n'));
