import { onUnmounted } from "vue";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useAuthStore } from "@/modules/auth/store/authStore";

type Handler = (body: unknown) => void;

/**
 * Composable reutilizable de tiempo real (STOMP sobre SockJS).
 * Soporta múltiples sesiones simultáneas y reconexión automática.
 *
 * Uso:
 *   const { connect } = useRealtime({ "/topic/ventas": () => recargar() });
 *   onMounted(connect);
 */
export function useRealtime(subscriptions: Record<string, Handler>) {
  const auth = useAuthStore();
  const API_BASE_URL = (import.meta.env.VITE_API_URL as string).replace(
    /\/$/,
    "",
  );
  let client: Client | null = null;

  function connect() {
    if (!auth.accessToken || client) return;
    client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
      connectHeaders: { Authorization: `Bearer ${auth.accessToken}` },
      reconnectDelay: 4000, // reconexión automática
      onConnect: () => {
        Object.entries(subscriptions).forEach(([topic, cb]) => {
          client?.subscribe(topic, (msg) => {
            try {
              cb(msg.body ? JSON.parse(msg.body) : null);
            } catch {
              /* ignorar mensajes malformados */
            }
          });
        });
      },
    });
    client.activate();
  }

  function disconnect() {
    client?.deactivate();
    client = null;
  }

  onUnmounted(disconnect);
  return { connect, disconnect };
}
