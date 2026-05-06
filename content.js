(function () {
  if (window.__cu) return;
  window.__cu = true;

  let orgId = null;
  let domMsgCount = 0;

  function getConvId() {
    const m = location.pathname.match(/\/chat\/([a-zA-Z0-9\-]+)/);
    return m ? m[1] : null;
  }

  // Fetch real conversation title from API
  async function fetchConvTitle(convId) {
    if (!orgId || !convId) return null;
    try {
      const res = await fetch(`/api/organizations/${orgId}/chat_conversations/${convId}`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return null;
      const data = await res.json();
      // Try every possible field name
      const title = data.name || data.title || data.subject || data.chat_title ||
                    data.conversation_title || data.display_name;
      return title ? String(title).slice(0, 60) : null;
    } catch(e) { return null; }
  }

  // Fetch full conversation messages for export
  async function fetchConvMessages(convId) {
    if (!orgId || !convId) return null;
    try {
      const res = await fetch(`/api/organizations/${orgId}/chat_conversations/${convId}`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return null;
      const data = await res.json();
      // Extract messages — Claude API stores them under chat_messages
      const msgs = data.chat_messages || data.messages || [];
      const title = data.name || data.title || data.subject || data.display_name || 'Conversation';
      return { title, messages: msgs };
    } catch(e) { return null; }
  }

  // Fallback title from DOM/document
  function getDOMTitle() {
    const raw = document.title?.trim();
    if (raw) {
      const cleaned = raw.replace(/\s*[-–|]?\s*Claude.*$/i, '').trim();
      if (cleaned.length > 2 && cleaned.toLowerCase() !== 'claude') return cleaned.slice(0, 60);
    }
    return null;
  }

  function getModel() {
    const tries = [
      '[data-testid="model-selector-dropdown"] span',
      '[class*="ModelPicker"] button span',
      '[class*="model-selector"] span',
      '[class*="modelName"]',
      'button[aria-label*="model"] span',
    ];
    for (const sel of tries) {
      const t = document.querySelector(sel)?.textContent?.trim();
      if (t && t.length > 1 && t.length < 50) return t;
    }
    return '';
  }

  async function fetchAndStore() {
    if (!orgId) return null;
    try {
      const res = await fetch(`/api/organizations/${orgId}/usage`, { credentials: 'include' });
      if (!res.ok) return null;
      const raw = await res.json();
      chrome.storage.local.set({
        realUsage: { raw, orgId, lastUpdated: Date.now(), date: new Date().toISOString().split('T')[0] }
      });
      return raw;
    } catch(e) { return null; }
  }

  async function getOrg() {
    const c = await chrome.storage.local.get(['orgId']);
    if (c.orgId) { orgId = c.orgId; return; }
    try {
      const res  = await fetch('/api/organizations', { credentials: 'include' });
      const data = await res.json();
      const orgs = Array.isArray(data) ? data : (data.organizations || [data]);
      const id   = orgs[0]?.uuid || orgs[0]?.id;
      if (id) { orgId = id; chrome.storage.local.set({ orgId: id }); }
    } catch(e) {}
  }

  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const r = await origFetch.apply(this, args);
    if (!orgId) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      const m = url.match(/organizations\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
      if (m) { orgId = m[1]; chrome.storage.local.set({ orgId: m[1] }); fetchAndStore(); }
    }
    return r;
  };

  async function updateHistory(convId, msgCount, deltaFive, deltaSeven, model) {
    // Get real title: API first, DOM fallback
    const apiTitle = await fetchConvTitle(convId);
    const title    = apiTitle || getDOMTitle() || 'Conversation';

    const stored  = await chrome.storage.local.get(['sessionHistory']);
    const history = stored.sessionHistory || [];
    const idx     = history.findIndex(h => h.convId === convId);
    const now     = Date.now();

    if (idx >= 0) {
      history[idx].messages     = msgCount;
      // Accumulate delta; keep existing if new delta is 0
      if (deltaFive  > 0) history[idx].utilFiveHr   = +((history[idx].utilFiveHr  || 0) + deltaFive).toFixed(3);
      if (deltaSeven > 0) history[idx].utilSevenDay = +((history[idx].utilSevenDay || 0) + deltaSeven).toFixed(3);
      history[idx].updatedAt = now;
      // Only update title if we got a real one (not fallback)
      if (title !== 'Conversation') history[idx].title = title;
      if (model) history[idx].model = model;
      history.unshift(history.splice(idx, 1)[0]);
    } else {
      history.unshift({
        convId,
        title,
        model:        model || '',
        messages:     msgCount,
        utilFiveHr:   +(deltaFive  || 0).toFixed(3),
        utilSevenDay: +(deltaSeven || 0).toFixed(3),
        createdAt:    now,
        updatedAt:    now
      });
    }
    chrome.storage.local.set({ sessionHistory: history.slice(0, 10) });
  }

  function countHumanMsgs() {
    for (const sel of [
      '[data-testid="human-turn"]','[class*="human-turn"]',
      '[class*="HumanTurn"]','[class*="user-message"]',
      '[data-message-author-role="user"]'
    ]) {
      const els = document.querySelectorAll(sel);
      if (els.length) return els.length;
    }
    return 0;
  }

  function setupDOM() {
    if (window.__cuObs) window.__cuObs.disconnect();
    // Set initial count so existing messages don't trigger false positives
    domMsgCount = countHumanMsgs();

    window.__cuObs = new MutationObserver(() => {
      const convId = getConvId();
      if (!convId) return;
      const count = countHumanMsgs();
      if (count > domMsgCount) {
        domMsgCount = count;
        const model = getModel();
        // Snapshot before response
        fetchAndStore().then(before => {
          // Wait 6s for Claude to finish responding
          setTimeout(async () => {
            const after = await fetchAndStore();
            const d5 = (after && before)
              ? Math.max(0, (after.five_hour?.utilization  || 0) - (before.five_hour?.utilization  || 0))
              : 0;
            const d7 = (after && before)
              ? Math.max(0, (after.seven_day?.utilization || 0) - (before.seven_day?.utilization || 0))
              : 0;
            await updateHistory(convId, count, d5, d7, model);
          }, 6000);
        });
      }
    });
    window.__cuObs.observe(document.body, { childList: true, subtree: true });
  }

  async function init() {
    await getOrg();
    await fetchAndStore();
    setupDOM();
    setInterval(fetchAndStore, 30000);
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'refetch')   { chrome.storage.local.remove(['orgId']); orgId = null; init(); }
    if (msg.type === 'fetch_now') { fetchAndStore(); }
    if (msg.type === 'export_chat') {
      fetchConvMessages(msg.convId).then(data => sendResponse({ ok: !!data, data }));
      return true; // keep message channel open for async response
    }
  });

  let lastPath = location.pathname;
  new MutationObserver(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      // On nav, re-init DOM count for new page
      setTimeout(() => { domMsgCount = countHumanMsgs(); }, 500);
      fetchAndStore();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  init();
})();
