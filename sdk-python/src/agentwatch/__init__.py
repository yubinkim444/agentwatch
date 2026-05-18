"""agentwatch — DevTools-style overlay for browser-based AI agents.

Public API:
    from agentwatch import AgentWatch

    with AgentWatch() as aw:
        aw.announce(goal="Book a flight from SFO to JFK")
        aw.announce(last_action="Clicked search button", next_action="Type 'SFO'")
"""

from .sdk import AgentWatch, announce, start, stop

__all__ = ["AgentWatch", "announce", "start", "stop"]
__version__ = "0.1.0"
