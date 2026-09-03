"use client";

import { useFormStatus } from "react-dom";

// Botón de submit para formularios con Server Actions: sin esto, un clic no
// da ninguna señal de que algo está pasando hasta que la acción termina (que
// puede tardar, p. ej. al crear una sesión de Stripe). useFormStatus() solo
// funciona en un componente cliente descendiente del <form>, por eso está
// separado en su propio archivo en vez de vivir en la página que lo usa.
export default function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-70`}>
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {pendingText || "Un momento…"}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
