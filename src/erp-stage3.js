import {
  state, nextId, fmt, etb, itemById, whById, customerById, supplierById,
  nowIso, timeShort, daysAgo, round2, round4, el, val, opts, emptyState, flash, badge,
  postJournal, stockOnHand, totalOnHand, postLedger, saveState
} from "./erp-helpers.js";

// ==========================================
// 1. FLEET MANAGEMENT MODULE
// ==========================================

export function renderVehiclesPage(){
  const activeCount = state.vehicles.filter(v => v.status === "Active").length;
  const onTripCount = state.vehicles.filter(v => v.status === "On Trip").length;
  const inGarageCount = state.vehicles.filter(v => v.status === "In Garage").length;

  el("content").innerHTML = `
    <!-- FLEET KPI METRICS -->
    <div class="row g-3 mb-3">
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value">${state.vehicles.length}</div>
          <div class="kpi-label">Total Commercial Vehicles</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value text-success">${activeCount}</div>
          <div class="kpi-label">Ready / Available</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value text-primary">${onTripCount}</div>
          <div class="kpi-label">En Route / On Trip</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value text-danger">${inGarageCount}</div>
          <div class="kpi-label">In Garage / Service</div>
        </div>
      </div>
    </div>

    <!-- VEHICLES TABLE -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-truck me-2"></i>Commercial Vehicle Fleet</h5>
          <div class="text-muted small">Bulk grain tippers, flour distribution trucks, and plant logistics pickups</div>
        </div>
        <button class="btn btn-brand btn-sm" onclick="window.__fleetNewVehicle()"><i class="bi bi-plus-lg me-1"></i>Add Vehicle</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Plate Number</th><th>Vehicle Description</th><th>Type / Body</th><th>Payload Capacity</th><th>Assigned Driver</th><th>Current Odometer</th><th>Fuel</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${state.vehicles.map(v => {
                const driver = state.employees.find(e => e.id === v.driverId)?.name || "Unassigned";
                return `
                  <tr>
                    <td class="o-mono fw-bold">${v.plate}</td>
                    <td>
                      <div class="fw-bold">${v.name}</div>
                      <div class="small text-muted">Model Year: ${v.year}</div>
                    </td>
                    <td><span class="badge bg-light text-dark border">${v.type}</span></td>
                    <td>${v.capacity}</td>
                    <td><i class="bi bi-person me-1"></i>${driver}</td>
                    <td class="fw-bold">${fmt(v.odo, 0)} km</td>
                    <td><span class="badge bg-light text-dark border">${v.fuelType}</span></td>
                    <td>
                      <span class="badge ${v.status==='Active'?'bg-success':(v.status==='On Trip'?'bg-primary':'bg-warning')}">
                        ${v.status}
                      </span>
                    </td>
                    <td>
                      <div class="btn-group btn-group-sm">
                        ${v.status==='Active' ? `<button class="btn btn-outline-primary" onclick="window.__fleetDispatchModal('${v.id}')" title="Dispatch on Trip"><i class="bi bi-geo-alt"></i> Dispatch</button>` : ''}
                        <button class="btn btn-outline-secondary" onclick="window.__fleetFuelModal('${v.id}')" title="Log Fuel"><i class="bi bi-fuel-pump"></i> Fuel</button>
                      </div>
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

window.__fleetNewVehicle = () => {
  const plate = prompt("License Plate Number (e.g. AA-3-48192):");
  if(!plate || !plate.trim()) return;
  const name = prompt("Make and Model (e.g. Isuzu NPR 5-Ton, Sinotruk HOWO 30T):", "Isuzu FSR 10-Ton Truck");
  const capacity = prompt("Payload Capacity (e.g. 10,000 KG / 200 Bags):", "10,000 KG");
  const odo = parseFloat(prompt("Initial Odometer (km):", "45000")) || 0;

  const newVeh = {
    id: nextId("veh"),
    plate: plate.trim().toUpperCase(),
    name: name || "Commercial Truck",
    type: "Box Cargo",
    capacity: capacity || "10,000 KG",
    driverId: "emp-5",
    odo: round2(odo),
    status: "Active",
    fuelType: "Diesel",
    year: 2023
  };

  state.vehicles.push(newVeh);
  saveState();
  renderVehiclesPage();
};

export function renderTripsPage(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-geo-alt me-2"></i>Trip &amp; Dispatch Logistics Log</h5>
          <div class="text-muted small">Flour delivery dispatches, grain procurement hauls, and vehicle mileage tracking</div>
        </div>
        <button class="btn btn-brand btn-sm" onclick="window.__fleetOpenNewTripModal()"><i class="bi bi-plus-lg me-1"></i>Dispatch New Trip</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Trip Ref</th><th>Date</th><th>Vehicle</th><th>Driver</th><th>Route (Origin &rarr; Destination)</th><th>Cargo Manifest</th><th>Start Odo</th><th>End Odo</th><th>Distance</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${state.fleetTrips.slice().reverse().map(t => {
                const veh = state.vehicles.find(v => v.id === t.vehicleId);
                return `
                  <tr>
                    <td class="o-mono fw-bold">${t.no}</td>
                    <td>${timeShort(t.date)}</td>
                    <td>
                      <div class="fw-bold">${veh?.plate || "Vehicle"}</div>
                      <div class="small text-muted">${veh?.name || ""}</div>
                    </td>
                    <td>${t.driverName}</td>
                    <td>
                      <div><b>${t.origin}</b></div>
                      <div class="small text-muted">&rarr; ${t.destination}</div>
                    </td>
                    <td><span class="badge bg-light text-dark border">${t.cargo}</span></td>
                    <td>${fmt(t.startOdo, 0)} km</td>
                    <td>${t.endOdo ? fmt(t.endOdo, 0) + ' km' : '—'}</td>
                    <td class="fw-bold text-primary">${t.distance ? fmt(t.distance, 0) + ' km' : 'En route'}</td>
                    <td>${badge(t.status)}</td>
                    <td>
                      ${t.status === 'Dispatched' ? `<button class="btn btn-sm btn-success" onclick="window.__fleetCompleteTrip('${t.id}')"><i class="bi bi-check2-circle me-1"></i>Complete Trip</button>` : ''}
                    </td>
                  </tr>
                `;
              }).join("")}
              ${state.fleetTrips.length === 0 ? emptyState("No transport trips recorded yet.", 11) : ""}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

window.__fleetOpenNewTripModal = () => {
  const readyVehicles = state.vehicles.filter(v => v.status === "Active");
  if(!readyVehicles.length){
    alert("No vehicles currently in 'Active' ready status. Complete existing trips or restore vehicles from garage.");
    return;
  }
  const veh = readyVehicles[0];
  const dest = prompt("Enter Destination (e.g. Merkato Wholesale Depot / Batu Silos / Adama Flour Dist):", "Merkato Terminal, Addis Ababa");
  if(!dest || !dest.trim()) return;
  const cargo = prompt("Enter Cargo Details (e.g. 180 Bags Bekkolo Duket 50kg / 25 Tons Maize):", "200 Bags Bekkolo Duket 50kg");

  const trip = {
    id: nextId("trp"),
    no: "TRP-" + String(100 + state.fleetTrips.length + 1),
    vehicleId: veh.id,
    driverName: state.employees.find(e => e.id === veh.driverId)?.name || "Kebede Tadesse",
    origin: "Debora Complex (Adama)",
    destination: dest.trim(),
    cargo: cargo || "Flour Delivery",
    startOdo: veh.odo,
    endOdo: null,
    distance: 0,
    status: "Dispatched",
    date: nowIso()
  };

  veh.status = "On Trip";
  state.fleetTrips.push(trip);
  saveState();
  renderTripsPage();
};

window.__fleetDispatchModal = (vehId) => {
  const veh = state.vehicles.find(v => v.id === vehId);
  if(!veh) return;
  const dest = prompt(`Dispatch ${veh.plate} (${veh.name}) to destination:`, "Hawassa Wholesale Branch");
  if(!dest || !dest.trim()) return;
  const cargo = prompt("Cargo description:", "150 Bags Maize Flour 50kg");

  const trip = {
    id: nextId("trp"),
    no: "TRP-" + String(100 + state.fleetTrips.length + 1),
    vehicleId: veh.id,
    driverName: state.employees.find(e => e.id === veh.driverId)?.name || "Kebede Tadesse",
    origin: "Debora Complex (Adama)",
    destination: dest.trim(),
    cargo: cargo || "Finished Goods",
    startOdo: veh.odo,
    endOdo: null,
    distance: 0,
    status: "Dispatched",
    date: nowIso()
  };

  veh.status = "On Trip";
  state.fleetTrips.push(trip);
  saveState();
  renderTripsPage();
};

window.__fleetCompleteTrip = (tripId) => {
  const trip = state.fleetTrips.find(t => t.id === tripId);
  if(!trip || trip.status !== "Dispatched") return;
  const veh = state.vehicles.find(v => v.id === trip.vehicleId);

  const endOdoPrompt = prompt(`Trip Started at ${trip.startOdo} km. Enter Final Odometer at trip completion (km):`, trip.startOdo + 280);
  if(endOdoPrompt === null) return;
  const endOdo = parseFloat(endOdoPrompt);

  if(isNaN(endOdo) || endOdo < trip.startOdo){
    alert("Final odometer reading must be greater than or equal to start odometer.");
    return;
  }

  const distance = round2(endOdo - trip.startOdo);
  trip.endOdo = endOdo;
  trip.distance = distance;
  trip.status = "Completed";

  if(veh){
    veh.odo = endOdo;
    veh.status = "Active";
  }

  saveState();
  renderTripsPage();
  alert(`Trip ${trip.no} marked Completed! Logged ${distance} km traveled. ${veh?.plate} is now ready for next dispatch.`);
};

export function renderFuelLogsPage(){
  const totalFuelCost = state.fuelLogs.reduce((s, l) => s + l.totalCost, 0);
  const totalLiters = state.fuelLogs.reduce((s, l) => s + l.liters, 0);

  el("content").innerHTML = `
    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <div class="kpi-card">
          <div class="kpi-value text-danger">${etb(totalFuelCost)}</div>
          <div class="kpi-label">Total Diesel &amp; Fuel Expense Posted to General Ledger</div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="kpi-card">
          <div class="kpi-value text-primary">${fmt(totalLiters, 0)} Liters</div>
          <div class="kpi-label">Total Fuel Dispensed across Fleet</div>
        </div>
      </div>
    </div>

    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-fuel-pump me-2"></i>Fuel Fill-up Logs</h5>
          <div class="text-muted small">Fuel consumption receipts, per-kilometer tracking, and bank expense entries</div>
        </div>
        <button class="btn btn-brand btn-sm" onclick="window.__fleetRecordFuel()"><i class="bi bi-plus-lg me-1"></i>Record Fuel Fill-up</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Ref No</th><th>Date</th><th>Vehicle</th><th>Liters</th><th>Price / Liter</th><th>Total Cost</th><th>Odometer</th><th>Gas Station</th></tr>
            </thead>
            <tbody>
              ${state.fuelLogs.slice().reverse().map(fl => {
                const veh = state.vehicles.find(v => v.id === fl.vehicleId);
                return `
                  <tr>
                    <td class="o-mono fw-bold">${fl.no}</td>
                    <td>${timeShort(fl.date)}</td>
                    <td>
                      <div class="fw-bold">${veh?.plate || "Vehicle"}</div>
                      <div class="small text-muted">${veh?.name || ""}</div>
                    </td>
                    <td class="fw-bold">${fmt(fl.liters, 1)} L</td>
                    <td>${etb(fl.pricePerLiter)}</td>
                    <td class="fw-bold text-danger">${etb(fl.totalCost)}</td>
                    <td>${fmt(fl.odo, 0)} km</td>
                    <td><span class="badge bg-light text-dark border">${fl.station}</span></td>
                  </tr>
                `;
              }).join("")}
              ${state.fuelLogs.length === 0 ? emptyState("No fuel logs recorded yet.", 8) : ""}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

window.__fleetRecordFuel = () => {
  if(!state.vehicles.length){ alert("No vehicles available."); return; }
  const veh = state.vehicles[0];
  const liters = parseFloat(prompt(`Enter Liters of Diesel dispensed for ${veh.plate}:`, "150")) || 0;
  if(liters <= 0) return;
  const price = parseFloat(prompt("Price per Liter (ETB):", "108.50")) || 108.50;
  const station = prompt("Gas Station / Supplier:", "TotalEnergies Mojo Highway") || "TotalEnergies";
  const odo = parseFloat(prompt(`Odometer reading at pump (Current: ${veh.odo} km):`, veh.odo)) || veh.odo;

  const total = round2(liters * price);
  const logNo = "FL-" + String(100 + state.fuelLogs.length + 1);

  // Journal Entry: Dr 6200 Fuel & Transportation Expense / Cr 1000 Bank
  postJournal(`Fuel purchase ${logNo} for ${veh.plate} (${liters}L)`, [
    {account: "6200", debit: total, credit: 0},
    {account: "1000", debit: 0, credit: total}
  ], logNo);

  const fuelLog = {
    id: nextId("fl"),
    no: logNo,
    vehicleId: veh.id,
    date: nowIso(),
    liters,
    pricePerLiter: price,
    totalCost: total,
    odo,
    station
  };

  veh.odo = Math.max(veh.odo, odo);
  state.fuelLogs.push(fuelLog);
  saveState();
  renderFuelLogsPage();
  alert(`Fuel log ${logNo} saved! ${etb(total)} posted to Fuel & Transportation Expense against Bank.`);
};

window.__fleetFuelModal = (vehId) => {
  const veh = state.vehicles.find(v => v.id === vehId);
  if(!veh) return;
  const liters = parseFloat(prompt(`Enter Liters of Diesel for ${veh.plate} (${veh.name}):`, "100")) || 0;
  if(liters <= 0) return;
  const price = 108.50;
  const total = round2(liters * price);
  const logNo = "FL-" + String(100 + state.fuelLogs.length + 1);

  postJournal(`Fuel purchase ${logNo} for ${veh.plate}`, [
    {account: "6200", debit: total, credit: 0},
    {account: "1000", debit: 0, credit: total}
  ], logNo);

  state.fuelLogs.push({
    id: nextId("fl"),
    no: logNo,
    vehicleId: veh.id,
    date: nowIso(),
    liters,
    pricePerLiter: price,
    totalCost: total,
    odo: veh.odo,
    station: "NOC Adama Central"
  });

  saveState();
  renderFuelLogsPage();
  alert(`Recorded ${liters}L of diesel for ${veh.plate}. Expense of ${etb(total)} posted.`);
};

export function renderDriversPage(){
  const logisticsStaff = state.employees.filter(e => e.deptId === "dept-5" || e.position.toLowerCase().includes("driver"));
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-person-badge me-2"></i>Fleet Drivers Roster</h5>
          <div class="text-muted small">Authorized heavy truck and logistics operators linked to HR Employee records</div>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Employee ID</th><th>Driver Name</th><th>Role / Certification</th><th>Phone</th><th>Assigned Vehicle</th><th>Completed Trips</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${logisticsStaff.map(d => {
                const assigned = state.vehicles.filter(v => v.driverId === d.id).map(v => v.plate).join(", ") || "Pool Driver";
                const trips = state.fleetTrips.filter(t => t.driverName.includes(d.name) && t.status === "Completed").length;
                return `
                  <tr>
                    <td class="o-mono fw-bold">${d.no}</td>
                    <td class="fw-bold"><i class="bi bi-person-circle me-2 text-primary"></i>${d.name}</td>
                    <td>${d.position}</td>
                    <td>${d.phone}</td>
                    <td><span class="badge bg-light text-dark border">${assigned}</span></td>
                    <td class="fw-bold">${trips} trips completed</td>
                    <td>${badge(d.status)}</td>
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
// 2. GARAGE & FLEET REPAIRS MODULE
// ==========================================

export function renderGarageJobsPage(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-wrench-adjustable-circle me-2"></i>Garage &amp; Vehicle Repair Jobs</h5>
          <div class="text-muted small">In-house mechanical overhauls, brake servicing, and spare parts consumption</div>
        </div>
        <button class="btn btn-brand btn-sm" onclick="window.__garageNewJob()"><i class="bi bi-plus-lg me-1"></i>New Repair Job</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Job Order</th><th>Target Equipment</th><th>Job Title &amp; Scope</th><th>Mechanic</th><th>Priority</th><th>Labor Time</th><th>Spare Parts</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${state.garageJobs.slice().reverse().map(j => {
                const veh = state.vehicles.find(v => v.id === j.targetId);
                const partsStr = (j.parts || []).map(p => `${p.qty}x ${itemById(p.itemId)?.name || 'Part'}`).join(", ") || "None";
                return `
                  <tr>
                    <td class="o-mono fw-bold">${j.no}</td>
                    <td>
                      <div class="fw-bold">${veh ? veh.plate + ' (' + veh.name + ')' : 'Equipment'}</div>
                      <div class="small text-muted">${veh ? 'Odometer: ' + fmt(veh.odo, 0) + ' km' : ''}</div>
                    </td>
                    <td>
                      <div class="fw-bold" style="font-size:12.5px;">${j.title}</div>
                    </td>
                    <td><i class="bi bi-person me-1"></i>${j.mechanic}</td>
                    <td><span class="badge ${j.priority==='High'?'bg-danger':'bg-warning'}">${j.priority}</span></td>
                    <td>${j.laborHours} hrs (@ ${etb(j.laborRate)}/hr)</td>
                    <td class="small">${partsStr}</td>
                    <td>${badge(j.status)}</td>
                    <td>
                      ${j.status === 'In Progress' ? `<button class="btn btn-sm btn-success" onclick="window.__garageCompleteJob('${j.id}')"><i class="bi bi-check2 me-1"></i>Complete Job</button>` : ''}
                    </td>
                  </tr>
                `;
              }).join("")}
              ${state.garageJobs.length === 0 ? emptyState("No garage repair orders on file.", 9) : ""}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

window.__garageNewJob = () => {
  if(!state.vehicles.length){ alert("No vehicles available."); return; }
  const veh = state.vehicles[0];
  const title = prompt(`Enter Repair Scope for ${veh.plate}:`, "Clutch overhaul and transmission fluid flush");
  if(!title || !title.trim()) return;

  const hours = parseFloat(prompt("Estimated Labor Hours:", "4.0")) || 2.0;

  const job = {
    id: nextId("gjob"),
    no: "GR-" + String(100 + state.garageJobs.length + 1),
    targetType: "Vehicle",
    targetId: veh.id,
    title: title.trim(),
    mechanic: "Kebede Tadesse",
    priority: "High",
    laborHours: hours,
    laborRate: 150,
    parts: [{ itemId: "itm-sp-oil", qty: 1 }],
    status: "In Progress",
    createdAt: nowIso()
  };

  veh.status = "In Garage";
  state.garageJobs.push(job);
  saveState();
  renderGarageJobsPage();
};

window.__garageCompleteJob = (jobId) => {
  const job = state.garageJobs.find(j => j.id === jobId);
  if(!job || job.status !== "In Progress") return;

  // 1. Consume spare parts
  let partCost = 0;
  if(job.parts && job.parts.length){
    job.parts.forEach(p => {
      const cost = postLedger({
        itemId: p.itemId,
        warehouseId: "wh-pm",
        type: "GARAGE_REPAIR_CONSUMPTION",
        qtyOut: p.qty,
        ref: job.no
      });
      partCost += p.qty * cost;
    });

    postJournal(`Garage Repair ${job.no} (${job.title}) - spare parts`, [
      {account: "6100", debit: round2(partCost), credit: 0},
      {account: "1200", debit: 0, credit: round2(partCost)}
    ], job.no);
  }

  job.status = "Completed";
  const veh = state.vehicles.find(v => v.id === job.targetId);
  if(veh) veh.status = "Active";

  saveState();
  renderGarageJobsPage();
  alert(`Repair ${job.no} completed! Equipment returned to 'Active' service. Parts cost: ${etb(partCost)}`);
};

export function renderMechanicsPage(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-tools me-2"></i>Plant &amp; Fleet Mechanics Roster</h5>
          <div class="text-muted small">Specialized technicians for diesel engines, roller mills, and hydraulics</div>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Name</th><th>Role &amp; Specialty</th><th>Labor Rate</th><th>Completed Repairs</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr>
                <td class="fw-bold"><i class="bi bi-person-fill me-2 text-primary"></i>Kebede Tadesse</td>
                <td>Senior Fleet Mechanic (Heavy Diesel &amp; Hydraulics)</td>
                <td>ETB 150.00 / hr</td>
                <td><span class="badge bg-light text-dark border">14 completed</span></td>
                <td><span class="badge bg-success">Available</span></td>
              </tr>
              <tr>
                <td class="fw-bold"><i class="bi bi-person-fill me-2 text-primary"></i>Abebe Bikila</td>
                <td>Plant Maintenance Lead (Bühler Milling Equipment)</td>
                <td>ETB 180.00 / hr</td>
                <td><span class="badge bg-light text-dark border">26 completed</span></td>
                <td><span class="badge bg-success">On Duty</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export function renderRoadInspectionsPage(){
  el("content").innerHTML = `
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-clipboard-check me-2"></i>Roadworthiness &amp; Safety Inspections</h5>
          <div class="text-muted small">Mandatory vehicle pre-trip checklist, tire wear checks, and braking safety inspection</div>
        </div>
        <button class="btn btn-brand btn-sm" onclick="window.__garageNewInspection()"><i class="bi bi-plus-lg me-1"></i>Perform Inspection</button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Date</th><th>Vehicle</th><th>Inspector</th><th>Brakes</th><th>Tires</th><th>Lights</th><th>Steering</th><th>Result</th><th>Remarks</th></tr>
            </thead>
            <tbody>
              ${state.roadInspections.map(i => {
                const veh = state.vehicles.find(v => v.id === i.vehicleId);
                return `
                  <tr>
                    <td>${i.date}</td>
                    <td class="fw-bold">${veh ? veh.plate + ' (' + veh.name + ')' : 'Vehicle'}</td>
                    <td>${i.inspector}</td>
                    <td><span class="badge ${i.brakeScore==='Pass'?'bg-success':'bg-danger'}">${i.brakeScore}</span></td>
                    <td>${i.tireCondition}</td>
                    <td><span class="badge bg-success">${i.lightsCondition}</span></td>
                    <td><span class="badge bg-success">${i.steering}</span></td>
                    <td><span class="badge ${i.result==='Pass'?'bg-success':'bg-danger'}">${i.result}</span></td>
                    <td class="small text-muted">${i.remarks}</td>
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

window.__garageNewInspection = () => {
  if(!state.vehicles.length) return;
  const veh = state.vehicles[0];
  const brakePass = confirm(`Did ${veh.plate} pass brake pressure and pad thickness testing?`);
  const tirePass = confirm(`Are all tires above minimum tread depth?`);

  const passed = brakePass && tirePass;
  const ins = {
    id: nextId("ri"),
    vehicleId: veh.id,
    date: nowIso().slice(0, 10),
    inspector: "Kebede Tadesse",
    brakeScore: brakePass ? "Pass" : "Fail",
    tireCondition: tirePass ? "Good (Above 6mm)" : "Worn Tread",
    lightsCondition: "Pass",
    steering: "Pass",
    result: passed ? "Pass" : "Fail",
    remarks: passed ? "Ready for highway transport." : "Repairs required before dispatch."
  };

  if(!passed && veh.status !== "On Trip"){
    veh.status = "In Garage";
  }

  state.roadInspections.push(ins);
  saveState();
  renderRoadInspectionsPage();
};


// ==========================================
// 3. CONTACTS & UNIFIED PARTNER LEDGER MODULE
// ==========================================

let activeContactsFilter = "all";

export function renderContactsDirectory(filter = "all"){
  activeContactsFilter = filter;
  const customers = state.customers.map(c => ({...c, role: "Customer"}));
  const vendors = state.suppliers.map(s => ({...s, role: "Vendor"}));
  let list = [...customers, ...vendors];

  if(filter === "customers") list = customers;
  if(filter === "vendors") list = vendors;

  el("content").innerHTML = `
    <!-- FILTER BAR -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body py-2 px-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="btn-group" role="group">
          <button class="btn btn-sm ${activeContactsFilter==='all'?'btn-brand':'btn-outline-secondary'}" onclick="window.__contactsSetFilter('all')">All Contacts (${customers.length + vendors.length})</button>
          <button class="btn btn-sm ${activeContactsFilter==='customers'?'btn-brand':'btn-outline-secondary'}" onclick="window.__contactsSetFilter('customers')">Customers (${customers.length})</button>
          <button class="btn btn-sm ${activeContactsFilter==='vendors'?'btn-brand':'btn-outline-secondary'}" onclick="window.__contactsSetFilter('vendors')">Vendors &amp; Suppliers (${vendors.length})</button>
        </div>
        <button class="btn btn-brand btn-sm" onclick="window.__contactsNewPartner()"><i class="bi bi-person-plus me-1"></i>New Contact</button>
      </div>
    </div>

    <!-- CONTACTS TABLE -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0 fw-bold"><i class="bi bi-person-lines-fill me-2"></i>Commercial Partner Directory</h5>
          <div class="text-muted small">Centralized address book and financial balances across Sales and Purchase</div>
        </div>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Partner Name</th><th>Role</th><th>TIN Number</th><th>Phone</th><th>Address / City</th><th>Outstanding Balance</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${list.map(p => {
                const bal = computePartnerBalance(p.id, p.role);
                return `
                  <tr>
                    <td>
                      <div class="fw-bold">${p.name}</div>
                      <div class="small text-muted">${p.category || 'Commercial Entity'}</div>
                    </td>
                    <td>
                      <span class="badge ${p.role==='Customer'?'bg-primary':'bg-warning text-dark'}">
                        ${p.role}
                      </span>
                    </td>
                    <td class="o-mono small">${p.tin || '—'}</td>
                    <td>${p.phone || '—'}</td>
                    <td>${p.address || 'Ethiopia'}</td>
                    <td class="fw-bold ${bal>0 ? (p.role==='Customer'?'text-danger':'text-warning') : 'text-success'}">
                      ${p.role==='Customer' ? (bal>0 ? etb(bal) + ' (Receivable)' : 'Settled') : (bal>0 ? etb(bal) + ' (Payable)' : 'Settled')}
                    </td>
                    <td>
                      <button class="btn btn-sm btn-outline-secondary" onclick="window.__contactsOpenStatement('${p.id}', '${p.role}')">
                        <i class="bi bi-journal-text me-1"></i>Ledger Statement
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

function computePartnerBalance(id, role){
  if(role === "Customer"){
    const invoiced = state.salesInvoices.filter(i => i.customerId === id && i.status !== "Paid").reduce((s, i) => s + i.amount, 0);
    return round2(invoiced);
  } else {
    const payable = state.vendorInvoices.filter(v => {
      const po = state.purchaseOrders.find(p => p.id === v.poId);
      return po && po.supplierId === id && v.status !== "Paid";
    }).reduce((s, v) => s + v.amount, 0);
    return round2(payable);
  }
}

window.__contactsSetFilter = (f) => renderContactsDirectory(f);

window.__contactsNewPartner = () => {
  const name = prompt("Enter Contact / Business Entity Name:");
  if(!name || !name.trim()) return;
  const role = confirm("Click OK if this is a Customer, or CANCEL if this is a Supplier / Vendor.") ? "Customer" : "Vendor";
  const phone = prompt("Phone Number:", "+251 911 ") || "";
  const tin = prompt("Tax Identification Number (TIN):", "00" + Math.floor(10000000 + Math.random() * 90000000)) || "";
  const address = prompt("City / Address:", "Addis Ababa, Ethiopia") || "";

  if(role === "Customer"){
    state.customers.push({
      id: nextId("cus"),
      name: name.trim(),
      phone,
      tin,
      address,
      balance: 0
    });
  } else {
    state.suppliers.push({
      id: nextId("sup"),
      name: name.trim(),
      category: "Local",
      certified: true,
      phone,
      tin,
      address,
      balance: 0
    });
  }

  saveState();
  renderContactsDirectory(activeContactsFilter);
};

export function renderPartnerStatementsPage(partnerId, role){
  const customers = state.customers.map(c => ({...c, role: "Customer"}));
  const vendors = state.suppliers.map(s => ({...s, role: "Vendor"}));
  const allPartners = [...customers, ...vendors];

  const currentId = partnerId || allPartners[0]?.id;
  const partner = allPartners.find(p => p.id === currentId) || allPartners[0];
  if(!partner) return;

  const currentRole = role || partner.role;
  const outstanding = computePartnerBalance(partner.id, currentRole);

  // Compile transaction rows
  let txRows = [];
  if(currentRole === "Customer"){
    state.salesInvoices.filter(i => i.customerId === partner.id).forEach(i => {
      txRows.push({
        date: i.createdAt,
        ref: i.no,
        desc: "Sales Invoice",
        debit: i.amount,
        credit: 0,
        status: i.status
      });
    });
    state.posOrders.filter(o => o.customerId === partner.id).forEach(o => {
      txRows.push({
        date: o.createdAt,
        ref: o.no,
        desc: `POS Retail Sale (${o.paymentMethod})`,
        debit: o.total,
        credit: o.total,
        status: "Paid"
      });
    });
  } else {
    state.vendorInvoices.forEach(v => {
      const po = state.purchaseOrders.find(p => p.id === v.poId);
      if(po && po.supplierId === partner.id){
        txRows.push({
          date: v.createdAt,
          ref: v.no,
          desc: `Vendor Bill (${po.no})`,
          debit: 0,
          credit: v.amount,
          status: v.status
        });
      }
    });
  }

  el("content").innerHTML = `
    <!-- PARTNER SELECTOR & SUMMARY -->
    <div class="card border-0 shadow-sm mb-3">
      <div class="card-body p-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex align-items-center gap-3">
          <label class="fw-bold mb-0">Select Partner:</label>
          <select class="form-select form-select-sm" style="min-width:260px;" onchange="window.__contactsOpenStatement(this.value, this.options[this.selectedIndex].dataset.role)">
            ${allPartners.map(p => `<option value="${p.id}" data-role="${p.role}" ${p.id===partner.id?'selected':''}>${p.name} (${p.role})</option>`).join("")}
          </select>
        </div>
        <button class="btn btn-brand btn-sm" onclick="window.__contactsPrintConfirmation('${partner.id}', '${currentRole}')">
          <i class="bi bi-file-earmark-check me-1"></i>Generate Formal Balance Confirmation Letter
        </button>
      </div>
    </div>

    <!-- AGING & BALANCE METRIC CARDS -->
    <div class="row g-3 mb-3">
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value ${outstanding>0?'text-danger':'text-success'}">${etb(outstanding)}</div>
          <div class="kpi-label">Current Net Outstanding ${currentRole==='Customer'?'Receivable':'Payable'}</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value">${etb(outstanding)}</div>
          <div class="kpi-label">0 – 30 Days (Current)</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value text-muted">ETB 0.00</div>
          <div class="kpi-label">31 – 60 Days Overdue</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="kpi-card">
          <div class="kpi-value text-muted">ETB 0.00</div>
          <div class="kpi-label">&gt; 90 Days Impairment Risk</div>
        </div>
      </div>
    </div>

    <!-- STATEMENT TRANSACTION LEDGER -->
    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <h5 class="mb-0 fw-bold"><i class="bi bi-journal-text me-2"></i>Account Ledger: ${partner.name}</h5>
        <span class="badge bg-light text-dark border">TIN: ${partner.tin || 'N/A'}</span>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr><th>Date</th><th>Document Ref</th><th>Description</th><th>Debit</th><th>Credit</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${txRows.map(r => `
                <tr>
                  <td>${timeShort(r.date)}</td>
                  <td class="o-mono fw-bold">${r.ref}</td>
                  <td>${r.desc}</td>
                  <td class="fw-bold">${r.debit ? etb(r.debit) : '—'}</td>
                  <td class="fw-bold text-success">${r.credit ? etb(r.credit) : '—'}</td>
                  <td>${badge(r.status)}</td>
                </tr>
              `).join("")}
              ${txRows.length === 0 ? emptyState("No posted ledger transactions on file for this partner.", 6) : ""}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- BALANCE CONFIRMATION MODAL -->
    <div class="modal fade" id="confirmationModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg"><div class="modal-content" id="confirmationModalContent"></div></div>
    </div>
  `;
}

window.__contactsOpenStatement = (partnerId, role) => {
  renderPartnerStatementsPage(partnerId, role);
};

window.__contactsPrintConfirmation = (partnerId, role) => {
  const customers = state.customers.map(c => ({...c, role: "Customer"}));
  const vendors = state.suppliers.map(s => ({...s, role: "Vendor"}));
  const partner = [...customers, ...vendors].find(p => p.id === partnerId);
  if(!partner) return;

  const balance = computePartnerBalance(partner.id, role);
  const content = el("confirmationModalContent");
  if(!content) return;

  content.innerHTML = `
    <div class="modal-body p-4 bg-white font-monospace" style="font-size:12.5px;">
      <div class="text-center mb-4 border-bottom pb-3">
        <h4 class="fw-bold mb-1">DEBORA FOOD COMPLEX SHARE COMPANY</h4>
        <div class="text-muted">Grain Processing, Flour Milling &amp; Animal Feed Enterprise</div>
        <div class="small">P.O. Box 2410, Adama / Addis Ababa, Ethiopia · TIN: 0098452109</div>
      </div>
      <div class="d-flex justify-content-between mb-4">
        <div>
          <b>To:</b> ${partner.name}<br>
          <b>TIN:</b> ${partner.tin || 'N/A'}<br>
          <b>Address:</b> ${partner.address || 'Ethiopia'}
        </div>
        <div class="text-end">
          <b>Date:</b> ${new Date().toLocaleDateString(undefined, {month:'long', day:'2-digit', year:'numeric'})}<br>
          <b>Reference:</b> AUD-CONF-${partner.id.toUpperCase()}<br>
          <b>Audit Period:</b> FY 2026
        </div>
      </div>
      <h6 class="fw-bold text-center text-decoration-underline mb-3">STATEMENT OF BALANCE CONFIRMATION</h6>
      <p>Dear Valued Partner,</p>
      <p>
        In accordance with our internal audit procedures and standard commercial accounting reconciliation, 
        our general ledger records indicate the following balance as of <b>${timeShort(nowIso())}</b>:
      </p>
      <div class="border p-3 text-center my-3 bg-light">
        <span class="fs-6 text-muted">Confirmed Closing Balance:</span><br>
        <span class="fs-4 fw-bold text-primary">${etb(balance)}</span>
        <div class="small text-muted mt-1">(${role === 'Customer' ? 'Outstanding Account Receivable Due to Debora Food Complex' : 'Outstanding Account Payable Due to Partner'})</div>
      </div>
      <p>
        Kindly review the stated balance. Should this agree with your books of accounts, please sign and stamp 
        below. If there are any discrepancies, please furnish us with a statement of differences.
      </p>
      <div class="row mt-5 pt-4">
        <div class="col-6">
          <div class="border-top pt-2">
            <b>Authorized Signature</b><br>
            Finance &amp; Accounts Department<br>
            Debora Food Complex S.C.
          </div>
        </div>
        <div class="col-6 text-end">
          <div class="border-top pt-2">
            <b>Partner Confirmation &amp; Stamp</b><br>
            Name: ________________________<br>
            Date: ________________________
          </div>
        </div>
      </div>
      <div class="mt-4 pt-3 border-top text-center no-print">
        <button class="btn btn-brand btn-sm me-2" onclick="window.print()"><i class="bi bi-printer me-1"></i>Print Letter</button>
        <button class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">Close</button>
      </div>
    </div>
  `;
  new window.bootstrap.Modal(el("confirmationModal")).show();
};
