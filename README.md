# Basketball Coaching Board

iPad-friendly tactics board: full / half court, 5 blue (#00CED1) + 5 black numbered tokens, a ball, and pen / eraser / undo.

## Quick test on iPad (same Wi-Fi as your Mac)

```bash
python3 -m http.server 8000
```
Find your Mac's IP (System Settings → Wi-Fi → Details), then open `http://<mac-ip>:8000` in Safari on the iPad.

## Install permanently (works offline)

Offline mode needs HTTPS. Easiest: drag this folder onto https://app.netlify.com/drop (or use GitHub Pages),
open the HTTPS link in Safari on the iPad → Share → **Add to Home Screen**.

## Usage

- **Full Court / Half Court**: each mode remembers its own tokens and lines.
- **Move**: drag tokens anywhere (multi-finger supported).
- **Draw**: pick a colour (tapping a colour switches to Draw) and draw with finger or Apple Pencil.
- **Erase**: swipe over a line to remove it.
- **Undo / Clear Lines / Reset Players**.
