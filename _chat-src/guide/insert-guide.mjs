import { readFileSync, writeFileSync } from 'node:fs';

const GUIDE = 'C:\\Users\\wyy\\Desktop\\域名与网站上线入门指南.md';
const PART = 'C:\\Users\\wyy\\Documents\\phone-ai\\backend-guide.md';

let guide = readFileSync(GUIDE, 'utf8');
const eol = guide.includes('\r\n') ? '\r\n' : '\n';
const part = readFileSync(PART, 'utf8').split('\n').join(eol);
const log = [];
log.push('原文件行数: ' + guide.split('\n').length + '  换行符: ' + (eol === '\r\n' ? 'CRLF' : 'LF'));

// 1) 第三部分插到「## 参考资料」之前
if (guide.includes('第三部分：给静态网站加后端')) {
  log.push('第三部分已存在，跳过');
} else {
  const at = guide.indexOf('## 参考资料');
  if (at < 0) { log.push('!! 找不到 [## 参考资料] 锚点，未插入'); }
  else {
    const lineNo = guide.slice(0, at).split('\n').length;
    guide = guide.slice(0, at) + part + eol + guide.slice(at);
    log.push('第三部分已插入（原第 ' + lineNo + ' 行之前），' + part.split(eol).length + ' 行');
  }
}

// 2) 第 9 节加一句指引
const s9 = '前端代码会被访客下载到浏览器，因此任何密码、Token、API 密钥都不能直接写入网页文件。';
if (guide.includes('见第三部分的无服务器方案')) {
  log.push('第 9 节指引已存在，跳过');
} else if (guide.includes(s9)) {
  guide = guide.replace(s9, s9 + eol + eol + '如果确实需要「隐藏密钥的接口」，又不想自建常驻服务器，见第三部分的无服务器方案。');
  log.push('第 9 节已加指引');
} else {
  log.push('!! 第 9 节锚点没匹配上，跳过');
}

// 3) 补充参考资料
const refAnchor = '- [Ubuntu：更改语言](https://help.ubuntu.com/stable/ubuntu-help/session-language.html.zh-CN)';
const refs = [
  '- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)',
  '- [Wrangler 命令参考](https://developers.cloudflare.com/workers/wrangler/)',
  '- [Cloudflare Workers 自定义域](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)',
  '- [Cloudflare Workers 密钥与环境变量](https://developers.cloudflare.com/workers/configuration/secrets/)',
  '- [MDN：跨源资源共享（CORS）](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS)',
  '- [MDN：混合内容](https://developer.mozilla.org/zh-CN/docs/Web/Security/Mixed_content)',
];
if (guide.includes('Cloudflare Workers 文档')) {
  log.push('参考资料已补充，跳过');
} else if (guide.includes(refAnchor)) {
  guide = guide.replace(refAnchor, refAnchor + eol + refs.join(eol));
  log.push('参考资料已补充 6 条');
} else {
  log.push('!! 参考资料锚点没匹配上，跳过');
}

writeFileSync(GUIDE, guide);
log.push('写入后行数: ' + guide.split('\n').length);
console.log(log.join('\n'));
