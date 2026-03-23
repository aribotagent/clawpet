/**
 * Agent Pet - Background Service Worker
 * Polls localhost:7474 every 2 seconds and broadcasts state to all tabs.
 */

const API_BASE = "http://localhost:7474";
const POLL_INTERVAL_MS = 2000;

let lastState = null;

// Poll status and broadcast to content scripts
async function pollStatus() {
  try {
    const res = await fetch(`${API_BASE}/status/all`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();

    // Store in local storage for popup/backpack to read
    await chrome.storage.local.set({ agentStatus: data, lastPoll: Date.now(), apiOnline: true });

    // Broadcast to all content scripts
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try {
        chrome.tabs.sendMessage(tab.id, { type: "STATUS_UPDATE", data });
      } catch (_) {}
    }
  } catch (err) {
    await chrome.storage.local.set({ apiOnline: false });
  }
}

// Poll evolution separately (less frequent)
async function pollEvolution() {
  try {
    const res = await fetch(`${API_BASE}/evolution`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return;
    const data = await res.json();
    await chrome.storage.local.set({ evolution: data });

    // Notify if newly unlocked
    if (data.newly_unlocked && data.newly_unlocked.length > 0) {
      for (const name of data.newly_unlocked) {
        chrome.notifications?.create({
          type: "basic",
          iconUrl: "assets/icon48.png",
          title: "🎉 Lobster Evolved!",
          message: `Your lobster became: ${name}`
        });
      }
    }
  } catch (_) {}
}

// Set up periodic polling using alarms
chrome.alarms.create("pollStatus", { periodInMinutes: POLL_INTERVAL_MS / 60000 });
chrome.alarms.create("pollEvolution", { periodInMinutes: 0.5 }); // every 30s

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pollStatus") pollStatus();
  if (alarm.name === "pollEvolution") pollEvolution();
});

// Initial poll on startup
pollStatus();
pollEvolution();

// Handle messages from popup/backpack
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_STATUS") {
    chrome.storage.local.get(["agentStatus", "evolution", "apiOnline"], sendResponse);
    return true;
  }
  if (msg.type === "EQUIP_ITEM") {
    fetch(`${API_BASE}/backpack/equip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent_id: msg.agentId, item: msg.item }),
    })
      .then((r) => r.json())
      .then(sendResponse)
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === "GET_BACKPACK") {
    fetch(`${API_BASE}/backpack`)
      .then((r) => r.json())
      .then(sendResponse)
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }
});
