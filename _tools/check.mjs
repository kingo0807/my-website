/**
 * 站点自检（本地和 CI 都跑这一条命令）：
 *
 *   node _tools/check.mjs
 *
 * 检查两件事：
 *   1. 站点模板的 Liquid 标签是否配对、每篇指南的 front matter 是否完整；
 *   2. 站内链接指向的指南和资源是否真的存在。
 *
 * 目录名以 _ 开头，Jekyll 不会把它发布到网站。
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => join(ROOT, p);
const read = (p) => readFileSync(rel(p), 'utf8');

let fail = 0;
const ok = (m) => console.log('  PASS  ' + m);
const bad = (m) => { fail++; console.log('  FAIL  ' + m); };

/* ---------- 1. 模板与 front matter ---------- */
console.log('== 模板 ==');
const TEMPLATES = [
  'index.html', '404.md', 'sitemap.xml', 'updates.md',
  'guides/index.md', '_layouts/article.html',
];
for (const t of TEMPLATES) {
  const src = read(t);
  const outTags = (src.match(/\{\{/g) || []).length === (src.match(/\}\}/g) || []).length;
  const blockTags = (src.match(/\{%/g) || []).length === (src.match(/%\}/g) || []).length;
  if (outTags && blockTags) ok('Liquid 配对 ' + t);
  else bad('Liquid 标签不配对 ' + t);
}

const guides = readdirSync(rel('_guides')).filter((n) => n.endsWith('.md'));
for (const f of guides) {
  const fm = (read('_guides/' + f).split('---')[1]) || '';
  const missing = ['layout:', 'title:', 'description:', 'guide_order:'].filter((k) => !fm.includes(k));
  if (missing.length) bad('_guides/' + f + ' 缺少 ' + missing.join(' '));
  else ok('_guides/' + f + ' front matter 完整');
}

/* 内部记录不能被发布出去 */
const conf = read('_config.yml');
if (/exclude:[\s\S]*NOTES\.md/.test(conf)) ok('_config.yml 仍排除 NOTES.md');
else bad('_config.yml 不再排除 NOTES.md，开发记录会出现在公网上');

/* ---------- 2. 站内链接 ---------- */
console.log('== 站内链接 ==');
const slugs = new Set(guides.map((f) => f.replace(/\.md$/, '')));
const SCAN = ['index.html', 'updates.md', '404.md', 'guides/index.md', '_layouts/article.html']
  .concat(guides.map((f) => '_guides/' + f));

let checked = 0;
let skipped = 0;
for (const f of SCAN) {
  const src = read(f);
  const links = [];
  for (const m of src.matchAll(/\]\((\/[^)\s]*)\)/g)) links.push(m[1]);
  for (const m of src.matchAll(/href="(\/[^"]*)"/g)) links.push(m[1]);
  /* 模板里写成 {{ '/x' | relative_url }} 的也要算进来 */
  for (const m of src.matchAll(/\{\{\s*'(\/[^']*)'\s*\|\s*(?:relative|absolute)_url\s*\}\}/g)) links.push(m[1]);
  for (const raw of links) {
    const path = raw.split('#')[0];
    if (!path) continue;

    /* 只检查站内指南与静态资源，正文里的示例路径不算。 */
    const guide = /^\/guides\/([^/]+)\/?$/.exec(path);
    if (guide) {
      checked++;
      if (!slugs.has(guide[1])) bad(f + ' 指向不存在的指南 ' + path);
      continue;
    }
    if (path.startsWith('/assets/') || path === '/robots.txt' || path === '/sitemap.xml') {
      checked++;
      if (!existsSync(rel(path.slice(1)))) bad(f + ' 指向不存在的文件 ' + path);
      continue;
    }
    skipped++;
  }
}
ok('检查了 ' + checked + ' 条站内链接，跳过 ' + skipped + ' 条（根路径/锚点等）');

console.log('');
console.log(fail ? fail + ' 项失败' : '全部通过');
process.exitCode = fail ? 1 : 0;
