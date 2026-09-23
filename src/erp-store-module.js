import {
  state, draftLines, nextId, fmt, etb, itemById, whById, supplierById,
  nowIso, timeShort, round2, el, val, opts, emptyState, flash, badge,
  postJournal, stockOnHand, totalOnHand, postLedger, kv, formTablePage,
  nowForDatetimeLocal, saveState
} from "./erp-helpers.js";

function lineAvailability(itemId, demand, transferred, sourceWarehouseId){
  const remaining = round2(Math.max(0, demand-transferred));
  const atSource = stockOnHand(itemId, sourceWarehouseId);
  const totalAvail = totalOnHand(itemId);
  const elsewhere = round2(Math.max(0, totalAvail-atSource));
  const shortfall = round2(Math.max(0, remaining-totalAvail));
  return { remaining, atSource: round2(atSource), elsewhere, totalAvail: round2(totalAvail), shortfall };
}
function requestAvailability(req){
  const rows = req.lines.map(l=>{ const av=lineAvailability(l.itemId, l.demand, l.transferred, req.sourceWarehouseId); return Object.assign({}, l, av); });
  const allDone = rows.every(r=>r.remaining<=0.0001);
  const anyDone = rows.some(r=>r.transferred>0.0001);
  const anyShortfall = rows.some(r=>r.shortfall>0.0001 && r.remaining>0.0001);
  return {rows, allDone, anyDone, anyShortfall};
}
function srHistoryPush(req, status, note){ req.status=status; req.history.push({status, note, at:nowIso()}); }
function historyList(history){
  if(!history || !history.length) return `<div class="text-muted" style="font-size:12px;">No history yet.</div>`;
  return `<div class="o-history">` + history.slice().reverse().map(h=>`
    <div class="o-history-item"><div class="t">${timeShort(h.at)}</div><div>${badge(h.status)}<div class="mt-1">${h.note||""}</div></div></div>
  `).join("") + `</div>`;
}
function stepper(status){
  const steps = ["Draft","To Check","Confirmed","Partial","Done","Complete"];
  if(status==="Rejected") return `<div class="o-stepper"><span class="o-step rejected">Rejected</span></div>`;
  const idx = steps.indexOf(status);
  return `<div class="o-stepper">` + steps.map((s,i)=>{
    const cls = i<idx ? "done" : (i===idx ? "current" : "");
    return `<span class="o-step ${cls}">${s}</span>`;
  }).join("") + `</div>`;
}

export function approveStoreRequest(id){
  const req = state.storeRequests.find(r=>r.id===id); if(!req||req.status!=="To Check") return;
  srHistoryPush(req, "Confirmed", "Approved — routed to IPC / Warehouse for stock processing.");
  saveState(); renderStoreRequestsTable(); refreshSrModal();
}
export function rejectStoreRequest(id){
  const req = state.storeRequests.find(r=>r.id===id); if(!req||req.status!=="To Check") return;
  const reason = prompt("Reason for rejection:"); if(reason===null) return;
  srHistoryPush(req, "Rejected", reason.trim()||"No reason given.");
  saveState(); renderStoreRequestsTable(); refreshSrModal();
}
export function processStoreRequest(id){
  const req = state.storeRequests.find(r=>r.id===id); if(!req||!["Confirmed","Partial"].includes(req.status)) return;
  const notes = [];
  req.lines.forEach(l=>{
    let remaining = round2(l.demand - l.transferred);
    if(remaining<=0.0001) return;
    const item = itemById(l.itemId);

    const atSource = stockOnHand(l.itemId, req.sourceWarehouseId);
    if(atSource>0.0001){
      const issueQty = round2(Math.min(remaining, atSource));
      const cost = postLedger({itemId:l.itemId, warehouseId:req.sourceWarehouseId, type:"STORE_ISSUE", qtyOut:issueQty, ref:req.no});
      const value = round2(issueQty*cost);
      postJournal(`Store issue ${req.no} to ${req.dept}`, [{account:"5200", debit:value, credit:0},{account:"1200", debit:0, credit:value}], req.no);
      state.storeIssues.push({id:nextId("si"), no:"SI-"+String(state.storeIssues.length+1).padStart(6,"0"), storeRequestId:req.id, dept:req.dept, warehouseId:req.sourceWarehouseId, itemId:l.itemId, qty:issueQty, value, createdAt:nowIso()});
      l.transferred = round2(l.transferred + issueQty);
      remaining = round2(remaining - issueQty);
      notes.push(`Issued ${fmt(issueQty)} ${item.uom} ${item.name} from ${whById(req.sourceWarehouseId).name}.`);
    }

    if(remaining>0.0001){
      const sources = state.warehouses.filter(w=>w.id!==req.sourceWarehouseId)
        .map(w=>({id:w.id, qty:stockOnHand(l.itemId,w.id)})).filter(w=>w.qty>0.0001).sort((a,b)=>b.qty-a.qty);
      for(const src of sources){
        if(remaining<=0.0001) break;
        const moveQty = round2(Math.min(remaining, src.qty));
        if(moveQty<=0) continue;
        postLedger({itemId:l.itemId, warehouseId:src.id, type:"TRANSFER_OUT", qtyOut:moveQty, ref:req.no});
        postLedger({itemId:l.itemId, warehouseId:req.sourceWarehouseId, type:"TRANSFER_IN", qtyIn:moveQty, unitCost:item.avgCost, ref:req.no});
        state.transfers.push({id:nextId("tr"), itemId:l.itemId, from:src.id, to:req.sourceWarehouseId, qty:moveQty, time:nowIso(), ref:req.no, status:"Done"});
        notes.push(`Transfer Order moved ${fmt(moveQty)} ${item.uom} ${item.name} from ${whById(src.id).name} into ${whById(req.sourceWarehouseId).name}.`);
        const cost2 = item.avgCost;
        const value2 = round2(moveQty*cost2);
        postLedger({itemId:l.itemId, warehouseId:req.sourceWarehouseId, type:"STORE_ISSUE", qtyOut:moveQty, ref:req.no});
        postJournal(`Store issue ${req.no} to ${req.dept}`, [{account:"5200", debit:value2, credit:0},{account:"1200", debit:0, credit:value2}], req.no);
        state.storeIssues.push({id:nextId("si"), no:"SI-"+String(state.storeIssues.length+1).padStart(6,"0"), storeRequestId:req.id, dept:req.dept, warehouseId:req.sourceWarehouseId, itemId:l.itemId, qty:moveQty, value:value2, createdAt:nowIso()});
        l.transferred = round2(l.transferred + moveQty);
        remaining = round2(remaining - moveQty);
      }
    }

    if(remaining>0.0001){
      const existing = state.storePurchaseRequests.find(p=>p.storeRequestId===req.id && p.status!=="Rejected" && p.lines.some(x=>x.itemId===l.itemId));
      if(!existing){
        const pr = {id:nextId("spr"), no:"SPR-"+String(state.storePurchaseRequests.length+1).padStart(6,"0"), storeRequestId:req.id,
          lines:[{itemId:l.itemId, qty:remaining, quotedPrice:0}], status:"Pending Approval", supplierId:null, poId:null,
          history:[{status:"Pending Approval", note:`Raised from Store Request ${req.no} due to stock shortfall.`, at:nowIso()}], createdAt:nowIso()};
        state.storePurchaseRequests.push(pr);
        notes.push(`Raised ${pr.no} for the outstanding ${fmt(remaining)} ${item.uom} ${item.name}.`);
      } else {
        notes.push(`${fmt(remaining)} ${item.uom} ${item.name} still awaiting ${existing.no}.`);
      }
    }
  });

  const avail = requestAvailability(req);
  const hasOpenPr = state.storePurchaseRequests.some(p=>p.storeRequestId===req.id && p.status!=="Rejected");
  const newStatus = avail.allDone ? "Done" : ((avail.anyDone||hasOpenPr) ? "Partial" : "Confirmed");
  srHistoryPush(req, newStatus, notes.join(" ") || "No stock movement was possible yet.");
  saveState(); renderStoreRequestsTable(); renderStoreIssuesTable(); renderStoreTransfersTable(); renderStorePrTable(); refreshSrModal();
}
export function markStoreRequestComplete(id){
  const req = state.storeRequests.find(r=>r.id===id); if(!req||req.status!=="Done") return;
  srHistoryPush(req, "Complete", "Acknowledged received by the requesting department. Request closed.");
  saveState(); renderStoreRequestsTable(); refreshSrModal();
}

export function approveStorePr(id){
  const pr = state.storePurchaseRequests.find(p=>p.id===id); if(!pr||pr.status!=="Pending Approval") return;
  pr.status="Approved"; pr.history.push({status:"Approved", note:"Approved — ready for supplier quote.", at:nowIso()});
  saveState(); renderStorePrTable(); refreshPrModal();
}
export function rejectStorePr(id){
  const pr = state.storePurchaseRequests.find(p=>p.id===id); if(!pr||pr.status!=="Pending Approval") return;
  const reason = prompt("Reason for rejection:"); if(reason===null) return;
  pr.status="Rejected"; pr.history.push({status:"Rejected", note:reason.trim()||"No reason given.", at:nowIso()});
  saveState(); renderStorePrTable(); refreshPrModal();
}
export function saveStorePrQuote(id){
  const pr = state.storePurchaseRequests.find(p=>p.id===id); if(!pr||pr.status!=="Approved") return;
  const supplierId = val("prqSupplier");
  if(!supplierId){ alert("Pick a supplier."); return; }
  let ok = true;
  pr.lines.forEach((l,i)=>{ const price = parseFloat(val("prqPrice_"+i)); if(!price||price<=0) ok=false; else l.quotedPrice=round2(price); });
  if(!ok){ alert("Enter a positive quoted price for every line."); return; }
  pr.supplierId = supplierId; pr.status="Quoted";
  pr.history.push({status:"Quoted", note:`Quote captured from ${supplierById(supplierId).name}.`, at:nowIso()});
  saveState(); renderStorePrTable(); refreshPrModal();
}
export function sendStorePrToProcurement(id){
  const pr = state.storePurchaseRequests.find(p=>p.id===id); if(!pr||pr.status!=="Quoted") return;
  const lines = pr.lines.map(l=>({itemId:l.itemId, qty:l.qty, price:l.quotedPrice||0, qtyReceived:0}));
  const po = {id:nextId("purchord"), no:"P"+String(10000+state.purchaseOrders.length+1).slice(1), supplierId:pr.supplierId, prId:null, lines,
    status:"Purchase Order", buyer:"Admin", company:"Debora Food Complex", orderDeadline:null, acknowledged:false,
    controlPolicy:"received", approvalStatus:"none", managerApproved:false, history:[], createdAt:nowIso(), storeRef:pr.no};
  state.purchaseOrders.push(po);
  pr.poId = po.id; pr.status="Sent to Procurement";
  pr.history.push({status:"Sent to Procurement", note:`Created ${po.no} in Purchase → Purchase Orders.`, at:nowIso()});
  const req = state.storeRequests.find(r=>r.id===pr.storeRequestId);
  if(req) req.history.push({status:req.status, note:`Procurement: ${po.no} created from ${pr.no}. Receive it via Purchase → Goods Receipts into ${whById(req.sourceWarehouseId).name}, then return here and click "Check availability & process" to complete the issue.`, at:nowIso()});
  saveState(); renderStorePrTable(); refreshPrModal();
}

let __openSrId=null, __openPrId=null;
export function openSrModal(id){ __openSrId=id; el("srModalBody").innerHTML = renderSrModalBody(id); new window.bootstrap.Modal(el("srModal")).show(); }
export function refreshSrModal(){ if(__openSrId && el("srModal") && el("srModal").classList.contains("show")) el("srModalBody").innerHTML = renderSrModalBody(__openSrId); }
export function openPrModal(id){ __openPrId=id; el("prModalBody").innerHTML = renderPrModalBody(id); new window.bootstrap.Modal(el("prModal")).show(); }
export function refreshPrModal(){ if(__openPrId && el("prModal") && el("prModal").classList.contains("show")) el("prModalBody").innerHTML = renderPrModalBody(__openPrId); }

function renderSrModalBody(id){
  const req = state.storeRequests.find(r=>r.id===id); if(!req) return "";
  const avail = requestAvailability(req);
  let linesHtml = `<div class="table-responsive"><table class="table table-sm table-hover">
    <thead><tr><th>#</th><th>Product</th><th>Available at Source</th><th>Transferred</th><th>Demand</th></tr></thead><tbody>`;
  avail.rows.forEach((r,i)=>{
    const item = itemById(r.itemId);
    linesHtml += `<tr><td>${i+1}</td><td>${item.name}</td><td>${fmt(r.atSource)} ${item.uom}</td>
      <td>${fmt(r.transferred)} ${item.uom}</td><td>${fmt(r.demand)} ${item.uom}</td></tr>`;
  });
  linesHtml += `</tbody></table></div>`;

  let actions = "";
  if(req.status==="To Check"){
    actions = `<button class="btn btn-brand btn-sm me-2" onclick="window.__srApprove('${req.id}')"><i class="bi bi-check2"></i> Approve</button>
      <button class="btn btn-outline-secondary btn-sm text-danger" onclick="window.__srReject('${req.id}')"><i class="bi bi-x"></i> Reject</button>`;
  } else if(["Confirmed","Partial"].includes(req.status)){
    actions = `<button class="btn btn-brand btn-sm" onclick="window.__srProcess('${req.id}')"><i class="bi bi-arrow-repeat"></i> Check availability &amp; process</button>`;
  } else if(req.status==="Done"){
    actions = `<button class="btn btn-brand btn-sm" onclick="window.__srComplete('${req.id}')"><i class="bi bi-check2-all"></i> Mark Complete</button>`;
  }

  return `
    ${stepper(req.status)}
    <div class="o-kv-block mb-3">
      ${kv("Reference", `<span class="o-mono">${req.no}</span>`)}
      ${kv("Operation Type", "Internal Transfer")}
      ${kv("Source Location", whById(req.sourceWarehouseId).name)}
      ${kv("Destination Location", whById(req.destinationWarehouseId).name)}
      ${kv("Scheduled date", timeShort(req.scheduledDate))}
      ${kv("Effective Date", timeShort(req.effectiveDate))}
      ${kv("Requested By", req.requestedBy)}
      ${kv("Department", req.dept)}
    </div>
    <div class="o-group-title first">Items</div>
    ${linesHtml}
    ${req.notes?`<div class="o-group-title">Notes</div><div style="font-size:12.5px;">${req.notes}</div>`:""}
    ${actions?`<div class="mt-3">${actions}</div>`:""}
    <div class="o-group-title">Chatter</div>
    ${historyList(req.history)}
  `;
}

function renderPrModalBody(id){
  const pr = state.storePurchaseRequests.find(p=>p.id===id); if(!pr) return "";
  const req = state.storeRequests.find(r=>r.id===pr.storeRequestId);
  let linesHtml = `<div class="table-responsive"><table class="table table-sm table-hover"><thead><tr><th>Item</th><th>Qty</th>${pr.status!=="Pending Approval"&&pr.status!=="Approved"?"<th>Quoted price</th><th>Line total</th>":""}</tr></thead><tbody>`;
  let total=0;
  pr.lines.forEach(l=>{
    const item = itemById(l.itemId);
    const lt = (l.quotedPrice||0)*l.qty; total+=lt;
    linesHtml += `<tr><td>${item.name}</td><td>${fmt(l.qty)} ${item.uom}</td>${pr.status!=="Pending Approval"&&pr.status!=="Approved"?`<td>${etb(l.quotedPrice||0)}</td><td>${etb(lt)}</td>`:""}</tr>`;
  });
  linesHtml += `</tbody></table></div>`;

  let actions = "";
  if(pr.status==="Pending Approval"){
    actions = `<button class="btn btn-brand btn-sm me-2" onclick="window.__prApprove('${pr.id}')"><i class="bi bi-check2"></i> Approve</button>
      <button class="btn btn-outline-secondary btn-sm text-danger" onclick="window.__prReject('${pr.id}')"><i class="bi bi-x"></i> Reject</button>`;
  } else if(pr.status==="Approved"){
    actions = `<label class="form-label">Supplier</label><select class="form-select form-select-sm mb-2" id="prqSupplier">${opts(state.suppliers, s=>s.name)}</select>
      ${pr.lines.map((l,i)=>`<div class="row g-2 mb-1"><div class="col-7 pt-1" style="font-size:12px;">${itemById(l.itemId).name} (${fmt(l.qty)} ${itemById(l.itemId).uom})</div><div class="col-5"><input class="form-control form-control-sm" type="number" step="0.01" placeholder="Unit price" id="prqPrice_${i}"></div></div>`).join("")}
      <button class="btn btn-brand btn-sm mt-2" onclick="window.__prSaveQuote('${pr.id}')"><i class="bi bi-save"></i> Save Quote</button>`;
  } else if(pr.status==="Quoted"){
    actions = `<div class="mb-2" style="font-size:12.5px;">Quote total: <b>${etb(total)}</b> from <b>${pr.supplierId?supplierById(pr.supplierId).name:"—"}</b></div>
      <button class="btn btn-brand btn-sm" onclick="window.__prSend('${pr.id}')"><i class="bi bi-send"></i> Send to Procurement</button>`;
  } else if(pr.status==="Sent to Procurement"){
    actions = `<div class="alert alert-success py-2 px-3" style="font-size:12.5px;">Sent to Procurement as <b>${state.purchaseOrders.find(p=>p.id===pr.poId)?.no||"—"}</b>. Continue in Purchase → Purchase Orders / Goods Receipts.</div>`;
  }

  return `
    <div class="o-kv-block mb-3">
      ${kv("Request No.", `<span class="o-mono">${pr.no}</span>`)}
      ${kv("From Store Request", req?`<span class="o-mono">${req.no}</span> (${req.dept})`:"—")}
      ${kv("Status", badge(pr.status))}
    </div>
    <div class="o-group-title first">Lines</div>
    ${linesHtml}
    ${actions?`<div class="mt-3">${actions}</div>`:""}
    <div class="o-group-title">Workflow history</div>
    ${historyList(pr.history)}
  `;
}

export function renderStoreRequestsPage(){
  const nowDT = nowForDatetimeLocal();
  el("content").innerHTML = formTablePage({
    formTitle:"New store request",
    formBody:`
      <label class="form-label">Requesting department</label>
      <select class="form-select mb-2" id="srDept">${state.departments.map(d=>`<option>${d.name}</option>`).join("")}</select>
      <label class="form-label">Requested by</label>
      <input class="form-control mb-2" id="srBy" placeholder="Employee name">
      <div class="row g-2">
        <div class="col"><label class="form-label">Source Location</label><select class="form-select mb-2" id="srSource">${opts(state.warehouses, w=>w.name)}</select></div>
        <div class="col"><label class="form-label">Destination Location</label><select class="form-select mb-2" id="srDest">${opts(state.warehouses, w=>w.name)}</select></div>
      </div>
      <div class="row g-2">
        <div class="col"><label class="form-label">Scheduled date</label><input type="datetime-local" class="form-control mb-2" id="srSched" value="${nowDT}"></div>
        <div class="col"><label class="form-label">Effective Date</label><input type="datetime-local" class="form-control mb-2" id="srEff" value="${nowDT}"></div>
      </div>
      <label class="form-label">Items requested</label>
      <div class="o-linebuilder" id="srLineBuilder"></div>
      <button class="btn btn-outline-dashed btn-sm mt-2" id="btnSrAddLine">+ Add item</button>
      <label class="form-label mt-2">Notes</label>
      <input class="form-control mb-2" id="srNotes" placeholder="Justification / notes">
      <button class="btn btn-brand btn-sm mt-2" id="btnSrSubmit">Request</button>
      <div id="srNote"></div>`,
    tableTitle:"Store requests",
    tableHead:["Reference","Source","Destination","Scheduled date","Requested By","Status"],
    tableBodyId:"srTable",
    extraFormNote:"Flow: Department → Store Request → Approval → IPC/Warehouse review → Store Issue, Transfer Order, or Purchase Request → Procurement. Click a row to open it."
  });
  draftLines.sr = draftLines.sr||[];
  renderSrLineBuilder();
  el("btnSrAddLine").onclick = ()=>{ draftLines.sr.push({itemId:state.items[0].id, qty:1}); renderSrLineBuilder(); };
  el("btnSrSubmit").onclick = submitStoreRequest;
  renderStoreRequestsTable();
}

function renderSrLineBuilder(){
  const c = el("srLineBuilder"); if(!c) return;
  if(!draftLines.sr.length){ c.innerHTML = `<div class="text-muted" style="font-size:12px;">No items yet.</div>`; return; }
  c.innerHTML = draftLines.sr.map((l,i)=>`
    <div class="lb-row" style="grid-template-columns:2fr 1fr auto;">
      <select class="form-select form-select-sm" onchange="window.__srlUpd(${i},'itemId',this.value)">${state.items.map(it=>`<option value="${it.id}" ${it.id===l.itemId?'selected':''}>${it.name}</option>`).join("")}</select>
      <input class="form-control form-control-sm" type="number" step="0.01" placeholder="Demand qty" value="${l.qty||''}" oninput="window.__srlUpd(${i},'qty',this.value)">
      <button class="btn btn-sm btn-outline-danger" onclick="window.__srlDel(${i})"><i class="bi bi-x"></i></button>
    </div>`).join("");
}

export function submitStoreRequest(){
  const dept = val("srDept"); const by = val("srBy").trim();
  const sourceWarehouseId = val("srSource"), destinationWarehouseId = val("srDest");
  const schedRaw = val("srSched"), effRaw = val("srEff");
  const scheduledDate = schedRaw ? new Date(schedRaw).toISOString() : nowIso();
  const effectiveDate = effRaw ? new Date(effRaw).toISOString() : nowIso();
  const notes = val("srNotes").trim();
  const lines = draftLines.sr.filter(l=>l.itemId && l.qty>0).map(l=>({itemId:l.itemId, demand:round2(l.qty), transferred:0}));
  if(!dept||!by||!sourceWarehouseId||!destinationWarehouseId||sourceWarehouseId===destinationWarehouseId||!lines.length){
    flash("srNote","Fill in department, requester, two different locations, and at least one item.","warn"); return; }
  const d = new Date();
  const ref = `TR/${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}/${state.storeRequests.length+1}`;
  const req = {id:nextId("sr"), no:ref, dept, requestedBy:by, sourceWarehouseId, destinationWarehouseId, scheduledDate, effectiveDate, notes, lines,
    status:"To Check", history:[{status:"To Check", note:`Requested by ${by} (${dept}).`, at:nowIso()}], createdAt:nowIso()};
  state.storeRequests.push(req);
  draftLines.sr = []; renderSrLineBuilder();
  flash("srNote",`${ref} submitted for approval.`,"ok");
  saveState(); renderStoreRequestsTable();
}

export function renderStoreRequestsTable(){
  const c = el("srTable"); if(!c) return;
  c.innerHTML = state.storeRequests.slice().reverse().map(r=>
    `<tr style="cursor:pointer;" onclick="window.__openSr('${r.id}')">
      <td class="o-mono">${r.no}</td><td>${whById(r.sourceWarehouseId).name}</td><td>${whById(r.destinationWarehouseId).name}</td>
      <td>${timeShort(r.scheduledDate)}</td><td>${r.requestedBy}</td><td>${badge(r.status)}</td></tr>`
  ).join("") || emptyState("No store requests yet.",6);
}

export function renderStorePrTable(){
  const c = el("sprTable"); if(!c) return;
  c.innerHTML = state.storePurchaseRequests.slice().reverse().map(pr=>{
    const req = state.storeRequests.find(r=>r.id===pr.storeRequestId);
    return `<tr><td class="o-mono">${pr.no}</td><td class="o-mono">${req?req.no:"—"}</td><td>${pr.lines.length} item(s)</td><td>${badge(pr.status)}</td>
      <td><button class="btn btn-sm btn-outline-secondary" onclick="window.__openPr('${pr.id}')"><i class="bi bi-eye"></i> Review</button></td></tr>`;
  }).join("") || emptyState("No store purchase requests yet.",5);
}

export function renderStoreIssuesTable(){
  const c = el("siTable"); if(!c) return;
  c.innerHTML = state.storeIssues.slice().reverse().map(si=>{
    const req = state.storeRequests.find(r=>r.id===si.storeRequestId);
    return `<tr><td class="o-mono">${si.no}</td><td class="o-mono">${req?req.no:"—"}</td><td>${si.dept}</td><td>${whById(si.warehouseId).name}</td><td>${etb(si.value)}</td><td>${timeShort(si.createdAt)}</td></tr>`;
  }).join("") || emptyState("No store issues yet.",6);
}

export function renderStoreTransfersTable(){
  const c = el("strTable"); if(!c) return;
  const rows = state.transfers.filter(t=>t.ref && t.ref.indexOf("TR/")===0);
  c.innerHTML = rows.slice().reverse().map(t=>{
    const req = state.storeRequests.find(r=>r.no===t.ref);
    return `<tr><td>${timeShort(t.time)}</td><td class="o-mono">${req?req.no:t.ref}</td><td>${itemById(t.itemId).name}</td><td>${whById(t.from).name}</td><td>${whById(t.to).name}</td><td>${fmt(t.qty)}</td></tr>`;
  }).join("") || emptyState("No store-driven transfer orders yet.",6);
}

window.__srlUpd = (i,f,v)=>{ draftLines.sr[i][f] = f==="itemId"?v:parseFloat(v)||0; };
window.__srlDel = (i)=>{ draftLines.sr.splice(i,1); renderSrLineBuilder(); };
window.__openSr = openSrModal;
window.__openPr = openPrModal;
window.__srApprove = approveStoreRequest;
window.__srReject = rejectStoreRequest;
window.__srProcess = processStoreRequest;
window.__srComplete = markStoreRequestComplete;
window.__prApprove = approveStorePr;
window.__prReject = rejectStorePr;
window.__prSaveQuote = saveStorePrQuote;
window.__prSend = sendStorePrToProcurement;
