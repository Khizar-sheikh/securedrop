/** Hero illustration: a managed share between a file and a recipient.
 * Original SVG, token colors, meaningful label (it carries information). */
export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 460 330"
      role="img"
      aria-label="Illustration of a shared file: a document connected by a link to a recipient, with an access panel showing expiry, download permission, and an active status."
      className="h-auto w-full"
    >
      {/* file sheet */}
      <g>
        <rect x="28" y="48" width="132" height="168" rx="10" className="fill-surface stroke-border" strokeWidth="2" />
        <path d="M126 48h24l10 10v28h-34V48Z" className="fill-surface-variant stroke-border" strokeWidth="2" strokeLinejoin="round" />
        <path d="M138 52v8h8" className="stroke-border" strokeWidth="2" fill="none" strokeLinejoin="round" />
        <rect x="48" y="100" width="92" height="8" rx="4" className="fill-border" />
        <rect x="48" y="120" width="72" height="8" rx="4" className="fill-border" />
        <rect x="48" y="140" width="84" height="8" rx="4" className="fill-border" />
        <text x="48" y="196" className="fill-muted" fontSize="12" fontFamily="var(--font-geist-sans), sans-serif">
          report.pdf
        </text>
      </g>

      {/* link path */}
      <g>
        <path
          d="M168 132 C 220 132, 236 96, 288 96"
          className="stroke-brand"
          strokeWidth="2.5"
          fill="none"
          strokeDasharray="6 7"
          strokeLinecap="round"
        />
        <circle cx="228" cy="112" r="14" className="fill-brand" />
        <path
          d="M224.5 112h7m-3.5-3.5 3.5 3.5-3.5 3.5"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* recipient */}
      <g>
        <circle cx="322" cy="96" r="26" className="fill-surface stroke-border" strokeWidth="2" />
        <circle cx="322" cy="90" r="8" className="fill-muted" />
        <path d="M308 112c2.5-7 8-10 14-10s11.5 3 14 10" className="fill-muted" />
      </g>

      {/* access panel */}
      <g>
        <rect x="196" y="150" width="236" height="148" rx="12" className="fill-surface stroke-border" strokeWidth="2" />
        <text x="216" y="178" className="fill-text" fontSize="13" fontWeight="600" fontFamily="var(--font-geist-sans), sans-serif">
          Access
        </text>

        <text x="216" y="208" className="fill-muted" fontSize="12" fontFamily="var(--font-geist-sans), sans-serif">
          Expires
        </text>
        <text x="336" y="208" className="fill-text" fontSize="12" fontFamily="var(--font-geist-sans), sans-serif">
          In 24 hours
        </text>

        <text x="216" y="234" className="fill-muted" fontSize="12" fontFamily="var(--font-geist-sans), sans-serif">
          Downloads
        </text>
        <text x="336" y="234" className="fill-text" fontSize="12" fontFamily="var(--font-geist-sans), sans-serif">
          Allowed
        </text>

        <text x="216" y="260" className="fill-muted" fontSize="12" fontFamily="var(--font-geist-sans), sans-serif">
          Status
        </text>
        <rect x="336" y="246" width="70" height="22" rx="11" className="fill-surface stroke-border" strokeWidth="1.5" />
        <circle cx="350" cy="257" r="3.5" className="fill-success" />
        <text x="358" y="261" className="fill-text" fontSize="11" fontFamily="var(--font-geist-sans), sans-serif">
          Active
        </text>
      </g>
    </svg>
  );
}
