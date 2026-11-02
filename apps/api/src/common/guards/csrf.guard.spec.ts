import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { CsrfGuard } from './csrf.guard';
import { CSRF_COOKIE, CSRF_HEADER } from './jwt-auth.guard';

function contextFor(request: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function guard(): CsrfGuard {
  const config = {
    get: jest.fn((key: string) =>
      key === 'frontendOrigin' ? 'https://learnflow.example.com' : undefined,
    ),
  };
  return new CsrfGuard(config as never);
}

describe('CsrfGuard', () => {
  const token = 'a'.repeat(64);

  it('allows safe methods without a token', () => {
    expect(
      guard().canActivate(contextFor({ method: 'GET', originalUrl: '/api/v1/courses' })),
    ).toBe(true);
  });

  it('allows health checks', () => {
    expect(
      guard().canActivate(
        contextFor({ method: 'POST', originalUrl: '/api/v1/health/ready' }),
      ),
    ).toBe(true);
  });

  it('allows bearer-token API clients', () => {
    expect(
      guard().canActivate(
        contextFor({
          method: 'POST',
          originalUrl: '/api/v1/auth/login',
          headers: { authorization: 'Bearer token' },
        }),
      ),
    ).toBe(true);
  });

  it('rejects a state-changing cookie request without a token', () => {
    expect(() =>
      guard().canActivate(
        contextFor({ method: 'POST', originalUrl: '/api/v1/courses', headers: {} }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects mismatched double-submit tokens', () => {
    expect(() =>
      guard().canActivate(
        contextFor({
          method: 'POST',
          originalUrl: '/api/v1/courses',
          headers: { [CSRF_HEADER]: 'b'.repeat(64) },
          cookies: { [CSRF_COOKIE]: token },
        } as Partial<Request>),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects unknown origins even with a valid token', () => {
    expect(() =>
      guard().canActivate(
        contextFor({
          method: 'POST',
          originalUrl: '/api/v1/courses',
          headers: { origin: 'https://evil.example.com', [CSRF_HEADER]: token },
          cookies: { [CSRF_COOKIE]: token },
        } as Partial<Request>),
      ),
    ).toThrow('Request origin is not allowed');
  });

  it('accepts a matching token and origin', () => {
    expect(
      guard().canActivate(
        contextFor({
          method: 'POST',
          originalUrl: '/api/v1/courses',
          headers: {
            origin: 'https://learnflow.example.com',
            [CSRF_HEADER]: token,
          },
          cookies: { [CSRF_COOKIE]: token },
        } as Partial<Request>),
      ),
    ).toBe(true);
  });
});
