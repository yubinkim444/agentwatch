"""Public SDK — spawn a WS broadcast server in a background thread and
let agent code push status events to any connected agentwatch overlay."""

from __future__ import annotations

import asyncio
import json
import threading
from typing import Optional

import websockets


class _Broadcaster:
    def __init__(self, host: str, port: int) -> None:
        self.host = host
        self.port = port
        self.clients: set = set()
        self.last_state: dict = {}
        self.loop: Optional[asyncio.AbstractEventLoop] = None
        self.server = None
        self._thread: Optional[threading.Thread] = None
        self._ready = threading.Event()

    async def _handler(self, ws):
        self.clients.add(ws)
        if self.last_state:
            try:
                await ws.send(json.dumps(self.last_state))
            except Exception:
                pass
        try:
            async for _msg in ws:
                pass
        finally:
            self.clients.discard(ws)

    async def _serve(self) -> None:
        self.server = await websockets.serve(self._handler, self.host, self.port)
        self._ready.set()
        await self.server.wait_closed()

    def start(self) -> None:
        def run() -> None:
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            try:
                self.loop.run_until_complete(self._serve())
            except OSError:
                self._ready.set()  # release waiter even if port is taken
        self._thread = threading.Thread(target=run, name="agentwatch-ws", daemon=True)
        self._thread.start()
        self._ready.wait(timeout=2.0)

    def broadcast(self, payload: dict) -> None:
        if not self.loop or not self.loop.is_running():
            return
        merged = {**self.last_state, **payload}
        self.last_state = merged
        message = json.dumps(merged)

        async def send_all() -> None:
            dead = []
            for client in list(self.clients):
                try:
                    await client.send(message)
                except Exception:
                    dead.append(client)
            for d in dead:
                self.clients.discard(d)
        asyncio.run_coroutine_threadsafe(send_all(), self.loop)

    def stop(self) -> None:
        if self.server and self.loop:
            self.loop.call_soon_threadsafe(self.server.close)


_singleton: Optional[_Broadcaster] = None


def start(host: str = "127.0.0.1", port: int = 8765) -> None:
    """Start the WebSocket broadcaster (idempotent)."""
    global _singleton
    if _singleton is not None:
        return
    _singleton = _Broadcaster(host=host, port=port)
    _singleton.start()


def stop() -> None:
    """Stop the broadcaster, releasing the port."""
    global _singleton
    if _singleton is not None:
        _singleton.stop()
        _singleton = None


def announce(**fields) -> None:
    """Push a status update to every connected agentwatch overlay.

    Recognized keys (any subset): goal, last_action, next_action, step, error.
    Arbitrary keys also work but won't be rendered by the default overlay.
    """
    if _singleton is None:
        start()
    assert _singleton is not None
    _singleton.broadcast(fields)


class AgentWatch:
    """Context manager wrapper. Use as::

        with AgentWatch() as aw:
            aw.announce(goal="...")
            aw.announce(last_action="clicked X", next_action="type 'hello'")
    """

    def __init__(self, host: str = "127.0.0.1", port: int = 8765) -> None:
        self.host = host
        self.port = port

    def __enter__(self) -> "AgentWatch":
        start(self.host, self.port)
        return self

    def __exit__(self, *_exc) -> None:
        stop()

    def announce(self, **fields) -> None:
        announce(**fields)
