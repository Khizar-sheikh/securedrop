import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      // Share tokens live in /share/[token] URLs — never leak them.
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];

    // CSP only in production: Next's dev/HMR runtime needs eval + websockets.
    // 'unsafe-inline' for scripts is required by the App Router bootstrap;
    // external script origins stay blocked, and style/img/font/connect are
    // scoped to self + the configured API origin.
    if (process.env.NODE_ENV === "production") {
      const apiOrigin = new URL(
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
      ).origin;
      headers.push({
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' blob: data:",
          "font-src 'self'",
          `connect-src 'self' ${apiOrigin}`,
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "object-src 'none'",
        ].join("; "),
      });
    }

    // Opt-in: browsers ignore HSTS over plain HTTP, so sending it in dev is
    // harmless, but production deployments flip ENABLE_HSTS once TLS is on.
    if (process.env.ENABLE_HSTS === "true") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }

    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
