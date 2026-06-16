// ZenWork Extension Content Script

// 1. Sync session token automatically from website to extension storage
function syncSessionToken() {
  const isTargetSite = window.location.hostname === 'localhost' || 
                       window.location.hostname.endsWith('vercel.app');
  if (isTargetSite) {
    const token = localStorage.getItem('zw_session_token');
    if (token) {
      chrome.runtime.sendMessage({ type: 'SYNC_TOKEN', token: token }, (response) => {
        if (chrome.runtime.lastError) {
          // Extension background not ready
        } else {
          console.log('[ZenWork] Authentication token synchronized.');
        }
      });
    }
  }
}

// Run token sync on load
syncSessionToken();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BLOCK_SITE') {
    showFocusOverlay(message.domain);
  }
});

// Render the focus blocker overlay
function showFocusOverlay(domain) {
  if (document.getElementById('zenwork-focus-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'zenwork-focus-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: #0f0f1a;
    color: #e8e8f0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  `;

  overlay.innerHTML = `
    <div style="text-align: center; max-width: 500px; padding: 40px; border-radius: 20px; background: #16213e; border: 1px solid #2a2a4a; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <div style="font-size: 64px; margin-bottom: 20px; animation: pulse 2s infinite;">🧘</div>
      <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 12px; color: #4a90d9;">Find Your Zen!</h1>
      <p style="font-size: 15px; color: #8888aa; margin-bottom: 30px; line-height: 1.6;">
        You blocked <strong>${domain}</strong> to help you focus. This session will end when the timer runs out.
      </p>
      <div style="display: flex; justify-content: center; gap: 16px;">
        <button id="zenwork-close-tab" style="padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: 10px; border: none; background: linear-gradient(135deg, #4a90d9, #8e44ad); color: white; cursor: pointer; transition: transform 0.2s;">
          Close Tab
        </button>
        <button id="zenwork-stop-focus" style="padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: 10px; border: 1px solid #2a2a4a; background: #1a1a2e; color: #e8e8f0; cursor: pointer; transition: transform 0.2s;">
          Stop Focus
        </button>
      </div>
    </div>
    
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }
      #zenwork-close-tab:hover, #zenwork-stop-focus:hover {
        transform: scale(1.05);
      }
    </style>
  `;

  document.body.appendChild(overlay);

  document.getElementById('zenwork-close-tab').addEventListener('click', () => {
    window.close();
  });

  document.getElementById('zenwork-stop-focus').addEventListener('click', () => {
    if (confirm('Are you sure you want to stop this focus session?')) {
      chrome.runtime.sendMessage({ type: 'STOP_FOCUS' }, (response) => {
        if (response?.status === 'ok') {
          overlay.remove();
        }
      });
    }
  });
}
