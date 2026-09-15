import { readFileSync, writeFileSync } from 'node:fs';

const GUIDE = 'C:\\Users\\wyy\\Desktop\\域名与网站上线入门指南.md';
const PART = 'C:\\Users\\wyy\\Documents\\phone-ai\\backend-guide.md';

let guide = readFileSync(GUIDE, 'utf8');
const eol = guide.includes('\r\n') ? '\r\n' : '\n';
const part = readFileSync(PART, 'utf8').trimEnd().split('\n').join(eol);
const log = [];
const before = guide.split('\n').length;

const start = guide.indexOf('# 第三部分：给静态网站加后端');
const end = guide.indexOf('## 参考资料');
if (start < 0) { console.log('!! 找不到旧版第三部分，未改动'); process.exit(1); }
if (end < 0 || end < start) { console.log('!! 找不到参考资料锚点，未改动'); process.exit(1); }

const oldLines = guide.slice(start, end).split('\n').length;
guide = guide.slice(0, start) + part + eol + eol + guide.slice(end);

writeFileSync(GUIDE, guide);
log.push('旧版第三部分：' + oldLines + ' 行 → 新版：' + part.split(eol).length + ' 行');
log.push('文件总行数：' + before + ' → ' + guide.split('\n').length);
log.push('残留检查 —— 含「家庭口令」：' + guide.includes('家庭口令'));
log.push('残留检查 —— 含「亲人」：' + guide.includes('亲人'));
log.push('残留检查 —— 含真实口令值：' + guide.includes('wyy20030807'));
log.push('新版标题存在：' + guide.includes('# 第三部分：给静态网站加后端（无服务器函数）'));
console.log(log.join('\n'));
