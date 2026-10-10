# SecureDrop Website: Design Analysis

Recorded before implementation, as required by `SecureDrop_Website_Plan.md`.
References studied: HeyClicky, Clean SaaS (Refero), Editorial SaaS (SaaSCrisp),
Customer.io and Supabase reference screenshots, Simha Digital full page,
SaaS Landing Page gallery.

## What makes the references feel natural

- **Copy does the heavy lifting.** HeyClicky explains the product in plain,
  conversational sentences. Nothing says "revolutionary" or "reimagined". The
  reader always knows what the product does and who it is for.
- **One idea per section, and sections look different.** The strong pages vary
  composition because content varies. A wide product shot here, a narrow
  text column there, a single contrasting band to break the rhythm.
- **Restraint reads as confidence.** Customer.io and Supabase use near-white
  backgrounds, one accent color, fine 1px borders, and almost no shadow. The
  product interface is the artwork.
- **Specificity beats decoration.** A believable share panel with real labels
  (expiry, downloads, open count) explains more than any abstract illustration.

## Patterns that fit SecureDrop

- Editorial, calm layout: light neutral page, deep slate text, one blue accent
  taken straight from the app (`#2C5CE6`).
- Fine borders and small radii (6 to 12px), matching the mobile app exactly.
- Product-led sections built from real interface fragments: the share panel,
  the expiry choices, the access states. All drawn as static SVG or HTML, and
  always labeled as an illustration so nobody mistakes it for a live dashboard.
- A single contrasting band (deep slate) for the security section, which is the
  one place the product should feel serious rather than friendly.
- Short, factual sentences. Real numbers only when they come from the product
  (100 MB per file, expiry from 15 minutes, one-time links).

## Patterns to avoid (from the anti-vibe-coded list)

- Gradient hero backgrounds, floating blobs, glassmorphism, glow borders.
- Three identical feature cards per section. Each section gets its own layout.
- Fake testimonials, logos, user counts, badges, "military-grade" claims.
- Emoji as icons. The site uses one hand-written SVG icon set with a
  consistent 1.5px stroke.
- Vague headlines. The hero says what the product does in the first line.
- Em dashes and en dashes in copy.

## How the mobile identity carries over

The mobile app is the source of truth. Tokens live in `design/tokens.json` and
mirror `app/src/theme/tokens.ts` exactly.

| Token | Light | Where it appears on the web |
|---|---|---|
| brand | `#2C5CE6` | primary buttons, links, focus rings, accent rules |
| background | `#F7F8FA` | page background |
| surface | `#FFFFFF` | panels, cards, form fields |
| surfaceVariant | `#EEF1F5` | code blocks, icon tiles, secondary bands |
| border | `#DDE2EA` | 1px rules, input borders, table lines |
| text / textMuted | `#0E1420` / `#5C6675` | headings and body / captions and labels |
| success / warning / danger | `#12855F` / `#9A6700` / `#C62828` | share status labels, form errors |

Dark mode follows the app: the app tracks the system color scheme, so the
website does the same via `prefers-color-scheme`, using the dark palette from
the same token file.

Type scale stays close to the app (24/18/15/13px) with a slightly larger hero
size for desktop readability. Controls keep the app's 48px minimum height,
10px radius, and 600 weight labels so a button feels like the same button on
both platforms.

Icon approach: one original SVG set, 1.5px strokes, round caps, sized on the
same 4px grid. Used only where it explains something.
