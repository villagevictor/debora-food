import {
  state, draftLines, nextId, fmt, etb, itemById, whById, supplierById, customerById,
  nowIso, timeShort, daysAgo, round2, round4, el, val, opts, emptyState, flash, badge,
  postJournal, stockOnHand, totalOnHand, postLedger, accountBalance, inventoryAssetValue,
  formTablePage, saveState
} from "./erp-helpers.js";

export function renderProductionOrdersPage(){
  el("content").innerHTML = `
    <div class="row g-3">
      <div class="col-lg-6">
        <div class="card mb-3"><div class="card-header">New production order</div><div class="card-body">
          <label class="form-label">BOM</label><select class="form-select mb-2" id="moBom"></select>
          <label class="form-label">Target output quantity</label><input class="form-control mb-2" id="moTarget" type="number" step="1">
          <div class="row g-2 mb-2"><div class="col"><label class="form-label">Consume from</label><select class="form-select" id="moSource"></select></div><div class="col"><label class="form-label">Produce into</label><select class="form-select" id="moDest"></select></div></div>
          <button class="btn btn-brand btn-sm" id="btnMoCreate">Create order (Draft)</button>
          <div id="moExplosion"></div>
        </div></div>
      </div>
      <div class="col-lg-6">
        <div class="card mb-3"><div class="card-header">Complete an order</div><div class="card-body">
          <label class="form-label">Order</label><select class="form-select mb-2" id="moComplete"></select>
          <label class="form-label mt-2">Actual output produced</label><input class="form-control mb-2" id="moActual" type="number" step="0.01">
          <button class="btn btn-brand btn-sm" id="btnMoComplete">Complete (consume &amp; produce)</button>
          <div id="moCompleteNote"></div>
        </div></div>
      </div>
    </div>
    <div class="card"><div class="card-header">Production orders</div><div class="card-body p-0"><table class="table table-hover">
      <thead><tr><th>Order</th><th>BOM</th><th>Target</th><th>Status</th><th>Unit cost</th></tr></thead><tbody id="moTable"></tbody></table></div></div>`;
  el("moBom").innerHTML = opts(state.boms, b=>`${itemById(b.fgItemId).name} BOM`);
  el("moSource").innerHTML = opts(state.warehouses.filter(w=>!w.derivedFrom), w=>w.name);
  el("moDest").innerHTML = opts(state.warehouses.filter(w=>!w.derivedFrom), w=>w.name);
  el("btnMoCreate").onclick = createProductionOrder;
  el("btnMoComplete").onclick = completeProductionOrder;
  renderMoList();
}

function createProductionOrder(){
  const bomId = val("moBom"); const bom = state.boms.find(b=>b.id===bomId);
  const target = parseFloat(val("moTarget")); const source = val("moSource"), dest = val("moDest");
  if(!bom||!target||target<=0||!source||!dest){ flash("moExplosion","Pick a BOM, target quantity and both warehouses.","warn"); return; }
  const explosion = bom.lines.map(l=>({itemId:l.itemId, required:round2(target*l.qtyPerUnit), available:stockOnHand(l.itemId, source)}));
  state.productionOrders.push({
    id:nextId("mo"), no:"MO-"+String(state.productionOrders.length+1).padStart(6,"0"), bomId, fgItemId:bom.fgItemId,
    target, source, dest, explosion, workOrders:[], picked:false, status:"Draft", createdAt:nowIso()
  });
  el("moTarget").value="";
  flash("moExplosion", "Order created in Draft.", "ok");
  saveState(); renderMoList();
}

function completeProductionOrder(){
  const orderId = val("moComplete"); const order = state.productionOrders.find(o=>o.id===orderId);
  const actual = parseFloat(val("moActual"));
  if(!order||!actual||actual<=0){ flash("moCompleteNote","Pick an order and enter actual output.","warn"); return; }
  let materialCost = 0;
  for(const e of order.explosion){
    const avail = stockOnHand(e.itemId, order.source);
    if(e.required > avail){ flash("moCompleteNote", `Not enough ${itemById(e.itemId).name} in stock.`, "warn"); return; }
  }
  order.explosion.forEach(e=>{
    materialCost += e.required*itemById(e.itemId).avgCost;
    postLedger({itemId:e.itemId, warehouseId:order.source, type:"PRODUCTION_CONSUMPTION", qtyOut:e.required, ref:order.no});
  });
  const unitCost = round4(materialCost/actual);
  postLedger({itemId:order.fgItemId, warehouseId:order.dest, type:"FINISHED_GOODS_RECEIPT", qtyIn:actual, unitCost, ref:order.no});
  order.status = "Completed"; order.actualOutput = actual; order.unitCost = unitCost;
  flash("moCompleteNote", `Completed. Unit cost: ${etb(unitCost)}.`, "ok");
  saveState(); renderMoList();
}

function renderMoList(){
  const draftOrders = state.productionOrders.filter(o=>o.status==="Draft");
  const sel = el("moComplete"); if(sel) sel.innerHTML = draftOrders.length ? opts(draftOrders, o=>`${o.no} (${itemById(o.fgItemId).name})`) : `<option value="">— none draft —</option>`;
  const tbl = el("moTable"); if(tbl) tbl.innerHTML = state.productionOrders.slice().reverse().map(o=>`<tr><td class="o-mono">${o.no}</td><td>${itemById(o.fgItemId).name}</td><td>${fmt(o.target,0)}</td><td>${badge(o.status)}</td><td>${o.unitCost?etb(o.unitCost):"—"}</td></tr>`).join("") || emptyState("No production orders yet.",5);
}

export function renderBomsPage(){
  el("content").innerHTML = formTablePage({
    formTitle:"New BOM",
    formBody:`
      <label class="form-label">Finished good</label><select class="form-select mb-2" id="bomFg"></select>
      <label class="form-label">Components (per 1 unit of output)</label>
      <div class="o-linebuilder" id="bomLineBuilder"></div>
      <button class="btn btn-outline-dashed btn-sm mt-2" id="btnBomAddLine">+ Add component</button>
      <button class="btn btn-brand btn-sm mt-3" id="btnBomSave">Save BOM</button>`,
    tableTitle:"Bills of material",
    tableHead:["Finished good","Components"],
    tableBodyId:"bomTable",
  });
  el("bomFg").innerHTML = opts(state.items, i=>i.name);
  draftLines.bom = draftLines.bom||[];
  renderBomLines();
  el("btnBomAddLine").onclick = ()=>{ draftLines.bom.push({itemId:state.items[0].id, qtyPerUnit:1}); renderBomLines(); };
  el("btnBomSave").onclick = ()=>{
    const fgItemId = val("bomFg"); const lines = draftLines.bom.filter(l=>l.itemId && l.qtyPerUnit>0);
    if(!fgItemId||!lines.length) return;
    state.boms = state.boms.filter(b=>b.fgItemId!==fgItemId);
    state.boms.push({id:nextId("bom"), fgItemId, lines, operations:[]});
    draftLines.bom = []; renderBomLines(); saveState(); renderBomsList();
  };
  renderBomsList();
}
function renderBomLines(){
  const c = el("bomLineBuilder"); if(!c) return;
  if(!draftLines.bom.length){ c.innerHTML = `<div class="text-muted" style="font-size:12px;">No components yet.</div>`; return; }
  c.innerHTML = draftLines.bom.map((l,i)=>`
    <div class="lb-row" style="grid-template-columns:2fr 1fr auto;">
      <select class="form-select form-select-sm" onchange="window.__bomUpd(${i},'itemId',this.value)">${state.items.map(it=>`<option value="${it.id}" ${it.id===l.itemId?'selected':''}>${it.name}</option>`).join("")}</select>
      <input class="form-control form-control-sm" type="number" step="0.01" placeholder="Qty/unit" value="${l.qtyPerUnit||''}" oninput="window.__bomUpd(${i},'qtyPerUnit',this.value)">
      <button class="btn btn-sm btn-outline-danger" onclick="window.__bomDel(${i})"><i class="bi bi-x"></i></button>
    </div>`).join("");
}
window.__bomUpd = (i,f,v)=>{ draftLines.bom[i][f] = f==="itemId"?v:parseFloat(v)||0; };
window.__bomDel = (i)=>{ draftLines.bom.splice(i,1); renderBomLines(); };
function renderBomsList(){
  el("bomTable").innerHTML = state.boms.map(b=>`<tr><td>${itemById(b.fgItemId).name}</td><td>${b.lines.map(l=>`${fmt(l.qtyPerUnit)} ${itemById(l.itemId).uom} ${itemById(l.itemId).name}`).join(", ")}</td></tr>`).join("") || emptyState("No BOMs yet.",2);
}

export function renderSalesOrdersPage(){
  el("content").innerHTML = formTablePage({
    formTitle:"New sales order",
    formBody:`
      <label class="form-label">Customer</label><select class="form-select mb-2" id="soCustomer"></select>
      <label class="form-label">Order lines</label>
      <div class="o-linebuilder" id="soLineBuilder"></div>
      <button class="btn btn-outline-dashed btn-sm mt-2" id="btnSoAddLine">+ Add item</button>
      <button class="btn btn-brand btn-sm mt-2" id="btnSoSubmit">Create order (Draft)</button>
      <div id="soNote"></div>`,
    tableTitle:"Sales orders",
    tableHead:["SO","Customer","Lines","Total","Status"],
    tableBodyId:"soTable",
  });
  el("soCustomer").innerHTML = opts(state.customers, c=>c.name);
  draftLines.so = draftLines.so||[];
  renderSoLines();
  el("btnSoAddLine").onclick = ()=>{ draftLines.so.push({itemId:"itm-duket", qty:1, price:0}); renderSoLines(); };
  el("btnSoSubmit").onclick = submitSalesOrder;
  renderSoList();
}
function renderSoLines(){
  const c = el("soLineBuilder"); if(!c) return;
  const sellable = state.items.filter(i=>i.type==="Finished Good"||i.type==="By-Product");
  if(!draftLines.so.length){ c.innerHTML = `<div class="text-muted" style="font-size:12px;">No items yet.</div>`; return; }
  c.innerHTML = draftLines.so.map((l,i)=>`
    <div class="lb-row">
      <select class="form-select form-select-sm" onchange="window.__soUpd(${i},'itemId',this.value)">${sellable.map(it=>`<option value="${it.id}" ${it.id===l.itemId?'selected':''}>${it.name}</option>`).join("")}</select>
      <input class="form-control form-control-sm" type="number" step="0.01" placeholder="Qty" value="${l.qty||''}" oninput="window.__soUpd(${i},'qty',this.value)">
      <input class="form-control form-control-sm" type="number" step="0.01" placeholder="Price" value="${l.price||''}" oninput="window.__soUpd(${i},'price',this.value)">
      <button class="btn btn-sm btn-outline-danger" onclick="window.__soDel(${i})"><i class="bi bi-x"></i></button>
    </div>`).join("");
}
window.__soUpd = (i,f,v)=>{ draftLines.so[i][f] = f==="itemId"?v:parseFloat(v)||0; };
window.__soDel = (i)=>{ draftLines.so.splice(i,1); renderSoLines(); };
function submitSalesOrder(){
  const customerId = val("soCustomer"); const lines = draftLines.so.filter(l=>l.itemId && l.qty>0 && l.price>=0);
  if(!customerId||!lines.length){ flash("soNote","Pick a customer and add at least one line.","warn"); return; }
  state.salesOrders.push({id:nextId("so"), no:"SO-"+String(state.salesOrders.length+1).padStart(6,"0"), customerId, lines, status:"Confirmed", createdAt:nowIso()});
  draftLines.so = []; renderSoLines();
  flash("soNote","Sales order created and confirmed.","ok");
  saveState(); renderSoList();
}
function renderSoList(){
  el("soTable").innerHTML = state.salesOrders.slice().reverse().map(so=>{
    const total = so.lines.reduce((s,l)=>s+l.qty*l.price,0);
    return `<tr><td class="o-mono">${so.no}</td><td>${customerById(so.customerId).name}</td><td>${so.lines.length}</td><td>${etb(total)}</td><td>${badge(so.status)}</td></tr>`;
  }).join("") || emptyState("No sales orders yet.",5);
}

export function renderAccountingJournal(){
  el("content").innerHTML = `
    <div class="card"><div class="card-body p-0"><table class="table table-hover"><thead><tr><th>Entry</th><th>Date</th><th>Memo</th><th>Lines</th></tr></thead><tbody id="journalTable"></tbody></table></div></div>`;
  el("journalTable").innerHTML = state.journal.slice().reverse().map(j=>{
    const lines = j.lines.map(l=>{
      const acc = state.accounts.find(a=>a.code===l.account);
      return `<div class="l"><span>${acc?acc.name:l.account}</span><span>${l.debit?"Dr "+etb(l.debit):"Cr "+etb(l.credit)}</span></div>`;
    }).join("");
    return `<tr><td class="o-mono">${j.no}</td><td>${timeShort(j.date)}</td><td>${j.memo}</td><td class="o-je-lines">${lines}</td></tr>`;
  }).join("") || emptyState("No journal entries yet.",4);
}

export function renderAccountingCoa(){
  el("content").innerHTML = `<div class="card"><div class="card-body p-0"><table class="table table-hover"><thead><tr><th>Code</th><th>Name</th><th>Type</th></tr></thead><tbody>
    ${state.accounts.map(a=>`<tr><td class="o-mono">${a.code}</td><td>${a.name}</td><td style="text-transform:capitalize;">${a.type}</td></tr>`).join("")}
  </tbody></table></div></div>`;
}

export function renderAccountingTrialBalance(){
  el("content").innerHTML = `<div class="card"><div class="card-body p-0"><table class="table table-hover"><thead><tr><th>Account</th><th>Debit</th><th>Credit</th><th>Net</th></tr></thead><tbody id="tbTable"></tbody></table></div></div>`;
  el("tbTable").innerHTML = state.accounts.map(a=>{
    const b = accountBalance(a.code);
    return `<tr><td>${a.code} ${a.name}</td><td>${etb(b.debit)}</td><td>${etb(b.credit)}</td><td>${etb(b.net)}</td></tr>`;
  }).join("");
}

export function renderAccountingBalanceSheet(){
  const bank=accountBalance("1000").net, ar=accountBalance("1100").net, inv=inventoryAssetValue();
  const grni=-accountBalance("1300").net, ap=-accountBalance("2000").net, mfgClearing=-accountBalance("1400").net;
  const totalAssets=bank+ar+inv, totalLiabilities=grni+ap+mfgClearing, equity=totalAssets-totalLiabilities;
  el("content").innerHTML = `<div class="card"><div class="card-header">Balance Sheet</div><div class="card-body">
    <div class="row">
      <div class="col-md-6">
        <div class="o-group-title first">Assets</div>
        <div class="o-je-lines">
          <div class="l"><span>Bank</span><span>${etb(bank)}</span></div>
          <div class="l"><span>Accounts Receivable</span><span>${etb(ar)}</span></div>
          <div class="l"><span>Inventory Asset</span><span>${etb(inv)}</span></div>
          <div class="l fw-bold" style="border-top:1px solid var(--o-border);padding-top:8px;"><span>Total Assets</span><span>${etb(totalAssets)}</span></div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="o-group-title first">Liabilities &amp; Equity</div>
        <div class="o-je-lines">
          <div class="l"><span>Goods Received Not Invoiced</span><span>${etb(grni)}</span></div>
          <div class="l"><span>Accounts Payable</span><span>${etb(ap)}</span></div>
          <div class="l"><span>Manufacturing Clearing</span><span>${etb(mfgClearing)}</span></div>
          <div class="l"><span>Equity (Retained Earnings)</span><span>${etb(equity)}</span></div>
          <div class="l fw-bold" style="border-top:1px solid var(--o-border);padding-top:8px;"><span>Total Liabilities &amp; Equity</span><span>${etb(totalLiabilities+equity)}</span></div>
        </div>
      </div>
    </div>
  </div></div>`;
}
