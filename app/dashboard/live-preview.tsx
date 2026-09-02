"use client";

import { useEffect, useRef, useState } from "react";

// El mismo iframe que se pega en la web de un cliente (ver el snippet del
// Paso 3), embebido aquí para que se vea con la marca aplicada tal cual, y
// para que sea evidente que un cambio en el Paso 1 se refleja al momento —
// /embed no cachea nada del lado del servidor.
export default function LivePreview({ apiKey }: { apiKey: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(560);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.source !== iframeRef.current?.contentWindow) return;
      const d = ev.data;
      if (!d || d.source !== "solarcalc" || d.type !== "height") return;
      const h = Number(d.height);
      if (isFinite(h)) setHeight(Math.min(4000, Math.max(400, Math.round(h))));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src={`/embed?key=${apiKey}`}
      title="Vista previa de tu calculadora"
      style={{ width: "100%", height, border: 0, display: "block" }}
      className="rounded-lg"
    />
  );
}
