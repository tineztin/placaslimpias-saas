import type { NextConfig } from "next";

// La landing actual (public/index.html) es HTML estático heredado del sitio
// previo. Next.js no sirve public/index.html en "/" automáticamente una vez
// que existe App Router (solo en la ruta literal "/index.html"), así que se
// reescribe aquí. Mientras este rewrite siga en uso, NO debe crearse
// app/page.tsx: si existiera, ganaría él y este rewrite dejaría de aplicarse
// sin ningún error visible.
const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/", destination: "/index.html" }];
  },
};

export default nextConfig;
