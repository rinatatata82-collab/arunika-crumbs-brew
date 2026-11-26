/* Jenis pesanan: Dine-in (nomor meja) atau Take away (ambil di outlet).
   Dipakai di keranjang.html (pilihan) dan pembayaran.html (ringkasan). Disimpan di localStorage. */
(function () {
  'use strict';
  var A = window.Arunika, I = window.I18N;
  if (!A || !I) return;
  var KEY = 'arunika_order_v1', TABLES = 20;
  var L = function (id, en) { return I.lang === 'en' ? en : id; };
  var page = location.pathname.split('/').pop();

  function read() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || '{}'), n = parseInt(o.table, 10);
      return { type: o.type === 'dinein' || o.type === 'takeaway' ? o.type : '', table: n >= 1 && n <= TABLES ? String(n) : '',
               pickup: /^([01]\d|2[0-3]):[0-5]\d$/.test(o.pickup || '') ? o.pickup : '', pickupNext: !!o.pickupNext };
    } catch (e) { return { type: '', table: '', pickup: '', pickupNext: false }; }
  }

  /* ---------- jam ambil (WIB): slot 15 menit, buka 08.00–22.00, bar tutup 21.30 ---------- */
  var OPEN_MIN = 8 * 60, LAST_MIN = 21 * 60 +30, LEAD = 10;
  function nowMin() {
    var h = 0, m = 0;
    try {
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date())
        .forEach(function (x) { if (x.type === 'hour') h = +x.value; if (x.type === 'minute') m = +x.value; });
    } catch (e) { var d = new Date(); h = d.getHours(); m = d.getMinutes(); }
    return h * 60 + m;
  }
  function hhmm(min) { var h = Math.floor(min / 60), m = min % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  var selH = '', selM = '';
function pickupOk() {
  if (!state.pickup) return false;
  var p = state.pickup.split(':'), mins = (+p[0]) * 60 + (+p[1]);
  return mins >= OPEN_MIN && mins <= LAST_MIN;
}
  function pickupText(p, next) { return p ? p.replace(':', '.') + ' WIB' + (next ? L(' (besok)', ' (tomorrow)') : '') : ''; }
  var state = read();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('arunika:order'));
  }
  var order = {
    get: function () { return { type: state.type, table: state.table, pickup: state.pickup, pickupNext: state.pickupNext }; },
    set: function (p) {
      if ('type' in p) state.type = p.type; if ('table' in p) state.table = p.table;
      if (state.type !== 'dinein') state.table = state.type === 'takeaway' ? '' : state.table;
      if ('pickup' in p) { state.pickup = p.pickup; state.pickupNext = !!p.pickupNext; }
      if (state.type === 'dinein') { state.pickup = ''; state.pickupNext = false; }
      save();
    },
    clear: function () { state = { type: '', table: '', pickup: '', pickupNext: false }; selH = ''; selM = ''; save(); },
    valid: function () { return (state.type === 'takeaway' && pickupOk()) || (state.type === 'dinein' && !!state.table); },
    label: function () {
      if (state.type === 'dinein') return state.table ? L('Dine-in · Meja ' + state.table, 'Dine-in · Table ' + state.table) : 'Dine-in';
      if (state.type === 'takeaway') return pickupOk() ? L('Take away · Ambil jam ', 'Take away · Pick up at ') + pickupText(state.pickup, state.pickupNext) : L('Take away · Ambil di outlet', 'Take away · Pick up at outlet');
      return L('Belum dipilih', 'Not selected');
    }
  };
  A.order = order;
  order.pickupText = pickupText;

  var APPS = [['GoFood', 'https://gofood.co.id'], ['GrabFood', 'https://food.grab.com/id'], ['ShopeeFood', 'https://shopee.co.id']];
  var esc = A.esc;

  /* ---------- keranjang.html: pilihan jenis pesanan ---------- */
  function optBtn(type, icon, title, sub) {
    var on = state.type === type;
    return '<button type="button" role="radio" aria-checked="' + on + '" data-order-type="' + type + '" class="flex-1 p-3.5 rounded-xl text-left flex items-center gap-3 transition-all ' +
      (on ? 'border-2 border-primary bg-surface shadow-sm' : 'border border-outline-variant/40 bg-surface-container hover:bg-surface') + '">' +
      '<span class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ' + (on ? 'bg-primary-container text-white' : 'bg-surface-variant text-secondary') + '"><span class="material-symbols-outlined text-[22px]" aria-hidden="true">' + icon + '</span></span>' +
      '<span class="min-w-0"><span class="block font-label-lg text-sm font-semibold text-secondary">' + esc(title) + '</span><span class="block text-xs text-on-surface-variant">' + esc(sub) + '</span></span></button>';
  }
    function pickupField() {
  var ok = pickupOk();
  return '<div class="mt-3">' +
    '<div class="flex items-center justify-between mb-1.5"><span id="order-pickup-label" class="font-label-md text-xs font-bold text-secondary">' + esc(L('Jam Ambil', 'Pick-up Time')) + ' *</span>' +
    '<span class="text-[11px] px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">' + esc(L('Buka 08.00–22.00', 'Open 08:00–22:00')) + '</span></div>' +
    '<button type="button" id="order-pickup-btn" aria-haspopup="dialog" aria-labelledby="order-pickup-label" class="w-full h-12 px-4 rounded-xl border border-outline-variant bg-surface text-sm flex items-center justify-between ' + (state.pickup ? 'text-secondary font-semibold' : 'text-on-surface-variant') + '">' +
    '<span>' + esc(state.pickup ? pickupText(state.pickup, state.pickupNext) : L('Pilih jam ambil', 'Choose pick-up time')) + '</span>' +
    '<span class="material-symbols-outlined text-[22px]" aria-hidden="true">schedule</span></button>' +
    '</div>';
  }
    /* ---------- popup roda jam ---------- */
var ITEM = 48; // tinggi tiap angka (px)
function pad(n) { return (n < 10 ? '0' : '') + n; }
function wheelCol(id, from, to) {
  var h = '<div id="' + id + '" class="pk-wheel" tabindex="0">' + '<div style="height:' + ITEM * 2 + 'px"></div>';
  for (var i = from; i <= to; i++) h += '<div class="pk-item">' + pad(i) + '</div>';
  return h + '<div style="height:' + ITEM * 2 + 'px"></div></div>';
}
function wheelIndex(el) { return Math.round(el.scrollTop / ITEM); }
function wheelFade(el) {                       // angka yang jauh dari tengah memudar
  var c = wheelIndex(el);
  [].forEach.call(el.querySelectorAll('.pk-item'), function (it, i) {
    var d = Math.abs(i - c);
    it.style.opacity = d === 0 ? 1 : d === 1 ? 0.7 : 0.35;
    it.style.color = d === 0 ? '#556B2F' : '#444';
  });
}
function openPicker() {
  if (document.getElementById('pk-overlay')) return;
  if (!document.getElementById('pk-style')) {
    var st = document.createElement('style'); st.id = 'pk-style';
    st.textContent = '.pk-wheel{position:relative;z-index:1;height:' + ITEM * 5 + 'px;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none;flex:1;text-align:center;outline:none}' +
      '.pk-wheel::-webkit-scrollbar{display:none}' +
      '.pk-item{height:' + ITEM + 'px;line-height:' + ITEM + 'px;font-size:22px;font-weight:700;scroll-snap-align:center}';
    document.head.appendChild(st);
  }
  var ov = document.createElement('div'); ov.id = 'pk-overlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML =
    '<div role="dialog" aria-modal="true" aria-label="' + esc(L('Pilih jam ambil', 'Choose pick-up time')) + '" style="background:#fff;border-radius:24px;width:100%;max-width:340px;padding:18px 16px;box-shadow:0 20px 50px rgba(0,0,0,.3)">' +
    '<div style="display:flex;text-align:center;font-size:12px;letter-spacing:.08em;color:#6b5848;margin-bottom:4px"><span style="flex:1">' + esc(L('JAM', 'HOUR')) + '</span><span style="width:32px"></span><span style="flex:1">' + esc(L('MENIT', 'MINUTE')) + '</span></div>' +
    '<div style="position:relative;display:flex;align-items:center">' +
    '<div style="position:absolute;left:0;right:0;top:' + ITEM * 2 + 'px;height:' + ITEM + 'px;background:#f1ede2;border-radius:12px;pointer-events:none"></div>' +
    wheelCol('pk-h', 8, 21) + '<span style="width:32px;text-align:center;font-weight:800;font-size:22px;position:relative">:</span>' + wheelCol('pk-m', 0, 59) + '</div>' +
    '<p style="text-align:center;font-size:12px;color:#6b5848;margin:10px 0">' + esc(L('Geser roda untuk memilih jam', 'Scroll the wheels to pick a time')) + '</p>' +
    '<button type="button" id="pk-done" style="width:100%;height:48px;border-radius:16px;background:#556B2F;color:#fff;font-weight:700;font-size:16px">' + esc(L('Selesai', 'Done')) + '</button></div>';
  document.body.appendChild(ov);

  var wh = document.getElementById('pk-h'), wm = document.getElementById('pk-m');
  var cur = (state.pickup || '08:00').split(':');
  wh.scrollTop = (+cur[0] - 8) * ITEM; wm.scrollTop = (+cur[1]) * ITEM;
  wheelFade(wh); wheelFade(wm);
  wh.addEventListener('scroll', function () { wheelFade(wh); });
  wm.addEventListener('scroll', function () { wheelFade(wm); });

  function close() { ov.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);
  ov.addEventListener('click', function (e) { if (e.target === ov) close(); });   // klik area gelap = tutup
  document.getElementById('pk-done').addEventListener('click', function () {
    selH = pad(8 + wheelIndex(wh)); selM = pad(wheelIndex(wm));
    var mins = (+selH) * 60 + (+selM);
    close();
    order.set({ pickup: selH + ':' + selM, pickupNext: mins < nowMin() + LEAD });
  });
}
  function renderChooser(mount) {
    var h = '<section id="jenis-pesanan" aria-labelledby="order-type-title" class="p-5 rounded-2xl border border-surface-variant bg-surface-container-low text-on-surface">' +
      '<h2 id="order-type-title" class="font-headline-sm text-xl font-semibold text-secondary mb-3">' + esc(L('Jenis Pesanan', 'Order Type')) + '</h2>' +
      '<div role="radiogroup" aria-labelledby="order-type-title" class="flex flex-col sm:flex-row gap-3">' +
      optBtn('dinein', 'restaurant', 'Dine-in', L('Makan di tempat', 'Eat in')) +
      optBtn('takeaway', 'takeout_dining', 'Take away', L('Ambil di outlet', 'Pick up at the outlet')) + '</div>';
    if (state.type === 'dinein') {
      h += '<div class="mt-4"><label for="order-table" class="block font-label-md text-xs font-bold text-secondary mb-1.5">' + esc(L('Nomor Meja', 'Table Number')) + '</label>' +
        '<select id="order-table" class="w-full sm:w-64 h-11 px-3 rounded-xl border border-outline-variant bg-surface text-on-surface text-sm"><option value="">' + esc(L('Pilih nomor meja', 'Choose table number')) + '</option>';
      for (var i = 1; i <= TABLES; i++) h += '<option value="' + i + '"' + (state.table === String(i) ? ' selected' : '') + '>' + esc(L('Meja ', 'Table ') + i) + '</option>';
      h += '</select><p id="order-table-hint" class="text-xs mt-1.5 min-h-[1rem] ' + (state.table ? 'text-on-surface-variant' : 'text-error') + '">' +
        esc(state.table ? L('Pesananmu akan diantar ke meja ini. Nomor meja ada di atas meja.', 'Your order will be brought to this table. The number is on the table.') : L('Pilih nomor meja sebelum lanjut ke pembayaran.', 'Choose a table number before paying.')) + '</p></div>';
    } else if (state.type === 'takeaway') {
      h += '<div class="mt-4 p-3.5 rounded-xl bg-surface border border-outline-variant/30 text-sm text-on-surface-variant leading-relaxed">' +
        '<p class="flex items-start gap-2"><span class="material-symbols-outlined text-[18px] text-primary shrink-0" aria-hidden="true">storefront</span><span>' + L('<strong>Take away hanya bisa diambil di outlet</strong> (Ruko Promenade, Jl. Dr. Ir. H. Soekarno MERR, Rungkut). Kami akan memanggil nomor pesananmu.', '<strong>Take away is pick-up at the outlet only</strong> (Ruko Promenade, Jl. Dr. Ir. H. Soekarno MERR, Rungkut). We will call your order number.') + '</span></p>' +
        pickupField() +
        '<p class="mt-3 flex items-start gap-2"><span class="material-symbols-outlined text-[18px] text-primary shrink-0" aria-hidden="true">two_wheeler</span><span>' + esc(L('Mau diantar? Pesan lewat aplikasi:', 'Want delivery? Order through an app:')) + '</span></p>' +
        '<div class="flex flex-wrap gap-2 mt-2 pl-6">' + APPS.map(function (a) { return '<a class="px-3 py-1.5 rounded-full border border-outline-variant text-secondary text-xs font-semibold hover:bg-surface-container" href="' + a[1] + '" target="_blank" rel="noopener noreferrer">' + a[0] + '</a>'; }).join('') + '</div>' +
        '<p class="mt-3 text-xs">' + esc(L('Pembayaran di website tetap bisa lewat QRIS, tunai, atau transfer BRI.', 'Payment on this site is still by QRIS, cash, or BRI transfer.')) + '</p></div>';
    } else {
      h += '<p class="mt-3 text-xs text-on-surface-variant">' + esc(L('Pilih salah satu untuk melanjutkan ke pembayaran.', 'Choose one to continue to payment.')) + '</p>';
    }
    mount.innerHTML = h + '</section>';
  }

  /* ---------- pembayaran.html: ringkasan jenis pesanan ---------- */
  function renderSummary(mount) {
    var ok = order.valid();
    mount.innerHTML = '<section class="p-4 sm:p-5 rounded-2xl border ' + (ok ? 'border-surface-variant bg-surface-container-low' : 'border-error/50 bg-error-container/30') + ' text-on-surface flex items-center justify-between gap-3" aria-labelledby="order-sum-title">' +
      '<div class="flex items-center gap-3 min-w-0"><span class="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[22px]" aria-hidden="true">' + (state.type === 'takeaway' ? 'takeout_dining' : 'restaurant') + '</span></span>' +
      '<div class="min-w-0"><h2 id="order-sum-title" class="font-label-md text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">' + esc(L('Jenis Pesanan', 'Order Type')) + '</h2>' +
      '<p class="font-label-lg text-sm font-semibold text-secondary truncate">' + esc(order.label()) + '</p>' +
      (ok ? '' : '<p class="text-xs text-error mt-0.5">' + esc(state.type === 'dinein' ? L('Pilih nomor meja dulu.', 'Choose a table number first.') : state.type === 'takeaway' ? L('Pilih jam ambil dulu.', 'Choose a pick-up time first.') : L('Pilih Dine-in atau Take away dulu.', 'Choose Dine-in or Take away first.')) + '</p>') + '</div></div>' +
      '<a href="keranjang.html#jenis-pesanan" class="shrink-0 px-3 py-2 rounded-lg border border-outline-variant text-secondary text-xs font-semibold hover:bg-surface-container">' + esc(ok ? L('Ubah', 'Change') : L('Pilih', 'Choose')) + '</a></section>' +
      (A.note && A.note.get().trim() ? '<section class="mt-3 p-4 sm:p-5 rounded-2xl border border-surface-variant bg-surface-container-low text-on-surface flex items-start justify-between gap-3" aria-labelledby="order-note-sum"><div class="flex items-start gap-3 min-w-0"><span class="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[22px]" aria-hidden="true">edit_note</span></span><div class="min-w-0"><h2 id="order-note-sum" class="font-label-md text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">' + esc(L('Catatan', 'Notes')) + '</h2><p class="text-sm text-secondary break-words">' + esc(A.note.get().trim()) + '</p></div></div><a href="keranjang.html" class="shrink-0 px-3 py-2 rounded-lg border border-outline-variant text-secondary text-xs font-semibold hover:bg-surface-container">' + esc(L('Ubah', 'Change')) + '</a></section>' : '');
  }

  function render() {
    var m = document.getElementById('order-type-mount'); if (m) renderChooser(m);
    var s = document.getElementById('order-summary-mount'); if (s) renderSummary(s);
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('#order-pickup-btn')) { openPicker(); return; }
    var b = e.target.closest('[data-order-type]');
    if (b) { order.set({ type: b.getAttribute('data-order-type') }); return; }
    var a = e.target.closest('a[href]');
    if (!a || /^pembayaran/.test(page) || order.valid()) return;
    if (/(^|\/)pembayaran\.html(\?|#|$)/.test(a.getAttribute('href'))) {
      e.preventDefault();
      if (/^keranjang/.test(page)) {
        A.toast(L('Pilih jenis pesanan dulu (Dine-in / Take away).', 'Choose an order type first (Dine-in / Take away).'), 'info');
        var t = document.getElementById('jenis-pesanan'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else location.href = 'keranjang.html#jenis-pesanan';
    }
    }); 
      document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'order-table') order.set({ table: e.target.value });
  });
  window.addEventListener('arunika:order', render);
  window.addEventListener('arunika:lang', render);
  window.addEventListener('arunika:note', function () { var s = document.getElementById('order-summary-mount'); if (s) renderSummary(s); });
  window.addEventListener('storage', function (ev) { if (ev.key === KEY) { state = read(); render(); } });
  render();
  if (location.hash === '#jenis-pesanan') { var t0 = document.getElementById('jenis-pesanan'); if (t0) setTimeout(function () { t0.scrollIntoView({ block: 'center' }); }, 60); }
})();
