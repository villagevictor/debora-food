export const APPS = [
  {id:"dashboard", label:"Dashboard", icon:"bi-grid-1x2-fill", stage:1,
    items:[{key:"overview", label:"Overview", icon:"bi-speedometer2"}]},
  {id:"store", label:"Store", icon:"bi-shop-window", stage:1,
    items:[
      {key:"requests", label:"Store Requests", icon:"bi-clipboard-plus"},
      {key:"purchaserequests", label:"Purchase Requests", icon:"bi-cart-plus"},
      {key:"issues", label:"Store Issues", icon:"bi-box-arrow-up"},
      {key:"transfers", label:"Transfer Orders", icon:"bi-arrow-left-right"},
    ]},
  {id:"purchase", label:"Purchase", icon:"bi-cart3", stage:1,
    items:[
      {key:"rfq", label:"Requests for Quotation", icon:"bi-file-earmark-text", group:"Orders"},
      {key:"pos", label:"Purchase Orders", icon:"bi-file-earmark-check", group:"Orders"},
      {key:"requisitions", label:"Purchase Requests", icon:"bi-clipboard-check", group:"Orders"},
      {key:"requisitionlines", label:"Purchase Request Lines", icon:"bi-list-ul", group:"Orders"},
      {key:"grn", label:"Goods Receipts", icon:"bi-box-seam", group:"Orders"},
      {key:"invoices", label:"Vendor Invoices", icon:"bi-receipt", group:"Orders"},
      {key:"vendors", label:"Vendors", icon:"bi-truck", group:"Orders"},
      {key:"products", label:"Products", icon:"bi-tags", group:"Products"},
      {key:"reporting", label:"Purchase", icon:"bi-graph-up", group:"Reporting"},
      {key:"pricelists", label:"Vendor Pricelists", icon:"bi-currency-exchange", group:"Configuration"},
      {key:"reordering", label:"Reordering Rules", icon:"bi-arrow-repeat", group:"Configuration"},
      {key:"settings", label:"Settings", icon:"bi-gear", group:"Configuration"},
    ]},
  {id:"inventory", label:"Inventory", icon:"bi-boxes", stage:1,
    items:[
      {key:"overview", label:"Overview", icon:"bi-grid-1x2-fill"},
      {key:"stock", label:"Stock Levels", icon:"bi-bar-chart-line"},
      {key:"forecast", label:"Forecasted Report", icon:"bi-graph-up-arrow"},
      {key:"items", label:"Item Master", icon:"bi-tags"},
      {key:"transfers", label:"Transfers", icon:"bi-arrow-left-right"},
      {key:"adjustments", label:"Adjustments", icon:"bi-sliders"},
      {key:"scrap", label:"Scrap", icon:"bi-trash3"},
      {key:"warehouses", label:"Warehouses", icon:"bi-building"},
      {key:"reordering", label:"Reordering Rules", icon:"bi-arrow-repeat"},
    ]},
  {id:"manufacturing", label:"Manufacturing", icon:"bi-gear-wide-connected", stage:1,
    items:[
      {key:"orders", label:"Production Orders", icon:"bi-gear"},
      {key:"boms", label:"Bills of Materials", icon:"bi-diagram-3"},
      {key:"workcenters", label:"Work Centers", icon:"bi-cpu"},
      {key:"performance", label:"Performance", icon:"bi-speedometer2"},
    ]},
  {id:"quality", label:"Quality", icon:"bi-patch-check", stage:1,
    items:[
      {key:"inspections", label:"Inspections", icon:"bi-clipboard-data"},
      {key:"parameters", label:"QC Parameters", icon:"bi-list-check"},
    ]},
  {id:"sales", label:"Sales", icon:"bi-graph-up-arrow", stage:1,
    items:[
      {key:"orders", label:"Sales Orders", icon:"bi-cart-check"},
      {key:"shipments", label:"Shipments", icon:"bi-truck"},
      {key:"invoices", label:"Sales Invoices", icon:"bi-receipt-cutoff"},
      {key:"customers", label:"Customers", icon:"bi-people"},
    ]},
  {id:"accounting", label:"Accounting", icon:"bi-journal-bookmark", stage:1,
    items:[
      {key:"overview", label:"Overview", icon:"bi-calculator"},
      {key:"journal", label:"Journal Entries", icon:"bi-journal-text"},
      {key:"coa", label:"Chart of Accounts", icon:"bi-list-columns"},
      {key:"payable", label:"Payable", icon:"bi-cash-stack"},
      {key:"receivable", label:"Receivable", icon:"bi-cash"},
      {key:"tb", label:"Trial Balance", icon:"bi-clipboard-data"},
      {key:"is", label:"Income Statement", icon:"bi-graph-up"},
      {key:"bs", label:"Balance Sheet", icon:"bi-bar-chart-steps"},
    ]},
  {id:"pos", label:"Point of Sale", icon:"bi-shop", stage:2,
    items:[
      {key:"terminal", label:"POS Terminal", icon:"bi-upc-scan"},
      {key:"orders", label:"POS Orders", icon:"bi-receipt"},
      {key:"products", label:"Sellable Products", icon:"bi-bag-check"}
    ]},
  {id:"hr", label:"Employees", icon:"bi-person-badge", stage:2,
    items:[
      {key:"employees", label:"Employee Directory", icon:"bi-people-fill"},
      {key:"payroll", label:"Payroll Runs", icon:"bi-cash-coin"},
      {key:"departments", label:"Departments", icon:"bi-diagram-2"}
    ]},
  {id:"maintenance", label:"Maintenance", icon:"bi-tools", stage:2,
    items:[
      {key:"assets", label:"Asset Register", icon:"bi-cpu-fill"},
      {key:"requests", label:"Maintenance Requests", icon:"bi-wrench-adjustable"},
      {key:"spareparts", label:"Spare Parts & Supplies", icon:"bi-box-seam-fill"}
    ]},
  {id:"fleet", label:"Fleet", icon:"bi-truck-front", stage:3,
    items:[
      {key:"vehicles", label:"Vehicle Fleet", icon:"bi-truck"},
      {key:"trips", label:"Trip & Dispatch", icon:"bi-geo-alt"},
      {key:"fuel", label:"Fuel Logs", icon:"bi-fuel-pump"},
      {key:"drivers", label:"Drivers", icon:"bi-person-badge"}
    ]},
  {id:"garage", label:"Repairs", icon:"bi-wrench-adjustable", stage:3,
    items:[
      {key:"jobs", label:"Repair Jobs", icon:"bi-wrench-adjustable-circle"},
      {key:"mechanics", label:"Mechanics", icon:"bi-tools"},
      {key:"inspections", label:"Roadworthiness Inspection", icon:"bi-clipboard-check"}
    ]},
  {id:"contacts", label:"Contacts", icon:"bi-person-lines-fill", stage:3,
    items:[
      {key:"directory", label:"All Contacts", icon:"bi-person-lines-fill"},
      {key:"customers", label:"Customers", icon:"bi-people"},
      {key:"vendors", label:"Vendors & Suppliers", icon:"bi-truck"},
      {key:"statements", label:"Partner Ledgers & Aging", icon:"bi-journal-check"}
    ]},
  {id:"agents", label:"Agents", icon:"bi-person-workspace", stage:4,
    items:[
      {key:"directory", label:"Field Agent Directory", icon:"bi-person-workspace"},
      {key:"dispatch", label:"Stock Transfers to Agents", icon:"bi-box-arrow-up-right"},
      {key:"sales", label:"Agent Sales Invoices", icon:"bi-receipt"},
      {key:"settlement", label:"Finance Settlement", icon:"bi-cash-coin"}
    ]},
  {id:"approvals", label:"Approvals", icon:"bi-check2-square", stage:4,
    items:[
      {key:"pending", label:"Pending Approvals", icon:"bi-inbox-fill"},
      {key:"history", label:"Approval Audit Trail", icon:"bi-clock-history"},
      {key:"rules", label:"Matrix & Rules", icon:"bi-shield-check"}
    ]},
  {id:"reports", label:"Reporting", icon:"bi-graph-up-arrow", stage:4,
    items:[
      {key:"overview", label:"Executive ERP Dashboard", icon:"bi-speedometer2"},
      {key:"sales", label:"Sales & Revenue Analytics", icon:"bi-bar-chart-line-fill"},
      {key:"inventory", label:"Stock Valuation & Movement", icon:"bi-boxes"},
      {key:"financial", label:"Financial P&L Summary", icon:"bi-cash-stack"}
    ]},
  {id:"notifications", label:"Notifications", icon:"bi-bell", stage:4,
    items:[
      {key:"inbox", label:"Notification Center", icon:"bi-bell-fill"},
      {key:"preferences", label:"Alert Preferences", icon:"bi-sliders"}
    ]},
  {id:"users", label:"Settings", icon:"bi-sliders2", stage:4,
    items:[
      {key:"users", label:"Users & Security", icon:"bi-people-fill"},
      {key:"roles", label:"Roles & Permissions", icon:"bi-key-fill"},
      {key:"company", label:"Company Settings", icon:"bi-gear-wide"}
    ]},
];

export const STAGE_PREVIEW = {};

export const STORAGE_KEY = "debora-food-complex-erp-v2";

export function seedState(){
  return {
    seq: 1,
    settings: {
      approvalThreshold: 10000,
      legalName: "Debora Food Complex Share Company",
      tradeName: "Debora Bekkolo Duket & Feed",
      tin: "0098452109",
      vatNumber: "ET-VAT-847291",
      address: "P.O. Box 2410, Commercial Avenue, Adama, Ethiopia",
      phone: "+251 22 111 2345",
      email: "contact@deborafood.com",
      currency: "ETB",
      fiscalYear: "2026 / 2018 E.C.",
      autoPostLedger: true
    },
    reorderRules: [],
    accounts: [
      {code:"1000", name:"Bank", type:"asset"},
      {code:"1050", name:"Cash at Register / Till", type:"asset"},
      {code:"1100", name:"Accounts Receivable", type:"asset"},
      {code:"1200", name:"Inventory Asset", type:"asset"},
      {code:"1300", name:"Goods Received Not Invoiced (GRNI)", type:"liability"},
      {code:"2000", name:"Accounts Payable", type:"liability"},
      {code:"2100", name:"Payroll Taxes & Pension Payable", type:"liability"},
      {code:"3000", name:"Retained Earnings", type:"equity"},
      {code:"4000", name:"Sales Revenue", type:"revenue"},
      {code:"5000", name:"Cost of Goods Sold", type:"expense"},
      {code:"5100", name:"Inventory Adjustment Expense", type:"expense"},
      {code:"5200", name:"Store Issue / Department Consumption Expense", type:"expense"},
      {code:"5300", name:"Scrap / Inventory Loss Expense", type:"expense"},
      {code:"6000", name:"Salary & Wage Expense", type:"expense"},
      {code:"6100", name:"Repairs & Maintenance Expense", type:"expense"},
      {code:"6200", name:"Fuel & Transportation Expense", type:"expense"},
      {code:"1400", name:"Manufacturing Labor & Overhead Clearing", type:"liability"},
    ],
    journal: [],
    departments: [
      {id:"dept-1", name:"Milling", head:"Abebe Bikila", budget:450000},
      {id:"dept-2", name:"Packaging", head:"Tigist Assefa", budget:280000},
      {id:"dept-3", name:"Quality Control", head:"Dawit Wolde", budget:120000},
      {id:"dept-4", name:"Administration", head:"Marta Haile", budget:350000},
      {id:"dept-5", name:"Fleet & Logistics", head:"Kebede Tadesse", budget:520000},
      {id:"dept-6", name:"Sales & Retail", head:"Almaz Ayana", budget:290000},
    ],
    storeRequests: [],
    storePurchaseRequests: [],
    storeIssues: [],
    suppliers: [
      {id:"sup-1", name:"Farmers Cooperative Union", category:"Local", certified:true, phone:"+251 911 880011", tin:"0012984510", address:"Batu / Oromia Region", balance:0},
      {id:"sup-2", name:"Oromia Grain Traders", category:"Local", certified:false, phone:"+251 922 770022", tin:"0034871290", address:"Adama Grain Market", balance:0},
      {id:"sup-3", name:"Ethio Packaging Industries", category:"Local", certified:true, phone:"+251 933 660033", tin:"0045612389", address:"Bishoftu Industrial Zone", balance:0}
    ],
    customers: [
      {id:"cus-walkin", name:"Walk-in Customer (Retail Cash)", phone:"N/A", tin:"N/A", address:"Debora Factory Outlet Store", balance:0},
      {id:"cus-1", name:"Merkato Retail Distributor", phone:"+251 911 554433", tin:"0011223344", address:"Merkato, Addis Ababa", balance:0},
      {id:"cus-2", name:"Adama Wholesale Grocers", phone:"+251 922 443322", tin:"0022334455", address:"Adama Main Commercial Road", balance:0},
      {id:"cus-3", name:"Hawassa Food Stores Enterprise", phone:"+251 933 332211", tin:"0033445566", address:"Hawassa Industrial Hub", balance:0}
    ],
    warehouses: [
      {id:"wh-silo", name:"Grain Silo", stepsIncoming:1, stepsOutgoing:1, stepsManufacture:1},
      {id:"wh-pm",   name:"Packaging Store", stepsIncoming:1, stepsOutgoing:1, stepsManufacture:1},
      {id:"wh-wip",  name:"Milling Floor (WIP)", stepsIncoming:1, stepsOutgoing:1, stepsManufacture:1},
      {id:"wh-fg",   name:"Finished Goods Warehouse", stepsIncoming:1, stepsOutgoing:1, stepsManufacture:1},
      {id:"wh-byp",  name:"By-Product Store", stepsIncoming:1, stepsOutgoing:1, stepsManufacture:1},
      {id:"wh-qc",   name:"QC Hold", stepsIncoming:1, stepsOutgoing:1, stepsManufacture:1},
      {id:"loc-loss",name:"Inventory Loss (Scrap)", stepsIncoming:1, stepsOutgoing:1, stepsManufacture:1},
      {id:"wh-ag-1", name:"Hawassa Regional Agent Depot", stepsIncoming:1, stepsOutgoing:1, stepsManufacture:1},
      {id:"wh-ag-2", name:"Dire Dawa Agent Distribution Hub", stepsIncoming:1, stepsOutgoing:1, stepsManufacture:1},
      {id:"wh-ag-3", name:"Bahir Dar Agent Storage Depot", stepsIncoming:1, stepsOutgoing:1, stepsManufacture:1},
    ],
    items: [
      {id:"itm-maize", code:"RM-MAIZE-GRAIN", name:"Maize Grain (Bulk)", uom:"KG", type:"Raw Material", avgCost:35.00, retailPrice:0},
      {id:"itm-bag",   code:"PM-MADABERIYA-50KG", name:"Plastic Madaberiya 50kg Sack", uom:"PCS", type:"Packaging", avgCost:22.00, retailPrice:0},
      {id:"itm-duket", code:"FG-BEKKOLO-DUKET-50KG", name:"Bekkolo Duket (Maize Flour) 50kg", uom:"BAG", type:"Finished Good", avgCost:1820.00, retailPrice:2350.00},
      {id:"itm-flour-10kg", code:"FG-DUKET-10KG", name:"Bekkolo Duket 10kg Family Pack", uom:"BAG", type:"Finished Good", avgCost:410.00, retailPrice:540.00},
      {id:"itm-flour-5kg", code:"FG-DUKET-5KG", name:"Bekkolo Duket 5kg Consumer Pack", uom:"BAG", type:"Finished Good", avgCost:215.00, retailPrice:285.00},
      {id:"itm-bran",  code:"BY-MAIZE-BRAN", name:"Maize Bran (Gishaa) Animal Feed", uom:"KG", type:"By-Product", avgCost:14.00, retailPrice:22.00},
      {id:"itm-sp-belt", code:"SP-ROLLER-BELT-B42", name:"Milling Roller Drive Belt B42", uom:"PCS", type:"Raw Material", avgCost:1250.00, retailPrice:0},
      {id:"itm-sp-oil", code:"SP-FOOD-LUBE-5L", name:"Food-Grade Machine Lubricant 5L", uom:"CAN", type:"Raw Material", avgCost:3400.00, retailPrice:0},
      {id:"itm-sp-bearing", code:"SP-BEARING-6208", name:"Heavy Duty Roller Bearing 6208", uom:"PCS", type:"Raw Material", avgCost:850.00, retailPrice:0},
    ],
    requisitions: [],
    purchaseOrders: [],
    goodsReceipts: [],
    vendorInvoices: [],
    workCenters: [
      {id:"wc-mill", name:"Milling Line", hoursPerDay:8, hourlyRate:120},
      {id:"wc-pack", name:"Packing Bench", hoursPerDay:8, hourlyRate:60},
    ],
    boms: [{id:"bom-1", fgItemId:"itm-duket", lines:[{itemId:"itm-maize", qtyPerUnit:62.5},{itemId:"itm-bag", qtyPerUnit:1}],
      operations:[{id:"op-1", name:"Mill Grain", workCenterId:"wc-mill", durationMin:90},{id:"op-2", name:"Bag & Seal", workCenterId:"wc-pack", durationMin:30}]}],
    productionOrders: [],
    qcParameters: [
      {id:"qcp-1", name:"Moisture %", spec:"≤ 12.5%"},
      {id:"qcp-2", name:"Foreign matter %", spec:"≤ 1.0%"},
      {id:"qcp-3", name:"Off odor", spec:"None detected"},
    ],
    qcInspections: [],
    salesOrders: [],
    shipments: [],
    salesInvoices: [],
    ledger: [],
    transfers: [],
    adjustments: [],
    scrapOrders: [],
    posOrders: [],
    employees: [
      {id:"emp-1", no:"EMP-001", name:"Abebe Bikila", deptId:"dept-1", position:"Chief Milling Operator", basicSalary:18500, allowance:3000, status:"Active", phone:"+251 911 234567", joinedDate:"2023-01-15", bankAccount:"CBE 100018273645"},
      {id:"emp-2", no:"EMP-002", name:"Tigist Assefa", deptId:"dept-2", position:"Packaging Team Leader", basicSalary:14000, allowance:2500, status:"Active", phone:"+251 912 345678", joinedDate:"2023-03-20", bankAccount:"Awash 0142987342"},
      {id:"emp-3", no:"EMP-003", name:"Dawit Wolde", deptId:"dept-3", position:"Quality Control Officer", basicSalary:16500, allowance:2000, status:"Active", phone:"+251 913 456789", joinedDate:"2023-06-01", bankAccount:"Dashen 5543098124"},
      {id:"emp-4", no:"EMP-004", name:"Marta Haile", deptId:"dept-4", position:"Senior Accountant", basicSalary:22000, allowance:4000, status:"Active", phone:"+251 914 567890", joinedDate:"2022-11-10", bankAccount:"CBE 100044556677"},
      {id:"emp-5", no:"EMP-005", name:"Kebede Tadesse", deptId:"dept-5", position:"Fleet Mechanic & Senior Driver", basicSalary:13500, allowance:3500, status:"Active", phone:"+251 915 678901", joinedDate:"2024-02-14", bankAccount:"Telebirr 0915678901"},
      {id:"emp-6", no:"EMP-006", name:"Almaz Ayana", deptId:"dept-6", position:"Retail POS Cashier", basicSalary:11000, allowance:2000, status:"Active", phone:"+251 916 789012", joinedDate:"2024-05-18", bankAccount:"Telebirr 0916789012"},
      {id:"emp-7", no:"EMP-007", name:"Getachew Reda", deptId:"dept-5", position:"Long-Haul Heavy Truck Driver", basicSalary:14500, allowance:4000, status:"Active", phone:"+251 917 890123", joinedDate:"2023-09-01", bankAccount:"CBE 100099887766"},
    ],
    payrollRuns: [],
    assets: [
      {id:"ast-1", code:"EQ-MILL-01", name:"Bühler High-Capacity Roller Mill Line 1", category:"Milling Equipment", location:"Milling Floor (WIP)", serialNo:"BH-98234-A", acquisitionDate:"2021-04-10", status:"Operational", cost:2450000},
      {id:"ast-2", code:"EQ-PACK-01", name:"Automatic 50kg Rotary Bagging & Stitching Unit", category:"Packaging Line", location:"Packaging Store", serialNo:"ST-44109-P", acquisitionDate:"2022-08-15", status:"Operational", cost:890000},
      {id:"ast-3", code:"EQ-GEN-01", name:"Cummins 250kVA Standby Diesel Generator", category:"Power Utility", location:"Utility Room", serialNo:"CU-88320-D", acquisitionDate:"2020-02-28", status:"Operational", cost:1650000},
      {id:"ast-4", code:"EQ-FORK-01", name:"Toyota 3.0T Heavy-Duty Forklift", category:"Material Handling", location:"Finished Goods Warehouse", serialNo:"TY-30F-551", acquisitionDate:"2023-01-12", status:"Under Maintenance", cost:1120000},
    ],
    maintenanceRequests: [
      {id:"mr-1", no:"MR-000001", assetId:"ast-4", type:"Corrective", priority:"High", title:"Hydraulic seal leak and pressure loss", description:"Forklift losing pressure when raising 50kg flour pallets. Requires fluid flush and seal check.", technician:"Kebede Tadesse", status:"In Progress", spareParts:[{itemId:"itm-sp-oil", qty:2}], createdAt:"2026-09-21T09:00:00Z"},
      {id:"mr-2", no:"MR-000002", assetId:"ast-1", type:"Preventive", priority:"Medium", title:"Quarterly roller bearings and belt inspection", description:"Check roller gap calibration, bearing temperature and replace worn drive belts.", technician:"Kebede Tadesse", status:"Open", spareParts:[{itemId:"itm-sp-belt", qty:1}], createdAt:"2026-09-22T14:30:00Z"},
    ],
    vehicles: [
      {id:"veh-1", plate:"AA-3-98214", name:"Isuzu FSR 10-Ton Medium Cargo Truck", type:"Box Truck", capacity:"10,000 KG", driverId:"emp-5", odo:64200, status:"Active", fuelType:"Diesel", year:2022},
      {id:"veh-2", plate:"ET-3-44109", name:"Sinotruk HOWO 30-Ton Bulk Grain Carrier", type:"Heavy Tipper", capacity:"30,000 KG", driverId:"emp-7", odo:112500, status:"On Trip", fuelType:"Diesel", year:2021},
      {id:"veh-3", plate:"AA-2-12055", name:"Toyota Hilux 4WD Double Cabin Pickup", type:"Logistics Pickup", capacity:"1,200 KG", driverId:"emp-5", odo:48900, status:"In Garage", fuelType:"Diesel", year:2023},
    ],
    fleetTrips: [
      {id:"trp-1", no:"TRP-00101", vehicleId:"veh-1", driverName:"Kebede Tadesse", origin:"Debora Factory (Adama)", destination:"Merkato Wholesale Terminal (Addis Ababa)", cargo:"180 Bags Bekkolo Duket 50kg", startOdo:63850, endOdo:64200, distance:350, status:"Completed", date:"2026-09-22T08:00:00Z"},
      {id:"trp-2", no:"TRP-00102", vehicleId:"veh-2", driverName:"Getachew Reda", origin:"Batu Farmers Union Grain Depots", destination:"Debora Silo (Adama)", cargo:"28.5 Tons Bulk Yellow Maize", startOdo:112500, endOdo:null, distance:0, status:"Dispatched", date:"2026-09-23T10:30:00Z"},
    ],
    fuelLogs: [
      {id:"fl-1", no:"FL-00041", vehicleId:"veh-1", date:"2026-09-21T16:30:00Z", liters:120, pricePerLiter:108.50, totalCost:13020, odo:63850, station:"TotalEnergies Mojo Highway"},
      {id:"fl-2", no:"FL-00042", vehicleId:"veh-2", date:"2026-09-22T19:00:00Z", liters:240, pricePerLiter:108.50, totalCost:26040, odo:112100, station:"NOC Adama Central"},
    ],
    garageJobs: [
      {id:"gjob-1", no:"GR-00088", targetType:"Vehicle", targetId:"veh-3", title:"Front Brake Pads Replacement & Brake Fluid Bleed", mechanic:"Kebede Tadesse", priority:"High", laborHours:3.5, laborRate:150, parts:[{itemId:"itm-sp-oil", qty:1}], status:"In Progress", createdAt:"2026-09-22T10:00:00Z"},
      {id:"gjob-2", no:"GR-00087", targetType:"Vehicle", targetId:"veh-1", title:"10,000 km Scheduled Engine Oil & Filter Service", mechanic:"Kebede Tadesse", priority:"Medium", laborHours:2.0, laborRate:150, parts:[{itemId:"itm-sp-oil", qty:2}], status:"Completed", createdAt:"2026-09-18T14:00:00Z"},
    ],
    roadInspections: [
      {id:"ri-1", vehicleId:"veh-1", date:"2026-09-20", inspector:"Kebede Tadesse", brakeScore:"Pass", tireCondition:"Good", lightsCondition:"Pass", steering:"Pass", result:"Pass", remarks:"Vehicle certified for long haul."},
      {id:"ri-2", vehicleId:"veh-3", date:"2026-09-22", inspector:"Kebede Tadesse", brakeScore:"Fail", tireCondition:"Worn Front Left", lightsCondition:"Pass", steering:"Pass", result:"Fail", remarks:"Brake pads worn past tolerance, sent to garage."},
    ],
    // --- STAGE 4 MODULE DATA ---
    agents: [
      {id:"ag-1", code:"AGT-001", name:"Kidus Ashenafi", territory:"Hawassa & Southern Region", warehouseId:"wh-ag-1", phone:"+251 916 112233", commissionRate:3.5, quota:1500000, currentSales:840000, status:"Active"},
      {id:"ag-2", code:"AGT-002", name:"Selamawit Bekele", territory:"Dire Dawa & Harar Zone", warehouseId:"wh-ag-2", phone:"+251 925 334455", commissionRate:3.5, quota:1200000, currentSales:920000, status:"Active"},
      {id:"ag-3", code:"AGT-003", name:"Yonas Mekonnen", territory:"Bahir Dar & Amhara Depot", warehouseId:"wh-ag-3", phone:"+251 934 556677", commissionRate:4.0, quota:1800000, currentSales:1150000, status:"Active"},
    ],
    agentTransfers: [
      {id:"atrp-1", no:"AGT-TRF-0012", agentId:"ag-1", toWh:"wh-ag-1", items:[{itemId:"itm-duket", qty:100}, {itemId:"itm-flour-10kg", qty:80}], status:"Received", date:"2026-09-20T10:00:00Z"},
      {id:"atrp-2", no:"AGT-TRF-0013", agentId:"ag-2", toWh:"wh-ag-2", items:[{itemId:"itm-duket", qty:120}, {itemId:"itm-flour-5kg", qty:150}], status:"In Transit", date:"2026-09-23T09:30:00Z"},
    ],
    agentSales: [
      {id:"asale-1", no:"AG-INV-0081", agentId:"ag-1", customer:"Hawassa Central Supermarkets Union", items:[{itemId:"itm-duket", qty:40, price:2350}], total:94000, status:"Pending Settlement", bankSlipRef:"CBE-DEP-884210", date:"2026-09-21T15:00:00Z"},
      {id:"asale-2", no:"AG-INV-0082", agentId:"ag-3", customer:"Lake Tana Bakers Association", items:[{itemId:"itm-duket", qty:60, price:2350}], total:141000, status:"Settled", bankSlipRef:"AWASH-TRF-99214", date:"2026-09-22T11:20:00Z"},
    ],
    approvalRules: [
      {id:"ar-1", name:"High-Value Purchase Order", docType:"Purchase Order", threshold:10000, approverRole:"General Manager", status:"Active"},
      {id:"ar-2", name:"Store Requisition Control", docType:"Store Request", threshold:5000, approverRole:"Plant Manager", status:"Active"},
      {id:"ar-3", name:"Monthly Payroll Disbursement", docType:"Payroll Run", threshold:0, approverRole:"Finance Director", status:"Active"},
    ],
    approvals: [
      {id:"appr-1", no:"APP-0091", docType:"Store Request", docRef:"SR-000001", requestor:"Abebe Bikila (Milling Dept)", amount:15400, department:"Milling", status:"Pending", requestedAt:"2026-09-23T08:00:00Z", urgency:"High"},
      {id:"appr-2", no:"APP-0092", docType:"Purchase Order", docRef:"PO-000001", requestor:"Purchase Dept", amount:75000, department:"Procurement", status:"Approved", requestedAt:"2026-09-22T14:00:00Z", urgency:"Medium", approvedBy:"General Manager", approvedAt:"2026-09-22T16:30:00Z"},
    ],
    notifications: [
      {id:"notif-1", type:"approval", title:"Approval Required: Store Request SR-000001", desc:"Milling department requested 62.5 bags exceeding threshold (ETB 15,400.00).", time:"2026-09-23T08:00:00Z", read:false, linkApp:"approvals", linkItem:"pending"},
      {id:"notif-2", type:"stock", title:"Reorder Reminder: Maize Grain Silo", desc:"Grain silo stock is running below safety buffer. Reordering rule suggested.", time:"2026-09-23T09:15:00Z", read:false, linkApp:"inventory", linkItem:"stock"},
      {id:"notif-3", type:"fleet", title:"Bulk Carrier Dispatched", desc:"Sinotruk HOWO (ET-3-44109) en route to Batu Silos for 28.5T bulk yellow maize.", time:"2026-09-23T10:30:00Z", read:false, linkApp:"fleet", linkItem:"trips"},
      {id:"notif-4", type:"maintenance", title:"Forklift Overhaul in Progress", desc:"Toyota 3.0T Forklift undergoing hydraulic seal maintenance in garage.", time:"2026-09-22T14:30:00Z", read:true, linkApp:"maintenance", linkItem:"requests"},
    ],
    users: [
      {id:"usr-1", username:"admin", name:"System Administrator", email:"admin@debora.local", role:"General Manager", dept:"Executive", status:"Active", lastLogin:"2026-09-23 22:15"},
      {id:"usr-2", username:"marta.h", name:"Marta Haile", email:"marta.h@debora.local", role:"Finance Director", dept:"Administration", status:"Active", lastLogin:"2026-09-23 18:40"},
      {id:"usr-3", username:"abebe.b", name:"Abebe Bikila", email:"abebe.b@debora.local", role:"Plant & Milling Manager", dept:"Milling", status:"Active", lastLogin:"2026-09-23 17:10"},
      {id:"usr-4", username:"almaz.a", name:"Almaz Ayana", email:"almaz.a@debora.local", role:"POS Cashier / Storekeeper", dept:"Sales & Retail", status:"Active", lastLogin:"2026-09-23 21:05"},
      {id:"usr-5", username:"kebede.t", name:"Kebede Tadesse", email:"kebede.t@debora.local", role:"Fleet & Garage Supervisor", dept:"Fleet & Logistics", status:"Active", lastLogin:"2026-09-23 19:25"},
    ]
  };
}
