// script.js (Merged + Modals + Calculators + Markets sorting + Search dropdown)
// - Keep Tailwind + Chart.js behavior from previous script
// - This file is a drop-in replacement for your existing script.js

const API = {
  topMarkets: (vs = "usd", per_page = 250) =>
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vs}&order=market_cap_desc&per_page=${per_page}&page=1&price_change_percentage=24h`,
  historyRange: (id, vs = "usd", from, to) =>
    `https://api.coingecko.com/api/v3/coins/${id}/market_chart/range?vs_currency=${vs}&from=${from}&to=${to}`,
  simplePrice: (ids, vs = "usd,bdt") =>
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vs}`
};

// Elements
const tableContainer = document.getElementById("tableContainer");
const searchInput = document.getElementById("globalSearch");
const searchDropdown = document.getElementById("searchDropdown");
const mobileSearch = document.getElementById("mobileSearch");
const usdtUsdEl = document.getElementById("usdtUsd");
const usdtBdtEl = document.getElementById("usdtBdt");
const selectedListEl = document.getElementById("selectedList");
const refreshBtn = document.getElementById("refreshBtn");
const rangeBtns = document.querySelectorAll(".range-btn");
const legendEl = document.getElementById("legend");
const hamburgerBtn = document.getElementById("hamburgerBtn");
const mobileMenu = document.getElementById("mobileMenu");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const navBuy = document.getElementById("navBuy");
const navSell = document.getElementById("navSell");
const navMarkets = document.getElementById("navMarkets");
const mBuy = document.getElementById("mBuy");
const mSell = document.getElementById("mSell");
const mMarkets = document.getElementById("mMarkets");
const brandBtn = document.getElementById("brandBtn");
const sortSelect = document.getElementById("sortSelect");

// modals
const buyModal = document.getElementById("buyModal");
const buyBackdrop = document.getElementById("buyBackdrop");
const buyPanel = document.getElementById("buyPanel");
const buyClose = document.getElementById("buyClose");
const buyUsd = document.getElementById("buyUsd");
const buyBdt = document.getElementById("buyBdt");
const buyRateSpan = document.getElementById("buyRate");
const usdtPriceSmall = document.getElementById("usdtPriceSmall");
const buyExecute = document.getElementById("buyExecute");

const sellModal = document.getElementById("sellModal");
const sellBackdrop = document.getElementById("sellBackdrop");
const sellPanel = document.getElementById("sellPanel");
const sellClose = document.getElementById("sellClose");
const sellAmount = document.getElementById("sellAmount");
const sellRate = document.getElementById("sellRate");
const sellReceive = document.getElementById("sellReceive");
const sellExecute = document.getElementById("sellExecute");

const loginModal = document.getElementById("loginModal");
const loginBackdrop = document.getElementById("loginBackdrop");
const loginPanel = document.getElementById("loginPanel");
const loginClose = document.getElementById("loginClose");
const loginSubmit = document.getElementById("loginSubmit");

const signupModal = document.getElementById("signupModal");
const signupBackdrop = document.getElementById("signupBackdrop");
const signupPanel = document.getElementById("signupPanel");
const signupClose = document.getElementById("signupClose");
const signupSubmit = document.getElementById("signupSubmit");

// Data
let coins = [];
let simplePrices = {};
let selectedIds = new Set();
let days = 7;
let chart = null;
const maxCompare = 5;

const fmt = n => (n >= 1 ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : Number(n).toPrecision(4));
const nowSec = () => Math.floor(Date.now() / 1000);

// --- NAV / THEME / MOBILE
hamburgerBtn.addEventListener("click", () => mobileMenu.classList.toggle("hidden"));
brandBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

function setTheme(dark) {
  if (dark) {
    document.documentElement.classList.add("dark");
    if (themeIcon) themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m8.66-12.34l-.71.71M4.05 19.95l.71-.71M21 12h-1M4 12H3m15.66 5.66l-.71-.71M4.05 4.05l.71.71"/>`;
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    if (themeIcon) themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>`;
    localStorage.setItem("theme", "light");
  }
}
themeToggle.addEventListener("click", () => setTheme(!document.documentElement.classList.contains("dark")));

// restore theme
if (localStorage.getItem("theme") === "dark") setTheme(true);

// --- UTIL
function chunkArray(arr, size) { const out = []; for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size)); return out; }

// --- FETCH DATA
async function fetchTopCoins() {
  const res = await fetch(API.topMarkets("usd", 250));
  if (!res.ok) throw new Error("Failed to fetch markets");
  coins = await res.json();
  // fetch simple prices in chunks
  const ids = coins.map(c => c.id).concat("tether");
  const chunks = chunkArray(ids, 100);
  simplePrices = {};
  for (const chunk of chunks) {
    const r = await fetch(API.simplePrice(chunk.join(","), "usd,bdt"));
    if (!r.ok) continue;
    const d = await r.json();
    Object.assign(simplePrices, d);
  }
}

// --- RENDER / TABLE
function renderRow(c) {
  const usd = simplePrices[c.id]?.usd || c.current_price || 0;
  const bdt = simplePrices[c.id]?.bdt || null;
  const change = c.price_change_percentage_24h;

  const row = document.createElement("div");
  row.className = "flex items-center gap-3 p-2 rounded-lg hover:shadow-md hover:-translate-y-1 transition-transform bg-white dark:bg-slate-800";

  row.innerHTML = `
    <div class="flex items-center gap-3 min-w-0">
      <input type="checkbox" class="cmpBox" data-id="${c.id}" ${selectedIds.has(c.id) ? "checked":""}/>
      <img src="${c.image}" class="w-10 h-10 rounded-full"/>
      <div class="min-w-0">
        <div class="text-sm font-semibold truncate">${c.name} <span class="text-xs text-slate-400">(${c.symbol.toUpperCase()})</span></div>
        <div class="text-xs text-slate-400">MCap: $${(c.market_cap || 0).toLocaleString()}</div>
      </div>
    </div>

    <div class="ml-auto flex items-center gap-4">
      <div class="text-sm font-semibold">$${fmt(usd)}</div>
      <div class="text-xs text-slate-400">BDT ${bdt ? fmt(bdt) : "--"}</div>
      <div class="text-sm ${change>=0 ? 'text-emerald-500':'text-rose-500'}">${change!=null?change.toFixed(2)+'%':'--'}</div>
    </div>
  `;
  return row;
}

function renderTable(filter = "") {
  tableContainer.innerHTML = "";
  const q = (filter || "").trim().toLowerCase();
  const list = coins.filter(c => !q ? true : c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
  list.forEach(c => tableContainer.appendChild(renderRow(c)));

  // attach checkbox listeners
  document.querySelectorAll(".cmpBox").forEach(cb => {
    cb.addEventListener("change", () => {
      const id = cb.dataset.id;
      if (cb.checked) {
        if (selectedIds.size >= maxCompare) { cb.checked = false; toast(`Compare up to ${maxCompare} coins.`); return; }
        selectedIds.add(id);
      } else selectedIds.delete(id);
      updateSelectedDisplay();
      updateCompareChart();
    });
  });
}

// --- selected display & USDT
function updateSelectedDisplay() {
  if (!selectedIds.size) { selectedListEl.textContent = "None — check coins to compare"; return; }
  selectedListEl.textContent = [...selectedIds].map(id => coins.find(c=>c.id===id)?.symbol.toUpperCase()).filter(Boolean).join(", ");
}
function renderUSDT() {
  const t = simplePrices["tether"];
  if (!t) { usdtUsdEl.textContent = "$ --"; usdtBdtEl.textContent = "BDT --"; return; }
  usdtUsdEl.textContent = "$" + fmt(t.usd);
  usdtBdtEl.textContent = "BDT " + fmt(t.bdt);
}

// --- HISTORY & CHART
function getFromTo(days) { const to = nowSec(); return { from: to - days*86400, to }; }
async function fetchHistoryFor(id, days) {
  try {
    const { from, to } = getFromTo(days);
    const res = await fetch(API.historyRange(id, "usd", from, to));
    if (!res.ok) return [];
    const data = await res.json();
    return data.prices || [];
  } catch(e){ console.warn(e); return []; }
}

function randomColor(seed) {
  let h = 0; for (let i=0;i<seed.length;i++) h = (h*31 + seed.charCodeAt(i)) % 360;
  return `hsl(${h} 75% 50%)`;
}

async function updateCompareChart() {
  const ids = [...selectedIds];
  if (!ids.length) { if (chart) chart.destroy(); legendEl.innerHTML = `<div class="text-sm text-slate-400">No coins selected.</div>`; return; }

  const histories = await Promise.all(ids.map(id => fetchHistoryFor(id, days)));
  if (!histories.length || !histories[0]) { legendEl.innerHTML = `<div class="text-sm text-slate-400">No data.</div>`; return; }

  const labels = histories[0].map(p => { const d = new Date(p[0]); return days<=30 ? d.toLocaleDateString() : d.toLocaleString(); });

  const datasets = histories.map((hist, idx) => {
    const id = ids[idx];
    const coin = coins.find(c => c.id === id) || { symbol: id };
    const color = randomColor(id);
    return {
      label: coin.symbol.toUpperCase(),
      data: hist.map(p => p[1]),
      borderColor: color,
      backgroundColor: color.replace("hsl(", "hsla(").replace(")", ", 0.12)"),
      borderWidth: 2, tension: 0.28, pointRadius: 0, fill: false
    };
  });

  if (chart) chart.destroy();
  const ctx = document.getElementById("compareChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 1400, easing: "easeInOutCubic" },
      transitions: { show: { animations: { y: { from: 0, duration: 1000, easing: "easeOutQuart" }, colors: { type: "color", duration: 700, easing: "easeInOutQuad" } } } },
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "top" }, tooltip: { mode: "index", callbacks: { label: ctx => `${ctx.dataset.label}: $${fmt(ctx.parsed.y)}` } } },
      scales: { x: { ticks: { autoSkip: true, maxTicksLimit: 12 } }, y: { ticks: { callback: v => "$" + fmt(v) } } }
    }
  });

  // legend chips
  legendEl.innerHTML = "";
  datasets.forEach(ds => {
    const chip = document.createElement("div");
    chip.className = "flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-slate-700 text-sm";
    chip.innerHTML = `<span class="w-3 h-3 rounded-sm" style="background:${ds.borderColor}"></span><span>${ds.label}</span>`;
    legendEl.appendChild(chip);
  });
}

// --- BUY/SELL: modal open/close and calculations (animated)
function openModal(modal, backdrop, panel) {
  modal.classList.remove("hidden");
  // animate backdrop -> fade in
  backdrop.style.opacity = "0";
  requestAnimationFrame(()=> {
    backdrop.style.opacity = ".4";
  });
  // panel animate (scale+fade)
  panel.style.transform = "scale(.96)";
  panel.style.opacity = "0";
  requestAnimationFrame(()=> {
    panel.style.transform = "scale(1)";
    panel.style.opacity = "1";
  });
  // lock scroll
  document.body.style.overflow = "hidden";
}
function closeModal(modal, backdrop, panel) {
  // animate out
  backdrop.style.opacity = "0";
  panel.style.transform = "scale(.96)";
  panel.style.opacity = "0";
  setTimeout(()=> {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }, 220);
}

// Wiring nav buttons
navBuy.addEventListener("click", ()=> openModal(buyModal, buyBackdrop, buyPanel));
mBuy.addEventListener("click", ()=> { mobileMenu.classList.add("hidden"); openModal(buyModal, buyBackdrop, buyPanel); });
navSell.addEventListener("click", ()=> openModal(sellModal, sellBackdrop, sellPanel));
mSell.addEventListener("click", ()=> { mobileMenu.classList.add("hidden"); openModal(sellModal, sellBackdrop, sellPanel); });

document.getElementById("buyClose").addEventListener("click", ()=> closeModal(buyModal, buyBackdrop, buyPanel));
buyBackdrop.addEventListener("click", ()=> closeModal(buyModal, buyBackdrop, buyPanel));

sellClose.addEventListener("click", ()=> closeModal(sellModal, sellBackdrop, sellPanel));
sellBackdrop.addEventListener("click", ()=> closeModal(sellModal, sellBackdrop, sellPanel));

loginClose.addEventListener("click", ()=> closeModal(loginModal, loginBackdrop, loginPanel));
loginBackdrop.addEventListener("click", ()=> closeModal(loginModal, loginBackdrop, loginPanel));
signupClose.addEventListener("click", ()=> closeModal(signupModal, signupBackdrop, signupPanel));
signupBackdrop.addEventListener("click", ()=> closeModal(signupModal, signupBackdrop, signupPanel));

document.getElementById("loginBtn")?.addEventListener("click", ()=> openModal(loginModal, loginBackdrop, loginPanel));
document.getElementById("signupBtn")?.addEventListener("click", ()=> openModal(signupModal, signupBackdrop, signupPanel));

// Buy calculator logic
function getUsdtBdtRate() {
  const t = simplePrices["tether"];
  return t ? { usd: t.usd, bdt: t.bdt } : null;
}
function updateBuyRateDisplay(){
  const r = getUsdtBdtRate();
  buyRateSpan.textContent = r ? `1 USDT ≈ ${fmt(r.bdt)} BDT` : "--";
  usdtPriceSmall.textContent = r ? `$${fmt(r.usd)}` : "--";
}
buyUsd.addEventListener("input", () => {
  const r = getUsdtBdtRate();
  const usd = Number(buyUsd.value || 0);
  if (r) buyBdt.value = (usd * r.bdt).toFixed(2);
});
buyBdt.addEventListener("input", () => {
  const r = getUsdtBdtRate();
  const bdt = Number(buyBdt.value || 0);
  if (r) buyUsd.value = (bdt / r.bdt).toFixed(2);
});
buyExecute.addEventListener("click", () => {
  const usd = Number(buyUsd.value || 0);
  if (!usd || !getUsdtBdtRate()) { toast("Enter amount"); return; }
  closeModal(buyModal, buyBackdrop, buyPanel);
  toast(`Buy request: $${fmt(usd)} — simulated (UI demo)`);
});

// Sell calculator
sellAmount.addEventListener("input", () => {
  const amt = Number(sellAmount.value || 0);
  const r = getUsdtBdtRate();
  if (r) {
    sellRate.textContent = `1 USDT ≈ ${fmt(r.bdt)} BDT`;
    sellReceive.textContent = fmt(amt * r.bdt);
  }
});
sellExecute.addEventListener("click", () => {
  const amt = Number(sellAmount.value || 0);
  if (!amt) { toast("Enter amount"); return; }
  closeModal(sellModal, sellBackdrop, sellPanel);
  toast(`Sell request: ${amt} USDT — simulated (UI demo)`);
});

// login/signup (dummy)
loginSubmit?.addEventListener("click", () => {
  closeModal(loginModal, loginBackdrop, loginPanel);
  toast("Logged in (demo)");
});
signupSubmit?.addEventListener("click", () => {
  closeModal(signupModal, signupBackdrop, signupPanel);
  toast("Account created (demo)");
});

// --- SEARCH dropdown (desktop) — shows top 6 matches
function renderSearchDropdown(q) {
  if (!q) { searchDropdown.classList.add("hidden"); searchDropdown.innerHTML = ""; return; }
  const list = coins.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)).slice(0, 8);
  if (!list.length) { searchDropdown.innerHTML = `<div class="p-3 text-sm text-slate-500">No results</div>`; searchDropdown.classList.remove("hidden"); return; }

  searchDropdown.innerHTML = list.map(c => `
    <button class="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3" data-id="${c.id}">
      <img src="${c.image}" class="w-5 h-5 rounded-full" />
      <div class="text-sm"><div class="font-medium">${c.name}</div><div class="text-xs text-slate-400">${c.symbol.toUpperCase()}</div></div>
      <div class="ml-auto text-sm text-slate-500">$${fmt(simplePrices[c.id]?.usd || c.current_price)}</div>
    </button>
  `).join("");
  searchDropdown.classList.remove("hidden");

  // wire clicks
  searchDropdown.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      // ensure coin in view: find and scroll the row
      const targetRow = Array.from(document.querySelectorAll("#tableContainer > div")).find(r => r.querySelector(`.cmpBox[data-id="${id}"]`));
      if (targetRow) {
        targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
        // highlight
        targetRow.classList.add("ring-2", "ring-brand/30");
        setTimeout(()=> targetRow.classList.remove("ring-2", "ring-brand/30"), 1600);
      }
      searchDropdown.classList.add("hidden");
    });
  });
}

searchInput?.addEventListener("input", e => {
  renderTable(e.target.value);
  renderSearchDropdown(e.target.value.trim().toLowerCase());
});
mobileSearch?.addEventListener("input", e => {
  renderTable(e.target.value);
});

// clicking outside search closes dropdown
document.addEventListener("click", (e) => {
  if (!searchDropdown.contains(e.target) && !searchInput.contains(e.target)) searchDropdown.classList.add("hidden");
});

// --- SORTING (markets)
function sortCoins(mode) {
  const copy = [...coins];
  switch(mode) {
    case "market_cap_desc": copy.sort((a,b)=> (b.market_cap||0)-(a.market_cap||0)); break;
    case "market_cap_asc": copy.sort((a,b)=> (a.market_cap||0)-(b.market_cap||0)); break;
    case "price_desc": copy.sort((a,b)=> (b.current_price||0)-(a.current_price||0)); break;
    case "price_asc": copy.sort((a,b)=> (a.current_price||0)-(b.current_price||0)); break;
    case "change_desc": copy.sort((a,b)=> (b.price_change_percentage_24h||0)-(a.price_change_percentage_24h||0)); break;
    case "change_asc": copy.sort((a,b)=> (a.price_change_percentage_24h||0)-(b.price_change_percentage_24h||0)); break;
    default: break;
  }
  coins = copy;
  renderTable(searchInput?.value || "");
}
sortSelect?.addEventListener("change", (e)=> sortCoins(e.target.value));

// navMarkets scroll behavior
navMarkets.addEventListener("click", () => {
  document.getElementById("marketsH2").scrollIntoView({ behavior: "smooth", block: "start" });
});
mMarkets.addEventListener("click", () => { mobileMenu.classList.add("hidden"); document.getElementById("marketsH2").scrollIntoView({ behavior: "smooth" }); });

// REFRESH & INIT
async function refreshAll() {
  refreshBtn.disabled = true; refreshBtn.textContent = "⏳";
  try {
    await fetchTopCoins();
    renderTable(searchInput?.value || "");
    renderUSDT();
    updateCompareChart();
    updateSelectedDisplay();
    updateBuyRateDisplay();
  } catch (err) {
    console.error(err);
    toast("Failed to refresh data. See console.");
  } finally {
    refreshBtn.disabled = false; refreshBtn.textContent = "Refresh";
  }
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2 rounded";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), 2600);
}

refreshBtn.addEventListener("click", refreshAll);

// range buttons
rangeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    rangeBtns.forEach(b=>b.classList.remove("bg-brand","text-white"));
    btn.classList.add("bg-brand","text-white");
    days = Number(btn.dataset.days);
    updateCompareChart();
  });
});

// EVENTS for buy/sell display update
// updateBuyRateDisplay is called after prices fetched (refreshAll)
buyUsd?.addEventListener && buyUsd.addEventListener("focus", updateBuyRateDisplay);

// INIT
(async function init(){
  await refreshAll();
  // auto select top 2 coins
  if (coins.length >= 2) {
    selectedIds.add(coins[0].id);
    selectedIds.add(coins[1].id);
    updateSelectedDisplay();
    renderTable();
    updateCompareChart();
  }
})();
