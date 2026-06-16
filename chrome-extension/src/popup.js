// ZenWork Chrome Extension Popup Controller

let timerInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadStats();
  await checkActiveFocusSession();
  setupEventListeners();
  updateDashboardLink();
});

// Update link to point to user settings server or fallback
async function updateDashboardLink() {
  const storage = await chrome.storage.local.get(['zw_user_settings']);
  const serverUrl = storage.zw_user_settings?.serverUrl || 'http://localhost:3000';
  document.getElementById('open-dashboard').href = `${serverUrl}/dashboard`;
}

function setupEventListeners() {
  const presets = document.querySelectorAll('.preset-btn');
  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      presets.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.getElementById('start-btn').addEventListener('click', startFocusSession);
  document.getElementById('stop-btn').addEventListener('click', stopFocusSession);
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

async function loadStats() {
  const todayStr = new Date().toISOString().split('T')[0];
  const storage = await chrome.storage.local.get(['zw_today_stats']);
  const stats = storage.zw_today_stats;

  if (!stats || stats.date !== todayStr) {
    renderEmptyStats();
    return;
  }

  const productive = stats.productive || 0;
  const neutral = stats.neutral || 0;
  const distracting = stats.distracting || 0;
  const total = productive + neutral + distracting;

  if (total === 0) {
    renderEmptyStats();
    return;
  }

  const score = Math.round(((productive + (neutral * 0.5)) / total) * 100);

  const scoreCircle = document.getElementById('score-circle');
  const scoreText = document.getElementById('score-text');
  scoreText.textContent = score;
  scoreCircle.setAttribute('stroke-dasharray', `${score}, 100`);

  const pPct = (productive / total) * 100;
  const nPct = (neutral / total) * 100;
  const dPct = (distracting / total) * 100;

  document.getElementById('bar-productive').style.width = `${pPct}%`;
  document.getElementById('bar-neutral').style.width = `${nPct}%`;
  document.getElementById('bar-distracting').style.width = `${dPct}%`;

  document.getElementById('txt-productive').textContent = formatDuration(productive);
  document.getElementById('txt-neutral').textContent = formatDuration(neutral);
  document.getElementById('txt-distracting').textContent = formatDuration(distracting);

  renderTopDomains(stats.domains);
}

function renderEmptyStats() {
  document.getElementById('score-text').textContent = '0';
  document.getElementById('score-circle').setAttribute('stroke-dasharray', '0, 100');
  document.getElementById('bar-productive').style.width = '0%';
  document.getElementById('bar-neutral').style.width = '0%';
  document.getElementById('bar-distracting').style.width = '0%';
  
  document.getElementById('txt-productive').textContent = '0m';
  document.getElementById('txt-neutral').textContent = '0m';
  document.getElementById('txt-distracting').textContent = '0m';
}

const DEFAULT_DOMAINS = {
  'github.com': 'productive', 'gitlab.com': 'productive', 'stackoverflow.com': 'productive',
  'linkedin.com': 'neutral', 'google.com': 'neutral',
  'youtube.com': 'distracting', 'facebook.com': 'distracting', 'instagram.com': 'distracting',
  'reddit.com': 'distracting', 'x.com': 'distracting', 'twitter.com': 'distracting'
};

function getCategory(domain) {
  if (DEFAULT_DOMAINS[domain]) return DEFAULT_DOMAINS[domain];
  for (const key in DEFAULT_DOMAINS) {
    if (domain.endsWith('.' + key)) return DEFAULT_DOMAINS[key];
  }
  return 'neutral';
}

function renderTopDomains(domainsMap) {
  const listElement = document.getElementById('domain-list');
  listElement.innerHTML = '';

  if (!domainsMap || Object.keys(domainsMap).length === 0) {
    listElement.innerHTML = '<li class="empty-state">No sites tracked yet today.</li>';
    return;
  }

  const sorted = Object.entries(domainsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  sorted.forEach(([domain, duration]) => {
    const category = getCategory(domain);
    const item = document.createElement('li');
    item.className = 'domain-item';
    item.innerHTML = `
      <span class="domain-name" title="${domain}">${domain}</span>
      <div class="domain-bar">
        <span class="category-tag ${category}">${category}</span>
        <span class="domain-duration">${formatDuration(duration)}</span>
      </div>
    `;
    listElement.appendChild(item);
  });
}

async function checkActiveFocusSession() {
  const storage = await chrome.storage.local.get(['zw_focus_session']);
  const session = storage.zw_focus_session;

  if (session && session.active) {
    showRunningFocusTimer(session.startTime, session.duration);
  } else {
    showFocusSetup();
  }
}

function startFocusSession() {
  const activePreset = document.querySelector('.preset-btn.active');
  const duration = parseInt(activePreset.getAttribute('data-duration'), 10) || 25;

  chrome.runtime.sendMessage({ type: 'START_FOCUS', duration: duration }, (response) => {
    if (response && response.status === 'ok') {
      showRunningFocusTimer(Date.now(), duration);
    }
  });
}

function stopFocusSession() {
  chrome.runtime.sendMessage({ type: 'STOP_FOCUS' }, (response) => {
    if (response && response.status === 'ok') {
      showFocusSetup();
    }
  });
}

function showRunningFocusTimer(startTime, durationMinutes) {
  document.getElementById('focus-setup').classList.add('hidden');
  document.getElementById('focus-running').classList.remove('hidden');

  const durationSeconds = durationMinutes * 60;

  if (timerInterval) clearInterval(timerInterval);

  const updateTimer = () => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const remainingSeconds = durationSeconds - elapsedSeconds;

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      showFocusSetup();
      chrome.notifications.create('focus-complete', {
        type: 'basic',
        iconUrl: '../icons/icon128.png',
        title: 'Focus Session Complete! 🎉',
        message: `Excellent job! You stayed focused for ${durationMinutes} minutes. Take a break.`
      });
      chrome.storage.local.set({ zw_focus_session: null });
      return;
    }

    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    document.getElementById('timer-display').textContent = 
      `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

function showFocusSetup() {
  if (timerInterval) clearInterval(timerInterval);
  document.getElementById('focus-setup').classList.remove('hidden');
  document.getElementById('focus-running').classList.add('hidden');
}
