// ZenWork Chrome Extension Background Service Worker
// Handles: tab tracking, idle detection, alarms, offline syncing

let activeTabDomain = null;
let activeTabStartTime = Date.now();
let lastIdleState = 'active';

const DEFAULT_CATEGORIES = {
  'github.com': 'productive',
  'gitlab.com': 'productive',
  'stackoverflow.com': 'productive',
  'notion.so': 'productive',
  'figma.com': 'productive',
  'linkedin.com': 'neutral',
  'google.com': 'neutral',
  'youtube.com': 'distracting',
  'facebook.com': 'distracting',
  'instagram.com': 'distracting',
  'twitter.com': 'distracting',
  'x.com': 'distracting',
  'reddit.com': 'distracting'
};

function getCategory(domain, customCategories = {}) {
  const merged = { ...DEFAULT_CATEGORIES, ...customCategories };
  if (merged[domain]) return merged[domain];
  for (const key in merged) {
    if (domain.endsWith('.' + key)) {
      return merged[key];
    }
  }
  return 'neutral';
}

function getDomainFromUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol.startsWith('http')) {
      return parsed.hostname;
    }
  } catch (e) {
    // Ignore internal chrome pages
  }
  return null;
}

// Log active time and append to sync queue
async function logCurrentTime() {
  if (!activeTabDomain || lastIdleState !== 'active') return;

  const duration = Math.round((Date.now() - activeTabStartTime) / 1000);
  if (duration <= 5) return; // ignore sessions shorter than 5 seconds

  const storage = await chrome.storage.local.get(['zw_events_queue', 'zw_user_settings']);
  const customCategories = storage.zw_user_settings?.categories || {};
  const category = getCategory(activeTabDomain, customCategories);

  const newEvent = {
    domain: activeTabDomain,
    category: category,
    duration_seconds: duration,
    start_time: new Date(activeTabStartTime).toISOString(),
    work_date: new Date(activeTabStartTime).toISOString().split('T')[0]
  };

  const queue = storage.zw_events_queue || [];
  queue.push(newEvent);
  if (queue.length > 1000) queue.shift(); // prevent overflow

  await chrome.storage.local.set({ zw_events_queue: queue });
  await updateTodayStats(newEvent);
}

// Keep running totals for popup display
async function updateTodayStats(newEvent) {
  const todayStr = new Date().toISOString().split('T')[0];
  const storage = await chrome.storage.local.get(['zw_today_stats']);
  let stats = storage.zw_today_stats || { date: todayStr, productive: 0, neutral: 0, distracting: 0, domains: {} };

  if (stats.date !== todayStr) {
    stats = { date: todayStr, productive: 0, neutral: 0, distracting: 0, domains: {} };
  }

  if (newEvent.category === 'productive') stats.productive += newEvent.duration_seconds;
  else if (newEvent.category === 'neutral') stats.neutral += newEvent.duration_seconds;
  else if (newEvent.category === 'distracting') stats.distracting += newEvent.duration_seconds;

  stats.domains[newEvent.domain] = (stats.domains[newEvent.domain] || 0) + newEvent.duration_seconds;

  await chrome.storage.local.set({ zw_today_stats: stats });
}

// Handle browser tab changes
async function handleTabChanged(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const domain = getDomainFromUrl(tab.url);

    await logCurrentTime();

    activeTabDomain = domain;
    activeTabStartTime = Date.now();

    await checkFocusOverlay(tabId, domain);
  } catch (e) {
    await logCurrentTime();
    activeTabDomain = null;
  }
}

// Block distracting pages if Focus Pomodoro is running
async function checkFocusOverlay(tabId, domain) {
  if (!domain) return;
  const storage = await chrome.storage.local.get(['zw_focus_session', 'zw_user_settings']);
  
  if (storage.zw_focus_session?.active) {
    const customCategories = storage.zw_user_settings?.categories || {};
    const category = getCategory(domain, customCategories);

    if (category === 'distracting') {
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'BLOCK_SITE', domain: domain });
      } catch (err) {
        // Overlay injection failed or script not ready
      }
    }
  }
}

// Event Listeners
chrome.tabs.onActivated.addListener((activeInfo) => {
  handleTabChanged(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id === tabId) {
        handleTabChanged(tabId);
      }
    });
  }
});

// Idle timeout handling
chrome.idle.setDetectionInterval(120); // 2 minutes
chrome.idle.onStateChanged.addListener(async (newState) => {
  lastIdleState = newState;
  if (newState === 'idle' || newState === 'locked') {
    await logCurrentTime();
    activeTabDomain = null;
  } else {
    activeTabStartTime = Date.now();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        activeTabDomain = getDomainFromUrl(tabs[0].url);
      }
    });
  }
});

// Initialization
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('sync-alarm', { periodInMinutes: 5 });
  console.log('ZenWork background engine started.');
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'sync-alarm') {
    await performSync();
  }
});

// Perform data sync to live Web Dashboard API
async function performSync() {
  await logCurrentTime();
  activeTabStartTime = Date.now();

  const storage = await chrome.storage.local.get(['zw_events_queue', 'zw_user_settings', 'zw_session_token']);
  const queue = storage.zw_events_queue || [];
  const serverUrl = storage.zw_user_settings?.serverUrl || 'http://localhost:3000';
  const token = storage.zw_session_token;

  if (queue.length === 0) return;
  if (!token) {
    console.warn('[ZenWork] Sync aborted: Auth session token not found.');
    return;
  }

  try {
    const response = await fetch(`${serverUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ events: queue })
    });

    if (response.ok) {
      console.log(`[ZenWork] Successfully synced ${queue.length} logs.`);
      await chrome.storage.local.set({ zw_events_queue: [] });
    } else {
      console.error('[ZenWork] Sync HTTP failed:', response.statusText);
    }
  } catch (error) {
    console.error('[ZenWork] Sync offline error:', error);
  }
}

// Messaging router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. Sync session token from webpage automatically
  if (message.type === 'SYNC_TOKEN') {
    chrome.storage.local.set({ zw_session_token: message.token }).then(() => {
      console.log('[ZenWork] Session token synced from dashboard.');
      sendResponse({ status: 'token_synced' });
    });
    return true;
  }

  // 2. Start Pomodoro Focus Timer
  if (message.type === 'START_FOCUS') {
    chrome.storage.local.set({ 
      zw_focus_session: { active: true, startTime: Date.now(), duration: message.duration }
    }).then(() => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          const domain = getDomainFromUrl(tabs[0].url);
          checkFocusOverlay(tabs[0].id, domain);
        }
      });
      sendResponse({ status: 'ok' });
    });
    return true;
  }

  // 3. Stop Focus Timer
  if (message.type === 'STOP_FOCUS') {
    chrome.storage.local.set({ zw_focus_session: null }).then(() => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.reload(tabs[0].id);
        }
      });
      sendResponse({ status: 'ok' });
    });
    return true;
  }
});
