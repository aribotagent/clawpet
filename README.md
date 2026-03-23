# 🦞 ClawPet

A Chrome extension lobster that lives in your browser corner and shows your OpenClaw agent status in real time. Evolves as your agent consumes tokens.

## Quick Start

```
clawhub install MC/agent-pet
```

Then tell your OpenClaw agent:
```
setup agent pet
```

Open http://localhost:7474/install in Chrome and follow the 4-step guide.

## Features

- 🦞 **Real-time lobster** in every Chrome tab
- ⚡ **8 state animations** — idle, working, searching, thinking, waiting, error, done, sleeping
- 🐠 **Shrimp Tank mode** — multiple agents shown in a grid (max 4 per row)
- 🎉 **Evolution system** — lobster evolves through 6 stages based on token usage
- 🎁 **Daily treasure box** — free once per day, earn items (65% common, 35% rare)
- 🎒 **Item backpack** — equip/unequip decorative items per agent

## Evolution Stages

| Stage | Daily Tokens Required |
|-------|---------------------|
| 🦐 shrimp | 0 |
| 🌊 Aquarex | 50,000 |
| 🔥 Crimbolt | 200,000 |
| ⚔️ Emberclaw | 500,000 |
| 🌌 Nebulacrab | 2,000,000 |

## Commands

| Say to your agent | Action |
|-------------------|--------|
| "setup agent pet" | Full install wizard |
| "start agent pet" | Start the API server |
| "stop agent pet" | Stop the server |
| "agent status" | Show all agents in chat |
| "lobster evolution" | Show evolution progress |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /status | Single agent state |
| GET /status/all | All agents (shrimp tank) |
| GET /status/stream | SSE real-time stream |
| GET /evolution | Evolution stage + progress |
| GET /backpack | Item backpack |
| POST /backpack/equip | Equip/unequip item |
| POST /daily-box | Open daily treasure box |
| GET /install | Install guide page |

## File Structure

```
agent-pet/
├── SKILL.md
├── README.md
├── backend/          ← Python API server
├── extension/        ← Chrome extension source
├── scripts/          ← Setup and control scripts
├── install-page/     ← Chrome install guide
└── config/           ← Configuration
```

## Author

MC
