/* 孩子数学学习规划.html 离线验证脚本
 * 用法：node validate.js
 * 三重验证：① <script> 语法 ② DOM 桩跑完整运行时 ③ STAGES/PITFALLS 数据结构
 */
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const html = fs.readFileSync(path.join(dir, '孩子数学学习规划.html'), 'utf8');
const md = fs.readFileSync(path.join(dir, '孩子数学学习规划.md'), 'utf8');

let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✘ ') + msg); if (!cond) fail++; };

/* ---- 1. 提取 <script> 并做语法检查（只解析不执行） ---- */
console.log('== 1. JS 语法检查 ==');
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];
try { new Function(src); ok(true, '语法解析通过'); }
catch (e) { ok(false, '语法错误: ' + e.message); process.exit(1); }

/* ---- 2. DOM 桩跑完整运行时 ---- */
console.log('== 2. DOM 桩运行时 ==');
function makeEl() {
  const el = {
    children: [], dataset: {}, style: { setProperty() {}, },
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false } },
    appendChild(c) { this.children.push(c); },
    addEventListener() {}, querySelector() { return null }, querySelectorAll() { return [] },
    closest() { return null }, replaceWith() {}, setAttribute() {},
    textContent: '', value: '', checked: false, onclick: null, offsetTop: 0,
  };
  Object.defineProperty(el, 'innerHTML', { get() { return this._h || '' }, set(v) { this._h = v } });
  return el;
}
const store = {};
global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v) } };
global.history = { replaceState() {} };
global.location = { hash: '' };
global.window = { addEventListener() {}, scrollTo() {}, print() {} };
global.confirm = () => true;
const byId = {};
global.document = {
  getElementById(id) { return byId[id] || (byId[id] = makeEl()); },
  createElement() { return makeEl(); },
  querySelector() { return makeEl(); }, querySelectorAll() { return [] },
  addEventListener() {},
};
let STAGES, PITFALLS;
try {
  const wrapped = src + '\n;STAGES;PITFALLS;';
  const fn = new Function('document', 'window', 'localStorage', 'history', 'location', 'confirm', wrapped + ' return {STAGES,PITFALLS};');
  const out = fn(global.document, global.window, global.localStorage, global.history, global.location, global.confirm);
  STAGES = out.STAGES; PITFALLS = out.PITFALLS;
  ok(true, '完整脚本在 DOM 桩下运行通过');
} catch (e) { ok(false, '运行时错误: ' + e.message); process.exit(1); }

/* ---- 3. 数据结构校验 ---- */
console.log('== 3. 数据结构校验 ==');
ok(STAGES.length === 10, `STAGES 面板数 = ${STAGES.length}（期望 10：总览/幼/小低/小中/小高/初中/高中/兴趣/节点危险期/附录）`);
const ids = STAGES.map(s => s.id);
ok(new Set(ids).size === ids.length, '面板 id 无重复: ' + ids.join(','));
ok(ids.indexOf('milestone') === 8 && ids[9] === 'appendix', 'milestone 位于 interest 之后、appendix 之前');

let checkTotal = 0, structBad = [];
STAGES.forEach(s => {
  if (!s.id || !s.tab || !s.color || !s.dot || !s.age || !Array.isArray(s.sections)) structBad.push(s.id + ':meta');
  s.sections.forEach((sec, i) => {
    if (sec.kind === 'table') {
      (sec.rows || []).forEach((r, ri) => { if (r.length !== sec.headers.length) structBad.push(`${s.id}[${i}].row${ri}`); });
    }
    if (sec.kind === 'checklist') checkTotal += sec.items.length;
    if (sec.kind === 'books') (sec.books || []).forEach(b => { if (!b.slug || !b.title) structBad.push(s.id + ':book'); });
  });
});
ok(structBad.length === 0, '全部 section 结构合法' + (structBad.length ? ' ✘ ' + structBad.join(',') : ''));
ok(checkTotal === 21, `打卡项总数 = ${checkTotal}（期望 21，milestone 无打卡）`);
ok(PITFALLS.length === 6 && PITFALLS.every(p => p.length === 3), 'PITFALLS 6 组、每条 3 字段');

/* milestone 面板专项 */
const ms = STAGES.find(s => s.id === 'milestone');
ok(ms && ms.noCheck === true, 'milestone 标记 noCheck（不进打卡统计）');
ok(ms.sections.length === 12, `milestone sections = ${ms.sections.length}（期望 12：1 总览+4 节点+1 全景+5 行动+1 原则）`);
const danger = ms.sections.filter(s => s.title && s.title.startsWith('危险期'));
ok(danger.length === 5, `危险期行动卡 = ${danger.length}（期望 5）`);
ok(danger.every(s => s.rows.length === 5 && s.rows[0][0] === '为什么会掉队' && s.rows[4][0] === '何时求助'), '每张行动卡含 为什么会掉队/预警信号/家长怎么做/不要做/何时求助 五行');

/* ---- 4. md ↔ HTML 同源抽查 ---- */
console.log('== 4. md ↔ HTML 一致性抽查 ==');
ok(md.includes('## 八、关键节点与危险期'), 'md 含第八章标题');
ok(md.includes('危险期 ③：初二'), 'md 含危险期③');
ok(md.includes('6 月 7~8 日'), 'md 含高考时间');
ok(html.includes("id:'milestone'"), 'HTML 含 milestone 面板');
['幼升小 · 大班这一年', '五个数学"危险期"全景', '设而不求', '退回最近一个扎实的地方'].forEach(k => {
  ok(md.includes(k) && html.includes(k), `两端均含「${k}」`);
});
/* 附录 D 邪修口诀 */
ok(md.includes('## 附录 D：易错难记点的"邪修"记忆法'), 'md 含附录 D 标题');
const apx = STAGES.find(s => s.id === 'appendix');
ok(apx.sections.length === 12, `appendix sections = ${apx.sections.length}（期望 12：A表/B易错/C建议/D纪律+4组口诀+4组例题演练）`);
['五五凑成一双手', '同头无除商八九', '延长中线等中线', '一二三来三二一', '山巅一寺一壶酒', '想邻居'].forEach(k => {
  ok(md.includes(k) && html.includes(k), `两端均含口诀「${k}」`);
});
/* v2.1 新增 9 条口诀（配 v2.0 新增易错点） */
['余数是小弟，除数是大佬', '中间有 0 读一个', '四年一闰，百年不闰，四百年再闰', '面积进率 100', '先横后竖，先列后行', '1 升 = 1 立方分米', '留弧、留点、留连线', '指数 = 整数位数 - 1', '已知两边一对角，可能两解要小心'].forEach(k => {
  ok(md.includes(k) && html.includes(k), `两端均含 v2.1 口诀「${k}」`);
});
/* 附录 D 例题演练专项 */
const exSecs = apx.sections.filter(s => s.kind === 'examples');
ok(exSecs.length === 4, `附录 D 例题版块 = ${exSecs.length}（期望 4：D1~D4）`);
const exCount = exSecs.reduce((n, s) => n + (s.items || []).length, 0);
ok(exCount === 52, `例题覆盖方法数 = ${exCount}（期望 52：D1 10 + D2 16 + D3 12 + D4 14）`);
const exBad = [];
exSecs.forEach(s => (s.items || []).forEach(it => {
  if (!it.name || !it.point || !Array.isArray(it.ex) || it.ex.length !== 2) exBad.push(`${s.title}:${it.name || '?'} 题数`);
  else it.ex.forEach((e, i) => { if (!e.q || !e.use || !e.ans) exBad.push(`${it.name}.题${i + 1} 字段缺`); });
}));
ok(exBad.length === 0, '每法恰好 2 题且 题/用法/答案 齐全' + (exBad.length ? ' ✘ ' + exBad.slice(0, 4).join(',') : ''));
['8 + 5 = ?', '1:500000', '48 种', '尔乐苦煞吾'].forEach(k => {
  ok(md.includes(k) && html.includes(k), `两端均含例题「${k}」`);
});
/* v2.1 新增 18 道例题抽查 */
['23 ÷ 4 = 4 余 7', '五千零八', '1900÷400', '50000 平方米', '(3, 5)', '2000 升', '留弧、留点、留连线', '3.5×10⁻⁴', '两解都成立'].forEach(k => {
  ok(md.includes(k) && html.includes(k), `两端均含 v2.1 例题「${k}」`);
});
const broken = (md.match(/"\s*\+\s*url\s*\+"/g) || []).length;
ok(broken === 0, `md 残留坏链接 "[京东]("+url+")" = ${broken} 处`);

/* ---- 5. 知识覆盖补漏抽查（v2.0） ---- */
console.log('== 5. 知识覆盖补漏抽查（v2.0） ==');
const cov = [
  ['万以内数的认识', '小学低年级·数系衔接'],
  ['有余数的除法', '小学低年级·有余数除法'],
  ['克、千克', '小学低年级·质量单位'],
  ['角的初步认识', '小学低年级·角的初步'],
  ['年、月、日与 24 时计时法', '小学中年级·年月日'],
  ['位置与方向', '小学中年级·方位'],
  ['小数的意义与性质、小数加减法', '小学高年级·小数意义'],
  ['数对与位置', '小学高年级·数对'],
  ['科学记数法', '初中·科学记数法'],
  ['命题与证明', '初中·命题与证明'],
  ['尺规作图', '初中·尺规作图'],
  ['解三角形', '高中·解三角形'],
  ['数学归纳法', '高中·数学归纳法'],
  ['幂函数、零点与二分法', '高中·幂函数与零点'],
  ['独立性检验', '高中·独立性检验'],
  ['全称量词与存在量词', '高中·量词'],
];
cov.forEach(([k, label]) => ok(md.includes(k) && html.includes(k), `两端均含「${k}」（${label}）`));
const pit = PITFALLS.find(p => p[0] === 'high')[2];
ok(pit.includes('正弦定理多解'), '附录 B 高中行含解三角形多解易错点');

console.log(fail === 0 ? '\n全部验证通过 ✅' : `\n${fail} 项未通过 ❌`);
process.exit(fail === 0 ? 0 : 1);
