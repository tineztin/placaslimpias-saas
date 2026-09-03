import type { NextConfig } from "next";

// La landing actual (public/index.html) es HTML estático heredado del sitio
// previo. Next.js no sirve public/index.html en "/" automáticamente una vez
// que existe App Router (solo en la ruta literal "/index.html"), así que se
// reescribe aquí. Mientras este rewrite siga en uso, NO debe crearse
// app/page.tsx: si existiera, ganaría él y este rewrite dejaría de aplicarse
// sin ningún error visible.
// Cabeceras de seguridad generales. X-Frame-Options se aplica solo a
// nuestras propias páginas (nunca pensadas para ir en un iframe ajeno):
// calculadora.html, demo.html y /embed quedan fuera a propósito, porque
// /embed ya calcula su propia Content-Security-Policy: frame-ancestors por
// suscriptor (ver app/embed/route.ts) y necesita poder cargarse en la web
// de cada cliente.
const ownPages = ["/", "/login", "/reset-password", "/privacidad.html", "/terminos.html"];
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/", destination: "/index.html" }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      ...ownPages.map((source) => ({
        source,
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      })),
      {
        source: "/dashboard/:path*",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
    ];
  },
};

export default nextConfig;
