/**
 * 家庭 AI 助手 · 后端（Cloudflare Worker）
 *
 * 作用：把浏览器的请求转发给 DeepSeek，并在服务器端补上 API Key。
 * Key 永远不会进入浏览器，所以网页端不需要填任何东西。
 *
 * 路由：
 *   POST /chat      转发到 /chat/completions，流式响应原样透传
 *   GET  /balance   查询账户余额
 *   POST /asr       录音转文字（用绑定的 Workers AI Whisper）
 *
 * 需要配置的环境变量（用 wrangler secret put 设置，不要写在这个文件里）：
 *   DEEPSEEK_API_KEY  必填，sk- 开头的钥匙
 *   FAMILY_CODE       选填，设了就要求前端带同一个口令
 *   DAILY_LIMIT       选填，每台设备每天最多问几次，默认 200，填 0 表示不限
 *
 * 语音识别用的是 Workers AI 绑定，写在 wrangler.toml 里，不是 secret：
 *   [ai]
 *   binding = "AI"
 * 免费计划每天送 10,000 Neurons；本模型约 46.6 Neurons/音频分钟，
 * 相当于每天约 214 分钟免费，超出部分 Cloudflare 会直接报错而不会产生费用。
 */

const DEEPSEEK = 'https://api.deepseek.com';
const ALLOWED_ORIGINS = ['https://wangyuyue.xyz', 'https://www.wangyuyue.xyz'];
const DEFAULT_DAILY_LIMIT = 200;
const ASR_MODEL = '@cf/openai/whisper-large-v3-turbo';
const ASR_MAX_BYTES = 8 * 1024 * 1024;

/* 每日额度：用 Workers 自带的 Cache API 记账，不需要额外配置。
   注意：缓存按 Cloudflare 机房各自保存，所以这是"大致额度"而不是精确计数；
   要收紧到全局口径，把这段换成 KV binding 即可，返回结构不用变。 */
async function countToday(env, request) {
  const limit = env.DAILY_LIMIT === undefined ? DEFAULT_DAILY_LIMIT : Number(env.DAILY_LIMIT);
  if (!Number.isFinite(limit) || limit <= 0) return { limited: false, limit: 0, used: 0, remaining: 0 };
  const day = new Date().toISOString().slice(0, 10);
  const who = request.headers.get('cf-connecting-ip') || 'unknown';
  const key = new Request('https://quota.internal/' + day + '/' + encodeURIComponent(who), { method: 'GET' });
  let used = 0;
  try {
    const hit = await caches.default.match(key);
    if (hit) used = Number(await hit.text()) || 0;
    const next = used + 1;
    await caches.default.put(key, new Response(String(next), {
      headers: { 'cache-control': 'max-age=86400' },
    }));
    return { limited: next > limit, limit: limit, used: next, remaining: Math.max(0, limit - next) };
  } catch (err) {
    /* 记账失败不能把家里人挡在门外：放行。 */
    return { limited: false, limit: limit, used: used, remaining: 0 };
  }
}

/* 音频转 base64：某些模型输入只认 base64，作为数组形式的兜底。 */
function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allow = ALLOWED_ORIGINS.indexOf(origin) >= 0 ? origin : ALLOWED_ORIGINS[0];
    const cors = {
      'Access-Control-Allow-Origin': allow,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, x-family-code',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Expose-Headers': 'X-Quota-Remaining',
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
      const quota = await countToday(env, request);
      if (quota.limited) {
        return fail(429, '今天的用量到上限了（每天 ' + quota.limit + ' 次），明天再来吧');
      }
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
      if (quota.limit) headers.set('X-Quota-Remaining', String(quota.remaining));
      return new Response(upstream.body, { status: upstream.status, headers: headers });
    }

    /* 录音转文字：前端传 16kHz 单声道 WAV，这里直接喂给 Workers AI。 */
    if (request.method === 'POST' && path === '/asr') {
      if (!env.AI) return fail(501, '后端还没开启语音识别：wrangler.toml 里缺少 [ai] binding = "AI"');
      const quota = await countToday(env, request);
      if (quota.limited) {
        return fail(429, '今天的用量到上限了（每天 ' + quota.limit + ' 次），明天再来吧');
      }
      const bytes = new Uint8Array(await request.arrayBuffer());
      if (!bytes.length) return fail(400, '没有收到音频');
      if (bytes.length > ASR_MAX_BYTES) return fail(413, '录音太长了，控制在 1 分钟以内');

      let out;
      try {
        out = await env.AI.run(ASR_MODEL, {
          audio: Array.from(bytes),
          language: 'zh',
          task: 'transcribe',
          vad_filter: true,
        });
      } catch (err1) {
        /* 数组形式不被接受时，退一步用 base64 再试一次。 */
        try {
          out = await env.AI.run(ASR_MODEL, {
            audio: toBase64(bytes),
            language: 'zh',
            task: 'transcribe',
            vad_filter: true,
          });
        } catch (err2) {
          return fail(502, '语音识别失败：' + ((err2 && err2.message) || err2));
        }
      }
      const text = (out && (out.text || (out.transcription_info && out.transcription_info.text))) || '';
      const headers = new Headers(cors);
      headers.set('content-type', 'application/json; charset=utf-8');
      headers.set('cache-control', 'no-store');
      if (quota.limit) headers.set('X-Quota-Remaining', String(quota.remaining));
      return new Response(JSON.stringify({ text: String(text) }), { status: 200, headers: headers });
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
