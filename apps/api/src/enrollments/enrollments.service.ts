import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { AuthUser } from '../common/types/auth-user';
import { paginationMeta } from '../common/dto/pagination.dto';
import type { EnrollmentQueryDto } from './dto/enrollment.dto';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async enroll(courseId: string, user: AuthUser) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (course.status !== 'PUBLISHED') {
      throw new BadRequestException('Only published courses can be joined');
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId: user.id } },
    });
    if (existing && existing.status !== 'CANCELLED') {
      throw new ConflictException('You are already enrolled in this course');
    }

    const enrollment = existing
      ? await this.prisma.enrollment.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE', enrolledAt: new Date(), completedAt: null },
        })
      : await this.prisma.enrollment.create({
          data: { courseId, studentId: user.id, status: 'ACTIVE' },
        });

    await this.prisma.activityEvent.create({
      data: {
        userId: user.id,
        courseId,
        type: 'ENROLLMENT_CREATED',
        message: `Enrolled in "${course.title}"`,
      },
    });

    return { enrollment: { ...enrollment, course } };
  }

  async unenroll(courseId: string, user: AuthUser) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId: user.id } },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    await this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: 'CANCELLED', completedAt: null },
    });
    return { success: true };
  }

  async mine(user: AuthUser) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: user.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
      orderBy: { enrolledAt: 'desc' },
      include: {
        course: {
          include: {
            instructor: { select: { id: true, name: true, avatarUrl: true } },
            modules: {
              orderBy: { position: 'asc' },
              include: {
                lessons: {
                  where: { published: true },
                  orderBy: { position: 'asc' },
                  select: { id: true, title: true, estimatedMinutes: true, position: true },
                },
              },
            },
          },
        },
        lessonProgress: { select: { lessonId: true, completedAt: true } },
      },
    });

    return {
      data: enrollments.map((enrollment) => {
        const publishedLessonIds = enrollment.course.modules.flatMap((module) =>
          module.lessons.map((lesson) => lesson.id),
        );
        const completed = enrollment.lessonProgress.filter((row) =>
          publishedLessonIds.includes(row.lessonId),
        ).length;
        const percentage =
          publishedLessonIds.length > 0
            ? Math.round((completed / publishedLessonIds.length) * 100)
            : 0;
        return {
          id: enrollment.id,
          status: enrollment.status,
          enrolledAt: enrollment.enrolledAt,
          completedAt: enrollment.completedAt,
          course: enrollment.course,
          completedLessons: completed,
          totalLessons: publishedLessonIds.length,
          progressPercentage: percentage,
          completedLessonIds: enrollment.lessonProgress.map((row) => row.lessonId),
        };
      }),
    };
  }

  async roster(courseId: string, query: EnrollmentQueryDto, user: AuthUser) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (user.role !== 'ADMIN' && course.instructorId !== user.id) {
      throw new ForbiddenException('You do not own this course');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Record<string, unknown> = { courseId };
    if (query.search) {
      where.student = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, enrollments, totalLessons, summary] = await Promise.all([
      this.prisma.enrollment.count({ where }),
      this.prisma.enrollment.findMany({
        where,
        orderBy: { enrolledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              createdAt: true,
              lastLoginAt: true,
            },
          },
          lessonProgress: { select: { lessonId: true } },
        },
      }),
      this.prisma.lesson.count({ where: { module: { courseId }, published: true } }),
      this.prisma.enrollment.groupBy({
        by: ['status'],
        where: { courseId },
        _count: { _all: true },
      }),
    ]);

    return {
      data: enrollments.map((enrollment) => ({
        ...enrollment,
        completedLessons: enrollment.lessonProgress.length,
        totalLessons,
        progressPercentage:
          totalLessons > 0
            ? Math.round((enrollment.lessonProgress.length / totalLessons) * 100)
            : 0,
      })),
      meta: paginationMeta(page, limit, total),
      summary: {
        totalLessons,
        active: summary.find((row) => row.status === 'ACTIVE')?._count._all ?? 0,
        completed: summary.find((row) => row.status === 'COMPLETED')?._count._all ?? 0,
        cancelled: summary.find((row) => row.status === 'CANCELLED')?._count._all ?? 0,
      },
    };
  }
}
