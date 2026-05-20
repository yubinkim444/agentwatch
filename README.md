# agentwatch

> **React DevTools, for browser AI agents.**
> Drop a translucent overlay onto every tab that shows what your agent is
> trying to do, what it just clicked, and what it's about to do next.

[![PyPI](https://img.shields.io/pypi/v/agentwatcher)](https://pypi.org/project/agentwatcher/)
[![Chrome](https://img.shields.io/badge/Chrome-MV3-4285F4)]()
[![License: MIT](https://img.shields.io/badge/license-MIT-green)]()

---

## Why

Browser-use, Playwright agents, computer-use models — they're all **black
boxes** to the developer watching them. The agent moves the mouse, types
into a field, the page reloads, then it errors out, and you're left
guessing what it thought it was doing.

`agentwatch` adds a tiny floating overlay to every tab. Your agent code
pushes one-line status updates ("goal: book a flight", "last action:
clicked search", "next action: type SFO"), and the overlay shows them
live, framework-agnostic.

The result: bug screenshots that are **self-explanatory**. Demo GIFs that
viewers actually understand. Pair-debugging sessions where the human can
intervene the moment the agent goes off-rails.

---

## Architecture

```
┌──────────────────────────┐        ws://127.0.0.1:8765        ┌──────────────────────────┐
│  Your agent (any lang)   │ ──────────────────────────────▶   │  Chrome MV3 extension    │
│  agentwatch.announce(    │      broadcasts status JSON       │  injects floating overlay│
│      goal=..., last=...) │                                   │  on every tab            │
└──────────────────────────┘                                   └──────────────────────────┘
```

The SDK runs a localhost WebSocket broadcaster in a background thread.
The extension's content script connects to it on every page load. Each
`announce()` call updates the overlay in place with a green flash.

---

## Install (2 steps)

### 1. Install the Chrome extension

```bash
git clone https://github.com/yubinkim444/agentwatch.git
cd agentwatch
```

In Chrome / Edge / Brave:
- Open `chrome://extensions`
- Toggle **Developer mode** (top-right)
- Click **Load unpacked**
- Select the `extension/` folder

A small overlay appears in the bottom-right of every tab, showing a
disconnected (yellow) dot until your agent connects.

### 2. Install the SDK

```bash
pip install agentwatcher
```

---

## Use it

### Python

```python
from agentwatch import AgentWatch

with AgentWatch() as aw:
    aw.announce(goal="Book a one-way flight SFO → JFK for tomorrow")

    # ...do agent stuff...

    aw.announce(step=1, last_action="Opened google.com/flights",
                next_action="Click the origin field")
    # ...
    aw.announce(step=2, last_action="Typed 'SFO'",
                next_action="Click the destination field")
```

Or imperatively, without the context manager:

```python
import agentwatch
agentwatch.start()
agentwatch.announce(goal="...", last_action="...", next_action="...")
```

### Any other language

Open a WebSocket to `ws://127.0.0.1:8765` and send JSON like:

```json
{"goal": "Book a flight", "last_action": "Clicked search", "next_action": "Type SFO"}
```

Every connected tab's overlay updates immediately.

---

## Recognized fields

| Field | What the overlay shows |
|-------|------------------------|
| `goal` | Top-line objective. |
| `last_action` | What the agent just did. |
| `next_action` | What the agent is about to do. |
| `step` | Optional step counter / index. |
| `error` | Highlighted in red. The error row only appears when set. |

Any other keys are kept in the broadcast payload but not rendered by the
default overlay — fork the extension if you want to add custom rows.

---

## Pairs nicely with

- [`playwright`](https://playwright.dev), [`selenium`](https://selenium.dev),
  [`browser-use`](https://github.com/browser-use/browser-use), any computer-use agent.
- A screen-recorder. The overlay + your tool together produce demo GIFs
  that explain themselves.

---

## Companion projects

- **[mcp-rec](https://github.com/yubinkim444/mcp-rec)** — VCR for MCP servers.
- **[llm-cache-proxy](https://github.com/yubinkim444/llm-cache-proxy)** — disk cache for OpenAI/Anthropic API calls.
- **[promptlock](https://github.com/yubinkim444/promptlock)** — lockfile for prompts.
- **[context-diff](https://github.com/yubinkim444/context-diff)** — git diff for Claude Code context windows.

---

## License

MIT © yubinkim444
