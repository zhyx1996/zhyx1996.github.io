# Design — 扶摇接海 (zhyx1996.github.io)

A locked design system for this personal site. Every page redesign reads this file
before emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

## Identity

A personal homepage for a Chinese engineer working on computer vision, autonomous
driving perception, and parallel computing. The name 扶摇接海 comes from 《庄子·逍遥游》
("北海虽赊，扶摇可接" — though the North Sea is far, the whirlwind can reach it).
The voice is **literary-technical**: a classical Chinese literary identity carrying
modern, precise technical content.

## Genre

editorial (literary-technical). The page reads like a curated field journal / studio
index rather than a SaaS landing. Serif Chinese display, hairline rules, deliberate
white space, one seal-amber accent used with restraint.

## Macrostructure family

One site, one system. Pages share the shell (sidebar index + content column) and vary
only in the section composition within the content column.

- Home:          Split hero (identity + field index) → latest articles → market snapshot → games
- Content pages: Banner (title + stat) → content list
- Game pages:    Banner (title + stat) → controls/tabs → board or window

## Theme

- `--color-paper`   oklch(96.2% 0.018 90)   warm ivory paper
- `--color-paper-2` oklch(98.6% 0.010 90)   card surface
- `--color-paper-3` oklch(92.5% 0.022 88)   inset
- `--color-ink`     oklch(22% 0.030 50)     deep warm ink
- `--color-ink-2`   oklch(40% 0.022 52)     secondary
- `--color-ink-3`   oklch(56% 0.016 60)     muted
- `--color-rule`    oklch(86% 0.020 88)     hairline
- `--color-accent`  oklch(66% 0.16 55)      seal amber (品牌色, kept)
- `--color-accent-ink` oklch(98.6% 0.010 90)
- `--color-focus`   oklch(66% 0.16 55)
- Secondary accent: teal oklch(60% 0.11 190) — used only for up/positive states.

## Typography

Bilingual pairing. CJK display runs serif (Noto Serif SC) for the literary feel; Latin
display runs Space Grotesk; body runs Inter + Noto Sans SC; technical/labels run mono.

- Display: "Space Grotesk" (Latin) + "Noto Serif SC" (CJK), weights 600/700/900
- Body:    "Inter" (Latin) + "Noto Sans SC" (CJK), weights 400/500/600
- Mono:    "JetBrains Mono", weights 400/500/600
- Display tracking: -0.02em on large, 0 on small. No italic headers (roman only).
- Type scale anchor: --text-display = clamp(2.4rem, 7vw, 4rem)

## Spacing

4-point named scale. Values live in `styles.css` :root. Pages use named tokens
(`var(--space-md)`), never raw values.

## Motion

- Easings: cubic-bezier(0.16, 1, 0.3, 1) (`--ease-out`), cubic-bezier(0.55, 0.06, 0.68, 0.19) (`--ease-in`), cubic-bezier(0.65, 0, 0.35, 1) (`--ease-in-out`)
- Reveal pattern: fade + 8px rise, once, ≤ 500ms. Sections reveal on scroll.
- Reduced-motion fallback: opacity-only, ≤ 150ms.

## Microinteractions stance

- Silent success. No celebratory toasts.
- Buttons: background/color swap on hover, 1px lift. Focus ring appears instantly (no animation).
- Hover tooltips delayed 800ms; focus tooltips 0ms.

## CTA voice

- Primary: solid ink (near-black) pill, text paper. Hover → seal amber.
- Secondary: hairline outline pill, text ink-2. Hover → ink border.

## Per-page allowances

- Home MAY use the interactive pretext field-index (Tier-A CSS/SVG art) — the signature.
- Content pages: typography only.
- Game pages: function carries the page; the dark board/window is the voice.

## What pages MUST share

- The 扶 seal wordmark (rounded square, seal amber, white 扶).
- The seal-amber accent and its placement (≤ 5 % of viewport).
- The display + body + mono fonts.
- The CTA voice.
- Section heading rhythm (eyebrow + display heading).

## What pages MAY differ on

- Section composition within the content column.
- Enrichment — only on the home hero, Tier-A only.

## Exports

The token block in `styles.css` is the single source of truth. See `design.md`
Exports in hallmark for DTCG / Tailwind / shadcn mappings when needed.
