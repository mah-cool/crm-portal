/* =====================================================================
   Internal CRM + Stock app — single-page, config-driven.
   Renders tables and forms from the MODULES config; talks to /api.
   ===================================================================== */
(function () {
  'use strict';
  var esc = Auth.escapeHtml;

  // ---- Field + module configuration ---------------------------------
  var UNITS = [
    { value: 'm3', label: 'Cubic metre (m³)' },
    { value: 'pack', label: 'Pack' },
    { value: 'length', label: 'Length / piece' },
    { value: 'linear_m', label: 'Linear metre' },
    { value: 'piece', label: 'Piece' }
  ];
  var unitLabel = function (v) {
    for (var i = 0; i < UNITS.length; i++) if (UNITS[i].value === v) return UNITS[i].label;
    return v || '';
  };
  var money = function (v) { return (v === null || v === '' || v === undefined) ? '—' : '£' + Number(v).toFixed(2); };
  var num = function (v) { return (v === null || v === '' || v === undefined) ? '—' : String(v); };

  // Company details shown on all printed documents — edit these in one place.
  var COMPANY = {
    name: '[Company Name]',
    address: '',   // e.g. '12 Dock Road, Wisbech, Cambridgeshire, PE13 2XX'
    vat: '',       // VAT registration number
    reg: '',       // Companies House registration number
    bank: ''       // remittance details for invoices, e.g. 'Bank · Sort 00-00-00 · Acc 12345678'
  };
  function companyHead() {
    return '<strong>' + Auth.escapeHtml(COMPANY.name) + '</strong>' +
      (COMPANY.address ? '<br><span class="muted">' + Auth.escapeHtml(COMPANY.address) + '</span>' : '') +
      (COMPANY.vat ? '<br><span class="muted">VAT ' + Auth.escapeHtml(COMPANY.vat) + '</span>' : '');
  }
  function companyFooter() {
    var bits = [];
    if (COMPANY.bank) bits.push('<strong>Payment:</strong> ' + Auth.escapeHtml(COMPANY.bank));
    if (COMPANY.reg) bits.push('Company reg. ' + Auth.escapeHtml(COMPANY.reg));
    if (COMPANY.vat) bits.push('VAT ' + Auth.escapeHtml(COMPANY.vat));
    return bits.length ? '<p class="muted" style="margin-top:24px;border-top:1px solid #ccc;padding-top:10px">' + bits.join(' &nbsp;·&nbsp; ') + '</p>' : '';
  }

  // Bank + limited-company details shared by customers and suppliers.
  var PARTNER_FIN_FIELDS = [
    { name: 'company_number', label: 'Company reg. no.' },
    { name: 'vat_number', label: 'VAT number' },
    { name: 'registered_name', label: 'Registered name' },
    { name: 'registered_address', label: 'Registered address' },
    { name: 'bank_name', label: 'Bank name' },
    { name: 'bank_account_name', label: 'Bank account name' },
    { name: 'bank_sort_code', label: 'Sort code' },
    { name: 'bank_account_number', label: 'Account number' },
    { name: 'bank_iban', label: 'IBAN' },
    { name: 'bank_bic', label: 'BIC / SWIFT' }
  ];

  var MODULES = {
    dashboard: { label: 'Dashboard', icon: '▦' },

    sales_orders: { label: 'Sales Orders', icon: '🧾' },
    picking: { label: 'Picking Notes', icon: '📋' },
    delivery: { label: 'Delivery Notes', icon: '📑' },
    haulage: { label: 'Haulage Orders', icon: '🚛' },

    invoices: { label: 'Invoices', icon: '💷' },
    accounts: { label: 'Aged debtors', icon: '📊' },

    purchasing: { label: 'Purchase Orders', icon: '📥' },
    loading: { label: 'Loading Lists', icon: '🚢' },

    reports: { label: 'Report manager', icon: '📈' },
    report_creator: { label: 'Report creator', icon: '🛠️' },

    customers: {
      label: 'Customers', icon: '👤', entity: 'customers', singular: 'customer', manageAddresses: true, manageContacts: true, profile: true,
      fields: [
        { name: 'name', label: 'Company name', required: true },
        { name: 'contact_name', label: 'Contact name' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone' },
        { name: 'address', label: 'Address' },
        { name: 'city', label: 'Town / City' },
        { name: 'postcode', label: 'Postcode' },
        { name: 'account_no', label: 'Account no.' },
        { name: 'sales_rep_id', label: 'Sales rep', type: 'ref', ref: 'staff' },
        { name: 'vat_rate', label: 'VAT rate %', type: 'number' },
        { name: 'credit_limit', label: 'Credit limit £', type: 'number' },
        { name: 'credit_terms_days', label: 'Credit terms (days)', type: 'number' },
        { name: 'credit_terms_eom', label: 'Terms end-of-month', type: 'select', options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }] }
      ].concat(PARTNER_FIN_FIELDS, [{ name: 'notes', label: 'Notes', type: 'textarea' }]),
      columns: [
        { key: 'name', label: 'Company' },
        { key: 'contact_name', label: 'Contact' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'city', label: 'City' },
        { key: 'account_no', label: 'Account' },
        { key: 'vat_rate', label: 'VAT %', render: function (r) { return r.vat_rate != null ? Number(r.vat_rate) + '%' : '—'; } },
        { key: 'credit_limit', label: 'Credit £', render: function (r) { return r.credit_limit != null ? '£' + Number(r.credit_limit).toLocaleString() : '—'; } }
      ]
    },

    suppliers: {
      label: 'Suppliers', icon: '🏭', entity: 'suppliers', singular: 'supplier', manageContacts: true,
      fields: [
        { name: 'name', label: 'Supplier name', required: true },
        { name: 'contact_name', label: 'Contact name' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone' },
        { name: 'address', label: 'Address' },
        { name: 'city', label: 'Town / City' },
        { name: 'postcode', label: 'Postcode' },
        { name: 'vat_rate', label: 'VAT rate %', type: 'number' }
      ].concat(PARTNER_FIN_FIELDS, [{ name: 'notes', label: 'Notes', type: 'textarea' }]),
      columns: [
        { key: 'name', label: 'Supplier' },
        { key: 'contact_name', label: 'Contact' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'city', label: 'City' },
        { key: 'vat_rate', label: 'VAT %', render: function (r) { return r.vat_rate != null ? Number(r.vat_rate) + '%' : '—'; } }
      ]
    },

    products: {
      label: 'Products', icon: '🪵', entity: 'products', singular: 'product', manageBatches: true,
      fields: [
        { name: 'code', label: 'Product code', required: true },
        { name: 'description', label: 'Description' },
        { name: 'category', label: 'Category', type: 'option', optionField: 'category' },
        { name: 'species', label: 'Species', type: 'option', optionField: 'species' },
        { name: 'treatment', label: 'Treatment', type: 'option', optionField: 'treatment' },
        { name: 'thickness_mm', label: 'Sell thickness (mm)', type: 'number' },
        { name: 'width_mm', label: 'Sell width (mm)', type: 'number' },
        { name: 'length_mm', label: 'Length (mm)', type: 'number' },
        { name: 'purchase_thickness_mm', label: 'Purchase thickness (mm)', type: 'number' },
        { name: 'purchase_width_mm', label: 'Purchase width (mm)', type: 'number' },
        { name: 'purchase_length_mm', label: 'Purchase length (mm)', type: 'number' },
        { name: 'sell_rate_per_m3', label: 'Sell rate £/m³', type: 'number' },
        { name: 'default_supplier_id', label: 'Default supplier', type: 'ref', ref: 'suppliers' },
        { name: 'primary_location_id', label: 'Primary location', type: 'ref', ref: 'locations' },
        { name: 'reorder_packs', label: 'Reorder level (packs)', type: 'number' },
        { name: 'notes', label: 'Notes', type: 'textarea' }
      ],
      columns: [
        { key: 'code', label: 'Code' },
        { key: 'description', label: 'Description' },
        { key: '_dims', label: 'Sell size (mm)', render: function (r) {
            var d = [r.thickness_mm, r.width_mm, r.length_mm].filter(function (x) { return x != null && x !== ''; });
            return d.length ? d.join(' × ') : '—';
        } },
        { key: '_pdims', label: 'Purchase size (mm)', render: function (r) {
            var d = [r.purchase_thickness_mm, r.purchase_width_mm, r.purchase_length_mm].filter(function (x) { return x != null && x !== ''; });
            return d.length ? d.join(' × ') : '—';
        } },
        { key: 'sell_rate_per_m3', label: 'Sell £/m³', render: function (r) { return money(r.sell_rate_per_m3); } }
      ]
    },

    stock: { label: 'Stock on hand', icon: '📦' },

    locations: {
      label: 'Locations', icon: '📍', entity: 'locations', singular: 'location',
      fields: [
        { name: 'name', label: 'Location name', required: true },
        { name: 'code', label: 'Short code' },
        { name: 'address', label: 'Address' },
        { name: 'city', label: 'Town / City' },
        { name: 'postcode', label: 'Postcode' }
      ],
      columns: [
        { key: 'name', label: 'Location' },
        { key: 'code', label: 'Code' },
        { key: 'city', label: 'City' },
        { key: 'postcode', label: 'Postcode' }
      ]
    },

    hauliers: {
      label: 'Hauliers', icon: '🚚', entity: 'hauliers', singular: 'haulier',
      fields: [
        { name: 'name', label: 'Haulier name', required: true },
        { name: 'contact_name', label: 'Contact name' },
        { name: 'phone', label: 'Phone' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'vehicle_types', label: 'Vehicle types' },
        { name: 'city', label: 'Town / City' },
        { name: 'county', label: 'County' },
        { name: 'postcode', label: 'Postcode' },
        { name: 'notes', label: 'Notes', type: 'textarea' }
      ],
      columns: [
        { key: 'name', label: 'Haulier' },
        { key: 'contact_name', label: 'Contact' },
        { key: 'phone', label: 'Phone' },
        { key: 'city', label: 'City' },
        { key: 'county', label: 'County' },
        { key: 'postcode', label: 'Postcode' }
      ]
    },

    staff: { label: 'Staff', icon: '🔑', adminOnly: true }
  };

  // ---- App state ----------------------------------------------------
  var user = null;
  var supplierCache = [];   // for resolving supplier names + ref selects
  var locationCache = [];
  var productCache = [];    // for the order line builder
  var customerCache = [];
  var haulierCache = [];
  var optionCache = { category: [], species: [], treatment: [] };
  var staffCache = [];   // active users, for sales-rep dropdowns
  var refCaches = { suppliers: function () { return supplierCache; }, locations: function () { return locationCache; }, staff: function () { return staffCache; } };
  var view = document.getElementById('view');
  var titleEl = document.getElementById('view-title');
  var actionsEl = document.getElementById('topbar-actions');

  function refName(cache, id) {
    if (id == null || id === '') return '—';
    for (var i = 0; i < cache.length; i++) if (String(cache[i].id) === String(id)) return cache[i].name;
    return '#' + id;
  }

  // ---- Boot ---------------------------------------------------------
  Auth.me().then(function (u) {
    if (!u) { window.location.href = 'login.html'; return; }
    user = u;
    document.getElementById('app-user').innerHTML =
      '<div class="app-user-name">' + esc(user.name) + '</div>' +
      '<div class="app-user-role">' + esc(user.role) + '</div>' +
      '<a href="#" id="app-logout" class="app-logout">Log out</a>';
    document.getElementById('app-logout').addEventListener('click', function (e) { e.preventDefault(); Auth.logout(); });
    buildSidebar();
    window.addEventListener('hashchange', route);
    // Preload reference data used by selects + the order builder, then route.
    Promise.all([loadSuppliers(), loadLocations(), loadProducts(), loadCustomers(), loadHauliers(), loadOptions(), loadStaffList()]).then(route);
  });

  function loadStaffList() {
    return Auth.api('/api/stafflist').then(function (d) { staffCache = d.rows || []; }).catch(function () { staffCache = []; });
  }

  function loadOptions() {
    return Auth.api('/api/options').then(function (d) {
      optionCache = { category: [], species: [], treatment: [] };
      (d.rows || []).forEach(function (o) { if (optionCache[o.field]) optionCache[o.field].push(o); });
    }).catch(function () { optionCache = { category: [], species: [], treatment: [] }; });
  }

  function loadSuppliers() {
    return Auth.api('/api/data/suppliers').then(function (d) { supplierCache = d.rows || []; })
      .catch(function () { supplierCache = []; });
  }
  function loadLocations() {
    return Auth.api('/api/data/locations').then(function (d) { locationCache = d.rows || []; })
      .catch(function () { locationCache = []; });
  }
  function loadProducts() {
    return Auth.api('/api/data/products').then(function (d) { productCache = d.rows || []; })
      .catch(function () { productCache = []; });
  }
  function loadCustomers() {
    return Auth.api('/api/data/customers').then(function (d) { customerCache = d.rows || []; })
      .catch(function () { customerCache = []; });
  }
  function loadHauliers() {
    return Auth.api('/api/data/hauliers').then(function (d) { haulierCache = d.rows || []; })
      .catch(function () { haulierCache = []; });
  }
  function productById(id) { for (var i = 0; i < productCache.length; i++) if (String(productCache[i].id) === String(id)) return productCache[i]; return null; }
  var orderBatchById = {};   // batch id -> batch data (from the order-line search)
  // Position a fixed-position results dropdown directly under its search input.
  function positionResults(input, results) {
    var r = input.getBoundingClientRect();
    results.style.left = r.left + 'px';
    results.style.top = (r.bottom + 2) + 'px';
    results.style.width = Math.max(r.width, 260) + 'px';
  }
  function packPrice(p) {
    if (!p || p.sell_rate_per_m3 == null || p.pack_volume == null) return 0;
    return Number(p.sell_rate_per_m3) * Number(p.pack_volume);
  }

  // Left-nav grouping (collapsible, state remembered in localStorage).
  var NAV_GROUPS = [
    { key: 'sales', label: 'Sales', items: ['customers', 'sales_orders', 'picking', 'delivery'] },
    { key: 'accounts', label: 'Accounts', items: ['invoices', 'accounts'] },
    { key: 'purchasing', label: 'Purchasing', items: ['suppliers', 'purchasing', 'loading'] },
    { key: 'stock', label: 'Stock management', items: ['products', 'stock', 'locations'] },
    { key: 'haulage', label: 'Haulage', items: ['hauliers', 'haulage'] },
    { key: 'reports', label: 'Reports', items: ['reports', 'report_creator'] }
  ];
  function navGroupOf(key) {
    for (var i = 0; i < NAV_GROUPS.length; i++) if (NAV_GROUPS[i].items.indexOf(key) >= 0) return NAV_GROUPS[i].key;
    return null;
  }
  // Module keys an admin can grant to a staff user (everything but dashboard/staff).
  function gateableModules() {
    return Object.keys(MODULES).filter(function (k) { return k !== 'dashboard' && k !== 'staff'; });
  }
  // May the current user access a module? null permissions = full access.
  function allowed(key) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (key === 'dashboard') return true;
    if (MODULES[key] && MODULES[key].adminOnly) return false;
    var p = user.permissions;
    if (p == null) return true;
    return p.indexOf(key) >= 0;
  }
  function navCollapsed(groupKey) { try { return localStorage.getItem('nav.' + groupKey) === '1'; } catch (e) { return false; } }
  function setNavCollapsed(groupKey, val) { try { localStorage.setItem('nav.' + groupKey, val ? '1' : '0'); } catch (e) {} }

  function buildSidebar() {
    var nav = document.getElementById('app-nav');
    function link(key) {
      var m = MODULES[key];
      if (!m || !allowed(key)) return '';
      return '<a href="#' + key + '" data-nav="' + key + '"><span class="nav-ico">' + m.icon + '</span>' + esc(m.label) + '</a>';
    }
    var html = link('dashboard');
    NAV_GROUPS.forEach(function (g) {
      var children = g.items.map(link).join('');
      if (!children) return;
      html += '<div class="nav-group' + (navCollapsed(g.key) ? ' collapsed' : '') + '" data-group="' + g.key + '">' +
        '<button type="button" class="nav-group-head" data-grouptoggle="' + g.key + '">' +
        '<span>' + esc(g.label) + '</span><span class="nav-caret">▾</span></button>' +
        '<div class="nav-group-items">' + children + '</div></div>';
    });
    html += link('staff');
    nav.innerHTML = html;

    nav.querySelectorAll('[data-grouptoggle]').forEach(function (btn) {
      btn.onclick = function () {
        var wrap = nav.querySelector('.nav-group[data-group="' + btn.dataset.grouptoggle + '"]');
        var collapsed = wrap.classList.toggle('collapsed');
        setNavCollapsed(btn.dataset.grouptoggle, collapsed);
      };
    });
    document.getElementById('app-burger').addEventListener('click', function () {
      document.getElementById('sidebar').classList.toggle('open');
    });
    // Close the mobile sidebar only when an actual link (not a group header) is tapped.
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) document.getElementById('sidebar').classList.remove('open');
    });
  }

  function setActiveNav(key) {
    var links = document.querySelectorAll('#app-nav a');
    for (var i = 0; i < links.length; i++) links[i].classList.toggle('active', links[i].getAttribute('data-nav') === key);
    // Make sure the active item's group is visible.
    var g = navGroupOf(key);
    if (g) { var wrap = document.querySelector('.nav-group[data-group="' + g + '"]'); if (wrap) wrap.classList.remove('collapsed'); }
  }

  // ---- Router -------------------------------------------------------
  function route() {
    var raw = (location.hash || '#dashboard').slice(1);
    var parts = raw.split('/');
    var key = parts[0], sub = parts[1];
    if (!MODULES[key] || !allowed(key)) key = 'dashboard';
    setActiveNav(key);
    actionsEl.innerHTML = '';
    var m = MODULES[key];
    titleEl.textContent = m.label;
    if (key === 'dashboard') return renderDashboard();
    if (key === 'staff') return renderStaff();
    if (key === 'stock') return renderStock();
    if (key === 'sales_orders') return renderOrders(sub);
    if (key === 'picking') return renderPicking(sub);
    if (key === 'delivery') return renderDelivery(sub);
    if (key === 'invoices') return renderInvoices(sub);
    if (key === 'accounts') return renderAccounts(sub);
    if (key === 'haulage') return renderHaulage(sub);
    if (key === 'purchasing') return renderPurchasing(sub);
    if (key === 'loading') return renderLoading(sub);
    if (key === 'reports') return renderReports();
    if (key === 'report_creator') return renderReportCreator();
    if (key === 'customers') return sub ? renderCustomerProfile(sub) : renderCustomers();
    return renderModule(key, m);
  }

  // ---- Dashboard ----------------------------------------------------
  function renderDashboard() {
    view.innerHTML = '<p class="muted">Loading overview…</p>';
    Auth.api('/api/dashboard').then(function (d) {
      // Actionable KPI cards. Each links to where you act on it. The `alert`
      // flag turns a card red when there's something outstanding.
      var cards = [
        { label: 'Overdue', num: gbp(d.overdue), sub: d.overdue_count + ' invoice' + (d.overdue_count === 1 ? '' : 's') + ' past due', href: 'accounts', ico: '⏰', alert: d.overdue > 0 },
        { label: 'Outstanding receivables', num: gbp(d.receivables), sub: d.unpaid_count + ' unpaid invoice' + (d.unpaid_count === 1 ? '' : 's'), href: 'invoices', ico: '💷', alert: false },
        { label: 'To pick', num: d.to_pick, sub: 'orders awaiting picking', href: 'picking', ico: '📋', alert: d.to_pick > 0 },
        { label: 'Awaiting delivery', num: d.awaiting_delivery, sub: 'picked, not yet delivered', href: 'delivery', ico: '🚚', alert: d.awaiting_delivery > 0 },
        { label: 'Open orders', num: d.open_orders, sub: gbp(d.open_orders_value) + ' in progress', href: 'sales_orders', ico: '🧾', alert: false },
        { label: 'Stock value', num: gbp(d.stock_value), sub: 'on hand, at cost', href: 'stock', ico: '📦', alert: false }
      ].map(function (c) {
        return '<a class="stat-card' + (c.alert ? ' stat-card-alert' : '') + '" href="#' + c.href + '">' +
          '<span class="stat-card-ico">' + c.ico + '</span>' +
          '<span class="stat-card-num">' + c.num + '</span>' +
          '<span class="stat-card-label">' + c.label + '</span>' +
          '<span class="stat-card-sub">' + c.sub + '</span></a>';
      }).join('');

      var deliv = d.deliveries || [];
      var delivHtml = deliv.length
        ? '<table class="data-table"><thead><tr><th>Date</th><th>Haulage order</th><th>Haulier</th><th>Drops</th></tr></thead><tbody>' +
          deliv.map(function (h) {
            return '<tr><td>' + fmtDate(h.delivery_date) + '</td><td>' + esc(h.number || '—') + '</td><td>' +
              esc(h.haulier_name || '—') + '</td><td>' + num(h.drops || 0) + '</td></tr>';
          }).join('') + '</tbody></table>'
        : '<p class="muted">No deliveries scheduled. 👍</p>';

      var low = d.low_stock || [];
      var lowHtml = low.length
        ? '<table class="data-table"><thead><tr><th>Code</th><th>Available packs</th><th>Reorder at</th></tr></thead><tbody>' +
          low.map(function (p) {
            return '<tr><td>' + esc(p.code) + '</td><td>' + num(p.available) +
              ' <span class="badge-low">low</span></td><td>' + num(p.reorder_packs) + '</td></tr>';
          }).join('') + '</tbody></table>'
        : '<p class="muted">All products are above their reorder level (or none set). 👍</p>';

      view.innerHTML =
        '<section class="stat-grid">' + cards + '</section>' +
        '<section class="panel"><h2>Upcoming deliveries</h2>' + delivHtml + '</section>' +
        '<section class="panel"><h2>Low available stock</h2>' + lowHtml + '</section>';
    }).catch(showError);
  }

  // ---- Generic entity module ---------------------------------------
  function renderModule(key, m) {
    actionsEl.innerHTML = '<button class="btn btn-primary btn-sm" id="new-btn">+ New ' + esc(m.singular) + '</button>';
    view.innerHTML =
      '<div class="toolbar"><input type="search" id="search" class="search-input" placeholder="Search ' + esc(m.label.toLowerCase()) + '…"></div>' +
      '<div id="table-wrap"><p class="muted">Loading…</p></div>';

    document.getElementById('new-btn').onclick = function () { openForm(m, null); };
    var search = document.getElementById('search');
    var t;
    search.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { loadTable(m, search.value); }, 200); });
    loadTable(m, '');
  }

  function loadTable(m, q) {
    var wrap = document.getElementById('table-wrap');
    Auth.api('/api/data/' + m.entity + (q ? '?q=' + encodeURIComponent(q) : '')).then(function (d) {
      var rows = d.rows || [];
      if (!rows.length) { wrap.innerHTML = '<p class="muted">No ' + esc(m.label.toLowerCase()) + ' found.</p>'; return; }
      var head = m.columns.map(function (c) { return '<th>' + esc(c.label) + '</th>'; }).join('') + '<th class="col-actions">Actions</th>';
      var body = rows.map(function (r) {
        var tds = m.columns.map(function (c) {
          var val = c.render ? c.render(r) : (r[c.key] == null || r[c.key] === '' ? '—' : esc(r[c.key]));
          return '<td>' + val + '</td>';
        }).join('');
        var acts = '<button class="link-btn" data-edit="' + r.id + '">Edit</button>' +
          (m.profile ? ' <button class="link-btn" data-profile="' + r.id + '">Profile</button>' : '') +
          (m.manageBatches ? ' <button class="link-btn" data-batches="' + r.id + '">Batches</button>' : '') +
          (m.manageContacts ? ' <button class="link-btn" data-contacts="' + r.id + '">Contacts</button>' : '') +
          (m.manageAddresses ? ' <button class="link-btn" data-addr="' + r.id + '">Addresses</button>' : '') +
          ' <button class="link-btn danger" data-del="' + r.id + '">Delete</button>';
        return '<tr>' + tds + '<td class="col-actions">' + acts + '</td></tr>';
      }).join('');
      wrap.innerHTML = '<table class="data-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>';

      wrap.querySelectorAll('[data-edit]').forEach(function (b) {
        b.onclick = function () { openForm(m, rows.find(function (r) { return String(r.id) === b.dataset.edit; })); };
      });
      wrap.querySelectorAll('[data-del]').forEach(function (b) {
        b.onclick = function () { delRow(m, b.dataset.del); };
      });
      wrap.querySelectorAll('[data-addr]').forEach(function (b) {
        b.onclick = function () { var r = rows.find(function (x) { return String(x.id) === b.dataset.addr; }); openAddresses(r.id, r.name); };
      });
      wrap.querySelectorAll('[data-contacts]').forEach(function (b) {
        b.onclick = function () { var r = rows.find(function (x) { return String(x.id) === b.dataset.contacts; }); openContacts(m.entity, r.id, r.name); };
      });
      wrap.querySelectorAll('[data-batches]').forEach(function (b) {
        b.onclick = function () { var r = rows.find(function (x) { return String(x.id) === b.dataset.batches; }); openBatches(r.id, r.code); };
      });
      wrap.querySelectorAll('[data-profile]').forEach(function (b) {
        b.onclick = function () { location.hash = '#customers/' + b.dataset.profile; };
      });
    }).catch(showError);
  }

  // ---- Customer delivery addresses ----------------------------------
  function openAddresses(customerId, customerName) {
    document.getElementById('modal-title').textContent = 'Delivery addresses — ' + (customerName || '');
    modalForm.innerHTML = '<div id="addr-list"><p class="muted">Loading…</p></div>' +
      '<div class="modal-foot"><button type="button" class="btn btn-primary btn-sm" id="addr-new">+ Add address</button>' +
      '<button type="button" class="btn btn-ghost-dark btn-sm" data-cancel>Close</button></div>';
    modalForm.onsubmit = function (e) { e.preventDefault(); };
    modalForm.querySelector('[data-cancel]').onclick = closeModal;
    document.getElementById('addr-new').onclick = function () { editAddress(customerId, null, customerName); };
    loadAddresses(customerId);
    modal.hidden = false;
  }

  function loadAddresses(customerId) {
    Auth.api('/api/addresses?customer_id=' + customerId).then(function (d) {
      var rows = d.rows || [];
      var el = document.getElementById('addr-list');
      if (!el) return;
      if (!rows.length) { el.innerHTML = '<p class="muted">No saved addresses yet.</p>'; return; }
      el.innerHTML = '<table class="data-table"><thead><tr><th>Label</th><th>Address</th><th></th><th class="col-actions"></th></tr></thead><tbody>' +
        rows.map(function (a) {
          var line = [a.address, a.city, a.postcode].filter(Boolean).map(esc).join(', ');
          return '<tr><td>' + esc(a.label || '—') + '</td><td>' + (line || '—') + '</td>' +
            '<td>' + (a.is_default ? '<span class="badge-you">default</span>' : '') + '</td>' +
            '<td class="col-actions"><button class="link-btn" data-aedit="' + a.id + '">Edit</button>' +
            ' <button class="link-btn danger" data-adel="' + a.id + '">Delete</button></td></tr>';
        }).join('') + '</tbody></table>';
      el.querySelectorAll('[data-aedit]').forEach(function (b) {
        b.onclick = function () { editAddress(customerId, rows.find(function (a) { return String(a.id) === b.dataset.aedit; })); };
      });
      el.querySelectorAll('[data-adel]').forEach(function (b) {
        b.onclick = function () {
          if (!confirm('Delete this address?')) return;
          Auth.api('/api/addresses/' + b.dataset.adel, { method: 'DELETE' }).then(function () { loadAddresses(customerId); }).catch(showError);
        };
      });
    }).catch(showError);
  }

  function editAddress(customerId, a) {
    var title = document.getElementById('modal-title');
    var prev = title.textContent;
    title.textContent = a ? 'Edit address' : 'New address';
    modalForm.innerHTML =
      '<div class="fields form-grid">' +
      '<div class="field"><label>Label</label><input id="a-label" value="' + esc(a ? a.label : '') + '" placeholder="e.g. Yard 2"></div>' +
      '<div class="field"><label>Name</label><input id="a-name" value="' + esc(a ? a.name : '') + '"></div>' +
      '<div class="field"><label>Address</label><input id="a-address" value="' + esc(a ? a.address : '') + '"></div>' +
      '<div class="field"><label>Town / City</label><input id="a-city" value="' + esc(a ? a.city : '') + '"></div>' +
      '<div class="field"><label>Postcode</label><input id="a-postcode" value="' + esc(a ? a.postcode : '') + '"></div>' +
      '<div class="field"><label>&nbsp;</label><label style="font-weight:400"><input type="checkbox" id="a-default"' + (a && a.is_default ? ' checked' : '') + '> Default address</label></div>' +
      '</div><p class="form-note" id="modal-note"></p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost-dark btn-sm" id="a-back">Back</button>' +
      '<button type="submit" class="btn btn-primary btn-sm">Save</button></div>';
    document.getElementById('a-back').onclick = function () { openAddresses(customerId, prev.replace('Delivery addresses — ', '')); };
    modalForm.onsubmit = function (e) {
      e.preventDefault();
      var note = document.getElementById('modal-note'); note.textContent = 'Saving…'; note.className = 'form-note';
      var body = {
        customer_id: customerId, label: document.getElementById('a-label').value,
        name: document.getElementById('a-name').value, address: document.getElementById('a-address').value,
        city: document.getElementById('a-city').value, postcode: document.getElementById('a-postcode').value,
        is_default: document.getElementById('a-default').checked
      };
      var req = a ? Auth.api('/api/addresses/' + a.id, { method: 'PATCH', body: body })
                  : Auth.api('/api/addresses', { method: 'POST', body: body });
      req.then(function () { openAddresses(customerId, prev.replace('Delivery addresses — ', '')); })
        .catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    };
  }

  // ---- Partner contacts (customers & suppliers) ---------------------
  function openContacts(partnerType, partnerId, name) {
    document.getElementById('modal-title').textContent = 'Contacts — ' + (name || '');
    modalForm.innerHTML = '<div id="contact-list"><p class="muted">Loading…</p></div>' +
      '<div class="modal-foot"><button type="button" class="btn btn-primary btn-sm" id="contact-new">+ Add contact</button>' +
      '<button type="button" class="btn btn-ghost-dark btn-sm" data-cancel>Close</button></div>';
    modalForm.onsubmit = function (e) { e.preventDefault(); };
    modalForm.querySelector('[data-cancel]').onclick = closeModal;
    document.getElementById('contact-new').onclick = function () { editContact(partnerType, partnerId, null); };
    loadContacts(partnerType, partnerId);
    modal.hidden = false;
  }

  function loadContacts(partnerType, partnerId) {
    Auth.api('/api/contacts?partner_type=' + partnerType + '&partner_id=' + partnerId).then(function (d) {
      var rows = d.rows || [];
      var el = document.getElementById('contact-list');
      if (!el) return;
      if (!rows.length) { el.innerHTML = '<p class="muted">No contacts yet.</p>'; return; }
      el.innerHTML = '<table class="data-table"><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Phone</th><th></th><th class="col-actions"></th></tr></thead><tbody>' +
        rows.map(function (c) {
          return '<tr><td>' + esc(c.name || '—') + '</td><td>' + esc(c.role || '—') + '</td>' +
            '<td>' + esc(c.email || '—') + '</td><td>' + esc(c.phone || '—') + '</td>' +
            '<td>' + (c.is_primary ? '<span class="badge-you">primary</span>' : '') + '</td>' +
            '<td class="col-actions"><button class="link-btn" data-cedit="' + c.id + '">Edit</button>' +
            ' <button class="link-btn danger" data-cdel="' + c.id + '">Delete</button></td></tr>';
        }).join('') + '</tbody></table>';
      el.querySelectorAll('[data-cedit]').forEach(function (b) {
        b.onclick = function () { editContact(partnerType, partnerId, rows.find(function (c) { return String(c.id) === b.dataset.cedit; })); };
      });
      el.querySelectorAll('[data-cdel]').forEach(function (b) {
        b.onclick = function () {
          if (!confirm('Delete this contact?')) return;
          Auth.api('/api/contacts/' + b.dataset.cdel, { method: 'DELETE' }).then(function () { loadContacts(partnerType, partnerId); }).catch(showError);
        };
      });
    }).catch(showError);
  }

  function editContact(partnerType, partnerId, c) {
    var title = document.getElementById('modal-title');
    var prev = title.textContent;
    title.textContent = c ? 'Edit contact' : 'New contact';
    modalForm.innerHTML =
      '<div class="fields form-grid">' +
      '<div class="field"><label>Name</label><input id="c-name" value="' + esc(c ? c.name : '') + '"></div>' +
      '<div class="field"><label>Role / department</label><input id="c-role" value="' + esc(c ? c.role : '') + '" placeholder="e.g. Accounts, Sales, Purchasing"></div>' +
      '<div class="field"><label>Email</label><input id="c-email" type="email" value="' + esc(c ? c.email : '') + '"></div>' +
      '<div class="field"><label>Phone</label><input id="c-phone" value="' + esc(c ? c.phone : '') + '"></div>' +
      '<div class="field"><label>Notes</label><input id="c-cnotes" value="' + esc(c ? c.notes : '') + '"></div>' +
      '<div class="field"><label>&nbsp;</label><label style="font-weight:400"><input type="checkbox" id="c-primary"' + (c && c.is_primary ? ' checked' : '') + '> Primary contact</label></div>' +
      '</div><p class="form-note" id="modal-note"></p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost-dark btn-sm" id="c-back">Back</button>' +
      '<button type="submit" class="btn btn-primary btn-sm">Save</button></div>';
    document.getElementById('c-back').onclick = function () { openContacts(partnerType, partnerId, prev.replace('Contacts — ', '')); };
    modalForm.onsubmit = function (e) {
      e.preventDefault();
      var note = document.getElementById('modal-note'); note.textContent = 'Saving…'; note.className = 'form-note';
      var body = { partner_type: partnerType, partner_id: partnerId,
        name: document.getElementById('c-name').value, role: document.getElementById('c-role').value,
        email: document.getElementById('c-email').value, phone: document.getElementById('c-phone').value,
        notes: document.getElementById('c-cnotes').value, is_primary: document.getElementById('c-primary').checked };
      var req = c ? Auth.api('/api/contacts/' + c.id, { method: 'PATCH', body: body })
                  : Auth.api('/api/contacts', { method: 'POST', body: body });
      req.then(function () { openContacts(partnerType, partnerId, prev.replace('Contacts — ', '')); })
        .catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    };
  }

  // ---- Product batches ----------------------------------------------
  function openBatches(productId, code) {
    document.getElementById('modal-title').textContent = 'Batches — ' + (code || '');
    modalForm.innerHTML = '<div id="batch-list"><p class="muted">Loading…</p></div>' +
      '<div class="modal-foot"><button type="button" class="btn btn-primary btn-sm" id="batch-new">+ Add batch</button>' +
      '<button type="button" class="btn btn-ghost-dark btn-sm" data-cancel>Close</button></div>';
    modalForm.onsubmit = function (e) { e.preventDefault(); };
    modalForm.querySelector('[data-cancel]').onclick = closeModal;
    document.getElementById('batch-new').onclick = function () { editBatch(productId, code, null); };
    loadBatchList(productId, code);
    modal.hidden = false;
  }

  function loadBatchList(productId, code) {
    Auth.api('/api/batches?product_id=' + productId).then(function (d) {
      var rows = d.rows || [];
      var el = document.getElementById('batch-list');
      if (!el) return;
      if (!rows.length) { el.innerHTML = '<p class="muted">No batches yet.</p>'; return; }
      el.innerHTML = '<table class="data-table"><thead><tr><th>Batch</th><th>PPP</th><th>Cur</th><th>Cost/m³</th><th>Landed £/m³</th><th>Packs</th><th class="col-actions"></th></tr></thead><tbody>' +
        rows.map(function (b) {
          return '<tr><td>' + esc(b.batch_no) + '</td><td>' + num(b.ppp) + '</td><td>' + esc(b.currency) + '</td>' +
            '<td>' + (b.cost_per_m3 != null ? Number(b.cost_per_m3).toFixed(2) : '—') + '</td>' +
            '<td>' + (b.landed_cost_per_m3 != null ? gbp(b.landed_cost_per_m3) : '—') + '</td>' +
            '<td>' + num(b.total_packs) + '</td>' +
            '<td class="col-actions"><button class="link-btn" data-bedit="' + b.id + '">Edit</button>' +
            ' <button class="link-btn danger" data-bdel="' + b.id + '">Delete</button></td></tr>';
        }).join('') + '</tbody></table>';
      el.querySelectorAll('[data-bedit]').forEach(function (x) {
        x.onclick = function () { editBatch(productId, code, rows.find(function (b) { return String(b.id) === x.dataset.bedit; })); };
      });
      el.querySelectorAll('[data-bdel]').forEach(function (x) {
        x.onclick = function () {
          if (!confirm('Delete this batch?')) return;
          Auth.api('/api/batches/' + x.dataset.bdel, { method: 'DELETE' }).then(function () { loadBatchList(productId, code); }).catch(function (err) { alert(err.message); });
        };
      });
    }).catch(showError);
  }

  function editBatch(productId, code, b) {
    var prev = 'Batches — ' + (code || '');
    document.getElementById('modal-title').textContent = b ? 'Edit batch' : 'New batch';
    modalForm.innerHTML =
      '<div class="fields form-grid">' +
      '<div class="field"><label>Batch number</label><input id="b-no" value="' + esc(b ? b.batch_no : (code ? code + ' - ' : '')) + '"></div>' +
      '<div class="field"><label>Pieces per pack</label><input id="b-ppp" type="number" step="any" value="' + esc(b && b.ppp != null ? b.ppp : '') + '"></div>' +
      '<div class="field"><label>Currency</label><select id="b-cur"><option value="EUR"' + (b && b.currency === 'EUR' ? ' selected' : '') + '>EUR (€)</option><option value="GBP"' + (b && b.currency === 'GBP' ? ' selected' : '') + '>GBP (£)</option></select></div>' +
      '<div class="field"><label>Cost /m³ (source currency)</label><input id="b-cost" type="number" step="any" value="' + esc(b && b.cost_per_m3 != null ? b.cost_per_m3 : '') + '"></div>' +
      '<div class="field"><label>Exchange € per £</label><input id="b-ex" type="number" step="any" value="' + esc(b && b.exchange_rate != null ? b.exchange_rate : '1.15') + '"></div>' +
      '<div class="field"><label>Freight £/m³</label><input id="b-fr" type="number" step="any" value="' + esc(b && b.freight_rate != null ? b.freight_rate : '45') + '"></div>' +
      '</div><p class="form-note" id="modal-note"></p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost-dark btn-sm" id="b-back">Back</button>' +
      '<button type="submit" class="btn btn-primary btn-sm">Save</button></div>';
    document.getElementById('b-back').onclick = function () { openBatches(productId, code); };
    modalForm.onsubmit = function (e) {
      e.preventDefault();
      var note = document.getElementById('modal-note'); note.textContent = 'Saving…'; note.className = 'form-note';
      var body = { product_id: productId, batch_no: document.getElementById('b-no').value,
        ppp: document.getElementById('b-ppp').value, currency: document.getElementById('b-cur').value,
        cost_per_m3: document.getElementById('b-cost').value, exchange_rate: document.getElementById('b-ex').value,
        freight_rate: document.getElementById('b-fr').value };
      var req = b ? Auth.api('/api/batches/' + b.id, { method: 'PATCH', body: body })
                  : Auth.api('/api/batches', { method: 'POST', body: body });
      req.then(function () { openBatches(productId, code); })
        .catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    };
  }

  // ---- Customers CRM list -------------------------------------------
  function relTime(iso) {
    if (!iso) return '<span class="badge-low">never</span>';
    var days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return days + 'd ago';
    if (days < 365) return Math.floor(days / 30) + 'mo ago';
    return Math.floor(days / 365) + 'y ago';
  }
  function reloadCustomers() { var s = document.getElementById('cust-search'); loadCustomersList(s ? s.value : ''); }

  function renderCustomers() {
    actionsEl.innerHTML = '<button class="btn btn-primary btn-sm" id="new-customer">+ New customer</button>';
    view.innerHTML =
      '<div class="toolbar"><input type="search" id="cust-search" class="search-input" placeholder="Search customers…"></div>' +
      '<p class="muted" style="margin:-4px 0 10px;font-size:.85rem">Your customers first; within each group, longest-since-contacted at the top — the next to call.</p>' +
      '<div id="cust-wrap"><p class="muted">Loading…</p></div>';
    document.getElementById('new-customer').onclick = function () { openForm(MODULES.customers, null, reloadCustomers); };
    var s = document.getElementById('cust-search'), t;
    s.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { loadCustomersList(s.value); }, 200); });
    loadCustomersList('');
  }

  function loadCustomersList(q) {
    var wrap = document.getElementById('cust-wrap');
    Auth.api('/api/customers' + (q ? '?q=' + encodeURIComponent(q) : '')).then(function (d) {
      var rows = d.rows || [], me = d.me;
      if (!rows.length) { wrap.innerHTML = '<p class="muted">No customers found.</p>'; return; }
      var body = rows.map(function (r) {
        var mine = r.sales_rep_id != null && String(r.sales_rep_id) === String(me);
        return '<tr' + (mine ? ' style="background:#fff7ed"' : '') + '><td>' + esc(r.name) + (mine ? ' <span class="badge-you">yours</span>' : '') + '</td>' +
          '<td>' + esc(r.sales_rep_name || '—') + '</td><td>' + esc(r.city || '—') + '</td>' +
          '<td>' + relTime(r.last_contacted) + '</td>' +
          '<td style="text-align:right">' + (Number(r.outstanding) ? gbp(r.outstanding) : '—') + '</td>' +
          '<td class="col-actions">' +
            '<button class="link-btn" data-profile="' + r.id + '">Profile</button>' +
            ' <button class="link-btn" data-note="' + r.id + '" data-name="' + esc(r.name) + '">Log note</button>' +
            ' <button class="link-btn" data-edit="' + r.id + '">Edit</button>' +
            ' <button class="link-btn" data-contacts="' + r.id + '">Contacts</button>' +
            ' <button class="link-btn" data-addr="' + r.id + '">Addresses</button>' +
            ' <button class="link-btn danger" data-del="' + r.id + '">Delete</button></td></tr>';
      }).join('');
      wrap.innerHTML = '<table class="data-table"><thead><tr><th>Customer</th><th>Sales rep</th><th>City</th><th>Last contacted</th><th style="text-align:right">Outstanding</th><th class="col-actions">Actions</th></tr></thead><tbody>' + body + '</tbody></table>';
      wrap.querySelectorAll('[data-profile]').forEach(function (b) { b.onclick = function () { location.hash = '#customers/' + b.dataset.profile; }; });
      wrap.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { Auth.api('/api/data/customers/' + b.dataset.edit).then(function (d) { openForm(MODULES.customers, d.row, reloadCustomers); }).catch(showError); }; });
      wrap.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { if (confirm('Delete this customer? This cannot be undone.')) Auth.api('/api/data/customers/' + b.dataset.del, { method: 'DELETE' }).then(function () { loadCustomers(); reloadCustomers(); }).catch(showError); }; });
      wrap.querySelectorAll('[data-contacts]').forEach(function (b) { b.onclick = function () { var r = rows.find(function (x) { return String(x.id) === b.dataset.contacts; }); openContacts('customers', r.id, r.name); }; });
      wrap.querySelectorAll('[data-addr]').forEach(function (b) { b.onclick = function () { var r = rows.find(function (x) { return String(x.id) === b.dataset.addr; }); openAddresses(r.id, r.name); }; });
      wrap.querySelectorAll('[data-note]').forEach(function (b) { b.onclick = function () { openQuickNote(b.dataset.note, b.dataset.name, reloadCustomers); }; });
    }).catch(showError);
  }

  function openQuickNote(customerId, name, onDone) {
    document.getElementById('modal-title').textContent = 'Log interaction — ' + (name || '');
    modalForm.innerHTML =
      '<div class="fields form-grid">' +
      '<div class="field"><label>Type</label><select id="qn-type"><option value="call">Call</option><option value="email">Email</option><option value="visit">Visit</option><option value="note">Note</option></select></div>' +
      '<div class="field"><label>Subject</label><input id="qn-subject" placeholder="e.g. Quote follow-up"></div></div>' +
      '<div class="field"><label>Details</label><textarea id="qn-body" rows="3"></textarea></div>' +
      '<p class="form-note" id="modal-note"></p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost-dark btn-sm" data-cancel>Cancel</button>' +
      '<button type="submit" class="btn btn-primary btn-sm">Save</button></div>';
    modalForm.querySelector('[data-cancel]').onclick = closeModal;
    modalForm.onsubmit = function (e) {
      e.preventDefault();
      var note = document.getElementById('modal-note'); note.textContent = 'Saving…'; note.className = 'form-note';
      var body = { customer_id: customerId, type: document.getElementById('qn-type').value, subject: document.getElementById('qn-subject').value, body: document.getElementById('qn-body').value };
      if (!body.subject && !body.body) { note.textContent = 'Enter a note.'; note.className = 'form-note err'; return; }
      Auth.api('/api/interactions', { method: 'POST', body: body }).then(function () { closeModal(); if (onDone) onDone(); })
        .catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    };
    modal.hidden = false;
  }

  // ---- Customer profile + interaction log ---------------------------
  var INTERACTION_META = { call: ['Call', '📞'], email: ['Email', '✉️'], visit: ['Visit', '🤝'], note: ['Note', '📝'] };

  function renderCustomerProfile(id) {
    titleEl.textContent = 'Customer profile';
    actionsEl.innerHTML = '<a class="btn btn-ghost-dark btn-sm" href="#customers">Back</a>';
    view.innerHTML = '<p class="muted">Loading…</p>';
    Promise.all([
      Auth.api('/api/data/customers/' + id),
      Auth.api('/api/interactions?customer_id=' + id),
      Auth.api('/api/customers/' + id).catch(function () { return {}; })
    ]).then(function (res) {
      var c = res[0].row, notes = res[1].rows || [], sum = res[2] || {};
      if (!c) { showError({ message: 'Customer not found.' }); return; }
      titleEl.textContent = c.name || 'Customer profile';
      actionsEl.innerHTML =
        '<button class="btn btn-ghost-dark btn-sm" id="cp-edit">Edit</button> ' +
        '<button class="btn btn-ghost-dark btn-sm" id="cp-contacts">Contacts</button> ' +
        '<button class="btn btn-ghost-dark btn-sm" id="cp-addr">Addresses</button> ' +
        '<a class="btn btn-ghost-dark btn-sm" href="#customers">Back</a>';

      var detail = [
        ['Contact', c.contact_name], ['Email', c.email], ['Phone', c.phone],
        ['Address', [c.address, c.city, c.postcode].filter(Boolean).join(', ')],
        ['Account no.', c.account_no], ['VAT rate', c.vat_rate != null ? c.vat_rate + '%' : ''],
        ['Credit limit', c.credit_limit != null ? '£' + Number(c.credit_limit).toLocaleString() : ''],
        ['Credit terms', (c.credit_terms_days != null ? c.credit_terms_days + ' days' : '') + (c.credit_terms_eom ? ' EOM' : '')],
        ['Company reg.', c.company_number], ['VAT number', c.vat_number]
      ].map(function (r) { return kv(r[0], esc(r[1] || '—')); }).join('');

      var bankRows = [
        ['Bank', c.bank_name], ['Account name', c.bank_account_name], ['Sort code', c.bank_sort_code],
        ['Account no.', c.bank_account_number], ['IBAN', c.bank_iban], ['BIC / SWIFT', c.bank_bic]
      ].filter(function (r) { return r[1]; }).map(function (r) { return kv(r[0], esc(r[1])); }).join('');

      // 6-month sales sparkline + balances.
      var map = {}; (sum.monthly || []).forEach(function (m) { map[m.ym] = Number(m.net) || 0; });
      var series = [], dref = new Date();
      for (var mi = 5; mi >= 0; mi--) { var dt = new Date(dref.getFullYear(), dref.getMonth() - mi, 1); var ym = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'); series.push({ label: dt.toLocaleDateString('en-GB', { month: 'short' }), net: map[ym] || 0 }); }
      var maxNet = Math.max.apply(null, series.map(function (s) { return s.net; }).concat([1]));
      var bars = series.map(function (s) {
        var h = Math.max(2, Math.round((s.net / maxNet) * 60));
        return '<div style="display:inline-block;width:15%;text-align:center;vertical-align:bottom">' +
          '<div style="height:60px;display:flex;align-items:flex-end;justify-content:center"><div style="width:55%;background:var(--orange,#e3792b);height:' + h + 'px"></div></div>' +
          '<div style="font-size:.7rem">' + esc(s.label) + '</div><div style="font-size:.68rem;color:#666">' + gbp(s.net) + '</div></div>';
      }).join('');
      var summaryPanel = '<div class="panel" style="margin-top:18px"><h3 class="sub-h">Account summary</h3>' +
        '<div class="detail-grid"><div>' +
          kv('Outstanding balance', '<strong>' + gbp(sum.outstanding || 0) + '</strong>') +
          kv('Credit limit', sum.credit_limit != null ? gbp(sum.credit_limit) : '—') +
          kv('Available credit', sum.available != null ? (sum.available < 0 ? '<span class="badge-low">' + gbp(sum.available) + '</span>' : gbp(sum.available)) : '—') +
          kv('Open orders', sum.open_orders ? (sum.open_orders.count + ' · ' + gbp(sum.open_orders.value)) : '—') +
          '<div style="margin-top:10px"><a class="link-btn" href="#accounts/' + c.id + '">View account statement →</a></div>' +
        '</div><div><div class="muted" style="font-size:.8rem;margin-bottom:6px">Sales (invoiced net) — last 6 months</div>' + bars + '</div></div></div>';

      view.innerHTML =
        '<div class="detail-grid">' +
          '<div class="panel"><h3 class="sub-h">Details</h3>' + detail + '</div>' +
          '<div class="panel"><h3 class="sub-h">Bank</h3>' + (bankRows || '<span class="muted">—</span>') +
            (c.notes ? '<h3 class="sub-h" style="margin-top:18px">Notes</h3>' + esc(c.notes) : '') + '</div>' +
        '</div>' +
        summaryPanel +
        '<div class="panel" style="margin-top:18px"><h3 class="sub-h">Log an interaction</h3>' +
          '<div class="fields form-grid">' +
            '<div class="field"><label>Type</label><select id="ci-type"><option value="call">Call</option><option value="email">Email</option><option value="visit">Visit</option><option value="note">Note</option></select></div>' +
            '<div class="field"><label>Subject</label><input id="ci-subject" placeholder="e.g. Quote follow-up"></div>' +
          '</div>' +
          '<div class="field"><label>Details</label><textarea id="ci-body" rows="3" placeholder="What was discussed…"></textarea></div>' +
          '<p class="form-note" id="ci-note"></p>' +
          '<div style="text-align:right"><button class="btn btn-primary btn-sm" id="ci-save">Add to log</button></div>' +
        '</div>' +
        '<div class="panel" style="margin-top:18px"><h3 class="sub-h">Interaction history</h3><div id="ci-list"></div></div>';

      document.getElementById('cp-edit').onclick = function () { openForm(MODULES.customers, c, function () { renderCustomerProfile(id); }); };
      document.getElementById('cp-contacts').onclick = function () { openContacts('customers', c.id, c.name); };
      document.getElementById('cp-addr').onclick = function () { openAddresses(c.id, c.name); };
      document.getElementById('ci-save').onclick = function () {
        var note = document.getElementById('ci-note');
        var body = { customer_id: c.id, type: document.getElementById('ci-type').value,
          subject: document.getElementById('ci-subject').value, body: document.getElementById('ci-body').value };
        if (!body.subject && !body.body) { note.textContent = 'Enter a note.'; note.className = 'form-note err'; return; }
        note.textContent = 'Saving…'; note.className = 'form-note';
        Auth.api('/api/interactions', { method: 'POST', body: body }).then(function () {
          document.getElementById('ci-subject').value = ''; document.getElementById('ci-body').value = '';
          note.textContent = '';
          loadInteractions(c.id);
        }).catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
      };
      renderInteractionList(notes);
    }).catch(showError);
  }

  function loadInteractions(customerId) {
    Auth.api('/api/interactions?customer_id=' + customerId).then(function (d) { renderInteractionList(d.rows || []); }).catch(showError);
  }

  function renderInteractionList(notes) {
    var el = document.getElementById('ci-list');
    if (!el) return;
    if (!notes.length) { el.innerHTML = '<p class="muted">No interactions logged yet.</p>'; return; }
    el.innerHTML = notes.map(function (n) {
      var meta = INTERACTION_META[n.type] || ['Note', '📝'];
      var when = (n.created_at || '').replace('T', ' ').slice(0, 16);
      return '<div class="ci-item" style="border-left:3px solid #d0d0d0;padding:8px 12px;margin-bottom:10px">' +
        '<div><strong>' + meta[1] + ' ' + meta[0] + '</strong>' + (n.subject ? ' — ' + esc(n.subject) : '') +
        ' <span class="muted" style="font-size:.82rem">' + esc(when) + (n.author ? ' · ' + esc(n.author) : '') + '</span>' +
        ' <button class="link-btn danger" data-cidel="' + n.id + '" style="float:right">delete</button></div>' +
        (n.body ? '<div style="margin-top:4px;white-space:pre-wrap">' + esc(n.body) + '</div>' : '') + '</div>';
    }).join('');
    el.querySelectorAll('[data-cidel]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('Delete this interaction?')) return;
        Auth.api('/api/interactions/' + b.dataset.cidel, { method: 'DELETE' })
          .then(function () { var p = b.closest('.ci-item'); if (p) p.remove(); }).catch(function (err) { alert(err.message); });
      };
    });
  }

  function delRow(m, id) {
    if (!confirm('Delete this ' + m.singular + '? This cannot be undone.')) return;
    Auth.api('/api/data/' + m.entity + '/' + id, { method: 'DELETE' })
      .then(function () { refreshCacheFor(m.entity); loadTable(m, document.getElementById('search').value); })
      .catch(showError);
  }

  // ---- Modal form ---------------------------------------------------
  var modal = document.getElementById('modal');
  var modalForm = document.getElementById('modal-form');
  document.querySelectorAll('#modal [data-close]').forEach(function (el) { el.onclick = closeModal; });
  function closeModal() { modal.hidden = true; modalForm.innerHTML = ''; }

  function fieldHtml(f, value) {
    var v = value == null ? '' : value;
    var lbl = '<label for="f-' + f.name + '">' + esc(f.label) + (f.required ? ' *' : '') + '</label>';
    if (f.type === 'textarea')
      return '<div class="field">' + lbl + '<textarea id="f-' + f.name + '" name="' + f.name + '" rows="3">' + esc(v) + '</textarea></div>';
    if (f.type === 'select') {
      var opts = f.options.map(function (o) {
        return '<option value="' + esc(o.value) + '"' + (String(o.value) === String(v) ? ' selected' : '') + '>' + esc(o.label) + '</option>';
      }).join('');
      return '<div class="field">' + lbl + '<select id="f-' + f.name + '" name="' + f.name + '">' + opts + '</select></div>';
    }
    if (f.type === 'ref') {
      var list = refCaches[f.ref] ? refCaches[f.ref]() : [];
      var ropts = '<option value="">— none —</option>' + list.map(function (o) {
        return '<option value="' + o.id + '"' + (String(o.id) === String(v) ? ' selected' : '') + '>' + esc(o.name) + '</option>';
      }).join('');
      return '<div class="field">' + lbl + '<select id="f-' + f.name + '" name="' + f.name + '">' + ropts + '</select></div>';
    }
    if (f.type === 'option') {
      return '<div class="field">' + lbl + '<select id="f-' + f.name + '" name="' + f.name + '" data-optfield="' +
        esc(f.optionField) + '" data-prev="' + esc(v) + '">' + optionSelectInner(f.optionField, v) + '</select></div>';
    }
    var type = f.type === 'number' ? 'number' : (f.type === 'email' ? 'email' : 'text');
    var step = f.type === 'number' ? ' step="any"' : '';
    return '<div class="field">' + lbl + '<input id="f-' + f.name + '" name="' + f.name + '" type="' + type + '"' + step +
      ' value="' + esc(v) + '"' + (f.required ? ' required' : '') + '></div>';
  }

  function optionSelectInner(field, current) {
    var list = optionCache[field] || [];
    var has = false;
    var opts = '<option value="">— none —</option>' + list.map(function (o) {
      if (String(o.value) === String(current)) has = true;
      return '<option value="' + esc(o.value) + '"' + (String(o.value) === String(current) ? ' selected' : '') + '>' + esc(o.value) + '</option>';
    }).join('');
    if (current && !has) opts += '<option value="' + esc(current) + '" selected>' + esc(current) + '</option>';
    return opts + '<option value="__add__">➕ Add new…</option>';
  }

  function handleOptionAdd(sel) {
    var field = sel.dataset.optfield;
    var v = (prompt('Add new ' + field + ':') || '').trim();
    if (!v) { sel.value = sel.dataset.prev || ''; return; }
    Auth.api('/api/options', { method: 'POST', body: { field: field, value: v } }).then(function (r) {
      if (!optionCache[field]) optionCache[field] = [];
      if (!optionCache[field].some(function (o) { return o.value === r.row.value; })) optionCache[field].push(r.row);
      optionCache[field].sort(function (a, b) { return a.value.localeCompare(b.value); });
      sel.innerHTML = optionSelectInner(field, r.row.value);
      sel.value = r.row.value;
      sel.dataset.prev = r.row.value;
    }).catch(function (err) { alert(err.message); sel.value = sel.dataset.prev || ''; });
  }

  function wireOptionSelects() {
    modalForm.querySelectorAll('select[data-optfield]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        if (sel.value === '__add__') handleOptionAdd(sel);
        else sel.dataset.prev = sel.value;
      });
    });
  }

  function openForm(m, row, onSaved) {
    var editing = !!row;
    document.getElementById('modal-title').textContent = (editing ? 'Edit ' : 'New ') + m.singular;
    var grid = m.fields.length > 4 ? ' form-grid' : '';
    modalForm.innerHTML = '<div class="fields' + grid + '">' +
      m.fields.map(function (f) { return fieldHtml(f, row ? row[f.name] : (f.name === 'stocking_unit' ? 'pack' : '')); }).join('') +
      '</div><p class="form-note" id="modal-note"></p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost-dark btn-sm" data-cancel>Cancel</button>' +
      '<button type="submit" class="btn btn-primary btn-sm">' + (editing ? 'Save changes' : 'Create') + '</button></div>';
    modalForm.querySelector('[data-cancel]').onclick = closeModal;
    wireOptionSelects();

    modalForm.onsubmit = function (e) {
      e.preventDefault();
      var data = {};
      m.fields.forEach(function (f) { data[f.name] = modalForm.elements[f.name].value; });
      var note = document.getElementById('modal-note');
      note.textContent = 'Saving…'; note.className = 'form-note';
      var url = '/api/data/' + m.entity + (editing ? '/' + row.id : '');
      Auth.api(url, { method: editing ? 'PATCH' : 'POST', body: data }).then(function () {
        closeModal();
        refreshCacheFor(m.entity);
        if (onSaved) onSaved();
        else loadTable(m, (document.getElementById('search') || {}).value || '');
      }).catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    };
    modal.hidden = false;
  }

  function refreshCacheFor(entity) {
    if (entity === 'suppliers') loadSuppliers();
    if (entity === 'locations') loadLocations();
    if (entity === 'customers') loadCustomers();
  }

  // ---- Stock on hand (per product + location) -----------------------
  var stockQuery = '';
  function renderStock() {
    actionsEl.innerHTML = '<button class="btn btn-primary btn-sm" id="cust-stocklist">Customer stock list</button>';
    document.getElementById('cust-stocklist').onclick = function () { renderStockListBuilder(); };
    var locOpts = '<option value="">All locations</option>' + locationCache.map(function (l) {
      return '<option value="' + l.id + '">' + esc(l.name) + '</option>';
    }).join('');
    view.innerHTML =
      '<div class="toolbar toolbar-row">' +
      '<input type="search" id="stock-search" class="search-input" placeholder="Search by code or description…">' +
      '<select id="stock-loc" class="search-input">' + locOpts + '</select></div>' +
      '<div id="stock-wrap"><p class="muted">Loading…</p></div>';
    var s = document.getElementById('stock-search'), loc = document.getElementById('stock-loc');
    s.value = stockQuery;
    var t;
    s.addEventListener('input', function () { clearTimeout(t); t = setTimeout(loadStock, 200); });
    loc.addEventListener('change', loadStock);
    loadStock();
  }

  // ---- Customer stock list builder ----------------------------------
  var slbState = { customerId: null, products: [], selected: {}, saved: [], locations: [], bins: {} };
  function slbSelectedBins() { return (slbState.locations || []).filter(function (l) { return slbState.bins[l.id]; }); }
  function slbAvailByBin(p) { var m = {}; (p.by_location || []).forEach(function (x) { m[x.location_id] = Number(x.available_packs) || 0; }); return m; }
  function slbTotalAvail(p) { var m = slbAvailByBin(p); var t = 0; slbSelectedBins().forEach(function (l) { t += (m[l.id] || 0); }); return t; }

  function renderStockListBuilder() {
    titleEl.textContent = 'Customer stock list';
    actionsEl.innerHTML = '<button class="btn btn-ghost-dark btn-sm" id="slb-back">Back to stock</button>';
    document.getElementById('slb-back').onclick = function () { renderStock(); };
    var custOpts = '<option value="">— select customer —</option>' + customerCache.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('');
    view.innerHTML =
      '<div class="panel"><div class="fields form-grid">' +
        field('Customer', '<select id="slb-cust">' + custOpts + '</select>') +
        field('Saved list', '<select id="slb-saved"><option value="">— none —</option></select>') +
      '</div>' +
      '<div id="slb-actions" style="display:none;margin:8px 0">' +
        '<button class="btn btn-ghost-dark btn-sm" id="slb-all">Select all</button> ' +
        '<button class="btn btn-ghost-dark btn-sm" id="slb-none">Select none</button> ' +
        '<button class="btn btn-primary btn-sm" id="slb-export">Export to Excel (CSV)</button> ' +
        '<button class="btn btn-ghost-dark btn-sm" id="slb-print">Print / PDF</button> ' +
        '<button class="btn btn-ghost-dark btn-sm" id="slb-save">Save selection</button> ' +
        '<button class="btn btn-ghost-dark btn-sm danger" id="slb-delsaved" style="display:none">Delete saved list</button>' +
      '</div>' +
      '<div id="slb-wrap"><p class="muted">Choose a customer to see the products they\'ve ordered before.</p></div></div>';
    document.getElementById('slb-cust').onchange = function () { slbLoad(this.value); };
    document.getElementById('slb-saved').onchange = function () { slbApplySaved(this.value); };
  }

  function slbLoad(customerId) {
    slbState.customerId = customerId;
    var actions = document.getElementById('slb-actions');
    if (!customerId) { document.getElementById('slb-wrap').innerHTML = '<p class="muted">Choose a customer…</p>'; actions.style.display = 'none'; return; }
    document.getElementById('slb-wrap').innerHTML = '<p class="muted">Loading…</p>';
    Auth.api('/api/stocklist?customer_id=' + customerId).then(function (d) {
      slbState.products = d.products || [];
      slbState.saved = d.saved || [];
      slbState.locations = d.locations || [];
      slbState.bins = {};
      slbState.locations.forEach(function (l) { slbState.bins[l.id] = true; });   // all bins on by default
      slbState.selected = {};
      slbState.products.forEach(function (p) { slbState.selected[p.id] = true; });
      var sv = document.getElementById('slb-saved');
      sv.innerHTML = '<option value="">— none (all products) —</option>' + slbState.saved.map(function (s) {
        return '<option value="' + s.id + '">' + esc(s.name) + '</option>'; }).join('');
      document.getElementById('slb-delsaved').style.display = 'none';
      actions.style.display = slbState.products.length ? '' : 'none';
      slbWireActions();
      slbRenderGrid();
    }).catch(showError);
  }

  function slbApplySaved(listId) {
    document.getElementById('slb-delsaved').style.display = listId ? '' : 'none';
    if (!listId) { slbState.products.forEach(function (p) { slbState.selected[p.id] = true; }); slbRenderGrid(); return; }
    var s = slbState.saved.find(function (x) { return String(x.id) === String(listId); });
    var set = {}; (s ? s.product_ids : []).forEach(function (id) { set[id] = true; });
    slbState.products.forEach(function (p) { slbState.selected[p.id] = !!set[p.id]; });
    slbRenderGrid();
  }

  function slbRenderGrid() {
    var wrap = document.getElementById('slb-wrap');
    if (!slbState.products.length) { wrap.innerHTML = '<p class="muted">This customer has no order history yet.</p>'; return; }
    var binsUi = slbState.locations.length
      ? '<div style="margin-bottom:12px"><strong>Stock bins:</strong> ' + slbState.locations.map(function (l) {
          return '<label style="margin-right:16px;font-weight:400"><input type="checkbox" class="slb-bin" data-id="' + l.id + '"' + (slbState.bins[l.id] ? ' checked' : '') + '> ' + esc(l.name) + '</label>';
        }).join('') + '</div>'
      : '<p class="muted">No stock currently available for this customer\'s products.</p>';
    var bins = slbSelectedBins();
    var binHead = bins.map(function (l) { return '<th style="text-align:right">' + esc(l.name) + '</th>'; }).join('');
    var body = slbState.products.map(function (p) {
      var by = slbAvailByBin(p);
      var total = slbTotalAvail(p);
      var availV = total * (p.pack_volume != null ? Number(p.pack_volume) : 0);
      var dims = [p.thickness_mm, p.width_mm, p.length_mm].filter(function (x) { return x != null && x !== ''; }).join(' × ') || '—';
      var binCells = bins.map(function (l) { return '<td style="text-align:right">' + (by[l.id] ? by[l.id] : '–') + '</td>'; }).join('');
      return '<tr><td><input type="checkbox" class="slb-cb" data-id="' + p.id + '"' + (slbState.selected[p.id] ? ' checked' : '') + '></td>' +
        '<td>' + esc(p.code || '—') + '</td><td>' + esc(p.batch_no || '—') + '</td><td>' + esc(p.description || '—') + '</td>' +
        '<td>' + dims + '</td><td>' + num(p.ppp) + '</td>' + binCells +
        '<td style="text-align:right;font-weight:600">' + total + '</td><td style="text-align:right">' + availV.toFixed(3) + '</td>' +
        '<td style="text-align:right">' + (p.sell_rate_per_m3 != null ? gbp(p.sell_rate_per_m3) : '—') + '</td></tr>';
    }).join('');
    wrap.innerHTML = binsUi +
      '<table class="data-table"><thead><tr><th></th><th>Code</th><th>Batch</th><th>Description</th><th>Size (mm)</th><th>PPP</th>' +
      binHead + '<th style="text-align:right">Total</th><th>Avail m³</th><th>£/m³</th></tr></thead><tbody>' + body + '</tbody></table>';
    wrap.querySelectorAll('.slb-cb').forEach(function (cb) {
      cb.onchange = function () { slbState.selected[cb.dataset.id] = cb.checked; };
    });
    wrap.querySelectorAll('.slb-bin').forEach(function (cb) {
      cb.onchange = function () { slbState.bins[cb.dataset.id] = cb.checked; slbRenderGrid(); };
    });
  }

  function slbWireActions() {
    document.getElementById('slb-all').onclick = function () { slbState.products.forEach(function (p) { slbState.selected[p.id] = true; }); slbRenderGrid(); };
    document.getElementById('slb-none').onclick = function () { slbState.products.forEach(function (p) { slbState.selected[p.id] = false; }); slbRenderGrid(); };
    document.getElementById('slb-export').onclick = slbExport;
    document.getElementById('slb-print').onclick = slbPrint;
    document.getElementById('slb-save').onclick = slbSave;
    document.getElementById('slb-delsaved').onclick = slbDeleteSaved;
  }

  function slbSelectedProducts() {
    return slbState.products.filter(function (p) { return slbState.selected[p.id]; });
  }

  function slbExport() {
    var sel = slbSelectedProducts();
    if (!sel.length) { alert('Select at least one product.'); return; }
    var cust = customerCache.find(function (c) { return String(c.id) === String(slbState.customerId); });
    var bins = slbSelectedBins();
    var matrix = [['Code', 'Batch', 'Description', 'Size (mm)', 'PPP'].concat(bins.map(function (l) { return l.name; }), ['Available packs', 'Available m³', 'Sell £/m³'])];
    sel.forEach(function (p) {
      var by = slbAvailByBin(p);
      var total = slbTotalAvail(p);
      var availV = total * (p.pack_volume != null ? Number(p.pack_volume) : 0);
      var dims = [p.thickness_mm, p.width_mm, p.length_mm].filter(function (x) { return x != null && x !== ''; }).join(' x ');
      matrix.push([p.code || '', p.batch_no || '', p.description || '', dims, p.ppp || '']
        .concat(bins.map(function (l) { return by[l.id] || 0; }), [total, availV.toFixed(3), p.sell_rate_per_m3 != null ? Number(p.sell_rate_per_m3) : '']));
    });
    var fname = 'stock-list-' + ((cust && cust.name) || 'customer').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.csv';
    downloadCSV(fname, matrix);
  }

  function slbPrint() {
    var sel = slbSelectedProducts();
    if (!sel.length) { alert('Select at least one product.'); return; }
    var cust = customerCache.find(function (c) { return String(c.id) === String(slbState.customerId); });
    var bins = slbSelectedBins();
    var binHead = bins.map(function (l) { return '<th style="text-align:right">' + esc(l.name) + '</th>'; }).join('');
    var rows = sel.map(function (p) {
      var by = slbAvailByBin(p);
      var total = slbTotalAvail(p);
      var availV = total * (p.pack_volume != null ? Number(p.pack_volume) : 0);
      var dims = [p.thickness_mm, p.width_mm, p.length_mm].filter(function (x) { return x != null && x !== ''; }).join(' × ') || '—';
      var binCells = bins.map(function (l) { return '<td style="text-align:right">' + (by[l.id] ? by[l.id] : '–') + '</td>'; }).join('');
      return '<tr><td>' + esc(p.code || '') + '</td><td>' + esc(p.batch_no || '') + '</td><td>' + esc(p.description || '') + '</td>' +
        '<td>' + dims + '</td><td style="text-align:right">' + num(p.ppp) + '</td>' + binCells +
        '<td style="text-align:right;font-weight:600">' + total + '</td><td style="text-align:right">' + availV.toFixed(3) + '</td>' +
        '<td style="text-align:right">' + (p.sell_rate_per_m3 != null ? gbp(p.sell_rate_per_m3) : '—') + '</td></tr>';
    }).join('');
    var html = '<html><head><title>Stock list</title><style>' +
      'body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{margin:0 0 4px}.muted{color:#666}' +
      '.head{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:10px}' +
      'table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #ccc;padding:7px;font-size:12px}th{background:#f0f0f0;text-align:left}</style></head><body>' +
      '<div class="head"><div><h1>Stock List</h1><div class="muted">' + esc((cust && cust.name) || '') + '</div></div>' +
      '<div style="text-align:right">' + companyHead() + '<br><span class="muted">' + new Date().toLocaleDateString('en-GB') + '</span></div></div>' +
      '<table><thead><tr><th>Code</th><th>Batch</th><th>Description</th><th>Size (mm)</th><th style="text-align:right">PPP</th>' + binHead +
      '<th style="text-align:right">Total</th><th style="text-align:right">Avail m³</th><th style="text-align:right">£/m³</th></tr></thead><tbody>' +
      rows + '</tbody></table>' +
      '<p class="muted" style="margin-top:18px">Availability is indicative and subject to prior sale.</p>' +
      '</body></html>';
    var w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to print.'); return; }
    w.document.write(html); w.document.close(); w.focus(); w.print();
  }

  function slbSave() {
    var sel = slbSelectedProducts();
    if (!sel.length) { alert('Select at least one product.'); return; }
    var name = (prompt('Name this stock list (e.g. "Regular sizes"):') || '').trim();
    if (!name) return;
    Auth.api('/api/stocklist', { method: 'POST', body: { customer_id: slbState.customerId, name: name, product_ids: sel.map(function (p) { return p.id; }) } })
      .then(function () { slbLoad(slbState.customerId); })
      .catch(function (err) { alert(err.message); });
  }

  function slbDeleteSaved() {
    var id = document.getElementById('slb-saved').value;
    if (!id || !confirm('Delete this saved list?')) return;
    Auth.api('/api/stocklist/' + id, { method: 'DELETE' }).then(function () { slbLoad(slbState.customerId); }).catch(showError);
  }

  function downloadCSV(filename, matrix) {
    var csv = matrix.map(function (row) {
      return row.map(function (cell) {
        var s = (cell == null) ? '' : String(cell);
        if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
        return s;
      }).join(',');
    }).join('\r\n');
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function loadStock() {
    var s = document.getElementById('stock-search'), loc = document.getElementById('stock-loc');
    stockQuery = s ? s.value : '';
    var qs = [];
    if (stockQuery) qs.push('q=' + encodeURIComponent(stockQuery));
    if (loc && loc.value) qs.push('location_id=' + loc.value);
    var wrap = document.getElementById('stock-wrap');
    Auth.api('/api/stock' + (qs.length ? '?' + qs.join('&') : '')).then(function (d) {
      var rows = d.rows || [];
      if (!rows.length) { wrap.innerHTML = '<p class="muted">No stock found.</p>'; return; }
      var total = rows.reduce(function (a, r) { return a + (Number(r.stock_value) || 0); }, 0);
      var body = rows.map(function (r) {
        var avail = Number(r.available_packs);
        var alloc = Number(r.allocated_packs) || 0;
        var low = r.reorder_packs != null && Number(r.reorder_packs) > 0 && avail <= Number(r.reorder_packs);
        return '<tr><td>' + esc(r.code) + '</td><td>' + esc(r.batch_no || '—') + '</td>' +
          '<td>' + esc(r.location_name) + '</td>' +
          '<td>' + num(r.packs) + '</td>' +
          '<td>' + (alloc ? '<span class="badge-low">' + num(alloc) + '</span>' : '0') + '</td>' +
          '<td>' + num(avail) + (low ? ' <span class="badge-low">low</span>' : '') + '</td>' +
          '<td>' + (r.volume_m3 != null ? Number(r.volume_m3).toFixed(2) : '—') + '</td>' +
          '<td>' + money(r.avg_cost_per_m3) + '</td>' +
          '<td>£' + Math.round(Number(r.stock_value) || 0).toLocaleString() + '</td>' +
          '<td class="col-actions"><button class="link-btn" data-adj="' + r.id + '">Adjust</button></td></tr>';
      }).join('');
      wrap.innerHTML = '<table class="data-table"><thead><tr><th>Code</th><th>Batch</th><th>Location</th>' +
        '<th>Packs</th><th>Allocated</th><th>Available</th><th>Volume m³</th><th>Cost £/m³</th><th>Value</th><th class="col-actions"></th></tr></thead>' +
        '<tbody>' + body + '</tbody><tfoot><tr><td colspan="8" style="text-align:right;font-weight:600">Total stock value</td>' +
        '<td style="font-weight:700">£' + Math.round(total).toLocaleString() + '</td><td></td></tr></tfoot></table>';
      wrap.querySelectorAll('[data-adj]').forEach(function (b) {
        b.onclick = function () { openAdjust(rows.find(function (r) { return String(r.id) === b.dataset.adj; })); };
      });
    }).catch(showError);
  }

  function openAdjust(row) {
    document.getElementById('modal-title').textContent = 'Adjust stock — ' + (row.batch_no || row.code) + ' @ ' + row.location_name;
    modalForm.innerHTML =
      '<p class="muted">' + esc(row.code || '') + '<br>Current: <strong>' + num(row.packs) + ' packs</strong> at ' +
      esc(row.location_name) + '. Positive adds stock, negative removes.</p>' +
      '<div class="fields form-grid">' +
      '<div class="field"><label for="adj-change">Change (packs) *</label><input id="adj-change" type="number" step="any" required></div>' +
      '<div class="field"><label for="adj-reason">Reason</label><select id="adj-reason">' +
      '<option value="adjustment">Adjustment</option><option value="purchase">Goods in (purchase)</option>' +
      '<option value="sale">Goods out (sale)</option><option value="correction">Stock correction</option>' +
      '<option value="transfer">Transfer</option></select></div>' +
      '</div><div class="field"><label for="adj-note">Note</label><input id="adj-note" type="text"></div>' +
      '<p class="form-note" id="modal-note"></p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost-dark btn-sm" data-cancel>Cancel</button>' +
      '<button type="submit" class="btn btn-primary btn-sm">Apply</button></div>';
    modalForm.querySelector('[data-cancel]').onclick = closeModal;
    modalForm.onsubmit = function (e) {
      e.preventDefault();
      var note = document.getElementById('modal-note');
      note.textContent = 'Applying…'; note.className = 'form-note';
      Auth.api('/api/stock/adjust', { method: 'POST', body: {
        batch_id: row.batch_id,
        location_id: row.location_id,
        change: document.getElementById('adj-change').value,
        reason: document.getElementById('adj-reason').value,
        note: document.getElementById('adj-note').value
      } }).then(function () { closeModal(); loadStock(); })
        .catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    };
    modal.hidden = false;
  }

  // ===================================================================
  //  Sales orders
  // ===================================================================
  var ORDER_STATUS = {
    open: ['Open', 'st-open'], part_picked: ['Part picked', 'st-amber'], picked: ['Picked', 'st-blue'],
    part_delivered: ['Part delivered', 'st-amber'], delivered: ['Delivered', 'st-green'],
    invoiced: ['Invoiced', 'st-green'], cancelled: ['Cancelled', 'st-grey']
  };
  function statusPill(s) { var m = ORDER_STATUS[s] || [s, 'st-grey']; return '<span class="pill ' + m[1] + '">' + esc(m[0]) + '</span>'; }
  function gbp(n) { return '£' + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  // Multi-select status filter as toggle chips. No chip active = show all.
  function statusFilterChips(id, map) {
    return '<span class="status-chips" id="' + id + '">' +
      Object.keys(map).map(function (k) { return '<button type="button" data-val="' + k + '">' + esc(map[k][0]) + '</button>'; }).join('') + '</span>';
  }
  function wireStatusChips(id, onChange) {
    var c = document.getElementById(id);
    if (!c) return;
    c.querySelectorAll('[data-val]').forEach(function (b) { b.onclick = function () { b.classList.toggle('active'); onChange(); }; });
  }
  function selectedStatuses(id) {
    var c = document.getElementById(id);
    if (!c) return [];
    return Array.prototype.map.call(c.querySelectorAll('[data-val].active'), function (b) { return b.dataset.val; });
  }
  function statusFilterVal(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function sortSelect(id, opts, def) {
    return '<select id="' + id + '" class="search-input">' +
      opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === def ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  }
  // Comparators (ISO date strings sort lexically; blanks sort last).
  function cmpDateAsc(f) { return function (a, b) { var x = a[f] || '', y = b[f] || ''; if (x === y) return 0; if (!x) return 1; if (!y) return -1; return x < y ? -1 : 1; }; }
  function cmpNumDesc(f) { return function (a, b) { return (Number(b[f]) || 0) - (Number(a[f]) || 0); }; }
  function cmpText(f) { return function (a, b) { return String(a[f] || '').localeCompare(String(b[f] || '')); }; }
  function sellDims(l) {
    var d = [l.thickness_mm, l.width_mm, l.length_mm].filter(function (x) { return x != null && x !== ''; });
    return d.length ? d.join(' × ') : '—';
  }
  // £/m³ for an invoice line: prefer the order line's sell rate, else derive from £/pack.
  function lineRateM3(l) {
    if (l.sell_rate_per_m3 != null) return Number(l.sell_rate_per_m3);
    if (l.pack_volume != null && Number(l.pack_volume) > 0) return Number(l.unit_price) / Number(l.pack_volume);
    return null;
  }

  var pickSel = {};   // order id -> row, for combining into one picking note
  function orderAddrSig(r) { return [r.delivery_name, r.delivery_address, r.delivery_city, r.delivery_postcode].map(function (x) { return (x || '').trim(); }).join('|'); }

  function renderOrders(sub) {
    if (sub) return renderOrderDetail(sub);
    pickSel = {};
    updateOrdersActions();
    view.innerHTML =
      '<div class="toolbar toolbar-row"><input type="search" id="o-search" class="search-input" placeholder="Search order no, customer, ref…">' +
      sortSelect('o-sort', [['newest', 'Newest first'], ['due', 'Due date'], ['customer', 'Customer']], 'newest') + '</div>' +
      '<div class="toolbar">' + statusFilterChips('o-status', ORDER_STATUS) + '</div>' +
      '<div id="o-wrap"><p class="muted">Loading…</p></div>';
    var s = document.getElementById('o-search'), t;
    s.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { loadOrders(s.value); }, 200); });
    wireStatusChips('o-status', function () { loadOrders(s.value); });
    document.getElementById('o-sort').onchange = function () { loadOrders(s.value); };
    loadOrders('');
  }

  function updateOrdersActions() {
    var ids = Object.keys(pickSel);
    actionsEl.innerHTML =
      (ids.length ? '<button class="btn btn-primary btn-sm" id="combine-pick">Create combined picking note (' + ids.length + ')</button> ' : '') +
      '<button class="' + (ids.length ? 'btn btn-ghost-dark btn-sm' : 'btn btn-primary btn-sm') + '" id="new-order">+ New sales order</button>';
    document.getElementById('new-order').onclick = function () { location.hash = '#sales_orders/new'; };
    var cb = document.getElementById('combine-pick');
    if (cb) cb.onclick = combinePick;
  }

  function loadOrders(q) {
    var wrap = document.getElementById('o-wrap');
    Auth.api('/api/orders' + (q ? '?q=' + encodeURIComponent(q) : '')).then(function (d) {
      var rows = d.rows || [];
      var sel = selectedStatuses('o-status');
      if (sel.length) rows = rows.filter(function (r) { return sel.indexOf(r.status) >= 0; });
      var sk = statusFilterVal('o-sort');
      if (sk === 'due') rows = rows.slice().sort(cmpDateAsc('due_date'));
      else if (sk === 'customer') rows = rows.slice().sort(cmpText('customer_name'));
      if (!rows.length) { wrap.innerHTML = '<p class="muted">No matching sales orders.</p>'; return; }
      var body = rows.map(function (r) {
        var selectable = r.status !== 'cancelled' && r.has_outstanding;
        var box = selectable ? '<input type="checkbox" class="o-sel" data-id="' + r.id + '"' + (pickSel[r.id] ? ' checked' : '') + '>' : '';
        return '<tr data-go="#sales_orders/' + r.id + '" class="row-link"><td class="o-selcell">' + box + '</td>' +
          '<td>' + esc(r.number || '—') + '</td>' +
          '<td>' + esc(r.customer_name || '—') + '</td>' +
          '<td>' + (r.order_type === 'collect' ? 'Collect' : 'Delivery') + '</td>' +
          '<td>' + statusPill(r.status) + '</td>' +
          '<td>' + fmtDate(r.due_date) + '</td>' +
          '<td>' + gbp(r.net) + '</td></tr>';
      }).join('');
      wrap.innerHTML = '<table class="data-table"><thead><tr><th style="width:28px"></th><th>Order</th><th>Customer</th><th>Type</th><th>Status</th><th>Due</th><th>Net</th></tr></thead><tbody>' + body + '</tbody></table>';
      wrap.querySelectorAll('[data-go]').forEach(function (tr) { tr.onclick = function () { location.hash = tr.dataset.go; }; });
      wrap.querySelectorAll('.o-sel').forEach(function (cb) {
        cb.onclick = function (e) { e.stopPropagation(); };
        cb.onchange = function () {
          var r = rows.find(function (x) { return String(x.id) === cb.dataset.id; });
          if (cb.checked) pickSel[cb.dataset.id] = r; else delete pickSel[cb.dataset.id];
          updateOrdersActions();
        };
      });
    }).catch(showError);
  }

  function combinePick() {
    var ids = Object.keys(pickSel);
    if (!ids.length) return;
    var first = pickSel[ids[0]];
    for (var i = 0; i < ids.length; i++) {
      var r = pickSel[ids[i]];
      if (String(r.customer_id) !== String(first.customer_id)) { alert('Selected orders are for different customers — they must share a customer.'); return; }
      if (orderAddrSig(r) !== orderAddrSig(first)) { alert('Selected orders have different delivery addresses — they must match to combine.'); return; }
    }
    var locOpts = locationCache.filter(function (l) { return !l.is_transit; }).map(function (l) {
      return '<option value="' + l.id + '">' + esc(l.name) + '</option>'; }).join('');
    document.getElementById('modal-title').textContent = 'Combined picking note';
    modalForm.innerHTML =
      '<p class="muted">' + ids.length + ' order(s) for <strong>' + esc(first.customer_name || '') + '</strong> → one picking note for the shared delivery address.</p>' +
      '<div class="field"><label>Pick from location *</label><select id="cp-loc">' + locOpts + '</select></div>' +
      '<p class="form-note" id="modal-note"></p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost-dark btn-sm" data-cancel>Cancel</button>' +
      '<button type="submit" class="btn btn-primary btn-sm">Create</button></div>';
    modalForm.querySelector('[data-cancel]').onclick = closeModal;
    modalForm.onsubmit = function (e) {
      e.preventDefault();
      var note = document.getElementById('modal-note'); note.textContent = 'Creating…'; note.className = 'form-note';
      Auth.api('/api/picking', { method: 'POST', body: { order_ids: ids.map(Number), location_id: document.getElementById('cp-loc').value } })
        .then(function (r) { closeModal(); location.hash = '#picking/' + r.id; })
        .catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    };
    modal.hidden = false;
  }

  // ---- Create / edit order (full-page form with line builder) -------
  function renderOrderCreate(existing) {
    var o = existing ? existing.order : null;
    titleEl.textContent = existing ? 'Edit sales order ' + (o.number || '') : 'New sales order';
    var custOpts = '<option value="">— select customer —</option>' + customerCache.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('');
    var locOpts = '<option value="">— none —</option>' + locationCache.map(function (l) {
      return '<option value="' + l.id + '">' + esc(l.name) + '</option>'; }).join('');

    view.innerHTML =
      '<div class="panel">' +
      '<div class="fields form-grid">' +
        field('Customer *', '<select id="o-customer">' + custOpts + '</select>') +
        field('Order type', '<select id="o-type"><option value="delivery">Delivery</option><option value="collect">Collect later</option></select>') +
        field('Customer ref', '<input id="o-ref">') +
        field('Due date', '<input id="o-due" type="date">') +
        field('Fulfil from', '<select id="o-loc">' + locOpts + '</select>') +
        field('VAT rate %', '<input id="o-vat" type="number" step="any" value="20" readonly title="Set on the customer record (Customers → Edit)">') +
      '</div>' +
      '<p class="form-note" id="o-credit"></p>' +
      '<h3 class="sub-h">Delivery address</h3>' +
      '<div class="fields"><div class="field"><label>Saved address</label>' +
        '<select id="o-daddr-pick"><option value="">— pick a saved address —</option></select>' +
        '<span class="muted" style="font-size:.82rem">Manage a customer\'s addresses under Customers → Addresses.</span></div></div>' +
      '<div class="fields form-grid">' +
        field('Name', '<input id="o-dname">') +
        field('Address', '<input id="o-daddr">') +
        field('Town / City', '<input id="o-dcity">') +
        field('Postcode', '<input id="o-dpost">') +
      '</div>' +
      '<h3 class="sub-h">Lines</h3>' +
      '<table class="data-table" id="o-lines"><thead><tr><th style="width:32%">Batch</th><th>Qty (packs)</th><th>£/m³</th><th>Margin</th><th>Avail</th><th>Volume m³</th><th>Net</th><th></th></tr></thead><tbody></tbody></table>' +
      '<button class="btn btn-ghost-dark btn-sm" id="o-addline" style="margin-top:10px">+ Add line</button>' +
      '<div class="order-totals" id="o-totals"></div>' +
      '<p class="form-note" id="o-note"></p>' +
      '<div class="modal-foot"><a class="btn btn-ghost-dark btn-sm" href="#sales_orders">Cancel</a>' +
      '<button class="btn btn-primary btn-sm" id="o-save">' + (existing ? 'Save changes' : 'Create order') + '</button></div></div>';

    document.getElementById('o-customer').onchange = onCustomerChange;
    document.getElementById('o-daddr-pick').onchange = onPickAddress;
    document.getElementById('o-addline').onclick = function () { addOrderLine(); };
    document.getElementById('o-vat').oninput = recalcOrder;
    document.getElementById('o-save').onclick = function () { saveOrder(existing); };

    if (existing) {
      document.getElementById('o-customer').value = o.customer_id || '';
      document.getElementById('o-type').value = o.order_type || 'delivery';
      document.getElementById('o-ref').value = o.customer_ref || '';
      document.getElementById('o-due').value = o.due_date || '';
      document.getElementById('o-loc').value = o.location_id || '';
      document.getElementById('o-vat').value = o.vat_rate != null ? Number(o.vat_rate) : 20;
      document.getElementById('o-dname').value = o.delivery_name || '';
      document.getElementById('o-daddr').value = o.delivery_address || '';
      document.getElementById('o-dcity').value = o.delivery_city || '';
      document.getElementById('o-dpost').value = o.delivery_postcode || '';
      (existing.lines || []).forEach(function (l) {
        addOrderLine({ batch: {
          id: l.batch_id, code: l.code, batch_no: l.batch_no, pack_volume: l.pack_volume,
          sell_rate_per_m3: l.sell_rate_per_m3, landed_cost_per_m3: l.cost_per_m3, available_packs: null
        }, quantity: l.quantity, rate_per_m3: l.sell_rate_per_m3 });
      });
      if (!existing.lines || !existing.lines.length) addOrderLine();
    } else {
      addOrderLine();
    }
  }

  var orderAddresses = [];   // saved addresses for the currently selected customer
  var orderCreditInfo = null;   // { limit, outstanding, available } for the selected customer
  function onCustomerChange() {
    prefillDelivery();
    var id = document.getElementById('o-customer').value;
    // VAT rate is configured on the customer record; mirror it onto the order.
    var cust = null;
    for (var i = 0; i < customerCache.length; i++) if (String(customerCache[i].id) === String(id)) cust = customerCache[i];
    document.getElementById('o-vat').value = (cust && cust.vat_rate != null) ? Number(cust.vat_rate) : 20;
    recalcOrder();
    // Credit position (warn only).
    orderCreditInfo = null;
    var creditEl = document.getElementById('o-credit');
    if (creditEl) creditEl.textContent = '';
    if (id) {
      Auth.api('/api/accounts/' + id).then(function (d) {
        var limit = d.customer && d.customer.credit_limit != null ? Number(d.customer.credit_limit) : null;
        var outstanding = Number(d.outstanding) || 0;
        orderCreditInfo = { limit: limit, outstanding: outstanding, available: limit != null ? limit - outstanding : null };
        if (!creditEl) return;
        if (limit == null) { creditEl.textContent = 'Outstanding balance: ' + gbp(outstanding) + ' (no credit limit set).'; creditEl.className = 'form-note'; }
        else {
          var avail = limit - outstanding;
          creditEl.textContent = 'Credit limit ' + gbp(limit) + ' · outstanding ' + gbp(outstanding) + ' · available ' + gbp(avail) + (avail < 0 ? ' — OVER LIMIT' : '');
          creditEl.className = avail < 0 ? 'form-note err' : 'form-note';
        }
      }).catch(function () {});
    }
    var pick = document.getElementById('o-daddr-pick');
    orderAddresses = [];
    pick.innerHTML = '<option value="">— pick a saved address —</option>';
    if (!id) return;
    Auth.api('/api/addresses?customer_id=' + id).then(function (d) {
      orderAddresses = d.rows || [];
      pick.innerHTML = '<option value="">— pick a saved address —</option>' +
        orderAddresses.map(function (a) {
          var lbl = (a.label ? a.label + ' — ' : '') + [a.address, a.city, a.postcode].filter(Boolean).join(', ');
          return '<option value="' + a.id + '"' + (a.is_default ? ' selected' : '') + '>' + esc(lbl) + '</option>';
        }).join('');
      var def = orderAddresses.find(function (a) { return a.is_default; });
      if (def) applyAddress(def);
    }).catch(function () {});
  }
  function onPickAddress() {
    var id = document.getElementById('o-daddr-pick').value;
    var a = orderAddresses.find(function (x) { return String(x.id) === String(id); });
    if (a) applyAddress(a);
  }
  function applyAddress(a) {
    document.getElementById('o-dname').value = a.name || '';
    document.getElementById('o-daddr').value = a.address || '';
    document.getElementById('o-dcity').value = a.city || '';
    document.getElementById('o-dpost').value = a.postcode || '';
  }

  function field(label, control) {
    return '<div class="field"><label>' + label + '</label>' + control + '</div>';
  }

  function addOrderLine(preset) {
    var tb = document.querySelector('#o-lines tbody');
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td style="position:relative">' +
        '<input class="ln-search" placeholder="type code / description…" autocomplete="off" style="width:100%">' +
        '<input type="hidden" class="ln-batch">' +
        '<div class="ln-results"></div></td>' +
      '<td><input class="ln-qty" type="number" step="any" min="0" style="width:80px" value="' + (preset ? preset.quantity : '') + '"></td>' +
      '<td><input class="ln-rate" type="number" step="any" min="0" style="width:90px"></td>' +
      '<td class="ln-margin">—</td>' +
      '<td class="ln-avail">—</td>' +
      '<td class="ln-vol">0.000</td>' +
      '<td class="ln-net">£0.00</td>' +
      '<td><button class="link-btn danger ln-del">remove</button></td>';
    tb.appendChild(tr);
    var search = tr.querySelector('.ln-search'), results = tr.querySelector('.ln-results');
    var hidden = tr.querySelector('.ln-batch'), qty = tr.querySelector('.ln-qty'), rate = tr.querySelector('.ln-rate');
    var t;
    if (preset && preset.batch) {
      var pb = preset.batch;
      orderBatchById[pb.id] = pb;
      hidden.value = pb.id;
      search.value = pb.code + (pb.batch_no && pb.batch_no !== pb.code ? ' · ' + pb.batch_no : '');
      if (preset.rate_per_m3 != null) rate.value = Number(preset.rate_per_m3);
    }
    search.addEventListener('input', function () {
      hidden.value = '';   // typing invalidates the chosen batch
      clearTimeout(t);
      var v = search.value.trim();
      if (!v) { results.innerHTML = ''; recalcOrder(); return; }
      t = setTimeout(function () {
        Auth.api('/api/batches?q=' + encodeURIComponent(v)).then(function (d) {
          var rows = d.rows || [];
          results.innerHTML = rows.length ? rows.map(function (b) {
            orderBatchById[b.id] = b;
            var avail = Number(b.available_packs) || 0;
            return '<div class="ln-result" data-id="' + b.id + '">' + esc(b.code) +
              (b.batch_no && b.batch_no !== b.code ? ' · ' + esc(b.batch_no) : '') +
              '<span class="muted"> — avail ' + avail + ' packs' + (b.sell_rate_per_m3 != null ? ' · £' + Number(b.sell_rate_per_m3) + '/m³' : '') + '</span></div>';
          }).join('') : '<div class="ln-result muted">No matches</div>';
          positionResults(search, results);
          results.querySelectorAll('.ln-result[data-id]').forEach(function (el) {
            el.onmousedown = function (e) {   // mousedown beats the input blur
              e.preventDefault();
              var b = orderBatchById[el.dataset.id];
              hidden.value = b.id;
              search.value = b.code + (b.batch_no && b.batch_no !== b.code ? ' · ' + b.batch_no : '');
              if (b.sell_rate_per_m3 != null && !rate.value) rate.value = Number(b.sell_rate_per_m3);
              results.innerHTML = '';
              recalcOrder();
            };
          });
        }).catch(function () {});
      }, 200);
    });
    search.addEventListener('blur', function () { setTimeout(function () { results.innerHTML = ''; }, 200); });
    qty.oninput = recalcOrder; rate.oninput = recalcOrder;
    tr.querySelector('.ln-del').onclick = function () { tr.remove(); recalcOrder(); };
    recalcOrder();
  }

  function gatherLines() {
    return Array.prototype.map.call(document.querySelectorAll('#o-lines tbody tr'), function (tr) {
      var bid = tr.querySelector('.ln-batch').value;
      var b = orderBatchById[bid];
      var packVol = b && b.pack_volume != null ? Number(b.pack_volume) : 0;
      var qty = Number(tr.querySelector('.ln-qty').value) || 0;
      var rate = Number(tr.querySelector('.ln-rate').value) || 0;
      return {
        batch_id: bid, code: b ? b.code : null, description: b ? b.description : null,
        quantity: qty, rate_per_m3: rate, volume: qty * packVol,
        cost: b && b.landed_cost_per_m3 != null ? Number(b.landed_cost_per_m3) : null,
        avail: b && b.available_packs != null ? Number(b.available_packs) : null, _tr: tr
      };
    });
  }

  function recalcOrder() {
    var net = 0, totalCost = 0, totalVol = 0;
    gatherLines().forEach(function (l) {
      var lineNet = l.volume * l.rate_per_m3;
      var cost = l.cost;
      net += lineNet;
      totalVol += l.volume;
      if (cost != null) totalCost += l.volume * cost;
      // Gross margin % against the sell rate.
      var mpct = (cost != null && l.rate_per_m3 > 0) ? (l.rate_per_m3 - cost) / l.rate_per_m3 * 100 : null;
      l._tr.querySelector('.ln-margin').textContent = mpct != null ? mpct.toFixed(1) + '%' : '—';
      l._tr.querySelector('.ln-avail').textContent = l.avail != null ? l.avail : '—';
      l._tr.querySelector('.ln-vol').textContent = l.volume.toFixed(3);
      l._tr.querySelector('.ln-net').textContent = gbp(lineNet);
    });
    var vat = net * (Number(document.getElementById('o-vat').value) || 0) / 100;
    var marginVal = net - totalCost;
    var marginPct = net > 0 ? marginVal / net * 100 : 0;
    document.getElementById('o-totals').innerHTML =
      '<div class="ot-row"><span>Total volume</span><strong>' + totalVol.toFixed(3) + ' m³</strong></div>' +
      '<div class="ot-row"><span>Net</span><strong>' + gbp(net) + '</strong></div>' +
      '<div class="ot-row"><span>Margin</span><strong>' + gbp(marginVal) + ' (' + marginPct.toFixed(1) + '%)</strong></div>' +
      '<div class="ot-row"><span>VAT</span><strong>' + gbp(vat) + '</strong></div>' +
      '<div class="ot-row ot-grand"><span>Gross</span><strong>' + gbp(net + vat) + '</strong></div>';
  }

  function prefillDelivery() {
    var c = null, id = document.getElementById('o-customer').value;
    for (var i = 0; i < customerCache.length; i++) if (String(customerCache[i].id) === String(id)) c = customerCache[i];
    if (!c) return;
    if (!document.getElementById('o-dname').value) document.getElementById('o-dname').value = c.name || '';
    if (!document.getElementById('o-daddr').value) document.getElementById('o-daddr').value = c.address || '';
    if (!document.getElementById('o-dcity').value) document.getElementById('o-dcity').value = c.city || '';
    if (!document.getElementById('o-dpost').value) document.getElementById('o-dpost').value = c.postcode || '';
  }

  function saveOrder(existing) {
    var note = document.getElementById('o-note');
    var lines = gatherLines().filter(function (l) { return l.batch_id && l.quantity > 0; })
      .map(function (l) { return { batch_id: l.batch_id, code: l.code, description: l.description, quantity: l.quantity, rate_per_m3: l.rate_per_m3 }; });
    var body = {
      customer_id: document.getElementById('o-customer').value,
      order_type: document.getElementById('o-type').value,
      customer_ref: document.getElementById('o-ref').value,
      due_date: document.getElementById('o-due').value,
      location_id: document.getElementById('o-loc').value,
      vat_rate: document.getElementById('o-vat').value,
      delivery_name: document.getElementById('o-dname').value,
      delivery_address: document.getElementById('o-daddr').value,
      delivery_city: document.getElementById('o-dcity').value,
      delivery_postcode: document.getElementById('o-dpost').value,
      lines: lines
    };
    if (!body.customer_id) { note.textContent = 'Choose a customer.'; note.className = 'form-note err'; return; }
    if (!lines.length) { note.textContent = 'Add at least one line with a batch and quantity.'; note.className = 'form-note err'; return; }
    // Warn (don't block) if this order would take the customer over their credit limit.
    if (!existing && orderCreditInfo && orderCreditInfo.limit != null) {
      var vatR = Number(document.getElementById('o-vat').value) || 0;
      var gross = gatherLines().reduce(function (a, l) { return a + l.volume * l.rate_per_m3; }, 0) * (1 + vatR / 100);
      if (orderCreditInfo.outstanding + gross > orderCreditInfo.limit) {
        if (!confirm('This order takes ' + (document.getElementById('o-customer').selectedOptions[0] || {}).text + ' over their credit limit (available ' + gbp(orderCreditInfo.available) + '). Continue?')) {
          note.textContent = ''; return;
        }
      }
    }
    note.textContent = 'Saving…'; note.className = 'form-note';
    if (existing) {
      Auth.api('/api/orders/' + existing.order.id, { method: 'PATCH', body: body })
        .then(function () { renderOrderDetail(existing.order.id); })
        .catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    } else {
      Auth.api('/api/orders', { method: 'POST', body: body }).then(function (r) {
        location.hash = '#sales_orders/' + r.id;
      }).catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    }
  }

  // ---- Order detail -------------------------------------------------
  function renderOrderDetail(id) {
    if (id === 'new') return renderOrderCreate();
    view.innerHTML = '<p class="muted">Loading order…</p>';
    Auth.api('/api/orders/' + id).then(function (d) {
      var o = d.order, lines = d.lines || [];
      titleEl.textContent = 'Order ' + (o.number || '');
      var vatRate = Number(o.vat_rate) || 0;
      var net = lines.reduce(function (a, l) { return a + Number(l.quantity) * Number(l.unit_price); }, 0);
      var totalVol = lines.reduce(function (a, l) { return a + Number(l.quantity) * (l.pack_volume != null ? Number(l.pack_volume) : 0); }, 0);
      var vat = net * vatRate / 100;
      var canPick = o.status !== 'cancelled' && lines.some(function (l) { return Number(l.quantity) - Number(l.qty_picked) > 0; });
      // Editable only before any picking has started.
      var picked = lines.reduce(function (a, l) { return a + Number(l.qty_picked || 0); }, 0);
      var canEdit = o.status !== 'cancelled' && o.status !== 'invoiced' && picked === 0;
      var canAmend = o.status !== 'cancelled' && o.status !== 'invoiced';   // add lines / write off even after picking

      actionsEl.innerHTML =
        '<button class="btn btn-ghost-dark btn-sm" id="o-print">Print / PDF</button> ' +
        (canEdit ? '<button class="btn btn-ghost-dark btn-sm" id="o-edit">Edit order</button> ' : '') +
        (canAmend ? '<button class="btn btn-ghost-dark btn-sm" id="o-addline-btn">Add line</button> ' : '') +
        (canPick ? '<button class="btn btn-primary btn-sm" id="mk-pick">Create picking note</button>' : '') +
        ' <a class="btn btn-ghost-dark btn-sm" href="#sales_orders">Back</a>';

      var addr = [o.delivery_name, o.delivery_address, o.delivery_city, o.delivery_postcode].filter(Boolean).map(esc).join('<br>');
      var linkDocs = function (arr, base, label) {
        if (!arr || !arr.length) return '';
        return '<div class="doc-links"><strong>' + label + ':</strong> ' + arr.map(function (x) {
          return '<a href="#' + base + '/' + x.id + '">' + esc(x.number) + '</a> ' + statusPill(x.status);
        }).join(' · ') + '</div>';
      };

      var rows = lines.map(function (l) {
        var out = Number(l.quantity) - Number(l.qty_picked);
        var vol = Number(l.quantity) * (l.pack_volume != null ? Number(l.pack_volume) : 0);
        var rateM3 = l.sell_rate_per_m3 != null ? Number(l.sell_rate_per_m3) : null;
        var cost = l.cost_per_m3 != null ? Number(l.cost_per_m3) : null;
        var mpct = (cost != null && rateM3 != null && rateM3 > 0) ? (rateM3 - cost) / rateM3 * 100 : null;
        return '<tr><td>' + esc(l.code || '—') + '</td><td>' + esc(l.description || '—') + '</td>' +
          '<td>' + num(l.quantity) + '</td><td>' + num(l.qty_picked) + '</td><td>' + num(l.qty_delivered) + '</td>' +
          '<td>' + (out > 0 ? out : 0) +
            (out > 0 && canAmend ? ' <button class="link-btn danger" data-wo="' + l.id + '" data-out="' + out + '" data-code="' + esc(l.code || '') + '">write off</button>' : '') + '</td>' +
          '<td>' + vol.toFixed(3) + '</td>' +
          '<td>' + (rateM3 != null ? gbp(rateM3) : '—') + '</td>' +
          '<td>' + (cost != null ? gbp(cost) : '—') + '</td>' +
          '<td>' + (mpct != null ? mpct.toFixed(1) + '%' : '—') + '</td>' +
          '<td>' + gbp(Number(l.quantity) * Number(l.unit_price)) + '</td></tr>';
      }).join('');

      view.innerHTML =
        '<div class="detail-grid">' +
          '<div class="panel"><h3 class="sub-h">Order</h3>' +
            kv('Status', statusPill(o.status)) + kv('Customer', esc(o.customer_name || '—')) +
            kv('Type', o.order_type === 'collect' ? 'Collect later' : 'Delivery') +
            kv('Customer ref', esc(o.customer_ref || '—')) + kv('Order date', esc(o.order_date || '—')) +
            kv('Due date', esc(o.due_date || '—')) + kv('Fulfil from', esc(o.location_name || '—')) +
          '</div>' +
          '<div class="panel"><h3 class="sub-h">Delivery address</h3>' + (addr || '<span class="muted">—</span>') +
            (o.notes ? '<h3 class="sub-h" style="margin-top:18px">Notes</h3>' + esc(o.notes) : '') + '</div>' +
        '</div>' +
        '<div class="panel" style="margin-top:18px"><h3 class="sub-h">Lines</h3>' +
          '<table class="data-table"><thead><tr><th>Code</th><th>Description</th><th>Ordered</th><th>Picked</th><th>Delivered</th><th>Outstanding</th><th>Volume m³</th><th>£/m³</th><th>Cost £/m³</th><th>Margin</th><th>Net</th></tr></thead><tbody>' +
          rows + '</tbody><tfoot>' +
          '<tr><td colspan="6" style="text-align:right">Total volume m³</td><td style="font-weight:600">' + totalVol.toFixed(3) + '</td><td colspan="4"></td></tr>' +
          '<tr><td colspan="10" style="text-align:right">Net</td><td>' + gbp(net) + '</td></tr>' +
          '<tr><td colspan="10" style="text-align:right">VAT (' + vatRate + '%)</td><td>' + gbp(vat) + '</td></tr>' +
          '<tr><td colspan="10" style="text-align:right;font-weight:700">Gross</td><td style="font-weight:700">' + gbp(net + vat) + '</td></tr>' +
          '</tfoot></table>' +
          linkDocs(d.pickings, 'picking', 'Picking notes') + linkDocs(d.deliveries, 'delivery', 'Delivery notes') +
          linkDocs(d.invoices, 'invoices', 'Invoices') +
        '</div>' +
        ((d.writeoffs && d.writeoffs.length) ? '<div class="panel" style="margin-top:18px"><h3 class="sub-h">Write-offs</h3>' +
          '<table class="data-table"><thead><tr><th>Code</th><th>Qty</th><th>Reason</th><th>Note</th><th>By</th><th>When</th></tr></thead><tbody>' +
          d.writeoffs.map(function (w) { return '<tr><td>' + esc(w.code || '—') + '</td><td>' + num(w.quantity) + '</td><td>' + esc(WRITEOFF_LABELS[w.reason] || w.reason || '—') + '</td><td>' + esc(w.note || '—') + '</td><td>' + esc(w.author || '—') + '</td><td>' + esc((w.created_at || '').slice(0, 10)) + '</td></tr>'; }).join('') +
          '</tbody></table></div>' : '');

      var mk = document.getElementById('mk-pick');
      if (mk) mk.onclick = function () { createPicking(o); };
      var ed = document.getElementById('o-edit');
      if (ed) ed.onclick = function () { renderOrderCreate(d); };
      var al = document.getElementById('o-addline-btn');
      if (al) al.onclick = function () { openAddOrderLine(o.id, function () { renderOrderDetail(o.id); }); };
      view.querySelectorAll('[data-wo]').forEach(function (b) {
        b.onclick = function () { openWriteOff(o.id, { id: b.dataset.wo, out: Number(b.dataset.out), code: b.dataset.code }, function () { renderOrderDetail(o.id); }); };
      });
      document.getElementById('o-print').onclick = function () { printOrder(o, lines, net, vat); };
    }).catch(showError);
  }

  // Customer-facing order confirmation — NO cost or margin, sales info only.
  function printOrder(o, lines, net, vat) {
    var vatRate = Number(o.vat_rate) || 0;
    var totalVol = 0;
    var rows = lines.map(function (l) {
      var qty = Number(l.quantity);
      var vol = qty * (l.pack_volume != null ? Number(l.pack_volume) : 0);
      totalVol += vol;
      var rateM3 = l.sell_rate_per_m3 != null ? Number(l.sell_rate_per_m3) : null;
      var lineNet = qty * Number(l.unit_price || 0);
      return '<tr><td>' + esc(l.code || '') + '</td><td>' + esc(l.description || '') + '</td>' +
        '<td style="text-align:right">' + num(l.ppp) + '</td>' +
        '<td style="text-align:right">' + num(qty) + '</td>' +
        '<td style="text-align:right">' + vol.toFixed(3) + '</td>' +
        '<td style="text-align:right">' + (rateM3 != null ? gbp(rateM3) : '—') + '</td>' +
        '<td style="text-align:right">' + gbp(lineNet) + '</td></tr>';
    }).join('');
    var addr = [o.delivery_name, o.delivery_address, o.delivery_city, o.delivery_postcode].filter(Boolean).map(esc).join('<br>');
    var html = '<html><head><title>' + esc(o.number) + '</title><style>' +
      'body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{margin:0 0 4px}.muted{color:#666}' +
      '.head{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:10px}' +
      'table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #ccc;padding:8px;font-size:13px}th{background:#f0f0f0;text-align:left}' +
      '.totals{margin-top:20px;margin-left:auto;width:280px;font-size:14px}.totals div{display:flex;justify-content:space-between;padding:4px 0}' +
      '.totals .grand{border-top:2px solid #111;font-weight:700;margin-top:4px;padding-top:8px}</style></head><body>' +
      '<div class="head"><div><h1>Order Confirmation</h1><div class="muted">' + esc(o.number) + '</div>' +
      '<div class="muted">Date: ' + esc(o.order_date || '') + '</div>' +
      (o.customer_ref ? '<div class="muted">Your ref: ' + esc(o.customer_ref) + '</div>' : '') + '</div>' +
      '<div style="text-align:right">' + companyHead() + '<br><span class="muted">' + esc(o.customer_name || '') + '</span>' +
      (o.due_date ? '<br><span class="muted">Due: ' + esc(o.due_date) + '</span>' : '') + '</div></div>' +
      '<p style="margin-top:14px"><strong>' + (o.order_type === 'collect' ? 'Collection' : 'Delivery') + ' address:</strong><br>' + (addr || '—') + '</p>' +
      '<table><thead><tr><th>Code</th><th>Description</th><th style="text-align:right">PPP</th><th style="text-align:right">Packs</th><th style="text-align:right">Volume m³</th><th style="text-align:right">£/m³</th><th style="text-align:right">Net</th></tr></thead><tbody>' + rows +
      '</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:700">Total volume m³</td><td style="text-align:right;font-weight:700">' + totalVol.toFixed(3) + '</td><td colspan="2"></td></tr></tfoot></table>' +
      '<div class="totals"><div><span>Net</span><span>' + gbp(net) + '</span></div>' +
      '<div><span>VAT (' + vatRate + '%)</span><span>' + gbp(vat) + '</span></div>' +
      '<div class="grand"><span>Total</span><span>' + gbp(net + vat) + '</span></div></div>' +
      (o.notes ? '<p class="muted" style="margin-top:24px">' + esc(o.notes) + '</p>' : '') +
      '</body></html>';
    var w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to print.'); return; }
    w.document.write(html); w.document.close(); w.focus(); w.print();
  }

  function kv(k, v) { return '<div class="kv"><span>' + k + '</span><span>' + v + '</span></div>'; }

  var WRITEOFF_LABELS = { lost_order: 'Lost order', office_amendment: 'Office amendment', customer_change: 'Customer change', other: 'Other' };

  function openAddOrderLine(orderId, onDone) {
    document.getElementById('modal-title').textContent = 'Add order line';
    modalForm.innerHTML =
      '<div class="field" style="position:relative"><label>Batch *</label>' +
        '<input id="al-search" placeholder="type code / description…" autocomplete="off">' +
        '<input type="hidden" id="al-batch"><div class="ln-results" id="al-results"></div></div>' +
      '<div class="fields form-grid">' +
      '<div class="field"><label>Qty (packs) *</label><input id="al-qty" type="number" step="any" min="0"></div>' +
      '<div class="field"><label>£/m³</label><input id="al-rate" type="number" step="any" min="0"></div>' +
      '</div><p class="form-note" id="modal-note"></p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost-dark btn-sm" data-cancel>Cancel</button>' +
      '<button type="submit" class="btn btn-primary btn-sm">Add line</button></div>';
    modalForm.querySelector('[data-cancel]').onclick = closeModal;
    var search = document.getElementById('al-search'), results = document.getElementById('al-results'), hidden = document.getElementById('al-batch'), rate = document.getElementById('al-rate'), t;
    search.addEventListener('input', function () {
      hidden.value = ''; clearTimeout(t);
      var v = search.value.trim();
      if (!v) { results.innerHTML = ''; return; }
      t = setTimeout(function () {
        Auth.api('/api/batches?q=' + encodeURIComponent(v)).then(function (d) {
          var rows = d.rows || [];
          results.innerHTML = rows.length ? rows.map(function (b) {
            orderBatchById[b.id] = b;
            return '<div class="ln-result" data-id="' + b.id + '">' + esc(b.code) + (b.batch_no && b.batch_no !== b.code ? ' · ' + esc(b.batch_no) : '') +
              '<span class="muted"> — avail ' + (Number(b.available_packs) || 0) + ' packs</span></div>';
          }).join('') : '<div class="ln-result muted">No matches</div>';
          positionResults(search, results);
          results.querySelectorAll('.ln-result[data-id]').forEach(function (el) {
            el.onmousedown = function (e) { e.preventDefault(); var b = orderBatchById[el.dataset.id]; hidden.value = b.id; search.value = b.code + (b.batch_no && b.batch_no !== b.code ? ' · ' + b.batch_no : ''); if (b.sell_rate_per_m3 != null && !rate.value) rate.value = Number(b.sell_rate_per_m3); results.innerHTML = ''; };
          });
        }).catch(function () {});
      }, 200);
    });
    search.addEventListener('blur', function () { setTimeout(function () { results.innerHTML = ''; }, 200); });
    modalForm.onsubmit = function (e) {
      e.preventDefault();
      var note = document.getElementById('modal-note');
      if (!hidden.value) { note.textContent = 'Choose a batch.'; note.className = 'form-note err'; return; }
      note.textContent = 'Saving…'; note.className = 'form-note';
      Auth.api('/api/orders/' + orderId + '/lines', { method: 'POST', body: { batch_id: hidden.value, quantity: document.getElementById('al-qty').value, rate_per_m3: rate.value } })
        .then(function () { closeModal(); if (onDone) onDone(); }).catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    };
    modal.hidden = false;
  }

  function openWriteOff(orderId, line, onDone) {
    document.getElementById('modal-title').textContent = 'Write off — ' + (line.code || '');
    modalForm.innerHTML =
      '<p class="muted">Up to ' + line.out + ' pack(s) of un-picked outstanding can be written off; the rest stays on the order. (To release already-picked stock, cancel the pick first.)</p>' +
      '<div class="fields form-grid">' +
      '<div class="field"><label>Quantity to write off *</label><input id="wo-qty" type="number" step="any" min="0" max="' + line.out + '" value="' + line.out + '"></div>' +
      '<div class="field"><label>Reason *</label><select id="wo-reason"><option value="lost_order">Lost order</option><option value="office_amendment">Office amendment</option><option value="customer_change">Customer change</option><option value="other">Other</option></select></div>' +
      '</div><div class="field"><label>Note</label><input id="wo-note"></div>' +
      '<p class="form-note" id="modal-note"></p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost-dark btn-sm" data-cancel>Cancel</button>' +
      '<button type="submit" class="btn btn-primary btn-sm danger">Write off</button></div>';
    modalForm.querySelector('[data-cancel]').onclick = closeModal;
    modalForm.onsubmit = function (e) {
      e.preventDefault();
      var note = document.getElementById('modal-note'); note.textContent = 'Saving…'; note.className = 'form-note';
      Auth.api('/api/orders/' + orderId + '/writeoff', { method: 'POST', body: { order_line_id: line.id, quantity: document.getElementById('wo-qty').value, reason: document.getElementById('wo-reason').value, note: document.getElementById('wo-note').value } })
        .then(function () { closeModal(); if (onDone) onDone(); }).catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    };
    modal.hidden = false;
  }

  function createPicking(order) {
    var locOpts = locationCache.map(function (l) {
      return '<option value="' + l.id + '"' + (String(l.id) === String(order.location_id) ? ' selected' : '') + '>' + esc(l.name) + '</option>';
    }).join('');
    document.getElementById('modal-title').textContent = 'Create picking note';
    modalForm.innerHTML =
      '<p class="muted">A picking note will be raised for the outstanding quantities on ' + esc(order.number) + '.</p>' +
      '<div class="field"><label>Pick from location *</label><select id="pk-loc">' + locOpts + '</select></div>' +
      '<p class="form-note" id="modal-note"></p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost-dark btn-sm" data-cancel>Cancel</button>' +
      '<button type="submit" class="btn btn-primary btn-sm">Create</button></div>';
    modalForm.querySelector('[data-cancel]').onclick = closeModal;
    modalForm.onsubmit = function (e) {
      e.preventDefault();
      var note = document.getElementById('modal-note'); note.textContent = 'Creating…'; note.className = 'form-note';
      Auth.api('/api/orders/' + order.id + '/picking', { method: 'POST', body: { location_id: document.getElementById('pk-loc').value } })
        .then(function (r) { closeModal(); location.hash = '#picking/' + r.id; })
        .catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    };
    modal.hidden = false;
  }

  // ===================================================================
  //  Picking notes
  // ===================================================================
  // Displayed status reflects the delivery lifecycle, derived from links.
  function pickStatusInfo(p) {
    if (p.status === 'cancelled') return { label: 'Cancelled', cls: 'st-grey' };
    if (Number(p.delivery_count) > 0) return { label: 'Completed', cls: 'st-green' };
    if (p.haulage_number) return { label: 'Delivery arranged', cls: 'st-blue' };
    if (p.status === 'confirmed') return { label: 'Picked', cls: 'st-amber' };
    return { label: 'Open', cls: 'st-open' };
  }
  function pickPill(p) { var i = pickStatusInfo(p); return '<span class="pill ' + i.cls + '">' + esc(i.label) + '</span>'; }
  var PICK_FILTER = { open: ['Open', 'st-open'], picked: ['Picked', 'st-amber'], arranged: ['Delivery arranged', 'st-blue'], completed: ['Completed', 'st-green'], cancelled: ['Cancelled', 'st-grey'] };
  function pickStatusKey(p) {
    if (p.status === 'cancelled') return 'cancelled';
    if (Number(p.delivery_count) > 0) return 'completed';
    if (p.haulage_number) return 'arranged';
    if (p.status === 'confirmed') return 'picked';
    return 'open';
  }

  function renderPicking(sub) {
    if (sub) return renderPickingDetail(sub);
    actionsEl.innerHTML = '';
    view.innerHTML =
      '<div class="toolbar toolbar-row"><input type="search" id="p-search" class="search-input" placeholder="Search pick no, order, customer…">' +
      sortSelect('p-sort', [['board', 'Board (default)'], ['delivery', 'Delivery date'], ['due', 'SO due date']], 'board') + '</div>' +
      '<div class="toolbar">' + statusFilterChips('p-status', PICK_FILTER) + '</div>' +
      '<div id="p-wrap"><p class="muted">Loading…</p></div>';
    var s = document.getElementById('p-search'), t;
    s.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { loadPicking(s.value); }, 200); });
    wireStatusChips('p-status', function () { loadPicking(s.value); });
    document.getElementById('p-sort').onchange = function () { loadPicking(s.value); };
    loadPicking('');
  }

  function fmtDate(s) {
    if (!s) return '—';
    var p = String(s).slice(0, 10).split('-');
    return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0].slice(2)) : esc(s);
  }

  function loadPicking(q) {
    var wrap = document.getElementById('p-wrap');
    Auth.api('/api/picking' + (q ? '?q=' + encodeURIComponent(q) : '')).then(function (d) {
      var rows = d.rows || [];
      var sel = selectedStatuses('p-status');
      if (sel.length) rows = rows.filter(function (r) { return sel.indexOf(pickStatusKey(r)) >= 0; });
      var sk = statusFilterVal('p-sort');
      if (sk === 'delivery') rows = rows.slice().sort(cmpDateAsc('haulage_delivery_date'));
      else if (sk === 'due') rows = rows.slice().sort(cmpDateAsc('order_due'));
      if (!rows.length) { wrap.innerHTML = '<p class="muted">No matching picking notes.</p>'; return; }
      var body = rows.map(function (r) {
        var ho = r.haulage_number
          ? '<a href="#haulage/' + r.haulage_id + '" class="ho-link">' + esc(r.haulage_number) + '</a>'
          : '—';
        return '<tr data-go="#picking/' + r.id + '" class="row-link">' +
          '<td>' + esc(r.number || '—') + '</td>' +
          '<td>' + esc(r.order_number || '—') + '</td>' +
          '<td>' + ho + '</td>' +
          '<td>' + esc(r.customer_name || '—') + '</td>' +
          '<td>' + esc(r.location_name || '—') + '</td>' +
          '<td>' + fmtDate(r.haulage_collection_date) + '</td>' +
          '<td>' + fmtDate(r.haulage_delivery_date) + '</td>' +
          '<td>' + fmtDate(r.order_due) + '</td>' +
          '<td>' + pickPill(r) + '</td></tr>';
      }).join('');
      wrap.innerHTML = '<table class="data-table"><thead><tr><th>SPN</th><th>SO</th><th>HO</th><th>Customer</th><th>Depot</th><th>Collection</th><th>Delivery</th><th>SO due</th><th>Status</th></tr></thead><tbody>' + body + '</tbody></table>';
      wrap.querySelectorAll('[data-go]').forEach(function (tr) { tr.onclick = function () { location.hash = tr.dataset.go; }; });
      wrap.querySelectorAll('.ho-link').forEach(function (a) { a.onclick = function (e) { e.stopPropagation(); }; });
    }).catch(showError);
  }

  function renderPickingDetail(id) {
    view.innerHTML = '<p class="muted">Loading picking note…</p>';
    Auth.api('/api/picking/' + id).then(function (d) {
      var p = d.picking, lines = d.lines || [];
      titleEl.textContent = 'Picking note ' + (p.number || '');
      var open = p.status === 'open';
      var canDeliver = p.status === 'confirmed' && !Number(p.delivery_count);
      var canCancel = p.status !== 'cancelled' && !Number(p.delivery_count);
      actionsEl.innerHTML =
        '<button class="btn btn-ghost-dark btn-sm" id="pk-print">Print</button> ' +
        (open ? '<button class="btn btn-primary btn-sm" id="pk-confirm">Confirm pick</button> ' : '') +
        (canDeliver ? '<button class="btn btn-primary btn-sm" id="pk-deliver">Create delivery note</button> ' : '') +
        (canCancel ? '<button class="btn btn-ghost-dark btn-sm danger" id="pk-cancel">Cancel pick</button> ' : '') +
        '<a class="btn btn-ghost-dark btn-sm" href="#picking">Back</a>';

      var totalVol = 0;
      var rows = lines.map(function (l) {
        var toPickCell = open
          ? '<input type="number" step="any" min="0" class="pe-qty" data-id="' + l.id + '" value="' + num(l.qty_to_pick) + '" style="width:90px">'
          : num(l.qty_to_pick);
        var pickedCell = open
          ? '<input type="number" step="any" min="0" class="pk-qty" data-id="' + l.id + '" value="' + num(l.qty_to_pick) + '" style="width:90px">'
          : num(l.qty_picked);
        var qtyForVol = open ? Number(l.qty_to_pick) : Number(l.qty_picked);
        var vol = qtyForVol * (l.pack_volume != null ? Number(l.pack_volume) : 0);
        totalVol += vol;
        return '<tr data-lineid="' + l.id + '"><td>' + esc(l.code || '—') + '</td><td>' + esc(l.batch_no || l.description || '—') + '</td>' +
          '<td>' + toPickCell + '</td><td>' + pickedCell + '</td><td>' + vol.toFixed(3) + '</td>' +
          (open ? '<td><button class="link-btn danger pe-del" data-id="' + l.id + '">remove</button></td>' : '<td></td>') + '</tr>';
      }).join('');

      var haulKv = p.haulage_number
        ? kv('Delivery date', esc(p.haulage_delivery_date || '—')) +
          kv('Haulage', '<a href="#haulage/' + p.haulage_id + '">' + esc(p.haulage_number) + '</a>')
        : '';
      view.innerHTML =
        '<div class="detail-grid"><div class="panel"><h3 class="sub-h">Picking note</h3>' +
          kv('Status', pickPill(p)) + kv(p.order_numbers && p.order_numbers.indexOf(',') >= 0 ? 'Orders' : 'Order', esc(p.order_numbers || p.order_number || '—')) +
          kv('Customer', esc(p.customer_name || '—')) + kv('Pick from', esc(p.location_name || '—')) + haulKv +
        '</div><div class="panel"><h3 class="sub-h">Deliver to</h3>' +
          ([p.delivery_name, p.delivery_address, p.delivery_city, p.delivery_postcode].filter(Boolean).map(esc).join('<br>') || '<span class="muted">—</span>') +
        '</div></div>' +
        '<div class="panel" style="margin-top:18px"><h3 class="sub-h">Picking instructions</h3>' +
          '<textarea id="pk-instructions" rows="2" style="width:100%" placeholder="Shown at the top of the printed picking note…">' + esc(p.instructions || '') + '</textarea>' +
          '<div style="text-align:right;margin-top:8px"><button class="btn btn-ghost-dark btn-sm" id="pk-saveinstr">Save instructions</button> <span class="form-note" id="pk-instr-note"></span></div>' +
        '</div>' +
        '<div class="panel" style="margin-top:18px"><h3 class="sub-h">Items</h3>' +
          '<table class="data-table"><thead><tr><th>Code</th><th>Batch</th><th>To pick</th><th>Picked</th><th>Volume m³</th><th></th></tr></thead><tbody>' +
          rows + '</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:600">Total volume m³</td><td style="font-weight:700">' + totalVol.toFixed(3) + '</td><td></td></tr></tfoot></table>' +
          (open ? '<div style="text-align:right;margin-top:10px"><button class="btn btn-ghost-dark btn-sm" id="pk-savelines">Save line changes</button> <span class="form-note" id="pk-lines-note"></span></div>' +
            '<p class="muted" style="margin-top:10px">Edit the “To pick” quantities or remove lines if the customer changes spec, then Save. Confirming reserves (allocates) this stock at ' + esc(p.location_name || 'the location') + '; it physically leaves when the delivery note is confirmed.</p>' : '') +
        '</div>';

      document.getElementById('pk-saveinstr').onclick = function () {
        var n = document.getElementById('pk-instr-note'); n.textContent = 'Saving…'; n.className = 'form-note';
        Auth.api('/api/picking/' + id, { method: 'PATCH', body: { instructions: document.getElementById('pk-instructions').value } })
          .then(function () { n.textContent = 'Saved'; p.instructions = document.getElementById('pk-instructions').value; })
          .catch(function (err) { n.textContent = err.message; n.className = 'form-note err'; });
      };
      var removedLineIds = [];
      Array.prototype.forEach.call(document.querySelectorAll('.pe-del'), function (b) {
        b.onclick = function () {
          removedLineIds.push(Number(b.dataset.id));
          var tr = b.closest('tr'); if (tr) tr.style.display = 'none';
        };
      });
      var sl = document.getElementById('pk-savelines');
      if (sl) sl.onclick = function () {
        var n = document.getElementById('pk-lines-note'); n.textContent = 'Saving…'; n.className = 'form-note';
        var ed = Array.prototype.map.call(document.querySelectorAll('.pe-qty'), function (i) {
          return { id: Number(i.dataset.id), qty_to_pick: Number(i.value) || 0 };
        }).filter(function (l) { return removedLineIds.indexOf(l.id) < 0; });
        removedLineIds.forEach(function (rid) { ed.push({ id: rid, remove: true }); });
        Auth.api('/api/picking/' + id, { method: 'PATCH', body: { lines: ed } })
          .then(function () { renderPickingDetail(id); })
          .catch(function (err) { n.textContent = err.message; n.className = 'form-note err'; });
      };
      document.getElementById('pk-print').onclick = function () { printPicking(p, lines); };
      var cancelBtn = document.getElementById('pk-cancel');
      if (cancelBtn) cancelBtn.onclick = function () {
        if (!confirm(p.status === 'confirmed'
          ? 'Cancel this confirmed pick? It releases the allocated stock and re-opens the order for editing.'
          : 'Cancel this picking note?')) return;
        cancelBtn.disabled = true;
        Auth.api('/api/picking/' + id, { method: 'PATCH', body: { action: 'cancel' } })
          .then(function () { renderPickingDetail(id); })
          .catch(function (err) { cancelBtn.disabled = false; alert(err.message); });
      };
      var db = document.getElementById('pk-deliver');
      if (db) db.onclick = function () {
        db.disabled = true;
        Auth.api('/api/picking/' + id + '/delivery', { method: 'POST', body: {} })
          .then(function (r) { location.hash = '#delivery/' + r.id; })
          .catch(function (err) { db.disabled = false; alert(err.message); });
      };
      var cb = document.getElementById('pk-confirm');
      if (cb) cb.onclick = function () {
        if (!confirm('Confirm pick? This allocates stock at ' + (p.location_name || 'the location') + ' (it leaves at delivery).')) return;
        var pickedLines = Array.prototype.map.call(document.querySelectorAll('.pk-qty'), function (i) {
          return { id: Number(i.dataset.id), qty_picked: Number(i.value) || 0 };
        });
        cb.disabled = true;
        Auth.api('/api/picking/' + id, { method: 'PATCH', body: { action: 'confirm', lines: pickedLines } })
          .then(function () { renderPickingDetail(id); })
          .catch(function (err) { cb.disabled = false; alert(err.message); });
      };
    }).catch(showError);
  }

  function printPicking(p, lines) {
    var totalVol = 0;
    var rows = lines.map(function (l) {
      var vol = Number(l.qty_to_pick) * (l.pack_volume != null ? Number(l.pack_volume) : 0);
      totalVol += vol;
      return '<tr><td>' + esc(l.code || '') + '</td><td>' + esc(l.description || '') + '</td><td style="text-align:right">' + num(l.qty_to_pick) + '</td><td style="text-align:right">' + vol.toFixed(3) + '</td><td></td></tr>';
    }).join('');
    var deliver = [p.delivery_name, p.delivery_address, p.delivery_city, p.delivery_postcode].filter(Boolean).map(esc).join('<br>');
    var html = '<html><head><title>' + esc(p.number) + '</title><style>' +
      'body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{margin:0 0 4px}.muted{color:#666}' +
      'table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:14px}' +
      'th{background:#f0f0f0}.head{display:flex;justify-content:space-between}.box{margin-top:10px}' +
      '.instr{margin-top:14px;padding:10px 12px;border:1px solid #111;background:#f7f7f7;white-space:pre-wrap;font-weight:600}</style></head><body>' +
      '<div class="head"><div><h1>Picking Note</h1><div class="muted">' + esc(p.number) + '</div></div>' +
      '<div style="text-align:right">' + companyHead() + '<br><span class="muted">Pick from: ' + esc(p.location_name || '') + '</span></div></div>' +
      (p.instructions ? '<div class="instr">' + esc(p.instructions) + '</div>' : '') +
      '<div class="box"><strong>Order:</strong> ' + esc(p.order_number || '') + ' &nbsp; <strong>Customer:</strong> ' + esc(p.customer_name || '') + '</div>' +
      '<div class="box"><strong>Deliver to:</strong><br>' + (deliver || '—') + '</div>' +
      '<table><thead><tr><th>Code</th><th>Description</th><th style="text-align:right">Qty to pick</th><th style="text-align:right">Volume m³</th><th>Picked ✓</th></tr></thead><tbody>' + rows +
      '</tbody><tfoot><tr><td colspan="3" style="text-align:right;font-weight:700">Total volume m³</td><td style="text-align:right;font-weight:700">' + totalVol.toFixed(3) + '</td><td></td></tr></tfoot></table>' +
      '<p class="muted" style="margin-top:24px">Picker: ____________________  Date: ____________</p>' +
      '</body></html>';
    var w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to print.'); return; }
    w.document.write(html); w.document.close(); w.focus(); w.print();
  }

  // ===================================================================
  //  Delivery notes
  // ===================================================================
  var DELIVERY_STATUS = { open: ['Open', 'st-open'], confirmed: ['Confirmed', 'st-green'], cancelled: ['Cancelled', 'st-grey'] };
  function delPill(s) { var m = DELIVERY_STATUS[s] || [s, 'st-grey']; return '<span class="pill ' + m[1] + '">' + esc(m[0]) + '</span>'; }
  var INVOICE_STATUS = { draft: ['Draft', 'st-open'], issued: ['Issued', 'st-blue'], part_paid: ['Part paid', 'st-amber'], paid: ['Paid', 'st-green'], cancelled: ['Cancelled', 'st-grey'] };
  function invPill(s) { var m = INVOICE_STATUS[s] || [s, 'st-grey']; return '<span class="pill ' + m[1] + '">' + esc(m[0]) + '</span>'; }

  function renderDelivery(sub) {
    if (sub) return renderDeliveryDetail(sub);
    actionsEl.innerHTML = '';
    view.innerHTML =
      '<div class="toolbar toolbar-row"><input type="search" id="d-search" class="search-input" placeholder="Search DN no, order, customer…">' +
      sortSelect('d-sort', [['newest', 'Newest first'], ['delivered', 'Delivered date']], 'newest') + '</div>' +
      '<div class="toolbar">' + statusFilterChips('d-status', DELIVERY_STATUS) + '</div>' +
      '<div id="d-wrap"><p class="muted">Loading…</p></div>';
    var s = document.getElementById('d-search'), t;
    s.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { loadDelivery(s.value); }, 200); });
    wireStatusChips('d-status', function () { loadDelivery(s.value); });
    document.getElementById('d-sort').onchange = function () { loadDelivery(s.value); };
    loadDelivery('');
  }

  function loadDelivery(q) {
    var wrap = document.getElementById('d-wrap');
    Auth.api('/api/delivery' + (q ? '?q=' + encodeURIComponent(q) : '')).then(function (d) {
      var rows = d.rows || [];
      var sel = selectedStatuses('d-status');
      if (sel.length) rows = rows.filter(function (r) { return sel.indexOf(r.status) >= 0; });
      if (statusFilterVal('d-sort') === 'delivered') rows = rows.slice().sort(cmpDateAsc('delivered_date'));
      if (!rows.length) { wrap.innerHTML = '<p class="muted">No matching delivery notes.</p>'; return; }
      var body = rows.map(function (r) {
        return '<tr data-go="#delivery/' + r.id + '" class="row-link"><td>' + esc(r.number || '—') + '</td>' +
          '<td>' + esc(r.order_number || '—') + '</td><td>' + esc(r.customer_name || '—') + '</td>' +
          '<td>' + esc(r.location_name || '—') + '</td>' +
          '<td>' + delPill(r.status) + '</td>' +
          '<td>' + (Number(r.invoice_count) ? '<span class="pill st-green">Invoiced</span>' : '—') + '</td></tr>';
      }).join('');
      wrap.innerHTML = '<table class="data-table"><thead><tr><th>Delivery</th><th>Order</th><th>Customer</th><th>From</th><th>Status</th><th>Invoice</th></tr></thead><tbody>' + body + '</tbody></table>';
      wrap.querySelectorAll('[data-go]').forEach(function (tr) { tr.onclick = function () { location.hash = tr.dataset.go; }; });
    }).catch(showError);
  }

  function renderDeliveryDetail(id) {
    view.innerHTML = '<p class="muted">Loading delivery note…</p>';
    Auth.api('/api/delivery/' + id).then(function (d) {
      var n = d.delivery, lines = d.lines || [], invs = d.invoices || [];
      titleEl.textContent = 'Delivery ' + (n.number || '');
      var open = n.status === 'open';
      var canInvoice = n.status === 'confirmed' && !invs.length;

      actionsEl.innerHTML =
        '<button class="btn btn-ghost-dark btn-sm" id="d-print">Print</button> ' +
        (open ? '<button class="btn btn-primary btn-sm" id="d-confirm">Confirm loaded</button> ' : '') +
        (canInvoice ? '<button class="btn btn-primary btn-sm" id="d-invoice">Raise invoice</button> ' : '') +
        (open ? '<button class="btn btn-ghost-dark btn-sm danger" id="d-del">Delete</button> ' : '') +
        '<a class="btn btn-ghost-dark btn-sm" href="#delivery">Back</a>';

      var coll = [n.location_name, n.collection_address, n.collection_city, n.collection_postcode].filter(Boolean).map(esc).join('<br>');
      var del = [n.delivery_name, n.delivery_address, n.delivery_city, n.delivery_postcode].filter(Boolean).map(esc).join('<br>');

      var totalVol = 0;
      var rows = lines.map(function (l) {
        var loadedCell = open
          ? '<input type="number" step="any" min="0" class="dn-qty" data-id="' + l.id + '" value="' + num(l.qty) + '" style="width:90px">'
          : num(l.qty);
        var vol = Number(l.qty) * (l.pack_volume != null ? Number(l.pack_volume) : 0);
        totalVol += vol;
        return '<tr><td>' + esc(l.code || '—') + '</td><td>' + esc(l.description || '—') + '</td>' +
          '<td>' + num(l.qty_picked) + '</td><td>' + loadedCell + '</td><td>' + vol.toFixed(3) + '</td></tr>';
      }).join('');

      view.innerHTML =
        '<div class="detail-grid"><div class="panel"><h3 class="sub-h">Delivery note</h3>' +
          kv('Status', delPill(n.status)) + kv('Order', esc(n.order_number || '—')) +
          kv('Customer', esc(n.customer_name || '—')) + kv('Picking note', esc(n.picking_number || '—')) +
          kv('Delivered', esc(n.delivered_date || '—')) +
        '</div><div class="panel"><h3 class="sub-h">Collect from</h3>' + (coll || '<span class="muted">—</span>') +
          '<h3 class="sub-h" style="margin-top:18px">Deliver to</h3>' + (del || '<span class="muted">—</span>') +
        '</div></div>' +
        '<div class="panel" style="margin-top:18px"><h3 class="sub-h">Loaded items</h3>' +
          '<table class="data-table"><thead><tr><th>Code</th><th>Description</th><th>Allocated (picked)</th><th>Loaded</th><th>Volume m³</th></tr></thead><tbody>' +
          rows + '</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-weight:600">Total volume m³</td><td style="font-weight:700">' + totalVol.toFixed(3) + '</td></tr></tfoot></table>' +
          (open ? '<p class="muted" style="margin-top:10px">Amend the loaded quantities to match what was physically loaded, then confirm. Confirming reduces stock at ' + esc(n.location_name || 'the location') + ' and releases the picked allocation. (Volume m³ reflects the saved loaded qty until you confirm.)</p>' : '') +
          (invs.length ? '<div class="doc-links" style="margin-top:14px"><strong>Invoices:</strong> ' + invs.map(function (x) { return '<a href="#invoices/' + x.id + '">' + esc(x.number) + '</a> ' + invPill(x.status); }).join(' · ') + '</div>' : '') +
        '</div>';

      document.getElementById('d-print').onclick = function () { printDelivery(n, lines); };
      var cf = document.getElementById('d-confirm');
      if (cf) cf.onclick = function () {
        if (!confirm('Confirm loaded quantities? This reduces stock at ' + (n.location_name || 'the location') + '.')) return;
        var ll = Array.prototype.map.call(document.querySelectorAll('.dn-qty'), function (i) { return { id: Number(i.dataset.id), qty: Number(i.value) || 0 }; });
        cf.disabled = true;
        Auth.api('/api/delivery/' + id, { method: 'PATCH', body: { action: 'confirm', lines: ll } })
          .then(function () { renderDeliveryDetail(id); }).catch(function (err) { cf.disabled = false; alert(err.message); });
      };
      var iv = document.getElementById('d-invoice');
      if (iv) iv.onclick = function () {
        iv.disabled = true;
        Auth.api('/api/delivery/' + id + '/invoice', { method: 'POST', body: {} })
          .then(function (r) { location.hash = '#invoices/' + r.id; }).catch(function (err) { iv.disabled = false; alert(err.message); });
      };
      var dl = document.getElementById('d-del');
      if (dl) dl.onclick = function () {
        if (!confirm('Delete this delivery note?')) return;
        Auth.api('/api/delivery/' + id, { method: 'DELETE' }).then(function () { location.hash = '#delivery'; }).catch(showError);
      };
    }).catch(showError);
  }

  function printDelivery(n, lines) {
    var totalVol = 0;
    var rows = lines.map(function (l) {
      var vol = Number(l.qty) * (l.pack_volume != null ? Number(l.pack_volume) : 0);
      totalVol += vol;
      return '<tr><td>' + esc(l.code || '') + '</td><td>' + esc(l.description || '') + '</td><td style="text-align:right">' + num(l.qty) + '</td><td style="text-align:right">' + vol.toFixed(3) + '</td></tr>';
    }).join('');
    var coll = [n.location_name, n.collection_address, n.collection_city, n.collection_postcode].filter(Boolean).map(esc).join('<br>');
    var del = [n.delivery_name, n.delivery_address, n.delivery_city, n.delivery_postcode].filter(Boolean).map(esc).join('<br>');
    var html = '<html><head><title>' + esc(n.number) + '</title><style>' +
      'body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{margin:0 0 4px}.muted{color:#666}' +
      'table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:14px}' +
      'th{background:#f0f0f0}.head{display:flex;justify-content:space-between}.cols{display:flex;gap:32px;margin-top:14px}.cols>div{flex:1}.box{margin-top:6px}</style></head><body>' +
      '<div class="head"><div><h1>Delivery Note</h1><div class="muted">' + esc(n.number) + '</div></div>' +
      '<div style="text-align:right">' + companyHead() + '<br><span class="muted">Order: ' + esc(n.order_number || '') + '</span></div></div>' +
      '<div class="cols"><div><strong>Collect from:</strong><div class="box">' + (coll || '—') + '</div></div>' +
      '<div><strong>Deliver to:</strong><div class="box">' + (del || '—') + '</div></div></div>' +
      '<table><thead><tr><th>Code</th><th>Description</th><th style="text-align:right">Qty loaded</th><th style="text-align:right">Volume m³</th></tr></thead><tbody>' + rows +
      '</tbody><tfoot><tr><td colspan="3" style="text-align:right;font-weight:700">Total volume m³</td><td style="text-align:right;font-weight:700">' + totalVol.toFixed(3) + '</td></tr></tfoot></table>' +
      '<p class="muted" style="margin-top:24px">Received by: ____________________  Signature: ____________  Date: __________</p>' +
      '</body></html>';
    var w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to print.'); return; }
    w.document.write(html); w.document.close(); w.focus(); w.print();
  }

  // ===================================================================
  //  Invoices
  // ===================================================================
  function renderInvoices(sub) {
    if (sub) return renderInvoiceDetail(sub);
    actionsEl.innerHTML = '';
    view.innerHTML =
      '<div class="toolbar toolbar-row"><input type="search" id="i-search" class="search-input" placeholder="Search INV no, order, customer…">' +
      sortSelect('i-sort', [['newest', 'Newest first'], ['due', 'Due date'], ['outstanding', 'Outstanding']], 'newest') + '</div>' +
      '<div class="toolbar">' + statusFilterChips('i-status', INVOICE_STATUS) + '</div>' +
      '<div id="i-wrap"><p class="muted">Loading…</p></div>';
    var s = document.getElementById('i-search'), t;
    s.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { loadInvoices(s.value); }, 200); });
    wireStatusChips('i-status', function () { loadInvoices(s.value); });
    document.getElementById('i-sort').onchange = function () { loadInvoices(s.value); };
    loadInvoices('');
  }

  function loadInvoices(q) {
    var wrap = document.getElementById('i-wrap');
    Auth.api('/api/invoices' + (q ? '?q=' + encodeURIComponent(q) : '')).then(function (d) {
      var rows = d.rows || [];
      var sel = selectedStatuses('i-status');
      if (sel.length) rows = rows.filter(function (r) { return sel.indexOf(r.status) >= 0; });
      var sk = statusFilterVal('i-sort');
      if (sk === 'due') rows = rows.slice().sort(cmpDateAsc('due_date'));
      else if (sk === 'outstanding') rows = rows.slice().sort(cmpNumDesc('outstanding'));
      if (!rows.length) { wrap.innerHTML = '<p class="muted">No matching invoices.</p>'; return; }
      var body = rows.map(function (r) {
        var over = Number(r.days_overdue) > 0;
        return '<tr data-go="#invoices/' + r.id + '" class="row-link"><td>' + esc(r.number || '—') + '</td>' +
          '<td>' + esc(r.customer_name || '—') + '</td>' +
          '<td>' + fmtDate(r.invoice_date) + '</td>' +
          '<td>' + fmtDate(r.due_date) + (over ? ' <span class="badge-low">' + r.days_overdue + 'd</span>' : '') + '</td>' +
          '<td>' + invPill(r.status) + '</td>' +
          '<td style="text-align:right">' + gbp(r.gross) + '</td>' +
          '<td style="text-align:right">' + gbp(r.outstanding) + '</td></tr>';
      }).join('');
      wrap.innerHTML = '<table class="data-table"><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Due</th><th>Status</th><th style="text-align:right">Gross</th><th style="text-align:right">Outstanding</th></tr></thead><tbody>' + body + '</tbody></table>';
      wrap.querySelectorAll('[data-go]').forEach(function (tr) { tr.onclick = function () { location.hash = tr.dataset.go; }; });
    }).catch(showError);
  }

  function renderInvoiceDetail(id) {
    view.innerHTML = '<p class="muted">Loading invoice…</p>';
    Auth.api('/api/invoices/' + id).then(function (d) {
      var inv = d.invoice, lines = d.lines || [], allocations = d.allocations || [];
      titleEl.textContent = 'Invoice ' + (inv.number || '');
      var vatRate = Number(inv.vat_rate) || 0;
      var canPay = inv.status === 'issued' || inv.status === 'part_paid';

      actionsEl.innerHTML =
        '<button class="btn btn-ghost-dark btn-sm" id="i-print">Print / PDF</button> ' +
        (inv.status === 'draft' ? '<button class="btn btn-primary btn-sm" id="i-issue">Issue invoice</button> ' : '') +
        (canPay ? '<button class="btn btn-primary btn-sm" id="i-pay">Record payment</button> ' : '') +
        (inv.status !== 'cancelled' && inv.status !== 'paid' ? '<button class="btn btn-ghost-dark btn-sm" id="i-cancel">Cancel</button> ' : '') +
        (inv.status === 'draft' ? '<button class="btn btn-ghost-dark btn-sm danger" id="i-del">Delete</button> ' : '') +
        '<a class="btn btn-ghost-dark btn-sm" href="#invoices">Back</a>';

      var bill = [inv.customer_name, inv.customer_address, inv.customer_city, inv.customer_postcode].filter(Boolean).map(esc).join('<br>');
      var totalVol = 0;
      var rows = lines.map(function (l) {
        var rate = lineRateM3(l);
        var vol = Number(l.quantity) * (l.pack_volume != null ? Number(l.pack_volume) : 0);
        totalVol += vol;
        return '<tr><td>' + esc(l.code || '—') + '</td><td>' + esc(l.description || '—') + '</td>' +
          '<td>' + sellDims(l) + '</td><td>' + num(l.ppp) + '</td>' +
          '<td>' + num(l.quantity) + '</td><td>' + vol.toFixed(3) + '</td>' +
          '<td>' + (rate != null ? gbp(rate) : '—') + '</td>' +
          '<td>' + gbp(l.net) + '</td></tr>';
      }).join('');

      var allocPanel = allocations.length
        ? '<div class="panel" style="margin-top:18px"><h3 class="sub-h">Payments applied</h3>' +
          '<table class="data-table"><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th style="text-align:right">Amount</th></tr></thead><tbody>' +
          allocations.map(function (a) { return '<tr><td>' + esc(a.payment_date || '') + '</td><td>' + esc(a.method || '—') + '</td><td>' + esc(a.reference || '—') + '</td><td style="text-align:right">' + gbp(a.amount) + '</td></tr>'; }).join('') +
          '</tbody></table></div>'
        : '';
      view.innerHTML =
        '<div class="detail-grid"><div class="panel"><h3 class="sub-h">Invoice</h3>' +
          kv('Status', invPill(inv.status)) + kv('Date', esc(inv.invoice_date || '—')) + kv('Due', esc(inv.due_date || '—')) +
          kv('Order', esc(inv.order_number || '—')) + kv('Delivery', esc(inv.delivery_number || '—')) +
          kv('Customer ref', esc(inv.customer_ref || '—')) +
          kv('Paid', gbp(inv.amount_paid || 0)) + kv('Outstanding', '<strong>' + gbp(inv.outstanding || 0) + '</strong>') +
        '</div><div class="panel"><h3 class="sub-h">Bill to</h3>' + (bill || '<span class="muted">—</span>') +
          (inv.status === 'draft' ? '<p class="muted" style="margin-top:14px">Draft — finance can spot-check against the delivery note, then issue.</p>' : '') +
        '</div></div>' +
        allocPanel +
        '<div class="panel" style="margin-top:18px"><h3 class="sub-h">Lines</h3>' +
          '<table class="data-table"><thead><tr><th>Code</th><th>Description</th><th>Size (mm)</th><th>PPP</th><th>Packs</th><th>Volume m³</th><th>£/m³</th><th>Net</th></tr></thead><tbody>' +
          rows + '</tbody><tfoot>' +
          '<tr><td colspan="5" style="text-align:right">Total volume m³</td><td style="font-weight:600">' + totalVol.toFixed(3) + '</td><td colspan="2"></td></tr>' +
          '<tr><td colspan="7" style="text-align:right">Net</td><td>' + gbp(inv.net) + '</td></tr>' +
          '<tr><td colspan="7" style="text-align:right">VAT (' + vatRate + '%)</td><td>' + gbp(inv.vat) + '</td></tr>' +
          '<tr><td colspan="7" style="text-align:right;font-weight:700">Gross</td><td style="font-weight:700">' + gbp(inv.gross) + '</td></tr>' +
          '</tfoot></table></div>';

      document.getElementById('i-print').onclick = function () { printInvoice(inv, lines); };
      function setStatus(s) { Auth.api('/api/invoices/' + id, { method: 'PATCH', body: { status: s } }).then(function () { renderInvoiceDetail(id); }).catch(showError); }
      var issue = document.getElementById('i-issue'); if (issue) issue.onclick = function () { setStatus('issued'); };
      var pay = document.getElementById('i-pay'); if (pay) pay.onclick = function () { openReceipt(inv.customer_id, inv.customer_name, function () { renderInvoiceDetail(id); }, inv.id); };
      var cancel = document.getElementById('i-cancel'); if (cancel) cancel.onclick = function () { if (confirm('Cancel this invoice?')) setStatus('cancelled'); };
      var del = document.getElementById('i-del'); if (del) del.onclick = function () {
        if (!confirm('Delete this draft invoice?')) return;
        Auth.api('/api/invoices/' + id, { method: 'DELETE' }).then(function () { location.hash = '#invoices'; }).catch(showError);
      };
    }).catch(showError);
  }

  function printInvoice(inv, lines) {
    var vatRate = Number(inv.vat_rate) || 0;
    var totalVol = 0;
    var rows = lines.map(function (l) {
      var rate = lineRateM3(l);
      var vol = Number(l.quantity) * (l.pack_volume != null ? Number(l.pack_volume) : 0);
      totalVol += vol;
      return '<tr><td>' + esc(l.code || '') + '</td><td>' + esc(l.description || '') + '</td>' +
        '<td>' + sellDims(l) + '</td><td style="text-align:right">' + num(l.ppp) + '</td>' +
        '<td style="text-align:right">' + num(l.quantity) + '</td>' +
        '<td style="text-align:right">' + vol.toFixed(3) + '</td>' +
        '<td style="text-align:right">' + (rate != null ? gbp(rate) : '—') + '</td>' +
        '<td style="text-align:right">' + gbp(l.net) + '</td></tr>';
    }).join('');
    var bill = [inv.customer_name, inv.customer_address, inv.customer_city, inv.customer_postcode].filter(Boolean).map(esc).join('<br>');
    var html = '<html><head><title>' + esc(inv.number) + '</title><style>' +
      'body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{margin:0 0 4px}.muted{color:#666}' +
      '.head{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:10px}' +
      'table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #ccc;padding:8px;font-size:13px}th{background:#f0f0f0;text-align:left}' +
      '.totals{margin-top:20px;margin-left:auto;width:280px;font-size:14px}.totals div{display:flex;justify-content:space-between;padding:4px 0}' +
      '.totals .grand{border-top:2px solid #111;font-weight:700;margin-top:4px;padding-top:8px}</style></head><body>' +
      '<div class="head"><div><h1>Invoice</h1><div class="muted">' + esc(inv.number) + '</div>' +
      '<div class="muted">Date: ' + esc(inv.invoice_date || '') + '</div></div>' +
      '<div style="text-align:right">' + companyHead() + '<br><span class="muted">Order: ' + esc(inv.order_number || '') +
      (inv.delivery_number ? '<br>Delivery: ' + esc(inv.delivery_number) : '') + '</span></div></div>' +
      '<p style="margin-top:14px"><strong>Bill to:</strong><br>' + (bill || '—') + '</p>' +
      '<table><thead><tr><th>Code</th><th>Description</th><th>Size (mm)</th><th style="text-align:right">PPP</th><th style="text-align:right">Packs</th><th style="text-align:right">Volume m³</th><th style="text-align:right">£/m³</th><th style="text-align:right">Net</th></tr></thead><tbody>' + rows +
      '</tbody><tfoot><tr><td colspan="5" style="text-align:right;font-weight:700">Total volume m³</td><td style="text-align:right;font-weight:700">' + totalVol.toFixed(3) + '</td><td colspan="2"></td></tr></tfoot></table>' +
      '<div class="totals"><div><span>Net</span><span>' + gbp(inv.net) + '</span></div>' +
      '<div><span>VAT (' + vatRate + '%)</span><span>' + gbp(inv.vat) + '</span></div>' +
      '<div class="grand"><span>Gross</span><span>' + gbp(inv.gross) + '</span></div></div>' +
      (inv.notes ? '<p class="muted" style="margin-top:24px">' + esc(inv.notes) + '</p>' : '') +
      companyFooter() +
      '</body></html>';
    var w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to print.'); return; }
    w.document.write(html); w.document.close(); w.focus(); w.print();
  }

  // ===================================================================
  //  Accounts — aged debtors, statements, receipts
  // ===================================================================
  function renderAccounts(sub) {
    if (sub) return renderAccountStatement(sub);
    actionsEl.innerHTML = '';
    view.innerHTML = '<div id="ad-wrap"><p class="muted">Loading…</p></div>';
    Auth.api('/api/accounts').then(function (d) {
      var rows = d.rows || [];
      var wrap = document.getElementById('ad-wrap');
      if (!rows.length) { wrap.innerHTML = '<p class="muted">No outstanding invoices. 👍</p>'; return; }
      var tot = function (k) { return rows.reduce(function (a, r) { return a + Number(r[k] || 0); }, 0); };
      var body = rows.map(function (r) {
        var over = Number(r.credit_limit) > 0 && Number(r.outstanding) > Number(r.credit_limit);
        return '<tr data-go="#accounts/' + r.customer_id + '" class="row-link"><td>' + esc(r.customer_name || '—') + '</td>' +
          '<td style="text-align:right">' + gbp(r.current_due) + '</td>' +
          '<td style="text-align:right">' + gbp(r.d1_30) + '</td>' +
          '<td style="text-align:right">' + gbp(r.d31_60) + '</td>' +
          '<td style="text-align:right">' + gbp(r.d61_90) + '</td>' +
          '<td style="text-align:right">' + gbp(r.d90_plus) + '</td>' +
          '<td style="text-align:right;font-weight:700">' + gbp(r.outstanding) + '</td>' +
          '<td style="text-align:right">' + (r.credit_limit != null ? gbp(r.credit_limit) + (over ? ' <span class="badge-low">over</span>' : '') : '—') + '</td></tr>';
      }).join('');
      wrap.innerHTML = '<h2>Aged debtors</h2><table class="data-table"><thead><tr><th>Customer</th><th style="text-align:right">Current</th><th style="text-align:right">1–30</th><th style="text-align:right">31–60</th><th style="text-align:right">61–90</th><th style="text-align:right">90+</th><th style="text-align:right">Total due</th><th style="text-align:right">Credit limit</th></tr></thead><tbody>' +
        body + '</tbody><tfoot><tr><td style="font-weight:700">Total</td>' +
        ['current_due', 'd1_30', 'd31_60', 'd61_90', 'd90_plus', 'outstanding'].map(function (k) { return '<td style="text-align:right;font-weight:700">' + gbp(tot(k)) + '</td>'; }).join('') +
        '<td></td></tr></tfoot></table>';
      wrap.querySelectorAll('[data-go]').forEach(function (tr) { tr.onclick = function () { location.hash = tr.dataset.go; }; });
    }).catch(showError);
  }

  function renderAccountStatement(customerId) {
    view.innerHTML = '<p class="muted">Loading…</p>';
    Auth.api('/api/accounts/' + customerId).then(function (d) {
      var c = d.customer, invs = d.invoices || [], pays = d.payments || [];
      titleEl.textContent = 'Account — ' + (c.name || '');
      actionsEl.innerHTML =
        '<button class="btn btn-primary btn-sm" id="st-pay">Receive payment</button> ' +
        '<button class="btn btn-ghost-dark btn-sm" id="st-print">Print / PDF</button> ' +
        '<a class="btn btn-ghost-dark btn-sm" href="#accounts">Back</a>';
      var avail = (c.credit_limit != null) ? (Number(c.credit_limit) - Number(d.outstanding)) : null;
      var terms = (c.credit_terms_days != null ? c.credit_terms_days + ' days' : '—') + (c.credit_terms_eom ? ' EOM' : '');
      var invRows = invs.map(function (i) {
        return '<tr data-go="#invoices/' + i.id + '" class="row-link"><td>' + esc(i.number || '—') + '</td>' +
          '<td>' + esc(i.invoice_date || '') + '</td><td>' + esc(i.due_date || '—') + '</td>' +
          '<td>' + invPill(i.status) + '</td>' +
          '<td style="text-align:right">' + gbp(i.gross) + '</td><td style="text-align:right">' + gbp(i.amount_paid) + '</td>' +
          '<td style="text-align:right">' + gbp(i.outstanding) + '</td>' +
          '<td style="text-align:right">' + (Number(i.days_overdue) > 0 ? '<span class="badge-low">' + i.days_overdue + 'd</span>' : '—') + '</td></tr>';
      }).join('');
      var payRows = pays.map(function (p) {
        return '<tr><td>' + esc(p.payment_date || '') + '</td><td>' + esc(p.method || '—') + '</td><td>' + esc(p.reference || '—') + '</td><td style="text-align:right">' + gbp(p.amount) + '</td></tr>';
      }).join('');
      view.innerHTML =
        '<div class="detail-grid"><div class="panel"><h3 class="sub-h">Account</h3>' +
          kv('Customer', esc(c.name || '—')) + kv('Account no.', esc(c.account_no || '—')) +
          kv('Credit terms', esc(terms)) + kv('Credit limit', c.credit_limit != null ? gbp(c.credit_limit) : '—') +
          kv('Outstanding', '<strong>' + gbp(d.outstanding) + '</strong>') +
          kv('Available credit', avail != null ? (avail < 0 ? '<span class="badge-low">' + gbp(avail) + '</span>' : gbp(avail)) : '—') +
        '</div><div class="panel"><h3 class="sub-h">Address</h3>' +
          ([c.address, c.city, c.postcode].filter(Boolean).map(esc).join('<br>') || '<span class="muted">—</span>') + '</div></div>' +
        '<div class="panel" style="margin-top:18px"><h3 class="sub-h">Invoices</h3>' +
          '<table class="data-table"><thead><tr><th>Invoice</th><th>Date</th><th>Due</th><th>Status</th><th style="text-align:right">Gross</th><th style="text-align:right">Paid</th><th style="text-align:right">Outstanding</th><th style="text-align:right">Overdue</th></tr></thead><tbody>' +
          (invRows || '<tr><td colspan="8" class="muted">No invoices.</td></tr>') + '</tbody></table></div>' +
        '<div class="panel" style="margin-top:18px"><h3 class="sub-h">Payments received</h3>' +
          '<table class="data-table"><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th style="text-align:right">Amount</th></tr></thead><tbody>' +
          (payRows || '<tr><td colspan="4" class="muted">No payments yet.</td></tr>') + '</tbody></table></div>';
      view.querySelectorAll('[data-go]').forEach(function (tr) { tr.onclick = function () { location.hash = tr.dataset.go; }; });
      document.getElementById('st-pay').onclick = function () { openReceipt(c.id, c.name, function () { renderAccountStatement(customerId); }); };
      document.getElementById('st-print').onclick = function () { printStatement(c, invs, pays, d.outstanding); };
    }).catch(showError);
  }

  function printStatement(c, invs, pays, outstanding) {
    var invRows = invs.map(function (i) {
      return '<tr><td>' + esc(i.number || '') + '</td><td>' + esc(i.invoice_date || '') + '</td><td>' + esc(i.due_date || '') + '</td>' +
        '<td style="text-align:right">' + gbp(i.gross) + '</td><td style="text-align:right">' + gbp(i.amount_paid) + '</td><td style="text-align:right">' + gbp(i.outstanding) + '</td></tr>';
    }).join('');
    var html = '<html><head><title>Statement</title><style>' +
      'body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{margin:0 0 4px}.muted{color:#666}' +
      '.head{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:10px}' +
      'table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ccc;padding:7px;font-size:13px}th{background:#f0f0f0;text-align:left}' +
      '.bal{margin-top:16px;text-align:right;font-size:15px;font-weight:700}</style></head><body>' +
      '<div class="head"><div><h1>Statement of Account</h1><div class="muted">' + esc(c.name || '') + '</div>' +
      '<div class="muted">' + [c.address, c.city, c.postcode].filter(Boolean).map(esc).join(', ') + '</div></div>' +
      '<div style="text-align:right">' + companyHead() + '<br><span class="muted">' + new Date().toLocaleDateString('en-GB') + '</span></div></div>' +
      '<table><thead><tr><th>Invoice</th><th>Date</th><th>Due</th><th style="text-align:right">Gross</th><th style="text-align:right">Paid</th><th style="text-align:right">Outstanding</th></tr></thead><tbody>' + invRows + '</tbody></table>' +
      '<div class="bal">Balance due: ' + gbp(outstanding) + '</div>' +
      companyFooter() +
      '</body></html>';
    var w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to print.'); return; }
    w.document.write(html); w.document.close(); w.focus(); w.print();
  }

  // Record a customer receipt and allocate it across their open invoices.
  function openReceipt(customerId, customerName, onDone, prefillInvoiceId) {
    document.getElementById('modal-title').textContent = 'Receive payment — ' + (customerName || '');
    modalForm.innerHTML = '<p class="muted">Loading open invoices…</p>';
    modal.hidden = false;
    Auth.api('/api/invoices?customer_id=' + customerId).then(function (d) {
      var open = (d.rows || []).filter(function (i) { return (i.status === 'issued' || i.status === 'part_paid') && Number(i.outstanding) > 0.005; });
      var invRows = open.map(function (i) {
        return '<tr><td>' + esc(i.number) + '</td><td>' + esc(i.due_date || '—') + '</td>' +
          '<td style="text-align:right">' + gbp(i.outstanding) + '</td>' +
          '<td><input type="number" step="any" min="0" class="rc-alloc" data-id="' + i.id + '" data-out="' + Number(i.outstanding) + '" style="width:100px" value="' + (prefillInvoiceId && String(prefillInvoiceId) === String(i.id) ? Number(i.outstanding) : '') + '"></td></tr>';
      }).join('');
      modalForm.innerHTML =
        '<div class="fields form-grid">' +
        '<div class="field"><label>Amount received £ *</label><input id="rc-amount" type="number" step="any" min="0"></div>' +
        '<div class="field"><label>Date</label><input id="rc-date" type="date"></div>' +
        '<div class="field"><label>Method</label><input id="rc-method" placeholder="BACS, cheque…"></div>' +
        '<div class="field"><label>Reference</label><input id="rc-ref"></div>' +
        '</div>' +
        '<div style="margin:6px 0"><button type="button" class="btn btn-ghost-dark btn-sm" id="rc-auto">Auto-allocate (oldest first)</button></div>' +
        '<table class="data-table"><thead><tr><th>Invoice</th><th>Due</th><th style="text-align:right">Outstanding</th><th>Allocate £</th></tr></thead><tbody>' +
        (invRows || '<tr><td colspan="4" class="muted">No open invoices.</td></tr>') + '</tbody></table>' +
        '<p class="form-note" id="modal-note"></p>' +
        '<div class="modal-foot"><button type="button" class="btn btn-ghost-dark btn-sm" data-cancel>Cancel</button>' +
        '<button type="submit" class="btn btn-primary btn-sm">Save payment</button></div>';
      modalForm.querySelector('[data-cancel]').onclick = closeModal;
      document.getElementById('rc-auto').onclick = function () {
        var amt = Number(document.getElementById('rc-amount').value) || 0;
        var remaining = amt;
        // oldest first = bottom of the (desc) list; iterate reversed
        var inputs = Array.prototype.slice.call(modalForm.querySelectorAll('.rc-alloc')).reverse();
        inputs.forEach(function (inp) {
          var out = Number(inp.dataset.out) || 0;
          var give = Math.min(remaining, out);
          inp.value = give > 0 ? Math.round(give * 100) / 100 : '';
          remaining -= give;
        });
      };
      modalForm.onsubmit = function (e) {
        e.preventDefault();
        var note = document.getElementById('modal-note'); note.textContent = 'Saving…'; note.className = 'form-note';
        var allocations = Array.prototype.map.call(modalForm.querySelectorAll('.rc-alloc'), function (inp) {
          return { invoice_id: Number(inp.dataset.id), amount: Number(inp.value) || 0 };
        }).filter(function (a) { return a.amount > 0; });
        Auth.api('/api/payments', { method: 'POST', body: {
          customer_id: customerId, amount: document.getElementById('rc-amount').value,
          payment_date: document.getElementById('rc-date').value, method: document.getElementById('rc-method').value,
          reference: document.getElementById('rc-ref').value, allocations: allocations
        } }).then(function () { closeModal(); if (onDone) onDone(); })
          .catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
      };
    }).catch(showError);
  }

  // ===================================================================
  //  Haulage orders (multi-drop)
  // ===================================================================
  var HAULAGE_STATUS = {
    open: ['Open', 'st-open'], sent: ['Sent', 'st-blue'],
    completed: ['Completed', 'st-green'], cancelled: ['Cancelled', 'st-grey']
  };
  function haulPill(s) { var m = HAULAGE_STATUS[s] || [s, 'st-grey']; return '<span class="pill ' + m[1] + '">' + esc(m[0]) + '</span>'; }
  var haulagePicks = [];   // picking notes available to link as drops

  function renderHaulage(sub) {
    if (sub) return renderHaulageDetail(sub);
    actionsEl.innerHTML = '<button class="btn btn-primary btn-sm" id="new-haul">+ New haulage order</button>';
    view.innerHTML =
      '<div class="toolbar"><input type="search" id="h-search" class="search-input" placeholder="Search HO no, haulier…"></div>' +
      '<div id="h-wrap"><p class="muted">Loading…</p></div>';
    document.getElementById('new-haul').onclick = function () { location.hash = '#haulage/new'; };
    var s = document.getElementById('h-search'), t;
    s.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { loadHaulage(s.value); }, 200); });
    loadHaulage('');
  }

  function loadHaulage(q) {
    var wrap = document.getElementById('h-wrap');
    Auth.api('/api/haulage' + (q ? '?q=' + encodeURIComponent(q) : '')).then(function (d) {
      var rows = d.rows || [];
      if (!rows.length) { wrap.innerHTML = '<p class="muted">No haulage orders yet. Create one and link picking notes as drops.</p>'; return; }
      var body = rows.map(function (r) {
        return '<tr data-go="#haulage/' + r.id + '" class="row-link"><td>' + esc(r.number || '—') + '</td>' +
          '<td>' + esc(r.haulier_name || '—') + '</td>' +
          '<td>' + fmtDate(r.collection_date) + '</td>' +
          '<td>' + fmtDate(r.delivery_date) + '</td>' +
          '<td>' + num(r.drop_count) + '</td>' +
          '<td>' + haulPill(r.status) + '</td>' +
          '<td>' + gbp(r.nett) + '</td></tr>';
      }).join('');
      wrap.innerHTML = '<table class="data-table"><thead><tr><th>Haulage no</th><th>Haulier</th><th>Collection</th><th>Delivery</th><th>Drops</th><th>Status</th><th>Nett</th></tr></thead><tbody>' + body + '</tbody></table>';
      wrap.querySelectorAll('[data-go]').forEach(function (tr) { tr.onclick = function () { location.hash = tr.dataset.go; }; });
    }).catch(showError);
  }

  // ---- Haulage detail -----------------------------------------------
  function renderHaulageDetail(id) {
    if (id === 'new') return renderHaulageForm(null);
    view.innerHTML = '<p class="muted">Loading haulage order…</p>';
    Auth.api('/api/haulage/' + id).then(function (d) {
      var h = d.haulage, drops = d.drops || [];
      titleEl.textContent = 'Haulage ' + (h.number || '');
      var vatRate = Number(h.vat_rate) || 0;
      var nett = drops.reduce(function (a, x) { return a + Number(x.nett_cost || 0); }, 0);
      var vat = nett * vatRate / 100;

      actionsEl.innerHTML =
        '<button class="btn btn-ghost-dark btn-sm" id="h-print">Print / PDF</button> ' +
        '<button class="btn btn-ghost-dark btn-sm" id="h-edit">Edit</button> ' +
        (h.status === 'open' ? '<button class="btn btn-primary btn-sm" id="h-status" data-next="sent">Mark sent</button> ' : '') +
        (h.status === 'sent' ? '<button class="btn btn-primary btn-sm" id="h-status" data-next="completed">Mark completed</button> ' : '') +
        (h.status !== 'cancelled' && h.status !== 'completed' ? '<button class="btn btn-ghost-dark btn-sm" id="h-cancel">Cancel</button> ' : '') +
        '<button class="btn btn-ghost-dark btn-sm danger" id="h-del">Delete</button> ' +
        '<a class="btn btn-ghost-dark btn-sm" href="#haulage">Back</a>';

      var rows = drops.map(function (x) {
        var coll = [x.collection_name, x.collection_address, x.collection_city, x.collection_postcode].filter(Boolean).map(esc).join('<br>');
        var del = [x.delivery_name, x.delivery_address, x.delivery_city, x.delivery_postcode].filter(Boolean).map(esc).join('<br>');
        return '<tr><td>' + x.drop_no + '</td>' +
          '<td>' + esc(x.picking_number || '—') + '<br><span class="muted">' + esc(x.order_number || '') + ' · ' + esc(x.customer_name || '') + '</span></td>' +
          '<td>' + (coll || '—') + '</td><td>' + (del || '—') + '</td>' +
          '<td style="text-align:right">' + gbp(x.nett_cost) + '</td></tr>';
      }).join('');

      view.innerHTML =
        '<div class="detail-grid"><div class="panel"><h3 class="sub-h">Haulage order</h3>' +
          kv('Status', haulPill(h.status)) + kv('Haulier', esc(h.haulier_name || '—')) +
          kv('Collection', esc(h.collection_date || '—')) + kv('Delivery', esc(h.delivery_date || '—')) +
          kv('Drops', drops.length) +
        '</div><div class="panel"><h3 class="sub-h">Haulier contact</h3>' +
          ([h.haulier_contact, h.haulier_phone, h.haulier_email].filter(Boolean).map(esc).join('<br>') || '<span class="muted">—</span>') +
          (h.instructions ? '<h3 class="sub-h" style="margin-top:18px">Instructions</h3>' + esc(h.instructions) : '') +
          (h.notes ? '<h3 class="sub-h" style="margin-top:18px">Notes</h3>' + esc(h.notes) : '') +
        '</div></div>' +
        '<div class="panel" style="margin-top:18px"><h3 class="sub-h">Drops (in delivery order)</h3>' +
          '<table class="data-table"><thead><tr><th>#</th><th>Pick note</th><th>Collection</th><th>Delivery</th><th style="text-align:right">Nett</th></tr></thead><tbody>' +
          (rows || '<tr><td colspan="5" class="muted">No drops.</td></tr>') + '</tbody><tfoot>' +
          '<tr><td colspan="4" style="text-align:right">Nett</td><td style="text-align:right">' + gbp(nett) + '</td></tr>' +
          '<tr><td colspan="4" style="text-align:right">VAT (' + vatRate + '%)</td><td style="text-align:right">' + gbp(vat) + '</td></tr>' +
          '<tr><td colspan="4" style="text-align:right;font-weight:700">Gross</td><td style="text-align:right;font-weight:700">' + gbp(nett + vat) + '</td></tr>' +
          '</tfoot></table></div>';

      document.getElementById('h-print').onclick = function () { printHaulage(h, drops, nett, vat); };
      document.getElementById('h-edit').onclick = function () { renderHaulageForm(d); };
      var st = document.getElementById('h-status');
      if (st) st.onclick = function () {
        Auth.api('/api/haulage/' + id, { method: 'PATCH', body: { status: st.dataset.next } })
          .then(function () { renderHaulageDetail(id); }).catch(showError);
      };
      var cancel = document.getElementById('h-cancel');
      if (cancel) cancel.onclick = function () {
        if (!confirm('Cancel this haulage order?')) return;
        Auth.api('/api/haulage/' + id, { method: 'PATCH', body: { status: 'cancelled' } })
          .then(function () { renderHaulageDetail(id); }).catch(showError);
      };
      document.getElementById('h-del').onclick = function () {
        if (!confirm('Delete this haulage order? This cannot be undone.')) return;
        Auth.api('/api/haulage/' + id, { method: 'DELETE' })
          .then(function () { location.hash = '#haulage'; }).catch(showError);
      };
    }).catch(showError);
  }

  // ---- Haulage create / edit form -----------------------------------
  function renderHaulageForm(existing) {
    var h = existing ? existing.haulage : null;
    titleEl.textContent = existing ? 'Edit haulage ' + (h.number || '') : 'New haulage order';
    var haulOpts = '<option value="">— select haulier —</option>' + haulierCache.map(function (x) {
      return '<option value="' + x.id + '"' + (h && String(h.haulier_id) === String(x.id) ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('');

    view.innerHTML =
      '<div class="panel"><div class="fields form-grid">' +
        field('Haulier *', '<select id="h-haulier">' + haulOpts + '</select>') +
        field('Collection date *', '<input id="h-cdate" type="date" value="' + (h && h.collection_date ? esc(h.collection_date) : '') + '">') +
        field('Delivery date *', '<input id="h-ddate" type="date" value="' + (h && h.delivery_date ? esc(h.delivery_date) : '') + '">') +
        field('VAT rate %', '<input id="h-vat" type="number" step="any" value="' + (h && h.vat_rate != null ? Number(h.vat_rate) : 20) + '">') +
      '</div>' +
      '<div class="field"><label>Instructions (shown at top of paperwork)</label><textarea id="h-instructions" rows="2">' + (h ? esc(h.instructions || '') : '') + '</textarea></div>' +
      '<div class="field"><label>Notes (internal)</label><textarea id="h-notes" rows="2">' + (h ? esc(h.notes || '') : '') + '</textarea></div>' +
      '<h3 class="sub-h">Drops (in delivery order)</h3>' +
      '<p class="muted" style="font-size:.85rem">Each drop is a picking note. Collection &amp; delivery addresses come from the note\'s location and order. Use ↑/↓ to set the drop order.</p>' +
      '<table class="data-table" id="h-drops"><thead><tr><th style="width:30px">#</th><th>Picking note</th><th>Nett cost £</th><th>Note</th><th style="width:150px"></th></tr></thead><tbody></tbody></table>' +
      '<button class="btn btn-ghost-dark btn-sm" id="h-adddrop" style="margin-top:10px">+ Add drop</button>' +
      '<div class="order-totals" id="h-totals"></div>' +
      '<p class="form-note" id="h-note"></p>' +
      '<div class="modal-foot"><a class="btn btn-ghost-dark btn-sm" href="#haulage">Cancel</a>' +
      '<button class="btn btn-primary btn-sm" id="h-save">' + (existing ? 'Save changes' : 'Create haulage order') + '</button></div></div>';

    document.getElementById('h-vat').oninput = recalcHaulage;
    document.getElementById('h-adddrop').onclick = function () { addDropRow(); };
    document.getElementById('h-save').onclick = function () { saveHaulage(existing); };

    Auth.api('/api/picking').then(function (d) {
      haulagePicks = (d.rows || []).filter(function (p) { return p.status !== 'cancelled'; });
    }).catch(function () { haulagePicks = []; }).then(function () {
      if (existing && existing.drops && existing.drops.length) existing.drops.forEach(function (x) { addDropRow(x); });
      else addDropRow();
    });
  }

  function pickOptions(selId) {
    return '<option value="">— select picking note —</option>' + haulagePicks.map(function (p) {
      var lbl = p.number + ' · ' + (p.order_number || '') + ' · ' + (p.customer_name || '') + (p.location_name ? ' (' + p.location_name + ')' : '');
      return '<option value="' + p.id + '"' + (String(p.id) === String(selId) ? ' selected' : '') + '>' + esc(lbl) + '</option>';
    }).join('');
  }

  function addDropRow(preset) {
    // Make sure a preset's pick note stays selectable even if it's not in the list.
    if (preset && preset.picking_note_id && !haulagePicks.some(function (p) { return String(p.id) === String(preset.picking_note_id); })) {
      haulagePicks.push({ id: preset.picking_note_id, number: preset.picking_number, order_number: preset.order_number,
        customer_name: preset.customer_name, location_name: preset.collection_name });
    }
    var tb = document.querySelector('#h-drops tbody');
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="dr-no"></td>' +
      '<td><select class="dr-pick">' + pickOptions(preset && preset.picking_note_id) + '</select></td>' +
      '<td><input class="dr-cost" type="number" step="any" min="0" style="width:110px" value="' + (preset && preset.nett_cost != null ? Number(preset.nett_cost) : '') + '"></td>' +
      '<td><input class="dr-note" value="' + (preset ? esc(preset.notes || '') : '') + '"></td>' +
      '<td><button class="link-btn dr-up">↑</button> <button class="link-btn dr-down">↓</button> <button class="link-btn danger dr-del">remove</button></td>';
    tb.appendChild(tr);
    tr.querySelector('.dr-cost').oninput = recalcHaulage;
    tr.querySelector('.dr-del').onclick = function () { tr.remove(); renumberDrops(); recalcHaulage(); };
    tr.querySelector('.dr-up').onclick = function () { if (tr.previousElementSibling) tr.parentNode.insertBefore(tr, tr.previousElementSibling); renumberDrops(); };
    tr.querySelector('.dr-down').onclick = function () { if (tr.nextElementSibling) tr.parentNode.insertBefore(tr.nextElementSibling, tr); renumberDrops(); };
    renumberDrops(); recalcHaulage();
  }

  function renumberDrops() {
    var i = 0;
    document.querySelectorAll('#h-drops tbody tr').forEach(function (tr) { i++; tr.querySelector('.dr-no').textContent = i; });
  }

  function gatherDrops() {
    return Array.prototype.map.call(document.querySelectorAll('#h-drops tbody tr'), function (tr) {
      return {
        picking_note_id: tr.querySelector('.dr-pick').value,
        nett_cost: Number(tr.querySelector('.dr-cost').value) || 0,
        notes: tr.querySelector('.dr-note').value
      };
    });
  }

  function recalcHaulage() {
    var nett = gatherDrops().reduce(function (a, d) { return a + d.nett_cost; }, 0);
    var vat = nett * (Number(document.getElementById('h-vat').value) || 0) / 100;
    document.getElementById('h-totals').innerHTML =
      '<div class="ot-row"><span>Nett</span><strong>' + gbp(nett) + '</strong></div>' +
      '<div class="ot-row"><span>VAT</span><strong>' + gbp(vat) + '</strong></div>' +
      '<div class="ot-row ot-grand"><span>Gross</span><strong>' + gbp(nett + vat) + '</strong></div>';
  }

  function saveHaulage(existing) {
    var note = document.getElementById('h-note');
    var haulier = document.getElementById('h-haulier').value;
    var drops = gatherDrops().filter(function (d) { return d.picking_note_id; });
    if (!haulier) { note.textContent = 'Choose a haulier.'; note.className = 'form-note err'; return; }
    if (!drops.length) { note.textContent = 'Add at least one drop with a picking note.'; note.className = 'form-note err'; return; }
    var cdate = document.getElementById('h-cdate').value, ddate = document.getElementById('h-ddate').value;
    if (!cdate) { note.textContent = 'Collection date is required.'; note.className = 'form-note err'; return; }
    if (!ddate) { note.textContent = 'Delivery date is required.'; note.className = 'form-note err'; return; }
    var body = {
      haulier_id: haulier,
      collection_date: cdate,
      delivery_date: ddate,
      vat_rate: document.getElementById('h-vat').value,
      instructions: document.getElementById('h-instructions').value,
      notes: document.getElementById('h-notes').value,
      drops: drops
    };
    note.textContent = 'Saving…'; note.className = 'form-note';
    var req = existing ? Auth.api('/api/haulage/' + existing.haulage.id, { method: 'PATCH', body: body })
                       : Auth.api('/api/haulage', { method: 'POST', body: body });
    req.then(function (r) {
      var id = existing ? existing.haulage.id : r.id;
      if (existing) renderHaulageDetail(id);   // hash unchanged, so route() won't fire
      else location.hash = '#haulage/' + id;
    }).catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
  }

  function printHaulage(h, drops, nett, vat) {
    var vatRate = Number(h.vat_rate) || 0;
    var dropHtml = drops.map(function (x) {
      var coll = [x.collection_name, x.collection_address, x.collection_city, x.collection_postcode].filter(Boolean).map(esc).join(', ');
      var del = [x.delivery_name, x.delivery_address, x.delivery_city, x.delivery_postcode].filter(Boolean).map(esc).join(', ');
      var items = (x.lines || []).map(function (l) {
        return '<tr><td>' + esc(l.code || '') + '</td><td>' + esc(l.description || '') + '</td><td style="text-align:right">' + num(l.qty_to_pick) + '</td></tr>';
      }).join('') || '<tr><td colspan="3" class="muted">—</td></tr>';
      return '<div class="drop"><h3>Drop ' + x.drop_no + ' — ' + esc(x.customer_name || '') + '</h3>' +
        '<div class="ad"><div><strong>Collect from</strong><br>' + (coll || '—') + '</div>' +
        '<div><strong>Deliver to</strong><br>' + (del || '—') + '</div>' +
        '<div><strong>Pick / Order</strong><br>' + esc(x.picking_number || '—') + ' / ' + esc(x.order_number || '—') + '</div></div>' +
        '<table class="items"><thead><tr><th>Code</th><th>Description</th><th style="text-align:right">Qty</th></tr></thead><tbody>' + items + '</tbody></table>' +
        '<div class="cost">Drop cost (nett): <strong>' + gbp(x.nett_cost) + '</strong></div></div>';
    }).join('');

    var html = '<html><head><title>' + esc(h.number) + '</title><style>' +
      'body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{margin:0 0 4px}.muted{color:#666}' +
      '.head{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:10px}' +
      '.drop{margin-top:22px;padding-top:8px;border-top:1px solid #ccc}.drop h3{margin:0 0 8px}' +
      '.ad{display:flex;gap:24px;font-size:13px}.ad>div{flex:1}' +
      'table.items{width:100%;border-collapse:collapse;margin-top:10px}' +
      'table.items th,table.items td{border:1px solid #ccc;padding:6px;text-align:left;font-size:13px}table.items th{background:#f0f0f0}' +
      '.cost{margin-top:8px;text-align:right;font-size:14px}' +
      '.totals{margin-top:24px;margin-left:auto;width:280px;font-size:14px}.totals div{display:flex;justify-content:space-between;padding:4px 0}' +
      '.totals .grand{border-top:2px solid #111;font-weight:700;margin-top:4px;padding-top:8px}' +
      '.instr{margin-top:14px;padding:10px 12px;border:1px solid #111;background:#f7f7f7;white-space:pre-wrap;font-weight:600}</style></head><body>' +
      '<div class="head"><div><h1>Haulage Order</h1><div class="muted">' + esc(h.number) + '</div></div>' +
      '<div style="text-align:right">' + companyHead() + '<br><span class="muted">Haulier: ' + esc(h.haulier_name || '') + '</span>' +
      (h.collection_date ? '<br><span class="muted">Collection: ' + esc(h.collection_date) + '</span>' : '') +
      (h.delivery_date ? '<br><span class="muted">Delivery: ' + esc(h.delivery_date) + '</span>' : '') + '</div></div>' +
      (h.instructions ? '<div class="instr">' + esc(h.instructions) + '</div>' : '') +
      ((h.haulier_contact || h.haulier_email || h.haulier_phone) ? '<p class="muted">' + [h.haulier_contact, h.haulier_phone, h.haulier_email].filter(Boolean).map(esc).join(' · ') + '</p>' : '') +
      dropHtml +
      '<div class="totals"><div><span>Nett</span><span>' + gbp(nett) + '</span></div>' +
      '<div><span>VAT (' + vatRate + '%)</span><span>' + gbp(vat) + '</span></div>' +
      '<div class="grand"><span>Gross</span><span>' + gbp(nett + vat) + '</span></div></div>' +
      (h.notes ? '<p class="muted" style="margin-top:24px"><strong>Notes:</strong> ' + esc(h.notes) + '</p>' : '') +
      '</body></html>';
    var w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to print.'); return; }
    w.document.write(html); w.document.close(); w.focus(); w.print();
  }

  // ===================================================================
  //  Purchase orders (priced in €/m³ on purchase dimensions)
  // ===================================================================
  var eur = function (n) { return '€' + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var PO_STATUS = { open: ['Open', 'st-open'], part_loaded: ['Part loaded', 'st-amber'], loaded: ['Loaded', 'st-green'], cancelled: ['Cancelled', 'st-grey'] };
  function poPill(s) { var m = PO_STATUS[s] || [s, 'st-grey']; return '<span class="pill ' + m[1] + '">' + esc(m[0]) + '</span>'; }
  function purchaseDims(p) {
    if (!p) return '—';
    var d = [p.purchase_thickness_mm, p.purchase_width_mm, p.purchase_length_mm].filter(function (x) { return x != null && x !== ''; });
    return d.length ? d.join(' × ') : '—';
  }

  function renderPurchasing(sub) {
    if (sub) return renderPODetail(sub);
    actionsEl.innerHTML = '<button class="btn btn-primary btn-sm" id="new-po">+ New purchase order</button>';
    view.innerHTML =
      '<div class="toolbar toolbar-row"><input type="search" id="po-search" class="search-input" placeholder="Search PO no, supplier…">' +
      sortSelect('po-sort', [['newest', 'Newest first'], ['expected', 'Expected date']], 'newest') + '</div>' +
      '<div class="toolbar">' + statusFilterChips('po-status', PO_STATUS) + '</div>' +
      '<div id="po-wrap"><p class="muted">Loading…</p></div>';
    document.getElementById('new-po').onclick = function () { location.hash = '#purchasing/new'; };
    var s = document.getElementById('po-search'), t;
    s.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { loadPurchasing(s.value); }, 200); });
    wireStatusChips('po-status', function () { loadPurchasing(s.value); });
    document.getElementById('po-sort').onchange = function () { loadPurchasing(s.value); };
    loadPurchasing('');
  }

  function loadPurchasing(q) {
    var wrap = document.getElementById('po-wrap');
    Auth.api('/api/purchasing' + (q ? '?q=' + encodeURIComponent(q) : '')).then(function (d) {
      var rows = d.rows || [];
      var sel = selectedStatuses('po-status');
      if (sel.length) rows = rows.filter(function (r) { return sel.indexOf(r.status) >= 0; });
      if (statusFilterVal('po-sort') === 'expected') rows = rows.slice().sort(cmpDateAsc('expected_date'));
      if (!rows.length) { wrap.innerHTML = '<p class="muted">No matching purchase orders.</p>'; return; }
      var body = rows.map(function (r) {
        return '<tr data-go="#purchasing/' + r.id + '" class="row-link"><td>' + esc(r.number || '—') + '</td>' +
          '<td>' + esc(r.supplier_name || '—') + '</td>' +
          '<td>' + poPill(r.status) + '</td>' +
          '<td>' + fmtDate(r.expected_date) + '</td>' +
          '<td>' + (r.currency === 'GBP' ? gbp(r.cost) : eur(r.cost)) + '</td></tr>';
      }).join('');
      wrap.innerHTML = '<table class="data-table"><thead><tr><th>PO</th><th>Supplier</th><th>Status</th><th>Expected</th><th>Value</th></tr></thead><tbody>' + body + '</tbody></table>';
      wrap.querySelectorAll('[data-go]').forEach(function (tr) { tr.onclick = function () { location.hash = tr.dataset.go; }; });
    }).catch(showError);
  }

  function renderPODetail(id) {
    if (id === 'new') return renderPOCreate();
    view.innerHTML = '<p class="muted">Loading purchase order…</p>';
    Auth.api('/api/purchasing/' + id).then(function (d) {
      var o = d.order, lines = d.lines || [];
      titleEl.textContent = 'Purchase order ' + (o.number || '');
      var total = 0;
      var cur = o.currency || 'EUR';
      var cm = function (n) { return cur === 'GBP' ? gbp(n) : eur(n); };
      var rows = lines.map(function (l) {
        var pvol = l.purchase_pack_volume != null ? Number(l.purchase_pack_volume) : 0;
        var lineVol = Number(l.quantity) * pvol;
        var lineVal = lineVol * Number(l.cost_per_m3 || 0);
        total += lineVal;
        var out = Number(l.quantity) - Number(l.qty_loaded);
        return '<tr><td>' + esc(l.code || '—') + '</td><td>' + esc(l.batch_no || '—') + '</td>' +
          '<td>' + purchaseDims(l) + '</td>' +
          '<td>' + num(l.quantity) + '</td><td>' + lineVol.toFixed(3) + '</td>' +
          '<td>' + cm(l.cost_per_m3) + '</td><td>' + cm(lineVal) + '</td>' +
          '<td>' + num(l.qty_loaded) + '</td><td>' + (out > 0 ? out : 0) + '</td></tr>';
      }).join('');

      actionsEl.innerHTML =
        '<button class="btn btn-ghost-dark btn-sm" id="po-print">Print / PDF</button> ' +
        (o.status !== 'cancelled' ? '<button class="btn btn-ghost-dark btn-sm" id="po-cancel">Cancel</button> ' : '') +
        ((o.status === 'open' || o.status === 'cancelled') ? '<button class="btn btn-ghost-dark btn-sm danger" id="po-del">Delete</button> ' : '') +
        '<a class="btn btn-ghost-dark btn-sm" href="#purchasing">Back</a>';

      view.innerHTML =
        '<div class="detail-grid"><div class="panel"><h3 class="sub-h">Purchase order</h3>' +
          kv('Status', poPill(o.status)) + kv('Supplier', esc(o.supplier_name || '—')) +
          kv('Supplier ref', esc(o.supplier_ref || '—')) + kv('Order date', esc(o.order_date || '—')) +
          kv('Expected', esc(o.expected_date || '—')) +
        '</div><div class="panel"><h3 class="sub-h">Supplier</h3>' +
          ([o.supplier_contact, o.supplier_email, o.supplier_address, o.supplier_city, o.supplier_postcode].filter(Boolean).map(esc).join('<br>') || '<span class="muted">—</span>') +
          (o.notes ? '<h3 class="sub-h" style="margin-top:18px">Notes</h3>' + esc(o.notes) : '') +
        '</div></div>' +
        '<div class="panel" style="margin-top:18px"><h3 class="sub-h">Lines (purchase sizes)</h3>' +
          '<table class="data-table"><thead><tr><th>Code</th><th>Batch</th><th>Purchase size mm</th><th>Qty packs</th><th>Volume m³</th><th>Cost/m³</th><th>Value</th><th>Loaded</th><th>Outstanding</th></tr></thead><tbody>' +
          rows + '</tbody><tfoot><tr><td colspan="6" style="text-align:right;font-weight:700">Total (' + cur + ')</td><td style="font-weight:700">' + cm(total) + '</td><td colspan="2"></td></tr></tfoot></table>' +
          (d.loadings && d.loadings.length ? '<div class="doc-links" style="margin-top:14px"><strong>Loading lists:</strong> ' + d.loadings.map(function (x) { return '<a href="#loading/' + x.id + '">' + esc(x.number) + '</a>'; }).join(' · ') + '</div>' : '') +
        '</div>';

      document.getElementById('po-print').onclick = function () { printPO(o, lines); };
      var c = document.getElementById('po-cancel');
      if (c) c.onclick = function () { if (confirm('Cancel this purchase order?')) Auth.api('/api/purchasing/' + id, { method: 'PATCH', body: { status: 'cancelled' } }).then(function () { renderPODetail(id); }).catch(showError); };
      var dl = document.getElementById('po-del');
      if (dl) dl.onclick = function () { if (confirm('Delete this purchase order?')) Auth.api('/api/purchasing/' + id, { method: 'DELETE' }).then(function () { location.hash = '#purchasing'; }).catch(showError); };
    }).catch(showError);
  }

  function renderPOCreate() {
    titleEl.textContent = 'New purchase order';
    var supOpts = '<option value="">— select supplier —</option>' + supplierCache.map(function (s) {
      return '<option value="' + s.id + '">' + esc(s.name) + '</option>'; }).join('');
    view.innerHTML =
      '<div class="panel"><div class="fields form-grid">' +
        field('Supplier *', '<select id="po-sup">' + supOpts + '</select>') +
        field('Supplier ref', '<input id="po-ref">') +
        field('Order date', '<input id="po-date" type="date">') +
        field('Expected date', '<input id="po-exp" type="date">') +
      '</div>' +
      '<div class="field"><label>Notes</label><textarea id="po-notes" rows="2"></textarea></div>' +
      '<h3 class="sub-h">Lines (purchase sizes &amp; cost/m³ in supplier currency)</h3>' +
      '<table class="data-table" id="po-lines"><thead><tr><th style="width:30%">Batch</th><th>Purchase size</th><th>Qty packs</th><th>Cost/m³</th><th>Volume m³</th><th>Value</th><th></th></tr></thead><tbody></tbody></table>' +
      '<button class="btn btn-ghost-dark btn-sm" id="po-addline" style="margin-top:10px">+ Add line</button>' +
      '<div class="order-totals" id="po-totals"></div>' +
      '<p class="form-note" id="po-note"></p>' +
      '<div class="modal-foot"><a class="btn btn-ghost-dark btn-sm" href="#purchasing">Cancel</a>' +
      '<button class="btn btn-primary btn-sm" id="po-save">Create purchase order</button></div></div>';
    document.getElementById('po-addline').onclick = function () { addPOLine(); };
    document.getElementById('po-save').onclick = savePO;
    addPOLine();
  }

  function addPOLine() {
    var tb = document.querySelector('#po-lines tbody');
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td style="position:relative"><input class="pol-search" placeholder="type code / batch…" autocomplete="off" style="width:100%">' +
        '<input type="hidden" class="pol-batch"><div class="ln-results pol-results"></div></td>' +
      '<td class="pol-dims muted">—</td>' +
      '<td><input class="pol-qty" type="number" step="any" min="0" style="width:80px"></td>' +
      '<td><input class="pol-rate" type="number" step="any" min="0" style="width:90px"></td>' +
      '<td class="pol-vol">0.000</td>' +
      '<td class="pol-val">—</td>' +
      '<td><button class="link-btn danger pol-del">remove</button></td>';
    tb.appendChild(tr);
    var search = tr.querySelector('.pol-search'), results = tr.querySelector('.pol-results'), hidden = tr.querySelector('.pol-batch');
    var rate = tr.querySelector('.pol-rate'), t;
    search.addEventListener('input', function () {
      hidden.value = ''; clearTimeout(t);
      var v = search.value.trim();
      if (!v) { results.innerHTML = ''; recalcPO(); return; }
      t = setTimeout(function () {
        Auth.api('/api/batches?q=' + encodeURIComponent(v)).then(function (d) {
          var rows = d.rows || [];
          results.innerHTML = rows.length ? rows.map(function (b) {
            orderBatchById[b.id] = b;
            return '<div class="ln-result" data-id="' + b.id + '">' + esc(b.code) +
              (b.batch_no && b.batch_no !== b.code ? ' · ' + esc(b.batch_no) : '') + '</div>';
          }).join('') : '<div class="ln-result muted">No matches</div>';
          positionResults(search, results);
          results.querySelectorAll('.ln-result[data-id]').forEach(function (el) {
            el.onmousedown = function (e) {
              e.preventDefault();
              var b = orderBatchById[el.dataset.id];
              hidden.value = b.id;
              search.value = b.code + (b.batch_no && b.batch_no !== b.code ? ' · ' + b.batch_no : '');
              tr.querySelector('.pol-dims').textContent = purchaseDims(b);
              if (b.cost_per_m3 != null && !rate.value) rate.value = Number(b.cost_per_m3);
              results.innerHTML = ''; recalcPO();
            };
          });
        }).catch(function () {});
      }, 200);
    });
    search.addEventListener('blur', function () { setTimeout(function () { results.innerHTML = ''; }, 200); });
    tr.querySelector('.pol-qty').oninput = recalcPO;
    rate.oninput = recalcPO;
    tr.querySelector('.pol-del').onclick = function () { tr.remove(); recalcPO(); };
    recalcPO();
  }

  function gatherPOLines() {
    return Array.prototype.map.call(document.querySelectorAll('#po-lines tbody tr'), function (tr) {
      var bid = tr.querySelector('.pol-batch').value;
      var b = orderBatchById[bid];
      var pvol = b && b.purchase_pack_volume != null ? Number(b.purchase_pack_volume) : 0;
      var qty = Number(tr.querySelector('.pol-qty').value) || 0;
      var rate = Number(tr.querySelector('.pol-rate').value) || 0;
      return { batch_id: bid, code: b ? b.code : null, currency: b ? b.currency : 'EUR',
        quantity: qty, cost_per_m3: rate, volume: qty * pvol, _tr: tr };
    });
  }

  function recalcPO() {
    var total = 0, cur = 'EUR';
    gatherPOLines().forEach(function (l) {
      var val = l.volume * l.cost_per_m3;
      total += val; if (l.currency) cur = l.currency;
      l._tr.querySelector('.pol-vol').textContent = l.volume.toFixed(3);
      l._tr.querySelector('.pol-val').textContent = (l.currency === 'GBP' ? gbp(val) : eur(val));
    });
    document.getElementById('po-totals').innerHTML =
      '<div class="ot-row ot-grand"><span>Total (' + cur + ')</span><strong>' + (cur === 'GBP' ? gbp(total) : eur(total)) + '</strong></div>';
  }

  function savePO() {
    var note = document.getElementById('po-note');
    var lines = gatherPOLines().filter(function (l) { return l.batch_id && l.quantity > 0; })
      .map(function (l) { return { batch_id: l.batch_id, code: l.code, quantity: l.quantity, cost_per_m3: l.cost_per_m3 }; });
    var sup = document.getElementById('po-sup').value;
    if (!sup) { note.textContent = 'Choose a supplier.'; note.className = 'form-note err'; return; }
    if (!lines.length) { note.textContent = 'Add at least one line with a batch and quantity.'; note.className = 'form-note err'; return; }
    note.textContent = 'Saving…'; note.className = 'form-note';
    Auth.api('/api/purchasing', { method: 'POST', body: {
      supplier_id: sup, supplier_ref: document.getElementById('po-ref').value,
      order_date: document.getElementById('po-date').value, expected_date: document.getElementById('po-exp').value,
      notes: document.getElementById('po-notes').value, lines: lines
    } }).then(function (r) { location.hash = '#purchasing/' + r.id; })
      .catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
  }

  function printPO(o, lines) {
    var total = 0;
    var cur = o.currency || 'EUR';
    var cm = function (n) { return cur === 'GBP' ? gbp(n) : eur(n); };
    var rows = lines.map(function (l) {
      var pvol = l.purchase_pack_volume != null ? Number(l.purchase_pack_volume) : 0;
      var lineVol = Number(l.quantity) * pvol;
      var lineVal = lineVol * Number(l.cost_per_m3 || 0);
      total += lineVal;
      return '<tr><td>' + esc(l.code || '') + '</td><td>' + esc(l.batch_no || '') + '</td>' +
        '<td>' + purchaseDims(l) + '</td><td style="text-align:right">' + num(l.quantity) + '</td>' +
        '<td style="text-align:right">' + lineVol.toFixed(3) + '</td>' +
        '<td style="text-align:right">' + cm(l.cost_per_m3) + '</td><td style="text-align:right">' + cm(lineVal) + '</td></tr>';
    }).join('');
    var html = '<html><head><title>' + esc(o.number) + '</title><style>' +
      'body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{margin:0 0 4px}.muted{color:#666}' +
      '.head{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:10px}' +
      'table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #ccc;padding:8px;font-size:13px}th{background:#f0f0f0;text-align:left}' +
      '.totals{margin-top:16px;text-align:right;font-size:15px;font-weight:700}</style></head><body>' +
      '<div class="head"><div><h1>Purchase Order</h1><div class="muted">' + esc(o.number) + '</div>' +
      (o.supplier_ref ? '<div class="muted">Ref: ' + esc(o.supplier_ref) + '</div>' : '') + '</div>' +
      '<div style="text-align:right">' + companyHead() + '<br><span class="muted">Supplier: ' + esc(o.supplier_name || '') + '</span>' +
      (o.expected_date ? '<br><span class="muted">Expected: ' + esc(o.expected_date) + '</span>' : '') + '</div></div>' +
      '<table><thead><tr><th>Code</th><th>Batch</th><th>Size (mm)</th><th style="text-align:right">Qty packs</th><th style="text-align:right">Volume m³</th><th style="text-align:right">Cost/m³</th><th style="text-align:right">Value</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="totals">Total (' + cur + '): ' + cm(total) + '</div>' +
      (o.notes ? '<p class="muted" style="margin-top:24px">' + esc(o.notes) + '</p>' : '') +
      '</body></html>';
    var w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to print.'); return; }
    w.document.write(html); w.document.close(); w.focus(); w.print();
  }

  // ===================================================================
  //  Loading lists (vessel voyages)
  // ===================================================================
  var LOADING_STATUS = { open: ['Open', 'st-open'], loaded: ['Loaded', 'st-blue'], arrived: ['Arrived', 'st-green'], cancelled: ['Cancelled', 'st-grey'] };
  function loadPill(s) { var m = LOADING_STATUS[s] || [s, 'st-grey']; return '<span class="pill ' + m[1] + '">' + esc(m[0]) + '</span>'; }
  var loadingPOs = [];   // PO lines available to load

  function renderLoading(sub) {
    if (sub) return renderLoadingDetail(sub);
    actionsEl.innerHTML = '<button class="btn btn-primary btn-sm" id="new-ll">+ New loading list</button>';
    view.innerHTML =
      '<div class="toolbar toolbar-row"><input type="search" id="ll-search" class="search-input" placeholder="Search LL no, vessel, voyage…">' +
      sortSelect('ll-sort', [['newest', 'Newest first'], ['eta', 'ETA date']], 'newest') + '</div>' +
      '<div class="toolbar">' + statusFilterChips('ll-status', LOADING_STATUS) + '</div>' +
      '<div id="ll-wrap"><p class="muted">Loading…</p></div>';
    document.getElementById('new-ll').onclick = function () { location.hash = '#loading/new'; };
    var s = document.getElementById('ll-search'), t;
    s.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { loadLoading(s.value); }, 200); });
    wireStatusChips('ll-status', function () { loadLoading(s.value); });
    document.getElementById('ll-sort').onchange = function () { loadLoading(s.value); };
    loadLoading('');
  }

  function loadLoading(q) {
    var wrap = document.getElementById('ll-wrap');
    Auth.api('/api/loading' + (q ? '?q=' + encodeURIComponent(q) : '')).then(function (d) {
      var rows = d.rows || [];
      var sel = selectedStatuses('ll-status');
      if (sel.length) rows = rows.filter(function (r) { return sel.indexOf(r.status) >= 0; });
      if (statusFilterVal('ll-sort') === 'eta') rows = rows.slice().sort(cmpDateAsc('eta_date'));
      if (!rows.length) { wrap.innerHTML = '<p class="muted">No matching loading lists.</p>'; return; }
      var body = rows.map(function (r) {
        return '<tr data-go="#loading/' + r.id + '" class="row-link"><td>' + esc(r.number || '—') + '</td>' +
          '<td>' + esc(r.vessel_name || '—') + '</td><td>' + esc(r.voyage_ref || '—') + '</td>' +
          '<td>' + num(r.line_count) + '</td>' +
          '<td>' + fmtDate(r.eta_date) + '</td>' +
          '<td>' + loadPill(r.status) + '</td></tr>';
      }).join('');
      wrap.innerHTML = '<table class="data-table"><thead><tr><th>Loading list</th><th>Vessel</th><th>Voyage</th><th>Lines</th><th>ETA</th><th>Status</th></tr></thead><tbody>' + body + '</tbody></table>';
      wrap.querySelectorAll('[data-go]').forEach(function (tr) { tr.onclick = function () { location.hash = tr.dataset.go; }; });
    }).catch(showError);
  }

  function renderLoadingDetail(id) {
    if (id === 'new') return renderLoadingCreate();
    view.innerHTML = '<p class="muted">Loading…</p>';
    Auth.api('/api/loading/' + id).then(function (d) {
      var ll = d.loading, lines = d.lines || [];
      titleEl.textContent = 'Loading list ' + (ll.number || '');

      actionsEl.innerHTML =
        '<button class="btn btn-ghost-dark btn-sm" id="ll-print">Print</button> ' +
        (ll.status === 'open' ? '<button class="btn btn-primary btn-sm" id="ll-load">Confirm loaded</button> ' : '') +
        (ll.status === 'loaded' ? '<button class="btn btn-primary btn-sm" id="ll-arrive">Receive at port</button> ' : '') +
        (ll.status === 'open' ? '<button class="btn btn-ghost-dark btn-sm danger" id="ll-del">Delete</button> ' : '') +
        '<a class="btn btn-ghost-dark btn-sm" href="#loading">Back</a>';

      var rows = lines.map(function (l) {
        return '<tr><td>' + esc(l.code || '—') + '</td><td>' + esc(l.batch_no || '—') + '</td>' +
          '<td>' + esc(l.po_number || '—') + '</td>' +
          '<td>' + num(l.quantity) + '</td><td>' + (l.cost_per_m3 != null ? Number(l.cost_per_m3).toFixed(2) : '—') + '</td></tr>';
      }).join('');

      view.innerHTML =
        '<div class="detail-grid"><div class="panel"><h3 class="sub-h">Voyage</h3>' +
          kv('Status', loadPill(ll.status)) + kv('Vessel', esc(ll.vessel_name || '—')) +
          kv('Voyage ref', esc(ll.voyage_ref || '—')) + kv('Loaded', esc(ll.load_date || '—')) +
          kv('ETA', esc(ll.eta_date || '—')) + kv('Transit bin', esc(ll.location_name || '—')) +
        '</div><div class="panel"><h3 class="sub-h">Costing</h3>' +
          kv('Exchange € per £', ll.exchange_rate != null ? Number(ll.exchange_rate).toFixed(4) : '—') +
          kv('Freight £/m³', ll.freight_rate != null ? gbp(ll.freight_rate) : '—') +
          (ll.notes ? '<h3 class="sub-h" style="margin-top:18px">Notes</h3>' + esc(ll.notes) : '') +
        '</div></div>' +
        '<div class="panel" style="margin-top:18px"><h3 class="sub-h">Loaded from purchase orders</h3>' +
          '<table class="data-table"><thead><tr><th>Code</th><th>Batch</th><th>PO</th><th>Qty packs</th><th>Cost/m³</th></tr></thead><tbody>' +
          (rows || '<tr><td colspan="5" class="muted">No lines.</td></tr>') + '</tbody></table></div>';

      document.getElementById('ll-print').onclick = function () { printLoading(ll, lines); };
      var lo = document.getElementById('ll-load'); if (lo) lo.onclick = function () { openLoadConfirm(ll); };
      var ar = document.getElementById('ll-arrive'); if (ar) ar.onclick = function () { openArrive(ll, lines); };
      var dl = document.getElementById('ll-del'); if (dl) dl.onclick = function () {
        if (confirm('Delete this loading list?')) Auth.api('/api/loading/' + id, { method: 'DELETE' }).then(function () { location.hash = '#loading'; }).catch(showError);
      };
    }).catch(showError);
  }

  function openLoadConfirm(ll) {
    document.getElementById('modal-title').textContent = 'Confirm loaded — ' + esc(ll.number);
    modalForm.innerHTML =
      '<p class="muted">Loading creates the transit stock bin for this voyage and draws the quantities from the purchase order(s).</p>' +
      '<div class="fields form-grid">' +
      '<div class="field"><label>Load date</label><input id="lc-date" type="date" value="' + esc(ll.load_date || '') + '"></div>' +
      '<div class="field"><label>Exchange rate € per £ *</label><input id="lc-rate" type="number" step="any" min="0" placeholder="e.g. 1.15"></div>' +
      '</div><p class="form-note" id="modal-note"></p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost-dark btn-sm" data-cancel>Cancel</button>' +
      '<button type="submit" class="btn btn-primary btn-sm">Confirm loaded</button></div>';
    modalForm.querySelector('[data-cancel]').onclick = closeModal;
    modalForm.onsubmit = function (e) {
      e.preventDefault();
      var note = document.getElementById('modal-note');
      var rate = document.getElementById('lc-rate').value;
      if (!rate || Number(rate) <= 0) { note.textContent = 'Enter the €→£ exchange rate.'; note.className = 'form-note err'; return; }
      note.textContent = 'Loading…'; note.className = 'form-note';
      Auth.api('/api/loading/' + ll.id, { method: 'PATCH', body: { action: 'load', exchange_rate: rate, load_date: document.getElementById('lc-date').value } })
        .then(function () { closeModal(); renderLoadingDetail(ll.id); })
        .catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    };
    modal.hidden = false;
  }

  function openArrive(ll, lines) {
    var locOpts = locationCache.filter(function (l) { return !l.is_transit; }).map(function (l) {
      return '<option value="' + l.id + '">' + esc(l.name) + '</option>'; }).join('');
    var rowInputs = lines.map(function (l) {
      return '<tr><td>' + esc(l.code || '—') + '</td><td>' + num(l.quantity) + '</td>' +
        '<td><input type="number" step="any" min="0" class="ar-qty" data-id="' + l.id + '" value="' + num(l.quantity) + '" style="width:90px"></td></tr>';
    }).join('');
    document.getElementById('modal-title').textContent = 'Receive at port — ' + esc(ll.number);
    modalForm.innerHTML =
      '<div class="fields form-grid">' +
      '<div class="field"><label>Destination port *</label><select id="ar-loc"><option value="">— select —</option>' + locOpts + '</select></div>' +
      '<div class="field"><label>Exchange rate € per £</label><input id="ar-rate" type="number" step="any" min="0" placeholder="e.g. 1.15" value="' + (ll.exchange_rate != null ? Number(ll.exchange_rate) : '') + '"></div>' +
      '<div class="field"><label>Freight rate £/m³</label><input id="ar-freight" type="number" step="any" min="0" placeholder="0"></div>' +
      '</div>' +
      '<h3 class="sub-h">Received quantities</h3>' +
      '<table class="data-table"><thead><tr><th>Code</th><th>On vessel</th><th>Received</th></tr></thead><tbody>' + rowInputs + '</tbody></table>' +
      '<p class="muted" style="font-size:.85rem">Landed £/m³ = (€/m³ ÷ exchange + freight) × (purchase ÷ selling area). Each batch keeps its own exchange/freight. Stock moves to the port bin at this cost.</p>' +
      '<p class="form-note" id="modal-note"></p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost-dark btn-sm" data-cancel>Cancel</button>' +
      '<button type="submit" class="btn btn-primary btn-sm">Receive stock</button></div>';
    modalForm.querySelector('[data-cancel]').onclick = closeModal;
    modalForm.onsubmit = function (e) {
      e.preventDefault();
      var note = document.getElementById('modal-note');
      var loc = document.getElementById('ar-loc').value;
      if (!loc) { note.textContent = 'Choose the destination port.'; note.className = 'form-note err'; return; }
      var ll2 = Array.prototype.map.call(document.querySelectorAll('.ar-qty'), function (i) { return { id: Number(i.dataset.id), quantity: Number(i.value) || 0 }; });
      note.textContent = 'Receiving…'; note.className = 'form-note';
      Auth.api('/api/loading/' + ll.id, { method: 'PATCH', body: {
        action: 'arrive', location_id: loc,
        exchange_rate: document.getElementById('ar-rate').value, freight_rate: document.getElementById('ar-freight').value, lines: ll2
      } }).then(function () { closeModal(); refreshCacheFor('locations'); renderLoadingDetail(ll.id); })
        .catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    };
    modal.hidden = false;
  }

  function renderLoadingCreate() {
    titleEl.textContent = 'New loading list';
    view.innerHTML =
      '<div class="panel"><div class="fields form-grid">' +
        field('Vessel name', '<input id="ll-vessel">') +
        field('Voyage ref', '<input id="ll-voyage">') +
        field('Load date', '<input id="ll-ldate" type="date">') +
        field('ETA date', '<input id="ll-eta" type="date">') +
      '</div>' +
      '<div class="field"><label>Notes</label><textarea id="ll-notes" rows="2"></textarea></div>' +
      '<h3 class="sub-h">Add lines from a purchase order</h3>' +
      '<div class="fields"><div class="field"><label>Purchase order</label>' +
        '<select id="ll-po"><option value="">— select PO —</option></select>' +
        '<button class="btn btn-ghost-dark btn-sm" id="ll-addpo" type="button" style="margin-top:8px">Add outstanding lines</button></div></div>' +
      '<table class="data-table" id="ll-lines"><thead><tr><th>Product</th><th>PO</th><th>Outstanding</th><th>Qty to load</th><th></th></tr></thead><tbody></tbody></table>' +
      '<p class="form-note" id="ll-note"></p>' +
      '<div class="modal-foot"><a class="btn btn-ghost-dark btn-sm" href="#loading">Cancel</a>' +
      '<button class="btn btn-primary btn-sm" id="ll-save">Create loading list</button></div></div>';

    Auth.api('/api/purchasing').then(function (d) {
      loadingPOs = (d.rows || []).filter(function (p) { return p.status === 'open' || p.status === 'part_loaded'; });
      document.getElementById('ll-po').innerHTML = '<option value="">— select PO —</option>' +
        loadingPOs.map(function (p) { return '<option value="' + p.id + '">' + esc(p.number + ' · ' + (p.supplier_name || '')) + '</option>'; }).join('');
    }).catch(function () {});

    document.getElementById('ll-addpo').onclick = function () {
      var poId = document.getElementById('ll-po').value;
      if (!poId) return;
      Auth.api('/api/purchasing/' + poId).then(function (d) {
        (d.lines || []).forEach(function (l) {
          var out = Number(l.quantity) - Number(l.qty_loaded);
          if (out > 0) addLLLine(l, d.order.number, out);
        });
      }).catch(showError);
    };
    document.getElementById('ll-save').onclick = saveLoading;
  }

  function addLLLine(poLine, poNumber, outstanding) {
    var tb = document.querySelector('#ll-lines tbody');
    var tr = document.createElement('tr');
    tr.dataset.polId = poLine.id;
    tr.innerHTML =
      '<td>' + esc((poLine.code || '') + (poLine.description ? ' · ' + poLine.description : '')) + '</td>' +
      '<td>' + esc(poNumber || '') + '</td>' +
      '<td>' + num(outstanding) + '</td>' +
      '<td><input class="lll-qty" type="number" step="any" min="0" max="' + outstanding + '" style="width:90px" value="' + outstanding + '"></td>' +
      '<td><button class="link-btn danger lll-del">remove</button></td>';
    tb.appendChild(tr);
    tr.querySelector('.lll-del').onclick = function () { tr.remove(); };
  }

  function saveLoading() {
    var note = document.getElementById('ll-note');
    var lines = Array.prototype.map.call(document.querySelectorAll('#ll-lines tbody tr'), function (tr) {
      return { po_line_id: tr.dataset.polId, quantity: Number(tr.querySelector('.lll-qty').value) || 0 };
    }).filter(function (l) { return l.po_line_id && l.quantity > 0; });
    if (!lines.length) { note.textContent = 'Add at least one line from a purchase order.'; note.className = 'form-note err'; return; }
    note.textContent = 'Saving…'; note.className = 'form-note';
    Auth.api('/api/loading', { method: 'POST', body: {
      vessel_name: document.getElementById('ll-vessel').value, voyage_ref: document.getElementById('ll-voyage').value,
      load_date: document.getElementById('ll-ldate').value, eta_date: document.getElementById('ll-eta').value,
      notes: document.getElementById('ll-notes').value, lines: lines
    } }).then(function (r) { location.hash = '#loading/' + r.id; })
      .catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
  }

  function printLoading(ll, lines) {
    var rows = lines.map(function (l) {
      return '<tr><td>' + esc(l.code || '') + '</td><td>' + esc(l.description || '') + '</td><td>' + esc(l.po_number || '') + '</td><td style="text-align:right">' + num(l.quantity) + '</td></tr>';
    }).join('');
    var html = '<html><head><title>' + esc(ll.number) + '</title><style>' +
      'body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{margin:0 0 4px}.muted{color:#666}' +
      'table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #ccc;padding:8px;font-size:13px;text-align:left}th{background:#f0f0f0}' +
      '.head{display:flex;justify-content:space-between}</style></head><body>' +
      '<div class="head"><div><h1>Loading List</h1><div class="muted">' + esc(ll.number) + '</div></div>' +
      '<div style="text-align:right">' + companyHead() + '<br><span class="muted">Vessel: ' + esc(ll.vessel_name || '') +
      (ll.voyage_ref ? ' · ' + esc(ll.voyage_ref) : '') + '</span>' + (ll.eta_date ? '<br><span class="muted">ETA: ' + esc(ll.eta_date) + '</span>' : '') + '</div></div>' +
      '<table><thead><tr><th>Code</th><th>Description</th><th>PO</th><th style="text-align:right">Qty packs</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '</body></html>';
    var w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to print.'); return; }
    w.document.write(html); w.document.close(); w.focus(); w.print();
  }

  // ===================================================================
  //  Reports
  // ===================================================================
  var REPORT_TYPES = {
    writeoffs: { label: 'Write-offs by reason / period', params: [
      { name: 'from', label: 'From', type: 'date' }, { name: 'to', label: 'To', type: 'date' },
      { name: 'group_by', label: 'Group by', type: 'select', options: [['reason', 'Reason'], ['month', 'Month'], ['reason_month', 'Month & reason']] }
    ] },
    stock_valuation: { label: 'Stock valuation', params: [
      { name: 'location_id', label: 'Location', type: 'location' },
      { name: 'group_by', label: 'Group', type: 'select', options: [['detail', 'Detail (per batch)'], ['location', 'By location']] }
    ] },
    outstanding_orders: { label: 'Outstanding orders by customer', params: [
      { name: 'customer_id', label: 'Customer', type: 'customer' }
    ] }
  };

  function renderReports() {
    actionsEl.innerHTML = '';
    view.innerHTML = '<div id="rep-wrap"><p class="muted">Loading…</p></div>';
    Auth.api('/api/reports').then(function (d) {
      var saved = d.rows || [];
      var builtin = Object.keys(REPORT_TYPES).map(function (t) {
        return '<tr><td>' + esc(REPORT_TYPES[t].label) + '</td><td><span class="muted">Built-in</span></td>' +
          '<td class="col-actions"><button class="link-btn" data-run="' + t + '">Run</button></td></tr>';
      }).join('');
      var savedRows = saved.map(function (r) {
        return '<tr><td>' + esc(r.name) + '</td><td>' + esc((REPORT_TYPES[r.type] || {}).label || r.type) + '</td>' +
          '<td class="col-actions"><button class="link-btn" data-runsaved="' + r.id + '">Run</button> <button class="link-btn danger" data-delrep="' + r.id + '">Delete</button></td></tr>';
      }).join('');
      document.getElementById('rep-wrap').innerHTML =
        '<h2>Report manager</h2><table class="data-table"><thead><tr><th>Report</th><th>Type</th><th class="col-actions"></th></tr></thead><tbody>' +
        builtin + savedRows + '</tbody></table>' +
        '<p class="muted" style="margin-top:10px">Build configured reports under <a href="#report_creator">Report creator</a>.</p>';
      var wrap = document.getElementById('rep-wrap');
      wrap.querySelectorAll('[data-run]').forEach(function (b) { b.onclick = function () { renderReportRun(b.dataset.run, REPORT_TYPES[b.dataset.run].label, {}); }; });
      wrap.querySelectorAll('[data-runsaved]').forEach(function (b) { b.onclick = function () { var r = saved.find(function (x) { return String(x.id) === b.dataset.runsaved; }); renderReportRun(r.type, r.name, r.params || {}); }; });
      wrap.querySelectorAll('[data-delrep]').forEach(function (b) { b.onclick = function () { if (confirm('Delete this saved report?')) Auth.api('/api/reports/' + b.dataset.delrep, { method: 'DELETE' }).then(renderReports).catch(showError); }; });
    }).catch(showError);
  }

  function reportParamControls(type, preset) {
    var def = REPORT_TYPES[type]; if (!def) return '';
    return def.params.map(function (p) {
      var val = preset && preset[p.name] != null ? preset[p.name] : '';
      if (p.type === 'date') return field(p.label, '<input id="rp-' + p.name + '" type="date" value="' + esc(val) + '">');
      if (p.type === 'location') {
        var opts = '<option value="">All locations</option>' + locationCache.map(function (l) { return '<option value="' + l.id + '"' + (String(l.id) === String(val) ? ' selected' : '') + '>' + esc(l.name) + '</option>'; }).join('');
        return field(p.label, '<select id="rp-' + p.name + '">' + opts + '</select>');
      }
      if (p.type === 'customer') {
        var copts = '<option value="">— select customer —</option>' + customerCache.map(function (c) { return '<option value="' + c.id + '"' + (String(c.id) === String(val) ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('');
        return field(p.label, '<select id="rp-' + p.name + '">' + copts + '</select>');
      }
      if (p.type === 'select') {
        var o = p.options.map(function (x) { return '<option value="' + x[0] + '"' + (String(x[0]) === String(val) ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('');
        return field(p.label, '<select id="rp-' + p.name + '">' + o + '</select>');
      }
      return field(p.label, '<input id="rp-' + p.name + '" value="' + esc(val) + '">');
    }).join('');
  }
  function readReportParams(type) {
    var def = REPORT_TYPES[type], p = {};
    def.params.forEach(function (x) { var el = document.getElementById('rp-' + x.name); if (el) p[x.name] = el.value; });
    return p;
  }
  function fmtCell(v, fmt) {
    if (v == null || v === '') return '—';
    if (fmt === 'gbp') return gbp(v);
    if (fmt === 'm3') return Number(v).toFixed(3);
    if (fmt === 'date') return fmtDate(v);
    return esc(String(v));
  }

  function renderReportRun(type, title, preset) {
    titleEl.textContent = title || 'Report';
    actionsEl.innerHTML = '<a class="btn btn-ghost-dark btn-sm" href="#reports">Back</a>';
    view.innerHTML = '<div class="panel"><div class="fields form-grid">' + reportParamControls(type, preset) + '</div>' +
      '<div class="modal-foot" style="justify-content:flex-start"><button class="btn btn-primary btn-sm" id="rp-run">Run report</button> ' +
      '<button class="btn btn-ghost-dark btn-sm" id="rp-print">Print / PDF</button> <button class="btn btn-ghost-dark btn-sm" id="rp-csv">Export CSV</button></div>' +
      '<div id="rp-result" style="margin-top:14px"></div></div>';
    var lastResult = null;
    function run() {
      var p = readReportParams(type), qs = ['type=' + encodeURIComponent(type)];
      Object.keys(p).forEach(function (k) { if (p[k] !== '') qs.push(k + '=' + encodeURIComponent(p[k])); });
      document.getElementById('rp-result').innerHTML = '<p class="muted">Running…</p>';
      Auth.api('/api/reports/run?' + qs.join('&')).then(function (d) { lastResult = d; renderReportTable(d); })
        .catch(function (err) { document.getElementById('rp-result').innerHTML = '<p class="form-note err">' + esc(err.message) + '</p>'; });
    }
    document.getElementById('rp-run').onclick = run;
    document.getElementById('rp-print').onclick = function () { if (lastResult) printReport(title, lastResult); };
    document.getElementById('rp-csv').onclick = function () { if (lastResult) reportCSV(title, lastResult); };
    run();
  }

  function renderReportTable(d) {
    var cols = d.columns || [], rows = d.rows || [], el = document.getElementById('rp-result');
    if (!el) return;
    if (!rows.length) { el.innerHTML = '<p class="muted">No data for these parameters.</p>'; return; }
    var align = function (c) { return (c.fmt === 'gbp' || c.fmt === 'm3') ? ' style="text-align:right"' : ''; };
    var head = cols.map(function (c) { return '<th' + align(c) + '>' + esc(c.label) + '</th>'; }).join('');
    var body = rows.map(function (r) { return '<tr>' + cols.map(function (c) { return '<td' + align(c) + '>' + fmtCell(r[c.key], c.fmt) + '</td>'; }).join('') + '</tr>'; }).join('');
    var foot = d.totals ? '<tfoot><tr>' + cols.map(function (c) { var v = d.totals[c.key]; return '<td' + align(c) + ' style="font-weight:700">' + (v != null ? fmtCell(v, c.fmt) : '') + '</td>'; }).join('') + '</tr></tfoot>' : '';
    el.innerHTML = '<table class="data-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody>' + foot + '</table>';
  }

  function reportCSV(title, d) {
    var cols = d.columns || [], matrix = [cols.map(function (c) { return c.label; })];
    (d.rows || []).forEach(function (r) { matrix.push(cols.map(function (c) { return r[c.key] != null ? r[c.key] : ''; })); });
    if (d.totals) matrix.push(cols.map(function (c) { return d.totals[c.key] != null ? d.totals[c.key] : ''; }));
    downloadCSV((title || 'report').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.csv', matrix);
  }

  function printReport(title, d) {
    var cols = d.columns || [];
    var head = cols.map(function (c) { return '<th>' + esc(c.label) + '</th>'; }).join('');
    var body = (d.rows || []).map(function (r) { return '<tr>' + cols.map(function (c) { return '<td>' + fmtCell(r[c.key], c.fmt) + '</td>'; }).join('') + '</tr>'; }).join('');
    var foot = d.totals ? '<tfoot><tr>' + cols.map(function (c) { var v = d.totals[c.key]; return '<td><strong>' + (v != null ? fmtCell(v, c.fmt) : '') + '</strong></td>'; }).join('') + '</tr></tfoot>' : '';
    var html = '<html><head><title>' + esc(title) + '</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ccc;padding:7px;font-size:13px;text-align:left}th{background:#f0f0f0}</style></head><body>' +
      '<div style="display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:8px"><h1>' + esc(title) + '</h1>' +
      '<div style="text-align:right">' + companyHead() + '<br><span class="muted">' + new Date().toLocaleDateString('en-GB') + '</span></div></div>' +
      '<table><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody>' + foot + '</table></body></html>';
    var w = window.open('', '_blank');
    if (!w) { alert('Allow pop-ups to print.'); return; }
    w.document.write(html); w.document.close(); w.focus(); w.print();
  }

  function renderReportCreator() {
    titleEl.textContent = 'Report creator';
    actionsEl.innerHTML = '';
    var typeOpts = Object.keys(REPORT_TYPES).map(function (t) { return '<option value="' + t + '">' + esc(REPORT_TYPES[t].label) + '</option>'; }).join('');
    view.innerHTML = '<div class="panel"><p class="muted">Create a saved report from a base type with preset parameters. It then appears in the Report manager.</p>' +
      '<div class="fields form-grid">' + field('Report name *', '<input id="rc-name">') + field('Base report', '<select id="rc-type">' + typeOpts + '</select>') + '</div>' +
      '<div id="rc-params"></div><p class="form-note" id="rc-note"></p>' +
      '<div class="modal-foot" style="justify-content:flex-start"><button class="btn btn-primary btn-sm" id="rc-save">Save report</button> <a class="btn btn-ghost-dark btn-sm" href="#reports">Cancel</a></div></div>';
    function renderParams() { document.getElementById('rc-params').innerHTML = '<div class="fields form-grid">' + reportParamControls(document.getElementById('rc-type').value, {}) + '</div>'; }
    document.getElementById('rc-type').onchange = renderParams;
    renderParams();
    document.getElementById('rc-save').onclick = function () {
      var note = document.getElementById('rc-note'), name = document.getElementById('rc-name').value.trim(), type = document.getElementById('rc-type').value;
      if (!name) { note.textContent = 'Name the report.'; note.className = 'form-note err'; return; }
      note.textContent = 'Saving…'; note.className = 'form-note';
      Auth.api('/api/reports', { method: 'POST', body: { name: name, type: type, params: readReportParams(type) } })
        .then(function () { location.hash = '#reports'; }).catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    };
  }

  // ---- Staff (admin) ------------------------------------------------
  function renderStaff() {
    actionsEl.innerHTML = '<button class="btn btn-ghost-dark btn-sm" id="invite-user">Invite user</button> ' +
      '<button class="btn btn-primary btn-sm" id="new-staff">+ New staff</button>';
    view.innerHTML = '<div id="table-wrap"><p class="muted">Loading…</p></div>' +
      '<div id="invites-wrap" style="margin-top:18px"></div>';
    document.getElementById('new-staff').onclick = openStaffForm;
    document.getElementById('invite-user').onclick = openInvite;
    loadStaff();
    loadInvites();
  }

  function loadStaff() {
    Auth.api('/api/users').then(function (d) {
      var rows = d.rows || [];
      var body = rows.map(function (r) {
        var self = String(r.id) === String(userId());
        return '<tr><td>' + esc(r.name) + (self ? ' <span class="badge-you">you</span>' : '') + '</td><td>' + esc(r.email) + '</td>' +
          '<td>' + esc(r.role) + '</td><td>' + (r.active ? 'Active' : '<span class="muted">Disabled</span>') + '</td>' +
          '<td class="col-actions">' +
          '<button class="link-btn" data-resetpw="' + r.id + '" data-name="' + esc(r.name) + '">Reset password</button>' +
          (r.role !== 'admin' ? ' <button class="link-btn" data-perms="' + r.id + '">Permissions</button>' : '') +
          (self ? '' :
            ' <button class="link-btn" data-role="' + r.id + '" data-cur="' + r.role + '">' + (r.role === 'admin' ? 'Make staff' : 'Make admin') + '</button>' +
            ' <button class="link-btn" data-active="' + r.id + '" data-val="' + (r.active ? '0' : '1') + '">' + (r.active ? 'Disable' : 'Enable') + '</button>' +
            ' <button class="link-btn danger" data-deluser="' + r.id + '">Delete</button>') +
          '</td></tr>';
      }).join('');
      document.getElementById('table-wrap').innerHTML =
        '<table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th class="col-actions">Actions</th></tr></thead><tbody>' + body + '</tbody></table>';

      var wrap = document.getElementById('table-wrap');
      wrap.querySelectorAll('[data-role]').forEach(function (b) {
        b.onclick = function () { patchUser(b.dataset.role, { role: b.dataset.cur === 'admin' ? 'staff' : 'admin' }); };
      });
      wrap.querySelectorAll('[data-active]').forEach(function (b) {
        b.onclick = function () { patchUser(b.dataset.active, { active: b.dataset.val === '1' }); };
      });
      wrap.querySelectorAll('[data-deluser]').forEach(function (b) {
        b.onclick = function () {
          if (!confirm('Delete this staff account?')) return;
          Auth.api('/api/users/' + b.dataset.deluser, { method: 'DELETE' }).then(loadStaff).catch(showError);
        };
      });
      wrap.querySelectorAll('[data-resetpw]').forEach(function (b) {
        b.onclick = function () { openResetPassword(b.dataset.resetpw, b.dataset.name); };
      });
      wrap.querySelectorAll('[data-perms]').forEach(function (b) {
        b.onclick = function () { openPermissions(rows.find(function (r) { return String(r.id) === b.dataset.perms; })); };
      });
    }).catch(showError);
  }

  function loadInvites() {
    var wrap = document.getElementById('invites-wrap');
    if (!wrap) return;
    Auth.api('/api/invites').then(function (d) {
      var rows = (d.rows || []).filter(function (i) { return !i.used_at; });
      if (!rows.length) { wrap.innerHTML = ''; return; }
      wrap.innerHTML = '<h3 class="sub-h">Pending invites</h3><table class="data-table"><thead><tr><th>Email</th><th>Role</th><th>Expires</th><th>Link</th><th class="col-actions"></th></tr></thead><tbody>' +
        rows.map(function (i) {
          var link = location.origin + '/invite.html?token=' + i.token;
          return '<tr><td>' + esc(i.email || '—') + '</td><td>' + esc(i.role) + '</td><td>' + esc((i.expires_at || '').slice(0, 10)) + '</td>' +
            '<td><button class="link-btn" data-copy="' + esc(link) + '">Copy link</button></td>' +
            '<td class="col-actions"><button class="link-btn danger" data-revoke="' + i.id + '">Revoke</button></td></tr>';
        }).join('') + '</tbody></table>';
      wrap.querySelectorAll('[data-copy]').forEach(function (b) {
        b.onclick = function () { if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; };
      });
      wrap.querySelectorAll('[data-revoke]').forEach(function (b) {
        b.onclick = function () { if (!confirm('Revoke this invite?')) return; Auth.api('/api/invites/' + b.dataset.revoke, { method: 'DELETE' }).then(loadInvites).catch(showError); };
      });
    }).catch(function () { wrap.innerHTML = ''; });
  }

  function openInvite() {
    document.getElementById('modal-title').textContent = 'Invite a user';
    modalForm.innerHTML =
      '<p class="muted">Generate a single-use link, then send it to the person — they set their own name &amp; password.</p>' +
      '<div class="fields form-grid">' +
      '<div class="field"><label>Email (optional)</label><input id="iv-email" type="email"></div>' +
      '<div class="field"><label>Role</label><select id="iv-role"><option value="staff">Staff (full access)</option><option value="admin">Admin</option></select></div>' +
      '<div class="field"><label>Expires in (days)</label><input id="iv-days" type="number" value="7"></div>' +
      '</div><div id="iv-result"></div><p class="form-note" id="modal-note"></p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost-dark btn-sm" data-cancel>Close</button>' +
      '<button type="submit" class="btn btn-primary btn-sm">Generate link</button></div>';
    modalForm.querySelector('[data-cancel]').onclick = function () { closeModal(); loadInvites(); };
    modalForm.onsubmit = function (e) {
      e.preventDefault();
      var note = document.getElementById('modal-note'); note.textContent = 'Generating…'; note.className = 'form-note';
      Auth.api('/api/invites', { method: 'POST', body: {
        email: document.getElementById('iv-email').value, role: document.getElementById('iv-role').value, days: document.getElementById('iv-days').value
      } }).then(function (r) {
        note.textContent = '';
        var link = location.origin + '/invite.html?token=' + r.token;
        document.getElementById('iv-result').innerHTML =
          '<div class="field"><label>Invite link</label><input id="iv-link" readonly value="' + esc(link) + '" style="width:100%"></div>' +
          '<div style="text-align:right"><button type="button" class="btn btn-ghost-dark btn-sm" id="iv-copy">Copy link</button></div>';
        var inp = document.getElementById('iv-link'); inp.focus(); inp.select();
        document.getElementById('iv-copy').onclick = function () {
          inp.select(); if (navigator.clipboard) navigator.clipboard.writeText(link); this.textContent = 'Copied';
        };
      }).catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    };
    modal.hidden = false;
  }

  function openPermissions(rowUser) {
    if (!rowUser) return;
    var mods = gateableModules();
    var current = rowUser.permissions;
    var full = current == null;
    document.getElementById('modal-title').textContent = 'Permissions — ' + (rowUser.name || '');
    modalForm.innerHTML =
      '<p class="muted">Tick the modules this user can access. Admins always have full access.</p>' +
      '<div class="field"><label style="font-weight:400"><input type="checkbox" id="pm-all"' + (full ? ' checked' : '') + '> Full access (all modules)</label></div>' +
      '<div class="fields form-grid">' +
      mods.map(function (k) {
        var on = full || (current && current.indexOf(k) >= 0);
        return '<div class="field"><label style="font-weight:400"><input type="checkbox" class="pm-mod" value="' + k + '"' + (on ? ' checked' : '') + (full ? ' disabled' : '') + '> ' + esc(MODULES[k].label) + '</label></div>';
      }).join('') +
      '</div><p class="form-note" id="modal-note"></p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost-dark btn-sm" data-cancel>Cancel</button>' +
      '<button type="submit" class="btn btn-primary btn-sm">Save</button></div>';
    modalForm.querySelector('[data-cancel]').onclick = closeModal;
    var allCb = document.getElementById('pm-all');
    allCb.onchange = function () {
      modalForm.querySelectorAll('.pm-mod').forEach(function (c) { c.disabled = allCb.checked; if (allCb.checked) c.checked = true; });
    };
    modalForm.onsubmit = function (e) {
      e.preventDefault();
      var note = document.getElementById('modal-note'); note.textContent = 'Saving…'; note.className = 'form-note';
      var perms = allCb.checked ? null : Array.prototype.map.call(modalForm.querySelectorAll('.pm-mod:checked'), function (c) { return c.value; });
      Auth.api('/api/users/' + rowUser.id, { method: 'PATCH', body: { permissions: perms } })
        .then(function () { closeModal(); loadStaff(); })
        .catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    };
    modal.hidden = false;
  }

  function openResetPassword(id, name) {
    document.getElementById('modal-title').textContent = 'Reset password';
    modalForm.innerHTML =
      '<p class="muted">Set a new password for <strong>' + esc(name || '') + '</strong>. ' +
      'They can sign in with it immediately.</p>' +
      '<div class="field"><label for="rp-pass">New password *</label>' +
      '<input id="rp-pass" type="text" required placeholder="min 8 characters" autocomplete="new-password"></div>' +
      '<p class="form-note" id="modal-note"></p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost-dark btn-sm" data-cancel>Cancel</button>' +
      '<button type="submit" class="btn btn-primary btn-sm">Set password</button></div>';
    modalForm.querySelector('[data-cancel]').onclick = closeModal;
    modalForm.onsubmit = function (e) {
      e.preventDefault();
      var note = document.getElementById('modal-note');
      var pass = document.getElementById('rp-pass').value;
      if (!pass || pass.length < 8) { note.textContent = 'Password must be at least 8 characters.'; note.className = 'form-note err'; return; }
      note.textContent = 'Saving…'; note.className = 'form-note';
      Auth.api('/api/users/' + id, { method: 'PATCH', body: { password: pass } })
        .then(function () { closeModal(); note.textContent = ''; })
        .catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    };
    modal.hidden = false;
  }

  function patchUser(id, body) { Auth.api('/api/users/' + id, { method: 'PATCH', body: body }).then(loadStaff).catch(showError); }
  function userId() { return user && user.id; }   // self-row guard is also enforced server-side

  function openStaffForm() {
    document.getElementById('modal-title').textContent = 'New staff member';
    modalForm.innerHTML =
      '<div class="fields form-grid">' +
      '<div class="field"><label for="su-name">Name *</label><input id="su-name" required></div>' +
      '<div class="field"><label for="su-email">Email *</label><input id="su-email" type="email" required></div>' +
      '<div class="field"><label for="su-pass">Temporary password *</label><input id="su-pass" type="text" required placeholder="min 8 characters"></div>' +
      '<div class="field"><label for="su-role">Role</label><select id="su-role"><option value="staff">Staff</option><option value="admin">Admin</option></select></div>' +
      '</div><p class="form-note" id="modal-note"></p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost-dark btn-sm" data-cancel>Cancel</button>' +
      '<button type="submit" class="btn btn-primary btn-sm">Create account</button></div>';
    modalForm.querySelector('[data-cancel]').onclick = closeModal;
    modalForm.onsubmit = function (e) {
      e.preventDefault();
      var note = document.getElementById('modal-note');
      note.textContent = 'Creating…'; note.className = 'form-note';
      Auth.api('/api/users', { method: 'POST', body: {
        name: document.getElementById('su-name').value,
        email: document.getElementById('su-email').value,
        password: document.getElementById('su-pass').value,
        role: document.getElementById('su-role').value
      } }).then(function () { closeModal(); loadStaff(); })
        .catch(function (err) { note.textContent = err.message; note.className = 'form-note err'; });
    };
    modal.hidden = false;
  }

  // ---- Misc ---------------------------------------------------------
  function showError(err) {
    view.innerHTML = '<div class="panel"><p class="form-note err">' + esc(err.message || 'Something went wrong.') + '</p>' +
      '<p class="muted">If this is the first run, make sure the database tables exist (see SETUP).</p></div>';
  }
})();
