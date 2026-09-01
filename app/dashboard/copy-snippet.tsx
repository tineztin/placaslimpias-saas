"use client";

import { useState } from "react";

export default function CopySnippet({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API bloqueada (permiso/navegador): el usuario puede
      // seleccionar el texto a mano, el <pre> sigue mostrándolo igual.
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Tu código de instalación</h2>
        <button
          onClick={copy}
          type="button"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {copied ? "Copiado ✓" : "Copiar"}
        </button>
      </div>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-200">
        <code>{snippet}</code>
      </pre>
    </div>
  );
}
