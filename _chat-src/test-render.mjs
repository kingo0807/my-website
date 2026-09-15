import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const s = html.indexOf('<script>') + '<script>'.length;
const e = html.lastIndexOf('</script>');
const js = html.slice(s, e);

// 原样抽出页面里真正会执行的两个函数（连续代码段，无重复定义）
const from = js.indexOf('function escapeHtml(s)');
const to = js.indexOf('function nearBottom()');
if (from < 0 || to < 0 || to <= from) throw new Error('无法定位函数片段');
const code = js.slice(from, to);
const { renderMarkdown } = new Function(code + '; return { renderMarkdown };')();

let pass = 0, fail = 0;
function check(name, actual, mustInclude, mustExclude) {
  const ok = mustInclude.every(t => actual.includes(t)) && (mustExclude || []).every(t => !actual.includes(t));
  if (ok) { pass++; console.log('  PASS  ' + name); }
  else {
    fail++;
    console.log('  FAIL  ' + name);
    console.log('        实际输出: ' + JSON.stringify(actual.slice(0, 220)));
  }
}

console.log('== Markdown 渲染 ==');
check('标题', renderMarkdown('# 标题'), ['<h1>标题</h1>']);
check('无序列表', renderMarkdown('- 甲\n- 乙'), ['<ul>', '<li>甲</li>', '<li>乙</li>']);
check('有序列表', renderMarkdown('1. 甲\n2. 乙'), ['<ol>', '<li>甲</li>']);
check('加粗与斜体', renderMarkdown('这是**粗**和*斜*'), ['<strong>粗</strong>', '<em>斜</em>']);
check('行内代码', renderMarkdown('用 \`npm i\` 安装'), ['<code>npm i</code>']);
check('引用', renderMarkdown('> 引用内容'), ['<blockquote>引用内容</blockquote>']);
check('段落换行', renderMarkdown('第一行\n第二行'), ['<p>第一行<br>第二行</p>']);

console.log('== 代码块 ==');
check('围栏代码块', renderMarkdown('\`\`\`js\nconst a = 1;\n\`\`\`'), ['<pre><code>const a = 1;', '</code></pre>']);
check('流式中断的半截代码块', renderMarkdown('说明\n\`\`\`python\nprint(1)'), ['<pre><code>print(1)']);

console.log('== XSS 防护 ==');
check('HTML 标签被转义', renderMarkdown('<script>alert(1)</script>'), ['&lt;script&gt;'], ['<script>']);
check('事件属性被转义', renderMarkdown('<img src=x onerror=alert(1)>'), [], ['<img']);
check('javascript: 链接不生效', renderMarkdown('[点我](javascript:alert(1))'), [], ['<a href="javascript']);
check('代码块内 HTML 也转义', renderMarkdown('\`\`\`\n<b>x</b>\n\`\`\`'), ['&lt;b&gt;'], ['<b>x</b>']);
check('双引号被转义（防止属性逃逸）', renderMarkdown('a"onmouseover="x'), ['&quot;']);

console.log('== 正常链接 ==');
check('https 链接保留', renderMarkdown('[官网](https://www.deepseek.com)'), ['<a href="https://www.deepseek.com"', 'target="_blank"', 'rel="noopener noreferrer"']);

console.log('');
console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exitCode = fail === 0 ? 0 : 1;
