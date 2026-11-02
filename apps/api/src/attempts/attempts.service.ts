import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { AuthUser } from '../common/types/auth-user';
import { secureSample, secureShuffle } from '../common/utils/crypto.util';
import type { SaveAnswerDto } from './dto/attempt.dto';
import { Prisma } from '../generated/prisma/client';

const attemptInclude = {
  assessment: {
    select: {
      id: true,
      title: true,
      description: true,
      instructions: true,
      courseId: true,
      instructorId: true,
      durationMinutes: true,
      totalQuestions: true,
      totalMarks: true,
      passPercentage: true,
      maxAttempts: true,
      availableFrom: true,
      availableUntil: true,
      showResultsImmediately: true,
      allowAnswerReview: true,
      resultsReleasedAt: true,
      published: true,
      course: { select: { id: true, title: true } },
    },
  },
  questions: {
    orderBy: { position: 'asc' as const },
    include: {
      options: { orderBy: { position: 'asc' as const } },
      answer: true,
    },
  },
  result: true,
} as const;

type AttemptPayload = Prisma.AssessmentAttemptGetPayload<{ include: typeof attemptInclude }>;

@Injectable()
export class AttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  async start(assessmentId: string, user: AuthUser) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        course: { select: { id: true, title: true } },
        questions: {
          orderBy: { position: 'asc' },
          include: {
            question: {
              include: { options: { orderBy: { position: 'asc' } } },
            },
          },
        },
      },
    });
    if (!assessment || !assessment.published) {
      throw new NotFoundException('Assessment not found');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId: assessment.courseId, studentId: user.id } },
    });
    if (!enrollment || enrollment.status === 'CANCELLED') {
      throw new ForbiddenException('You must be enrolled in the course to take this assessment');
    }

    const now = new Date();
    if (assessment.availableFrom && assessment.availableFrom > now) {
      throw new ForbiddenException('This assessment is not available yet');
    }
    if (assessment.availableUntil && assessment.availableUntil < now) {
      throw new ForbiddenException('This assessment is no longer available');
    }
    if (assessment.questions.length < assessment.totalQuestions) {
      throw new ConflictException('The assessment question pool is incomplete');
    }

    let attemptId = '';
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`attempt:${assessmentId}:${user.id}`}))`;

      const existingInProgress = await tx.assessmentAttempt.findFirst({
        where: { assessmentId, studentId: user.id, status: 'IN_PROGRESS' },
        orderBy: { attemptNumber: 'desc' },
      });

      if (existingInProgress) {
        if (existingInProgress.expiresAt.getTime() > Date.now()) {
          attemptId = existingInProgress.id;
          return;
        }
        await this.gradeAttempt(tx, existingInProgress.id, 'TIMED_OUT');
      }

      const attempts = await tx.assessmentAttempt.aggregate({
        where: { assessmentId, studentId: user.id },
        _count: { _all: true },
        _max: { attemptNumber: true },
      });
      if (attempts._count._all >= assessment.maxAttempts) {
        throw new ForbiddenException(
          `You have reached the maximum of ${assessment.maxAttempts} attempt(s) for this assessment`,
        );
      }

      const questionPool = assessment.questions;
      const selected = assessment.shuffleQuestions
        ? secureSample(questionPool, assessment.totalQuestions)
        : questionPool.slice(0, assessment.totalQuestions);

      const durationMs = assessment.durationMinutes * 60_000;
      const availabilityDeadline = assessment.availableUntil?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const expiresAt = new Date(
        Math.min(now.getTime() + durationMs, availabilityDeadline),
      );

      const created = await tx.assessmentAttempt.create({
        data: {
          assessmentId,
          studentId: user.id,
          attemptNumber: (attempts._max.attemptNumber ?? 0) + 1,
          startedAt: now,
          expiresAt,
          status: 'IN_PROGRESS',
          questions: {
            create: selected.map((entry, questionIndex) => {
              const original = entry.question;
              const options = assessment.shuffleOptions
                ? secureShuffle(original.options)
                : original.options;
              return {
                originalQuestionId: original.id,
                position: questionIndex + 1,
                questionTextSnapshot: original.questionText,
                explanationSnapshot: original.explanation,
                topicSnapshot: original.topic,
                marksSnapshot: original.marks,
                options: {
                  create: options.map((option, optionIndex) => ({
                    optionTextSnapshot: option.optionText,
                    position: optionIndex + 1,
                    originalOptionId: option.id,
                  })),
                },
              };
            }),
          },
        },
        include: {
          questions: { include: { options: true } },
        },
      });

      for (const attemptQuestion of created.questions) {
        const source = selected.find(
          (entry) => entry.question.id === attemptQuestion.originalQuestionId,
        );
        const correctOriginal = source?.question.options.find((option) => option.isCorrect);
        if (!correctOriginal) {
          throw new ConflictException('A question in this assessment has no correct answer');
        }
        const correctSnapshot = attemptQuestion.options.find(
          (option) => option.originalOptionId === correctOriginal.id,
        );
        if (!correctSnapshot) {
          throw new ConflictException('Failed to snapshot the correct answer option');
        }
        await tx.attemptQuestion.update({
          where: { id: attemptQuestion.id },
          data: { correctAttemptOptionId: correctSnapshot.id },
        });
      }

      attemptId = created.id;
      await tx.activityEvent.create({
        data: {
          userId: user.id,
          courseId: assessment.courseId,
          assessmentId,
          type: 'ATTEMPT_STARTED',
          message: `Started assessment "${assessment.title}"`,
        },
      });
    });

    return this.getAttempt(attemptId, user);
  }

  async getAttempt(
    attemptId: string,
    user: AuthUser,
  ): Promise<Record<string, unknown>> {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: attemptInclude,
    });
    if (!attempt) throw new NotFoundException('Attempt not found');

    const isOwner = attempt.studentId === user.id;
    const isInstructor =
      user.role === 'ADMIN' || attempt.assessment.instructorId === user.id;
    if (!isOwner && !isInstructor) {
      throw new NotFoundException('Attempt not found');
    }

    if (attempt.status === 'IN_PROGRESS' && attempt.expiresAt.getTime() <= Date.now()) {
      await this.finalizeExpiredAttempt(attempt.id);
      return this.getAttempt(attemptId, user);
    }

    return this.serializeAttempt(attempt, isOwner, isInstructor);
  }

  async saveAnswer(
    attemptId: string,
    attemptQuestionId: string,
    dto: SaveAnswerDto,
    user: AuthUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AssessmentAttempt" WHERE id = ${attemptId} FOR UPDATE`;
      const attempt = await tx.assessmentAttempt.findUnique({
        where: { id: attemptId },
        include: { assessment: { select: { title: true } } },
      });
      if (!attempt) throw new NotFoundException('Attempt not found');
      if (attempt.studentId !== user.id) {
        throw new NotFoundException('Attempt not found');
      }
      if (attempt.status !== 'IN_PROGRESS') {
        throw new ConflictException('This attempt has already been submitted');
      }
      if (attempt.expiresAt.getTime() <= Date.now()) {
        await this.gradeAttempt(tx, attemptId, 'TIMED_OUT');
        throw new BadRequestException('The examination time limit has expired');
      }

      const question = await tx.attemptQuestion.findFirst({
        where: { id: attemptQuestionId, attemptId },
        include: { options: { select: { id: true } } },
      });
      if (!question) throw new NotFoundException('Question not found in this attempt');
      if (!question.options.some((option) => option.id === dto.selectedAttemptOptionId)) {
        throw new BadRequestException('The selected option does not belong to this question');
      }

      const answer = await tx.attemptAnswer.upsert({
        where: { attemptQuestionId },
        create: {
          attemptQuestionId,
          selectedAttemptOptionId: dto.selectedAttemptOptionId,
          answeredAt: new Date(),
        },
        update: {
          selectedAttemptOptionId: dto.selectedAttemptOptionId,
          answeredAt: new Date(),
        },
      });

      return {
        saved: true,
        answeredAt: answer.answeredAt,
        remainingSeconds: Math.max(
          0,
          Math.floor((attempt.expiresAt.getTime() - Date.now()) / 1000),
        ),
      };
    });
  }

  async submit(attemptId: string, user: AuthUser) {
    let alreadyFinalized = false;
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AssessmentAttempt" WHERE id = ${attemptId} FOR UPDATE`;
      const attempt = await tx.assessmentAttempt.findUnique({
        where: { id: attemptId },
        include: {
          assessment: { select: { title: true, courseId: true } },
        },
      });
      if (!attempt) throw new NotFoundException('Attempt not found');
      if (attempt.studentId !== user.id) {
        throw new NotFoundException('Attempt not found');
      }
      if (attempt.status !== 'IN_PROGRESS') {
        alreadyFinalized = true;
        return;
      }
      const expired = attempt.expiresAt.getTime() <= Date.now();
      await this.gradeAttempt(tx, attemptId, expired ? 'TIMED_OUT' : 'GRADED', user.id);
    });

    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: attemptInclude,
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    return {
      ...this.serializeAttempt(attempt, true, false),
      idempotent: alreadyFinalized,
    };
  }

  async finalizeExpiredAttempt(attemptId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AssessmentAttempt" WHERE id = ${attemptId} FOR UPDATE`;
      const attempt = await tx.assessmentAttempt.findUnique({ where: { id: attemptId } });
      if (!attempt) return;
      if (attempt.status !== 'IN_PROGRESS' || attempt.expiresAt.getTime() > Date.now()) {
        return;
      }
      await this.gradeAttempt(tx, attemptId, 'TIMED_OUT');
    });
  }

  async result(attemptId: string, user: AuthUser) {
    let attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: attemptInclude,
    });
    if (!attempt) throw new NotFoundException('Attempt not found');

    const isOwner = attempt.studentId === user.id;
    const isInstructor =
      user.role === 'ADMIN' || attempt.assessment.instructorId === user.id;
    if (!isOwner && !isInstructor) throw new NotFoundException('Attempt not found');

    if (attempt.status === 'IN_PROGRESS' && attempt.expiresAt.getTime() <= Date.now()) {
      await this.finalizeExpiredAttempt(attemptId);
      attempt = await this.prisma.assessmentAttempt.findUnique({
        where: { id: attemptId },
        include: attemptInclude,
      });
      if (!attempt) throw new NotFoundException('Attempt not found');
    }
    if (attempt.status === 'IN_PROGRESS') {
      throw new BadRequestException('This attempt has not been submitted yet');
    }

    const visible =
      isInstructor ||
      attempt.assessment.showResultsImmediately ||
      attempt.assessment.resultsReleasedAt !== null;

    if (!visible) {
      return {
        attemptId: attempt.id,
        released: false,
        status: attempt.status,
        submittedAt: attempt.submittedAt,
        message: 'Your result will be available once your instructor releases it.',
      };
    }

    const reviewAllowed = isInstructor || attempt.assessment.allowAnswerReview;
    return {
      attemptId: attempt.id,
      released: true,
      reviewAllowed,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      finalizedAt: attempt.finalizedAt,
      expiresAt: attempt.expiresAt,
      assessment: {
        id: attempt.assessment.id,
        title: attempt.assessment.title,
        course: attempt.assessment.course,
        passPercentage: attempt.assessment.passPercentage,
        totalQuestions: attempt.assessment.totalQuestions,
        totalMarks: attempt.result?.totalMarks ?? attempt.assessment.totalMarks,
      },
      result: attempt.result
        ? {
            score: attempt.result.score,
            totalMarks: attempt.result.totalMarks,
            percentage: attempt.result.percentage,
            passed: attempt.result.passed,
            correctCount: attempt.result.correctCount,
            totalQuestions: attempt.result.totalQuestions,
            submittedAt: attempt.result.submittedAt,
          }
        : null,
      review: reviewAllowed
        ? attempt.questions.map((question) => ({
            id: question.id,
            position: question.position,
            questionText: question.questionTextSnapshot,
            explanation: question.explanationSnapshot,
            topic: question.topicSnapshot,
            marks: question.marksSnapshot,
            selectedOptionId: question.answer?.selectedAttemptOptionId ?? null,
            options: question.options.map((option) => ({
              id: option.id,
              text: option.optionTextSnapshot,
              position: option.position,
              isCorrect: option.id === question.correctAttemptOptionId,
              isSelected: option.id === question.answer?.selectedAttemptOptionId,
            })),
          }))
        : [],
    };
  }

  async history(user: AuthUser) {
    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: {
        studentId: user.id,
        status: { in: ['GRADED', 'TIMED_OUT', 'SUBMITTED'] },
      },
      orderBy: { submittedAt: 'desc' },
      include: {
        assessment: {
          select: {
            id: true,
            title: true,
            showResultsImmediately: true,
            resultsReleasedAt: true,
            passPercentage: true,
            course: { select: { id: true, title: true } },
          },
        },
        result: true,
      },
      take: 200,
    });

    return {
      data: attempts.map((attempt) => {
        const visible =
          attempt.assessment.showResultsImmediately ||
          attempt.assessment.resultsReleasedAt !== null;
        return {
          id: attempt.id,
          assessmentId: attempt.assessmentId,
          assessmentTitle: attempt.assessment.title,
          course: attempt.assessment.course,
          attemptNumber: attempt.attemptNumber,
          status: attempt.status,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          expiresAt: attempt.expiresAt,
          resultsReleased: visible,
          score: visible ? attempt.result?.score ?? attempt.score : null,
          totalMarks: visible ? attempt.result?.totalMarks ?? null : null,
          percentage: visible ? attempt.result?.percentage ?? attempt.percentage : null,
          passed: visible ? attempt.result?.passed ?? attempt.passed : null,
          correctCount: visible ? attempt.result?.correctCount ?? null : null,
          totalQuestions: visible ? attempt.result?.totalQuestions ?? null : null,
        };
      }),
    };
  }

  private async gradeAttempt(
    tx: Prisma.TransactionClient,
    attemptId: string,
    status: 'GRADED' | 'TIMED_OUT',
    userId?: string,
  ): Promise<void> {
    const attempt = await tx.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        assessment: { select: { title: true, courseId: true, passPercentage: true } },
        questions: {
          include: {
            options: { select: { id: true } },
            answer: true,
          },
        },
        result: true,
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.status !== 'IN_PROGRESS') return;

    const totalMarks = attempt.questions.reduce(
      (sum, question) => sum + question.marksSnapshot,
      0,
    );
    let score = 0;
    let correctCount = 0;
    for (const question of attempt.questions) {
      if (
        question.answer?.selectedAttemptOptionId &&
        question.answer.selectedAttemptOptionId === question.correctAttemptOptionId
      ) {
        score += question.marksSnapshot;
        correctCount += 1;
      }
    }
    const percentage = totalMarks > 0 ? Number(((score / totalMarks) * 100).toFixed(2)) : 0;
    const passed = percentage >= attempt.assessment.passPercentage;
    const finalizedAt = new Date();
    const submittedAt = status === 'TIMED_OUT' ? attempt.expiresAt : finalizedAt;

    await tx.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        status,
        score,
        percentage,
        passed,
        submittedAt,
        finalizedAt,
      },
    });

    if (!attempt.result) {
      await tx.assessmentResult.create({
        data: {
          attemptId,
          assessmentId: attempt.assessmentId,
          studentId: attempt.studentId,
          score,
          percentage,
          passed,
          correctCount,
          totalQuestions: attempt.questions.length,
          totalMarks,
          submittedAt,
        },
      });
    }

    await tx.activityEvent.create({
      data: {
        userId: userId ?? attempt.studentId,
        courseId: attempt.assessment.courseId,
        assessmentId: attempt.assessmentId,
        type: status === 'TIMED_OUT' ? 'ATTEMPT_TIMED_OUT' : 'ATTEMPT_SUBMITTED',
        message:
          status === 'TIMED_OUT'
            ? `Attempt timed out for "${attempt.assessment.title}"`
            : `Submitted "${attempt.assessment.title}"`,
      },
    });
  }

  private serializeAttempt(
    attempt: AttemptPayload,
    isOwner: boolean,
    isInstructor: boolean,
  ) {
    const now = Date.now();
    const visibleResults =
      isInstructor ||
      attempt.assessment.showResultsImmediately ||
      attempt.assessment.resultsReleasedAt !== null;
    const reviewAllowed =
      isInstructor || (attempt.assessment.allowAnswerReview && visibleResults);

    const base = {
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      status: attempt.status,
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      submittedAt: attempt.submittedAt,
      finalizedAt: attempt.finalizedAt,
      remainingSeconds:
        attempt.status === 'IN_PROGRESS'
          ? Math.max(0, Math.floor((attempt.expiresAt.getTime() - now) / 1000))
          : 0,
      serverTime: new Date(),
      assessment: {
        id: attempt.assessment.id,
        title: attempt.assessment.title,
        description: attempt.assessment.description,
        instructions: attempt.assessment.instructions,
        durationMinutes: attempt.assessment.durationMinutes,
        totalQuestions: attempt.assessment.totalQuestions,
        totalMarks: attempt.assessment.totalMarks,
        passPercentage: attempt.assessment.passPercentage,
        course: attempt.assessment.course,
      },
      questions: attempt.questions.map((question) => ({
        id: question.id,
        position: question.position,
        questionText: question.questionTextSnapshot,
        topic: question.topicSnapshot,
        marks: question.marksSnapshot,
        selectedOptionId: question.answer?.selectedAttemptOptionId ?? null,
        answeredAt: question.answer?.answeredAt ?? null,
        options: question.options.map((option) => ({
          id: option.id,
          text: option.optionTextSnapshot,
          position: option.position,
          ...(isInstructor
            ? { isCorrect: option.id === question.correctAttemptOptionId }
            : {}),
        })),
        ...(reviewAllowed && attempt.status !== 'IN_PROGRESS'
          ? {
              explanation: question.explanationSnapshot,
              isCorrect:
                question.answer?.selectedAttemptOptionId ===
                question.correctAttemptOptionId,
            }
          : {}),
      })),
    };

    if (!visibleResults) {
      return {
        ...base,
        score: null,
        percentage: null,
        passed: null,
        result: null,
        resultsReleased: false,
      };
    }

    return {
      ...base,
      score: attempt.score,
      percentage: attempt.percentage,
      passed: attempt.passed,
      result: attempt.result,
      resultsReleased: true,
      isOwner,
    };
  }
}
