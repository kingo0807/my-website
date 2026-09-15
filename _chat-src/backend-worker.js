/**
 * 家庭 AI 助手 · 后端（Cloudflare Worker）
 *
 * 作用：把浏览器的请求转发给 DeepSeek，并在服务器端补上 API Key。
 * Key 永远不会进入浏览器，所以网页端不需要填任何东西。
 *
 * 路由：
 *   POST /chat      转发到 /chat/completions，流式响应原样透传
 *   GET  /balance   查询账户余额
 *
 * 需要配置的环境变量（用 wrangler secret put 设置，不要写在这个文件里）：
 *   DEEPSEEK_API_KEY  必填，sk- 开头的钥匙
 *   FAMILY_CODE       选填，设了就要求前端带同一个口令
 */

const DEEPSEEK = 'https://api.deepseek.com';
const ALLOWED_ORIGINS = ['https://wangyuyue.xyz', 'https://www.wangyuyue.xyz'];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allow = ALLOWED_ORIGINS.indexOf(origin) >= 0 ? origin : ALLOWED_ORIGINS[0];
    const cors = {
      'Access-Control-Allow-Origin': allow,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, x-family-code',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    const fail = (status, message) => new Response(JSON.stringify({ error: { message: message } }), {
      status: status,
      headers: Object.assign({ 'content-type': 'application/json' }, cors),
    });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';

    if (env.FAMILY_CODE && request.headers.get('x-family-code') !== env.FAMILY_CODE) {
      return fail(401, '家庭口令不对');
    }
    if (!env.DEEPSEEK_API_KEY) return fail(500, '后端还没有配置 DEEPSEEK_API_KEY');

    if (request.method === 'POST' && path === '/chat') {
      const upstream = await fetch(DEEPSEEK + '/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer ' + env.DEEPSEEK_API_KEY,
        },
        body: await request.text(),
      });
      const headers = new Headers(cors);
      headers.set('content-type', upstream.headers.get('content-type') || 'application/json');
      headers.set('cache-control', 'no-store');
      return new Response(upstream.body, { status: upstream.status, headers: headers });
    }

    if (request.method === 'GET' && path === '/balance') {
      const upstream = await fetch(DEEPSEEK + '/user/balance', {
        headers: { 'authorization': 'Bearer ' + env.DEEPSEEK_API_KEY },
      });
      const headers = new Headers(cors);
      headers.set('content-type', 'application/json; charset=utf-8');
      headers.set('cache-control', 'no-store');
      return new Response(await upstream.text(), { status: upstream.status, headers: headers });
    }

    return fail(404, 'not found');
  },
};
