import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// api_key es públicamente visible (va en el HTML del cliente embebido), así
// que el límite por key frena a quien la copie y la use fuera de su sitio;
// el límite por IP además frena a alguien que rote entre varias keys
// robadas desde la misma máquina. Sin las credenciales de Upstash
// configuradas, no bloquea nada (igual que Resend sin su API key): el
// endpoint sigue funcionando, solo sin este freno extra.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const byKey = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 m"), prefix: "rl:leads:key" })
  : null;

const byIp = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 m"), prefix: "rl:leads:ip" })
  : null;

export async function checkLeadRateLimit(apiKey: string, ip: string): Promise<boolean> {
  if (!byKey || !byIp) return true;

  // Falla abierto: un problema de Upstash (permisos, caída del servicio...)
  // nunca debe impedir que se guarde un lead real. El freno anti-abuso es
  // una mejora, no debe ser un punto único de fallo para el endpoint.
  try {
    const [keyResult, ipResult] = await Promise.all([byKey.limit(apiKey), byIp.limit(ip)]);
    return keyResult.success && ipResult.success;
  } catch (err) {
    console.error("Rate limit de Upstash falló, dejando pasar la petición:", err);
    return true;
  }
}
