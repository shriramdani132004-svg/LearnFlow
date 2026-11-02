import type { Role } from '../../generated/prisma/enums';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  sessionId: string;
}

export interface JwtAccessPayload {
  sub: string;
  role: Role;
  sid: string;
  type: 'access';
}

export interface JwtRefreshPayload {
  sub: string;
  sid: string;
  type: 'refresh';
}
