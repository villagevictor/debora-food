import { APPS, STAGE_PREVIEW } from "./erp-data.js";
import {
  state, currentAppId, currentItemKey, setApp, loadState, el, etb,
  inventoryAssetValue, accountBalance, emptyState, timeShort
} from "./erp-helpers.js";

import {
  renderStoreRequestsPage, renderStorePrTable, renderStoreIssuesTable, renderStoreTransfersTable
} from "./erp-store-module.js";

import {
  renderVendors, renderPurchaseOrdersPage, renderRequisitionsPage,
  renderGrnPage, renderStockPage, renderForecastPage, renderItemsPage
} from "./erp-purchase-inventory.js";

import {
  renderProductionOrdersPage, renderBomsPage, renderSalesOrdersPage,
  renderAccountingJournal, renderAccountingCoa, renderAccountingTrialBalance, renderAccountingBalanceSheet
} from "./erp-mfg-sales-acct.js";

import {
  renderPosTerminal, renderPosOrders, renderPosProducts,
  renderEmployeesPage, renderPayrollPage, renderDepartmentsPage,
  renderAssetsPage, renderMaintenanceRequestsPage, renderSparePartsPage
} from "./erp-stage2.js";

import {
  renderVehiclesPage, renderTripsPage, renderFuelLogsPage, renderDriversPage,
  renderGarageJobsPage, renderMechanicsPage, renderRoadInspectionsPage,
  renderContactsDirectory, renderPartnerStatementsPage
} from "./erp-stage3.js";

import {
  renderAgentsDirectory, renderAgentDispatchPage, renderAgentSalesPage, renderAgentSettlementPage,
  renderApprovalsPendingPage, renderApprovalsHistoryPage, renderApprovalsRulesPage,
  renderReportsOverview, renderReportsSales, renderReportsInventory, renderReportsFinancial,
  renderNotificationsInbox, renderNotificationsPreferences, updateNotificationBadge,
  renderUsersPage, renderRolesPage, renderCompanySettingsPage
} from "./erp-stage4.js";

const TILE_COLORS = ["#E8622C","#0F6FA8","#D9A227","#C0392B","#017E84","#714B67","#1E8E3E","#B7791F","#2F80ED","#EB5757","#219653","#9B51E0"];

function buildDrawer(){
  const grid = el("oDrawerGrid");
  if(!grid) return;
  grid.innerHTML = APPS.map((a,i)=>`
    <div class="o-app-tile" data-app="${a.id}">
      <span class="o-app-icon" style="color:${TILE_COLORS[i%TILE_COLORS.length]};"><i class="bi ${a.icon}"></i></span>
      <span class="o-app-label">${a.label}</span>
    </div>`).join("");
  document.querySelectorAll(".o-app-tile").forEach(t=>{
    t.addEventListener("click", ()=>{ closeDrawer(); const app=APPS.find(a=>a.id===t.dataset.app); navigate(app.id, app.items[0].key); });
  });
}

function openDrawer(){ el("oDrawer")?.classList.add("show"); }
function closeDrawer(){ el("oDrawer")?.classList.remove("show"); }

el("oAppsToggle")?.addEventListener("click", openDrawer);
el("oDrawerClose")?.addEventListener("click", closeDrawer);
el("oAppName")?.addEventListener("click", openDrawer);
el("oDashShortcut")?.addEventListener("click", ()=>navigate("dashboard","overview"));
el("oNotifBellBtn")?.addEventListener("click", ()=>navigate("notifications","inbox"));
el("oMenuToggle")?.addEventListener("click", ()=>el("oMenu")?.classList.toggle("o-menu-open"));
el("oChangePw")?.addEventListener("click", ()=>navigate("users","users"));
el("oUsersLink")?.addEventListener("click", ()=>navigate("users","company"));
el("oLogout")?.addEventListener("click", ()=>alert("Single-user enterprise mode — authenticated as System Administrator."));

function renderMenu(app, activeKey){
  const hasGroups = app.items.some(i=>i.group);
  if(!hasGroups){
    return app.items.map(i=>
      `<a class="${i.key===activeKey?'active':''}" data-item="${i.key}"><i class="bi ${i.icon}"></i>${i.label}</a>`
    ).join("");
  }
  const groups = [];
  app.items.forEach(i=>{
    let g = groups.find(x=>x.name===i.group);
    if(!g){ g={name:i.group, items:[]}; groups.push(g); }
    g.items.push(i);
  });
  return groups.map(g=>{
    const activeInGroup = g.items.some(i=>i.key===activeKey);
    return `<div class="dropdown o-menu-dd">
      <button class="dropdown-toggle ${activeInGroup?'active':''}" type="button" data-bs-toggle="dropdown">${g.name}</button>
      <ul class="dropdown-menu">
        ${g.items.map(i=>`<li><a class="dropdown-item ${i.key===activeKey?'active':''}" data-item="${i.key}"><i class="bi ${i.icon} me-1"></i>${i.label}</a></li>`).join("")}
      </ul>
    </div>`;
  }).join("");
}

export function navigate(appId, itemKey){
  setApp(appId, itemKey);
  const app = APPS.find(a=>a.id===appId) || APPS[0];
  const item = app.items.find(i=>i.key===itemKey) || app.items[0];

  el("oAppName").innerHTML = `<i class="bi ${app.icon}"></i><span>${app.label}</span>`;
  el("oMenu").innerHTML = renderMenu(app, item.key);
  document.querySelectorAll("#oMenu a[data-item]").forEach(a=>{
    a.addEventListener("click", ()=>{ el("oMenu").classList.remove("o-menu-open"); navigate(appId, a.dataset.item); });
  });

  el("oBreadcrumb").innerHTML = `<a data-nav="dashboard.overview">Debora Food Complex</a><span class="sep">/</span><a data-nav="${appId}.${app.items[0].key}">${app.label}</a><span class="sep">/</span><span>${item.label}</span>`;
  el("oBreadcrumb").querySelectorAll("a").forEach(a=>{
    a.addEventListener("click", ()=>{ const parts = a.dataset.nav.split("."); navigate(parts[0],parts[1]); });
  });
  el("oCpTitle").innerHTML = item.label;
  el("oCpActions").innerHTML = "";

  const routeKey = appId+"."+item.key;
  if(ROUTES[routeKey]) ROUTES[routeKey]();
  else el("content").innerHTML = `<div class="card p-4">Feature active.</div>`;

  updateNotificationBadge();
}

function renderDashboard(){
  const inv = inventoryAssetValue();
  const ar = accountBalance("1100").net;
  const ap = -accountBalance("2000").net;
  const bank = accountBalance("1000").net;
  el("content").innerHTML = `
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3"><div class="kpi-card"><div class="kpi-value">${etb(inv)}</div><div class="kpi-label">Inventory valuation</div></div></div>
      <div class="col-6 col-md-3"><div class="kpi-card"><div class="kpi-value">${etb(ar)}</div><div class="kpi-label">Accounts receivable</div></div></div>
      <div class="col-6 col-md-3"><div class="kpi-card"><div class="kpi-value">${etb(ap)}</div><div class="kpi-label">Accounts payable</div></div></div>
      <div class="col-6 col-md-3"><div class="kpi-card"><div class="kpi-value">${etb(bank)}</div><div class="kpi-label">Bank liquidity</div></div></div>
    </div>
    <div class="d-flex justify-content-between align-items-center mb-2 mt-4">
      <h2 class="h6 mb-0">ERP Applications (All Stages 1–4 Live)</h2>
      <span class="badge bg-success"><i class="bi bi-check-all me-1"></i>Full Enterprise Suite Active</span>
    </div>
    <div class="row g-3 mb-4" id="dashApps"></div>
    <h2 class="h6 mb-2 mt-4">Recent General Ledger Postings</h2>
    <div class="card"><div class="card-body p-0"><table class="table table-hover"><thead><tr><th>Entry</th><th>Date</th><th>Memo</th><th>Amount</th></tr></thead><tbody id="dashJe"></tbody></table></div></div>
  `;
  el("dashApps").innerHTML = APPS.filter(a=>a.id!=="dashboard").map(a=>`
    <div class="col-md-4 col-lg-3">
      <div class="card h-100" style="cursor:pointer;" data-app="${a.id}">
        <div class="card-body">
          <i class="bi ${a.icon}" style="font-size:20px;color:var(--o-primary);"></i>
          <div class="fw-semibold mt-2">${a.label}</div>
          <div class="text-muted mt-1" style="font-size:11.5px;">Fully operational module</div>
        </div>
      </div>
    </div>`).join("");
  document.querySelectorAll("#dashApps [data-app]").forEach(c=>{
    c.addEventListener("click", ()=>{ const app=APPS.find(a=>a.id===c.dataset.app); navigate(app.id, app.items[0].key); });
  });
  const recent = [...state.journal].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10);
  el("dashJe").innerHTML = recent.map(j=>`<tr><td class="o-mono">${j.no}</td><td>${timeShort(j.date)}</td><td>${j.memo}</td><td>${etb(j.lines.reduce((s,l)=>s+(l.debit||0),0))}</td></tr>`).join("") || emptyState("No journal activity yet.",4);
}

const ROUTES = {
  // DASHBOARD
  "dashboard.overview": renderDashboard,

  // STORE MODULE
  "store.requests": renderStoreRequestsPage,
  "store.purchaserequests": () => {
    el("content").innerHTML = `<div class="card"><div class="card-header">Store-originated purchase requests</div><div class="card-body p-0">
      <table class="table table-hover"><thead><tr><th>SPR No.</th><th>From Store Request</th><th>Items</th><th>Status</th><th>Action</th></tr></thead>
      <tbody id="sprTable"></tbody></table></div></div>`;
    renderStorePrTable();
  },
  "store.issues": () => {
    el("content").innerHTML = `<div class="card"><div class="card-header">Store issue log</div><div class="card-body p-0">
      <table class="table table-hover"><thead><tr><th>SI No.</th><th>Store Request</th><th>Dept</th><th>Warehouse</th><th>Value</th><th>Date</th></tr></thead>
      <tbody id="siTable"></tbody></table></div></div>`;
    renderStoreIssuesTable();
  },
  "store.transfers": () => {
    el("content").innerHTML = `<div class="card"><div class="card-header">Transfer orders raised from Store Requests</div><div class="card-body p-0">
      <table class="table table-hover"><thead><tr><th>Time</th><th>Store Request</th><th>Item</th><th>From</th><th>To</th><th>Qty</th></tr></thead>
      <tbody id="strTable"></tbody></table></div></div>`;
    renderStoreTransfersTable();
  },

  // PURCHASE
  "purchase.rfq": () => renderPurchaseOrdersPage("all", "Requests for Quotation"),
  "purchase.pos": () => renderPurchaseOrdersPage("confirmed", "Purchase Orders"),
  "purchase.requisitions": renderRequisitionsPage,
  "purchase.grn": renderGrnPage,
  "purchase.vendors": renderVendors,
  "purchase.products": renderItemsPage,

  // INVENTORY
  "inventory.overview": renderDashboard,
  "inventory.stock": renderStockPage,
  "inventory.forecast": renderForecastPage,
  "inventory.items": renderItemsPage,

  // MANUFACTURING & SALES
  "manufacturing.orders": renderProductionOrdersPage,
  "manufacturing.boms": renderBomsPage,
  "sales.orders": renderSalesOrdersPage,

  // ACCOUNTING
  "accounting.overview": renderDashboard,
  "accounting.journal": renderAccountingJournal,
  "accounting.coa": renderAccountingCoa,
  "accounting.tb": renderAccountingTrialBalance,
  "accounting.bs": renderAccountingBalanceSheet,

  // --- STAGE 2: POINT OF SALE (POS) ---
  "pos.terminal": renderPosTerminal,
  "pos.orders": renderPosOrders,
  "pos.products": renderPosProducts,

  // --- STAGE 2: EMPLOYEES & HR ---
  "hr.employees": renderEmployeesPage,
  "hr.payroll": renderPayrollPage,
  "hr.departments": renderDepartmentsPage,

  // --- STAGE 2: MAINTENANCE ---
  "maintenance.assets": renderAssetsPage,
  "maintenance.requests": renderMaintenanceRequestsPage,
  "maintenance.spareparts": renderSparePartsPage,

  // --- STAGE 3: FLEET ---
  "fleet.vehicles": renderVehiclesPage,
  "fleet.trips": renderTripsPage,
  "fleet.fuel": renderFuelLogsPage,
  "fleet.drivers": renderDriversPage,

  // --- STAGE 3: GARAGE & REPAIRS ---
  "garage.jobs": renderGarageJobsPage,
  "garage.mechanics": renderMechanicsPage,
  "garage.inspections": renderRoadInspectionsPage,

  // --- STAGE 3: CONTACTS & PARTNER LEDGERS ---
  "contacts.directory": () => renderContactsDirectory("all"),
  "contacts.customers": () => renderContactsDirectory("customers"),
  "contacts.vendors": () => renderContactsDirectory("vendors"),
  "contacts.statements": () => renderPartnerStatementsPage(),

  // --- STAGE 4: FIELD AGENTS ---
  "agents.directory": renderAgentsDirectory,
  "agents.dispatch": renderAgentDispatchPage,
  "agents.sales": renderAgentSalesPage,
  "agents.settlement": renderAgentSettlementPage,

  // --- STAGE 4: APPROVALS ENGINE ---
  "approvals.pending": renderApprovalsPendingPage,
  "approvals.history": renderApprovalsHistoryPage,
  "approvals.rules": renderApprovalsRulesPage,

  // --- STAGE 4: REPORTING & ANALYTICS ---
  "reports.overview": renderReportsOverview,
  "reports.sales": renderReportsSales,
  "reports.inventory": renderReportsInventory,
  "reports.financial": renderReportsFinancial,

  // --- STAGE 4: NOTIFICATIONS ---
  "notifications.inbox": renderNotificationsInbox,
  "notifications.preferences": renderNotificationsPreferences,

  // --- STAGE 4: USERS & COMPANY SETTINGS ---
  "users.users": renderUsersPage,
  "users.roles": renderRolesPage,
  "users.company": renderCompanySettingsPage,
};

window.__nav = navigate;

loadState(()=>{
  buildDrawer();
  updateNotificationBadge();
  navigate("dashboard","overview");
});
