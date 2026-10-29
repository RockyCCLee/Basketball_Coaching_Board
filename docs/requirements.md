# Basketball Coaching Board — Requirements & Specifications

A summary of all functional and technical requirements implemented in the Basketball Coaching Board.

---

## 1. Court Modes & Formations
- **Full Court & Half Court Modes:**
  - **Independent State:** Switching between Full and Half court retains each mode's tokens, movement tracks, and drawing annotations independently.
  - **Accurate FIBA Markings:** Standard court dimensions, realistic wood floor texture, painted keys/lanes, free-throw circles (solid outside, dashed inside key), restricted areas, backboards, and orange rims.
- **Default 2-3 Zone Defense Alignment:**
  - **Full Court:** Default token positions place both teams in a 2-3 zone alignment at opposite ends of the court.
  - **Half Court:** Defending team is positioned in a 2-3 zone; offensive team is spaced outside the 3-point arc.
- **Offence / Defence Role Switch:**
  - In Half Court mode, an instant toggle button switches your team's role between **Offence** and **Defence**.
  - The basketball automatically starts in the hands of offensive player #1.

---

## 2. Token & Ball Interaction Mechanics
- **Player & Ball Tokens:**
  - Two 5-player squads: Team Cyan (`#00CED1`, numbered 1–5) and Team Black (`#1A1A1A`, numbered 1–5), plus an orange basketball token.
- **Multi-Touch Support:**
  - Move multiple tokens simultaneously using multi-finger touch drag & drop on tablets and touchscreens.
- **Collision Avoidance (No Overlap):**
  - Tokens cannot overlap each other; dynamic collision resolution maintains physical spacing.
- **Magnetic Ball Possession:**
  - When the basketball is placed on or near a player token, dragging that player automatically carries the ball along.
  - Dragging the basketball directly allows passing or shooting the ball away from the player.
- **Bench / Sideline Parking:**
  - **Move Aside Button:** Instantly parks all player tokens off-court outside the sideline in both Full and Half court modes.
  - **Reset Players Button:** Returns all tokens back to their tactical default positions.

---

## 3. Movement Tracking Lines
- **Real-Time Movement Paths:**
  - Moving any player token automatically draws a broken (dashed) line illustrating its movement path.
  - Path color matches the token's team color (Cyan for Team Blue, Black for Team Black).
- **Track Controls:**
  - **Track On/Off Toggle:** Turn movement path tracking on or off anytime.
  - **Clear Lines Integration:** Clearing tactical lines also clears movement tracking lines.

---

## 4. Drawing & Annotation Tools
- **Tool Selector:**
  - Seamlessly switch between **Move (✋)**, **Draw (✏️)**, and **Erase (🧽)**.
- **Color Palette & Arrowheads:**
  - 5 tactical drawing colors: Red (`#E53935`), Green (`#00C853`), Blue (`#1E4FFF`), Yellow (`#FFD600`), and Black (`#111111`).
  - Matching SVG directional arrowheads for tactical pass, drive, screen, and cut notations.
- **Precision Erasing & History:**
  - **Erase Mode:** Stroke-based collision detection erases lines by swiping across them.
  - **Undo (↶):** Step backward through drawing actions and deletions.
  - **Clear Lines:** Instantly clears all drawn strokes and movement tracks.

---

## 5. Strategy & Playbook Management
- **Strategy Dropdown Selector:**
  - Quick-access menu to switch between saved plays and formations.
- **Built-in Tactical Presets:**
  - **Setup:** Base half-court offensive spacing against 2-3 zone defense with ball at #1.
  - **1v1 - 1:** Isolation spacing for player #1.
  - **Pick&Roll - 5/3/4:** High ball screen by #5 for #1, #5 rolling to the rim (red arrow), kick-out pass options to #3 and #4 (green arrows).
  - **Screen - 2/3/5:** Off-ball screen by #4 for #2 curling to the rim, ball screen by #5, with passing and handoff options.
- **Custom Snapshot Capture:**
  - Capture any board state (tokens, tracks, and drawn lines) into a new snapshot saved directly to the bottom of the strategy list.
- **Strategy Manager:**
  - **Rename:** Edit play names inline anytime.
  - **Reorder:** Rearrange the order of strategies in the dropdown list.
  - **Secure Deletion:** 3-second hold & slide-to-the-right gesture (or delete button) followed by a confirmation prompt (safeguards keeping at least one strategy).
- **Persistence & Migration:**
  - All plays and preferences persist automatically in browser `localStorage`.
  - Built-in schema migrations ensure updates and new presets sync without overwriting custom user plays.

---

## 6. PWA & Offline Support
- Fully functional offline via Service Worker asset caching (`sw.js`).
- "Add to Home Screen" support on iPad / iOS Safari and Android Chrome for a full-screen native app experience.
- Fast loading with zero external runtime library dependencies (pure HTML5, CSS3, and vanilla JavaScript).
