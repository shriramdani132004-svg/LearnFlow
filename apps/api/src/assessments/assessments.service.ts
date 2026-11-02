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
import type {
  AssessmentQueryDto,
  CreateAssessmentDto,
  UpdateAssessmentDto,
} from './dto/assessment.dto';

const assessmentInclude = {
  course: {
    select: {
      id: true,
      title: true,
      status: true,
      instructorId: true,
      category: true,
      level: true,
      thumbnailUrl: true,
    },
  },
  instructor: { select: { id: true, name: true, email: true, avatarUrl: true } },
  _count: { select: { attempts: true, questions: true } },
} as const;

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AssessmentQueryDto, user: AuthUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Record<string, unknown> = {};
    if (user.role !== 'ADMIN') where.instructorId = user.id;
    if (query.courseId) where.courseId = query.courseId;
    if (query.status === 'PUBLISHED') where.published = true;
    if (query.status === 'DRAFT') where.published = false;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { course: { title: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [total, assessments] = await this.prisma.$transaction([
      this.prisma.assessment.count({ where }),
      this.prisma.assessment.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: assessmentInclude,
      }),
    ]);

    return {
      data: assessments.map((assessment) => ({
        ...assessment,
        attemptCount: assessment._count.attempts,
        poolSize: assessment._count.questions,
        _count: undefined,
      })),
      meta: paginationMeta(page, limit, total),
    };
  }

  async available(user: AuthUser) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: user.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
      select: { courseId: true },
    });
    const courseIds = enrollments.map((row) => row.courseId);
    if (courseIds.length === 0) return { data: [] };

    const assessments = await this.prisma.assessment.findMany({
      where: { courseId: { in: courseIds }, published: true },
      orderBy: [{ availableUntil: 'asc' }, { createdAt: 'desc' }],
      include: {
        ...assessmentInclude,
        attempts: {
          where: { studentId: user.id },
          orderBy: { attemptNumber: 'desc' },
          select: {
            id: true,
            attemptNumber: true,
            status: true,
            startedAt: true,
            expiresAt: true,
            submittedAt: true,
            percentage: true,
            passed: true,
          },
        },
      },
    });

    const now = new Date();
    return {
      data: assessments.map((assessment) => {
        const attempts = assessment.attempts;
        const inProgress = attempts.find((attempt) => attempt.status === 'IN_PROGRESS');
        const finalAttempts = attempts.filter((attempt) =>
          ['GRADED', 'TIMED_OUT', 'SUBMITTED'].includes(attempt.status),
        );
        const attemptsUsed = finalAttempts.length;
        const withinWindow =
          (!assessment.availableFrom || assessment.availableFrom <= now) &&
          (!assessment.availableUntil || assessment.availableUntil >= now);
        const canStart = withinWindow && !inProgress && attemptsUsed < assessment.maxAttempts;
        const resultsReleased = Boolean(
          assessment.showResultsImmediately || assessment.resultsReleasedAt,
        );
        const latestAttempt = finalAttempts[0] ?? null;
        const lastAttempt = latestAttempt
          ? {
              ...latestAttempt,
              percentage: resultsReleased ? latestAttempt.percentage : null,
              passed: resultsReleased ? latestAttempt.passed : null,
              resultsReleased,
            }
          : null;
        return {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          instructions: assessment.instructions,
          durationMinutes: assessment.durationMinutes,
          totalQuestions: assessment.totalQuestions,
          totalMarks: assessment.totalMarks,
          passPercentage: assessment.passPercentage,
          maxAttempts: assessment.maxAttempts,
          availableFrom: assessment.availableFrom,
          availableUntil: assessment.availableUntil,
          showResultsImmediately: assessment.showResultsImmediately,
          allowAnswerReview: assessment.allowAnswerReview,
          resultsReleasedAt: assessment.resultsReleasedAt,
          course: assessment.course,
          instructor: assessment.instructor,
          attemptsUsed,
          attemptsRemaining: Math.max(0, assessment.maxAttempts - attemptsUsed),
          inProgressAttemptId: inProgress?.id ?? null,
          lastAttempt,
          canStart,
          windowState: withinWindow
            ? 'OPEN'
            : assessment.availableFrom && assessment.availableFrom > now
              ? 'UPCOMING'
              : 'CLOSED',
        };
      }),
    };
  }

  async getById(id: string, user: AuthUser) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        ...assessmentInclude,
        questions: {
          orderBy: { position: 'asc' },
          include: {
            question: {
              include: { options: { orderBy: { position: 'asc' } } },
            },
          },
        },
        attempts: {
          where: { studentId: user.id },
          orderBy: { attemptNumber: 'desc' },
        },
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    const isOwner = user.role === 'ADMIN' || assessment.instructorId === user.id;
    if (!isOwner) {
      if (!assessment.published) throw new NotFoundException('Assessment not found');
      const enrollment = await this.prisma.enrollment.findUnique({
        where: {
          courseId_studentId: { courseId: assessment.courseId, studentId: user.id },
        },
      });
      if (!enrollment || enrollment.status === 'CANCELLED') {
        throw new NotFoundException('Assessment not found');
      }
    }

    const base = {
      ...assessment,
      attemptCount: assessment._count.attempts,
      poolSize: assessment._count.questions,
      _count: undefined,
    };

    if (isOwner) {
      return {
        ...base,
        pool: assessment.questions.map((entry) => ({
          ...entry.question,
          assessmentPosition: entry.position,
        })),
      };
    }

    const now = new Date();
    const inProgress = assessment.attempts.find(
      (attempt) => attempt.status === 'IN_PROGRESS',
    );
    const finalAttempts = assessment.attempts.filter((attempt) =>
      ['GRADED', 'TIMED_OUT', 'SUBMITTED'].includes(attempt.status),
    );
    const withinWindow =
      (!assessment.availableFrom || assessment.availableFrom <= now) &&
      (!assessment.availableUntil || assessment.availableUntil >= now);
    const canStart =
      withinWindow && !inProgress && finalAttempts.length < assessment.maxAttempts;
    const resultsReleased = Boolean(
      assessment.showResultsImmediately || assessment.resultsReleasedAt,
    );

    return {
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      instructions: assessment.instructions,
      durationMinutes: assessment.durationMinutes,
      totalQuestions: assessment.totalQuestions,
      totalMarks: assessment.totalMarks,
      passPercentage: assessment.passPercentage,
      maxAttempts: assessment.maxAttempts,
      availableFrom: assessment.availableFrom,
      availableUntil: assessment.availableUntil,
      published: assessment.published,
      showResultsImmediately: assessment.showResultsImmediately,
      allowAnswerReview: assessment.allowAnswerReview,
      resultsReleasedAt: assessment.resultsReleasedAt,
      shuffleQuestions: assessment.shuffleQuestions,
      shuffleOptions: assessment.shuffleOptions,
      course: assessment.course,
      instructor: assessment.instructor,
      attemptsUsed: finalAttempts.length,
      attemptsRemaining: Math.max(0, assessment.maxAttempts - finalAttempts.length),
      inProgressAttemptId: inProgress?.id ?? null,
      attempts: finalAttempts.map((attempt) => ({
        ...attempt,
        percentage: resultsReleased ? attempt.percentage : null,
        passed: resultsReleased ? attempt.passed : null,
        score: resultsReleased ? attempt.score : null,
        resultsReleased,
      })),
      canStart,
    };
  }

  async create(dto: CreateAssessmentDto, user: AuthUser) {
    await this.assertCourseOwner(dto.courseId, user);
    const pool = await this.validatePool(
      dto.questionIds,
      dto.courseId,
      dto.totalQuestions,
      user,
    );
    this.validateAvailability(dto.availableFrom, dto.availableUntil);

    const assessment = await this.prisma.$transaction(async (tx) => {
      return tx.assessment.create({
        data: {
          courseId: dto.courseId,
          instructorId: user.id,
          title: dto.title.trim(),
          description: dto.description?.trim() ?? null,
          instructions: dto.instructions?.trim() ?? null,
          durationMinutes: dto.durationMinutes,
          totalQuestions: dto.totalQuestions,
          totalMarks: pool.totalMarks,
          passPercentage: dto.passPercentage,
          maxAttempts: dto.maxAttempts,
          availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : null,
          availableUntil: dto.availableUntil ? new Date(dto.availableUntil) : null,
          shuffleQuestions: dto.shuffleQuestions ?? true,
          shuffleOptions: dto.shuffleOptions ?? true,
          showResultsImmediately: dto.showResultsImmediately ?? true,
          allowAnswerReview: dto.allowAnswerReview ?? true,
          difficultyFilter: (dto.difficultyFilter as 'EASY' | 'MEDIUM' | 'HARD') ?? null,
          topicFilter: dto.topicFilter?.trim() ?? null,
          questions: {
            create: dto.questionIds.map((questionId, index) => ({
              questionId,
              position: index + 1,
            })),
          },
        },
        include: assessmentInclude,
      });
    });

    await this.prisma.activityEvent.create({
      data: {
        userId: user.id,
        courseId: dto.courseId,
        assessmentId: assessment.id,
        type: 'ASSESSMENT_CREATED',
        message: `Created assessment "${assessment.title}"`,
      },
    });
    return assessment;
  }

  async update(id: string, dto: UpdateAssessmentDto, user: AuthUser) {
    const assessment = await this.prisma.assessment.findUnique({ where: { id } });
    if (!assessment) throw new NotFoundException('Assessment not found');
    await this.assertOwner(assessment, user);

    const activeAttempts = await this.prisma.assessmentAttempt.count({
      where: { assessmentId: id, status: 'IN_PROGRESS' },
    });
    if (activeAttempts > 0) {
      throw new ConflictException(
        'This assessment has attempts in progress. Wait for them to finish before editing.',
      );
    }

    const totalQuestions = dto.totalQuestions ?? assessment.totalQuestions;
    let totalMarks = assessment.totalMarks;
    let questionsUpdate: { questionId: string; position: number }[] | undefined;

    if (dto.questionIds) {
      const pool = await this.validatePool(
        dto.questionIds,
        assessment.courseId,
        totalQuestions,
        user,
      );
      totalMarks = pool.totalMarks;
      questionsUpdate = dto.questionIds.map((questionId, index) => ({
        questionId,
        position: index + 1,
      }));
    } else if (dto.totalQuestions && dto.totalQuestions !== assessment.totalQuestions) {
      const current = await this.prisma.assessmentQuestion.findMany({
        where: { assessmentId: id },
        include: { question: { select: { marks: true } } },
      });
      if (!current.length) {
        throw new BadRequestException('Add questions before changing the question count');
      }
      if (current.length < dto.totalQuestions) {
        throw new BadRequestException('The question pool is smaller than the requested count');
      }
      const marks = current[0].question.marks;
      totalMarks = marks * dto.totalQuestions;
    } else if (dto.totalQuestions) {
      const current = await this.prisma.assessmentQuestion.findMany({
        where: { assessmentId: id },
        include: { question: { select: { marks: true } } },
      });
      totalMarks = current[0]?.question.marks
        ? current[0].question.marks * totalQuestions
        : totalMarks;
    }

    this.validateAvailability(
      dto.availableFrom === undefined ? undefined : dto.availableFrom,
      dto.availableUntil === undefined ? undefined : dto.availableUntil,
      dto.availableFrom === undefined ? assessment.availableFrom?.toISOString() : dto.availableFrom,
      dto.availableUntil === undefined
        ? assessment.availableUntil?.toISOString()
        : dto.availableUntil,
    );

    return this.prisma.$transaction(async (tx) => {
      if (questionsUpdate) {
        await tx.assessmentQuestion.deleteMany({ where: { assessmentId: id } });
        await tx.assessmentQuestion.createMany({
          data: questionsUpdate.map((row) => ({ assessmentId: id, ...row })),
        });
      }
      return tx.assessment.update({
        where: { id },
        data: {
          title: dto.title?.trim(),
          description: dto.description?.trim(),
          instructions: dto.instructions?.trim(),
          durationMinutes: dto.durationMinutes,
          totalQuestions: dto.totalQuestions,
          totalMarks,
          passPercentage: dto.passPercentage,
          maxAttempts: dto.maxAttempts,
          availableFrom:
            dto.availableFrom === undefined
              ? undefined
              : dto.availableFrom === null
                ? null
                : new Date(dto.availableFrom),
          availableUntil:
            dto.availableUntil === undefined
              ? undefined
              : dto.availableUntil === null
                ? null
                : new Date(dto.availableUntil),
          shuffleQuestions: dto.shuffleQuestions,
          shuffleOptions: dto.shuffleOptions,
          showResultsImmediately: dto.showResultsImmediately,
          allowAnswerReview: dto.allowAnswerReview,
          difficultyFilter:
            dto.difficultyFilter === undefined
              ? undefined
              : (dto.difficultyFilter as 'EASY' | 'MEDIUM' | 'HARD' | null),
          topicFilter:
            dto.topicFilter === undefined ? undefined : dto.topicFilter?.trim() ?? null,
        },
        include: assessmentInclude,
      });
    });
  }

  async remove(id: string, user: AuthUser) {
    const assessment = await this.prisma.assessment.findUnique({ where: { id } });
    if (!assessment) throw new NotFoundException('Assessment not found');
    await this.assertOwner(assessment, user);
    const attempts = await this.prisma.assessmentAttempt.count({
      where: { assessmentId: id },
    });
    if (attempts > 0) {
      throw new ConflictException(
        'Assessments with attempt history cannot be deleted. Unpublish it instead.',
      );
    }
    await this.prisma.assessment.delete({ where: { id } });
    return { success: true };
  }

  async publish(id: string, user: AuthUser) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: { questions: true },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    await this.assertOwner(assessment, user);
    if (assessment.questions.length < assessment.totalQuestions) {
      throw new BadRequestException(
        'The question pool contains fewer questions than the assessment requires',
      );
    }
    this.validateAvailability(
      assessment.availableFrom?.toISOString(),
      assessment.availableUntil?.toISOString(),
    );
    const published = await this.prisma.assessment.update({
      where: { id },
      data: { published: true, publishedAt: assessment.publishedAt ?? new Date() },
      include: assessmentInclude,
    });
    await this.prisma.activityEvent.create({
      data: {
        userId: user.id,
        courseId: assessment.courseId,
        assessmentId: id,
        type: 'ASSESSMENT_PUBLISHED',
        message: `Published assessment "${assessment.title}"`,
      },
    });
    return published;
  }

  async unpublish(id: string, user: AuthUser) {
    const assessment = await this.prisma.assessment.findUnique({ where: { id } });
    if (!assessment) throw new NotFoundException('Assessment not found');
    await this.assertOwner(assessment, user);
    return this.prisma.assessment.update({
      where: { id },
      data: { published: false },
      include: assessmentInclude,
    });
  }

  async releaseResults(id: string, user: AuthUser) {
    const assessment = await this.prisma.assessment.findUnique({ where: { id } });
    if (!assessment) throw new NotFoundException('Assessment not found');
    await this.assertOwner(assessment, user);
    return this.prisma.assessment.update({
      where: { id },
      data: { resultsReleasedAt: new Date() },
      include: assessmentInclude,
    });
  }

  async preview(id: string, user: AuthUser) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        ...assessmentInclude,
        questions: {
          orderBy: { position: 'asc' },
          include: {
            question: {
              include: {
                options: { orderBy: { position: 'asc' } },
              },
            },
          },
        },
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    await this.assertOwner(assessment, user);
    return {
      ...assessment,
      attemptCount: assessment._count.attempts,
      poolSize: assessment._count.questions,
      _count: undefined,
      questions: assessment.questions.map((entry) => entry.question),
    };
  }

  async getOwnedAssessment(id: string, user: AuthUser) {
    const assessment = await this.prisma.assessment.findUnique({ where: { id } });
    if (!assessment) throw new NotFoundException('Assessment not found');
    await this.assertOwner(assessment, user);
    return assessment;
  }

  async assertCourseOwner(courseId: string, user: AuthUser) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (user.role !== 'ADMIN' && course.instructorId !== user.id) {
      throw new ForbiddenException('You do not own this course');
    }
    return course;
  }

  private async assertOwner(
    assessment: { instructorId: string },
    user: AuthUser,
  ): Promise<void> {
    if (user.role !== 'ADMIN' && assessment.instructorId !== user.id) {
      throw new ForbiddenException('You do not own this assessment');
    }
  }

  private async validatePool(
    questionIds: string[],
    courseId: string,
    totalQuestions: number,
    user: AuthUser,
  ) {
    const uniqueIds = [...new Set(questionIds)];
    if (uniqueIds.length !== questionIds.length) {
      throw new BadRequestException('Duplicate questions are not allowed');
    }
    if (uniqueIds.length < totalQuestions) {
      throw new BadRequestException(
        'The question pool must contain at least as many questions as the assessment requires',
      );
    }
    const questions = await this.prisma.question.findMany({
      where: {
        id: { in: uniqueIds },
        courseId,
        ...(user.role === 'ADMIN' ? {} : { instructorId: user.id }),
      },
      select: { id: true, marks: true },
    });
    if (questions.length !== uniqueIds.length) {
      throw new BadRequestException(
        'Every selected question must belong to the course and your question bank',
      );
    }
    const marks = new Set(questions.map((question) => question.marks));
    if (marks.size > 1) {
      throw new BadRequestException(
        'All questions in an assessment pool must use the same mark value so randomized selection produces a consistent total.',
      );
    }
    return {
      questions,
      totalMarks: (questions[0]?.marks ?? 1) * totalQuestions,
    };
  }

  private validateAvailability(
    from?: string | null,
    until?: string | null,
    existingFrom?: string | null,
    existingUntil?: string | null,
  ) {
    const start = from === undefined ? existingFrom : from;
    const end = until === undefined ? existingUntil : until;
    if (start && end && new Date(end) <= new Date(start)) {
      throw new BadRequestException('Availability end must be after the start date');
    }
  }
}
