import { onUnmounted, ref } from "vue";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useAuthStore } from "@/modules/auth/store/authStore";
import { decodeJwtPayload } from "@/shared/auth/jwt";

type Handler = (body: unknown) => void;

interface RealtimeOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: () => void;
}

/**
 * Conexion STOMP por vista con token renovable y reconexion automatica.
 * Los eventos invalidan el estado local; cada handler decide que API recargar.
 */
export function useRealtime(
  subscriptions: Record<string, Handler>,
  options: RealtimeOptions = {},
) {
  const auth = useAuthStore();
  const API_BASE_URL = (import.meta.env.VITE_API_URL as string).replace(
    /\/$/,
    "",
  );
  let client: Client | null = null;
  const connected = ref(false);

  async function ensureValidToken() {
    const payload = decodeJwtPayload(auth.accessToken);
    const expiresAt = Number(payload?.exp ?? 0) * 1000;
    if (!auth.accessToken || expiresAt <= Date.now() + 5000) {
      await auth.refreshSession();
    }
    if (!auth.accessToken) {
      throw new Error("No hay una sesion activa para tiempo real");
    }
    return auth.accessToken;
  }

  function connect() {
    if (client) return;

    client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
      reconnectDelay: 4000,
      beforeConnect: async () => {
        const token = await ensureValidToken();
        if (client) {
          client.connectHeaders = { Authorization: `Bearer ${token}` };
        }
      },
      onConnect: () => {
        connected.value = true;
        options.onConnect?.();
        Object.entries(subscriptions).forEach(([topic, cb]) => {
          client?.subscribe(topic, (message) => {
            try {
              cb(message.body ? JSON.parse(message.body) : null);
            } catch {
              // Un evento malformado no debe cortar las demas suscripciones.
            }
          });
        });
      },
      onDisconnect: () => {
        connected.value = false;
        options.onDisconnect?.();
      },
      onWebSocketClose: () => {
        connected.value = false;
      },
      onWebSocketError: () => {
        connected.value = false;
        options.onError?.();
      },
      onStompError: () => {
        connected.value = false;
        options.onError?.();
      },
    });
    client.activate();
  }

  function disconnect() {
    client?.deactivate();
    client = null;
    connected.value = false;
  }

  onUnmounted(disconnect);
  return { connect, disconnect, connected };
}
