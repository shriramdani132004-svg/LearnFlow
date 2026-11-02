import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import type { AuthUser } from '../types/auth-user';

function contextFor(user?: Partial<AuthUser>): ExecutionContext {
  const request = { user: user as AuthUser | undefined };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function guardWithRoles(roles?: string[]): RolesGuard {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(roles),
  };
  return new RolesGuard(reflector as never);
}

describe('RolesGuard', () => {
  it('allows routes without a role requirement', () => {
    expect(guardWithRoles().canActivate(contextFor())).toBe(true);
  });

  it('allows a matching role', () => {
    expect(
      guardWithRoles(['INSTRUCTOR']).canActivate(contextFor({ role: 'INSTRUCTOR' })),
    ).toBe(true);
  });

  it('allows administrators through instructor-only routes', () => {
    expect(
      guardWithRoles(['INSTRUCTOR']).canActivate(contextFor({ role: 'ADMIN' })),
    ).toBe(true);
  });

  it('rejects a student on an instructor route', () => {
    expect(() =>
      guardWithRoles(['INSTRUCTOR']).canActivate(contextFor({ role: 'STUDENT' })),
    ).toThrow(ForbiddenException);
  });

  it('rejects unauthenticated requests to protected routes', () => {
    expect(() => guardWithRoles(['STUDENT']).canActivate(contextFor())).toThrow(
      ForbiddenException,
    );
  });
});
