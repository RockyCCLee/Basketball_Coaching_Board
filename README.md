# Basketball Coaching Board

A responsive, touch-friendly digital tactics board designed for basketball coaches. Built as a Progressive Web App (PWA) optimized for iPad, touch screens, and desktop browsers.

🔗 **Live URL:** [https://rockycclee.github.io/Basketball_Coaching_Board/](https://rockycclee.github.io/Basketball_Coaching_Board/)

---

## Documentation

- 📄 **[Requirements & Feature Specifications](docs/requirements.md)**: Comprehensive, point-form breakdown of all court modes, token mechanics, tracking lines, drawing tools, strategy management, and PWA capabilities.

---

## Key Highlights

- **Full & Half Court Modes:** Realistic FIBA court layout with independent state memory and 2-3 zone alignments.
- **Offence / Defence Role Toggle:** Instant role switching in half-court mode with ball starting in player #1's hands.
- **Multi-Touch Token Movement:** Move multiple tokens at once with collision detection to prevent overlapping.
- **Magnetic Ball Control:** Moving a ball handler carries the basketball along automatically; dragging the ball directly moves it independently.
- **Movement Tracking:** Broken (dashed) lines in matching team colors trace player movement in real-time.
- **Tactical Drawing & Erasing:** Multi-color pen with directional arrowheads, stroke eraser, undo, and clear actions.
- **Strategy & Snapshot Manager:** Built-in presets (*Setup*, *1v1 - 1*, *Pick&Roll - 5/3/4*, *Screen - 2/3/5*), custom snapshot capture, inline renaming, reordering, and hold-to-delete protection.
- **Offline PWA:** Installable to Home Screen on iPad / tablet with offline caching.

---

## Usage

- **Full Court / Half Court:** Toggle view mode from the top bar (each remembers its own tokens and drawings).
- **Move (✋):** Drag tokens anywhere across the court.
- **Draw (✏️):** Choose a color swatch and draw tactical lines with directional arrowheads using finger, stylus, or Apple Pencil.
- **Erase (🧽):** Swipe over any line to erase it.
- **Track Toggle:** Turn dashed movement trails On or Off.
- **Move Aside:** Quickly park all tokens outside the sideline.
- **Reset Players:** Return tokens to their default formation.
- **Strategy Dropdown:** Select a saved tactic or tap ⚙️ to manage, rename, reorder, or delete strategies.
- **Capture Snapshot:** Save the current court layout and drawings as a named play.

---

## Running Locally

```bash
# Start a local HTTP server
python3 -m http.server 8000
```
Then open `http://localhost:8000` on your desktop or `http://<your-mac-ip>:8000` on an iPad connected to the same Wi-Fi network.
