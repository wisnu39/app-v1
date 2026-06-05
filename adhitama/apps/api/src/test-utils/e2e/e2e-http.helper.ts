import type { INestApplication } from '@nestjs/common';
/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unsafe-argument */
import request from 'supertest';

export type E2EHttpClient = ReturnType<typeof createE2EHttpClient>;

export function createE2EHttpClient(app: INestApplication) {
  return request(app.getHttpServer());
}

export async function loginE2E(
  client: E2EHttpClient,
  payload: {
    identifier: string;
    password: string;
    deviceInfo?: string;
    userAgent?: string;
  },
): Promise<request.Response> {
  const request_obj = client.post('/api/v1/auth/login').send({
    identifier: payload.identifier,
    password: payload.password,
  });

  if (payload.deviceInfo) {
    request_obj.set('x-device-info', payload.deviceInfo);
  }

  if (payload.userAgent) {
    request_obj.set('User-Agent', payload.userAgent);
  }

  return request_obj;
}

export async function refreshE2E(
  client: E2EHttpClient,
  refreshToken: string,
): Promise<request.Response> {
  return client.post('/api/v1/auth/refresh').send({ refreshToken });
}

export async function requestPasswordResetE2E(
  client: E2EHttpClient,
  email: string,
): Promise<request.Response> {
  return client.post('/api/v1/auth/request-password-reset').send({ email });
}

export async function resetPasswordE2E(
  client: E2EHttpClient,
  token: string,
  password: string,
): Promise<request.Response> {
  return client.post('/api/v1/auth/reset-password').send({ token, password });
}

export async function verifyEmailE2E(
  client: E2EHttpClient,
  token: string,
): Promise<request.Response> {
  return client.post('/api/v1/auth/verify-email').send({ token });
}

export async function resendVerificationE2E(
  client: E2EHttpClient,
  email: string,
): Promise<request.Response> {
  return client.post('/api/v1/auth/resend-verification').send({ email });
}

export async function logoutE2E(
  client: E2EHttpClient,
  accessToken: string,
): Promise<request.Response> {
  return client
    .post('/api/v1/auth/logout')
    .set('Authorization', `Bearer ${accessToken}`);
}

export async function logoutAllE2E(
  client: E2EHttpClient,
  accessToken: string,
): Promise<request.Response> {
  return client
    .post('/api/v1/auth/logout-all')
    .set('Authorization', `Bearer ${accessToken}`);
}

export async function getMeE2E(
  client: E2EHttpClient,
  accessToken: string,
): Promise<request.Response> {
  return client
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${accessToken}`);
}
