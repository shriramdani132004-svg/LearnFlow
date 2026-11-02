import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { AuthUser } from '../common/types/auth-user';
import { paginationMeta } from '../common/dto/pagination.dto';
import type { AdminUserQueryDto, UpdateUserDto } from './dto/admin.dto';

const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  _count: { select: { enrollments: true, coursesTaught: true, attempts: true } },
} as const;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async users(query: AdminUserQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Record<string, unknown> = {};
    if (query.role) where.role = query.role;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: adminUserSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { data: users, meta: paginationMeta(page, limit, total) };
  }

  async updateUser(id: string, dto: UpdateUserDto, actor: AuthUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (id === actor.id && (dto.role !== undefined || dto.isActive === false)) {
      throw new BadRequestException('Administrators cannot change their own role or deactivate themselves');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        role: dto.role as 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | undefined,
        isActive: dto.isActive,
      },
      select: adminUserSelect,
    });

    if (dto.isActive === false || dto.role !== undefined) {
      await this.prisma.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.prisma.activityEvent.create({
      data: {
        userId: actor.id,
        type: 'ADMIN_USER_UPDATED',
        message: `Administrator updated account ${updated.email}`,
      },
    });
    return updated;
  }

  async stats() {
    const [usersByRole, coursesByStatus, enrollments, assessments, attempts, results, recent] =
      await Promise.all([
        this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
        this.prisma.course.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.enrollment.count(),
        this.prisma.assessment.count(),
        this.prisma.assessmentAttempt.count(),
        this.prisma.assessmentResult.count(),
        this.prisma.activityEvent.findMany({
          orderBy: { createdAt: 'desc' },
          take: 15,
          include: { user: { select: { name: true, email: true } } },
        }),
      ]);

    return {
      users: {
        total: usersByRole.reduce((sum, row) => sum + row._count._all, 0),
        students: usersByRole.find((row) => row.role === 'STUDENT')?._count._all ?? 0,
        instructors: usersByRole.find((row) => row.role === 'INSTRUCTOR')?._count._all ?? 0,
        admins: usersByRole.find((row) => row.role === 'ADMIN')?._count._all ?? 0,
      },
      courses: {
        total: coursesByStatus.reduce((sum, row) => sum + row._count._all, 0),
        published: coursesByStatus.find((row) => row.status === 'PUBLISHED')?._count._all ?? 0,
        draft: coursesByStatus.find((row) => row.status === 'DRAFT')?._count._all ?? 0,
        archived: coursesByStatus.find((row) => row.status === 'ARCHIVED')?._count._all ?? 0,
      },
      enrollments,
      assessments,
      attempts,
      results,
      recentActivity: recent,
    };
  }
}
