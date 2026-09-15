/**
 * 家庭 AI 助手 · 后端（自己服务器上的 Node 版本，18+，不需要装任何依赖）
 *
 * 路由：
 *   POST /chat      转发到 DeepSeek 的 /chat/completions，流式响应原样透传
 *   GET  /balance   查询账户余额
 *
 * 用法：
 *   DEEPSEEK_API_KEY=sk-xxx FAMILY_CODE=你的口令 node server.mjs
 * 然后用 Nginx / 宝塔反代到 https://你的子域名（必须是 HTTPS，见下方说明）。
 */

import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const KEY = process.env.DEEPSEEK_API_KEY || '';
const FAMILY_CODE = process.env.FAMILY_CODE || '';
const ALLOWED = (process.env.ALLOWED_ORIGIN || 'https://wangyuyue.xyz').split(',');
const DEEPSEEK = 'https://api.deepseek.com';

createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const allow = ALLOWED.indexOf(origin) >= 0 ? origin : ALLOWED[0];
  const cors = {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-family-code',
    'Vary': 'Origin',
  };
  const fail = (status, message) => {
    res.writeHead(status, Object.assign({ 'content-type': 'application/json' }, cors));
    res.end(JSON.stringify({ error: { message: message } }));
  };

  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }

  const path = (req.url || '/').split('?')[0].replace(/\/+$/, '') || '/';

  if (FAMILY_CODE && req.headers['x-family-code'] !== FAMILY_CODE) return fail(401, '家庭口令不对');
  if (!KEY) return fail(500, '还没有配置 DEEPSEEK_API_KEY');

  // 对话：原样转发，流式响应边收边发
  if (req.method === 'POST' && path === '/chat') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let upstream;
    try {
      upstream = await fetch(DEEPSEEK + '/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + KEY },
        body: Buffer.concat(chunks),
      });
    } catch (err) {
      return fail(502, '连不上 DeepSeek：' + err.message);
    }
    res.writeHead(upstream.status, Object.assign({
      'content-type': upstream.headers.get('content-type') || 'application/json',
      'cache-control': 'no-store',
    }, cors));
    if (upstream.body) {
      const reader = upstream.body.getReader();
      for (;;) {
        const r = await reader.read();
        if (r.done) break;
        res.write(Buffer.from(r.value));
      }
    }
    res.end();
    return;
  }

  // 余额：一次性查询
  if (req.method === 'GET' && path === '/balance') {
    let upstream;
    try {
      upstream = await fetch(DEEPSEEK + '/user/balance', {
        headers: { authorization: 'Bearer ' + KEY },
      });
    } catch (err) {
      return fail(502, '连不上 DeepSeek：' + err.message);
    }
    const body = await upstream.text();
    res.writeHead(upstream.status, Object.assign({
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    }, cors));
    res.end(body);
    return;
  }

  return fail(404, 'not found');
}).listen(PORT, '0.0.0.0', () => {
  console.log('家庭助手后端已启动: http://0.0.0.0:' + PORT);
  console.log('路由: POST /chat   GET /balance');
  console.log('家庭口令: ' + (FAMILY_CODE ? '已开启' : '未设置（任何人拿到地址都能用）'));
});
