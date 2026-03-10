# Completion: Frontend Overhaul v0.3.0

**Date:** 2026-03-10
**Plan:** `docs/frontend-overhaul-plan.md`
**Status:** Implemented (Phases 1–5)

---

## Summary

Complete frontend rewrite from a 3-file prototype (~400 lines) to a modular, production-grade terminal UI (18 files, ~1200 lines). Zero external JS dependencies. Vanilla ES modules, no build step.

---

## What Changed

### File Structure

**Before:**
```
frontend/
├── index.html       (34 lines)
├── style.css        (228 lines)
└── main.js          (145 lines)
```

**After:**
```
frontend/
├── index.html              ← Rewritten: semantic HTML, ARIA, new layout
├── style.css               ← Now just @import hub for CSS modules
├── css/
│   ├── tokens.css          ← Design tokens: colors, spacing, typography
│   ├── base.css            ← Reset, overlays (scanlines/noise/vignette), boot screen, terminal frame, corners
│   ├── header.css          ← 3-column grid header, logo glow, status, indicator
│   ├── output.css          ← Message blocks (gutter/body/meta), markdown styles, copy button, new-messages indicator
│   ├── input.css           ← Textarea input, command counter, prompt glow, focus/processing states
│   ├── footer.css          ← Telemetry strip (animated progress bar), status footer
│   ├── model-selector.css  ← Custom dropdown (replaces native <select>)
│   ├── animations.css      ← All @keyframes, streaming cursor, prefers-reduced-motion
│   └── responsive.css      ← Breakpoints at 768px and 480px
├── js/
│   ├── main.js             ← Entry point: init sequence, input handling, state subscriptions
│   ├── terminal.js         ← Centralised state + observer pattern (subscribe/setState)
│   ├── connection.js       ← WebSocket with exponential backoff reconnection
│   ├── messages.js         ← Message rendering, markdown, auto-scroll, copy-to-clipboard
│   ├── model-selector.js   ← Custom dropdown: keyboard nav, grouped options, provider tags
│   ├── telemetry.js        ← Live clock, uptime counter, sync ratio, processing indicators
│   └── boot.js             ← Boot sequence animation (sequential line reveal)
```

**Deleted:**
- `frontend/main.js` (old monolithic script — replaced by `js/main.js` ES module)

---

## Design System (Phase 1)

### Typography
- **Font:** IBM Plex Mono (Google Fonts CDN) with Consolas/Courier New fallback
- **Scale:** 5 sizes from 9px (`--font-xs`) to 16px (`--font-lg`), all in CSS custom properties
- All UI chrome is uppercase with tracked letter-spacing

### Spacing
- 4px base unit grid: `--sp-1` (4px) through `--sp-8` (32px)
- All padding, margins, gaps derived from this scale — no magic numbers

### Color Palette
- Extended from 7 to 18 tokens across 5 depth layers (bg-deep → bg-overlay)
- Each accent (red, blue, green, amber) now has 3 tiers: full, dim, glow
- Border tokens tiered: hard, soft, faint
- Added `--text-faint` for ornamental/ghost elements

### Glow & Shadow
- Standardised neon glow effects via `text-shadow` and `box-shadow` using `*-glow` tokens
- Logo: dual-layer glow (red-dim inner + red-glow outer)
- Status indicator: green glow with animation

---

## Layout (Phase 2)

### New Terminal Structure
```
┌─ corner accents ─────────────────────────────┐
│ Header: [LOGO // SUBTITLE] [● STATUS│SYN│T+] [MODEL ▾] │
├──────────────────────────────────────────────┤
│ Output area (messages with gutter + meta)     │
│ [NEW MESSAGES ▾] (when scrolled up)           │
├─ Telemetry: T:0042 │ ITER:--/10 │ LATENCY:— ┤
│ Input: 000 >> [textarea]               [ENTER]│
├──────────────────────────────────────────────┤
│ Footer: HERMES v0.3.0 // CRIMSON SUN  ● READY│
└─ corner accents ─────────────────────────────┘
```

### Header
- 3-column CSS grid (left/center/right) replacing simple flex row
- Center column: indicator dot, status, sync ratio, uptime counter
- Bottom border glow (gradient fade) — shifts red on disconnect

### Corner Accents
- 4 decorative L-shaped corner marks in `--red-dim`
- Pure CSS via border tricks on absolutely-positioned divs

### Atmospheric Overlays
- **Scanlines:** Reduced from 8% to 5% opacity
- **Noise:** SVG fractal noise texture at 2.5% opacity (CSS inline SVG)
- **Vignette:** Radial gradient darkening at edges (35% at corners)
- All three layers stack to create convincing CRT depth

---

## Chrome (Phase 2)

### Custom Model Selector
- Replaced native `<select>` with custom dropdown panel
- Trigger button: amber text, border glow on hover/focus
- Dropdown: grouped by provider with red group labels
- Each option shows model name + size/provider tag
- Active model highlighted with amber left border
- Full keyboard support: Arrow keys, Enter, Escape
- Click-outside to close

### Input Bar
- Changed from `<input>` to `<textarea>` for multiline support
- Enter to submit, Shift+Enter for newline
- Auto-resize on input (grows up to 6em max)
- Left gutter: command counter (000, 001, ...)
- Right edge: `[ENTER]` hint
- Focus state: bottom border glows blue
- Processing state: bottom border pulses amber

### Status Footer
- New persistent bar: version, live clock (updates every second), connection state
- State indicator: `● READY` (green), `● PROCESSING` (amber, pulsing), `● LINK SEVERED` (red, pulsing)

### Telemetry Strip
- Thin bar between output and input with ornamental diagnostics
- Shows: message count, iteration placeholder, latency placeholder
- Animated sweep bar during processing (amber glow moving left→right)

---

## Messages (Phase 3)

### Structured Message Blocks
- Each message has: **gutter** (index number + colored bar) + **body** (content + meta)
- Index numbers: zero-padded 3-digit sequential counter
- Type bars: amber (system), blue (user), red-dim (assistant)
- Meta line: timestamp + model name (for non-system messages)

### Markdown Rendering
- Assistant messages rendered with safe markdown:
  - Code blocks (triple-backtick) with `--bg-deep` background and amber left border
  - Inline code with `--bg-surface` background
  - Bold, italic
  - Links (http/https only — no `javascript:` for XSS safety)
- HTML-escaped first, then regex-transformed — no XSS vectors
- User and system messages use `textContent` (no HTML rendering)

### Smart Auto-Scroll
- Tracks whether user has scrolled up (threshold: 60px from bottom)
- If scrolled up: new messages arrive but don't force scroll
- "NEW MESSAGES ▾" button appears — click to jump to bottom
- If at bottom: auto-scrolls as before

### Copy to Clipboard
- Assistant messages show a COPY button on hover (top-right of message body)
- Click copies raw text, button briefly shows "COPIED" in green
- Uses `navigator.clipboard.writeText()`

### Message Transitions
- New messages fade in with `opacity: 0→1` + subtle `translateX(-4px→0)` over 150ms

---

## Atmosphere (Phase 4)

### Boot Sequence
- 2-3 second startup animation on fresh page load
- Sequential line reveal: title, divider, status checks with "OK" tags
- Boot screen fades out (0.5s), terminal fades in (0.4s)
- Boot screen DOM removed after animation completes
- Models loaded in parallel during boot (no wasted time)

### Processing State (Multi-Indicator)
- Telemetry bar: animated amber sweep
- Input bar: bottom border pulses amber
- Footer: "● PROCESSING" in amber, pulsing
- Output: minimal `···` indicator (replaces verbose "PROCESSING..." text)
- Input disabled, placeholder shows "AWAITING RESPONSE..."

### Disconnection State
- Header bottom glow shifts to red
- Footer: "● LINK SEVERED" in red, pulsing
- Uptime shows `T+--:--:--`
- System message: "LINK SEVERED — RECONNECTING..."

---

## Engineering (Phase 5)

### ES Modules
- Native `import`/`export` (no bundler)
- `<script type="module">` in HTML (deferred by default)
- 7 modules with clean dependency graph (no circular imports):
  - `terminal.js` → leaf (no imports)
  - `connection.js`, `messages.js`, `telemetry.js`, `boot.js` → import `terminal.js`
  - `model-selector.js` → imports `terminal.js` + `connection.js`
  - `main.js` → imports all

### State Management
- Centralised state object in `terminal.js`
- `getState()` returns a copy (immutable reads)
- `setState(patch)` merges and notifies all subscribers
- Simple observer pattern: `subscribe(fn)` returns unsubscribe function
- Each module subscribes to the state changes it cares about

### Connection Resilience
- Exponential backoff: 1s → 2s → 4s → 8s → ... → max 30s
- Reset on successful connection
- State-driven UI updates (no manual DOM toggling in connection code)

### Responsive Design
- **768px:** Header collapses to single column, centered content
- **480px:** Border frame removed, corners hidden, telemetry hidden, command counter hidden, CRT effects disabled for performance, font sizes reduced

### Accessibility
- Semantic HTML: `<header>`, `<main>`, `<footer>`, `<button>`
- `role="log"` + `aria-live="polite"` on output area
- `role="listbox"` + `role="option"` on model dropdown
- `aria-haspopup`, `aria-expanded` on dropdown trigger
- `aria-label` on all interactive elements
- `aria-hidden="true"` on decorative elements
- `prefers-reduced-motion`: all animations disabled, overlays hidden, boot skipped

---

## Protocol

**No backend changes.** The WebSocket protocol remains identical:
- Server → Client: `{ type: "system"|"assistant", content: string }`
- Client → Server: `{ content: string }` (user message)
- Client → Server: `{ type: "config", model: string, provider: string }`

---

## Dependencies

- **Added:** IBM Plex Mono font (Google Fonts CDN — external)
- **Removed:** None (was already zero-dep)
- **Runtime deps:** Zero (vanilla JS, native ES modules)
- **Build tools:** None (no build step)
