import { readFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';

const html = readFileSync('index.html', 'utf8');
const s = html.indexOf('<script>') + '<script>'.length;
const e = html.lastIndexOf('</script>');
const js = html.slice(s, e);

let pass = 0, fail = 0;
function ok(name) { pass++; console.log('  PASS  ' + name); }
function bad(name, extra) { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
function check(name, actual, mustInclude, mustExclude) {
  const good = mustInclude.every(t => actual.includes(t)) && (mustExclude || []).every(t => !actual.includes(t));
  if (good) ok(name); else bad(name, JSON.stringify(actual.slice(0, 200)));
}

// ---------- 1. 整体语法 ----------
console.log('== 语法 ==');
try { new Function(js); ok('页面脚本可解析'); }
catch (err) { bad('页面脚本可解析', err.message); }
try { new Function(readFileSync('sw.js', 'utf8')); ok('sw.js 可解析'); }
catch (err) { bad('sw.js 可解析', err.message); }
try { JSON.parse(readFileSync('manifest.json', 'utf8')); ok('manifest.json 合法'); }
catch (err) { bad('manifest.json 合法', err.message); }

const man = JSON.parse(readFileSync('manifest.json', 'utf8'));
check('manifest 有 192 图标', JSON.stringify(man.icons), ['192x192']);
check('manifest 有 maskable 图标', JSON.stringify(man.icons), ['maskable']);

// ---------- 2. 模型名 ----------
console.log('== 模型名 ==');
check('使用 deepseek-flash', js, ['deepseek-flash']);
check('已移除失效模型名 deepseek-chat', js, [], ['deepseek-chat']);
check('已移除失效模型名 deepseek-reasoner', js, [], ['deepseek-reasoner']);
check('发送 thinking 参数', js, ["thinking = { type: state.thinking"]);

// ---------- 3. Markdown / XSS 回归 ----------
const from = js.indexOf('function escapeHtml(s)');
const to = js.indexOf('function nearBottom()');
const code = js.slice(from, to);
const { renderMarkdown } = new Function(code + '; return { renderMarkdown };')();

console.log('== Markdown / XSS ==');
check('标题', renderMarkdown('# 标题'), ['<h1>标题</h1>']);
check('无序列表', renderMarkdown('- 甲\n- 乙'), ['<ul>', '<li>甲</li>']);
check('有序列表', renderMarkdown('1. 甲'), ['<ol>', '<li>甲</li>']);
check('加粗斜体', renderMarkdown('**粗**和*斜*'), ['<strong>粗</strong>', '<em>斜</em>']);
check('行内代码', renderMarkdown('用 \`npm i\` 安装'), ['<code>npm i</code>']);
check('引用块', renderMarkdown('> 引用'), ['<blockquote>引用</blockquote>']);
check('围栏代码块', renderMarkdown('\`\`\`js\nconst a = 1;\n\`\`\`'), ['<pre><code>const a = 1;']);
check('流式半截代码块', renderMarkdown('\`\`\`python\nprint(1)'), ['<pre><code>print(1)']);
check('HTML 转义', renderMarkdown('<script>alert(1)</script>'), ['&lt;script&gt;'], ['<script>']);
check('事件属性转义', renderMarkdown('<img src=x onerror=alert(1)>'), [], ['<img']);
check('javascript: 链接失效', renderMarkdown('[点](javascript:alert(1))'), [], ['<a href="javascript']);
check('正常链接保留', renderMarkdown('[官网](https://www.deepseek.com)'), ['rel="noopener noreferrer"']);

// ---------- 4. docx 解析（真实 ZIP，真实 deflate） ----------
const docxFrom = js.indexOf('function readZipEntry(bytes, wanted)');
const docxTo = js.indexOf('function isImageFile(file)');
const docxCode = js.slice(docxFrom, docxTo);
const { readZipEntry, xmlToText } = new Function(docxCode + '; return { readZipEntry, xmlToText };')();

function buildZip(entries) {
  const parts = [], central = [];
  let offset = 0;
  for (const en of entries) {
    const nameBuf = Buffer.from(en.name, 'utf8');
    const raw = Buffer.from(en.data, 'utf8');
    const comp = en.method === 8 ? deflateRawSync(raw) : raw;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6);
    local.writeUInt16LE(en.method, 8);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    parts.push(local, nameBuf, comp);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(en.method, 10);
    cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += local.length + nameBuf.length + comp.length;
  }
  const cdBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([Buffer.concat(parts), cdBuf, eocd]));
}

const DOC_XML = '<?xml version="1.0"?><w:document><w:body>'
  + '<w:p><w:r><w:t>第一段话</w:t></w:r></w:p>'
  + '<w:p><w:r><w:t>第二段</w:t></w:r><w:r><w:tab/><w:t>带制表符</w:t></w:r></w:p>'
  + '<w:p><w:r><w:t>符号 &amp; 与 &lt;尖括号&gt;</w:t></w:r></w:p>'
  + '</w:body></w:document>';

console.log('== docx 解析 ==');
try {
  const zip = buildZip([
    { name: '[Content_Types].xml', data: '<Types/>', method: 8 },
    { name: 'word/document.xml', data: DOC_XML, method: 8 },
  ]);
  const bytes = await readZipEntry(zip, 'word/document.xml');
  const text = xmlToText(new TextDecoder('utf-8').decode(bytes));
  check('deflate 压缩的正文能解出', text, ['第一段话', '第二段', '带制表符']);
  check('XML 实体正确还原', text, ['符号 & 与 <尖括号>']);
  check('段落变成换行', text, ['第一段话\n第二段']);
} catch (err) { bad('deflate 压缩的正文能解出', err.message); }

try {
  const zip = buildZip([{ name: 'word/document.xml', data: DOC_XML, method: 0 }]);
  const bytes = await readZipEntry(zip, 'word/document.xml');
  check('未压缩(stored)的正文能解出', new TextDecoder().decode(bytes), ['第一段话']);
} catch (err) { bad('未压缩(stored)的正文能解出', err.message); }

try {
  await readZipEntry(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 'word/document.xml');
  bad('损坏文件应当报错');
} catch (err) { ok('损坏文件正确报错'); }

console.log('');
console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exitCode = fail === 0 ? 0 : 1;
