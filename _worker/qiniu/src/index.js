/**
 * 七牛上传工具的后端（Cloudflare Worker）
 *
 * 只做三件需要密钥的事，文件字节不经过这里（除了"拉取源链接"那一种模式）：
 *   1. 签 uploadToken，交给浏览器直传；
 *   2. 调 CDN 刷新接口；
 *   3. 回读外链做校验（因为浏览器读不到 ETag）。
 *
 * 环境变量（wrangler secret put 或 .dev.vars）：
 *   QN_AK / QN_SK   七牛密钥
 *   QN_BUCKET       空间名，例如 wyy-files
 *   QN_DOMAIN       外链域名，例如 toofb0znl.hn-bkt.clouddn.com
 *   QN_UPLOAD_URL   上传入口，华南-广东是 https://up-z2.qiniup.com（见 kodo/1671 区域表）
 *   TOOL_TOKEN      页面口令，留空则不校验（本机调试可以留空）
 *
 * 依据：
 *   上传凭证   https://developer.qiniu.com/kodo/1208/upload-token
 *   QBox 鉴权  https://developer.qiniu.com/fusion/13360/fusion-api-auth-guide
 *   缓存管理   https://developer.qiniu.com/fusion/13367/fusion-api-cache-management
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type,x-tool-token',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' },
  });

const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

async function hmacSha1(secret, text) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
}

/** 上传凭证：AK:sign:base64url(putPolicy) */
async function uploadToken(env, key, expiresIn = 600) {
  const policy = {
    scope: `${env.QN_BUCKET}:${key}`,
    deadline: Math.floor(Date.now() / 1000) + expiresIn,
    returnBody: '{"key":"$(key)","hash":"$(etag)","size":$(fsize)}',
  };
  const encoded = b64url(new TextEncoder().encode(JSON.stringify(policy)));
  const sign = await hmacSha1(env.QN_SK, encoded);
  return `${env.QN_AK}:${b64url(sign)}:${encoded}`;
}

/**
 * QBox 管理凭证：AK:base64url(hmac_sha1(SK, path+query+"\n"))
 * 注意：只有 Content-Type 为 application/x-www-form-urlencoded 时 body 才参与签名，
 * JSON 请求体一律不进签名串——这是最容易签错的地方。
 */
async function qboxToken(env, pathWithQuery) {
  const sign = await hmacSha1(env.QN_SK, `${pathWithQuery}\n`);
  return `${env.QN_AK}:${b64url(sign)}`;
}

async function qiniuPost(env, path, body) {
  const res = await fetch('https://fusion.qiniuapi.com' + path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'QBox ' + (await qboxToken(env, path)),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { code: res.status, error: text.slice(0, 200) };
  }
  return { status: res.status, data };
}

/** 只允许 http/https 且不能指向内网，避免把 Worker 当成内网探测工具 */
function assertPublicUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error('源链接不是合法 URL');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('只支持 http/https');
  const h = u.hostname.toLowerCase();
  const blocked =
    h === 'localhost' ||
    h === '::1' ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h);
  if (blocked) throw new Error('不允许从内网地址拉取');
  return u;
}

const MAX_PULL_BYTES = 50 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    // 口令（可选）
    if (env.TOOL_TOKEN) {
      const got = request.headers.get('x-tool-token') || url.searchParams.get('token');
      if (got !== env.TOOL_TOKEN) return json({ error: '口令不对' }, 401);
    }

    try {
      // 诊断用：只回长度和首尾字符，不泄露密钥本身
      if (url.pathname === '/api/health') {
        const ak = env.QN_AK || '';
        const sk = env.QN_SK || '';
        return json({
          akSet: !!ak, akLen: ak.length, akHead: ak.slice(0, 2), akTail: ak.slice(-1),
          skSet: !!sk, skLen: sk.length, skHead: sk.slice(0, 2), skTail: sk.slice(-1),
          skHasSpace: /\s/.test(sk),
          bucket: env.QN_BUCKET, domain: env.QN_DOMAIN, uploadUrl: env.QN_UPLOAD_URL,
        });
      }

      if (url.pathname === '/api/token' && request.method === 'POST') {
        const { key } = await request.json();
        if (!key || !/^[\w\-./一-龥]+$/.test(key)) return json({ error: 'key 不合法' }, 400);
        return json({
          token: await uploadToken(env, key),
          uploadUrl: env.QN_UPLOAD_URL || 'https://up-z2.qiniup.com',
          domain: env.QN_DOMAIN,
        });
      }

      if (url.pathname === '/api/refresh' && request.method === 'POST') {
        const { urls } = await request.json();
        if (!Array.isArray(urls) || urls.length === 0) return json({ error: '缺少 urls' }, 400);
        if (urls.length > 20) return json({ error: '单次最多 20 个 URL（官方约束）' }, 400);
        const { status, data } = await qiniuPost(env, '/v2/tune/refresh', { urls });
        return json(data, status);
      }

      if (url.pathname === '/api/refresh/status' && request.method === 'POST') {
        const { requestId } = await request.json();
        if (!requestId) return json({ error: '缺少 requestId' }, 400);
        const { status, data } = await qiniuPost(env, '/v2/tune/refresh/list', { requestId });
        return json(data, status);
      }

      // 回读校验：浏览器读不到 ETag，交给 Worker 读
      if (url.pathname === '/api/check' && request.method === 'GET') {
        const target = url.searchParams.get('url');
        if (!target) return json({ error: '缺少 url' }, 400);
        assertPublicUrl(target);
        const r = await fetch(target + (target.includes('?') ? '&' : '?') + '_t=' + Date.now(), {
          method: 'HEAD',
          cache: 'no-store',
        });
        const h = r.headers;
        return json({
          status: r.status,
          length: h.get('content-length'),
          etag: (h.get('etag') || '').replace(/"/g, ''),
          lastModified: h.get('last-modified'),
          age: h.get('age'),
          cache:
            h.get('x-bdcdn-cache-status') || h.get('x-response-cache') || h.get('x-cache') || '',
        });
      }

      // "直接放链接"：服务端把源文件取回来再传七牛
      // 大文件请走分片上传，这里只覆盖几十 MB 的常见场景
      if (url.pathname === '/api/pull' && request.method === 'POST') {
        const { src, key } = await request.json();
        if (!src || !key) return json({ error: '缺少 src 或 key' }, 400);
        assertPublicUrl(src);

        const srcRes = await fetch(src);
        if (!srcRes.ok) return json({ error: '拉取源文件失败：HTTP ' + srcRes.status }, 502);
        const declared = Number(srcRes.headers.get('content-length') || 0);
        if (declared > MAX_PULL_BYTES) return json({ error: '源文件超过 50MB，请先下载再上传' }, 413);

        const blob = await srcRes.blob();
        if (blob.size > MAX_PULL_BYTES) return json({ error: '源文件超过 50MB，请先下载再上传' }, 413);

        const form = new FormData();
        form.append('token', await uploadToken(env, key));
        form.append('key', key);
        form.append('file', blob, key.split('/').pop());

        const up = await fetch(env.QN_UPLOAD_URL || 'https://up-z2.qiniup.com', {
          method: 'POST',
          body: form,
        });
        const text = await up.text();
        if (!up.ok) return json({ error: '上传失败', detail: text.slice(0, 300) }, 502);
        return json({ ok: true, key, size: blob.size, upstream: JSON.parse(text) });
      }

      return json({ error: '没有这个接口', path: url.pathname }, 404);
    } catch (err) {
      return json({ error: String(err && err.message ? err.message : err) }, 500);
    }
  },
};
