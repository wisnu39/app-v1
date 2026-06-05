type JsonResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export interface E2ERequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  authToken?: string;
}

export async function e2eRequest<T>(
  baseUrl: string,
  path: string,
  options: E2ERequestOptions = {},
): Promise<JsonResponse<T>> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(options.authToken ? { authorization: `Bearer ${options.authToken}` } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json()) as JsonResponse<T>;

  return payload;
}

export async function loginE2E(
  baseUrl: string,
  payload: {
    identifier: string;
    password: string;
  },
) {
  return e2eRequest<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      nip: string | null;
      roleId: string;
      mustChangePassword: boolean;
    };
  }>(baseUrl, '/api/v1/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export async function refreshE2E(
  baseUrl: string,
  refreshToken: string,
) {
  return e2eRequest<{
    accessToken: string;
    refreshToken: string;
  }>(baseUrl, '/api/v1/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });
}

export async function logoutE2E(
  baseUrl: string,
  accessToken: string,
) {
  return e2eRequest<{ message: string }>(baseUrl, '/api/v1/auth/logout', {
    method: 'POST',
    authToken: accessToken,
  });
}

export async function forgetPasswordE2E(
  baseUrl: string,
  email: string,
) {
  return e2eRequest<{ message: string }>(baseUrl, '/api/v1/auth/request-password-reset', {
    method: 'POST',
    body: { email },
  });
}

export async function resetPasswordE2E(
  baseUrl: string,
  token: string,
  password: string,
) {
  return e2eRequest<{ message: string }>(baseUrl, '/api/v1/auth/reset-password', {
    method: 'POST',
    body: { token, password },
  });
}

export function extractTokenFromUrl(rawUrl: string): string {
  const match = rawUrl.match(/[?&]token=([^&]+)/i);

  if (!match) {
    throw new Error('Token not found in email content');
  }

  return decodeURIComponent(match[1]);
}
