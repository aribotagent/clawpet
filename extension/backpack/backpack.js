const ITEM_META = {
  "hat":         { name: "Top Hat",     emoji: "🎩", rarity: "common" },
  "coffee-cup":  { name: "Coffee Cup",  emoji: "☕", rarity: "common" },
  "telescope":   { name: "Telescope",   emoji: "🔭", rarity: "common" },
  "gold-claw":   { name: "Gold Claw",   emoji: "🥊", rarity: "rare" },
  "treasure-box":{ name: "Treasure Box",emoji: "🎁", rarity: "rare" },
};

let agents = [];
let backpack = { items: [], equipped: {} };
let selectedAgent = null;

async function init() {
  // Load agents
  const statusRes = await new Promise(r => chrome.runtime.sendMessage({ type: "GET_STATUS" }, r));
  agents = statusRes?.agentStatus?.agents || [{ agent_id: "main", display_name: "main" }];
  selectedAgent = agents[0]?.agent_id;

  // Load backpack
  backpack = await new Promise(r => chrome.runtime.sendMessage({ type: "GET_BACKPACK" }, r));

  renderAgentTabs();
  renderItems();
}

function renderAgentTabs() {
  const el = document.getElementById("agentTabs");
  el.innerHTML = agents.map(a => `
    <div class="agent-tab ${a.agent_id === selectedAgent ? "active" : ""}"
         data-id="${a.agent_id}">
      🦞 ${escHtml(a.display_name)}
    </div>
  `).join("");

  el.querySelectorAll(".agent-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      selectedAgent = tab.dataset.id;
      renderAgentTabs();
      renderItems();
    });
  });
}

function renderItems() {
  const grid = document.getElementById("itemGrid");
  const unequipBtn = document.getElementById("unequipBtn");
  const items = backpack.items || [];
  const equipped = backpack.equipped?.[selectedAgent] || null;

  if (items.length === 0) {
    grid.innerHTML = `<div class="empty-msg" style="grid-column:1/-1">No items yet.<br>Feed your lobster or open the daily box to earn items!</div>`;
    unequipBtn.style.display = "none";
    return;
  }

  grid.innerHTML = items.map(itemId => {
    const meta = ITEM_META[itemId] || { name: itemId, emoji: "📦", rarity: "common" };
    const isEquipped = equipped === itemId;
    return `
      <div class="item-card ${isEquipped ? "equipped" : ""}" data-item="${itemId}">
        <div class="item-emoji">${meta.emoji}</div>
        <div class="item-name">${meta.name}</div>
        <div class="item-rarity rarity-${meta.rarity}">${meta.rarity}</div>
        ${isEquipped ? `<div class="item-equipped-badge">✓ Equipped</div>` : ""}
      </div>`;
  }).join("");

  grid.querySelectorAll(".item-card").forEach(card => {
    card.addEventListener("click", async () => {
      const item = card.dataset.item;
      const isEquipped = backpack.equipped?.[selectedAgent] === item;
      if (isEquipped) return; // already equipped
      await equipItem(item);
    });
  });

  unequipBtn.style.display = equipped ? "block" : "none";
  unequipBtn.onclick = () => equipItem(null);
}

async function equipItem(item) {
  const res = await new Promise(r =>
    chrome.runtime.sendMessage({ type: "EQUIP_ITEM", agentId: selectedAgent, item }, r)
  );
  if (res?.ok) {
    if (!backpack.equipped) backpack.equipped = {};
    backpack.equipped[selectedAgent] = item;
    renderItems();
  }
}

function escHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

init();
