# BFF flow graph contract

The Marketplace reads this response to render a flow preview.

## Endpoint

`GET /api/flows/:flowId` (public flow detail).

- Keep **omitting** `flowData`.
- Add optional `graph`.

```json
"graph": {
  "nodes": [{ "id": "start_0", "label": "Start", "x": 120.5, "y": 80 }],
  "edges": [{ "id": "e1", "source": "start_0", "target": "agent_0" }]
}
```

## Rules

- Node: `id`, `label` (`data.label` → `data.name` → `id`), finite `position.x` / `position.y`.
- Edge: `id` (or `source + "->" + target`); drop edges whose endpoints are not in the accepted node set.
- Never copy `inputs`, `inputParams`, credentials, or the rest of `data`.
- Parse failure or no valid nodes: `{ "nodes": [], "edges": [] }`.
- If `graph` is absent, DLT omits it and the Marketplace preview stays empty.
