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

- [ ] No giant purple, blue, or multicolor gradient backgrounds used just to make the hero look impressive.
- [ ] No random floating blobs, sparkles, orbiting dots, decorative squiggles, or meaningless geometric shapes.
- [ ] No glassmorphism panels, excessive blur, glowing borders, or layers of floating cards without a real product purpose.
- [ ] No repeated three-card feature grids for every section.
- [ ] No every-section-in-a-rounded-box layout. Let typography, spacing, dividers, and composition create hierarchy.
- [ ] No oversized hero heading with vague startup copy such as "The future of file sharing", "Unlock your potential", or "Secure sharing reimagined".
- [ ] No fake testimonials, customer logos, usage numbers, ratings, certifications, security badges, or fabricated activity feeds.
- [ ] No fake live dashboard, fake notifications, fake upload progress, or interface mockups that imply working functionality when it is only an illustration.
- [ ] No generic stock photos of people smiling at laptops when they do not help explain the product.
- [ ] No random emoji as icons, no mixing unrelated icon families, and no inconsistent stroke weights.
- [ ] No gratuitous animation, scroll-jacking, cursor effects, or motion that delays reading or interaction.
- [ ] No identical section layouts repeated with different headings.
- [ ] No placeholder links, buttons that do nothing, lorem ipsum, or invented product behavior.
- [ ] No inflated security claims. Only describe protections that exist and are enforced by the backend.
- [ ] No em dashes or en dashes in website copy. Use commas, periods, colons, or parentheses instead.

Instead, make the site feel natural through specific and believable product copy, clear hierarchy, restrained visual decisions, small moments of personality, real interface details, and layouts that vary because the content varies. Prefer one well-executed product demonstration over several decorative illustrations. Every visual element must explain the product, guide attention, or make the experience easier to use.

## Mobile app and website color consistency

This requirement is mandatory. The mobile app and website must look like two surfaces of one coherent SecureDrop product.

- [ ] Inspect the existing React Native and Expo app before choosing or changing website colors.
- [ ] Record the current app palette, including primary, background, surface, text, muted text, border, success, warning, and error colors.
- [ ] Reuse the same brand primary and accent colors on the website. Do not choose a trendy new palette just for the website.
- [ ] Align typography, spacing scale, corner radii, button styles, form fields, icon weight, and status colors where the platform allows.
- [ ] Create shared, documented design tokens or equivalent platform-specific token files generated from the same source of truth.
- [ ] Keep semantic color names consistent, such as `brand`, `background`, `surface`, `text`, `muted`, `border`, `success`, `warning`, and `danger`.
- [ ] If the current app has no established palette, choose a restrained palette once, document it, and apply it to both the app and website rather than designing them independently.
- [ ] Verify key screens side by side: mobile app home/dashboard, website landing page, login, signup, user dashboard, and admin dashboard.
- [ ] Check light and dark themes only if the app already supports them or the product requirements call for them. Do not add a second theme merely for visual novelty.
- [ ] Do not mark color consistency complete until the app and website have been visually compared.

## 1. Product and design principles

- [ ] Keep file sharing as the main product story.
- [ ] Explain security in plain language without making claims we cannot prove.
- [ ] Make the primary action obvious on every key page.
- [ ] Use concise, human copy that sounds like a person explaining a useful product.
- [ ] Prefer a few distinctive sections over many repetitive sections.
- [ ] Use original SVG illustrations or carefully crafted vector assets only when they explain the product or support a section. Do not add vectors as filler.
- [ ] Make the site responsive, accessible, and fast.
- [ ] Do not use em dashes or en dashes in website copy. Prefer periods, commas, colons, or parentheses.
- [ ] Do not invent customer logos, reviews, user counts, certifications, or security guarantees.
- [ ] Reuse the existing project conventions where practical. Inspect the repository before changing anything.

## 2. Suggested web stack

Choose versions compatible with the existing repository and current tooling.

- [ ] Use Next.js with TypeScript for the website.
- [ ] Use the App Router unless the repository already has a suitable established structure.
- [ ] Use Tailwind CSS or the project's existing styling system.
- [ ] Use a small, consistent component system rather than adding a large UI library without need.
- [ ] Use SVG for custom vector illustrations and icons.
- [ ] Connect the website to the existing backend API.
- [ ] Keep authentication and authorization decisions on the backend.
- [ ] Add environment variable validation and a safe `.env.example`.
- [ ] Do not put secrets in client-side environment variables.
- [ ] Document local setup and required environment variables.

## 3. Website structure

Create these routes:

- [ ] `/` for the public landing page.
- [ ] `/login` for sign-in.
- [ ] `/signup` for account creation.
- [ ] `/forgot-password` if password recovery is supported by the backend.
- [ ] `/reset-password` if password recovery is supported by the backend.
- [ ] `/app` for the authenticated user file dashboard.
- [ ] `/admin` for a separate administrator dashboard, restricted to authorized admin accounts only.
- [ ] `/share/[token]` for opening a shared file, subject to backend authorization.
- [ ] `/privacy` for the privacy policy.
- [ ] `/terms` for terms of use.

Do not present unfinished routes as fully functional. If a backend feature does not exist yet, implement the UI carefully and document the dependency instead of pretending it works.

## 4. Landing page design direction

### Overall feel

The page should feel calm, useful, editorial, and confident. Think of a well-designed productivity tool rather than a template. Avoid making every section look identical.

Suggested visual system:

- [ ] Use a warm off-white or very light neutral page background.
- [ ] Use near-black or deep slate for primary text.
- [ ] Use the existing SecureDrop mobile app palette as the source of truth. Do not choose a separate website accent color.
- [ ] Use a readable sans-serif typeface with a clear hierarchy.
- [ ] Keep body text comfortable to read and line lengths controlled.
- [ ] Use generous whitespace, but do not leave large empty areas without purpose.
- [ ] Use subtle borders and restrained shadows only when they help separation.
- [ ] Use consistent corner radii rather than rounding every element excessively.
- [ ] Use small, purposeful transitions that respect reduced-motion preferences.

### Header

- [ ] Create a simple SecureDrop wordmark, using a clean text treatment or a small custom SVG mark.
- [ ] Include a small set of useful navigation links, such as Product, Security, and How it works.
- [ ] Add Log in and a clearly visible Get started action.
- [ ] Keep the header readable on mobile.
- [ ] Use a compact mobile navigation with keyboard and screen-reader support.

### Hero section

The hero should explain the product immediately. Avoid vague headlines like “The future of file sharing” or “Unlock your productivity.”

Suggested copy direction, not mandatory final copy:

Headline: “Share the file. Keep control.”

Supporting copy: “Send files with links you can manage. Set an expiry, limit access, and revoke a share when you need to.”

Primary action: “Get started”

Secondary action: “See how it works”

- [ ] Keep the headline specific and human.
- [ ] Keep supporting copy short and factual.
- [ ] Place a custom vector illustration beside or below the copy.
- [ ] Make the illustration communicate the product, not act as decoration.
- [ ] Show a believable share panel with expiry, download permission, and access status.
- [ ] Do not show fake security badges or pretend the illustration is a live dashboard.
- [ ] Ensure the hero works as a single-column layout on small screens.

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

- [ ] Use SVG or CSS-built vectors rather than random stock images.
- [ ] Keep SVGs lightweight and responsive.
- [ ] Use accessible labels when the illustration conveys information.
- [ ] Mark purely decorative SVGs as hidden from assistive technology.
- [ ] Avoid excessive gradients, glows, 3D blobs, and floating glass cards.
- [ ] Do not use emoji as the primary visual system.
- [ ] Make sure the artwork remains crisp on high-density screens.

## 5. Landing page content sections

Do not force every section into the same three-card layout. Give each section a different composition where appropriate.

### Section A: Hero

- [ ] Explain the core value in one glance.
- [ ] Include primary and secondary actions.
- [ ] Show the product through an original vector illustration.

### Section B: How sharing works

Show a simple three-step sequence:

1. Upload a file.
2. Choose the access rules.
3. Share the link.

- [ ] Keep the steps concise.
- [ ] Use small diagrams or inline vectors where useful.
- [ ] Explain that the backend checks access rules when a recipient opens or downloads a file.

### Section C: Control after sharing

Explain the useful controls with concrete examples:

- [ ] Set an expiry.
- [ ] Allow or prevent downloads.
- [ ] Limit access where supported.
- [ ] Revoke a link when it is no longer needed.
- [ ] Review access events where supported.

Use a split layout or a focused product mockup instead of repeating generic feature cards.

### Section D: A clear security explanation

Explain the security model without jargon:

- [ ] Private file storage.
- [ ] Server-side access checks.
- [ ] Expiring and revocable share links.
- [ ] Recipient sessions and additional checks where configured.
- [ ] Activity history for relevant share events.

Only describe features that have actually been implemented. Label planned features honestly.

Do not promise that links are impossible to copy, that IP addresses prove identity, or that all content is end-to-end encrypted unless that has been implemented and independently verified.

### Section E: Notes for developers

Introduce secure notes and code snippets as a supporting feature, not the main product.

- [ ] Explain that users can keep Markdown notes and code snippets together with related files if implemented.
- [ ] Show a small code or note illustration.
- [ ] Keep this section shorter than the core file-sharing story.

### Section F: Final call to action

- [ ] End with one direct sentence.
- [ ] Include a single clear Get started action.
- [ ] Avoid fake urgency and exaggerated promises.

### Footer

- [ ] Include product links.
- [ ] Include privacy and terms links.
- [ ] Include a contact or support route if one exists.
- [ ] Show a copyright notice.
- [ ] Do not include social links that do not exist.

## 6. Signup experience

The sign-up flow should feel simple and reassuring.

- [ ] Use a focused page with minimal distractions.
- [ ] Collect only the information required by the backend.
- [ ] Add clear labels and helpful inline validation.
- [ ] Provide show or hide password controls.
- [ ] Explain password requirements before submission.
- [ ] Show loading and success states.
- [ ] Prevent duplicate submissions.
- [ ] Display understandable server errors.
- [ ] Link to the login page.
- [ ] Add terms consent only if the product's legal requirements call for it.
- [ ] Do not imply email verification exists unless it is implemented.

## 7. Login experience

- [ ] Keep the form visually consistent with signup.
- [ ] Support the backend's actual authentication method.
- [ ] Provide show or hide password controls.
- [ ] Show loading and disabled states while submitting.
- [ ] Display useful errors without leaking account-sensitive details.
- [ ] Include a password recovery link only when supported.
- [ ] Link to signup.
- [ ] Redirect successfully authenticated users to `/app`.
- [ ] Handle expired or invalid sessions safely.

## 8. Authenticated web dashboard

The website should be useful beyond the landing page.

### Files

- [ ] Show the user's files.
- [ ] Provide upload and progress feedback.
- [ ] Show file name, size, and upload date.
- [ ] Provide empty, loading, error, and retry states.
- [ ] Support pagination if needed.
- [ ] Allow the owner to create a share.
- [ ] Allow the owner to delete files with confirmation.

### Share creation

- [ ] Choose expiry.
- [ ] Configure download permission.
- [ ] Configure access limit if supported.
- [ ] Add password protection if supported.
- [ ] Create the share through the backend.
- [ ] Offer copy and native or browser share actions.
- [ ] Show the share settings clearly after creation.

### Share management

- [ ] List active and expired shares.
- [ ] Show expiry and access information where available.
- [ ] Allow revocation.
- [ ] Confirm revocation when appropriate.
- [ ] Show a clear revoked state.
- [ ] Never trust dashboard state as authorization. Every operation must be checked by the backend.

## 9. Administrator dashboard

Build a separate admin area for operating and monitoring SecureDrop. This is not the same as the regular user dashboard. Only accounts with an explicit administrator role may access it. Hiding the route or checking permissions only in the frontend is not sufficient. The backend must enforce authorization for every admin API and action.

### Admin overview

- [ ] Create an admin layout with clear navigation and a visible indication that this is the administration area.
- [ ] Show only real, backend-derived service metrics that are useful, such as registered users, total files, active shares, and recent security events.
- [ ] Include loading, empty, error, and retry states.
- [ ] Do not fabricate statistics or expose file contents in summary views.

### User and access management

- [ ] List users with pagination and safe search.
- [ ] Show the minimum account details needed for administration.
- [x] Support account suspension or reactivation only if the backend implements it and the action is authorized. (`PATCH /admin/users/:id/status`, ADMIN-only, self-suspend blocked, audited; login/refresh/token checks all enforce ACTIVE)
- [ ] Require confirmation for high-impact actions.
- [x] Never allow an admin to view or change a user's password. (no such endpoint exists; passwordHash never selected into admin responses; payload test asserts absence)
- [x] Restrict administrator role changes to a carefully authorized backend workflow. (no API for role changes; local-only `npm run admin:promote -- <email> [ADMIN|USER]` script)

### Share and file oversight

- [x] Provide a limited view of share metadata, status, expiry, and relevant access events. (`GET /admin/shares` — computed status, owner email, counts; website UI consumes it next)
- [x] Support revoking abusive or policy-violating shares only if this capability is explicitly implemented and audited. (`DELETE /admin/shares/:id` idempotent, revokes recipient sessions, `SHARE_REVOKED_BY_ADMIN` audit event)
- [x] Do not expose private file contents or permanent object-storage URLs by default. (admin share list has no tokenHash/storageKey/content; test asserts raw token absent from payload)
- [x] Record who performed sensitive admin actions, what action was taken, and when. (`USER_SUSPENDED`, `USER_REACTIVATED`, `SHARE_REVOKED_BY_ADMIN` events carry actorUserId, ip, target metadata)

### Audit and security events

- [ ] Provide a searchable, paginated audit log for relevant authentication, share, access, and administrator events.
- [x] Apply server-side authorization and filtering to every query. (all admin list endpoints role-guarded; email/type/status filters and pagination resolved in Prisma, never client-side)
- [ ] Avoid displaying passwords, session tokens, share secrets, or other sensitive values in logs.
- [ ] Make audit records tamper-resistant where the backend architecture supports it.
- [ ] Do not add destructive bulk actions unless there is a clear requirement, confirmation, and audit trail.

### Admin security requirements

- [x] Enforce admin role checks on the server for every admin page data request and mutation. (`@UseGuards(AccessTokenGuard, AdminGuard)` on the whole `/admin` controller; role read from DB each request)
- [x] Deny access by default and test ordinary users attempting to call admin APIs directly. (`admin-authz.spec.ts`: 401 unauthenticated, 403 ordinary user on all 6 routes, 200 admin reads)
- [ ] Use stronger authentication such as MFA if supported by the existing authentication system. Do not fake an MFA flow in the frontend.
- [x] Rate-limit sensitive admin operations and log security-relevant actions. (global 600 req/min throttler covers admin routes; every admin mutation writes an audit event)
- [x] Keep admin sessions and cookies aligned with the application's secure session design. (admins use the identical JWT access + rotating refresh flow; role is DB-checked per request, never trusted from the token)
- [x] Never expose service secrets or unrestricted database controls in the browser. (admin API is fixed, metadata-only endpoints; no arbitrary query/DB control exists)

Do not build a hidden backdoor or universal access mechanism. Administrator capabilities must be explicit, least-privilege, authenticated, authorized, and auditable.

## 10. Shared file page

The shared link page must be simple for recipients, including people without an account if the share policy permits it.

- [ ] Validate the token through the backend.
- [ ] Show only information the recipient is allowed to see.
- [ ] Display expiry or restrictions when appropriate.
- [ ] Require password or recipient verification when configured.
- [ ] Offer preview or download only when permitted.
- [ ] Handle expired, revoked, invalid, and exhausted links with clear messages.
- [ ] Do not reveal whether unrelated private files or accounts exist.
- [ ] Do not expose permanent object-storage URLs.
- [ ] Support opening an existing authorized recipient session when the policy allows it.

## 11. Design system

Create reusable tokens and components before styling every page independently.

- [ ] Define color tokens.
- [ ] Define typography scale.
- [ ] Define spacing scale.
- [ ] Define border and radius tokens.
- [ ] Define focus-ring styles.
- [ ] Create primary and secondary buttons.
- [ ] Create text inputs and password inputs.
- [ ] Create form labels and validation messages.
- [ ] Create alert and toast components.
- [ ] Create loading indicators and skeletons.
- [ ] Create empty states.
- [ ] Create confirmation dialogs.
- [ ] Create file rows and share status labels.

Avoid building a large design system before the first pages are working. Add components as repeated patterns emerge.

## 12. Accessibility and responsive behavior

- [ ] Use semantic HTML.
- [ ] Make all actions keyboard accessible.
- [ ] Provide visible focus states.
- [ ] Use accessible form labels.
- [ ] Associate validation errors with the relevant fields.
- [ ] Maintain sufficient text and control contrast.
- [ ] Do not communicate status through color alone.
- [ ] Respect reduced-motion preferences.
- [ ] Test mobile, tablet, and desktop layouts.
- [ ] Avoid horizontal overflow.
- [ ] Give interactive controls comfortable touch targets.
- [ ] Ensure vectors do not obscure text or controls.

## 13. Performance and polish

- [ ] Keep the landing page lightweight.
- [ ] Optimize SVGs and images.
- [ ] Avoid unnecessary client-side JavaScript.
- [ ] Avoid animation libraries unless needed.
- [ ] Add appropriate loading and error boundaries.
- [ ] Prevent layout shifts.
- [ ] Check browser console and network errors.
- [ ] Add page titles and metadata.
- [ ] Add a favicon and application icon.
- [ ] Test on a narrow mobile viewport.
- [ ] Test at least one desktop viewport.

## 14. Security requirements

- [ ] Use HTTPS in production.
- [ ] Validate all input on the server.
- [ ] Keep secrets on the server.
- [ ] Configure secure session cookies if using cookie-based authentication.
- [ ] Configure CSRF protection when applicable.
- [x] Configure CORS narrowly for trusted origins. (opt-in via `CORS_ORIGINS`, Authorization-header only, credentials off, 4 tests)
- [ ] Apply rate limiting to authentication and sensitive share endpoints.
- [ ] Prevent open redirects.
- [ ] Render user-generated Markdown safely.
- [ ] Sanitize user-provided filenames and display text.
- [ ] Avoid exposing internal error details.
- [ ] Apply authorization checks on every protected API operation.
- [ ] Never store access tokens in insecure browser storage without evaluating the risks.
- [ ] Do not claim the website is secure merely because the interface looks secure.

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
- [ ] Protected pages reject unauthenticated access.

### Files and shares

- [ ] Upload works.
- [ ] Upload failures are recoverable.
- [ ] Share creation works.
- [ ] Expired links are rejected.
- [ ] Revoked links are rejected.
- [ ] Download restrictions are enforced by the backend.
- [ ] Unauthorized users cannot access another user's files.
- [ ] Shared file pages do not expose private storage credentials or permanent URLs.

### Administrator dashboard

- [ ] Ordinary users cannot open admin pages or access admin APIs.
- [x] Admin endpoints enforce role checks on the backend. (AdminGuard on every `/admin` route; see `admin-authz.spec.ts`)
- [x] User and share lists are paginated and do not leak sensitive data. (page/pageSize/total/hasMore; email search server-side; no passwordHash/tokenHash in any admin response)
- [ ] Sensitive admin actions require appropriate confirmation and create audit events.
- [ ] Audit logs do not contain passwords, tokens, or private file contents.

### Quality

- [ ] Run lint.
- [ ] Run type checking.
- [ ] Run relevant tests.
- [ ] Run production build.
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
