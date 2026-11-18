/**
 * 线上体检：确认「推上去」真的等于「用户看到了」。
 *
 *   node _tools/verify-live.mjs                 # 立刻查一次
 *   node _tools/verify-live.mjs --wait 300      # 最多等 300 秒，轮询到全绿为止
 *   node _tools/verify-live.mjs --base https://example.com
 *
 * 和 _tools/check.mjs 的分工：
 *   check.mjs       查仓库内部（模板、front matter、站内链接），不需要联网；
 *   verify-live.mjs 查线上真实状态（部署生效没有、sitemap 有没有漏页、404 页还正常吗），必须联网。
 *
 * 退出码：全绿 0，有失败 1。CI 直接用它当闸门。
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => join(ROOT, p);

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = argOf('--base', 'https://wangyuyue.xyz').replace(/\/+$/, '');
const WAIT = Number(argOf('--wait', '0'));
const UA = { 'user-agent': 'my-website-verify-live/1.0' };

/** 只对主站做巡检；别的域名不要误伤 */
const HOST = new URL(BASE).host;

let failures = [];
const pass = (m) => console.log('  PASS  ' + m);
const fail = (m) => { failures.push(m); console.log('  FAIL  ' + m); };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function httpGet(url, method = 'GET') {
  const res = await fetch(url, { method, headers: UA, redirect: 'follow' });
  const body = method === 'HEAD' ? '' : await res.text();
  return { status: res.status, body };
}

/** 本地有哪些页面「应该」在 sitemap 里 */
function localPages() {
  const guides = readdirSync(rel('_guides'))
    .filter((n) => n.endsWith('.md'))
    .map((n) => {
      const src = readFileSync(rel('_guides/' + n), 'utf8');
      const title = (src.split('---')[1] || '').match(/^\s*title:\s*"?(.*?)"?\s*$/m);
      return { slug: n.replace(/\.md$/, ''), title: title ? title[1] : '' };
    });

  // 静态页没有 front matter，Jekyll 不会自动把它们写进 sitemap，必须手动列出来
  const staticPages = ['/updates/', '/tools/qiniu/'];
  return { guides, staticPages };
}

/** 读 _data/projects.yml，拿到首页应该出现的项目卡（不引 YAML 依赖，按块切） */
function projectCards() {
  const src = readFileSync(rel('_data/projects.yml'), 'utf8');
  return src
    .split(/^-\s+/m)
    .slice(1)
    .map((chunk) => ({
      name: (chunk.match(/^name:\s*"([^"]*)"/m) || [])[1] || '',
      desc: (chunk.match(/^description:\s*"([^"]*)"/m) || [])[1] || '',
      repo: (chunk.match(/^repo:\s*"([^"]*)"/m) || [])[1] || '',
    }))
    .filter((c) => c.name);
}

async function runChecks() {
  failures = [];
  const { guides, staticPages } = localPages();

  /* 1. sitemap 本身 */
  console.log('== sitemap ==');
  let locs = [];
  try {
    const sm = await httpGet(BASE + '/sitemap.xml');
    if (sm.status !== 200) fail(`/sitemap.xml 返回 ${sm.status}`);
    else {
      locs = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      if (locs.length === 0) fail('/sitemap.xml 里一条 loc 都没有');
      else pass(`/sitemap.xml 可访问，共 ${locs.length} 条`);
    }
  } catch (err) {
    fail('/sitemap.xml 请求失败：' + err.message);
  }

  /* 2. sitemap 里的每一条都要真的能打开 */
  console.log('== 逐条探测 ==');
  for (const loc of locs) {
    if (new URL(loc).host !== HOST) {
      pass(`跳过外部域名 ${loc}`);
      continue;
    }
    try {
      const r = await httpGet(loc);
      const hasTitle = /<title>[^<]/.test(r.body);
      if (r.status !== 200) fail(`${r.status}  ${loc}`);
      else if (!hasTitle) fail(`200 但没有 <title>  ${loc}`);
      else pass(`200  ${loc}`);
    } catch (err) {
      fail(`${loc} 请求失败：${err.message}`);
    }
  }

  /* 3. 覆盖检查：本地有的页面，sitemap 里必须有 */
  console.log('== sitemap 覆盖 ==');
  const locSet = new Set(locs.map((u) => u.replace(/\/+$/, '') + '/'));
  for (const g of guides) {
    const want = `${BASE}/guides/${g.slug}/`;
    if (!locSet.has(want)) fail(`指南 ${g.slug} 不在 sitemap 里：${want}`);
  }
  for (const p of staticPages) {
    if (!locSet.has(BASE + p)) fail(`静态页 ${p} 不在 sitemap 里`);
  }
  if (failures.length === 0) pass(`本地 ${guides.length} 篇指南 + ${staticPages.length} 个静态页都在 sitemap 里`);

  /* 4. 内容断言：不只是 200，还得是「新的那一版」 */
  console.log('== 内容断言 ==');
  try {
    const home = await httpGet(BASE + '/');
    if (home.body.includes('技术文章')) pass('首页含导航文案「技术文章」');
    else fail('首页找不到导航文案「技术文章」，可能不是最新版');

    const idx = await httpGet(BASE + '/guides/');
    const missing = guides.filter((g) => g.title && !idx.body.includes(g.title));
    if (missing.length === 0) pass(`/guides/ 列出了全部 ${guides.length} 篇指南标题`);
    else fail('/guides/ 缺少这些指南的标题：' + missing.map((g) => g.title).join('、'));

    /* 项目卡来自 _data/projects.yml：改数据不等于改模板，
       所以断言必须从数据里读，不能写死。 */
    const cards = projectCards();
    const badCards = cards.filter((c) => {
      // 描述整句都要对上：截前几个字的话，"Jekyll + Cl" 这种前缀新旧版本都有，等于没断言
      const okName = !c.name || home.body.includes(c.name);
      const okDesc = !c.desc || home.body.includes(c.desc);
      const okRepo = !c.repo || home.body.includes(c.repo.replace(/^https?:\/\//, ''));
      return !(okName && okDesc && okRepo);
    });
    if (cards.length === 0) fail('_data/projects.yml 里一个项目都没解析到');
    else if (badCards.length === 0) pass(`首页与 projects.yml 的 ${cards.length} 张项目卡一致`);
    else fail('首页项目卡和数据不一致：' + badCards.map((c) => c.name).join('、'));
  } catch (err) {
    fail('内容断言请求失败：' + err.message);
  }

  /* 5. 404 页不能被部署搞坏 */
  console.log('== 404 ==');
  try {
    const r = await httpGet(`${BASE}/__verify_live_${Date.now()}/`);
    if (r.status === 404) pass('不存在的地址返回 404');
    else fail(`不存在的地址返回 ${r.status}，应为 404`);
  } catch (err) {
    fail('404 探测失败：' + err.message);
  }
}

(async () => {
  const deadline = Date.now() + WAIT * 1000;
  for (let round = 1; ; round++) {
    console.log(`\n== 第 ${round} 轮 · ${BASE} · ${new Date().toLocaleTimeString('zh-CN', { hour12: false })} ==`);
    await runChecks();

    console.log('');
    if (failures.length === 0) {
      console.log('全部通过');
      process.exit(0);
    }
    console.log(`${failures.length} 项失败`);
    if (Date.now() >= deadline) {
      // 等超时了还是失败，把最后的状态带出去
      process.exit(1);
    }
    console.log(`还没好，15 秒后重试（剩余 ${Math.max(0, Math.round((deadline - Date.now()) / 1000))} 秒）`);
    await sleep(15000);
  }
})();
