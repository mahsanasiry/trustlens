# Design

The interface exists to show what evidence says without issuing verdicts, so the visual
language is built around one idea: evidence is weighed side by side, never scored.

## Signature element

The spectrum bar and the dark claim panel on the home page. A claim's evidence is split
into three positions (supports, adds context, contradicts) and drawn as proportional
segments. There is no total, no percentage and no colour that reads as "good" or "bad".

## Rules

- **Position is never carried by colour alone.** Supports is a filled circle, context a
  ring and contradicts a diamond, in every place the three appear.
- **Claims are set in a serif, everything else in a sans.** The serif marks words that
  are being examined; the sans marks TrustLens's own interface.
- **Colour comes from tokens.** Every value lives in `src/app/globals.css`, in light and
  dark, and `pnpm contrast:check` verifies every text and control pair for WCAG AA in
  every theme and accent.
- **Layout uses logical properties** (`inline-start`, `padding-inline`, and so on), so
  right-to-left locales mirror without separate rules.
- **Tracking is tightened only for scripts that tolerate it.** Arabic, Persian, Urdu,
  Hebrew, Indic and East Asian locales reset it to zero.
- **One animation.** The spectrum bar grows once on load. It is disabled when the
  visitor asks for reduced motion.
- **Claim and source text is not translated.** Like real claims on the platform, the
  sample claim stays in its original language and is marked with `lang`.
