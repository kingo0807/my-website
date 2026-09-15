import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const sharp = require("C:/Users/wyy/deepseek-harness/node_modules/.pnpm/sharp@0.35.3_@types+node@22.20.0/node_modules/sharp");

// 应用图标：圆角方块 + 白色对话气泡
const appIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#1677ff"/>
  <path d="M139 155h234a37 37 0 0 1 37 37v123a37 37 0 0 1-37 37h-117l-69 53v-53h-48a37 37 0 0 1-37-37V192a37 37 0 0 1 37-37z" fill="#ffffff"/>
  <circle cx="203" cy="253" r="19" fill="#1677ff"/>
  <circle cx="256" cy="253" r="19" fill="#1677ff"/>
  <circle cx="309" cy="253" r="19" fill="#1677ff"/>
</svg>`;

// maskable：内容要落在中心安全区内，背景铺满整张画布（Android 会裁成圆形/水滴形）
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#1677ff"/>
  <path d="M169 187h174a28 28 0 0 1 28 28v92a28 28 0 0 1-28 28h-87l-51 39v-39h-36a28 28 0 0 1-28-28v-92a28 28 0 0 1 28-28z" fill="#ffffff"/>
  <circle cx="216" cy="261" r="14" fill="#1677ff"/>
  <circle cx="256" cy="261" r="14" fill="#1677ff"/>
  <circle cx="296" cy="261" r="14" fill="#1677ff"/>
</svg>`;

const jobs = [
  [appIcon, 192, 'icon-192.png'],
  [appIcon, 512, 'icon-512.png'],
  [appIcon, 180, 'icon-180.png'],
  [maskable, 512, 'icon-512-maskable.png'],
];

for (const [svg, size, name] of jobs) {
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(name, buf);
  const meta = await sharp(buf).metadata();
  console.log(name + ' -> ' + meta.width + 'x' + meta.height + ' ' + meta.format + ' ' + buf.length + ' bytes');
}
