import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { AuthUser } from '../common/types/auth-user';
import { paginationMeta } from '../common/dto/pagination.dto';
import type { AttemptListQueryDto } from './dto/assessment.dto';
import { AssessmentsService } from './assessments.service';

type FinalStatus = 'GRADED' | 'TIMED_OUT';

@Injectable()
export class AssessmentReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessmentsService: AssessmentsService,
  ) {}

  async report(assessmentId: string, user: AuthUser) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        course: { select: { id: true, title: true } },
        questions: { include: { question: { select: { difficulty: true, topic: true } } } },
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    await this.assessmentsService.getOwnedAssessment(assessmentId, user);

    const finalWhere = {
      assessmentId,
      status: { in: ['GRADED', 'TIMED_OUT'] as FinalStatus[] },
    };

    const [totalAttempts, finalAttempts, inProgress, questionResponses, passedGroups] =
      await Promise.all([
        this.prisma.assessmentAttempt.count({ where: { assessmentId } }),
        this.prisma.assessmentAttempt.findMany({
          where: finalWhere,
          select: {
            id: true,
            studentId: true,
            percentage: true,
            passed: true,
            submittedAt: true,
            score: true,
          },
          orderBy: { submittedAt: 'asc' },
        }),
        this.prisma.assessmentAttempt.count({
          where: { assessmentId, status: 'IN_PROGRESS' },
        }),
        this.prisma.attemptQuestion.findMany({
          where: { attempt: { assessmentId, status: { in: ['GRADED', 'TIMED_OUT'] } } },
          select: {
            originalQuestionId: true,
            questionTextSnapshot: true,
            topicSnapshot: true,
            marksSnapshot: true,
            correctAttemptOptionId: true,
            answer: { select: { selectedAttemptOptionId: true } },
          },
        }),
        this.prisma.assessmentAttempt.groupBy({
          by: ['passed'],
          where: finalWhere,
          _count: { _all: true },
        }),
      ]);

    const scores = finalAttempts
      .map((attempt) => attempt.percentage ?? 0)
      .sort((a, b) => a - b);
    const average =
      scores.length > 0 ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
    const median =
      scores.length === 0
        ? null
        : scores.length % 2 === 0
          ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
          : scores[Math.floor(scores.length / 2)];

    const questionMap = new Map<
      string,
      {
        questionId: string;
        questionText: string;
        topic: string;
        marks: number;
        attempts: number;
        correct: number;
        unanswered: number;
      }
    >();
    for (const row of questionResponses) {
      const key = row.originalQuestionId;
      const existing = questionMap.get(key) ?? {
        questionId: key,
        questionText: row.questionTextSnapshot,
        topic: row.topicSnapshot,
        marks: row.marksSnapshot,
        attempts: 0,
        correct: 0,
        unanswered: 0,
      };
      existing.attempts += 1;
      if (!row.answer?.selectedAttemptOptionId) {
        existing.unanswered += 1;
      } else if (row.answer.selectedAttemptOptionId === row.correctAttemptOptionId) {
        existing.correct += 1;
      }
      questionMap.set(key, existing);
    }

    const topicMap = new Map<string, { topic: string; responses: number; correct: number }>();
    for (const row of questionResponses) {
      const entry = topicMap.get(row.topicSnapshot) ?? {
        topic: row.topicSnapshot,
        responses: 0,
        correct: 0,
      };
      entry.responses += 1;
      if (
        row.answer?.selectedAttemptOptionId &&
        row.answer.selectedAttemptOptionId === row.correctAttemptOptionId
      ) {
        entry.correct += 1;
      }
      topicMap.set(row.topicSnapshot, entry);
    }

    const difficultyMap = new Map<string, number>();
    for (const entry of assessment.questions) {
      difficultyMap.set(
        entry.question.difficulty,
        (difficultyMap.get(entry.question.difficulty) ?? 0) + 1,
      );
    }

    const buckets = Array.from({ length: 10 }, (_, index) => ({
      range: `${index * 10}-${index * 10 + 9}`,
      count: 0,
    }));
    for (const score of scores) {
      const bucketIndex = Math.min(9, Math.floor(score / 10));
      buckets[bucketIndex].count += 1;
    }

    const passedCount = passedGroups.find((row) => row.passed === true)?._count._all ?? 0;
    const uniqueStudents = new Set(finalAttempts.map((attempt) => attempt.studentId)).size;

    return {
      assessment: {
        id: assessment.id,
        title: assessment.title,
        course: assessment.course,
        totalQuestions: assessment.totalQuestions,
        totalMarks: assessment.totalMarks,
        passPercentage: assessment.passPercentage,
        published: assessment.published,
      },
      totals: {
        attempts: totalAttempts,
        uniqueStudents,
        inProgress,
        completed: finalAttempts.length,
        passed: passedCount,
        failed: finalAttempts.length - passedCount,
        completionRate:
          totalAttempts > 0 ? Math.round((finalAttempts.length / totalAttempts) * 100) : null,
      },
      scores: {
        average: average === null ? null : Number(average.toFixed(2)),
        median: median === null ? null : Number(median.toFixed(2)),
        highest: scores.length ? Math.max(...scores) : null,
        lowest: scores.length ? Math.min(...scores) : null,
        passRate:
          finalAttempts.length > 0
            ? Number(((passedCount / finalAttempts.length) * 100).toFixed(2))
            : null,
        distribution: buckets,
      },
      questions: [...questionMap.values()]
        .map((question) => ({
          ...question,
          accuracy:
            question.attempts > 0
              ? Number(((question.correct / question.attempts) * 100).toFixed(2))
              : null,
        }))
        .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0)),
      topics: [...topicMap.values()].map((topic) => ({
        ...topic,
        accuracy:
          topic.responses > 0 ? Number(((topic.correct / topic.responses) * 100).toFixed(2)) : null,
      })),
      difficultyDistribution: [...difficultyMap.entries()].map(([difficulty, count]) => ({
        difficulty,
        count,
      })),
      trend: finalAttempts.slice(-12).map((attempt) => ({
        attemptId: attempt.id,
        percentage: attempt.percentage,
        submittedAt: attempt.submittedAt,
      })),
    };
  }

  async listAttempts(assessmentId: string, query: AttemptListQueryDto, user: AuthUser) {
    await this.assessmentsService.getOwnedAssessment(assessmentId, user);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Record<string, unknown> = { assessmentId };
    if (query.status) where.status = query.status;
    if (query.result === 'passed') where.result = { passed: true };
    if (query.result === 'failed') where.result = { passed: false };
    if (query.search) {
      where.student = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, attempts] = await this.prisma.$transaction([
      this.prisma.assessmentAttempt.count({ where }),
      this.prisma.assessmentAttempt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          student: { select: { id: true, name: true, email: true, avatarUrl: true } },
          result: true,
        },
      }),
    ]);

    return { data: attempts, meta: paginationMeta(page, limit, total) };
  }

  async attemptsCsv(assessmentId: string, user: AuthUser): Promise<string> {
    const assessment = await this.assessmentsService.getOwnedAssessment(assessmentId, user);
    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: { assessmentId },
      orderBy: [{ student: { name: 'asc' } }, { attemptNumber: 'asc' }],
      take: 5000,
      include: {
        student: { select: { name: true, email: true } },
        result: true,
      },
    });

    const header = [
      'Student',
      'Email',
      'Attempt',
      'Status',
      'Score',
      'Total Marks',
      'Percentage',
      'Passed',
      'Started At',
      'Submitted At',
    ];
    const lines = [header.join(',')];
    for (const attempt of attempts) {
      lines.push(
        [
          attempt.student.name,
          attempt.student.email,
          attempt.attemptNumber,
          attempt.status,
          attempt.result?.score ?? attempt.score ?? '',
          attempt.result?.totalMarks ?? '',
          attempt.result?.percentage ?? attempt.percentage ?? '',
          attempt.result?.passed ?? attempt.passed ?? '',
          attempt.startedAt.toISOString(),
          attempt.submittedAt?.toISOString() ?? '',
        ]
          .map((value) => this.csvCell(String(value)))
          .join(','),
      );
    }
    return `Assessment,${this.csvCell(assessment.title)}\n\n${lines.join('\n')}\n`;
  }

  private csvCell(value: string): string {
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
