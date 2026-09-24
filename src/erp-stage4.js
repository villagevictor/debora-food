import {
  state, nextId, fmt, etb, itemById, whById, customerById,
  nowIso, timeShort, round2, el, val, emptyState, flash, badge,
  postJournal, stockOnHand, totalOnHand, postLedger, saveState, inventoryAssetValue, accountBalance
} from "./erp-helpers.js";

// ==========================================
// 1. FIELD AGENTS MODULE
// ==========================================

export function renderAgentsDirectory(){
  const totalQuota = state.agents.reduce((s, a) => s + a.quota, 0);
  const totalSales = state.agents.reduce((s, a) => s + a.currentSales, 0);

  el("content").innerHTML = `
    <!-- AGENTS METRICS -->
    <div class="row g-3 mb-3">
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value">${state.agents.length}</div>
          <div class="kpi-label">Active Field Agents</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value">${etb(totalQuota)}</div>
          <div class="kpi-label">Total Regional Sales Target</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value text-success">${etb(totalSales)}</div>
          <div class="kpi-label">Actual Sales Achieved (${totalQuota ? Math.round(totalSales/totalQuota*100) : 0}%)</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value text-primary">${state.warehouses.filter(w=>w.id.startsWith("wh-ag")).length}</div>
          <div class="kpi-label">Regional Agent Storage Hubs</div>
        </div>
      </div>
    </div>

    <!-- AGENTS DIRECTORY TABLE -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-person-workspace me-2"></i>Field Agents &amp; Regional Hubs</h5>
          <div class="text-muted small">Decentralized flour distribution, regional consigned stocks, and agent sales performance</div>
        </div>
        <button class="btn btn-brand btn-sm" onclick="window.__agentNew()"><i class="bi bi-person-plus me-1"></i>Add Agent</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Agent ID</th><th>Agent Name</th><th>Assigned Territory</th><th>Regional Depot</th><th>Phone</th><th>Commission</th><th>Target Quota</th><th>Actual Sales</th><th>Performance</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${state.agents.map(a => {
                const wh = state.warehouses.find(w => w.id === a.warehouseId)?.name || "Regional Hub";
                const pct = a.quota ? Math.min(100, Math.round(a.currentSales / a.quota * 100)) : 0;
                return `
                  <tr>
                    <td class="o-mono fw-bold">${a.code}</td>
                    <td class="fw-bold">${a.name}</td>
                    <td><span class="badge bg-light text-dark border">${a.territory}</span></td>
                    <td class="small text-muted"><i class="bi bi-building me-1"></i>${wh}</td>
                    <td>${a.phone}</td>
                    <td>${a.commissionRate}%</td>
                    <td>${etb(a.quota)}</td>
                    <td class="fw-bold text-success">${etb(a.currentSales)}</td>
                    <td style="min-width:110px;">
                      <div class="small fw-bold mb-1">${pct}%</div>
                      <div class="progress" style="height:6px;">
                        <div class="progress-bar ${pct>=80?'bg-success':(pct>=50?'bg-primary':'bg-warning')}" style="width:${pct}%;"></div>
                      </div>
                    </td>
                    <td>${badge(a.status)}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

window.__agentNew = () => {
  const name = prompt("Field Agent Full Name:");
  if(!name || !name.trim()) return;
  const territory = prompt("Assigned Territory / Region (e.g. Hawassa, Dire Dawa, Bahir Dar):", "Jimma & Southwest");
  const phone = prompt("Phone Number:", "+251 9" + Math.floor(10000000 + Math.random() * 90000000));
  const quota = parseFloat(prompt("Sales Target Quota (ETB):", "1500000")) || 1000000;

  const agentWhId = "wh-ag-" + (state.warehouses.filter(w=>w.id.startsWith("wh-ag")).length + 1);
  state.warehouses.push({
    id: agentWhId,
    name: `${territory} Agent Depot`,
    stepsIncoming: 1, stepsOutgoing: 1, stepsManufacture: 1
  });

  const newAgent = {
    id: nextId("ag"),
    code: "AGT-" + String(state.agents.length + 1).padStart(3, "0"),
    name: name.trim(),
    territory: territory || "Regional",
    warehouseId: agentWhId,
    phone: phone || "+251 911 000000",
    commissionRate: 3.5,
    quota: round2(quota),
    currentSales: 0,
    status: "Active"
  };

  state.agents.push(newAgent);
  saveState();
  renderAgentsDirectory();
};

export function renderAgentDispatchPage(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-box-arrow-up-right me-2"></i>Stock Transfers to Regional Agents</h5>
          <div class="text-muted small">Consignment shipments dispatched from Factory Finished Goods store to Agent Depots</div>
        </div>
        <button class="btn btn-brand btn-sm" onclick="window.__agentNewTransfer()"><i class="bi bi-plus-lg me-1"></i>Dispatch Stock to Agent</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Transfer Ref</th><th>Date</th><th>Agent</th><th>Destination Depot</th><th>Items Transferred</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${state.agentTransfers.slice().reverse().map(t => {
                const ag = state.agents.find(a => a.id === t.agentId);
                const wh = state.warehouses.find(w => w.id === t.toWh);
                const itemsText = t.items.map(i => `${i.qty}x ${itemById(i.itemId)?.name || 'Flour'}`).join(", ");
                return `
                  <tr>
                    <td class="o-mono fw-bold">${t.no}</td>
                    <td>${timeShort(t.date)}</td>
                    <td class="fw-bold"><i class="bi bi-person me-1"></i>${ag?.name || 'Agent'}</td>
                    <td>${wh?.name || 'Agent Depot'}</td>
                    <td class="small">${itemsText}</td>
                    <td>${badge(t.status)}</td>
                    <td>
                      ${t.status === 'In Transit' ? `
                        <button class="btn btn-sm btn-success" onclick="window.__agentConfirmTransfer('${t.id}')">
                          <i class="bi bi-check2-circle me-1"></i>Confirm Receipt at Depot
                        </button>
                      ` : ''}
                    </td>
                  </tr>
                `;
              }).join("")}
              ${state.agentTransfers.length === 0 ? emptyState("No agent transfers recorded yet.", 7) : ""}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

window.__agentNewTransfer = () => {
  if(!state.agents.length){ alert("Please register a Field Agent first."); return; }
  const agent = state.agents[0];
  const item = itemById("itm-duket") || state.items[0];
  const qty = parseFloat(prompt(`Enter quantity of ${item.name} to transfer from Factory FG to ${agent.name}'s depot:`, "50")) || 0;
  if(qty <= 0) return;

  const avail = stockOnHand(item.id, "wh-fg");
  if(qty > avail){
    alert(`Only ${fmt(avail)} available in Finished Goods Warehouse.`);
    return;
  }

  const trfNo = "AGT-TRF-" + String(100 + state.agentTransfers.length + 1);

  // Relieve stock from Central Finished Goods
  postLedger({
    itemId: item.id,
    warehouseId: "wh-fg",
    type: "AGENT_TRANSFER_OUT",
    qtyOut: qty,
    ref: trfNo
  });

  state.agentTransfers.push({
    id: nextId("atrp"),
    no: trfNo,
    agentId: agent.id,
    toWh: agent.warehouseId,
    items: [{ itemId: item.id, qty: qty }],
    status: "In Transit",
    date: nowIso()
  });

  saveState();
  renderAgentDispatchPage();
  alert(`Dispatched ${qty} ${item.uom} to ${agent.name} (${trfNo}). Status set to 'In Transit'.`);
};

window.__agentConfirmTransfer = (transferId) => {
  const trf = state.agentTransfers.find(t => t.id === transferId);
  if(!trf || trf.status !== "In Transit") return;

  // Post stock into Agent's Depot
  trf.items.forEach(i => {
    const item = itemById(i.itemId);
    postLedger({
      itemId: i.itemId,
      warehouseId: trf.toWh,
      type: "AGENT_TRANSFER_IN",
      qtyIn: i.qty,
      unitCost: item?.avgCost || 0,
      ref: trf.no
    });
  });

  trf.status = "Received";
  saveState();
  renderAgentDispatchPage();
  alert(`Transfer ${trf.no} confirmed! Stock now active in regional depot.`);
};

export function renderAgentSalesPage(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-receipt me-2"></i>Field Agent Sales Invoices</h5>
          <div class="text-muted small">Regional sales orders delivered from consigned field agent warehouses</div>
        </div>
        <button class="btn btn-brand btn-sm" onclick="window.__agentNewSale()"><i class="bi bi-plus-lg me-1"></i>Record Agent Sale</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Invoice Ref</th><th>Date</th><th>Agent</th><th>Customer</th><th>Product &amp; Qty</th><th>Total Amount</th><th>Deposit Slip Ref</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${state.agentSales.slice().reverse().map(s => {
                const ag = state.agents.find(a => a.id === s.agentId);
                const itemsStr = s.items.map(i => `${i.qty}x ${itemById(i.itemId)?.name || 'Flour'}`).join(", ");
                return `
                  <tr>
                    <td class="o-mono fw-bold">${s.no}</td>
                    <td>${timeShort(s.date)}</td>
                    <td class="fw-bold">${ag?.name || 'Agent'}</td>
                    <td>${s.customer}</td>
                    <td class="small">${itemsStr}</td>
                    <td class="fw-bold text-primary">${etb(s.total)}</td>
                    <td><span class="badge bg-light text-dark border">${s.bankSlipRef || 'Pending'}</span></td>
                    <td>${badge(s.status)}</td>
                  </tr>
                `;
              }).join("")}
              ${state.agentSales.length === 0 ? emptyState("No agent sales recorded yet.", 8) : ""}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

window.__agentNewSale = () => {
  if(!state.agents.length){ alert("No agents available."); return; }
  const agent = state.agents[0];
  const cust = prompt("Customer Name in Agent's Territory:", "Hawassa Bakery Union");
  if(!cust || !cust.trim()) return;

  const item = itemById("itm-duket") || state.items[0];
  const qty = parseFloat(prompt(`Enter quantity of ${item.name} sold:`, "20")) || 0;
  if(qty <= 0) return;

  const price = item.retailPrice || 2350;
  const total = round2(qty * price);
  const invNo = "AG-INV-" + String(100 + state.agentSales.length + 1);

  // Deduct from agent warehouse
  postLedger({
    itemId: item.id,
    warehouseId: agent.warehouseId,
    type: "AGENT_SALE_OUT",
    qtyOut: qty,
    ref: invNo
  });

  agent.currentSales = round2(agent.currentSales + total);

  state.agentSales.push({
    id: nextId("asale"),
    no: invNo,
    agentId: agent.id,
    customer: cust.trim(),
    items: [{ itemId: item.id, qty: qty, price: price }],
    total: total,
    status: "Pending Settlement",
    bankSlipRef: "CBE-DEP-" + Math.floor(100000 + Math.random() * 900000),
    date: nowIso()
  });

  saveState();
  renderAgentSalesPage();
  alert(`Agent sale ${invNo} recorded for ${etb(total)}. Ready for Finance settlement.`);
};

export function renderAgentSettlementPage(){
  const pending = state.agentSales.filter(s => s.status === "Pending Settlement");
  const pendingTotal = pending.reduce((s, a) => s + a.total, 0);

  el("content").innerHTML = `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-cash-coin me-2"></i>Field Collections &amp; Finance Settlement</h5>
          <div class="text-muted small">Verify agent bank deposit slips and post collected cash directly to general ledger</div>
        </div>
        <span class="badge bg-warning text-dark fs-6">${etb(pendingTotal)} Pending Settlement</span>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Invoice Ref</th><th>Agent</th><th>Customer</th><th>Collected Amount</th><th>Deposit Slip / Reference</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${state.agentSales.slice().reverse().map(s => {
                const ag = state.agents.find(a => a.id === s.agentId);
                return `
                  <tr>
                    <td class="o-mono fw-bold">${s.no}</td>
                    <td class="fw-bold">${ag?.name || 'Agent'}</td>
                    <td>${s.customer}</td>
                    <td class="fw-bold text-success">${etb(s.total)}</td>
                    <td><span class="badge bg-light text-dark border">${s.bankSlipRef || 'N/A'}</span></td>
                    <td>${badge(s.status)}</td>
                    <td>
                      ${s.status === 'Pending Settlement' ? `
                        <button class="btn btn-sm btn-brand" onclick="window.__agentSettle('${s.id}')">
                          <i class="bi bi-check2-all me-1"></i>Verify &amp; Settle to Bank
                        </button>
                      ` : '<span class="text-muted small"><i class="bi bi-check-lg text-success"></i> Reconciled</span>'}
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

window.__agentSettle = (saleId) => {
  const sale = state.agentSales.find(s => s.id === saleId);
  if(!sale || sale.status !== "Pending Settlement") return;

  // Journal Entry: Dr 1000 Bank / Cr 4000 Sales Revenue
  postJournal(`Field Agent Settlement ${sale.no} (${sale.bankSlipRef})`, [
    {account: "1000", debit: sale.total, credit: 0},
    {account: "4000", debit: 0, credit: sale.total}
  ], sale.no);

  sale.status = "Settled";
  saveState();
  renderAgentSettlementPage();
  alert(`Settlement ${sale.no} complete! ${etb(sale.total)} confirmed into Company Bank Account.`);
};


// ==========================================
// 2. APPROVALS ENGINE MODULE
// ==========================================

export function renderApprovalsPendingPage(){
  const pending = state.approvals.filter(a => a.status === "Pending");
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-inbox-fill me-2"></i>Pending Supervisory Approvals (${pending.length})</h5>
          <div class="text-muted small">Multi-tier sign-off engine for purchase orders, store requisitions, and capital disbursements</div>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Approval Ref</th><th>Document Type</th><th>Target Ref</th><th>Requestor</th><th>Department</th><th>Amount</th><th>Urgency</th><th>Submitted</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${pending.map(a => `
                <tr>
                  <td class="o-mono fw-bold">${a.no}</td>
                  <td><span class="badge bg-light text-dark border">${a.docType}</span></td>
                  <td class="o-mono fw-bold text-primary">${a.docRef}</td>
                  <td>${a.requestor}</td>
                  <td>${a.department}</td>
                  <td class="fw-bold">${etb(a.amount)}</td>
                  <td><span class="badge ${a.urgency==='High'?'bg-danger':'bg-warning'}">${a.urgency}</span></td>
                  <td>${timeShort(a.requestedAt)}</td>
                  <td>
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-success" onclick="window.__approvalAction('${a.id}', 'Approve')"><i class="bi bi-check-lg me-1"></i>Approve</button>
                      <button class="btn btn-outline-danger" onclick="window.__approvalAction('${a.id}', 'Reject')"><i class="bi bi-x-lg me-1"></i>Reject</button>
                    </div>
                  </td>
                </tr>
              `).join("")}
              ${pending.length === 0 ? emptyState("All caught up! No pending approvals waiting for your sign-off.", 9) : ""}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

window.__approvalAction = (id, action) => {
  const appr = state.approvals.find(a => a.id === id);
  if(!appr) return;

  if(action === "Approve"){
    appr.status = "Approved";
    appr.approvedBy = "General Manager";
    appr.approvedAt = nowIso();

    // Link back to source documents if matching
    if(appr.docType === "Store Request"){
      const sr = state.storeRequests.find(r => r.no === appr.docRef);
      if(sr && sr.status === "Pending") sr.status = "Approved";
    } else if(appr.docType === "Purchase Order"){
      const po = state.purchaseOrders.find(p => p.no === appr.docRef);
      if(po && po.status === "draft") po.status = "confirmed";
    }
    alert(`Document ${appr.docRef} successfully Approved!`);
  } else {
    const reason = prompt("Enter Rejection Reason:", "Exceeds monthly department allocation");
    if(reason === null) return;
    appr.status = "Rejected";
    appr.rejectionReason = reason;
    appr.approvedAt = nowIso();
    alert(`Document ${appr.docRef} was Rejected.`);
  }

  saveState();
  renderApprovalsPendingPage();
};

export function renderApprovalsHistoryPage(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white py-3">
        <h5 class="mb-0 fw-bold"><i class="bi bi-clock-history me-2"></i>Approval Audit Trail</h5>
        <div class="text-muted small">Historical record of all supervisory sign-offs and rejected submissions</div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Approval Ref</th><th>Document Type</th><th>Target Ref</th><th>Requestor</th><th>Amount</th><th>Decision</th><th>Signed By</th><th>Timestamp</th></tr>
            </thead>
            <tbody>
              ${state.approvals.slice().reverse().map(a => `
                <tr>
                  <td class="o-mono fw-bold">${a.no}</td>
                  <td>${a.docType}</td>
                  <td class="o-mono">${a.docRef}</td>
                  <td>${a.requestor}</td>
                  <td>${etb(a.amount)}</td>
                  <td>${badge(a.status)}</td>
                  <td>${a.approvedBy || '—'}</td>
                  <td>${timeShort(a.approvedAt || a.requestedAt)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export function renderApprovalsRulesPage(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-shield-check me-2"></i>Approval Rules Matrix</h5>
          <div class="text-muted small">Configure document types, spending thresholds, and mandatory approving roles</div>
        </div>
        <button class="btn btn-brand btn-sm" onclick="window.__approvalNewRule()"><i class="bi bi-plus-lg me-1"></i>New Rule</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Rule Name</th><th>Document Target</th><th>Value Threshold</th><th>Required Approver Role</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${state.approvalRules.map(r => `
                <tr>
                  <td class="fw-bold">${r.name}</td>
                  <td><span class="badge bg-light text-dark border">${r.docType}</span></td>
                  <td class="fw-bold">${r.threshold === 0 ? 'All Documents (No Minimum)' : etb(r.threshold)}</td>
                  <td><i class="bi bi-person-badge me-1"></i>${r.approverRole}</td>
                  <td>${badge(r.status)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

window.__approvalNewRule = () => {
  const name = prompt("Rule Name (e.g. High Value Scrap Approval):");
  if(!name || !name.trim()) return;
  const docType = prompt("Target Document (Purchase Order / Store Request / Expense / Scrap):", "Purchase Order");
  const threshold = parseFloat(prompt("Value Threshold in ETB (0 for all):", "15000")) || 0;
  const role = prompt("Required Approver Role (General Manager / Plant Manager / Finance Director):", "General Manager");

  state.approvalRules.push({
    id: nextId("ar"),
    name: name.trim(),
    docType: docType || "Purchase Order",
    threshold: round2(threshold),
    approverRole: role || "General Manager",
    status: "Active"
  });

  saveState();
  renderApprovalsRulesPage();
};


// ==========================================
// 3. REPORTING & ANALYTICS MODULE
// ==========================================

export function renderReportsOverview(){
  const inv = inventoryAssetValue();
  const ar = accountBalance("1100").net;
  const ap = -accountBalance("2000").net;
  const bank = accountBalance("1000").net;
  const revenue = -accountBalance("4000").net;
  const cogs = accountBalance("5000").net;
  const grossProfit = revenue - cogs;

  const totalFuelCost = state.fuelLogs.reduce((s, l) => s + l.totalCost, 0);
  const totalSalaries = state.payrollRuns.reduce((s, r) => s + r.totalGross, 0);
  const totalRepairs = accountBalance("6100").net;

  el("content").innerHTML = `
    <!-- EXECUTIVE KPI CARDS -->
    <div class="row g-3 mb-4">
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value text-primary">${etb(revenue)}</div>
          <div class="kpi-label">Total Realized Sales Revenue</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value text-success">${etb(grossProfit)}</div>
          <div class="kpi-label">Gross Margin (${revenue>0?Math.round(grossProfit/revenue*100):0}%)</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value">${etb(inv)}</div>
          <div class="kpi-label">Current Warehouse Inventory Value</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value text-info">${etb(bank)}</div>
          <div class="kpi-label">Liquid Bank &amp; Cash Balance</div>
        </div>
      </div>
    </div>

    <!-- OPERATIONS & LOGISTICS SUMMARY -->
    <div class="row g-3 mb-4">
      <div class="col-lg-6">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-white py-3 fw-bold"><i class="bi bi-pie-chart me-2"></i>Operating Expense Breakdown</div>
          <div class="card-body p-3">
            <div class="d-flex justify-content-between mb-2"><span>Salaries &amp; Wages (HR Payroll)</span><b>${etb(totalSalaries)}</b></div>
            <div class="d-flex justify-content-between mb-2"><span>Vehicle Fuel &amp; Transport</span><b>${etb(totalFuelCost)}</b></div>
            <div class="d-flex justify-content-between mb-2"><span>Plant &amp; Machine Repairs</span><b>${etb(totalRepairs)}</b></div>
            <div class="border-top pt-2 mt-3 d-flex justify-content-between fw-bold fs-6">
              <span>Total Operating Expenses:</span>
              <span class="text-danger">${etb(totalSalaries + totalFuelCost + totalRepairs)}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-6">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-white py-3 fw-bold"><i class="bi bi-truck me-2"></i>Fleet &amp; Logistics Performance</div>
          <div class="card-body p-3">
            <div class="d-flex justify-content-between mb-2"><span>Completed Haulage Trips</span><b>${state.fleetTrips.filter(t=>t.status==='Completed').length} trips</b></div>
            <div class="d-flex justify-content-between mb-2"><span>Total Distance Traveled</span><b>${fmt(state.fleetTrips.reduce((s,t)=>s+(t.distance||0),0),0)} km</b></div>
            <div class="d-flex justify-content-between mb-2"><span>Diesel Consumed</span><b>${fmt(state.fuelLogs.reduce((s,l)=>s+l.liters,0),0)} Liters</b></div>
            <div class="d-flex justify-content-between mb-2"><span>Active Delivery Vehicles</span><b>${state.vehicles.filter(v=>v.status==='Active').length} ready</b></div>
          </div>
        </div>
      </div>
    </div>

    <!-- EXPORT & PRINT ACTIONS -->
    <div class="card border-0 shadow-sm">
      <div class="card-body p-3 d-flex justify-content-between align-items-center">
        <div>
          <span class="fw-bold">Executive Report Actions</span>
          <div class="small text-muted">Generate instant audit exports or formatted PDF printouts</div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" onclick="window.__reportsExportCsv()"><i class="bi bi-file-earmark-spreadsheet me-1"></i>Export CSV</button>
          <button class="btn btn-brand btn-sm" onclick="window.print()"><i class="bi bi-printer me-1"></i>Print Report</button>
        </div>
      </div>
    </div>
  `;
}

window.__reportsExportCsv = () => {
  let csv = "Item Code,Item Name,Type,Unit Cost,Total On Hand,Total Value ETB\n";
  state.items.forEach(i => {
    const onHand = totalOnHand(i.id);
    const val = onHand * (i.avgCost || 0);
    csv += `"${i.code}","${i.name}","${i.type}",${i.avgCost||0},${onHand},${val}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Debora-ERP-Stock-Report-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
};

export function renderReportsSales(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-bar-chart-line-fill me-2"></i>Sales &amp; Revenue Analytics</h5>
          <div class="text-muted small">Channel sales breakdown across Wholesale, POS Retail, and Field Consignment Agents</div>
        </div>
        <button class="btn btn-sm btn-outline-secondary" onclick="window.print()"><i class="bi bi-printer me-1"></i>Print</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Sales Channel</th><th>Transaction Count</th><th>Volume Sold</th><th>Total Revenue</th><th>Share %</th></tr>
            </thead>
            <tbody>
              <tr>
                <td class="fw-bold"><i class="bi bi-shop me-2 text-primary"></i>Retail POS Terminals</td>
                <td>${state.posOrders.length} receipts</td>
                <td>${state.posOrders.reduce((s,o)=>s+o.lines.reduce((l,i)=>l+i.qty,0),0)} units</td>
                <td class="fw-bold">${etb(state.posOrders.reduce((s,o)=>s+o.total,0))}</td>
                <td><span class="badge bg-light text-dark border">POS Cash</span></td>
              </tr>
              <tr>
                <td class="fw-bold"><i class="bi bi-truck me-2 text-success"></i>Direct Wholesale Orders</td>
                <td>${state.salesOrders.length} orders</td>
                <td>${state.salesOrders.reduce((s,o)=>s+o.lines.reduce((l,i)=>l+i.qty,0),0)} units</td>
                <td class="fw-bold">${etb(state.salesOrders.reduce((s,o)=>s+o.total,0))}</td>
                <td><span class="badge bg-light text-dark border">Wholesale</span></td>
              </tr>
              <tr>
                <td class="fw-bold"><i class="bi bi-person-workspace me-2 text-info"></i>Regional Field Agents</td>
                <td>${state.agentSales.length} orders</td>
                <td>${state.agentSales.reduce((s,o)=>s+o.items.reduce((l,i)=>l+i.qty,0),0)} units</td>
                <td class="fw-bold">${etb(state.agentSales.reduce((s,o)=>s+o.total,0))}</td>
                <td><span class="badge bg-light text-dark border">Regional Consignment</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export function renderReportsInventory(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-boxes me-2"></i>Comprehensive Stock Valuation Ledger</h5>
          <div class="text-muted small">Raw grain silos, packaging store, finished flour bags, and regional agent consignment stocks</div>
        </div>
        <button class="btn btn-sm btn-outline-secondary" onclick="window.__reportsExportCsv()"><i class="bi bi-download me-1"></i>Download CSV</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Item Code</th><th>Product / Material</th><th>UoM</th><th>Category</th><th>Unit Avg Cost</th><th>Total On Hand</th><th>Asset Valuation</th></tr>
            </thead>
            <tbody>
              ${state.items.map(i => {
                const qty = totalOnHand(i.id);
                const val = round2(qty * (i.avgCost || 0));
                return `
                  <tr>
                    <td class="o-mono">${i.code}</td>
                    <td class="fw-bold">${i.name}</td>
                    <td>${i.uom}</td>
                    <td><span class="badge bg-light text-dark border">${i.type}</span></td>
                    <td>${etb(i.avgCost)}</td>
                    <td class="fw-bold ${qty>0?'text-success':'text-danger'}">${fmt(qty)}</td>
                    <td class="fw-bold text-primary">${etb(val)}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export function renderReportsFinancial(){
  const rev = -accountBalance("4000").net;
  const cogs = accountBalance("5000").net;
  const salaries = accountBalance("6000").net;
  const repairs = accountBalance("6100").net;
  const fuel = accountBalance("6200").net;
  const totalExp = salaries + repairs + fuel;
  const netIncome = rev - cogs - totalExp;

  el("content").innerHTML = `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-cash-stack me-2"></i>Profit &amp; Loss Statement (Financial Summary)</h5>
          <div class="text-muted small">Debora Food Complex Share Company · FY 2026</div>
        </div>
        <button class="btn btn-sm btn-brand" onclick="window.print()"><i class="bi bi-printer me-1"></i>Print P&amp;L</button>
      </div>
      <div class="card-body p-4">
        <table class="table table-bordered mb-0">
          <tbody>
            <tr class="table-light"><th colspan="2" class="fs-6">Revenue</th></tr>
            <tr><td>Gross Sales Revenue (Account 4000)</td><td class="text-end fw-bold">${etb(rev)}</td></tr>
            <tr class="table-light"><th colspan="2" class="fs-6">Cost of Goods Sold (COGS)</th></tr>
            <tr><td>Cost of Goods Sold (Account 5000)</td><td class="text-end fw-bold text-danger">(${etb(cogs)})</td></tr>
            <tr class="fw-bold table-secondary"><td>GROSS PROFIT</td><td class="text-end text-success">${etb(rev - cogs)}</td></tr>
            <tr class="table-light"><th colspan="2" class="fs-6">Operating Expenses</th></tr>
            <tr><td>Salary &amp; Wages Expense (Account 6000)</td><td class="text-end">(${etb(salaries)})</td></tr>
            <tr><td>Repairs &amp; Maintenance Expense (Account 6100)</td><td class="text-end">(${etb(repairs)})</td></tr>
            <tr><td>Fuel &amp; Fleet Logistics Expense (Account 6200)</td><td class="text-end">(${etb(fuel)})</td></tr>
            <tr class="fw-bold table-secondary"><td>TOTAL OPERATING EXPENSES</td><td class="text-end text-danger">(${etb(totalExp)})</td></tr>
            <tr class="fw-bold table-success fs-5"><td>NET OPERATING INCOME / (LOSS)</td><td class="text-end text-primary">${etb(netIncome)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}


// ==========================================
// 4. NOTIFICATIONS MODULE
// ==========================================

export function renderNotificationsInbox(){
  const unreadCount = state.notifications.filter(n => !n.read).length;

  el("content").innerHTML = `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-bell-fill me-2"></i>Enterprise Notification Center</h5>
          <div class="text-muted small">${unreadCount} unread system alerts, pending approvals, and operational warnings</div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-secondary" onclick="window.__notifMarkAllRead()"><i class="bi bi-check2-all me-1"></i>Mark All Read</button>
          <button class="btn btn-sm btn-brand" onclick="window.__notifAddSample()"><i class="bi bi-plus-lg me-1"></i>Test Alert</button>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="list-group list-group-flush">
          ${state.notifications.map(n => `
            <div class="list-group-item p-3 d-flex align-items-start justify-content-between gap-3 ${!n.read?'bg-light':''}">
              <div class="d-flex align-items-start gap-3">
                <div class="mt-1">
                  <i class="bi ${n.type==='approval'?'bi-shield-check text-warning':(n.type==='stock'?'bi-exclamation-triangle-fill text-danger':(n.type==='fleet'?'bi-truck text-primary':'bi-info-circle text-info'))}" style="font-size:22px;"></i>
                </div>
                <div>
                  <div class="fw-bold ${!n.read?'text-dark':'text-muted'}">${n.title}</div>
                  <div class="text-muted small mt-1">${n.desc}</div>
                  <div class="small text-muted mt-2"><i class="bi bi-clock me-1"></i>${timeShort(n.time)}</div>
                </div>
              </div>
              <div class="d-flex align-items-center gap-2">
                ${n.linkApp ? `<button class="btn btn-sm btn-outline-primary" onclick="window.__notifNavigate('${n.id}', '${n.linkApp}', '${n.linkItem}')">View</button>` : ''}
                ${!n.read ? `<button class="btn btn-sm btn-light border" onclick="window.__notifToggleRead('${n.id}')" title="Mark as Read"><i class="bi bi-check"></i></button>` : ''}
              </div>
            </div>
          `).join("")}
          ${state.notifications.length === 0 ? emptyState("No notifications in inbox.", 1) : ""}
        </div>
      </div>
    </div>
  `;
  updateNotificationBadge();
}

export function updateNotificationBadge(){
  const unreadCount = state.notifications ? state.notifications.filter(n => !n.read).length : 0;
  const badgeEl = el("oNotifBadge");
  if(badgeEl){
    if(unreadCount > 0){
      badgeEl.style.display = "inline-block";
      badgeEl.innerText = String(unreadCount);
    } else {
      badgeEl.style.display = "none";
    }
  }
}

window.__notifMarkAllRead = () => {
  state.notifications.forEach(n => n.read = true);
  saveState();
  renderNotificationsInbox();
};

window.__notifToggleRead = (id) => {
  const n = state.notifications.find(x => x.id === id);
  if(n){ n.read = !n.read; saveState(); renderNotificationsInbox(); }
};

window.__notifNavigate = (id, app, item) => {
  const n = state.notifications.find(x => x.id === id);
  if(n) n.read = true;
  saveState();
  window.__nav(app, item);
};

window.__notifAddSample = () => {
  state.notifications.unshift({
    id: nextId("notif"),
    type: "approval",
    title: "High-Volume Customer Order Received",
    desc: "Merkato Retail Distributor placed order for 250 bags Bekkolo Duket 50kg.",
    time: nowIso(),
    read: false,
    linkApp: "sales",
    linkItem: "orders"
  });
  saveState();
  renderNotificationsInbox();
};

export function renderNotificationsPreferences(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white py-3">
        <h5 class="mb-0 fw-bold"><i class="bi bi-sliders me-2"></i>Alert Preferences &amp; Subscriptions</h5>
        <div class="text-muted small">Configure which system triggers raise automated notifications in your inbox</div>
      </div>
      <div class="card-body p-4">
        <div class="form-check form-switch mb-3">
          <input class="form-check-input" type="checkbox" id="prefStock" checked>
          <label class="form-check-label fw-bold" for="prefStock">Low Raw Material &amp; Safety Stock Warnings</label>
          <div class="small text-muted">Notify immediately when grain silo falls below safety replenishment levels.</div>
        </div>
        <div class="form-check form-switch mb-3">
          <input class="form-check-input" type="checkbox" id="prefAppr" checked>
          <label class="form-check-label fw-bold" for="prefAppr">Document Approvals Inbox</label>
          <div class="small text-muted">Notify when store requests or purchase orders exceed authorization thresholds.</div>
        </div>
        <div class="form-check form-switch mb-3">
          <input class="form-check-input" type="checkbox" id="prefMaint" checked>
          <label class="form-check-label fw-bold" for="prefMaint">Plant Breakdown &amp; Maintenance Work Orders</label>
          <div class="small text-muted">Notify on critical equipment stoppages and repair completion.</div>
        </div>
        <button class="btn btn-brand btn-sm mt-2" onclick="alert('Notification preferences saved!')">Save Preferences</button>
      </div>
    </div>
  `;
}


// ==========================================
// 5. USERS & ACCESS RIGHTS / SETTINGS MODULE
// ==========================================

export function renderUsersPage(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-people-fill me-2"></i>Users &amp; Security</h5>
          <div class="text-muted small">Active logins, security credentials, and department assignment</div>
        </div>
        <button class="btn btn-brand btn-sm" onclick="window.__userCreate()"><i class="bi bi-person-plus me-1"></i>Create User</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Username</th><th>Full Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Last Login</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${state.users.map(u => `
                <tr>
                  <td class="o-mono fw-bold">${u.username}</td>
                  <td class="fw-bold">${u.name}</td>
                  <td>${u.email}</td>
                  <td><span class="badge bg-light text-dark border">${u.role}</span></td>
                  <td>${u.dept}</td>
                  <td>${badge(u.status)}</td>
                  <td class="small text-muted">${u.lastLogin || 'Never'}</td>
                  <td>
                    <button class="btn btn-sm btn-outline-secondary" onclick="window.__userToggleStatus('${u.id}')">
                      ${u.status==='Active'?'Deactivate':'Activate'}
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

window.__userToggleStatus = (id) => {
  const u = state.users.find(x => x.id === id);
  if(!u) return;
  u.status = u.status === "Active" ? "Inactive" : "Active";
  saveState();
  renderUsersPage();
};

window.__userCreate = () => {
  const username = prompt("Enter Username (e.g. j.doe):");
  if(!username || !username.trim()) return;
  const name = prompt("Full Name:", "New Staff Member");
  const role = prompt("Role (General Manager / Finance Director / Plant Manager / POS Cashier / Fleet Supervisor):", "Plant Manager");
  const dept = prompt("Department (Milling, Sales, Administration, Fleet):", "Milling");

  state.users.push({
    id: nextId("usr"),
    username: username.trim().toLowerCase(),
    name: name || "Staff",
    email: `${username.trim().toLowerCase()}@debora.local`,
    role: role || "Staff",
    dept: dept || "Operations",
    status: "Active",
    lastLogin: "Never"
  });

  saveState();
  renderUsersPage();
};

export function renderRolesPage(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3">
        <h5 class="mb-0 fw-bold"><i class="bi bi-key-fill me-2"></i>Roles &amp; Permission Matrix</h5>
        <div class="text-muted small">Role-Based Access Control (RBAC) governing access across all ERP apps</div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-bordered align-middle mb-0" style="font-size:12.5px;">
            <thead class="table-light">
              <tr><th>ERP Module</th><th>General Manager</th><th>Finance Director</th><th>Plant Manager</th><th>POS Cashier</th><th>Fleet Supervisor</th></tr>
            </thead>
            <tbody>
              <tr><td class="fw-bold">Store &amp; Inventory</td><td class="text-success"><i class="bi bi-check-circle-fill"></i> Full</td><td class="text-success"><i class="bi bi-check-circle-fill"></i> Full</td><td class="text-success"><i class="bi bi-check-circle-fill"></i> Full</td><td class="text-muted">Read-Only</td><td class="text-muted">Read-Only</td></tr>
              <tr><td class="fw-bold">Purchasing &amp; Vendors</td><td class="text-success"><i class="bi bi-check-circle-fill"></i> Full</td><td class="text-success"><i class="bi bi-check-circle-fill"></i> Full</td><td class="text-primary">Requisitions</td><td class="text-danger"><i class="bi bi-dash"></i> No Access</td><td class="text-danger"><i class="bi bi-dash"></i> No Access</td></tr>
              <tr><td class="fw-bold">Manufacturing &amp; QC</td><td class="text-success"><i class="bi bi-check-circle-fill"></i> Full</td><td class="text-muted">Cost View</td><td class="text-success"><i class="bi bi-check-circle-fill"></i> Full</td><td class="text-danger"><i class="bi bi-dash"></i> No Access</td><td class="text-danger"><i class="bi bi-dash"></i> No Access</td></tr>
              <tr><td class="fw-bold">Point of Sale (POS)</td><td class="text-success"><i class="bi bi-check-circle-fill"></i> Full</td><td class="text-success"><i class="bi bi-check-circle-fill"></i> Full</td><td class="text-danger"><i class="bi bi-dash"></i> No Access</td><td class="text-success"><i class="bi bi-check-circle-fill"></i> Full</td><td class="text-danger"><i class="bi bi-dash"></i> No Access</td></tr>
              <tr><td class="fw-bold">Employees &amp; Payroll</td><td class="text-success"><i class="bi bi-check-circle-fill"></i> Full</td><td class="text-success"><i class="bi bi-check-circle-fill"></i> Full</td><td class="text-muted">Dept Roster</td><td class="text-danger"><i class="bi bi-dash"></i> No Access</td><td class="text-danger"><i class="bi bi-dash"></i> No Access</td></tr>
              <tr><td class="fw-bold">Fleet &amp; Garage</td><td class="text-success"><i class="bi bi-check-circle-fill"></i> Full</td><td class="text-muted">Expense Audit</td><td class="text-muted">Equipment Only</td><td class="text-danger"><i class="bi bi-dash"></i> No Access</td><td class="text-success"><i class="bi bi-check-circle-fill"></i> Full</td></tr>
              <tr><td class="fw-bold">Accounting &amp; Ledger</td><td class="text-success"><i class="bi bi-check-circle-fill"></i> Full</td><td class="text-success"><i class="bi bi-check-circle-fill"></i> Full</td><td class="text-danger"><i class="bi bi-dash"></i> No Access</td><td class="text-danger"><i class="bi bi-dash"></i> No Access</td><td class="text-danger"><i class="bi bi-dash"></i> No Access</td></tr>
              <tr><td class="fw-bold">Approvals &amp; Settings</td><td class="text-success"><i class="bi bi-check-circle-fill"></i> Full</td><td class="text-primary">Finance Rules</td><td class="text-primary">Plant Rules</td><td class="text-danger"><i class="bi bi-dash"></i> No Access</td><td class="text-danger"><i class="bi bi-dash"></i> No Access</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export function renderCompanySettingsPage(){
  const s = state.settings || {};
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white py-3">
        <h5 class="mb-0 fw-bold"><i class="bi bi-gear-wide me-2"></i>Enterprise &amp; Company Parameters</h5>
        <div class="text-muted small">Corporate registration, tax identifiers, fiscal accounting period, and spending controls</div>
      </div>
      <div class="card-body p-4">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label small fw-bold">Company Legal Registered Name</label>
            <input type="text" class="form-control" id="cfgLegalName" value="${s.legalName || 'Debora Food Complex Share Company'}">
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">Commercial Trade Brand</label>
            <input type="text" class="form-control" id="cfgTradeName" value="${s.tradeName || 'Debora Bekkolo Duket & Feed'}">
          </div>
          <div class="col-md-4">
            <label class="form-label small fw-bold">Tax Identification Number (TIN)</label>
            <input type="text" class="form-control o-mono" id="cfgTin" value="${s.tin || '0098452109'}">
          </div>
          <div class="col-md-4">
            <label class="form-label small fw-bold">VAT Registration Number</label>
            <input type="text" class="form-control o-mono" id="cfgVat" value="${s.vatNumber || 'ET-VAT-847291'}">
          </div>
          <div class="col-md-4">
            <label class="form-label small fw-bold">Default Currency</label>
            <input type="text" class="form-control" id="cfgCurr" value="${s.currency || 'ETB'}" disabled>
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">Corporate Physical Address / Plant</label>
            <input type="text" class="form-control" id="cfgAddress" value="${s.address || 'Commercial Avenue, Adama, Ethiopia'}">
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">Corporate Contact Telephone</label>
            <input type="text" class="form-control" id="cfgPhone" value="${s.phone || '+251 22 111 2345'}">
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">Active Financial Accounting Period</label>
            <input type="text" class="form-control" id="cfgPeriod" value="${s.fiscalYear || '2026 / 2018 E.C.'}">
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">Default Purchase Approval Threshold (ETB)</label>
            <input type="number" class="form-control" id="cfgThreshold" value="${s.approvalThreshold || 10000}">
          </div>
        </div>
        <div class="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
          <div id="cfgFlash"></div>
          <button class="btn btn-brand" onclick="window.__saveSettings()"><i class="bi bi-check2 me-1"></i>Save Enterprise Settings</button>
        </div>
      </div>
    </div>
  `;
}

window.__saveSettings = () => {
  state.settings = {
    ...state.settings,
    legalName: val("cfgLegalName"),
    tradeName: val("cfgTradeName"),
    tin: val("cfgTin"),
    vatNumber: val("cfgVat"),
    address: val("cfgAddress"),
    phone: val("cfgPhone"),
    fiscalYear: val("cfgPeriod"),
    approvalThreshold: parseFloat(val("cfgThreshold")) || 10000
  };
  saveState();
  flash("cfgFlash", "Enterprise settings saved successfully!", "ok");
};
