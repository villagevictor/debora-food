import { seedState, STORAGE_KEY } from "./erp-data.js";

export let state = seedState();
export let currentAppId = "dashboard";
export let currentItemKey = "overview";
export let draftLines = {};

export function setApp(app, item){ currentAppId = app; currentItemKey = item; }

export async function loadState(onReady){
  try{
    if (window.storage && window.storage.get) {
      const res = await window.storage.get(STORAGE_KEY, false);
      if(res && res.value){ state = Object.assign(seedState(), JSON.parse(res.value)); }
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if(saved){ state = Object.assign(seedState(), JSON.parse(saved)); }
    }
  }catch(e){ /* initial run */ }
  seedOpeningStock();
  if(onReady) onReady();
}

function seedOpeningStock(){
  if(state.ledger.length>0) return;
  const openings = [
    {itemId:"itm-maize", warehouseId:"wh-silo", qty:3000, unitCost:35.00},
    {itemId:"itm-bag",   warehouseId:"wh-pm",   qty:1500, unitCost:22.00},
    {itemId:"itm-duket", warehouseId:"wh-fg",   qty:85, unitCost:1820.00},
    {itemId:"itm-flour-10kg", warehouseId:"wh-fg", qty:140, unitCost:410.00},
    {itemId:"itm-flour-5kg", warehouseId:"wh-fg", qty:220, unitCost:215.00},
    {itemId:"itm-bran",  warehouseId:"wh-byp",  qty:600, unitCost:14.00},
    {itemId:"itm-sp-belt", warehouseId:"wh-pm", qty:8, unitCost:1250.00},
    {itemId:"itm-sp-oil", warehouseId:"wh-pm",  qty:12, unitCost:3400.00},
    {itemId:"itm-sp-bearing", warehouseId:"wh-pm", qty:10, unitCost:850.00},
  ];
  let totalStock = 0;
  openings.forEach(o=>{
    const cost = postLedger({itemId:o.itemId, warehouseId:o.warehouseId, type:"OPENING_BALANCE", qtyIn:o.qty, unitCost:o.unitCost, ref:"Opening balance"});
    totalStock += o.qty*cost;
  });
  // Opening Balance Sheet: Stock + Operating Bank + Cash Till against Equity
  const bankFund = 850000;
  const tillFund = 25000;
  const totalEquity = round2(totalStock + bankFund + tillFund);
  postJournal("Opening capital and inventory balance", [
    {account:"1200", debit:round2(totalStock), credit:0},
    {account:"1000", debit:bankFund, credit:0},
    {account:"1050", debit:tillFund, credit:0},
    {account:"3000", debit:0, credit:totalEquity},
  ], "OPENING");
  saveState();
}

let saveTimer=null;
export function saveState(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(async ()=>{
    try{
      if (window.storage && window.storage.set) {
        await window.storage.set(STORAGE_KEY, JSON.stringify(state), false);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    }catch(e){ console.error(e); }
  },250);
}

export function nextId(p){ return p+"-"+(state.seq++); }
export function fmt(n,d){ d=d===undefined?2:d; return Number(n||0).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d}); }
export function etb(n){ return "ETB "+fmt(n,2); }
export function itemById(id){ return state.items.find(i=>i.id===id); }
export function whById(id){ return state.warehouses.find(w=>w.id===id); }
export function supplierById(id){ return state.suppliers.find(s=>s.id===id); }
export function customerById(id){ return state.customers.find(c=>c.id===id); }
export function nowIso(){ return new Date().toISOString(); }
export function timeShort(iso){ const d=new Date(iso); return d.toLocaleDateString(undefined,{month:"short",day:"2-digit"})+" "+d.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"}); }
export function daysAgo(iso){ return Math.floor((Date.now()-new Date(iso).getTime())/86400000); }
export function round2(n){ return Math.round((Number(n)||0)*100)/100; }
export function round4(n){ return Math.round((Number(n)||0)*10000)/10000; }
export function el(id){ return document.getElementById(id); }
export function val(id){ const e=el(id); return e?e.value:""; }
export function opts(list,labelFn){ return list.map(x=>`<option value="${x.id}">${labelFn(x)}</option>`).join(""); }
export function emptyState(text, colspan){
  return `<tr><td colspan="${colspan}"><div class="o-empty"><i class="bi bi-inbox"></i>${text}</div></td></tr>`;
}
export function flash(containerId,text,kind){
  const map = {warn:"danger", ok:"success"};
  const cls = map[kind]||"info";
  el(containerId).innerHTML = `<div class="alert alert-${cls} py-2 px-3 mt-2 mb-0" style="font-size:12.5px;">${text}</div>`;
}
export function badgeCls(status){
  const s = String(status).toLowerCase();
  if(["confirmed","done","complete","approved","received","completed","paid","passed","issued","sent to procurement","purchase order"].includes(s)) return "success";
  if(["rejected","failed","cancelled"].includes(s)) return "danger";
  if(["to check","partial","partially received","quoted","purchase requested","pending approval","in progress","awaiting storage"].includes(s)) return "warning";
  if(["draft","rfq","rfq sent"].includes(s)) return "info";
  return "secondary";
}
export function badge(status){ return `<span class="badge bg-${badgeCls(status)}">${status}</span>`; }
export function nowForDatetimeLocal(){
  const d = new Date();
  return new Date(d - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
}

export function postJournal(memo, lines, ref){
  const debit = round2(lines.reduce((s,l)=>s+(l.debit||0),0));
  const credit = round2(lines.reduce((s,l)=>s+(l.credit||0),0));
  if(Math.abs(debit-credit) > 0.01){ console.error("Unbalanced JE blocked", memo, lines); return null; }
  const entry = {id:nextId("je"), no:"JE-"+String(state.journal.length+1).padStart(6,"0"), date:nowIso(), memo, ref, lines};
  state.journal.push(entry);
  return entry;
}
export function accountBalance(code){
  let debit=0, credit=0;
  state.journal.forEach(je=>je.lines.forEach(l=>{ if(l.account===code){ debit+=l.debit||0; credit+=l.credit||0; } }));
  return {debit:round2(debit), credit:round2(credit), net:round2(debit-credit)};
}

export function stockOnHand(itemId, warehouseId){
  return state.ledger.reduce((sum,l)=>{
    if(l.itemId!==itemId) return sum;
    if(warehouseId && l.warehouseId!==warehouseId) return sum;
    return sum + (l.qtyIn||0) - (l.qtyOut||0);
  },0);
}
export function totalOnHand(itemId){ return stockOnHand(itemId, null); }
export function postLedger({itemId, warehouseId, type, qtyIn=0, qtyOut=0, unitCost=null, ref=""}){
  const item = itemById(itemId);
  let usedCost = unitCost;
  if(qtyIn>0){
    const oldQty = totalOnHand(itemId), oldAvg = item.avgCost||0;
    const inCost = (unitCost===null? oldAvg : unitCost);
    const newQty = oldQty+qtyIn;
    item.avgCost = round4(newQty>0 ? ((oldQty*oldAvg)+(qtyIn*inCost))/newQty : inCost);
    usedCost = round4(inCost);
  } else if(qtyOut>0){
    usedCost = round4(item.avgCost||0);
  }
  state.ledger.push({id:nextId("led"), itemId, warehouseId, type, qtyIn:round2(qtyIn), qtyOut:round2(qtyOut), unitCost:usedCost, ref, time:nowIso()});
  return usedCost;
}
export function inventoryAssetValue(){ return state.items.reduce((s,i)=>s+totalOnHand(i.id)*i.avgCost,0); }
export function kv(label, value){ return `<div class="o-kv"><b>${label}</b><span>${value}</span></div>`; }

export function formTablePage({formTitle, formBody, tableTitle, tableHead, tableBodyId, extraFormNote}){
  return `
    <div class="row g-3">
      <div class="col-lg-5">
        <div class="card mb-3">
          <div class="card-header">${formTitle}</div>
          <div class="card-body">${formBody}${extraFormNote?`<div class="alert alert-info mt-3" style="font-size:12px;">${extraFormNote}</div>`:""}</div>
        </div>
      </div>
      <div class="col-lg-7">
        <div class="card">
          <div class="card-header">${tableTitle}</div>
          <div class="card-body p-0"><table class="table table-hover">
            <thead><tr>${tableHead.map(h=>`<th>${h}</th>`).join("")}</tr></thead>
            <tbody id="${tableBodyId}"></tbody>
          </table></div>
        </div>
      </div>
    </div>`;
}
