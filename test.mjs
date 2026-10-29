import http from 'node:http'; import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict'; import { JSDOM } from 'jsdom';
// 1) Lógica pura del CSV
const ctx = vm.createContext({}); vm.runInContext(fs.readFileSync('core.js', 'utf8'), ctx); const { toCSV, fromCSV, merge, fresh } = ctx.CORE;
const S0 = fresh(); S0.company = 'Mi "Tienda"; Ltda'; S0.accounts = [{ id: 'a1', name: 'Caja principal', type: 'caja', opening: 0 }];
S0.movements = [{ id: 'm1', kind: 'income', date: '2026-10-28', desc: '=HYPERLINK("x")', cat: 'Ventas', acc: 'a1', amount: 5, method: 'efectivo', ref: '', status: 'active', tid: null }];
const csv0 = toCSV(S0), r0 = fromCSV(csv0); assert.equal(JSON.stringify(r0.S.movements), JSON.stringify(S0.movements)); assert.ok(csv0.includes("'=HYPERLINK"));
assert.ok(fromCSV('hola').err); const L = fresh(); merge(L, r0.S); merge(L, r0.S); assert.equal(L.movements.length, 1);
// 2) Interfaz real en jsdom sirviendo los archivos como lo haría Vercel
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, s) => { const f = q.url === '/' ? 'index.html' : q.url.slice(1); if (!fs.existsSync(f)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': mime[f.slice(f.lastIndexOf('.'))] }); s.end(fs.readFileSync(f)); }).listen(0);
const url = `http://localhost:${srv.address().port}/`;
const open = async () => { const d = await JSDOM.fromURL(url, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true }); await new Promise(r => d.window.addEventListener('load', r)); d.window.confirm = () => true; return d; };
const submit = (w, sel, vals) => { const f = w.document.querySelector(sel); for (const [k, v] of Object.entries(vals)) f.elements[k].value = v; f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); };
const go = (w, v) => w.document.querySelector(`[data-v="${v}"]`).dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const txt = w => w.document.body.textContent.replace(/\s+/g, ' ');
const D1 = await open(), w = D1.window; assert.ok(txt(w).includes('Bienvenido'));
submit(w, '[data-f=setup]', { n: 'Café Prueba' }); assert.ok(txt(w).includes('Café Prueba') && txt(w).includes('Aún no hay movimientos'));
go(w, 'ingresos'); submit(w, '[data-f=mov]', { date: '2026-10-28', amount: '100000', desc: 'Venta mostrador', cat: 'Ventas', method: 'efectivo', ref: '' });
go(w, 'gastos'); submit(w, '[data-f=mov]', { date: '2026-10-28', amount: '30000', desc: 'Arriendo parcial', cat: 'Arriendo', method: 'efectivo', ref: '' });
go(w, 'cajas'); submit(w, '[data-f=acc]', { n: 'Banco', t: 'banco', o: '0' });
const ids = [...w.document.querySelectorAll('[data-f=tr] select[name=a] option')].map(o => o.value);
submit(w, '[data-f=tr]', { a: ids[0], b: ids[1], v: '20000', d: '2026-10-28' });
w.document.querySelector('[data-f=tr] input[name=d]'); assert.ok(txt(w).includes('$50.000 COP') && txt(w).includes('$20.000 COP'), 'saldos de cajas: 50.000 y 20.000');
go(w, 'inicio'); submit(w, '[data-f=range]', { f: '2026-10-01', t: '2026-10-31' });
const t1 = txt(w); assert.ok(t1.includes('$100.000 COP') && t1.includes('$30.000 COP') && t1.includes('$70.000 COP'), 'dashboard: ingresos, gastos, resultado/disponible'); assert.ok(!t1.includes('$20.000 COP Gastos'), 'transferencia no es gasto');
const csv = w.eval('toCSV(S)'); assert.ok(csv.startsWith('\uFEFF'));
go(w, 'gastos'); w.document.querySelector('[data-void]').dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); go(w, 'inicio'); assert.ok(!txt(w).includes('Arriendo'), 'gasto anulado deja de contar');
// 3) Segundo "dispositivo": navegador limpio importa el CSV (Reemplazar) y luego combina de nuevo
const D2 = await open(), w2 = D2.window; const inp = w2.document.querySelector('[data-imp]');
const pick = async (win, el, content) => { Object.defineProperty(el, 'files', { value: [new win.File([content], 'x.csv')], configurable: true }); el.dispatchEvent(new win.Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 200)); };
await pick(w2, inp, csv); assert.ok(txt(w2).includes('Café Prueba')); go(w2, 'cajas'); assert.ok(txt(w2).includes('$50.000 COP') && txt(w2).includes('$20.000 COP'), 'mismos saldos en el segundo dispositivo');
go(w2, 'datos'); await pick(w2, w2.document.querySelector('[data-imp]'), csv); assert.equal(w2.eval('S.movements.length'), 4, 'combinar el mismo CSV no duplica');
assert.equal(w2.eval('document.querySelector("meta[http-equiv]")'), null);
console.log('✔ pruebas del sitio local pasaron'); srv.close(); D1.window.close(); D2.window.close();
