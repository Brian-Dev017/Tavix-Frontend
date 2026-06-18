interface ApiErrorShape {
  response?: {
    data?: {
      message?: unknown;
    };
  };
  message?: unknown;
}

export function getApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!error || typeof error !== "object") return fallback;

  const candidate = error as ApiErrorShape;
  const apiMessage = candidate.response?.data?.message;
  if (typeof apiMessage === "string" && apiMessage.trim()) {
    return apiMessage.trim();
  }

  if (typeof candidate.message === "string" && candidate.message.trim()) {
    return candidate.message.trim();
  }

  return fallback;
}
