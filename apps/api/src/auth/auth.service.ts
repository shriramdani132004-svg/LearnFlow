import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from '../database/prisma.service';
import { hashToken } from '../common/utils/crypto.util';
import type {
  AuthUser,
  JwtAccessPayload,
  JwtRefreshPayload,
} from '../common/types/auth-user';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../common/guards/jwt-auth.guard';
import type { BootstrapInstructorDto, LoginDto, RegisterDto } from './dto/auth.dto';
import { AuthCookieService, type AuthTokens } from './auth-cookie.service';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cookieService: AuthCookieService,
  ) {}

  async register(dto: RegisterDto, request: Request, response: Response) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash,
        role: 'STUDENT',
        lastLoginAt: new Date(),
      },
      select: publicUserSelect,
    });

    const tokens = await this.createSession(user.id, user.role, request);
    this.cookieService.setAuthCookies(response, tokens);
    await this.recordActivity(user.id, 'ACCOUNT_CREATED', 'Student account created');
    return { user };
  }

  async login(dto: LoginDto, request: Request, response: Response) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      // Always perform a hash verification to reduce account enumeration timing leaks.
      await this.hashPassword(dto.password);
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.createSession(user.id, user.role, request);
    this.cookieService.setAuthCookies(response, tokens);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        lastLoginAt: new Date(),
      },
    };
  }

  async bootstrapInstructor(
    dto: BootstrapInstructorDto,
    secret: string | undefined,
    request: Request,
    response: Response,
  ) {
    const configured = this.configService.get<string>('instructorBootstrapSecret');
    if (!configured) {
      throw new ForbiddenException(
        'Instructor bootstrap is disabled. Set INSTRUCTOR_BOOTSTRAP_SECRET to enable it.',
      );
    }
    if (!secret) {
      throw new ForbiddenException('Bootstrap secret is required');
    }
    const provided = Buffer.from(secret);
    const expected = Buffer.from(configured);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new ForbiddenException('Invalid bootstrap secret');
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role === 'INSTRUCTOR' || existing.role === 'ADMIN') {
        const tokens = await this.createSession(existing.id, existing.role, request);
        this.cookieService.setAuthCookies(response, tokens);
        return {
          user: {
            id: existing.id,
            name: existing.name,
            email: existing.email,
            role: existing.role,
            avatarUrl: existing.avatarUrl,
            createdAt: existing.createdAt,
            lastLoginAt: existing.lastLoginAt,
          },
          created: false,
        };
      }
      const promoted = await this.prisma.user.update({
        where: { id: existing.id },
        data: { role: 'INSTRUCTOR', lastLoginAt: new Date() },
        select: publicUserSelect,
      });
      const tokens = await this.createSession(promoted.id, promoted.role, request);
      this.cookieService.setAuthCookies(response, tokens);
      return { user: promoted, created: false };
    }

    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash,
        role: 'INSTRUCTOR',
        lastLoginAt: new Date(),
      },
      select: publicUserSelect,
    });
    const tokens = await this.createSession(user.id, user.role, request);
    this.cookieService.setAuthCookies(response, tokens);
    await this.recordActivity(user.id, 'ACCOUNT_CREATED', 'Instructor account bootstrapped');
    return { user, created: true };
  }

  async refresh(request: Request, response: Response) {
    const cookies = request.cookies as Record<string, string> | undefined;
    const token = cookies?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('Refresh token is missing');

    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(token, {
        secret: this.configService.get<string>('jwtRefreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      !session.user.isActive ||
      session.userId !== payload.sub
    ) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const presentedHash = hashToken(token);
    const stored = Buffer.from(session.refreshTokenHash);
    const presented = Buffer.from(presentedHash);
    if (stored.length !== presented.length || !timingSafeEqual(stored, presented)) {
      // A previously rotated token was replayed: revoke the whole session.
      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      this.logger.warn(`Refresh token reuse detected for session ${session.id}`);
      throw new UnauthorizedException('Refresh token has already been used');
    }

    const tokens = await this.rotateSession(session.id, session.userId, session.user.role);
    this.cookieService.setAuthCookies(response, tokens);
    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        avatarUrl: session.user.avatarUrl,
        createdAt: session.user.createdAt,
        lastLoginAt: session.user.lastLoginAt,
      },
    };
  }

  async logout(request: Request, response: Response) {
    const cookies = request.cookies as Record<string, string> | undefined;
    const token = cookies?.[REFRESH_COOKIE];
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(token, {
          secret: this.configService.get<string>('jwtRefreshSecret'),
        });
        await this.prisma.session.updateMany({
          where: { id: payload.sid, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      } catch {
        // Clearing cookies is still the correct outcome for an invalid token.
      }
    }
    const accessToken = cookies?.[ACCESS_COOKIE];
    if (!token && accessToken) {
      try {
        const payload = await this.jwtService.verifyAsync<JwtAccessPayload>(accessToken, {
          secret: this.configService.get<string>('jwtSecret'),
        });
        await this.prisma.session.updateMany({
          where: { id: payload.sid, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      } catch {
        // Ignore invalid access tokens on logout.
      }
    }
    this.cookieService.clearAuthCookies(response);
    return { success: true };
  }

  async me(user: AuthUser) {
    const record = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: publicUserSelect,
    });
    if (!record) throw new UnauthorizedException('User no longer exists');
    return { user: record };
  }

  async updateProfile(
    user: AuthUser,
    dto: { name?: string; avatarUrl?: string },
  ) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: dto.name?.trim(),
        avatarUrl: dto.avatarUrl,
      },
      select: publicUserSelect,
    });
  }

  async changePassword(
    user: AuthUser,
    currentPassword: string,
    newPassword: string,
  ) {
    const record = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!record) throw new UnauthorizedException('User no longer exists');
    const valid = await argon2.verify(record.passwordHash, currentPassword);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');
    if (currentPassword === newPassword) {
      throw new UnauthorizedException('The new password must be different');
    }
    const passwordHash = await this.hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      this.prisma.session.updateMany({
        where: { userId: user.id, id: { not: user.sessionId }, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { success: true };
  }

  issueCsrfToken(request: Request, response: Response): { csrfToken: string } {
    const cookies = request.cookies as Record<string, string> | undefined;
    const existing = cookies?.['lf_csrf'];
    const token = existing && existing.length === 64 ? existing : this.cookieService.newCsrfToken();
    if (!existing) {
      const refreshTtl = this.configService.get<number>('refreshTtlSeconds') ?? 604800;
      response.cookie('lf_csrf', token, {
        httpOnly: false,
        secure: this.configService.get<boolean>('cookieSecure') ?? false,
        sameSite: this.configService.get<'lax' | 'strict' | 'none'>('cookieSameSite') ?? 'lax',
        path: '/',
        maxAge: refreshTtl * 1000,
      });
    }
    return { csrfToken: token };
  }

  private async createSession(userId: string, role: string, request: Request): Promise<AuthTokens> {
    const refreshTtl = this.configService.get<number>('refreshTtlSeconds') ?? 604800;
    const expiresAt = new Date(Date.now() + refreshTtl * 1000);
    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: 'pending',
        expiresAt,
        userAgent: request.headers['user-agent']?.slice(0, 250) ?? null,
        ipAddress: request.ip?.slice(0, 60) ?? null,
      },
    });

    const { accessToken, refreshToken } = await this.signTokens(
      session.id,
      userId,
      role,
    );
    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });
    return { accessToken, refreshToken, csrfToken: this.cookieService.newCsrfToken() };
  }

  private async rotateSession(
    sessionId: string,
    userId: string,
    role: string,
  ): Promise<AuthTokens> {
    const { accessToken, refreshToken } = await this.signTokens(sessionId, userId, role);
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: hashToken(refreshToken),
        lastUsedAt: new Date(),
      },
    });
    return { accessToken, refreshToken, csrfToken: this.cookieService.newCsrfToken() };
  }

  private async signTokens(sessionId: string, userId: string, role: string) {
    const accessTtl = this.configService.get<number>('accessTtlSeconds') ?? 900;
    const refreshTtl = this.configService.get<number>('refreshTtlSeconds') ?? 604800;
    const accessPayload: JwtAccessPayload = {
      sub: userId,
      sid: sessionId,
      role: role as JwtAccessPayload['role'],
      type: 'access',
    };
    const refreshPayload: JwtRefreshPayload = {
      sub: userId,
      sid: sessionId,
      type: 'refresh',
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('jwtSecret'),
        expiresIn: accessTtl,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('jwtRefreshSecret'),
        expiresIn: refreshTtl,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  private async recordActivity(userId: string, type: string, message: string) {
    await this.prisma.activityEvent.create({
      data: { userId, type, message },
    });
  }
}
