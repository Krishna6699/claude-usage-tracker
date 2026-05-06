'use strict';
const $ = id => document.getElementById(id);
let ticker = null;

function rel(ts){if(!ts)return'';const s=Math.round((Date.now()-ts)/1000);if(s<60)return'just now';if(s<3600)return Math.round(s/60)+'m ago';if(s<86400)return Math.round(s/3600)+'h ago';return new Date(ts).toLocaleDateString('en',{month:'short',day:'numeric'});}
function until(iso){if(!iso)return'—';const d=new Date(iso)-Date.now();if(d<=0)return'Resetting…';const s=Math.floor(d/1000),m=Math.floor(s/60),h=Math.floor(m/60);return h>0?`${h}h ${m%60}m`:m>0?`${m}m ${s%60}s`:`${s}s`;}
function barcol(p){return p>=90?'#f56565':p>=65?'#f5a623':'#3dd68c';}
function statxt(p){return p>=90?'● Critical':p>=65?'● Moderate':'● Good';}
function esc(s){return String(s||'Conversation').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function pcol(p){return p>=15?'#f56565':p>=7?'#f5a623':'#3dd68c';}// per-chat bar color

function mbadge(m){
  if(!m)return'';
  const l=m.toLowerCase();
  if(l.includes('opus'))  return`<span class="mbadge mb-o">Opus</span>`;
  if(l.includes('haiku')) return`<span class="mbadge mb-h">Haiku</span>`;
  if(l.includes('sonnet'))return`<span class="mbadge mb-s">Sonnet</span>`;
  return`<span class="mbadge mb-u">${esc(m.split(' ')[0])}</span>`;
}

// Tabs
document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));
    document.querySelectorAll('.pnl').forEach(x=>x.classList.remove('on'));
    t.classList.add('on');
    $('p-'+t.dataset.p).classList.add('on');
    if(t.dataset.p==='history') renderHistory();
    if(t.dataset.p==='notif')   renderNotifTab();
  });
});

function setLive(on,msg,src){
  $('dot').className='dot '+(on?'on':'off');
  $('ltxt').textContent=msg;
  const s=$('lsrc');s.textContent=src||'—';s.style.color=on?'#3dd68c':'var(--mu)';
}

// Build a usage bar card HTML
function makeCard(id, label, pct, resetText, statusText, accent) {
  const c = barcol(pct);
  const cls = pct>=90?' crit':pct>=65?' warn':'';
  return `
  <div class="ucard${cls}" id="uc-${id}">
    <div class="uacc" style="background:${c}"></div>
    <div class="uhead">
      <span class="ulbl">${label}</span>
      <span class="upct" style="color:${c}">${Math.round(pct)}%</span>
    </div>
    <div class="ubar"><div class="ufill" style="width:${Math.min(pct,100)}%;background:linear-gradient(90deg,${c}44,${c})"></div></div>
    <div class="ufoot">
      <span style="color:var(--am)">${resetText}</span>
      <span class="usta" style="color:${c}">${statusText}</span>
    </div>
  </div>`;
}

// Build credits card HTML
function makeCreditsCard(used, max, pct, currency) {
  const c = barcol(pct);
  const cls = pct>=90?' crit':pct>=65?' warn':'';
  const rem = (max-used).toFixed(2);
  return `
  <div class="ucard${cls}">
    <div class="uacc" style="background:${c}"></div>
    <div class="uhead">
      <span class="ulbl">💳 Extra Credits</span>
      <span class="utag">${currency}</span>
    </div>
    <div class="unums">
      <span class="ubig" style="color:${c}">$${used.toFixed(2)}</span>
      <span class="uof">/ $${max}</span>
    </div>
    <div class="ubar"><div class="ufill" style="width:${Math.min(pct,100)}%;background:linear-gradient(90deg,${c}44,${c})"></div></div>
    <div class="ufoot">
      <span>$${rem} remaining</span>
      <span class="usta" style="color:${c}">${Math.round(pct)}%</span>
    </div>
  </div>`;
}

// ── Render Usage Tab ──────────────────────────────────────────────────────
function renderUsage(d) {
  $('nod').style.display = 'none';
  $('raw-wrap').style.display = 'block';
  setLive(true,'Live · just now','Usage API');

  let html = '';

  // 5-Hour
  if (d.five_hour) {
    const pct = +(d.five_hour.utilization||0);
    const reset = d.five_hour.resets_at;
    html += makeCard('5h','⏱ 5-Hour Window', pct, '', statxt(pct));
  }

  // 7-Day
  if (d.seven_day) {
    const pct = +(d.seven_day.utilization||0);
    const resetDate = d.seven_day.resets_at ? new Date(d.seven_day.resets_at).toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'}) : '';
    html += makeCard('7d','📅 7-Day Window', pct, resetDate?`Resets ${resetDate}`:'', statxt(pct));
  }

  // Claude Design (seven_day_omelette)
  if (d.seven_day_omelette) {
    const pct = +(d.seven_day_omelette.utilization||0);
    const resetDate = d.seven_day_omelette.resets_at ? new Date(d.seven_day_omelette.resets_at).toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'}) : '';
    html += makeCard('design','🎨 Claude Design', pct, resetDate?`Resets ${resetDate}`:'', statxt(pct));
  }

  // Extra Credits — show if exists regardless of is_enabled flag
  const ex = d.extra_usage;
  if (ex && (ex.used_credits != null || ex.monthly_limit != null)) {
    // API returns values in cents — divide by 100 for dollars
    const used = +(ex.used_credits||0) / 100;
    const max  = +(ex.monthly_limit||1000) / 100;
    const pct  = +(ex.utilization||0);
    html += makeCreditsCard(used, max, pct, ex.currency||'USD');
  }

  $('cards-area').innerHTML = html;
  $('raw-pre').textContent = JSON.stringify(d,null,2);
  $('fn').textContent = 'Synced '+new Date().toLocaleTimeString();

  // Start 5-hour countdown
  if (d.five_hour?.resets_at) {
    if (ticker) clearInterval(ticker);
    const card = $('uc-5h');
    const tick = () => {
      if (!card) return;
      const foot = card.querySelector('.ufoot span');
      if (foot) foot.textContent = 'Resets in '+until(d.five_hour.resets_at);
    };
    tick(); ticker = setInterval(tick,1000);
  }

  chrome.runtime.sendMessage({type:'usage_update',data:d}).catch(()=>{});
}

// ── Render History Tab ────────────────────────────────────────────────────
async function renderHistory() {
  const {sessionHistory:h=[]} = await chrome.storage.local.get(['sessionHistory']);
  const list = $('hlist'); if(!list) return;

  if(!h.length){
    $('hsum').style.display='none';
    list.innerHTML=`<div class="empty"><div class="ei">💬</div><p>No conversations tracked yet.<br/>Send messages on claude.ai —<br/>usage % appears per chat.</p></div>`;
    return;
  }

  const totalMsgs = h.reduce((a,x)=>a+(x.messages||0),0);
  const total5    = h.reduce((a,x)=>a+(x.utilFiveHr||0),0);
  $('hs-c').textContent = h.length;
  $('hs-m').textContent = totalMsgs;
  $('hs-5').textContent = total5>0 ? total5.toFixed(1)+'%' : '—';
  $('hsum').style.display='grid';

  const icons=['💬','🤔','📝','🔍','💡','🛠️','📊','✍️','🧠','⚡'];

  list.innerHTML = h.map((x,i)=>{
    const f5 = +(x.utilFiveHr||0);
    const f7 = +(x.utilSevenDay||0);
    const c5 = f5>=3?'#f56565':f5>=1?'#f5a623':'#3dd68c';
    const c7 = f7>=3?'#f56565':f7>=1?'#f5a623':'#3dd68c';
    const w5 = Math.min((f5/10)*100, 100);
    const w7 = Math.min((f7/5)*100,  100);
    const model = x.model||'';
    const fmt5 = f5>0 ? (f5<0.1?f5.toFixed(3):f5.toFixed(2))+'%' : '< 0.001%';
    const fmt7 = f7>0 ? (f7<0.1?f7.toFixed(3):f7.toFixed(2))+'%' : '< 0.001%';

    return `
    <div class="conv">
      <div class="ctop">
        <div class="cico">${icons[i%10]}</div>
        <div class="cinfo">
          <div class="cname">${esc(x.title)}</div>
          <div class="cmeta">
            ${x.messages||0} msg${(x.messages||0)!==1?'s':''} · ${rel(x.updatedAt)}
            ${model?mbadge(model):''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0">
          <a class="clink" href="https://claude.ai/chat/${x.convId}" target="_blank">Open ↗</a>
          <button class="clink" style="border:none;cursor:pointer;font-size:10px;padding:2px 8px" data-export="${esc(x.convId)}" data-title="${esc(x.title)}">⬇ Chat</button>
        </div>
      </div>
      <div class="cbars">
        <div class="brow">
          <span class="blbl">5-Hour</span>
          <div class="btrack"><div class="bfill" style="width:${w5}%;background:${c5}"></div></div>
          <span class="bval" style="color:${f5>0?c5:'var(--mu)'}">+${fmt5}</span>
        </div>
        <div class="brow">
          <span class="blbl">7-Day</span>
          <div class="btrack"><div class="bfill" style="width:${w7}%;background:${c7}"></div></div>
          <span class="bval" style="color:${f7>0?c7:'var(--mu)'}">+${fmt7}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  // Wire per-conversation export buttons
  list.querySelectorAll('[data-export]').forEach(btn => {
    btn.addEventListener('click', () => exportChat(btn.dataset.export, btn.dataset.title));
  });
}

// ── Export chat transcript ────────────────────────────────────────────────
async function exportChat(convId, fallbackTitle) {
  const btn = document.querySelector(`[data-export="${convId}"]`);
  if (btn) { btn.textContent = '⏳'; btn.disabled = true; }

  let claudeTab = null;
  try {
    const tabs = await chrome.tabs.query({ url: 'https://claude.ai/*' });
    claudeTab = tabs[0] || null;
  } catch(e) {}

  if (!claudeTab) {
    alert('Please open claude.ai in a tab first, then try exporting again.');
    if (btn) { btn.textContent = '⬇'; btn.disabled = false; }
    return;
  }

  chrome.tabs.sendMessage(claudeTab.id, { type: 'export_chat', convId }, resp => {
    if (!resp?.ok || !resp.data) {
      alert('Could not fetch conversation. Make sure you are logged into claude.ai.');
      if (btn) { btn.textContent = '⬇'; btn.disabled = false; }
      return;
    }

    const { title, messages } = resp.data;
    const safeTitle = title || fallbackTitle || 'Conversation';

    // Format as clean markdown transcript
    let md = `# ${safeTitle}\n`;
    md += `Exported: ${new Date().toLocaleString()}\n`;
    md += `URL: https://claude.ai/chat/${convId}\n\n`;
    md += `---\n\n`;

    messages.forEach(m => {
      // Determine role
      const isHuman = (m.sender || m.role || '') === 'human';
      const role = isHuman ? '### You' : '### Claude';

      // Extract text — content can be a string or an array of blocks
      let text = '';
      if (typeof m.content === 'string') {
        text = m.content;
      } else if (Array.isArray(m.content)) {
        text = m.content
          .filter(c => c.type === 'text')
          .map(c => c.text || '')
          .join('\n');
      } else if (m.text) {
        text = m.text;
      }

      if (text.trim()) {
        md += `${role}\n\n${text.trim()}\n\n---\n\n`;
      }
    });

    // Download as .md file
    const blob = new Blob([md], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = safeTitle.slice(0, 50).replace(/[^a-z0-9\s\-_]/gi, '').trim().replace(/\s+/g, '-') + '.md';
    a.click();
    URL.revokeObjectURL(url);

    if (btn) { btn.textContent = '✓'; btn.style.color = '#3dd68c'; }
    setTimeout(() => { if (btn) { btn.textContent = '⬇'; btn.style.color = ''; btn.disabled = false; } }, 2000);
  });
}

// ── Export all history as CSV (summary only) ─────────────────────────────
async function exportHistory(){
  const {sessionHistory:h=[]} = await chrome.storage.local.get(['sessionHistory']);
  const rows = [['Title','URL','Model','Messages','5hr Used','7-Day Used','Last Active']];
  h.forEach(x => {
    rows.push([
      `"${(x.title||'Conversation').replace(/"/g,'""')}"`,
      `https://claude.ai/chat/${x.convId}`,
      x.model||'unknown',
      x.messages||0,
      (x.utilFiveHr||0).toFixed(3)+'%',
      (x.utilSevenDay||0).toFixed(3)+'%',
      x.updatedAt ? new Date(x.updatedAt).toLocaleString() : ''
    ]);
  });
  const csv = rows.map(r=>r.join(',')).join('\r\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download=`claude-chats-${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
  const btn=$('export-btn');
  btn.textContent='✓ Exported';btn.style.color='#3dd68c';
  setTimeout(()=>{btn.textContent='⬇ Export';btn.style.color='';},2000);
}

// ── Init ──────────────────────────────────────────────────────────────────
async function init(){
  setLive(false,'Loading…','—');

  // Ask content script for a fresh API pull so we never show a stale snapshot
  try {
    const tabs = await chrome.tabs.query({url:'https://claude.ai/*'});
    if(tabs[0]) chrome.tabs.sendMessage(tabs[0].id,{type:'fetch_now'}).catch(()=>{});
  } catch(e){}

  // Give content script up to 1.2s to write fresh data, then render
  await new Promise(r=>setTimeout(r,1200));

  const {realUsage} = await chrome.storage.local.get(['realUsage']);
  const today = new Date().toISOString().split('T')[0];
  if(realUsage?.raw && realUsage.date===today){
    renderUsage(realUsage.raw);
  } else {
    setLive(false,'Open claude.ai to sync','—');
  }
}

// Poll every 3s
setInterval(async()=>{
  const {realUsage} = await chrome.storage.local.get(['realUsage']);
  const today = new Date().toISOString().split('T')[0];
  if(realUsage?.raw && realUsage.date===today) renderUsage(realUsage.raw);
  if(document.querySelector('.tab.on')?.dataset?.p==='history') renderHistory();
},3000);

$('open-claude').onclick = ()=>{chrome.tabs.create({url:'https://claude.ai'});window.close();};
$('rbtn').onclick = async()=>{
  $('rbtn').classList.add('spinning');
  const tabs = await chrome.tabs.query({url:'https://claude.ai/*'});
  if(tabs[0]) chrome.tabs.sendMessage(tabs[0].id,{type:'refetch'}).catch(()=>{});
  setTimeout(async()=>{
    await init();
    if(document.querySelector('.tab.on')?.dataset?.p==='history') await renderHistory();
    $('rbtn').classList.remove('spinning');
  },2500);
};
$('raw-btn').onclick=()=>{
  const p=$('raw-pre'),b=$('raw-btn');
  const show=p.style.display==='none';
  p.style.display=show?'block':'none';
  b.textContent=show?'Hide raw ▴':'View raw API response ▾';
};
$('export-btn').onclick = exportHistory;
$('clr-btn').onclick = async()=>{
  await chrome.storage.local.remove(['sessionHistory']);
  await renderHistory();
  $('clr-btn').textContent='✓ Cleared';$('clr-btn').style.color='#3dd68c';
  setTimeout(()=>{$('clr-btn').textContent='✕ Clear';$('clr-btn').style.color='';},1500);
};

init();

// ── NOTIFICATIONS TAB ─────────────────────────────────────────────────────
const GUMROAD_URL = 'https://ramakrishna27.gumroad.com/l/hjwyk';
const THRESHOLDS  = [25, 50, 75, 90];

// Simple local key validation — order_id format from Gumroad
function isValidKey(k) {
  if (!k) return false;
  const clean = k.trim().toUpperCase();
  // Accept any non-empty key that looks like Gumroad's format
  // Gumroad sends order IDs like "ABCD-1234" or longer strings
  return clean.length >= 6;
}

async function isUnlocked() {
  const { notifKey } = await chrome.storage.local.get(['notifKey']);
  return notifKey && isValidKey(notifKey);
}

const DEFAULT_THRESHOLDS = [
  { pct: 25, label: '😊 25%', enabled: true  },
  { pct: 50, label: '⚠️ 50%', enabled: true  },
  { pct: 75, label: '🔶 75%', enabled: true  },
  { pct: 90, label: '🚨 90%', enabled: true  },
];

async function getThresholds() {
  const { customThresholds } = await chrome.storage.local.get(['customThresholds']);
  return customThresholds || DEFAULT_THRESHOLDS;
}

async function saveThresholds(list) {
  await chrome.storage.local.set({ customThresholds: list });
}

async function renderNotifTab() {
  const container = $('notif-content');
  if (!container) return;

  const unlocked = await isUnlocked();

  if (!unlocked) {
    container.innerHTML = `
      <div class="lock-card">
        <div class="lock-icon">🔔</div>
        <div class="lock-title">Custom Alert Thresholds</div>
        <div class="lock-desc">Never get cut off mid-conversation. Set your own alert points and get desktop notifications before you hit a limit.</div>
        <div class="lock-features">
          <div class="lock-feat">Set any threshold — 60%, 80%, whatever you want</div>
          <div class="lock-feat">Toggle alerts on/off per threshold</div>
          <div class="lock-feat">Alerts for 5-Hour, 7-Day, Design & Credits</div>
          <div class="lock-feat">Desktop notifications even when tab is in background</div>
        </div>
        <button class="unlock-btn" id="buy-btn">
          🔓 Unlock Custom Alerts — $3
          <div class="unlock-price">One-time · Instant unlock · No subscription</div>
        </button>
      </div>

      <div class="key-wrap">
        <div class="key-title">Already purchased? Enter your order ID:</div>
        <div class="key-row">
          <input class="key-input" id="key-input" placeholder="From your Gumroad receipt email…" type="text"/>
          <button class="key-btn" id="key-submit">Unlock</button>
        </div>
        <div class="key-msg" id="key-msg"></div>
      </div>`;

    $('buy-btn').onclick = () => chrome.tabs.create({ url: GUMROAD_URL });
    $('key-submit').onclick = async () => {
      const key = $('key-input').value.trim();
      const msg = $('key-msg');
      if (!isValidKey(key)) {
        msg.textContent = '✕ Invalid — check your Gumroad receipt email';
        msg.className = 'key-msg err'; return;
      }
      await chrome.storage.local.set({ notifKey: key });
      msg.textContent = '✓ Unlocked! Custom alerts are now active.';
      msg.className = 'key-msg ok';
      setTimeout(renderNotifTab, 1000);
    };
    $('key-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('key-submit').click(); });
    return;
  }

  const { realUsage } = await chrome.storage.local.get(['realUsage']);
  const d    = realUsage?.raw;
  const pct5 = d?.five_hour?.utilization  || 0;
  const pct7 = d?.seven_day?.utilization  || 0;
  const thresholds = await getThresholds();

  // Sort thresholds numerically
  thresholds.sort((a,b) => a.pct - b.pct);

  function threshColor(t) {
    return t >= 90 ? '#f56565' : t >= 75 ? '#f5a623' : t >= 50 ? '#3dd68c' : '#60a5fa';
  }

  const rows = thresholds.map((t, i) => {
    const fired = pct5 >= t.pct || pct7 >= t.pct;
    const c     = threshColor(t.pct);
    return `
      <div class="thresh" style="opacity:${t.enabled?1:.45}">
        <label class="thresh-toggle">
          <input type="checkbox" class="thresh-cb" data-i="${i}" ${t.enabled?'checked':''}>
          <span class="thresh-lbl" style="color:${t.enabled?'var(--tx)':'var(--mu)'}">${t.label} usage</span>
        </label>
        <span class="thresh-val" style="color:${fired&&t.enabled?c:'var(--mu)'}">${fired&&t.enabled?'● Fired':'○ Waiting'}</span>
        <button class="thresh-del" data-i="${i}" title="Remove">×</button>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="notif-active">
      <div class="notif-header">
        <span class="notif-title">🔔 Alert Thresholds</span>
        <span class="notif-badge">Active</span>
      </div>
      <div class="notif-sub">Current: 5-hr <strong style="color:var(--tx)">${Math.round(pct5)}%</strong> · 7-day <strong style="color:var(--tx)">${Math.round(pct7)}%</strong></div>
      <div class="thresh-list" id="thresh-list">${rows}</div>
    </div>

    <div class="key-wrap">
      <div class="key-title">Add custom threshold</div>
      <div class="key-row">
        <input class="key-input" id="custom-pct" type="number" min="1" max="99" placeholder="e.g. 60" style="width:80px;flex:none"/>
        <span style="font-size:12px;color:var(--tx2);align-self:center">%</span>
        <input class="key-input" id="custom-label" type="text" placeholder="Label (e.g. Heads up!)" style="flex:1"/>
        <button class="key-btn" id="add-thresh">Add</button>
      </div>
      <div class="key-msg" id="add-msg"></div>
    </div>

    <div class="key-wrap" style="margin-top:0">
      <div class="key-title">Reset to defaults</div>
      <button class="hbtn clr" id="reset-thresh" style="width:100%;margin-top:4px;font-size:11px">↺ Reset to 25 / 50 / 75 / 90%</button>
      <button class="hbtn clr" id="revoke-key" style="width:100%;margin-top:6px;font-size:11px">🗑 Remove license key</button>
    </div>`;

  // Toggle enabled/disabled
  container.querySelectorAll('.thresh-cb').forEach(cb => {
    cb.addEventListener('change', async () => {
      const i = +cb.dataset.i;
      const list = await getThresholds();
      list[i].enabled = cb.checked;
      await saveThresholds(list);
      renderNotifTab();
    });
  });

  // Delete threshold
  container.querySelectorAll('.thresh-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const i = +btn.dataset.i;
      const list = await getThresholds();
      list.splice(i, 1);
      await saveThresholds(list);
      // Clear fired flags for removed threshold
      await chrome.storage.local.remove([`notified_five_hour_${thresholds[i].pct}`,`notified_seven_day_${thresholds[i].pct}`]);
      renderNotifTab();
    });
  });

  // Add custom threshold
  $('add-thresh').onclick = async () => {
    const pctVal   = parseInt($('custom-pct').value);
    const labelVal = $('custom-label').value.trim();
    const msg      = $('add-msg');
    if (isNaN(pctVal) || pctVal < 1 || pctVal > 99) {
      msg.textContent = '✕ Enter a number between 1–99'; msg.className = 'key-msg err'; return;
    }
    const list = await getThresholds();
    if (list.find(t => t.pct === pctVal)) {
      msg.textContent = `✕ ${pctVal}% already exists`; msg.className = 'key-msg err'; return;
    }
    const emoji = pctVal >= 90 ? '🚨' : pctVal >= 75 ? '🔶' : pctVal >= 50 ? '⚠️' : '😊';
    list.push({ pct: pctVal, label: `${emoji} ${pctVal}%${labelVal?' — '+labelVal:''}`, enabled: true });
    await saveThresholds(list);
    msg.textContent = `✓ Alert added at ${pctVal}%`; msg.className = 'key-msg ok';
    setTimeout(renderNotifTab, 800);
  };

  $('custom-pct').addEventListener('keydown', e => { if (e.key==='Enter') $('add-thresh').click(); });

  // Reset to defaults
  $('reset-thresh').onclick = async () => {
    await chrome.storage.local.remove(['customThresholds']);
    renderNotifTab();
  };

  $('revoke-key').onclick = async () => {
    await chrome.storage.local.remove(['notifKey']);
    renderNotifTab();
  };
}
