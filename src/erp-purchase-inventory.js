import {
  state, draftLines, nextId, fmt, etb, itemById, whById, supplierById,
  nowIso, timeShort, daysAgo, round2, round4, el, val, opts, emptyState, flash, badge,
  postJournal, stockOnHand, totalOnHand, postLedger, kv, formTablePage, saveState
} from "./erp-helpers.js";

export let currentPoMode = "all";
let __editingPoId = null;
let __draftPo = null;
let __poReturnMode = "all";
let __poActiveTab = "products";

export function renderVendors(){
  el("content").innerHTML = formTablePage({
    formTitle:"New vendor",
    formBody:`
      <label class="form-label">Name</label><input class="form-control mb-2" id="supName" placeholder="Vendor name">
      <label class="form-label">Category</label>
      <select class="form-select mb-2" id="supCategory"><option value="Local">Local</option><option value="Foreign">Foreign</option></select>
      <div class="form-check mb-2"><input class="form-check-input" type="checkbox" id="supCert"><label class="form-check-label" for="supCert" style="font-size:12.5px;">Food-grade / Halal / organic certified</label></div>
      <button class="btn btn-brand btn-sm mt-1" id="btnAddSupplier">Add vendor</button>`,
    tableTitle:"Vendors",
    tableHead:["Name","Category","Certified"],
    tableBodyId:"supplierTable",
  });
  el("btnAddSupplier").onclick = ()=>{
    const name = val("supName").trim(); if(!name) return;
    state.suppliers.push({id:nextId("sup"), name, category:val("supCategory"), certified:el("supCert").checked});
    el("supName").value=""; el("supCert").checked=false;
    saveState(); renderSuppliersList();
  };
  renderSuppliersList();
}
function renderSuppliersList(){
  el("supplierTable").innerHTML = state.suppliers.map(s=>`<tr><td>${s.name}</td><td>${s.category}</td><td>${s.certified?'<span class="badge bg-success">Yes</span>':"—"}</td></tr>`).join("") || emptyState("No vendors yet.",3);
}

export function renderPurchaseOrdersPage(mode, title){
  currentPoMode = mode;
  el("content").innerHTML = `
    <div id="poTiles"></div>
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span>${title}</span>
        <button class="btn btn-brand btn-sm" onclick="window.__poNewClick()"><i class="bi bi-plus-lg me-1"></i>New</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive"><table class="table table-hover">
          <thead><tr><th>Reference</th><th>Vendor</th><th>Company</th><th>Buyer</th><th>Order Deadline</th><th>Activities</th><th>Total</th><th>Status</th></tr></thead>
          <tbody id="poTable"></tbody>
        </table></div>
      </div>
    </div>`;
  renderPurchaseOrderList(mode);
}

function purchaseOrderTiles(mode){
  const rfqs = state.purchaseOrders.filter(p=>p.status==="RFQ"||p.status==="RFQ Sent");
  const confirmed = state.purchaseOrders.filter(p=>p.status==="Purchase Order"||p.status==="Received"||p.status==="Partially Received");
  const now = new Date();
  const lateRfq = rfqs.filter(p=>p.orderDeadline && new Date(p.orderDeadline)<now);
  const notAcked = confirmed.filter(p=>!p.acknowledged && p.status!=="Received");
  const lateReceipt = confirmed.filter(p=>p.orderDeadline && new Date(p.orderDeadline)<now && p.status!=="Received");
  const received = state.purchaseOrders.filter(p=>p.status==="Received" && p.orderDeadline);
  const onTime = received.filter(p=>{
    const grn = state.goodsReceipts.filter(g=>g.poId===p.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))[0];
    return grn && new Date(grn.createdAt)<=new Date(p.orderDeadline);
  });
  const otd = received.length ? Math.round(onTime.length/received.length*100) : null;
  const withDeadline = state.purchaseOrders.filter(p=>p.orderDeadline);
  const avgDays = withDeadline.length
    ? (withDeadline.reduce((s,p)=>s+Math.max(0,(new Date(p.orderDeadline)-new Date(p.createdAt))/86400000),0)/withDeadline.length).toFixed(2)
    : null;

  return `<div class="o-stat-row">
    <div class="o-stat-tile blue"><div class="n">${state.purchaseOrders.filter(p=>p.status==="RFQ").length}</div><div class="l">New</div></div>
    <div class="o-stat-tile plain"><div class="n">${state.purchaseOrders.filter(p=>p.status==="RFQ Sent").length}</div><div class="l">RFQ Sent</div></div>
    <div class="o-stat-tile amber"><div class="n">${lateRfq.length}</div><div class="l">Late RFQ</div></div>
    <div class="o-stat-tile blue"><div class="n">${notAcked.length}</div><div class="l">Not Acknowledged</div></div>
    <div class="o-stat-tile pink"><div class="n">${lateReceipt.length}</div><div class="l">Late Receipt</div></div>
    <div class="o-stat-metric"><div class="n">${otd===null?"—":otd+"%"}</div><div class="l">OTD</div></div>
    <div class="o-stat-metric"><div class="n">${avgDays===null?"—":avgDays}</div><div class="l">Days to Order</div></div>
  </div>`;
}

function purchaseOrderRow(po){
  const total = po.lines.reduce((s,l)=>s+l.qty*l.price,0);
  const overdue = po.orderDeadline && new Date(po.orderDeadline)<new Date() && po.status!=="Received";
  const deadline = po.orderDeadline ? `<span class="${overdue?'text-danger fw-semibold':''}">${new Date(po.orderDeadline).toLocaleDateString(undefined,{month:'short',day:'2-digit'})}</span>` : "—";
  return `<tr>
    <td class="o-mono"><a style="cursor:pointer;" onclick="window.__poOpenRow('${po.id}')">${po.no}</a></td>
    <td>${supplierById(po.supplierId).name}</td><td>${po.company}</td>
    <td><span class="o-avatar" style="width:22px;height:22px;font-size:10px;">A</span> ${po.buyer}</td>
    <td>${deadline}</td><td class="text-center"><i class="bi bi-clock text-muted"></i></td>
    <td>${etb(total)}</td><td>${badge(po.status)}</td></tr>`;
}

function renderPurchaseOrderList(mode){
  const tbody = el("poTable"); if(!tbody) return;
  const rows = mode==="confirmed" ? state.purchaseOrders.filter(p=>p.status!=="RFQ"&&p.status!=="RFQ Sent") : state.purchaseOrders;
  tbody.innerHTML = rows.slice().reverse().map(purchaseOrderRow).join("") || emptyState(mode==="confirmed"?"No confirmed purchase orders yet.":"No requests for quotation yet.",8);
  const tiles = el("poTiles"); if(tiles) tiles.innerHTML = purchaseOrderTiles(mode);
}

function blankPoDraft(){
  return {
    supplierId:"", vendorRef:"", agreement:"", analyticAccount:"",
    lines:[], status:"RFQ", buyer:"Admin", company:"Debora Food Complex",
    orderDeadline: new Date().toISOString(), expectedArrival:"", askConfirmation:false,
    deliverToWarehouseId: state.warehouses[0].id, acknowledged:false, prId:null,
    controlPolicy:"received", approvalStatus:"none", managerApproved:false,
    history:[{status:"Draft", note:"Creating a new record...", at:nowIso()}], createdAt:nowIso()
  };
}
function getEditingPo(){ return __editingPoId ? state.purchaseOrders.find(p=>p.id===__editingPoId) : __draftPo; }

export function openNewPoForm(returnMode){
  __poReturnMode = returnMode; __editingPoId = null; __draftPo = blankPoDraft(); __poActiveTab = "products";
  renderPoRecordPage();
}
export function openPoForm(id, returnMode){
  __poReturnMode = returnMode || currentPoMode; __editingPoId = id; __draftPo = null; __poActiveTab = "products";
  renderPoRecordPage();
}
function closePoForm(){
  __editingPoId = null; __draftPo = null;
  renderPurchaseOrdersPage(__poReturnMode, __poReturnMode==="confirmed"?"Purchase Orders":"Requests for Quotation");
}

function savePoNow(silent){
  const po = getEditingPo(); if(!po) return null;
  if(!po.supplierId || !po.lines.length){
    if(!silent) alert("Pick a vendor and add at least one product line before saving.");
    return null;
  }
  if(!__editingPoId){
    po.id = nextId("purchord");
    po.no = "P"+String(10000+state.purchaseOrders.length+1).slice(1);
    state.purchaseOrders.push(po);
    __editingPoId = po.id; __draftPo = null;
    if(po.prId){ const pr=state.requisitions.find(p=>p.id===po.prId); if(pr) pr.status="Approved"; }
  }
  saveState();
  return po;
}
function poHistoryPush(po, status, note){ po.history.push({status, note, at:nowIso()}); }
function poTotal(po){ return po.lines.reduce((s,l)=>s+l.qty*l.price,0); }
function poNeedsApproval(po){ return poTotal(po) > (state.settings.approvalThreshold||0); }

function poStageStepper(status){
  const steps = ["RFQ","RFQ Sent","Purchase Order"];
  if(status==="Cancelled") return `<div class="o-form-stepper"><span style="background:var(--o-danger-light);color:var(--o-danger);">Cancelled</span></div>`;
  const idx = steps.indexOf(status);
  return `<div class="o-form-stepper">` + steps.map((s,i)=>{
    const cls = i<idx ? "done" : (i===idx ? "current" : "");
    return `<span class="${cls}">${s}</span>`;
  }).join("") + `</div>`;
}

function renderPoFormTabBody(po){
  if(__poActiveTab==="other"){
    return `<div class="mt-3">
      <div class="o-form-field"><label>Control Policy</label>
        <select onchange="window.__poFieldChange('controlPolicy', this.value)">
          <option value="ordered" ${po.controlPolicy==="ordered"?"selected":""}>Ordered quantities</option>
          <option value="received" ${po.controlPolicy!=="ordered"?"selected":""}>Received quantities</option>
        </select>
      </div>
      <div class="o-kv-block mt-2">
        ${kv("Buyer", po.buyer)}
        ${kv("Company", po.company)}
        ${kv("Source Document", po.prId ? ((state.requisitions.find(p=>p.id===po.prId)||{}).no || "—") : "—")}
        ${kv("Approval", poNeedsApproval(po) ? (po.managerApproved?'<span class="badge bg-success">Manager approved</span>':(po.approvalStatus==="Pending"?'<span class="badge bg-warning text-dark">Pending</span>':'<span class="badge bg-secondary">Required, not yet requested</span>')) : '<span class="text-muted">Not required (under threshold)</span>')}
        ${kv("Status", badge(po.status))}
      </div>
    </div>`;
  }
  if(__poActiveTab==="alt"){
    return `<div class="text-muted mt-3" style="font-size:12.5px;">Compare quotes from alternative vendors for the same request — not modeled in this build.</div>`;
  }
  const rows = po.lines.map((l,i)=>{
    const item = itemById(l.itemId);
    return `<tr>
      <td><select onchange="window.__poFormLineUpd(${i},'itemId',this.value)">${state.items.map(it=>`<option value="${it.id}" ${it.id===l.itemId?'selected':''}>${it.name}</option>`).join("")}</select></td>
      <td class="text-muted">—</td><td class="text-muted">—</td>
      <td><input type="number" step="0.01" value="${l.qty}" oninput="window.__poFormLineUpd(${i},'qty',this.value)" style="width:70px;"></td>
      <td>${item.uom}</td>
      <td><input type="number" step="0.01" value="${l.price}" oninput="window.__poFormLineUpd(${i},'price',this.value)" style="width:90px;"></td>
      <td class="text-muted">—</td>
      <td><button class="btn btn-sm btn-outline-danger" onclick="window.__poFormLineDel(${i})"><i class="bi bi-x"></i></button></td>
    </tr>`;
  }).join("");
  return `
    <table class="o-form-linetable">
      <thead><tr><th>Product</th><th>Analytic D...</th><th>Harmoniz...</th><th>Quantity</th><th>Unit</th><th>Unit Price</th><th>Taxes</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="mt-2">
      <span class="o-form-addline" onclick="window.__poFormAddLine()">Add a product</span>
    </div>`;
}

function renderPoRecordPage(){
  const po = getEditingPo(); if(!po){ closePoForm(); return; }
  const isNew = !__editingPoId;
  const listLabel = __poReturnMode==="confirmed" ? "Purchase Orders" : "Requests for Quotation";

  el("oBreadcrumb").innerHTML = `<a data-nav="dashboard.overview">Debora Food Complex</a><span class="sep">/</span><a id="poBackCrumb" style="cursor:pointer;">${listLabel}</a><span class="sep">/</span><span>${isNew?"New":po.no}</span>`;
  el("oCpTitle").innerHTML = "";
  el("oCpActions").innerHTML = "";

  const total = po.lines.reduce((s,l)=>s+(l.qty*l.price),0);

  el("content").innerHTML = `
  <div class="card" style="overflow:visible;">
    <div class="o-form-topbar">
      <button class="btn btn-outline-secondary btn-sm" onclick="window.__poDiscardClick()">New</button>
      <div>
        <a style="cursor:pointer;color:var(--o-primary);" onclick="window.__poDiscardClick()">${listLabel}</a>
        <div style="font-size:12px;color:var(--o-text-muted);">${isNew?"New":po.no}</div>
      </div>
      <div class="o-form-icons ms-2">
        <i class="bi bi-cloud-arrow-up" title="Save" onclick="window.__poSaveClick()"></i>
        <i class="bi bi-x-lg" title="Discard" onclick="window.__poDiscardClick()"></i>
      </div>
    </div>

    <div class="o-form-actionbar">
      ${po.status==="RFQ" ? `<button class="btn btn-brand btn-sm" onclick="window.__poSendRfq()">Send RFQ</button>` : ""}
      ${["RFQ","RFQ Sent"].includes(po.status) && (!poNeedsApproval(po)||po.managerApproved) ? `<button class="btn btn-brand btn-sm" onclick="window.__poConfirmForm()">Confirm Order</button>` : ""}
      ${["RFQ","RFQ Sent"].includes(po.status) && poNeedsApproval(po) && !po.managerApproved && po.approvalStatus!=="Pending" ? `<button class="btn btn-outline-secondary btn-sm" onclick="window.__poRequestApproval()"><i class="bi bi-shield-exclamation me-1"></i>Request Approval</button>` : ""}
      ${["RFQ","RFQ Sent"].includes(po.status) && po.approvalStatus==="Pending" && !po.managerApproved ? `<button class="btn btn-outline-secondary btn-sm" onclick="window.__poManagerApprove()"><i class="bi bi-person-check me-1"></i>Manager Approve</button>` : ""}
      <button class="btn btn-outline-secondary btn-sm" onclick="alert('Print functionality will be enabled in reporting.')">Print</button>
      ${po.status!=="Cancelled" ? `<button class="btn btn-outline-secondary btn-sm" onclick="window.__poCancelForm()">Cancel</button>` : ""}
      <div class="spacer"></div>
      ${poStageStepper(po.status)}
      <div class="spacer"></div>
      <button class="btn btn-outline-secondary btn-sm" onclick="window.__poLogNote()">Log note</button>
    </div>

    <div class="o-form-body">
      <div class="o-form-main">
        <div style="font-size:11.5px;color:var(--o-text-muted);text-transform:uppercase;letter-spacing:.5px;">${po.status==="Cancelled"?"Cancelled Order":"Request for Quotation"}</div>
        <div class="o-form-title-input">${isNew?"New":po.no}</div>

        <div class="o-form-fieldgrid">
          <div>
            <div class="o-form-field"><label>Vendor</label>
              <select onchange="window.__poVendorChange(this.value)">
                <option value="">Name, TIN, Email, or Reference</option>
                ${state.suppliers.map(s=>`<option value="${s.id}" ${s.id===po.supplierId?'selected':''}>${s.name}</option>`).join("")}
              </select>
            </div>
            <div class="o-form-field"><label>Vendor Reference</label><input value="${po.vendorRef||''}" oninput="window.__poFieldChange('vendorRef',this.value)"></div>
            <div class="o-form-field"><label>Agreement</label><input value="${po.agreement||''}" oninput="window.__poFieldChange('agreement',this.value)" placeholder="—"></div>
            <div class="o-form-field"><label>Currency</label><input value="ETB" readonly></div>
          </div>
          <div>
            <div class="o-form-field"><label>Order Deadline</label><input type="date" value="${po.orderDeadline?po.orderDeadline.slice(0,10):''}" onchange="window.__poFieldChange('orderDeadline', this.value?new Date(this.value+'T23:59:59').toISOString():'')"></div>
            <div class="o-form-field"><label>Expected Arrival</label><input type="date" value="${po.expectedArrival?po.expectedArrival.slice(0,10):''}" onchange="window.__poFieldChange('expectedArrival', this.value?new Date(this.value+'T00:00:00').toISOString():'')"></div>
            <div class="o-form-field"><label>Deliver To</label>
              <select onchange="window.__poFieldChange('deliverToWarehouseId', this.value)">
                ${state.warehouses.map(w=>`<option value="${w.id}" ${w.id===po.deliverToWarehouseId?'selected':''}>${w.name}</option>`).join("")}
              </select>
            </div>
          </div>
        </div>

        <div class="o-form-tabs">
          <button class="${__poActiveTab==='products'?'active':''}" onclick="window.__poSwitchTab('products')">Products</button>
          <button class="${__poActiveTab==='other'?'active':''}" onclick="window.__poSwitchTab('other')">Other Information</button>
        </div>

        <div id="poFormTabBody">${renderPoFormTabBody(po)}</div>

        <div class="o-form-totals">
          <div>Untaxed Amount: <b>${etb(total)}</b></div>
          <div class="grand">Total: <span>${etb(total)}</span></div>
        </div>
      </div>

      <div class="o-form-chatter">
        <div class="d-flex gap-2 mb-3">
          <button class="btn btn-outline-secondary btn-sm" onclick="window.__poLogNote()">Log note</button>
        </div>
        ${historyList(po.history)}
      </div>
    </div>
  </div>`;

  el("poBackCrumb").addEventListener("click", closePoForm);
}

function historyList(history){
  if(!history || !history.length) return `<div class="text-muted" style="font-size:12px;">No history yet.</div>`;
  return `<div class="o-history">` + history.slice().reverse().map(h=>`
    <div class="o-history-item"><div class="t">${timeShort(h.at)}</div><div>${badge(h.status)}<div class="mt-1">${h.note||""}</div></div></div>
  `).join("") + `</div>`;
}

window.__poOpenRow = function(id){ openPoForm(id, currentPoMode); };
window.__poNewClick = function(){ openNewPoForm(currentPoMode); };
window.__poFieldChange = function(f, v){ const po=getEditingPo(); if(po){ po[f]=v; if(__editingPoId) saveState(); } };
window.__poVendorChange = function(v){ const po=getEditingPo(); if(po){ po.supplierId=v; if(__editingPoId) saveState(); } };
window.__poSendRfq = function(){ const po=savePoNow(); if(po){ po.status="RFQ Sent"; poHistoryPush(po,"RFQ Sent","RFQ sent to vendor."); saveState(); renderPoRecordPage(); } };
window.__poRequestApproval = function(){ const po=savePoNow(); if(po){ po.approvalStatus="Pending"; poHistoryPush(po,po.status,"Approval requested."); saveState(); renderPoRecordPage(); } };
window.__poManagerApprove = function(){ const po=getEditingPo(); if(po){ po.managerApproved=true; po.approvalStatus="Approved"; poHistoryPush(po,po.status,"Approved by manager."); if(__editingPoId) saveState(); renderPoRecordPage(); } };
window.__poConfirmForm = function(){ const po=savePoNow(); if(po){ po.status="Purchase Order"; poHistoryPush(po,"Purchase Order","Order confirmed."); saveState(); renderPoRecordPage(); } };
window.__poCancelForm = function(){ const po=getEditingPo(); if(po){ po.status="Cancelled"; poHistoryPush(po,"Cancelled","Order cancelled."); if(__editingPoId) saveState(); renderPoRecordPage(); } };
window.__poSaveClick = function(){ const po=savePoNow(); if(po) renderPoRecordPage(); };
window.__poDiscardClick = function(){ closePoForm(); };
window.__poLogNote = function(){ const po=getEditingPo(); if(!po) return; const note=prompt("Log a note:"); if(!note) return; poHistoryPush(po,po.status,note); if(__editingPoId) saveState(); renderPoRecordPage(); };
window.__poSwitchTab = function(tab){ __poActiveTab=tab; renderPoRecordPage(); };
window.__poFormLineUpd = function(i, f, v){ const po=getEditingPo(); if(po){ po.lines[i][f]=f==="itemId"?v:parseFloat(v)||0; if(__editingPoId) saveState(); renderPoRecordPage(); } };
window.__poFormLineDel = function(i){ const po=getEditingPo(); if(po){ po.lines.splice(i,1); if(__editingPoId) saveState(); renderPoRecordPage(); } };
window.__poFormAddLine = function(){ const po=getEditingPo(); if(po){ po.lines.push({itemId:state.items[0].id, qty:1, price:0, qtyReceived:0}); if(__editingPoId) saveState(); renderPoRecordPage(); } };

export function renderRequisitionsPage(){
  el("content").innerHTML = formTablePage({
    formTitle:"New requisition",
    formBody:`
      <label class="form-label">Department</label><input class="form-control mb-2" id="prDept" placeholder="e.g. Milling">
      <label class="form-label">Items requested</label>
      <div class="o-linebuilder" id="prLineBuilder"></div>
      <button class="btn btn-outline-dashed btn-sm mt-2" id="btnPrAddLine">+ Add item</button>
      <button class="btn btn-brand btn-sm mt-2" id="btnPrSubmit">Submit requisition</button>
      <div id="prNote"></div>`,
    tableTitle:"Requisitions",
    tableHead:["PR","Dept","Items","Status"],
    tableBodyId:"prTable",
  });
  draftLines.pr = draftLines.pr||[];
  renderPrLineBuilder();
  el("btnPrAddLine").onclick = ()=>{ draftLines.pr.push({itemId:state.items[0].id, qty:1, price:0}); renderPrLineBuilder(); };
  el("btnPrSubmit").onclick = submitRequisition;
  renderRequisitions();
}
function renderPrLineBuilder(){
  const c = el("prLineBuilder"); if(!c) return;
  if(!draftLines.pr.length){ c.innerHTML = `<div class="text-muted" style="font-size:12px;">No items yet.</div>`; return; }
  c.innerHTML = draftLines.pr.map((l,i)=>`
    <div class="lb-row">
      <select class="form-select form-select-sm" onchange="window.__prUpd(${i},'itemId',this.value)">${state.items.map(it=>`<option value="${it.id}" ${it.id===l.itemId?'selected':''}>${it.name}</option>`).join("")}</select>
      <input class="form-control form-control-sm" type="number" step="0.01" placeholder="Qty" value="${l.qty||''}" oninput="window.__prUpd(${i},'qty',this.value)">
      <input class="form-control form-control-sm" type="number" step="0.01" placeholder="Est. price" value="${l.price||''}" oninput="window.__prUpd(${i},'price',this.value)">
      <button class="btn btn-sm btn-outline-danger" onclick="window.__prDel(${i})"><i class="bi bi-x"></i></button>
    </div>`).join("");
}
window.__prUpd = (i,f,v)=>{ draftLines.pr[i][f] = f==="itemId"?v:parseFloat(v)||0; };
window.__prDel = (i)=>{ draftLines.pr.splice(i,1); renderPrLineBuilder(); };
function submitRequisition(){
  const dept = val("prDept").trim();
  const lines = draftLines.pr.filter(l=>l.itemId && l.qty>0);
  if(!dept||!lines.length){ flash("prNote","Enter a department and at least one item.","warn"); return; }
  state.requisitions.push({id:nextId("pr"), no:"PR-"+String(state.requisitions.length+1).padStart(6,"0"), dept, lines, status:"Submitted", createdAt:nowIso()});
  draftLines.pr = []; renderPrLineBuilder();
  el("prDept").value=""; flash("prNote","Requisition submitted.","ok");
  saveState(); renderRequisitions();
}
function renderRequisitions(){
  el("prTable").innerHTML = state.requisitions.slice().reverse().map(pr=>
    `<tr><td class="o-mono">${pr.no}</td><td>${pr.dept}</td><td>${pr.lines.length} item(s)</td><td>${badge(pr.status)}</td></tr>`
  ).join("") || emptyState("No requisitions yet.",4);
}

export function renderGrnPage(){
  el("content").innerHTML = formTablePage({
    formTitle:"Receive goods",
    formBody:`
      <label class="form-label">Purchase order</label><select class="form-select mb-2" id="grnPo"></select>
      <label class="form-label">Receive into warehouse</label><select class="form-select mb-2" id="grnWarehouse"></select>
      <div id="grnLines"></div>
      <button class="btn btn-brand btn-sm mt-2" id="btnGrnPost">Post goods receipt</button>
      <div id="grnNote"></div>`,
    tableTitle:"Goods receipts",
    tableHead:["GRN","PO","Warehouse","Value","Date"],
    tableBodyId:"grnTable",
  });
  el("grnPo").innerHTML = opts(state.purchaseOrders.filter(p=>p.status!=="RFQ"&&p.status!=="RFQ Sent"&&p.status!=="Received"&&p.status!=="Closed"&&p.status!=="Cancelled"), p=>`${p.no} · ${supplierById(p.supplierId).name}`);
  el("grnWarehouse").innerHTML = opts(state.warehouses.filter(w=>!w.derivedFrom), w=>w.name);
  el("grnPo").onchange = renderGrnLines;
  renderGrnLines();
  el("btnGrnPost").onclick = postGoodsReceipt;
  renderGoodsReceipts();
}
function renderGrnLines(){
  const poId = val("grnPo"); const po = state.purchaseOrders.find(p=>p.id===poId); const c = el("grnLines");
  if(!po){ c.innerHTML=""; return; }
  c.innerHTML = `<label class="form-label">Quantities to receive</label>` + po.lines.map((l,i)=>{
    const item = itemById(l.itemId); const remaining = l.qty - l.qtyReceived;
    return `<div class="row g-2 mb-1"><div class="col-7 pt-1 o-mono" style="font-size:12px;">${item.name} <span class="text-muted">(${fmt(remaining)} rem)</span></div>
      <div class="col-5"><input class="form-control form-control-sm" type="number" step="0.01" placeholder="Qty" id="grnQty_${i}" max="${remaining}"></div></div>`;
  }).join("");
}
function postGoodsReceipt(){
  const poId = val("grnPo"); const po = state.purchaseOrders.find(p=>p.id===poId); const warehouseId = val("grnWarehouse");
  if(!po||!warehouseId){ flash("grnNote","Pick a purchase order and destination warehouse.","warn"); return; }
  let totalValue = 0; const received = [];
  po.lines.forEach((l,i)=>{
    const qty = parseFloat(val("grnQty_"+i))||0; if(qty<=0) return;
    l.qtyReceived += qty;
    const cost = postLedger({itemId:l.itemId, warehouseId, type:"PURCHASE_GRN", qtyIn:qty, unitCost:l.price, ref:po.no});
    totalValue += qty*cost; received.push({itemId:l.itemId, qty});
  });
  if(!received.length){ flash("grnNote","Enter at least one quantity to receive.","warn"); return; }
  po.status = po.lines.every(l=>l.qtyReceived>=l.qty-0.001) ? "Received" : "Partially Received";
  state.goodsReceipts.push({id:nextId("grn"), no:"GRN-"+String(state.goodsReceipts.length+1).padStart(6,"0"), poId:po.id, warehouseId, value:totalValue, createdAt:nowIso()});
  postJournal(`Goods receipt against ${po.no}`, [{account:"1200", debit:round2(totalValue), credit:0}, {account:"1300", debit:0, credit:round2(totalValue)}], po.no);
  flash("grnNote", `Posted ${etb(totalValue)} of stock into ${whById(warehouseId).name}.`, "ok");
  saveState(); renderGoodsReceipts();
  el("grnPo").innerHTML = opts(state.purchaseOrders.filter(p=>p.status!=="RFQ"&&p.status!=="RFQ Sent"&&p.status!=="Received"&&p.status!=="Closed"&&p.status!=="Cancelled"), p=>`${p.no} · ${supplierById(p.supplierId).name}`);
}
function renderGoodsReceipts(){
  el("grnTable").innerHTML = state.goodsReceipts.slice().reverse().map(g=>{
    const po = state.purchaseOrders.find(p=>p.id===g.poId);
    return `<tr><td class="o-mono">${g.no}</td><td>${po?po.no:"—"}</td><td>${whById(g.warehouseId).name}</td><td>${etb(g.value)}</td><td>${timeShort(g.createdAt)}</td></tr>`;
  }).join("") || emptyState("No goods receipts yet.",5);
}

export function renderStockPage(){
  el("content").innerHTML = `<div class="card"><div class="card-body p-0" style="overflow-x:auto;"><table class="table table-hover">
    <thead><tr><th>Item</th>${state.warehouses.map(w=>`<th>${w.name}</th>`).join("")}<th>Total</th></tr></thead>
    <tbody id="stockTable"></tbody></table></div></div>`;
  el("stockTable").innerHTML = state.items.map(i=>{
    const cells = state.warehouses.map(w=>`<td>${fmt(stockOnHand(i.id,w.id))}</td>`).join("");
    return `<tr><td>${i.name}</td>${cells}<td class="fw-semibold">${fmt(totalOnHand(i.id))}</td></tr>`;
  }).join("") || emptyState("No stock yet.", state.warehouses.length+2);
}

export function renderForecastPage(){
  el("content").innerHTML = `
    <div class="card"><div class="card-body p-0"><table class="table table-hover">
      <thead><tr><th>Item</th><th>On Hand</th><th>Incoming</th><th>Outgoing</th><th>Forecasted</th></tr></thead>
      <tbody id="forecastTable"></tbody></table></div></div>`;
  el("forecastTable").innerHTML = state.items.map(i=>{
    const onHand = totalOnHand(i.id);
    const incoming = state.purchaseOrders
      .filter(p=>["Purchase Order","Partially Received"].includes(p.status))
      .reduce((s,p)=>s+p.lines.filter(l=>l.itemId===i.id).reduce((s2,l)=>s2+Math.max(0,l.qty-(l.qtyReceived||0)),0),0);
    const outgoing = state.salesOrders
      .filter(o=>o.status==="Confirmed")
      .reduce((s,o)=>s+o.lines.filter(l=>l.itemId===i.id).reduce((s2,l)=>s2+l.qty,0),0);
    const forecasted = onHand+incoming-outgoing;
    return `<tr><td>${i.name}</td><td>${fmt(onHand)}</td><td class="text-success">${incoming?"+"+fmt(incoming):"—"}</td>
      <td class="text-danger">${outgoing?"−"+fmt(outgoing):"—"}</td><td class="fw-semibold ${forecasted<0?'text-danger':''}">${fmt(forecasted)}</td></tr>`;
  }).join("") || emptyState("No items yet.",5);
}

export function renderItemsPage(){
  el("content").innerHTML = formTablePage({
    formTitle:"New item",
    formBody:`
      <div class="row g-2 mb-2"><div class="col"><label class="form-label">Code</label><input class="form-control" id="itmCode" placeholder="RM-XXXX"></div><div class="col"><label class="form-label">UoM</label><input class="form-control" id="itmUom" placeholder="KG"></div></div>
      <label class="form-label">Name</label><input class="form-control mb-2" id="itmName" placeholder="Item name">
      <label class="form-label">Type</label>
      <select class="form-select mb-2" id="itmType"><option>Raw Material</option><option>Packaging</option><option>Finished Good</option><option>By-Product</option></select>
      <button class="btn btn-brand btn-sm" id="btnAddItem">Add item</button>`,
    tableTitle:"Item Master",
    tableHead:["Code","Name","Type","UoM","Avg cost"],
    tableBodyId:"itemTable",
  });
  el("btnAddItem").onclick = ()=>{
    const code=val("itmCode").trim(), name=val("itmName").trim(), uom=val("itmUom").trim(), type=val("itmType");
    if(!code||!name||!uom) return;
    state.items.push({id:nextId("itm"), code, name, uom, type, avgCost:0});
    ["itmCode","itmName","itmUom"].forEach(id=>el(id).value="");
    saveState(); renderItemsList();
  };
  renderItemsList();
}
function renderItemsList(){
  el("itemTable").innerHTML = state.items.map(i=>`<tr><td class="o-mono">${i.code}</td><td>${i.name}</td><td>${i.type}</td><td>${i.uom}</td><td>${etb(i.avgCost)}</td></tr>`).join("") || emptyState("No items yet.",5);
}
