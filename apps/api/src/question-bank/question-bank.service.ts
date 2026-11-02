import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { AuthUser } from '../common/types/auth-user';
import { paginationMeta } from '../common/dto/pagination.dto';
import type {
  CreateQuestionDto,
  QuestionOptionDto,
  QuestionQueryDto,
  UpdateQuestionDto,
} from './dto/question.dto';

@Injectable()
export class QuestionBankService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QuestionQueryDto, user: AuthUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Record<string, unknown> = {};
    if (user.role !== 'ADMIN') where.instructorId = user.id;
    if (query.courseId) where.courseId = query.courseId;
    if (query.difficulty) where.difficulty = query.difficulty;
    if (query.topic) where.topic = { equals: query.topic, mode: 'insensitive' };
    if (query.search) {
      where.OR = [
        { questionText: { contains: query.search, mode: 'insensitive' } },
        { topic: { contains: query.search, mode: 'insensitive' } },
        { explanation: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, questions] = await this.prisma.$transaction([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          course: { select: { id: true, title: true, status: true } },
          options: { orderBy: { position: 'asc' } },
        },
      }),
    ]);

    return { data: questions, meta: paginationMeta(page, limit, total) };
  }

  async getById(id: string, user: AuthUser) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true, instructorId: true } },
        options: { orderBy: { position: 'asc' } },
      },
    });
    if (!question) throw new NotFoundException('Question not found');
    if (user.role !== 'ADMIN' && question.instructorId !== user.id) {
      throw new NotFoundException('Question not found');
    }
    return question;
  }

  async topics(courseId: string | undefined, user: AuthUser) {
    const where: Record<string, unknown> = {};
    if (user.role !== 'ADMIN') where.instructorId = user.id;
    if (courseId) where.courseId = courseId;
    const rows = await this.prisma.question.groupBy({
      by: ['topic'],
      where,
      _count: { _all: true },
      orderBy: { topic: 'asc' },
    });
    return {
      data: rows.map((row) => ({ topic: row.topic, count: row._count._all })),
    };
  }

  async create(dto: CreateQuestionDto, user: AuthUser) {
    await this.assertCourseOwner(dto.courseId, user);
    const options = this.validateOptions(dto.options);

    return this.prisma.question.create({
      data: {
        instructorId: user.id,
        courseId: dto.courseId,
        questionText: dto.questionText.trim(),
        explanation: dto.explanation?.trim() ?? null,
        difficulty: dto.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
        topic: dto.topic.trim(),
        marks: dto.marks,
        options: {
          create: options.map((option, index) => ({
            optionText: option.optionText,
            isCorrect: option.isCorrect,
            position: index + 1,
          })),
        },
      },
      include: { options: { orderBy: { position: 'asc' } } },
    });
  }

  async update(id: string, dto: UpdateQuestionDto, user: AuthUser) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    if (user.role !== 'ADMIN' && question.instructorId !== user.id) {
      throw new ForbiddenException('You do not own this question');
    }
    if (dto.courseId) await this.assertCourseOwner(dto.courseId, user);
    const options = dto.options ? this.validateOptions(dto.options) : undefined;

    return this.prisma.$transaction(async (tx) => {
      if (options) {
        await tx.questionOption.deleteMany({ where: { questionId: id } });
      }
      return tx.question.update({
        where: { id },
        data: {
          courseId: dto.courseId,
          questionText: dto.questionText?.trim(),
          explanation: dto.explanation?.trim(),
          difficulty: dto.difficulty as 'EASY' | 'MEDIUM' | 'HARD' | undefined,
          topic: dto.topic?.trim(),
          marks: dto.marks,
          options: options
            ? {
                create: options.map((option, index) => ({
                  optionText: option.optionText,
                  isCorrect: option.isCorrect,
                  position: index + 1,
                })),
              }
            : undefined,
        },
        include: { options: { orderBy: { position: 'asc' } } },
      });
    });
  }

  async remove(id: string, user: AuthUser) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        _count: { select: { assessmentQuestions: true, attemptQuestions: true } },
      },
    });
    if (!question) throw new NotFoundException('Question not found');
    if (user.role !== 'ADMIN' && question.instructorId !== user.id) {
      throw new ForbiddenException('You do not own this question');
    }
    if (question._count.assessmentQuestions > 0) {
      throw new BadRequestException(
        'This question is used by an assessment. Remove it from the assessment first.',
      );
    }
    if (question._count.attemptQuestions > 0) {
      throw new BadRequestException(
        'This question has been used in an attempt and must be retained for audit history.',
      );
    }
    await this.prisma.question.delete({ where: { id } });
    return { success: true };
  }

  private validateOptions(options: QuestionOptionDto[]): QuestionOptionDto[] {
    const trimmed = options.map((option) => ({
      optionText: option.optionText.trim(),
      isCorrect: option.isCorrect,
    }));
    if (trimmed.some((option) => option.optionText.length === 0)) {
      throw new BadRequestException('Every option must contain text');
    }
    const unique = new Set(trimmed.map((option) => option.optionText.toLowerCase()));
    if (unique.size !== trimmed.length) {
      throw new BadRequestException('Answer options must be unique');
    }
    const correct = trimmed.filter((option) => option.isCorrect).length;
    if (correct !== 1) {
      throw new BadRequestException('Exactly one answer option must be marked correct');
    }
    return trimmed;
  }

  private async assertCourseOwner(courseId: string, user: AuthUser) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (user.role !== 'ADMIN' && course.instructorId !== user.id) {
      throw new ForbiddenException('You do not own this course');
    }
    return course;
  }
}
