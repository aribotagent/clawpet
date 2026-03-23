const STATE_EMOJI = { idle:"🛌", thinking:"🤔", working:"⚡", searching:"🔍", waiting:"⏳", error:"❌", done:"✅", sleeping:"💤" };
const STAGE_NAMES = { shrimp:"🦐 shrimp", aquarex:"🌊 Aquarex", crimbolt:"🔥 Crimbolt", emberclaw:"⚔️ Emberclaw", nebulacrab:"🌌 Nebulacrab" };

chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
  const apiStatus = document.getElementById("apiStatus");
  const content = document.getElementById("content");

  if (!res || !res.apiOnline) {
    apiStatus.textContent = "Offline";
    apiStatus.className = "api-status api-offline";
    content.innerHTML = `<div class="offline-msg">Agent Pet server is not running.<br><a href="http://localhost:7474/install" target="_blank">Start it →</a></div>`;
    return;
  }

  apiStatus.textContent = "Online";
  apiStatus.className = "api-status api-online";

  const agents = res.agentStatus?.agents || [];
  const evolution = res.evolution;

  let html = "";

  // Main lobster display with animation
  if (agents.length > 0) {
    const mainAgent = agents[0];
    const stageId = mainAgent.evolution_stage || "shrimp";
    const state = mainAgent.state || "idle";
    const stageName = STAGE_NAMES[stageId] || STAGE_NAMES.shrimp;
    const stateEmoji = STATE_EMOJI[state] || "🛌";
    
    html += `
      <div class="lobster-main">
        <img class="lobster-img" src="assets/sprites/${stageId}/${state}.png" alt="${stageName}" onerror="this.style.display='none'">
        <div class="lobster-name">${stageName}</div>
        <div class="lobster-state">${stateEmoji} ${mainAgent.task || mainAgent.state || "idle"}</div>
      </div>`;
  }

  // All agents in one section
  if (agents.length > 0) {
    html += `<div class="section"><div class="section-title">Agents</div>`;
    for (const agent of agents.slice(0, 6)) {
      const stageId = agent.evolution_stage || "shrimp";
      const state = agent.state || "idle";
      html += `
        <div class="agent-row">
          <img class="agent-img" src="assets/sprites/${stageId}/${state}.png" onerror="this.style.display='none'">
          <div class="agent-info">
            <div class="agent-name">${escHtml(agent.display_name)}</div>
            ${agent.task ? `<div class="agent-task">${escHtml(agent.task)}</div>` : ""}
          </div>
          <span class="agent-state state-${state}">${state}</span>
        </div>`;
    }
    html += `</div>`;
  }

  // Evolution section
  if (evolution) {
    const pct = Math.round((evolution.progress || 0) * 100);
    html += `
      <div class="section">
        <div class="section-title">Evolution</div>
        <div class="evo-desc">Your lobster evolves by using AI agents. More daily token usage = faster evolution!</div>
        <div class="evo-info">
          <span class="evo-stage">${evolution.current_stage?.name || "🦐 shrimp"}</span>
          <span class="evo-pct">${pct}%</span>
        </div>
        <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
        ${evolution.next_stage ? `<div class="evo-next">Next: ${evolution.next_stage.name} (${(evolution.next_stage.tokens || 50000).toLocaleString()} tokens/day)</div>` : ""}
      </div>`;
  }

  content.innerHTML = html || `<div class="offline-msg">No agents detected.</div>`;
});

document.getElementById("btnBox").addEventListener("click", async () => {
  try {
    const res = await fetch("http://localhost:7474/daily-box", { method: "POST" });
    const data = await res.json();
    if (data.error) {
      alert(data.error + "\nNext reset: " + data.next_reset);
    } else {
      alert("🎁 " + data.message);
    }
  } catch (e) {
    alert("Failed to open box: " + e.message);
  }
});

document.getElementById("btnBackpack").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("backpack/backpack.html") });
});

document.getElementById("btnDashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: "http://localhost:7474/install" });
});

function escHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
