import {
  state, nextId, fmt, etb, itemById, whById, customerById,
  nowIso, timeShort, round2, round4, el, val, opts, emptyState, flash, badge,
  postJournal, stockOnHand, totalOnHand, postLedger, saveState
} from "./erp-helpers.js";

// ==========================================
// 1. POINT OF SALE (POS) MODULE
// ==========================================

let posCart = []; // [{itemId, qty, price, name, uom}]
let posCashier = "Almaz Ayana (Cashier #1)";
let posWarehouseId = "wh-fg";
let posCustomerId = "cus-walkin";
let posSearchQuery = "";
let posPaymentMethod = "Cash";

export function renderPosTerminal(){
  const sellable = state.items.filter(i => i.type === "Finished Good" || i.type === "By-Product");
  const filtered = sellable.filter(i => {
    if(!posSearchQuery) return true;
    const q = posSearchQuery.toLowerCase();
    return i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
  });

  const cartTotal = posCart.reduce((s, c) => s + (c.qty * c.price), 0);
  const cartItemCount = posCart.reduce((s, c) => s + c.qty, 0);

  el("content").innerHTML = `
    <!-- POS TOP STATUS BAR -->
    <div class="card mb-3 border-0 shadow-sm" style="background:#fff;">
      <div class="card-body py-2 px-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex align-items-center gap-3">
          <span class="badge bg-success p-2 px-3"><i class="bi bi-circle-fill me-1 small"></i>Register Open</span>
          <div class="small text-muted"><i class="bi bi-person me-1"></i>Cashier: <b>${posCashier}</b></div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <label class="small text-muted mb-0">Stock Source:</label>
          <select class="form-select form-select-sm" style="width:180px;" id="posWhSelect" onchange="window.__posChangeWh(this.value)">
            ${state.warehouses.filter(w=>!w.derivedFrom).map(w=>`<option value="${w.id}" ${w.id===posWarehouseId?'selected':''}>${w.name}</option>`).join("")}
          </select>
          <label class="small text-muted mb-0 ms-2">Customer:</label>
          <select class="form-select form-select-sm" style="width:190px;" id="posCustSelect" onchange="window.__posChangeCust(this.value)">
            ${state.customers.map(c=>`<option value="${c.id}" ${c.id===posCustomerId?'selected':''}>${c.name}</option>`).join("")}
          </select>
        </div>
      </div>
    </div>

    <!-- MAIN POS SCREEN -->
    <div class="row g-3">
      <!-- LEFT: PRODUCT CATALOG -->
      <div class="col-lg-7 col-xl-8">
        <div class="card h-100 border-0 shadow-sm">
          <div class="card-header bg-white py-2 d-flex align-items-center justify-content-between gap-2">
            <span class="fw-bold"><i class="bi bi-grid me-2"></i>Product Catalog</span>
            <div class="input-group input-group-sm" style="max-width:280px;">
              <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
              <input type="text" class="form-control" placeholder="Search flour, pack, bran..." value="${posSearchQuery}" oninput="window.__posSearch(this.value)">
            </div>
          </div>
          <div class="card-body p-3" style="max-height:640px; overflow-y:auto;">
            <div class="row g-3" id="posProductGrid">
              ${filtered.map(item => {
                const stock = stockOnHand(item.id, posWarehouseId);
                const price = item.retailPrice || (item.avgCost ? Math.round(item.avgCost * 1.25) : 100);
                const isOutOfStock = stock <= 0.001;
                return `
                  <div class="col-sm-6 col-md-4">
                    <div class="card h-100 product-card p-2 text-center ${isOutOfStock?'opacity-75':''}" 
                         style="border:1px solid var(--o-border); border-radius:10px; cursor:${isOutOfStock?'not-allowed':'pointer'}; transition:all .15s ease;"
                         onclick="${isOutOfStock?'':`window.__posAddToCart('${item.id}', ${price})`}">
                      <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="badge ${stock>10?'bg-success':(stock>0?'bg-warning':'bg-danger')}">
                          ${fmt(stock)} ${item.uom}
                        </span>
                        <span class="badge bg-light text-dark">${item.type==='Finished Good'?'FG':'Feed'}</span>
                      </div>
                      <div class="my-2">
                        <i class="bi ${item.uom==='BAG'?'bi-bag-fill':'bi-box-seam'}" style="font-size:36px; color:var(--o-primary);"></i>
                      </div>
                      <div class="fw-bold text-dark text-truncate" title="${item.name}">${item.name}</div>
                      <div class="text-muted o-mono small">${item.code}</div>
                      <div class="mt-2 fw-bold text-primary fs-6">${etb(price)}</div>
                      <button class="btn btn-sm btn-outline-secondary mt-2 w-100 ${isOutOfStock?'disabled':''}">
                        <i class="bi bi-cart-plus me-1"></i>${isOutOfStock?'Out of Stock':'Add to Cart'}
                      </button>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
            ${filtered.length===0 ? emptyState("No products matching your search query.", 1) : ""}
          </div>
        </div>
      </div>

      <!-- RIGHT: POS CART & BILLING -->
      <div class="col-lg-5 col-xl-4">
        <div class="card border-0 shadow-sm d-flex flex-column" style="min-height:640px;">
          <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center">
            <span class="fw-bold"><i class="bi bi-cart3 me-2"></i>Order Cart (${cartItemCount} items)</span>
            ${posCart.length>0 ? `<button class="btn btn-sm text-danger p-0" onclick="window.__posClearCart()"><i class="bi bi-trash3 me-1"></i>Clear</button>` : ''}
          </div>

          <!-- CART ITEMS -->
          <div class="card-body p-2 flex-grow-1" style="overflow-y:auto; max-height:300px;">
            ${posCart.length===0 ? `
              <div class="text-center py-5 text-muted">
                <i class="bi bi-cart-x" style="font-size:42px; opacity:.3;"></i>
                <div class="mt-2">Cart is empty. Click a product on the left to start sale.</div>
              </div>
            ` : `
              <div class="list-group list-group-flush">
                ${posCart.map((c, i) => `
                  <div class="list-group-item p-2 d-flex align-items-center justify-content-between gap-2 border-bottom">
                    <div style="flex:1; min-width:0;">
                      <div class="fw-bold text-truncate" style="font-size:12.5px;">${c.name}</div>
                      <div class="text-muted small">${etb(c.price)} / ${c.uom}</div>
                    </div>
                    <div class="d-flex align-items-center gap-1">
                      <button class="btn btn-sm btn-light border py-0 px-2" onclick="window.__posQtyChange(${i}, -1)">-</button>
                      <span class="fw-bold px-1" style="min-width:24px; text-align:center;">${c.qty}</span>
                      <button class="btn btn-sm btn-light border py-0 px-2" onclick="window.__posQtyChange(${i}, 1)">+</button>
                    </div>
                    <div class="fw-bold text-end" style="min-width:70px;">${etb(c.qty * c.price)}</div>
                    <button class="btn btn-sm text-danger p-0 ms-1" onclick="window.__posRemoveCartItem(${i})"><i class="bi bi-x"></i></button>
                  </div>
                `).join("")}
              </div>
            `}
          </div>

          <!-- PAYMENT & CHECKOUT PANEL -->
          <div class="card-footer bg-light p-3 border-top">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="text-muted">Subtotal:</span>
              <span class="fw-semibold">${etb(cartTotal)}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="text-muted">Sales Tax (0% Food Basic):</span>
              <span class="text-muted">ETB 0.00</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3 pt-2 border-top">
              <span class="fs-6 fw-bold">Total Due:</span>
              <span class="fs-5 fw-bold text-primary">${etb(cartTotal)}</span>
            </div>

            <!-- PAYMENT METHOD -->
            <label class="form-label small fw-bold text-muted mb-1">Payment Method</label>
            <div class="btn-group w-100 mb-3" role="group">
              ${["Cash", "Telebirr / Bank", "On Account"].map(m => `
                <button type="button" class="btn btn-sm ${posPaymentMethod===m?'btn-brand':'btn-outline-secondary'}" onclick="window.__posSetMethod('${m}')">
                  ${m}
                </button>
              `).join("")}
            </div>

            <div class="mb-3" id="posTenderedBlock">
              <div class="d-flex gap-2">
                <input type="number" step="0.01" class="form-control form-control-sm" id="posTendered" placeholder="Amount tendered..." oninput="window.__posCalcChange(${cartTotal})">
                <button class="btn btn-sm btn-outline-secondary" onclick="window.__posExactAmount(${cartTotal})">Exact</button>
              </div>
              <div id="posChangeText" class="small text-muted mt-1"></div>
            </div>

            <button class="btn btn-brand w-100 py-2 fw-bold ${posCart.length===0?'disabled':''}" id="btnPosCheckout" onclick="window.__posCompleteSale()">
              <i class="bi bi-check2-circle me-1"></i>Complete Sale &amp; Print Receipt
            </button>
            <div id="posFlashNote" class="mt-2"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- RECEIPT MODAL -->
    <div class="modal fade" id="posReceiptModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm">
        <div class="modal-content" id="posReceiptContent"></div>
      </div>
    </div>
  `;
}

window.__posSearch = (val) => { posSearchQuery = val; renderPosTerminal(); };
window.__posChangeWh = (val) => { posWarehouseId = val; renderPosTerminal(); };
window.__posChangeCust = (val) => { posCustomerId = val; renderPosTerminal(); };
window.__posSetMethod = (val) => { posPaymentMethod = val; renderPosTerminal(); };
window.__posClearCart = () => { posCart = []; renderPosTerminal(); };
window.__posAddToCart = (itemId, price) => {
  const item = itemById(itemId);
  const existing = posCart.find(c => c.itemId === itemId);
  const currentQty = existing ? existing.qty : 0;
  const avail = stockOnHand(itemId, posWarehouseId);
  if(currentQty + 1 > avail){
    alert(`Only ${fmt(avail)} ${item.uom} available in ${whById(posWarehouseId).name}.`);
    return;
  }
  if(existing){ existing.qty += 1; }
  else { posCart.push({itemId, qty:1, price, name:item.name, uom:item.uom}); }
  renderPosTerminal();
};
window.__posQtyChange = (index, delta) => {
  const line = posCart[index];
  const newQty = line.qty + delta;
  if(newQty <= 0){
    posCart.splice(index, 1);
  } else {
    const avail = stockOnHand(line.itemId, posWarehouseId);
    if(newQty > avail){
      alert(`Only ${fmt(avail)} available in stock.`);
      return;
    }
    line.qty = newQty;
  }
  renderPosTerminal();
};
window.__posRemoveCartItem = (index) => {
  posCart.splice(index, 1);
  renderPosTerminal();
};
window.__posExactAmount = (total) => {
  const inp = el("posTendered");
  if(inp){ inp.value = total; window.__posCalcChange(total); }
};
window.__posCalcChange = (total) => {
  const tendered = parseFloat(val("posTendered")) || 0;
  const changeBox = el("posChangeText");
  if(!changeBox) return;
  if(tendered >= total){
    changeBox.innerHTML = `Change Due: <b class="text-success">${etb(tendered - total)}</b>`;
  } else if(tendered > 0){
    changeBox.innerHTML = `Short: <b class="text-danger">${etb(total - tendered)}</b>`;
  } else {
    changeBox.innerHTML = "";
  }
};

window.__posCompleteSale = () => {
  if(!posCart.length) return;
  const total = round2(posCart.reduce((s, c) => s + (c.qty * c.price), 0));
  const tendered = parseFloat(val("posTendered")) || total;

  if(posPaymentMethod === "Cash" && tendered < total){
    flash("posFlashNote", `Tendered amount is less than total due (${etb(total)}).`, "warn");
    return;
  }

  // 1. Verify and deduct stock via postLedger
  let totalCogs = 0;
  for(const c of posCart){
    const avail = stockOnHand(c.itemId, posWarehouseId);
    if(c.qty > avail){
      flash("posFlashNote", `Stock ran out for ${c.name}. Available: ${fmt(avail)}`, "warn");
      return;
    }
  }

  const orderNo = "POS-" + String(1000 + state.posOrders.length + 1);

  posCart.forEach(c => {
    const cost = postLedger({
      itemId: c.itemId,
      warehouseId: posWarehouseId,
      type: "POS_SALE",
      qtyOut: c.qty,
      ref: orderNo
    });
    totalCogs += c.qty * cost;
  });

  // 2. Post Journal Entries
  // Sales revenue & payment account
  const debitAccount = posPaymentMethod === "Cash" ? "1050" : (posPaymentMethod === "Telebirr / Bank" ? "1000" : "1100");
  postJournal(`POS Sale ${orderNo} (${posPaymentMethod})`, [
    {account: debitAccount, debit: total, credit: 0},
    {account: "4000", debit: 0, credit: total}
  ], orderNo);

  // COGS & Inventory Asset
  postJournal(`COGS for POS Sale ${orderNo}`, [
    {account: "5000", debit: round2(totalCogs), credit: 0},
    {account: "1200", debit: 0, credit: round2(totalCogs)}
  ], orderNo);

  const newOrder = {
    id: nextId("posord"),
    no: orderNo,
    cashier: posCashier,
    warehouseId: posWarehouseId,
    customerId: posCustomerId,
    customerName: customerById(posCustomerId)?.name || "Walk-in Customer",
    lines: [...posCart],
    subtotal: total,
    total: total,
    totalCogs: round2(totalCogs),
    paymentMethod: posPaymentMethod,
    tendered: tendered,
    change: round2(Math.max(0, tendered - total)),
    createdAt: nowIso(),
    status: "Completed"
  };

  state.posOrders.push(newOrder);
  saveState();

  // Clear cart and show receipt
  const receiptItems = [...posCart];
  posCart = [];
  showPosReceipt(newOrder);
  renderPosTerminal();
};

function showPosReceipt(order){
  const content = el("posReceiptContent");
  if(!content) return;
  content.innerHTML = `
    <div class="modal-body p-3 font-monospace" style="font-size:12px; background:#fff;">
      <div class="text-center mb-3">
        <h6 class="fw-bold mb-0">DEBORA FOOD COMPLEX</h6>
        <div class="small text-muted">Bekkolo Duket &amp; Animal Feed</div>
        <div class="small">Addis Ababa / Adama, Ethiopia</div>
        <div class="small">TIN: 0098452109 · Reg #ET-1029</div>
        <div class="border-bottom my-2"></div>
        <div class="fw-bold">${order.no}</div>
        <div class="small text-muted">${timeShort(order.createdAt)}</div>
        <div class="small">Cashier: ${order.cashier}</div>
        <div class="small">Customer: ${order.customerName}</div>
      </div>
      <table class="table table-sm table-borderless mb-2" style="font-size:11.5px;">
        <thead><tr class="border-bottom"><th>Item</th><th class="text-center">Qty</th><th class="text-end">Total</th></tr></thead>
        <tbody>
          ${order.lines.map(l => `
            <tr>
              <td>${l.name}</td>
              <td class="text-center">${l.qty}</td>
              <td class="text-end">${etb(l.qty * l.price)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div class="border-top pt-2">
        <div class="d-flex justify-content-between"><span>Total:</span><b>${etb(order.total)}</b></div>
        <div class="d-flex justify-content-between"><span>Method:</span><span>${order.paymentMethod}</span></div>
        <div class="d-flex justify-content-between"><span>Tendered:</span><span>${etb(order.tendered)}</span></div>
        <div class="d-flex justify-content-between"><span>Change:</span><span>${etb(order.change)}</span></div>
      </div>
      <div class="text-center mt-3 pt-2 border-top text-muted small">
        Thank you for choosing Debora!<br>
        Goods once sold are non-refundable.
      </div>
      <div class="mt-3 text-center d-flex gap-2">
        <button class="btn btn-sm btn-brand flex-grow-1" onclick="window.print()"><i class="bi bi-printer me-1"></i>Print</button>
        <button class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Close</button>
      </div>
    </div>
  `;
  new window.bootstrap.Modal(el("posReceiptModal")).show();
}

export function renderPosOrders(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-receipt me-2"></i>POS Transaction Log</h5>
          <div class="text-muted small">Live register sales, tender tracking, and receipts</div>
        </div>
        <button class="btn btn-brand btn-sm" onclick="window.__nav('pos','terminal')"><i class="bi bi-upc-scan me-1"></i>New Sale</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Receipt No</th><th>Date</th><th>Cashier</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody id="posOrdersTable">
              ${state.posOrders.slice().reverse().map(o => `
                <tr>
                  <td class="o-mono fw-bold">${o.no}</td>
                  <td>${timeShort(o.createdAt)}</td>
                  <td>${o.cashier}</td>
                  <td>${o.customerName}</td>
                  <td>${o.lines.reduce((s,l)=>s+l.qty,0)} unit(s)</td>
                  <td class="fw-bold">${etb(o.total)}</td>
                  <td><span class="badge bg-light text-dark border">${o.paymentMethod}</span></td>
                  <td>${badge(o.status)}</td>
                  <td>
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="window.__posViewReceipt('${o.id}')"><i class="bi bi-eye"></i></button>
                    ${o.status==='Completed' ? `<button class="btn btn-sm btn-outline-danger" onclick="window.__posVoidOrder('${o.id}')" title="Void and restore stock"><i class="bi bi-arrow-counterclockwise"></i> Void</button>` : ''}
                  </td>
                </tr>
              `).join("")}
              ${state.posOrders.length===0 ? emptyState("No POS orders recorded yet.", 9) : ""}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <!-- RECEIPT MODAL -->
    <div class="modal fade" id="posReceiptModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-sm"><div class="modal-content" id="posReceiptContent"></div></div>
    </div>
  `;
}

window.__posViewReceipt = (id) => {
  const o = state.posOrders.find(x => x.id === id);
  if(o) showPosReceipt(o);
};

window.__posVoidOrder = (id) => {
  const order = state.posOrders.find(x => x.id === id);
  if(!order || order.status !== "Completed") return;
  if(!confirm(`Are you sure you want to void ${order.no}? Stock will be returned to ${whById(order.warehouseId).name} and journal entries will be reversed.`)) return;

  // 1. Restore stock
  order.lines.forEach(l => {
    postLedger({
      itemId: l.itemId,
      warehouseId: order.warehouseId,
      type: "POS_VOID_RESTORE",
      qtyIn: l.qty,
      unitCost: itemById(l.itemId)?.avgCost || 0,
      ref: `Void ${order.no}`
    });
  });

  // 2. Reverse accounting entries
  const debitAccount = order.paymentMethod === "Cash" ? "1050" : (order.paymentMethod === "Telebirr / Bank" ? "1000" : "1100");
  postJournal(`Reversal of POS Sale ${order.no}`, [
    {account: "4000", debit: order.total, credit: 0},
    {account: debitAccount, debit: 0, credit: order.total}
  ], `VOID-${order.no}`);

  if(order.totalCogs > 0){
    postJournal(`Reversal of COGS for ${order.no}`, [
      {account: "1200", debit: order.totalCogs, credit: 0},
      {account: "5000", debit: 0, credit: order.totalCogs}
    ], `VOID-${order.no}`);
  }

  order.status = "Cancelled";
  saveState();
  renderPosOrders();
};

export function renderPosProducts(){
  const sellable = state.items.filter(i => i.type === "Finished Good" || i.type === "By-Product");
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-bag-check me-2"></i>Sellable Retail Products</h5>
          <div class="text-muted small">Finished goods and packaging available at POS registers</div>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Code</th><th>Name</th><th>UoM</th><th>Type</th><th>Production Cost</th><th>Retail Price</th><th>Total On Hand</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${sellable.map(i => `
                <tr>
                  <td class="o-mono">${i.code}</td>
                  <td class="fw-bold">${i.name}</td>
                  <td>${i.uom}</td>
                  <td><span class="badge bg-light text-dark border">${i.type}</span></td>
                  <td>${etb(i.avgCost)}</td>
                  <td><b class="text-primary">${etb(i.retailPrice || (i.avgCost * 1.25))}</b></td>
                  <td><span class="badge ${totalOnHand(i.id)>0?'bg-success':'bg-danger'}">${fmt(totalOnHand(i.id))}</span></td>
                  <td>
                    <button class="btn btn-sm btn-outline-secondary" onclick="window.__posEditPrice('${i.id}')">
                      <i class="bi bi-pencil me-1"></i>Set Price
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

window.__posEditPrice = (itemId) => {
  const item = itemById(itemId);
  if(!item) return;
  const newPrice = prompt(`Enter retail price for ${item.name} (ETB):`, item.retailPrice || (item.avgCost * 1.25));
  if(newPrice === null) return;
  const p = parseFloat(newPrice);
  if(!isNaN(p) && p >= 0){
    item.retailPrice = round2(p);
    saveState();
    renderPosProducts();
  }
};


// ==========================================
// 2. EMPLOYEES & HUMAN RESOURCES (HR) MODULE
// ==========================================

export function renderEmployeesPage(){
  const activeStaff = state.employees.filter(e => e.status === "Active");
  const totalSalaries = activeStaff.reduce((s, e) => s + (e.basicSalary + e.allowance), 0);

  el("content").innerHTML = `
    <!-- METRICS -->
    <div class="row g-3 mb-3">
      <div class="col-md-4">
        <div class="kpi-card">
          <div class="kpi-value">${state.employees.length}</div>
          <div class="kpi-label">Total Registered Staff (${activeStaff.length} Active)</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="kpi-card">
          <div class="kpi-value">${etb(totalSalaries)}</div>
          <div class="kpi-label">Monthly Gross Payroll Commitment</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="kpi-card">
          <div class="kpi-value">${state.departments.length}</div>
          <div class="kpi-label">Operating Departments</div>
        </div>
      </div>
    </div>

    <!-- EMPLOYEE TABLE & ACTIONS -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-people-fill me-2"></i>Employee Directory</h5>
          <div class="text-muted small">Manage workforce, compensation, and organizational roles</div>
        </div>
        <button class="btn btn-brand btn-sm" onclick="window.__hrNewEmployee()"><i class="bi bi-person-plus me-1"></i>Add Employee</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Emp ID</th><th>Full Name</th><th>Department</th><th>Position / Role</th><th>Basic Salary</th><th>Allowances</th><th>Gross Pay</th><th>Contact</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${state.employees.map(e => {
                const dept = state.departments.find(d => d.id === e.deptId)?.name || "—";
                return `
                  <tr>
                    <td class="o-mono fw-bold">${e.no}</td>
                    <td class="fw-bold">${e.name}</td>
                    <td><span class="badge bg-light text-dark border">${dept}</span></td>
                    <td>${e.position}</td>
                    <td>${etb(e.basicSalary)}</td>
                    <td>${etb(e.allowance)}</td>
                    <td class="fw-bold text-success">${etb(e.basicSalary + e.allowance)}</td>
                    <td><div class="small">${e.phone}</div><div class="small text-muted">${e.bankAccount || ''}</div></td>
                    <td>${badge(e.status)}</td>
                    <td>
                      <button class="btn btn-sm btn-outline-secondary" onclick="window.__hrToggleStatus('${e.id}')">
                        ${e.status==='Active'?'Set On Leave':'Activate'}
                      </button>
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

window.__hrToggleStatus = (id) => {
  const e = state.employees.find(x => x.id === id);
  if(!e) return;
  e.status = e.status === "Active" ? "On Leave" : "Active";
  saveState();
  renderEmployeesPage();
};

window.__hrNewEmployee = () => {
  const name = prompt("Enter Employee Full Name:");
  if(!name || !name.trim()) return;
  const position = prompt("Enter Position / Job Title (e.g. Miller, Packaging Tech, Driver):", "Production Operator");
  const basic = parseFloat(prompt("Enter Basic Monthly Salary (ETB):", "12000")) || 10000;
  const allowance = parseFloat(prompt("Enter Allowances (Transport/Housing ETB):", "2000")) || 0;
  const deptId = state.departments[0]?.id || "dept-1";

  const newEmp = {
    id: nextId("emp"),
    no: "EMP-" + String(state.employees.length + 1).padStart(3, "0"),
    name: name.trim(),
    deptId: deptId,
    position: position || "Staff",
    basicSalary: round2(basic),
    allowance: round2(allowance),
    status: "Active",
    phone: "+251 9" + Math.floor(10000000 + Math.random() * 90000000),
    joinedDate: nowIso().slice(0, 10),
    bankAccount: "CBE " + Math.floor(100000000000 + Math.random() * 900000000000)
  };

  state.employees.push(newEmp);
  saveState();
  renderEmployeesPage();
};

export function renderPayrollPage(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-cash-coin me-2"></i>Monthly Payroll Runs</h5>
          <div class="text-muted small">Gross wage generation, income tax, pension withholdings, and bank disbursement</div>
        </div>
        <button class="btn btn-brand btn-sm" onclick="window.__hrGeneratePayroll()"><i class="bi bi-calendar-plus me-1"></i>Generate Monthly Payroll Run</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Run Ref</th><th>Period</th><th>Employees</th><th>Gross Wages</th><th>Pension (Emp+Co)</th><th>Income Tax</th><th>Net Disbursed</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${state.payrollRuns.slice().reverse().map(run => `
                <tr>
                  <td class="o-mono fw-bold">${run.no}</td>
                  <td class="fw-bold">${run.month}</td>
                  <td>${run.lines.length} staff</td>
                  <td>${etb(run.totalGross)}</td>
                  <td>${etb(run.totalPension)}</td>
                  <td>${etb(run.totalTax)}</td>
                  <td class="fw-bold text-success">${etb(run.totalNet)}</td>
                  <td>${badge(run.status)}</td>
                  <td>
                    ${run.status==='Draft' ? `<button class="btn btn-sm btn-brand me-1" onclick="window.__hrApprovePayroll('${run.id}')">Approve</button>` : ''}
                    ${run.status==='Approved' ? `<button class="btn btn-sm btn-success me-1" onclick="window.__hrDisbursePayroll('${run.id}')"><i class="bi bi-check2-all me-1"></i>Disburse Bank Pay</button>` : ''}
                    <button class="btn btn-sm btn-outline-secondary" onclick="window.__hrViewPayrollDetails('${run.id}')">Details</button>
                  </td>
                </tr>
              `).join("")}
              ${state.payrollRuns.length===0 ? emptyState("No payroll runs generated yet. Click 'Generate Monthly Payroll Run' above.", 9) : ""}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PAYROLL DETAIL MODAL -->
    <div class="modal fade" id="payrollModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg"><div class="modal-content" id="payrollModalContent"></div></div>
    </div>
  `;
}

window.__hrGeneratePayroll = () => {
  const d = new Date();
  const monthName = d.toLocaleString('default', { month: 'long', year: 'numeric' });
  const activeStaff = state.employees.filter(e => e.status === "Active");
  if(!activeStaff.length){ alert("No active employees found."); return; }

  const lines = activeStaff.map(e => {
    const gross = round2(e.basicSalary + e.allowance);
    const empPension = round2(e.basicSalary * 0.07);
    const coPension = round2(e.basicSalary * 0.11);
    // Ethiopian progressive tax simulation (approx ~12% effective on gross)
    const incomeTax = round2(Math.max(0, (gross - 600) * 0.15));
    const net = round2(gross - empPension - incomeTax);
    return {
      empId: e.id,
      empNo: e.no,
      name: e.name,
      position: e.position,
      basic: e.basicSalary,
      allowance: e.allowance,
      gross,
      empPension,
      coPension,
      incomeTax,
      net
    };
  });

  const totalGross = round2(lines.reduce((s, l) => s + l.gross, 0));
  const totalPension = round2(lines.reduce((s, l) => s + l.empPension + l.coPension, 0));
  const totalTax = round2(lines.reduce((s, l) => s + l.incomeTax, 0));
  const totalNet = round2(lines.reduce((s, l) => s + l.net, 0));

  const run = {
    id: nextId("pay"),
    no: "PAY-" + d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"),
    month: monthName,
    createdAt: nowIso(),
    status: "Draft",
    totalGross,
    totalPension,
    totalTax,
    totalNet,
    lines
  };

  state.payrollRuns.push(run);
  saveState();
  renderPayrollPage();
};

window.__hrApprovePayroll = (id) => {
  const run = state.payrollRuns.find(r => r.id === id);
  if(!run) return;
  run.status = "Approved";
  saveState();
  renderPayrollPage();
};

window.__hrDisbursePayroll = (id) => {
  const run = state.payrollRuns.find(r => r.id === id);
  if(!run || run.status !== "Approved") return;

  const totalCompanyCost = round2(run.totalGross + run.lines.reduce((s,l)=>s+l.coPension, 0));
  const totalLiabilities = round2(run.totalPension + run.totalTax);

  // Journal Entry:
  // Dr 6000 Salary & Wage Expense (Gross + Company Pension)
  // Cr 2100 Payroll Taxes & Pension Payable
  // Cr 1000 Bank (Net disbursement)
  postJournal(`Disbursement of ${run.month} Payroll (${run.no})`, [
    {account: "6000", debit: totalCompanyCost, credit: 0},
    {account: "2100", debit: 0, credit: totalLiabilities},
    {account: "1000", debit: 0, credit: run.totalNet}
  ], run.no);

  run.status = "Paid";
  run.paidAt = nowIso();
  saveState();
  renderPayrollPage();
  alert(`Payroll ${run.no} has been paid! Net disbursement of ${etb(run.totalNet)} posted against Bank.`);
};

window.__hrViewPayrollDetails = (id) => {
  const run = state.payrollRuns.find(r => r.id === id);
  if(!run) return;
  const content = el("payrollModalContent");
  if(!content) return;
  content.innerHTML = `
    <div class="modal-header">
      <h5 class="modal-title fw-bold"><i class="bi bi-file-earmark-spreadsheet me-2"></i>Payroll Run: ${run.no} (${run.month})</h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
    </div>
    <div class="modal-body p-3">
      <div class="row g-2 mb-3">
        <div class="col-3"><div class="border rounded p-2 text-center"><small class="text-muted">Total Gross</small><div class="fw-bold">${etb(run.totalGross)}</div></div></div>
        <div class="col-3"><div class="border rounded p-2 text-center"><small class="text-muted">Total Tax</small><div class="fw-bold text-danger">${etb(run.totalTax)}</div></div></div>
        <div class="col-3"><div class="border rounded p-2 text-center"><small class="text-muted">Pension (7%+11%)</small><div class="fw-bold text-warning">${etb(run.totalPension)}</div></div></div>
        <div class="col-3"><div class="border rounded p-2 text-center"><small class="text-muted">Net Disbursed</small><div class="fw-bold text-success">${etb(run.totalNet)}</div></div></div>
      </div>
      <div class="table-responsive">
        <table class="table table-sm table-hover align-middle" style="font-size:12px;">
          <thead><tr><th>Emp ID</th><th>Name</th><th>Role</th><th>Basic</th><th>Allow</th><th>Gross</th><th>Tax</th><th>Pension</th><th>Net Pay</th></tr></thead>
          <tbody>
            ${run.lines.map(l => `
              <tr>
                <td class="o-mono">${l.empNo}</td>
                <td class="fw-bold">${l.name}</td>
                <td>${l.position}</td>
                <td>${etb(l.basic)}</td>
                <td>${etb(l.allowance)}</td>
                <td class="fw-bold">${etb(l.gross)}</td>
                <td class="text-danger">${etb(l.incomeTax)}</td>
                <td class="text-warning">${etb(l.empPension)}</td>
                <td class="fw-bold text-success">${etb(l.net)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
  new window.bootstrap.Modal(el("payrollModal")).show();
};

export function renderDepartmentsPage(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-diagram-2 me-2"></i>Departments &amp; Cost Centers</h5>
          <div class="text-muted small">Organization hierarchy, department heads, and operating budgets</div>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Dept Name</th><th>Department Head</th><th>Active Staff Count</th><th>Allocated Budget</th><th>Monthly Staff Cost</th></tr>
            </thead>
            <tbody>
              ${state.departments.map(d => {
                const staff = state.employees.filter(e => e.deptId === d.id && e.status === "Active");
                const monthlySpend = staff.reduce((s, e) => s + (e.basicSalary + e.allowance), 0);
                return `
                  <tr>
                    <td class="fw-bold"><i class="bi bi-building me-2 text-primary"></i>${d.name}</td>
                    <td>${d.head || "—"}</td>
                    <td><span class="badge bg-light text-dark border">${staff.length} employees</span></td>
                    <td>${etb(d.budget || 300000)}</td>
                    <td class="fw-bold text-success">${etb(monthlySpend)}</td>
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


// ==========================================
// 3. MAINTENANCE MODULE
// ==========================================

export function renderAssetsPage(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-cpu-fill me-2"></i>Plant &amp; Equipment Asset Register</h5>
          <div class="text-muted small">Milling machinery, packaging equipment, power generation, and warehouse vehicles</div>
        </div>
        <button class="btn btn-brand btn-sm" onclick="window.__maintNewAsset()"><i class="bi bi-plus-lg me-1"></i>Register Equipment</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Asset Code</th><th>Equipment Name</th><th>Category</th><th>Location</th><th>Serial No</th><th>Acquisition Cost</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${state.assets.map(a => `
                <tr>
                  <td class="o-mono fw-bold">${a.code}</td>
                  <td class="fw-bold">${a.name}</td>
                  <td><span class="badge bg-light text-dark border">${a.category}</span></td>
                  <td>${a.location}</td>
                  <td class="o-mono small">${a.serialNo}</td>
                  <td>${etb(a.cost)}</td>
                  <td>
                    <span class="badge ${a.status==='Operational'?'bg-success':(a.status==='Under Maintenance'?'bg-warning':'bg-danger')}">
                      ${a.status}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline-secondary" onclick="window.__maintRaiseRequestForAsset('${a.id}')">
                      <i class="bi bi-wrench me-1"></i>Report Issue
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

window.__maintNewAsset = () => {
  const name = prompt("Equipment Name (e.g. Cyclone Sifter, Packing Bench, Generator):");
  if(!name || !name.trim()) return;
  const category = prompt("Category (Milling Equipment, Packaging Line, Power Utility, Material Handling):", "Milling Equipment");
  const location = prompt("Physical Location (Milling Floor, Silo, Warehouse):", "Milling Floor (WIP)");
  const cost = parseFloat(prompt("Capital Acquisition Cost (ETB):", "500000")) || 0;

  const newAsset = {
    id: nextId("ast"),
    code: "EQ-" + String(state.assets.length + 1).padStart(3, "0"),
    name: name.trim(),
    category: category || "Machinery",
    location: location || "Plant",
    serialNo: "SN-" + Math.floor(10000 + Math.random() * 90000),
    acquisitionDate: nowIso().slice(0, 10),
    status: "Operational",
    cost: round2(cost)
  };

  state.assets.push(newAsset);
  saveState();
  renderAssetsPage();
};

export function renderMaintenanceRequestsPage(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-wrench-adjustable me-2"></i>Maintenance Work Orders &amp; Requests</h5>
          <div class="text-muted small">Breakdown repairs, preventive overhauls, technician tasks, and spare parts consumption</div>
        </div>
        <button class="btn btn-brand btn-sm" onclick="window.__maintNewRequest()"><i class="bi bi-plus-lg me-1"></i>New Maintenance Request</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Order No</th><th>Equipment</th><th>Type</th><th>Priority</th><th>Issue / Description</th><th>Assigned Technician</th><th>Spare Parts</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${state.maintenanceRequests.slice().reverse().map(mr => {
                const asset = state.assets.find(a => a.id === mr.assetId);
                const partsText = (mr.spareParts || []).map(p => `${p.qty}x ${itemById(p.itemId)?.name || 'Part'}`).join(", ") || "None";
                return `
                  <tr>
                    <td class="o-mono fw-bold">${mr.no}</td>
                    <td>
                      <div class="fw-bold">${asset?.name || "Equipment"}</div>
                      <div class="small text-muted">${asset?.location || ""}</div>
                    </td>
                    <td><span class="badge bg-light text-dark border">${mr.type}</span></td>
                    <td>
                      <span class="badge ${mr.priority==='Critical'?'bg-danger':(mr.priority==='High'?'bg-warning':'bg-info')}">
                        ${mr.priority}
                      </span>
                    </td>
                    <td>
                      <div class="fw-bold" style="font-size:12.5px;">${mr.title}</div>
                      <div class="small text-muted text-truncate" style="max-width:240px;">${mr.description}</div>
                    </td>
                    <td><i class="bi bi-person me-1"></i>${mr.technician}</td>
                    <td class="small">${partsText}</td>
                    <td>${badge(mr.status)}</td>
                    <td>
                      ${mr.status === 'Open' ? `<button class="btn btn-sm btn-brand me-1" onclick="window.__maintStartWork('${mr.id}')">Start Work</button>` : ''}
                      ${mr.status === 'In Progress' ? `<button class="btn btn-sm btn-success me-1" onclick="window.__maintCompleteWork('${mr.id}')"><i class="bi bi-check2 me-1"></i>Complete &amp; Consume Spares</button>` : ''}
                    </td>
                  </tr>
                `;
              }).join("")}
              ${state.maintenanceRequests.length===0 ? emptyState("No maintenance work orders active.", 9) : ""}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

window.__maintRaiseRequestForAsset = (assetId) => {
  const asset = state.assets.find(a => a.id === assetId);
  if(!asset) return;
  const title = prompt(`Describe issue for ${asset.name}:`);
  if(!title || !title.trim()) return;

  const mr = {
    id: nextId("mr"),
    no: "MR-" + String(state.maintenanceRequests.length + 1).padStart(6, "0"),
    assetId: asset.id,
    type: "Corrective",
    priority: "High",
    title: title.trim(),
    description: "Reported by operator for rapid inspection and maintenance.",
    technician: "Kebede Tadesse",
    status: "Open",
    spareParts: [],
    createdAt: nowIso()
  };

  asset.status = "Under Maintenance";
  state.maintenanceRequests.push(mr);
  saveState();
  renderMaintenanceRequestsPage();
};

window.__maintNewRequest = () => {
  if(!state.assets.length){ alert("Please add equipment to the Asset Register first."); return; }
  const assetId = state.assets[0].id;
  const title = prompt("Issue / Maintenance Title (e.g. Roller belt replacement, Gearbox lube):");
  if(!title || !title.trim()) return;
  const type = prompt("Type (Corrective or Preventive):", "Corrective") || "Corrective";
  const priority = prompt("Priority (Low, Medium, High, Critical):", "Medium") || "Medium";

  // Pick spare parts if available
  const spares = state.items.filter(i => i.code.startsWith("SP-"));
  let spareParts = [];
  if(spares.length > 0){
    const usePart = confirm(`Allocate machine spare parts from inventory? (e.g. ${spares[0].name})`);
    if(usePart){
      spareParts.push({ itemId: spares[0].id, qty: 1 });
    }
  }

  const mr = {
    id: nextId("mr"),
    no: "MR-" + String(state.maintenanceRequests.length + 1).padStart(6, "0"),
    assetId: assetId,
    type: type,
    priority: priority,
    title: title.trim(),
    description: "Scheduled maintenance order created by plant engineering.",
    technician: "Kebede Tadesse",
    status: "Open",
    spareParts: spareParts,
    createdAt: nowIso()
  };

  const asset = state.assets.find(a => a.id === assetId);
  if(asset && priority === "Critical") asset.status = "Breakdown";
  else if(asset) asset.status = "Under Maintenance";

  state.maintenanceRequests.push(mr);
  saveState();
  renderMaintenanceRequestsPage();
};

window.__maintStartWork = (id) => {
  const mr = state.maintenanceRequests.find(r => r.id === id);
  if(!mr) return;
  mr.status = "In Progress";
  const asset = state.assets.find(a => a.id === mr.assetId);
  if(asset) asset.status = "Under Maintenance";
  saveState();
  renderMaintenanceRequestsPage();
};

window.__maintCompleteWork = (id) => {
  const mr = state.maintenanceRequests.find(r => r.id === id);
  if(!mr || mr.status !== "In Progress") return;

  // 1. Consume spare parts from warehouse (wh-pm / store)
  let totalPartCost = 0;
  if(mr.spareParts && mr.spareParts.length > 0){
    mr.spareParts.forEach(p => {
      const it = itemById(p.itemId);
      const cost = postLedger({
        itemId: p.itemId,
        warehouseId: "wh-pm",
        type: "MAINTENANCE_CONSUMPTION",
        qtyOut: p.qty,
        ref: mr.no
      });
      totalPartCost += p.qty * cost;
    });

    // 2. Post Journal Entry for maintenance expense
    postJournal(`Spare parts consumed for ${mr.no} (${mr.title})`, [
      {account: "6100", debit: round2(totalPartCost), credit: 0},
      {account: "1200", debit: 0, credit: round2(totalPartCost)}
    ], mr.no);
  }

  mr.status = "Completed";
  mr.completedAt = nowIso();

  // Reset asset status back to Operational
  const asset = state.assets.find(a => a.id === mr.assetId);
  if(asset) asset.status = "Operational";

  saveState();
  renderMaintenanceRequestsPage();
  alert(`Maintenance Order ${mr.no} marked Completed! Equipment restored to Operational status. Spare parts cost: ${etb(totalPartCost)}`);
};

export function renderSparePartsPage(){
  const spares = state.items.filter(i => i.code.startsWith("SP-") || i.type === "Packaging" || i.type === "Raw Material");
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-box-seam-fill me-2"></i>Spare Parts &amp; Maintenance Supplies</h5>
          <div class="text-muted small">Drive belts, food-grade lubricants, bearings, packaging sacks, and consumable store inventory</div>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Item Code</th><th>Part / Supply Name</th><th>Category</th><th>UoM</th><th>Unit Cost</th><th>In Packaging Store</th><th>Total Stock</th></tr>
            </thead>
            <tbody>
              ${spares.map(s => `
                <tr>
                  <td class="o-mono">${s.code}</td>
                  <td class="fw-bold">${s.name}</td>
                  <td><span class="badge bg-light text-dark border">${s.type}</span></td>
                  <td>${s.uom}</td>
                  <td>${etb(s.avgCost)}</td>
                  <td>${fmt(stockOnHand(s.id, 'wh-pm'))} ${s.uom}</td>
                  <td><span class="badge ${totalOnHand(s.id)>0?'bg-success':'bg-warning'}">${fmt(totalOnHand(s.id))}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
