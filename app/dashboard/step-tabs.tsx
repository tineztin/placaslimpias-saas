"use client";

import { useState } from "react";

const TABS = [
  { n: 1, label: "Configura tu marca" },
  { n: 2, label: "Previsualiza" },
  { n: 3, label: "Copia el código" },
];

export default function StepTabs({
  stepConfigure,
  stepPreview,
  stepCode,
}: {
  stepConfigure: React.ReactNode;
  stepPreview: React.ReactNode;
  stepCode: React.ReactNode;
}) {
  const [active, setActive] = useState(1);
  const panels = [stepConfigure, stepPreview, stepCode];

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.n}
            type="button"
            onClick={() => setActive(t.n)}
            className={
              "flex flex-1 flex-col items-center justify-center gap-1.5 px-2 py-3 text-center text-xs font-medium transition sm:flex-row sm:px-4 sm:text-sm " +
              (active === t.n
                ? "border-b-2 border-blue-600 text-blue-600"
                : "border-b-2 border-transparent text-slate-500 hover:text-slate-700")
            }
          >
            <span
              className={
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold " +
                (active === t.n ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600")
              }
            >
              {t.n}
            </span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="p-6">{panels[active - 1]}</div>
    </div>
  );
}
