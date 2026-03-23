---
name: agent-pet
description: >
  A Chrome extension lobster that lives in your browser corner and shows
  your OpenClaw agent status in real time. Your lobster evolves as your
  agent consumes tokens, and you can dress it with items from the daily
  treasure box.
author: MC
version: 1.0.0
triggers:
  - "setup agent pet"
  - "install agent pet"
  - "start lobster"
  - "what is my agent doing"
  - "agent pet status"
  - "show lobster"
  - "agent status"
  - "stop agent pet"
---

# ClawPet

A Chrome extension lobster that reflects your OpenClaw agent's real-time state.

## Setup

Tell your agent: **"setup agent pet"**

The skill will:
1. Install Python dependencies
2. Start the local status API on port 7474
3. Open the Chrome extension install guide at http://localhost:7474/install

## Commands

- **"setup agent pet"** → Full installation wizard
- **"start agent pet"** → Start the status API server
- **"stop agent pet"** → Stop the server
- **"agent status"** → Show current agent state in chat
- **"lobster evolution"** → Show evolution stage and token progress
- **"open daily box"** → Open the daily treasure box for rewards
- **"open backpack"** → Show your item backpack

## How It Works

```
OpenClaw Agent → agent-pet Skill (localhost:7474) → Chrome Extension → Lobster UI
```

The skill reads your OpenClaw session state every 2 seconds and serves it via
a local HTTP API. The Chrome extension polls this API and renders a lobster
animation that reflects what your agent is doing — right in the corner of
every browser page.

## Evolution Stages

| Stage | Daily Tokens Required |
|-------|---------------------|
| 🦐 shrimp | 0 |
| 🌊 Aquarex | 50,000 |
| 🔥 Crimbolt | 200,000 |
| ⚔️ Emberclaw | 500,000 |
| 🌌 Nebulacrab | 2,000,000 |

## Daily Treasure Box

- **Free once per day** (UTC 0:00 reset)
- **Rewards**:
  - 65% chance: Common item (hat, coffee-cup, telescope)
  - 35% chance: Rare item (gold-claw, treasure-box)
- Open via the popup or click the lobster panel

## Items

| Item | Rarity | Effect |
|------|--------|--------|
| 🎩 hat | Common | Decorative |
| ☕ coffee-cup | Common | working state特效 |
| 🔭 telescope | Common | searching state特效 |
| 🥊 gold-claw | Rare | 全状态金色外观 |
| 🎁 treasure-box | Rare | 背着宝箱 |

## Procedures

### setup agent pet
1. Run `scripts/setup.sh`
2. Tell the user: "Starting ClawPet... open http://localhost:7474/install in Chrome to install the extension."

### start agent pet
1. Run `scripts/start-server.sh`
2. Tell the user: "ClawPet is running at http://localhost:7474"

### stop agent pet
1. Run `scripts/stop-server.sh`
2. Tell the user: "ClawPet stopped."

### agent status
1. Fetch http://localhost:7474/status/all
2. Format and display each agent's state, current task, and token count.

### lobster evolution
1. Fetch http://localhost:7474/evolution
2. Display current stage, tokens used, and progress to next stage.

### open daily box
1. POST to http://localhost:7474/daily-box
2. Display the reward (item name and rarity)
