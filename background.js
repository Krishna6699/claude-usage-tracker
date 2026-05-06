// Open onboarding on first install
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
  }
});



async function getThresholdPcts() {
  const { customThresholds } = await chrome.storage.local.get(['customThresholds']);
  if (customThresholds?.length) {
    return customThresholds.filter(t => t.enabled).map(t => t.pct);
  }
  return DEFAULT_THRESHOLDS;
}

async function maybeNotify(type, label, pct) {
  if (pct == null) return;
  const thresholds = await getThresholdPcts();

  for (const threshold of thresholds) {
    if (pct >= threshold) {
      const key = `notified_${type}_${threshold}`;
      const stored = await chrome.storage.local.get([key]);
      if (!stored[key]) {
        const emoji = threshold >= 90 ? '🚨' : threshold >= 75 ? '🔶' : threshold >= 50 ? '⚠️' : '😊';
        chrome.notifications.create(`${type}_${threshold}`, {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: `${emoji} Claude ${label} at ${threshold}%`,
          message: `You've used ${Math.round(pct)}% of your ${label}.${threshold >= 90 ? ' Almost out!' : ''}`,
          priority: threshold >= 90 ? 2 : 1
        });
        await chrome.storage.local.set({ [key]: true });
      }
    }
  }
}

// Reset notification flags at midnight
chrome.alarms.create('midnightReset', {
  when: (() => { const d = new Date(); d.setHours(24,0,0,0); return d.getTime(); })(),
  periodInMinutes: 1440
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'midnightReset') {
    chrome.storage.local.get(null, items => {
      const keys = Object.keys(items).filter(k => k.startsWith('notified_'));
      if (keys.length) chrome.storage.local.remove(keys);
    });
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'usage_update' && msg.data) {
    const d = msg.data;
    if (d.five_hour)          maybeNotify('five_hour', '5-Hour Limit',  d.five_hour.utilization);
    if (d.seven_day)          maybeNotify('seven_day', '7-Day Limit',   d.seven_day.utilization);
    if (d.seven_day_omelette) maybeNotify('design',    'Claude Design', d.seven_day_omelette.utilization);
    if (d.extra_usage?.is_enabled) maybeNotify('credits', 'Extra Credits', d.extra_usage.utilization);

    // Badge on toolbar icon
    const pct   = d.five_hour?.utilization ?? 0;
    const color = pct >= 90 ? '#f87171' : pct >= 65 ? '#fbbf24' : '#4ade80';
    chrome.action.setBadgeText({ text: Math.round(pct) + '%' });
    chrome.action.setBadgeBackgroundColor({ color });
  }
});
