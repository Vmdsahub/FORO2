interface ApiOptions {
  timeout?: number;
  retries?: number;
  fallback?: any;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiCall<T>(
  url: string,
  options: RequestInit & ApiOptions = {},
): Promise<T> {
  const { timeout = 5000, retries = 0, fallback, ...fetchOptions } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      } else {
        throw new ApiError(`HTTP ${response.status}`, response.status);
      }
    } catch (error) {
      lastError = error as Error;

      // Don't retry on abort or client errors
      if (
        error.name === "AbortError" ||
        (error instanceof ApiError && error.status && error.status < 500)
      ) {
        break;
      }

      // Wait before retry
      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
      }
    }
  }

  // If we have a fallback, use it instead of throwing
  if (fallback !== undefined) {
    console.warn(
      `API call to ${url} failed, using fallback:`,
      lastError.message,
    );
    return fallback;
  }

  throw lastError;
}

export function createAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
