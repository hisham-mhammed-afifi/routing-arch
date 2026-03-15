# 08. Real-Time (SignalR)

## 8.1 Connection Lifecycle

Each workspace gets its own SignalR connection. The connection is opened when the user enters a workspace context and closed when they leave or switch to a different workspace.

```
User selects Workspace ABC
  --> WorkspaceContextResolver fetches workspace details
  --> WorkspaceShellComponent initializes
  --> SignalRService.connect(botId, token)
  --> Hub negotiation with ?botId=ABC + accessTokenFactory
  --> Connection established, scoped to Workspace ABC only

User switches to workspace XYZ
  --> WorkspaceShellComponent destroys (ngOnDestroy)
  --> SignalRService.disconnect()   // closes Workspace ABC connection
  --> Navigate to /workspace/XYZ
  --> WorkspaceContextResolver fetches Workspace XYZ details
  --> WorkspaceShellComponent initializes
  --> SignalRService.connect('XYZ', token)
  --> New connection established, scoped to Workspace XYZ only

User navigates to /bots or /account
  --> WorkspaceShellComponent destroys
  --> SignalRService.disconnect()   // no active connection outside workspace context
```

The connection is tied to WorkspaceShellComponent's lifecycle. When the component destroys, the connection closes. This ensures no orphaned connections exist and each workspace's real-time data is fully isolated.

### Diagram: SignalR Per-Workspace Lifecycle

<svg width="100%" viewBox="0 0 680 480" xmlns="http://www.w3.org/2000/svg" style="max-width:680px;font-family:system-ui,sans-serif">
  <style>
    .box-blue { fill: #E6F1FB; stroke: #185FA5; stroke-width: 0.5; }
    .box-teal { fill: #E1F5EE; stroke: #0F6E56; stroke-width: 0.5; }
    .box-pink { fill: #FBEAF0; stroke: #993556; stroke-width: 0.5; }
    .box-coral { fill: #FAECE7; stroke: #993C1D; stroke-width: 0.5; }
    .box-red { fill: #FCEBEB; stroke: #A32D2D; stroke-width: 0.5; }
    .box-amber { fill: #FAEEDA; stroke: #854F0B; stroke-width: 0.5; }
    .box-gray { fill: #F1EFE8; stroke: #888780; stroke-width: 0.5; }
    .th { font-size: 14px; font-weight: 500; }
    .ts { font-size: 12px; }
    .th-blue { fill: #0C447C; } .ts-blue { fill: #185FA5; }
    .th-teal { fill: #085041; } .ts-teal { fill: #0F6E56; }
    .th-pink { fill: #72243E; } .ts-pink { fill: #993556; }
    .th-coral { fill: #712B13; } .ts-coral { fill: #993C1D; }
    .th-red { fill: #791F1F; } .ts-red { fill: #A32D2D; }
    .th-amber { fill: #633806; } .ts-amber { fill: #854F0B; }
    .th-gray { fill: #444441; } .ts-gray { fill: #5F5E5A; }
    .arr { stroke: #888780; stroke-width: 1.5; }
  </style>
  <defs><marker id="a5" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>

  <text class="th th-gray" x="40" y="30">SignalR connection lifecycle</text>

  <!-- Workspace A context -->
  <rect class="box-blue" x="40" y="50" width="280" height="160" rx="14" stroke-dasharray="4 3"/>
  <text class="th th-blue" x="180" y="76" text-anchor="middle">Workspace ABC context</text>

  <rect class="box-teal" x="60" y="92" width="240" height="44" rx="8"/>
  <text class="th th-teal" x="180" y="114" text-anchor="middle" dominant-baseline="central">WorkspaceShell.ngOnInit()</text>
  <line class="arr" x1="180" y1="136" x2="180" y2="156" marker-end="url(#a5)"/>

  <rect class="box-pink" x="60" y="158" width="240" height="44" rx="8"/>
  <text class="th th-pink" x="180" y="180" text-anchor="middle" dominant-baseline="central">SignalR.connect(ABC)</text>

  <!-- Connected bar -->
  <rect x="300" y="170" width="8" height="110" rx="4" fill="#1D9E75" opacity="0.6"/>
  <text class="ts" x="320" y="230" text-anchor="start" fill="#1D9E75">Connected</text>

  <!-- Switch -->
  <rect class="box-amber" x="180" y="260" width="240" height="44" rx="8"/>
  <text class="th th-amber" x="300" y="282" text-anchor="middle" dominant-baseline="central">User switches to workspace XYZ</text>

  <line class="arr" x1="300" y1="304" x2="300" y2="330" marker-end="url(#a5)"/>

  <rect class="box-coral" x="60" y="332" width="240" height="44" rx="8"/>
  <text class="th th-coral" x="180" y="354" text-anchor="middle" dominant-baseline="central">WorkspaceShell.ngOnDestroy()</text>
  <line class="arr" x1="300" y1="354" x2="340" y2="354" marker-end="url(#a5)"/>

  <rect class="box-red" x="342" y="332" width="200" height="44" rx="8"/>
  <text class="th th-red" x="442" y="354" text-anchor="middle" dominant-baseline="central">SignalR.disconnect()</text>

  <!-- Workspace B context -->
  <rect class="box-blue" x="340" y="400" width="300" height="70" rx="14" stroke-dasharray="4 3"/>
  <text class="th th-blue" x="490" y="422" text-anchor="middle">Workspace XYZ context</text>

  <rect class="box-pink" x="360" y="436" width="260" height="28" rx="6"/>
  <text class="ts ts-pink" x="490" y="454" text-anchor="middle" dominant-baseline="central">SignalR.connect(XYZ) - new connection</text>

  <line class="arr" x1="442" y1="376" x2="490" y2="398" marker-end="url(#a5)"/>

  <!-- Navigate away -->
  <rect class="box-gray" x="40" y="424" width="240" height="44" rx="8"/>
  <text class="th th-gray" x="160" y="440" text-anchor="middle" dominant-baseline="central">Navigate to /bots</text>
  <text class="ts ts-gray" x="160" y="456" text-anchor="middle" dominant-baseline="central">No active connection</text>

  <!-- Key insight -->
  <rect class="box-gray" x="400" y="92" width="240" height="80" rx="8"/>
  <text class="ts ts-gray" x="520" y="114" text-anchor="middle">Connection is tied to</text>
  <text class="ts ts-gray" x="520" y="132" text-anchor="middle">WorkspaceShellComponent lifecycle.</text>
  <text class="ts ts-gray" x="520" y="152" text-anchor="middle">One workspace = one connection.</text>
</svg>

---

## 8.2 Brand Context on SignalR

Currently the server derives brand from the auth token. If the backend also requires `x-user-domain` on the WebSocket:

- Pass it as an additional query param during negotiation
- OR set it as a custom header if the SignalR client supports it (HttpClient-based negotiation does, WebSocket upgrade does not)

Recommendation: keep using token-based brand resolution for SignalR. Adding the header as a query param is a fallback if the backend team requires it.

---

## 8.3 Reconnection and State Sync

SignalR connections drop. The service should:

1. Auto-reconnect with exponential backoff
2. On reconnect, re-fetch any state that may have changed while disconnected (e.g., inbox unread count, new messages)
3. Expose a `connectionState$` observable so components can show "reconnecting..." indicators
