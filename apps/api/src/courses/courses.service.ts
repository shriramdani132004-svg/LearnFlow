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
import { slugify, uniqueSlug } from '../common/utils/crypto.util';
import type {
  CourseQueryDto,
  CreateCourseDto,
  CreateLessonDto,
  CreateModuleDto,
  ReorderModulesDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdateModuleDto,
} from './dto/course.dto';

const instructorSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} as const;

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: CourseQueryDto, user?: AuthUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const isMine = query.mine === true;

    if (isMine && !user) {
      throw new ForbiddenException('Authentication is required to list your courses');
    }
    if (isMine && user && !['INSTRUCTOR', 'ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Only instructors can list authored courses');
    }

    const where: Record<string, unknown> = {};
    if (isMine && user) {
      if (user.role !== 'ADMIN') where.instructorId = user.id;
      if (query.status) where.status = query.status;
    } else {
      where.status = 'PUBLISHED';
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.category) where.category = { equals: query.category, mode: 'insensitive' };
    if (query.level) where.level = query.level;

    const [total, courses] = await this.prisma.$transaction([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          instructor: { select: instructorSelect },
          _count: { select: { enrollments: true, modules: true, assessments: true } },
        },
      }),
    ]);

    return {
      data: courses.map((course) => ({
        ...course,
        enrollmentCount: course._count.enrollments,
        moduleCount: course._count.modules,
        assessmentCount: course._count.assessments,
        _count: undefined,
      })),
      meta: paginationMeta(page, limit, total),
    };
  }

  async getById(id: string, user?: AuthUser) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        instructor: { select: instructorSelect },
        modules: {
          orderBy: { position: 'asc' },
          include: {
            lessons: { orderBy: { position: 'asc' } },
          },
        },
        _count: { select: { enrollments: true, assessments: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    const isOwner = user?.role === 'ADMIN' || (user && course.instructorId === user.id);
    if (course.status !== 'PUBLISHED' && !isOwner) {
      throw new NotFoundException('Course not found');
    }

    let enrollment = null;
    if (user) {
      enrollment = await this.prisma.enrollment.findUnique({
        where: { courseId_studentId: { courseId: id, studentId: user.id } },
      });
    }

    const canViewContent = Boolean(isOwner || enrollment);
    let completedLessonIds: string[] = [];
    if (enrollment) {
      const progress = await this.prisma.lessonProgress.findMany({
        where: { enrollmentId: enrollment.id },
        select: { lessonId: true },
      });
      completedLessonIds = progress.map((row) => row.lessonId);
    }

    return {
      ...course,
      enrollmentCount: course._count.enrollments,
      assessmentCount: course._count.assessments,
      _count: undefined,
      viewerEnrollment: enrollment,
      completedLessonIds,
      modules: course.modules.map((module) => ({
        ...module,
        lessons: module.lessons.map((lesson) =>
          canViewContent
            ? lesson
            : {
                id: lesson.id,
                moduleId: lesson.moduleId,
                title: lesson.title,
                position: lesson.position,
                estimatedMinutes: lesson.estimatedMinutes,
                published: lesson.published,
              },
        ),
      })),
    };
  }

  async create(dto: CreateCourseDto, user: AuthUser) {
    const baseSlug = slugify(dto.title);
    let slug = baseSlug || 'course';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const exists = await this.prisma.course.findUnique({ where: { slug } });
      if (!exists) break;
      slug = uniqueSlug(baseSlug);
    }

    const course = await this.prisma.course.create({
      data: {
        instructorId: user.id,
        title: dto.title.trim(),
        slug,
        description: dto.description.trim(),
        category: dto.category.trim(),
        level: dto.level,
        thumbnailUrl: dto.thumbnailUrl ?? null,
        status: 'DRAFT',
      },
      include: { instructor: { select: instructorSelect } },
    });
    await this.recordActivity(user.id, course.id, 'COURSE_CREATED', `Created course "${course.title}"`);
    return course;
  }

  async update(id: string, dto: UpdateCourseDto, user: AuthUser) {
    const course = await this.assertOwner(id, user);
    if (course.status === 'ARCHIVED') {
      throw new BadRequestException('Archived courses cannot be edited');
    }
    return this.prisma.course.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        category: dto.category?.trim(),
        level: dto.level,
        thumbnailUrl: dto.thumbnailUrl,
      },
      include: { instructor: { select: instructorSelect } },
    });
  }

  async remove(id: string, user: AuthUser) {
    await this.assertOwner(id, user);
    const [enrollments, attempts] = await Promise.all([
      this.prisma.enrollment.count({ where: { courseId: id } }),
      this.prisma.assessmentAttempt.count({
        where: { assessment: { courseId: id } },
      }),
    ]);
    if (enrollments > 0 || attempts > 0) {
      throw new ConflictException(
        'Courses with enrollments or assessment attempts cannot be deleted. Archive the course instead.',
      );
    }
    await this.prisma.course.delete({ where: { id } });
    return { success: true };
  }

  async publish(id: string, user: AuthUser) {
    const course = await this.assertOwner(id, user);
    if (course.status === 'ARCHIVED') {
      throw new BadRequestException('Archived courses cannot be published');
    }
    const lessonCount = await this.prisma.lesson.count({
      where: { module: { courseId: id } },
    });
    if (lessonCount === 0) {
      throw new BadRequestException(
        'Add at least one module and lesson before publishing this course',
      );
    }
    const published = await this.prisma.course.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: course.publishedAt ?? new Date(),
      },
      include: { instructor: { select: instructorSelect } },
    });
    await this.recordActivity(user.id, id, 'COURSE_PUBLISHED', `Published "${course.title}"`);
    return published;
  }

  async archive(id: string, user: AuthUser) {
    const course = await this.assertOwner(id, user);
    const archived = await this.prisma.course.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    await this.recordActivity(user.id, id, 'COURSE_ARCHIVED', `Archived "${course.title}"`);
    return archived;
  }

  async createModule(courseId: string, dto: CreateModuleDto, user: AuthUser) {
    await this.assertOwner(courseId, user);
    const max = await this.prisma.courseModule.aggregate({
      where: { courseId },
      _max: { position: true },
    });
    const position = dto.position ?? (max._max.position ?? 0) + 1;
    return this.prisma.$transaction(async (tx) => {
      if (dto.position) {
        const affected = await tx.courseModule.findMany({
          where: { courseId, position: { gte: position } },
          select: { id: true, position: true },
          orderBy: { position: 'desc' },
        });
        for (const row of affected) {
          await tx.courseModule.update({
            where: { id: row.id },
            data: { position: -row.position },
          });
        }
        for (const row of affected) {
          await tx.courseModule.update({
            where: { id: row.id },
            data: { position: row.position + 1 },
          });
        }
      }
      return tx.courseModule.create({
        data: {
          courseId,
          title: dto.title.trim(),
          description: dto.description?.trim() ?? null,
          position,
        },
        include: { lessons: true },
      });
    });
  }

  async updateModule(moduleId: string, dto: UpdateModuleDto, user: AuthUser) {
    const module = await this.prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) throw new NotFoundException('Module not found');
    await this.assertOwner(module.courseId, user);

    if (dto.position !== undefined && dto.position !== module.position) {
      const siblings = await this.prisma.courseModule.findMany({
        where: { courseId: module.courseId },
        orderBy: { position: 'asc' },
        select: { id: true },
      });
      const ids = siblings.map((row) => row.id).filter((id) => id !== moduleId);
      const targetIndex = Math.min(Math.max(dto.position - 1, 0), ids.length);
      ids.splice(targetIndex, 0, moduleId);
      await this.prisma.$transaction(async (tx) => {
        for (let index = 0; index < ids.length; index += 1) {
          await tx.courseModule.update({
            where: { id: ids[index] },
            data: { position: -(index + 1) },
          });
        }
        for (let index = 0; index < ids.length; index += 1) {
          await tx.courseModule.update({
            where: { id: ids[index] },
            data: { position: index + 1 },
          });
        }
      });
    }

    return this.prisma.courseModule.update({
      where: { id: moduleId },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
      },
      include: { lessons: { orderBy: { position: 'asc' } } },
    });
  }

  async removeModule(moduleId: string, user: AuthUser) {
    const module = await this.prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) throw new NotFoundException('Module not found');
    await this.assertOwner(module.courseId, user);
    await this.prisma.courseModule.delete({ where: { id: moduleId } });
    return { success: true };
  }

  async reorderModules(courseId: string, dto: ReorderModulesDto, user: AuthUser) {
    await this.assertOwner(courseId, user);
    const modules = await this.prisma.courseModule.findMany({
      where: { courseId },
      select: { id: true },
    });
    if (modules.length !== dto.moduleIds.length) {
      throw new BadRequestException('The module list must contain every module exactly once');
    }
    const existing = new Set(modules.map((row) => row.id));
    if (dto.moduleIds.some((id) => !existing.has(id))) {
      throw new BadRequestException('One or more modules do not belong to this course');
    }
    await this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < dto.moduleIds.length; index += 1) {
        await tx.courseModule.update({
          where: { id: dto.moduleIds[index] },
          data: { position: -(index + 1) },
        });
      }
      for (let index = 0; index < dto.moduleIds.length; index += 1) {
        await tx.courseModule.update({
          where: { id: dto.moduleIds[index] },
          data: { position: index + 1 },
        });
      }
    });
    return this.prisma.courseModule.findMany({
      where: { courseId },
      orderBy: { position: 'asc' },
      include: { lessons: { orderBy: { position: 'asc' } } },
    });
  }

  async createLesson(moduleId: string, dto: CreateLessonDto, user: AuthUser) {
    const module = await this.prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) throw new NotFoundException('Module not found');
    await this.assertOwner(module.courseId, user);

    const max = await this.prisma.lesson.aggregate({
      where: { moduleId },
      _max: { position: true },
    });
    const position = dto.position ?? (max._max.position ?? 0) + 1;
    return this.prisma.$transaction(async (tx) => {
      if (dto.position) {
        const affected = await tx.lesson.findMany({
          where: { moduleId, position: { gte: position } },
          select: { id: true, position: true },
          orderBy: { position: 'desc' },
        });
        for (const row of affected) {
          await tx.lesson.update({
            where: { id: row.id },
            data: { position: -row.position },
          });
        }
        for (const row of affected) {
          await tx.lesson.update({
            where: { id: row.id },
            data: { position: row.position + 1 },
          });
        }
      }
      return tx.lesson.create({
        data: {
          moduleId,
          title: dto.title.trim(),
          content: dto.content,
          resourceUrl: dto.resourceUrl ?? null,
          position,
          estimatedMinutes: dto.estimatedMinutes ?? 10,
          published: dto.published ?? false,
        },
      });
    });
  }

  async updateLesson(lessonId: string, dto: UpdateLessonDto, user: AuthUser) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.assertOwner(lesson.module.courseId, user);

    if (dto.position !== undefined && dto.position !== lesson.position) {
      const siblings = await this.prisma.lesson.findMany({
        where: { moduleId: lesson.moduleId },
        orderBy: { position: 'asc' },
        select: { id: true },
      });
      const ids = siblings.map((row) => row.id).filter((id) => id !== lessonId);
      const targetIndex = Math.min(Math.max(dto.position - 1, 0), ids.length);
      ids.splice(targetIndex, 0, lessonId);
      await this.prisma.$transaction(async (tx) => {
        for (let index = 0; index < ids.length; index += 1) {
          await tx.lesson.update({ where: { id: ids[index] }, data: { position: -(index + 1) } });
        }
        for (let index = 0; index < ids.length; index += 1) {
          await tx.lesson.update({ where: { id: ids[index] }, data: { position: index + 1 } });
        }
      });
    }

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: dto.title?.trim(),
        content: dto.content,
        resourceUrl: dto.resourceUrl,
        estimatedMinutes: dto.estimatedMinutes,
        published: dto.published,
      },
    });
  }

  async removeLesson(lessonId: string, user: AuthUser) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.assertOwner(lesson.module.courseId, user);
    await this.prisma.lesson.delete({ where: { id: lessonId } });
    return { success: true };
  }

  async completeLesson(lessonId: string, user: AuthUser) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        courseId_studentId: { courseId: lesson.module.courseId, studentId: user.id },
      },
    });
    if (!enrollment || enrollment.status === 'CANCELLED') {
      throw new ForbiddenException('You must be enrolled in this course');
    }

    await this.prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      create: { enrollmentId: enrollment.id, lessonId },
      update: {},
    });

    const progress = await this.recalculateCourseCompletion(enrollment.id, user.id, lesson.module.courseId);
    return { completed: true, progress };
  }

  async uncompleteLesson(lessonId: string, user: AuthUser) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        courseId_studentId: { courseId: lesson.module.courseId, studentId: user.id },
      },
    });
    if (!enrollment) throw new ForbiddenException('You must be enrolled in this course');

    await this.prisma.lessonProgress.deleteMany({
      where: { enrollmentId: enrollment.id, lessonId },
    });
    const progress = await this.recalculateCourseCompletion(enrollment.id, user.id, lesson.module.courseId);
    return { completed: false, progress };
  }

  private async recalculateCourseCompletion(
    enrollmentId: string,
    studentId: string,
    courseId: string,
  ) {
    const [totalLessons, completedLessons] = await Promise.all([
      this.prisma.lesson.count({
        where: { module: { courseId }, published: true },
      }),
      this.prisma.lessonProgress.count({
        where: {
          enrollmentId,
          lesson: { module: { courseId }, published: true },
        },
      }),
    ]);
    const percentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const isComplete = totalLessons > 0 && completedLessons >= totalLessons;

    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: isComplete ? 'COMPLETED' : 'ACTIVE',
        completedAt: isComplete ? new Date() : null,
      },
    });

    if (isComplete) {
      const existing = await this.prisma.activityEvent.findFirst({
        where: { userId: studentId, courseId, type: 'COURSE_COMPLETED' },
      });
      if (!existing) {
        await this.prisma.activityEvent.create({
          data: {
            userId: studentId,
            courseId,
            type: 'COURSE_COMPLETED',
            message: 'Completed all lessons in a course',
          },
        });
      }
    }

    return { totalLessons, completedLessons, percentage, isComplete };
  }

  async assertOwner(courseId: string, user: AuthUser) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (user.role !== 'ADMIN' && course.instructorId !== user.id) {
      throw new ForbiddenException('You do not own this course');
    }
    return course;
  }

  private async recordActivity(
    userId: string,
    courseId: string,
    type: string,
    message: string,
  ) {
    await this.prisma.activityEvent.create({
      data: { userId, courseId, type, message },
    });
  }
}
