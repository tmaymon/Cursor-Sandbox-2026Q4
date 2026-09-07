# Chat options, including Plan mode

Sandbox chat composer with **Agent**, **Ask**, **Plan**, and **Debug** in the mode picker.

Plan mode is the new chat option. It asks a few clarifying questions, writes a reviewable plan, then waits for **Build**.

## Run

```bash
python3 -m http.server 4174
```

Open http://localhost:4174

## Tests

```bash
npm test
```

## Shortcuts

- Click the mode button (chat options) under the input
- `Shift+Tab` rotates Agent → Ask → **Plan** → Debug
