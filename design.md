# Deep Field — design lock

Custom atmospheric theme for Skilltimate Learn. Every page in this repo obeys this file. If a change contradicts it, change this file first, deliberately.

## Tokens (locked)

```css
--bg:      oklch(0.155 0.028 252);  /* deep azure night */
--bg-2:    oklch(0.19  0.03  250);
--panel:   oklch(0.215 0.032 250);
--line:    oklch(0.32  0.03  250);
--text:    oklch(0.93  0.01  250);
--faint:   oklch(0.68  0.02  250);
--accent:  oklch(0.63  0.16  244);  /* azure */
--accent-2:oklch(0.78  0.12  200);  /* cyan support */
--good:    oklch(0.72  0.15  155);
--warn:    oklch(0.78  0.15  85);
--bad:     oklch(0.62  0.19  25);
--paper:   oklch(0.97  0.005 95);   /* light reading wells */
--paper-tx:oklch(0.25  0.02  260);
```

## Type

- **Space Grotesk (variable)** — display, headings, stat numbers ≥ 2rem
- **Inter (variable)** — body, UI
- **IBM Plex Mono** — timers, scores, codes, table numerics
- No italic headers. Weight and size carry hierarchy.

## Macrostructures

| Surface | Structure |
|---|---|
| Home | Stat-Led hero (live DB counts, never invented numbers) |
| Course detail | Feature-Stack |
| /learn, /studio | Workbench: fixed side-rail → slide-in drawer under 900px |
| Exam runner | Bespoke shell: sticky timer bar, question stage, fixed footer, palette drawer |
| Reading (articles/results) | Light `.paper` wells inside the dark chrome |

## Non-negotiables

- Buttons implement all 8 states (default/hover/active/focus-visible/disabled/loading/danger/quiet).
- Mobile gates at 320–768px: no horizontal scroll (`overflow-x: clip`), grids collapse via `minmax(0,1fr)`, tables get `.tbl-wrap` scroll shells, match rows stack.
- Honest UI: stats come from the database; pending video shows a labeled pending state; the marketing report mock is labeled "Illustrative report layout".
- Timers pulse (`.low`) under 5 minutes. Correct/wrong option colors only appear in practice check or post-submit review — never during a live simulation.
- Copy is direct. No "unlock your potential" filler.
