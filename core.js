/* ===== NÚCLEO (sin DOM): CSV y fusión de datos ===== */
var CORE=(function(){
const COLS=['tipo','id','fecha','descripcion','categoria','cuenta','valor','metodo','estado','referencia','transferencia_id'];
const K2T={income:'ingreso',expense:'gasto',transfer_in:'transferencia_entrada',transfer_out:'transferencia_salida'},T2K=Object.fromEntries(Object.entries(K2T).map(([a,b])=>[b,a]));
const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'id'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);
const fresh=()=>({company:'',accounts:[],movements:[],lastExport:null});
const cell=v=>{v=String(v??'');if(/^[=+\-@]/.test(v))v="'"+v;return /[;"\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
const uncell=v=>/^'[=+\-@]/.test(v)?v.slice(1):v;
const bal=(S,id)=>{const a=S.accounts.find(x=>x.id===id);return a?a.opening+S.movements.filter(m=>m.acc===id&&m.status==='active').reduce((s,m)=>s+(m.kind==='income'||m.kind==='transfer_in'?m.amount:-m.amount),0):0};
function toCSV(S){
  const name=id=>S.accounts.find(a=>a.id===id)?.name||'';
  const rows=[COLS,['empresa','','',S.company,'','','','','','','']];
  S.accounts.forEach(a=>rows.push(['cuenta',a.id,'',a.name,a.type,'',a.opening,'','','','']));
  S.movements.forEach(m=>rows.push([K2T[m.kind],m.id,m.date,m.desc,m.cat||'',name(m.acc),m.amount,m.method,m.status==='void'?'anulado':'activo',m.ref||'',m.tid||'']));
  return '\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n');
}
function parseCSV(t){t=t.replace(/^\uFEFF/,'');const l=t.split('\n')[0],d=(l.match(/;/g)||[]).length>=(l.match(/,/g)||[]).length?';':',',rows=[];let r=[],c='',q=false;
  for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
  else if(ch==='"')q=true;else if(ch===d){r.push(c);c=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;r.push(c);c='';if(r.some(x=>x!==''))rows.push(r);r=[]}else c+=ch}
  r.push(c);if(r.some(x=>x!==''))rows.push(r);return rows}
function fromCSV(text){
  const rows=parseCSV(text),h=rows[0]||[],err=[],S=fresh();
  if(COLS.some(c=>!h.includes(c)))return{err:['El archivo no parece un CSV de ContaFlow (faltan columnas).']};
  const o=r=>Object.fromEntries(h.map((c,i)=>[c,uncell(r[i]??'')]));
  rows.slice(1).forEach((r,i)=>{const x=o(r),n=i+2;if(x.tipo==='empresa')S.company=x.descripcion;
    else if(x.tipo==='cuenta'){const op=Number(x.valor);if(!x.descripcion||!['caja','banco','otro'].includes(x.categoria)||!Number.isSafeInteger(op)||op<0)err.push('Fila '+n+': cuenta inválida');else if(S.accounts.some(a=>a.name===x.descripcion))err.push('Fila '+n+': cuenta repetida');else S.accounts.push({id:x.id||uid(),name:x.descripcion,type:x.categoria,opening:op})}
    else if(T2K[x.tipo]){const a=S.accounts.find(a=>a.name===x.cuenta),v=Number(x.valor);
      if(!x.id||!a||!/^\d{4}-\d{2}-\d{2}$/.test(x.fecha)||!Number.isSafeInteger(v)||v<=0||!x.descripcion)err.push('Fila '+n+': movimiento inválido');
      else S.movements.push({id:x.id,kind:T2K[x.tipo],date:x.fecha,desc:x.descripcion,cat:x.categoria,acc:a.id,amount:v,method:x.metodo||'otros',ref:x.referencia,status:x.estado==='anulado'?'void':'active',tid:x.transferencia_id||null})}
    else err.push('Fila '+n+': tipo desconocido')});
  return err.length?{err:err.slice(0,5)}:{S}}
function merge(L,I){ // combina por id; no duplica; propaga anulaciones
  const map={};I.accounts.forEach(a=>{let e=L.accounts.find(x=>x.name===a.name);if(!e){e={...a};L.accounts.push(e)}map[a.id]=e.id});
  let added=0,voided=0;I.movements.forEach(m=>{const e=L.movements.find(x=>x.id===m.id);
    if(!e){L.movements.push({...m,acc:map[m.acc]});added++}else if(m.status==='void'&&e.status!=='void'){e.status='void';voided++}});
  if(!L.company)L.company=I.company;return{added,voided}}
return{toCSV,fromCSV,merge,bal,fresh,uid}})();
