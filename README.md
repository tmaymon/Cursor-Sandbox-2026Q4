# Lumen Drift

Arcade survival in a circular nebula well. You are a lantern-ship. **Your light is your life.**

Collect gold motes to keep the bloom alive. Rocks bounce the rim. Pink seekers hunt whatever still glows. Every fifth mote in a combo detonates a bloom pulse that shoves hazards away.

## Play

Open `index.html` through a local server (ES modules will not load from `file://`):

```bash
python3 -m http.server 4173
```

Then visit [http://localhost:4173](http://localhost:4173).

### Controls

| Action | Input |
| --- | --- |
| Drift | WASD or arrow keys |
| Chase cursor | Hold left mouse / touch |
| Dash | Space or Shift |
| Pause | P or Escape |
| Start / continue | Enter |
| Mute | M |

## Rules

- Light drains over time and drains faster on later waves.
- Motes restore light and build a combo.
- Hits and dashes spend light. When light hits zero, the run ends.
- Best score is stored in `localStorage`.

## Tests

```bash
node --test tests/*.test.js
```
