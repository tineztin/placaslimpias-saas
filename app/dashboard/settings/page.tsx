import { redirect } from "next/navigation";

// El formulario de configuración ahora vive dentro de /dashboard (Paso 1),
// junto a la previsualización y el código — mantenemos esta ruta solo por
// si alguien la tiene guardada en marcadores.
export default function SettingsPage() {
  redirect("/dashboard");
}
