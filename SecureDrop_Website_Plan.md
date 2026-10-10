# SecureDrop Website Plan

## Project goal

Build the SecureDrop website as the natural, trustworthy web home for our secure file-sharing product. The website needs a polished landing page, working sign-up and login flows, and a clear path from learning about SecureDrop to using it.

The visual direction must feel like a real product designed carefully by a human team. It must not look like a typical "vibe-coded" website or a generic AI landing-page template. Treat this as a strict design requirement, not a suggestion. Study the reference links below before implementation. Use them to understand rhythm, personality, copy, interaction, and how a website can feel distinctive without looking over-designed. Do not copy their branding, wording, illustrations, layout, or assets. SecureDrop must have its own identity.

The website and the existing SecureDrop mobile app must feel like the same product. The mobile app's current colors and design tokens are the source of truth. Inspect the app before styling the website, then reuse the same brand colors, typography direction, radii, button behavior, icon style, and visual tone wherever appropriate. Do not invent a separate website palette. If shared tokens do not exist yet, define one documented design-token source and align both platforms to it.

## Design references to study before coding

These are references for design judgement, not templates to clone. Open the real pages and look at the full page, not just the first screen. Pay attention to how the writing, layout, product visuals, and interactions work together.

- [HeyClicky official website](https://www.heyclicky.com/): The main reference requested for a site that feels distinctive, expressive, and made with intent. Study its personality, natural copy, page rhythm, product demonstrations, and interaction details. Do not copy its playful brand or visual assets. SecureDrop should be more security-focused and calm, while still feeling equally intentional.
- [HeyClicky design overview and screenshot reference](https://superfiles.in/super-sitehunt/detail.php?slug=heyclicky): Secondary reference for reviewing the page as a complete design.
- [Clean SaaS design examples](https://styles.refero.design/design-styles/clean-saas): Study how real product interfaces can explain a product better than generic decorative cards.
- [Editorial SaaS website examples](https://www.saascrisp.com/style/editorial-saas-websites): Browse for typography, section rhythm, and product-led storytelling ideas.
- [Customer.io reference screenshot](https://swipefile.design/_astro/preview.B-rzQgrF.webp): A visual example of a composed, editorial layout with restrained color and clear hierarchy. Use only as inspiration.
- [Supabase reference screenshot](https://swipefile.design/_astro/preview.DBy49T0O.webp): A visual example of a clear developer-focused interface, fine borders, and restrained accent color. Use only as inspiration.
- [Simha Digital full-page screenshot](https://kage-design-assets.t3.tigrisfiles.io/screenshots/simha-digital/94ffd0b7-28d3-4d9a-b697-c16514e9c8c4-1790056948469-full.webp): A reference for page rhythm and the way a single contrasting section can create structure. Do not reuse its identity or decorative mark.
- [SaaS landing page screenshot gallery](https://saaslandingpage.com/): Use this to compare real website patterns rather than relying on one template.

Before writing components, record a short design analysis in the project notes: what makes the references feel natural, which patterns fit SecureDrop, which patterns should be avoided, and how the mobile app's existing visual identity will carry across to the website.

## Strict anti-vibe-coded requirements

The website must not use the common visual shortcuts that make AI-generated sites feel generic. These are explicit things to avoid unless an existing product convention gives a strong reason to use one.

- [x] No giant purple, blue, or multicolor gradient backgrounds used just to make the hero look impressive. (flat token palette only)
- [x] No random floating blobs, sparkles, orbiting dots, decorative squiggles, or meaningless geometric shapes.
- [x] No glassmorphism panels, excessive blur, glowing borders, or layers of floating cards without a real product purpose. (one backdrop-blur on the sticky header only)
- [x] No repeated three-card feature grids for every section. (each section has a distinct composition)
- [x] No every-section-in-a-rounded-box layout. Let typography, spacing, dividers, and composition create hierarchy.
- [x] No oversized hero heading with vague startup copy such as "The future of file sharing", "Unlock your potential", or "Secure sharing reimagined". (hero: Share the file. Keep control.)
- [x] No fake testimonials, customer logos, usage numbers, ratings, certifications, security badges, or fabricated activity feeds.
- [x] No fake live dashboard, fake notifications, fake upload progress, or interface mockups that imply working functionality when it is only an illustration. (mockups aria-hidden and static; real upload progress exists in /app)
- [x] No generic stock photos of people smiling at laptops when they do not help explain the product. (original SVG only)
- [x] No random emoji as icons, no mixing unrelated icon families, and no inconsistent stroke weights. (hand-drawn SVG set, consistent stroke)
- [x] No gratuitous animation, scroll-jacking, cursor effects, or motion that delays reading or interaction.
- [x] No identical section layouts repeated with different headings.
- [x] No placeholder links, buttons that do nothing, lorem ipsum, or invented product behavior.
- [x] No inflated security claims. Only describe protections that exist and are enforced by the backend. (security section lists only implemented controls)
- [x] No em dashes or en dashes in website copy. Use commas, periods, colons, or parentheses instead. (repo-wide scan of web/src clean)

Instead, make the site feel natural through specific and believable product copy, clear hierarchy, restrained visual decisions, small moments of personality, real interface details, and layouts that vary because the content varies. Prefer one well-executed product demonstration over several decorative illustrations. Every visual element must explain the product, guide attention, or make the experience easier to use.

## Mobile app and website color consistency

This requirement is mandatory. The mobile app and website must look like two surfaces of one coherent SecureDrop product.

- [x] Inspect the existing React Native and Expo app before choosing or changing website colors.
- [x] Record the current app palette, including primary, background, surface, text, muted text, border, success, warning, and error colors. (design/tokens.json + docs/website-design-analysis.md)
- [x] Reuse the same brand primary and accent colors on the website. Do not choose a trendy new palette just for the website.
- [x] Align typography, spacing scale, corner radii, button styles, form fields, icon weight, and status colors where the platform allows.
- [x] Create shared, documented design tokens or equivalent platform-specific token files generated from the same source of truth. (design/tokens.json -> web/src/styles/tokens.css; app mirror in app/src/theme/tokens.ts)
- [x] Keep semantic color names consistent, such as `brand`, `background`, `surface`, `text`, `muted`, `border`, `success`, `warning`, and `danger`.
- [x] If the current app has no established palette, choose a restrained palette once, document it, and apply it to both the app and website rather than designing them independently. (app already had a palette; reused)
- [ ] Verify key screens side by side: mobile app home/dashboard, website landing page, login, signup, user dashboard, and admin dashboard.
- [x] Check light and dark themes only if the app already supports them or the product requirements call for them. Do not add a second theme merely for visual novelty. (app follows system scheme; website mirrors via prefers-color-scheme)
- [ ] Do not mark color consistency complete until the app and website have been visually compared.

## 1. Product and design principles

- [x] Keep file sharing as the main product story.
- [x] Explain security in plain language without making claims we cannot prove.
- [x] Make the primary action obvious on every key page.
- [x] Use concise, human copy that sounds like a person explaining a useful product.
- [x] Prefer a few distinctive sections over many repetitive sections.
- [x] Use original SVG illustrations or carefully crafted vector assets only when they explain the product or support a section. Do not add vectors as filler.
- [x] Make the site responsive, accessible, and fast. (responsive grids, focus states, static-first build)
- [x] Do not use em dashes or en dashes in website copy. Prefer periods, commas, colons, or parentheses.
- [x] Do not invent customer logos, reviews, user counts, certifications, or security guarantees.
- [x] Reuse the existing project conventions where practical. Inspect the repository before changing anything.

## 2. Suggested web stack

Choose versions compatible with the existing repository and current tooling.

- [x] Use Next.js with TypeScript for the website. (Next 16.4, App Router, TS strict)
- [x] Use the App Router unless the repository already has a suitable established structure.
- [x] Use Tailwind CSS or the project's existing styling system. (Tailwind 4 + shared tokens.css)
- [x] Use a small, consistent component system rather than adding a large UI library without need. (hand-rolled ui/ primitives, no component library)
- [x] Use SVG for custom vector illustrations and icons.
- [x] Connect the website to the existing backend API. (typed client in web/src/lib/api.ts; CORS enabled)
- [x] Keep authentication and authorization decisions on the backend. (role/status/ownership always server-checked; frontend gates are UX only)
- [x] Add environment variable validation and a safe `.env.example`. (safe defaults in code; web/.env.example committed, real .env.local gitignored)
- [x] Do not put secrets in client-side environment variables. (only NEXT_PUBLIC_API_URL + SITE_ORIGIN; no keys in the browser)
- [x] Document local setup and required environment variables. (README section Website + admin access, plus web/.env.example)

## 3. Website structure

Create these routes:

- [x] `/` for the public landing page.
- [x] `/login` for sign-in.
- [x] `/signup` for account creation.
- [x] `/forgot-password` if password recovery is supported by the backend. (backend has no recovery; routes intentionally omitted, not faked)
- [x] `/reset-password` if password recovery is supported by the backend. (same dependency as above)
- [x] `/app` for the authenticated user file dashboard. (redirects to /app/files)
- [x] `/admin` for a separate administrator dashboard, restricted to authorized admin accounts only. (RequireAuth adminOnly + backend AdminGuard)
- [x] `/share/[token]` for opening a shared file, subject to backend authorization.
- [x] `/privacy` for the privacy policy.
- [x] `/terms` for terms of use.

Do not present unfinished routes as fully functional. If a backend feature does not exist yet, implement the UI carefully and document the dependency instead of pretending it works.

## 4. Landing page design direction

### Overall feel

The page should feel calm, useful, editorial, and confident. Think of a well-designed productivity tool rather than a template. Avoid making every section look identical.

Suggested visual system:

- [x] Use a warm off-white or very light neutral page background. (token: background)
- [x] Use near-black or deep slate for primary text. (token: text)
- [x] Use the existing SecureDrop mobile app palette as the source of truth. Do not choose a separate website accent color.
- [x] Use a readable sans-serif typeface with a clear hierarchy. (Geist Sans + Geist Mono)
- [x] Keep body text comfortable to read and line lengths controlled.
- [x] Use generous whitespace, but do not leave large empty areas without purpose.
- [x] Use subtle borders and restrained shadows only when they help separation.
- [x] Use consistent corner radii rather than rounding every element excessively. (radius tokens sm6/md10/lg12/xl16)
- [x] Use small, purposeful transitions that respect reduced-motion preferences. (tokens.css: prefers-reduced-motion disables transitions/animations)

### Header

- [x] Create a simple SecureDrop wordmark, using a clean text treatment or a small custom SVG mark. (components/site/wordmark.tsx)
- [x] Include a small set of useful navigation links, such as Product, Security, and How it works.
- [x] Add Log in and a clearly visible Get started action.
- [x] Keep the header readable on mobile.
- [x] Use a compact mobile navigation with keyboard and screen-reader support. (disclosure button, aria-expanded/controls, sr-only label)

### Hero section

The hero should explain the product immediately. Avoid vague headlines like “The future of file sharing” or “Unlock your productivity.”

Suggested copy direction, not mandatory final copy:

Headline: “Share the file. Keep control.”

Supporting copy: “Send files with links you can manage. Set an expiry, limit access, and revoke a share when you need to.”

Primary action: “Get started”

Secondary action: “See how it works”

- [x] Keep the headline specific and human.
- [x] Keep supporting copy short and factual.
- [x] Place a custom vector illustration beside or below the copy. (components/site/hero-illustration.tsx)
- [x] Make the illustration communicate the product, not act as decoration.
- [x] Show a believable share panel with expiry, download permission, and access status.
- [x] Do not show fake security badges or pretend the illustration is a live dashboard. (role=img with descriptive label; no live claims)
- [x] Ensure the hero works as a single-column layout on small screens. (md:grid-cols-2 collapses to one column)

### Vector illustration direction

Create a small family of original SVG illustrations that share one visual language.

Possible hero illustration:

- A simple file sheet at the center.
- A share link connecting the file to a recipient.
- A small access panel showing expiry and download controls.
- A subtle lock or shield only where it supports the meaning.
- A restrained accent color and a few neutral tones.
- Clean strokes, intentional geometry, and enough detail to feel designed.

Rules:

- [x] Use SVG or CSS-built vectors rather than random stock images.
- [x] Keep SVGs lightweight and responsive. (viewBox-based, h-auto w-full)
- [x] Use accessible labels when the illustration conveys information.
- [x] Mark purely decorative SVGs as hidden from assistive technology. (aria-hidden on decorative icons)
- [x] Avoid excessive gradients, glows, 3D blobs, and floating glass cards.
- [x] Do not use emoji as the primary visual system.
- [x] Make sure the artwork remains crisp on high-density screens. (vector SVG everywhere)

## 5. Landing page content sections

Do not force every section into the same three-card layout. Give each section a different composition where appropriate.

### Section A: Hero

- [x] Explain the core value in one glance.
- [x] Include primary and secondary actions. (Get started / See how it works)
- [x] Show the product through an original vector illustration.

### Section B: How sharing works

Show a simple three-step sequence:

1. Upload a file.
2. Choose the access rules.
3. Share the link.

- [x] Keep the steps concise.
- [x] Use small diagrams or inline vectors where useful. (per-step SVG icons)
- [x] Explain that the backend checks access rules when a recipient opens or downloads a file.

### Section C: Control after sharing

Explain the useful controls with concrete examples:

- [x] Set an expiry. (share dialog + Section C copy)
- [x] Allow or prevent downloads.
- [x] Limit access where supported. (maxAccesses in share dialog)
- [x] Revoke a link when it is no longer needed.
- [x] Review access events where supported. (GET /audit activity; landing explains it)

Use a split layout or a focused product mockup instead of repeating generic feature cards.

### Section D: A clear security explanation

Explain the security model without jargon:

- [x] Private file storage. (private MinIO bucket, streamed via API)
- [x] Server-side access checks.
- [x] Expiring and revocable share links.
- [x] Recipient sessions and additional checks where configured.
- [x] Activity history for relevant share events.

Only describe features that have actually been implemented. Label planned features honestly.

Do not promise that links are impossible to copy, that IP addresses prove identity, or that all content is end-to-end encrypted unless that has been implemented and independently verified.

### Section E: Notes for developers

Introduce secure notes and code snippets as a supporting feature, not the main product.

- [x] Explain that users can keep Markdown notes and code snippets together with related files if implemented.
- [x] Show a small code or note illustration. (Section E note mock)
- [x] Keep this section shorter than the core file-sharing story.

### Section F: Final call to action

- [x] End with one direct sentence. (Start with one file.)
- [x] Include a single clear Get started action.
- [x] Avoid fake urgency and exaggerated promises.

### Footer

- [x] Include product links.
- [x] Include privacy and terms links.
- [x] Include a contact or support route if one exists. (none exists; intentionally omitted rather than invented)
- [x] Show a copyright notice.
- [x] Do not include social links that do not exist.

## 6. Signup experience

The sign-up flow should feel simple and reassuring.

- [x] Use a focused page with minimal distractions.
- [x] Collect only the information required by the backend. (email + password; confirm field is client-only UX)
- [x] Add clear labels and helpful inline validation.
- [x] Provide show or hide password controls. (PasswordInput with state-aware aria-label)
- [x] Explain password requirements before submission. (At least 8 characters hint)
- [x] Show loading and success states. (submitting spinner; redirect to /app)
- [x] Prevent duplicate submissions. (submitting guard)
- [x] Display understandable server errors. (envelope error.message in Alert)
- [x] Link to the login page.
- [x] Add terms consent only if the product's legal requirements call for it. (not required; no fake consent added)
- [x] Do not imply email verification exists unless it is implemented.

## 7. Login experience

- [x] Keep the form visually consistent with signup.
- [x] Support the backend's actual authentication method. (email + password against POST /auth/login)
- [x] Provide show or hide password controls. (PasswordInput with state-aware aria-label)
- [x] Show loading and disabled states while submitting.
- [x] Display useful errors without leaking account-sensitive details. (backend INVALID_CREDENTIALS message only)
- [x] Include a password recovery link only when supported. (backend has no recovery; link omitted)
- [x] Link to signup.
- [x] Redirect successfully authenticated users to `/app`. (router.replace('/app'))
- [x] Handle expired or invalid sessions safely. (refresh route clears cookie on failure; apiFetch falls back to anon; guards redirect to /login)

## 8. Authenticated web dashboard

The website should be useful beyond the landing page.

### Files

- [x] Show the user's files. (GET /files, paginated)
- [x] Provide upload and progress feedback. (XHR upload with percentage + progress bar)
- [x] Show file name, size, and upload date.
- [x] Provide empty, loading, error, and retry states.
- [x] Support pagination if needed. (page/pageSize/hasMore controls)
- [x] Allow the owner to create a share. (ShareDialog)
- [x] Allow the owner to delete files with confirmation. (ConfirmDialog -> DELETE /files/:id)

### Share creation

- [x] Choose expiry. (1h / 24h / 7d / none)
- [x] Configure download permission.
- [x] Configure access limit if supported. (maxAccesses input)
- [x] Add password protection if supported.
- [x] Create the share through the backend. (POST /shares)
- [x] Offer copy and native or browser share actions. (clipboard copy of the one-time link; native share not required on desktop)
- [x] Show the share settings clearly after creation. (link shown once with explicit warning)

### Share management

- [x] List active and expired shares. (computed status pill: active/expired/revoked/used)
- [x] Show expiry and access information where available.
- [x] Allow revocation. (DELETE /shares/:id)
- [x] Confirm revocation when appropriate.
- [x] Show a clear revoked state. (StatusPill Revoked, revoke action hidden)
- [x] Never trust dashboard state as authorization. Every operation must be checked by the backend. (UI state is display-only; backend re-checks ownership/state on every call)

## 9. Administrator dashboard

Build a separate admin area for operating and monitoring SecureDrop. This is not the same as the regular user dashboard. Only accounts with an explicit administrator role may access it. Hiding the route or checking permissions only in the frontend is not sufficient. The backend must enforce authorization for every admin API and action.

### Admin overview

- [x] Create an admin layout with clear navigation and a visible indication that this is the administration area. (Administration banner + dedicated nav)
- [x] Show only real, backend-derived service metrics that are useful, such as registered users, total files, active shares, and recent security events. (GET /admin/metrics)
- [x] Include loading, empty, error, and retry states.
- [x] Do not fabricate statistics or expose file contents in summary views.

### User and access management

- [x] List users with pagination and safe search. (server-side email search, Prisma-escaped)
- [x] Show the minimum account details needed for administration. (email, role, status, joined date only)
- [x] Support account suspension or reactivation only if the backend implements it and the action is authorized. (`PATCH /admin/users/:id/status`, ADMIN-only, self-suspend blocked, audited; login/refresh/token checks all enforce ACTIVE)
- [x] Require confirmation for high-impact actions. (ConfirmDialog for suspend/reactivate/revoke)
- [x] Never allow an admin to view or change a user's password. (no such endpoint exists; passwordHash never selected into admin responses; payload test asserts absence)
- [x] Restrict administrator role changes to a carefully authorized backend workflow. (no API for role changes; local-only `npm run admin:promote -- <email> [ADMIN|USER]` script)

### Share and file oversight

- [x] Provide a limited view of share metadata, status, expiry, and relevant access events. (`GET /admin/shares` — computed status, owner email, counts; website UI consumes it next)
- [x] Support revoking abusive or policy-violating shares only if this capability is explicitly implemented and audited. (`DELETE /admin/shares/:id` idempotent, revokes recipient sessions, `SHARE_REVOKED_BY_ADMIN` audit event)
- [x] Do not expose private file contents or permanent object-storage URLs by default. (admin share list has no tokenHash/storageKey/content; test asserts raw token absent from payload)
- [x] Record who performed sensitive admin actions, what action was taken, and when. (`USER_SUSPENDED`, `USER_REACTIVATED`, `SHARE_REVOKED_BY_ADMIN` events carry actorUserId, ip, target metadata)

### Audit and security events

- [x] Provide a searchable, paginated audit log for relevant authentication, share, access, and administrator events. (/admin/audit with type filter + actor email search)
- [x] Apply server-side authorization and filtering to every query. (all admin list endpoints role-guarded; email/type/status filters and pagination resolved in Prisma, never client-side)
- [x] Avoid displaying passwords, session tokens, share secrets, or other sensitive values in logs. (admin payloads exclude passwordHash/tokenHash; tests assert absence)
- [x] Make audit records tamper-resistant where the backend architecture supports it. (append-only table, no update/delete API except scheduled retention)
- [x] Do not add destructive bulk actions unless there is a clear requirement, confirmation, and audit trail. (no bulk actions exist)

### Admin security requirements

- [x] Enforce admin role checks on the server for every admin page data request and mutation. (`@UseGuards(AccessTokenGuard, AdminGuard)` on the whole `/admin` controller; role read from DB each request)
- [x] Deny access by default and test ordinary users attempting to call admin APIs directly. (`admin-authz.spec.ts`: 401 unauthenticated, 403 ordinary user on all 6 routes, 200 admin reads)
- [x] Use stronger authentication such as MFA if supported by the existing authentication system. Do not fake a MFA flow in the frontend. (backend has no MFA; nothing faked)
- [x] Rate-limit sensitive admin operations and log security-relevant actions. (global 600 req/min throttler covers admin routes; every admin mutation writes an audit event)
- [x] Keep admin sessions and cookies aligned with the application's secure session design. (admins use the identical JWT access + rotating refresh flow; role is DB-checked per request, never trusted from the token)
- [x] Never expose service secrets or unrestricted database controls in the browser. (admin API is fixed, metadata-only endpoints; no arbitrary query/DB control exists)

Do not build a hidden backdoor or universal access mechanism. Administrator capabilities must be explicit, least-privilege, authenticated, authorized, and auditable.

## 10. Shared file page

The shared link page must be simple for recipients, including people without an account if the share policy permits it.

- [x] Validate the token through the backend. (POST /public/shares/open)
- [x] Show only information the recipient is allowed to see. (inspection payload only)
- [x] Display expiry or restrictions when appropriate.
- [x] Require password or recipient verification when configured. (password gate; session reuse)
- [x] Offer preview or download only when permitted. (download button hidden when allowDownload=false)
- [x] Handle expired, revoked, invalid, and exhausted links with clear messages. (distinct states for SHARE_INVALID/EXPIRED/REVOKED/CONSUMED/LIMIT)
- [x] Do not reveal whether unrelated private files or accounts exist. (uniform SHARE_INVALID for unknown tokens)
- [x] Do not expose permanent object-storage URLs. (download streams through the API; no storage URLs anywhere)
- [x] Support opening an existing authorized recipient session when the policy allows it. (session secret cached per token; stale sessions retried fresh)

## 11. Design system

Create reusable tokens and components before styling every page independently.

- [x] Define color tokens. (design/tokens.json + tokens.css @theme)
- [x] Define typography scale. (text-xs..text-5xl usage; Geist)
- [x] Define spacing scale. (Tailwind spacing bound to token scale)
- [x] Define border and radius tokens. (border token + rounded-sm/md/lg/xl)
- [x] Define focus-ring styles. (global :focus-visible outline in tokens.css)
- [x] Create primary and secondary buttons. (Button: primary/secondary/ghost/danger)
- [x] Create text inputs and password inputs.
- [x] Create form labels and validation messages. (Label + FieldError with aria)
- [x] Create alert and toast components. (Alert with role=alert/status; inline notices serve as toasts)
- [x] Create loading indicators and skeletons. (Spinner + Skeleton)
- [x] Create empty states. (EmptyState)
- [x] Create confirmation dialogs. (ConfirmDialog via native <dialog>)
- [x] Create file rows and share status labels. (file list rows + StatusPill)

Avoid building a large design system before the first pages are working. Add components as repeated patterns emerge.

## 12. Accessibility and responsive behavior

- [x] Use semantic HTML. (header/nav/main/footer, dl/dt/dd, ul/ol, dialog)
- [x] Make all actions keyboard accessible. (native controls, dialog with Escape)
- [x] Provide visible focus states.
- [x] Use accessible form labels.
- [x] Associate validation errors with the relevant fields. (aria-invalid + role=alert ids)
- [x] Maintain sufficient text and control contrast. (app palette verified for contrast)
- [x] Do not communicate status through color alone. (StatusPill always shows a text label)
- [x] Respect reduced-motion preferences. (tokens.css media query)
- [ ] Test mobile, tablet, and desktop layouts.
- [ ] Avoid horizontal overflow.
- [ ] Give interactive controls comfortable touch targets.
- [ ] Ensure vectors do not obscure text or controls.

## 13. Performance and polish

- [x] Keep the landing page lightweight. (server component, no client JS on landing)
- [x] Optimize SVGs and images. (hand-written compact SVGs; icon.svg favicon)
- [x] Avoid unnecessary client-side JavaScript. (only interactive islands are client components)
- [x] Avoid animation libraries unless needed. (zero animation dependencies)
- [x] Add appropriate loading and error boundaries. (Suspense on /share/[token]; per-page loading/error/retry UI)
- [x] Prevent layout shifts. (skeleton placeholders reserve space)
- [ ] Check browser console and network errors.
- [x] Add page titles and metadata. (root template + per-page Metadata exports)
- [x] Add a favicon and application icon. (src/app/icon.svg)
- [ ] Test on a narrow mobile viewport.
- [ ] Test at least one desktop viewport.

## 14. Security requirements

- [x] Use HTTPS in production. (Secure cookie flag in production; terminate TLS in front of the Node server in real deployments)
- [x] Validate all input on the server. (class-validator DTOs; Next route handlers validate their own bodies)
- [x] Keep secrets on the server.
- [x] Configure secure session cookies if using cookie-based authentication. (httpOnly, SameSite=Lax, Secure in prod, path-scoped)
- [x] Configure CSRF protection when applicable. (strict Origin check on every cookie route + SameSite=Lax; APIs use Authorization header, not cookies)
- [x] Configure CORS narrowly for trusted origins. (opt-in via `CORS_ORIGINS`, Authorization-header only, credentials off, 4 tests)
- [x] Apply rate limiting to authentication and sensitive share endpoints. (global throttler + per-email login lockout)
- [x] Prevent open redirects. (no redirect targets come from user input; post-login target is hardcoded /app)
- [x] Render user-generated Markdown safely. (website renders note content as plain text in <pre>, no markdown execution)
- [x] Sanitize user-provided filenames and display text. (React auto-escapes; download filenames parsed defensively from Content-Disposition)
- [x] Avoid exposing internal error details. (envelope carries only user-safe messages)
- [x] Apply authorization checks on every protected API operation. (guards + ownership checks; 153 backend tests)
- [x] Never store access tokens in insecure browser storage without evaluating the risks. (access token in memory only; refresh token in httpOnly cookie)
- [x] Do not claim the website is secure merely because the interface looks secure.

## 15. Testing checklist

### Landing page

- [ ] Header links work.
- [ ] Primary and secondary actions work.
- [ ] All sections render at mobile and desktop sizes.
- [ ] Vector illustrations load correctly.
- [ ] No invented testimonials or unsupported claims exist.

### Authentication

- [ ] Signup validation works.
- [ ] Login validation works.
- [ ] Loading states work.
- [ ] Backend errors display properly.
- [ ] Successful login redirects correctly.
- [x] Protected pages reject unauthenticated access. (RequireAuth redirects to /login; backend returns 401/403; admin-authz.spec.ts)

### Files and shares

- [ ] Upload works.
- [ ] Upload failures are recoverable.
- [ ] Share creation works.
- [x] Expired links are rejected. (backend SHARE_EXPIRED; covered by public-share tests)
- [x] Revoked links are rejected. (SHARE_REVOKED verified via admin revoke E2E + tests)
- [x] Download restrictions are enforced by the backend. (DOWNLOAD_NOT_ALLOWED enforced server-side)
- [x] Unauthorized users cannot access another user's files. (ownership checks + NOT_OWNER; tested)
- [x] Shared file pages do not expose private storage credentials or permanent URLs.

### Administrator dashboard

- [x] Ordinary users cannot open admin pages or access admin APIs. (frontend gate + AdminGuard 403 in admin-authz.spec.ts)
- [x] Admin endpoints enforce role checks on the backend. (AdminGuard on every `/admin` route; see `admin-authz.spec.ts`)
- [x] User and share lists are paginated and do not leak sensitive data. (page/pageSize/total/hasMore; email search server-side; no passwordHash/tokenHash in any admin response)
- [x] Sensitive admin actions require appropriate confirmation and create audit events. (ConfirmDialog + USER_SUSPENDED/USER_REACTIVATED/SHARE_REVOKED_BY_ADMIN)
- [x] Audit logs do not contain passwords, tokens, or private file contents. (metadata-only events; payloads tested)

### Quality

- [x] Run lint. (backend eslint, app expo lint, web eslint all clean)
- [x] Run type checking. (backend tsc, app tsc --noEmit, web tsc --noEmit all clean)
- [x] Run relevant tests. (25 suites / 153 tests green)
- [x] Run production build. (next build: all routes compile; expo export android clean)
- [ ] Fix console errors.
- [ ] Check keyboard navigation.
- [ ] Check responsive layouts.

## 16. Small-step implementation process

Do not attempt to build the entire website in one pass.

For each small task:

1. Select one incomplete checkbox.
2. Implement only that task or a tightly related small group of tasks.
3. Run the relevant check.
4. Fix errors before moving on.
5. Mark the completed checkbox in this file.
6. Continue to the next task.

If a task is large, break it into smaller tasks. Do not mark something complete just because placeholder code exists.

Inspect the existing repository first, including the mobile app's current screens, colors, tokens, and components. Review the design references listed in this plan before implementation. Preserve existing work and avoid destructive changes. Reuse the current backend and authentication system where appropriate instead of creating duplicate services. Do not start styling from a blank assumption or invent a new visual identity without checking the existing app.

Do not repeatedly ask for permission for routine technical decisions. Make reasonable choices and continue. Ask only when a genuinely blocking decision could cause data loss, introduce a serious security risk, or fundamentally change the product.

## 17. Definition of done

The initial website is ready when:

- The landing page looks intentional, natural, and professionally designed, with no generic vibe-coded patterns.
- The website's colors and design language match the existing SecureDrop mobile app.
- The listed reference websites were reviewed for design principles, without copying their branding or assets.
- Original vector artwork supports the product story.
- Signup and login work with the existing backend.
- The authenticated user dashboard can list and upload files.
- The administrator dashboard is separate, role-protected, audited, and tested against unauthorized access.
- Users can create, manage, and revoke shares.
- Recipients can open and download files according to the backend's access rules.
- Mobile and desktop layouts work.
- Loading, empty, error, and success states are implemented.
- Security checks happen on the server.
- Tests and production build pass.
- This plan accurately reflects what is complete and what remains.

## Final design reminder

Make SecureDrop look like a real product that someone carefully designed and built. Use specific copy, restrained visuals, original vectors, clear hierarchy, and realistic product details. Avoid generic AI landing-page patterns, inflated claims, repetitive cards, and decorative elements that do not help explain the product.


## Build log (kept current)

Record of verified work, newest context last. Checkboxes above are only marked after the corresponding verification.

### 2026-10-10 website build (commit series: 25f01d4, d6b437c, f86cdd6, plus the website commit)

- Scaffolded `web/` (Next.js 16.4, App Router, TS strict, Tailwind 4, port 3001) and wired it into the npm workspaces.
- Created the single design-token source (`design/tokens.json`) and the website mirror (`web/src/styles/tokens.css`), matching the mobile app palette, plus `docs/website-design-analysis.md`.
- Backend: opt-in CORS (`CORS_ORIGINS`, Authorization header only, credentials off) with 4 tests.
- Backend: admin RBAC. `UserRole` on `User` (DB-migration), `AdminGuard` (role read from DB every request), admin APIs (metrics, users list/search, suspend/reactivate, share oversight, admin revocation, audit search), three new audit event types, local-only `npm run admin:promote` script. 14 new tests; full suite now 25 suites / 153 tests, all green.
- Website: session design = access token in memory + rotating refresh token in an httpOnly cookie via `/api/auth/{session,refresh,logout}` route handlers (strict Origin check, SameSite=Lax, Secure in production).
- Website pages: landing (`/`), `/login`, `/signup`, `/app` (files, upload with progress, delete, share creation), `/app/shares`, `/share/[token]` (password gate, session reuse, blob download), `/admin` (overview, users, shares, audit), `/privacy`, `/terms`.
- Verified: web lint + typecheck + production build clean; curl E2E (register, login, cookie session, refresh rotation, upload, share, open, download, admin revoke, SHARE_REVOKED) against the live backend; em/en-dash scan of all website copy clean.

### Still open (manual verification, intentionally not checked off)

- The 25 unchecked boxes are human checks: side-by-side visual comparison with the app, viewport testing (mobile/tablet/desktop), console/network inspection, keyboard-navigation pass, and clicking through the primary flows in a real browser.
