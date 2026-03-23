const STATE_EMOJI = { idle:"🦞", thinking:"🤔", working:"⚡", searching:"🔍", waiting:"⏳", error:"❌", done:"✅", sleeping:"💤" };
const STAGE_EMOJI = { shrimp:"🦐", aquarex:"🌊", crimbolt:"🔥", emberclaw:"⚔️", nebulacrab:"🌌" };

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

  // Agents section
  if (agents.length > 0) {
    html += `<div class="section"><div class="section-title">Agents</div>`;
    for (const agent of agents.slice(0, 6)) {
      html += `
        <div class="agent-row">
          <div class="agent-emoji">${STATE_EMOJI[agent.state] || "🦞"}</div>
          <div class="agent-info">
            <div class="agent-name">${escHtml(agent.display_name)}</div>
            ${agent.task ? `<div class="agent-task">${escHtml(agent.task)}</div>` : ""}
          </div>
          <span class="agent-state state-${agent.state}">${agent.state}</span>
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
        <div class="evolution-bar">
          <div class="evo-info">
            <span class="evo-stage">${evolution.current_stage?.name || "🦐 Tiny Shrimp"}</span>
            <span class="evo-pct">${pct}%</span>
          </div>
          <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
          ${evolution.next_stage ? `<div style="font-size:11px;color:#64748b;margin-top:4px">Next: ${evolution.next_stage.name}</div>` : ""}
        </div>
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
