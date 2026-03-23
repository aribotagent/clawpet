/**
 * Agent Pet - Content Script
 * Injects the lobster overlay into every page.
 */

// ── PNG Sprite System ───────────────────────────────────────────────────────

// Stage to folder mapping
const STAGE_FOLDERS = {
  shrimp: "shrimp",
  aquarex: "aquarex",
  crimbolt: "crimbolt",
  emberclaw: "emberclaw",
  nebulacrab: "nebulacrab"
};

// Get PNG lobster image
function getLobsterImage(stage = "shrimp", state = "idle") {
  const folder = STAGE_FOLDERS[stage] || "shrimp";
  // Extension path - will be injected by manifest
  const extPath = chrome.runtime.getURL(`assets/sprites/${folder}/${state}.png`);
  return `<img src="${extPath}" class="lobster-sprite lobster-${stage} lobster-${state}" width="64" height="64" alt="lobster">`;
}
}

// Map evolution stage id to sprite stage name
function getStageSprite(evolutionStage) {
  const MAP = { 
    shrimp:"shrimp", 
    aquarex:"aquarex", 
    crimbolt:"crimbolt", 
    emberclaw:"emberclaw", 
    nebulacrab:"nebulacrab" 
  };
  return MAP[evolutionStage] || "shrimp";
}

// ── Layout constants ──────────────────────────────────────────────────────────

const MAX_PER_ROW = 4;
const MAX_VISIBLE = 12;

const STATE_LABEL = {
  idle:"idle", thinking:"thinking...", working:"working", searching:"searching",
  waiting:"waiting for you", error:"error!", done:"done!", sleeping:"sleeping",
};

let agents = [];
let equippedItems = {};
let evolutionStage = "shrimp";
let container = null;
let panel = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// ── Build overlay container ───────────────────────────────────────────────────

function buildContainer() {
  if (document.getElementById("agent-pet-container")) return;

  container = document.createElement("div");
  container.id = "agent-pet-container";
  container.style.cssText = `
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column-reverse;
    align-items: flex-end;
    gap: 4px;
    cursor: grab;
    user-select: none;
  `;

  container.addEventListener("mousedown", (e) => {
    if (e.target.closest(".agent-pet-panel")) return;
    isDragging = true;
    const rect = container.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    container.style.cursor = "grabbing";
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!isDragging || !container) return;
    container.style.left   = `${e.clientX - dragOffset.x}px`;
    container.style.bottom = "auto";
    container.style.right  = "auto";
    container.style.top    = `${e.clientY - dragOffset.y}px`;
  });
  document.addEventListener("mouseup", () => {
    isDragging = false;
    if (container) container.style.cursor = "grab";
  });

  document.body.appendChild(container);
}

// ── Render lobsters ───────────────────────────────────────────────────────────

function renderLobsters(agentList) {
  if (!container) buildContainer();

  const visible = agentList.slice(0, MAX_VISIBLE);
  const rows = [];
  for (let i = 0; i < visible.length; i += MAX_PER_ROW) {
    rows.push(visible.slice(i, i + MAX_PER_ROW));
  }

  container.innerHTML = "";

  if (agentList.length > MAX_VISIBLE) {
    const badge = document.createElement("div");
    badge.className = "agent-pet-badge";
    badge.textContent = `+${agentList.length - MAX_VISIBLE} more`;
    container.appendChild(badge);
  }

  for (const row of rows.reverse()) {
    const rowEl = document.createElement("div");
    rowEl.style.cssText = "display:flex;gap:4px;";
    for (const agent of row) {
      rowEl.appendChild(buildLobster(agent));
    }
    container.appendChild(rowEl);
  }
}

function buildLobster(agent) {
  const el = document.createElement("div");
  el.className = `agent-pet-lobster state-${agent.state}`;
  el.dataset.agentId = agent.agent_id;
  el.title = `${agent.display_name} — ${STATE_LABEL[agent.state] || agent.state}`;

  const sprite = getStageSprite(agent.evolution_stage || evolutionStage);
  const imgWrap = document.createElement("div");
  imgWrap.className = "agent-pet-img-wrap";
  imgWrap.innerHTML = getLobsterImage(sprite, agent.state);

  const dot = document.createElement("div");
  dot.className = `agent-pet-dot dot-${agent.state}`;

  el.appendChild(imgWrap);
  el.appendChild(dot);

  el.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePanel(agent);
  });

  return el;
}

// ── Info Panel ────────────────────────────────────────────────────────────────

function togglePanel(agent) {
  if (panel && panel.dataset.agentId === agent.agent_id) {
    panel.remove(); panel = null; return;
  }
  if (panel) { panel.remove(); panel = null; }

  panel = document.createElement("div");
  panel.className = "agent-pet-panel";
  panel.dataset.agentId = agent.agent_id;

  const progress = agent.progress != null ? Math.round(agent.progress * 100) : null;
  const tokens = (agent.tokens_used || 0).toLocaleString();

  panel.innerHTML = `
    <div class="ap-panel-header">
      <span class="ap-agent-name">${esc(agent.display_name)}</span>
      <span class="ap-state-badge state-${agent.state}">${STATE_LABEL[agent.state] || agent.state}</span>
    </div>
    ${agent.task ? `<div class="ap-task">${esc(agent.task)}</div>` : ""}
    ${progress != null ? `<div class="ap-progress-bar"><div class="ap-progress-fill" style="width:${progress}%"></div></div><div class="ap-progress-label">${progress}%</div>` : ""}
    <div class="ap-tokens">🔢 ${tokens} tokens used</div>
    <div class="ap-actions">
      <button class="ap-btn" id="ap-dash-btn">Dashboard</button>
      <button class="ap-btn ap-btn-box" id="ap-box-btn">🎁 Daily Box</button>
    </div>
  `;

  container.appendChild(panel);

  panel.querySelector("#ap-dash-btn").addEventListener("click", () => {
    window.open("http://localhost:7474/install", "_blank");
  });
  panel.querySelector("#ap-box-btn").addEventListener("click", () => {
    showBubble("🎁 Opening daily box...");
    panel.remove(); panel = null;
  });

  setTimeout(() => {
    document.addEventListener("click", function closePanel(e) {
      if (panel && !panel.contains(e.target)) { panel.remove(); panel = null; }
      document.removeEventListener("click", closePanel);
    });
  }, 10);
}

// ── Bubble notifications ──────────────────────────────────────────────────────

function showBubble(text) {
  const bubble = document.createElement("div");
  bubble.className = "agent-pet-bubble";
  bubble.textContent = text;
  container.appendChild(bubble);
  setTimeout(() => bubble.remove(), 3000);
}

// ── Listen for updates ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "STATUS_UPDATE") {
    agents = msg.data.agents || [];
    renderLobsters(agents);
  }
});

// Initial load
chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
  if (!res) return;
  if (res.agentStatus?.agents) {
    agents = res.agentStatus.agents;
  }
  if (res.evolution?.equipped_stage) {
    evolutionStage = res.evolution.equipped_stage;
  }
  if (agents.length > 0) renderLobsters(agents);
});

// ── Utils ─────────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
