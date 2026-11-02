import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { AuthUser } from '../common/types/auth-user';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async student(user: AuthUser) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: user.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            category: true,
            level: true,
            thumbnailUrl: true,
            status: true,
            instructor: { select: { name: true } },
            modules: {
              select: {
                lessons: { where: { published: true }, select: { id: true } },
              },
            },
          },
        },
        lessonProgress: { select: { lessonId: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const courses = enrollments.map((enrollment) => {
      const totalLessons = enrollment.course.modules.reduce(
        (sum, module) => sum + module.lessons.length,
        0,
      );
      const lessonIds = new Set(
        enrollment.course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)),
      );
      const completedLessons = enrollment.lessonProgress.filter((row) =>
        lessonIds.has(row.lessonId),
      ).length;
      return {
        enrollmentId: enrollment.id,
        courseId: enrollment.course.id,
        title: enrollment.course.title,
        category: enrollment.course.category,
        level: enrollment.course.level,
        thumbnailUrl: enrollment.course.thumbnailUrl,
        instructor: enrollment.course.instructor.name,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
        totalLessons,
        completedLessons,
        progressPercentage:
          totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      };
    });

    const [resultStats, passedGroups, results, topicRows, recentActivity] = await Promise.all([
      this.prisma.assessmentResult.aggregate({
        where: { studentId: user.id },
        _count: { _all: true },
        _avg: { percentage: true },
        _max: { percentage: true },
      }),
      this.prisma.assessmentResult.groupBy({
        by: ['passed'],
        where: { studentId: user.id },
        _count: { _all: true },
      }),
      this.prisma.assessmentResult.findMany({
        where: { studentId: user.id },
        orderBy: { submittedAt: 'desc' },
        take: 10,
        include: {
          assessment: { select: { id: true, title: true } },
        },
      }),
      this.prisma.$queryRaw<
        Array<{ topic: string; responses: number; correct: number }>
      >`
        SELECT aq."topicSnapshot" AS topic,
               COUNT(*)::int AS responses,
               SUM(CASE WHEN aa."selectedAttemptOptionId" IS NOT NULL
                          AND aa."selectedAttemptOptionId" = aq."correctAttemptOptionId"
                        THEN 1 ELSE 0 END)::int AS correct
        FROM "AttemptQuestion" aq
        JOIN "AssessmentAttempt" a ON a.id = aq."attemptId"
        LEFT JOIN "AttemptAnswer" aa ON aa."attemptQuestionId" = aq.id
        WHERE a."studentId" = ${user.id} AND a.status IN ('GRADED', 'TIMED_OUT')
        GROUP BY aq."topicSnapshot"
        ORDER BY responses DESC
        LIMIT 10
      `,
      this.prisma.activityEvent.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const courseIds = enrollments.map((enrollment) => enrollment.courseId);
    const publishedAssessments = courseIds.length
      ? await this.prisma.assessment.findMany({
          where: { courseId: { in: courseIds }, published: true },
          select: {
            id: true,
            title: true,
            availableFrom: true,
            availableUntil: true,
            maxAttempts: true,
            durationMinutes: true,
            course: { select: { id: true, title: true } },
            _count: { select: { attempts: { where: { studentId: user.id } } } },
          },
          orderBy: { availableUntil: 'asc' },
        })
      : [];

    const now = new Date();
    const availableAssessments = publishedAssessments.filter((assessment) => {
      const open =
        (!assessment.availableFrom || assessment.availableFrom <= now) &&
        (!assessment.availableUntil || assessment.availableUntil >= now);
      return open && assessment._count.attempts < assessment.maxAttempts;
    });
    const upcomingDeadlines = publishedAssessments
      .filter(
        (assessment) =>
          assessment.availableUntil && assessment.availableUntil >= now &&
          assessment._count.attempts < assessment.maxAttempts,
      )
      .slice(0, 5)
      .map((assessment) => ({
        id: assessment.id,
        title: assessment.title,
        course: assessment.course,
        availableUntil: assessment.availableUntil,
      }));

    const completedAssessments = resultStats._count._all;
    const passedCount = passedGroups.find((row) => row.passed)?._count._all ?? 0;
    const totalLessons = courses.reduce((sum, course) => sum + course.totalLessons, 0);
    const completedLessons = courses.reduce((sum, course) => sum + course.completedLessons, 0);

    return {
      overview: {
        enrolledCourses: enrollments.length,
        completedCourses: courses.filter((course) => course.status === 'COMPLETED').length,
        totalLessons,
        completedLessons,
        overallLessonProgress:
          totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : null,
        availableAssessments: availableAssessments.length,
        completedAssessments,
        averageScore:
          completedAssessments > 0 && resultStats._avg.percentage !== null
            ? Number(resultStats._avg.percentage.toFixed(2))
            : null,
        bestScore: resultStats._max.percentage ?? null,
        passRate:
          completedAssessments > 0
            ? Number(((passedCount / completedAssessments) * 100).toFixed(2))
            : null,
      },
      courses,
      trend: results.map((result) => ({
        attemptId: result.attemptId,
        assessmentId: result.assessment.id,
        assessmentTitle: result.assessment.title,
        percentage: result.percentage,
        passed: result.passed,
        submittedAt: result.submittedAt,
      })),
      topics: topicRows.map((row) => ({
        topic: row.topic,
        responses: row.responses,
        correct: row.correct,
        accuracy:
          row.responses > 0 ? Number(((row.correct / row.responses) * 100).toFixed(2)) : 0,
      })),
      upcomingDeadlines,
      recentActivity,
    };
  }

  async instructor(user: AuthUser) {
    const courses = await this.prisma.course.findMany({
      where: user.role === 'ADMIN' ? {} : { instructorId: user.id },
      select: {
        id: true,
        title: true,
        status: true,
        category: true,
        thumbnailUrl: true,
        createdAt: true,
        _count: { select: { enrollments: true, assessments: true, modules: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const courseIds = courses.map((course) => course.id);
    const assessmentFilter =
      user.role === 'ADMIN' ? {} : { assessment: { instructorId: user.id } };

    const [
      totalEnrollments,
      completedEnrollments,
      distinctLearners,
      totalAssessments,
      totalAttempts,
      resultStats,
      passedGroups,
      recentActivity,
      enrollmentTrend,
      assessmentScores,
    ] = await Promise.all([
      this.prisma.enrollment.count({
        where: { courseId: { in: courseIds }, status: { in: ['ACTIVE', 'COMPLETED'] } },
      }),
      this.prisma.enrollment.count({
        where: { courseId: { in: courseIds }, status: 'COMPLETED' },
      }),
      this.prisma.enrollment.findMany({
        where: { courseId: { in: courseIds }, status: { in: ['ACTIVE', 'COMPLETED'] } },
        distinct: ['studentId'],
        select: { studentId: true },
      }),
      this.prisma.assessment.count({
        where: user.role === 'ADMIN' ? {} : { instructorId: user.id },
      }),
      this.prisma.assessmentAttempt.count({
        where: { assessment: user.role === 'ADMIN' ? {} : { instructorId: user.id } },
      }),
      this.prisma.assessmentResult.aggregate({
        where: assessmentFilter,
        _avg: { percentage: true },
        _count: { _all: true },
      }),
      this.prisma.assessmentResult.groupBy({
        by: ['passed'],
        where: assessmentFilter,
        _count: { _all: true },
      }),
      this.prisma.activityEvent.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          OR: [
            { courseId: { in: courseIds } },
            ...(user.role === 'ADMIN' ? [] : [{ userId: user.id }]),
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          user: { select: { name: true } },
          course: { select: { title: true } },
        },
      }),
      this.prisma.$queryRaw<Array<{ week: string; count: number }>>`
        SELECT to_char(date_trunc('week', "enrolledAt"), 'YYYY-MM-DD') AS week,
               COUNT(*)::int AS count
        FROM "Enrollment"
        WHERE "courseId" = ANY(${courseIds})
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 8
      `,
      this.prisma.$queryRaw<Array<{ courseId: string; average: number | null; attempts: number }>>`
        SELECT a."courseId", AVG(r."percentage")::float AS average, COUNT(r.id)::int AS attempts
        FROM "AssessmentResult" r
        JOIN "Assessment" a ON a.id = r."assessmentId"
        WHERE a."courseId" = ANY(${courseIds})
        GROUP BY a."courseId"
      `,
    ]);

    const summaryByCourse = new Map(
      assessmentScores.map((row) => [row.courseId, row]),
    );
    const completedByCourse = await this.prisma.enrollment.groupBy({
      by: ['courseId', 'status'],
      where: { courseId: { in: courseIds } },
      _count: { _all: true },
    });

    const completedCount = passedGroups.find((row) => row.passed)?._count._all ?? 0;
    const completedAssessments = resultStats._count._all;

    return {
      overview: {
        totalCourses: courses.length,
        publishedCourses: courses.filter((course) => course.status === 'PUBLISHED').length,
        draftCourses: courses.filter((course) => course.status === 'DRAFT').length,
        totalEnrollments,
        activeLearners: distinctLearners.length,
        completedEnrollments,
        completionRate:
          totalEnrollments > 0
            ? Number(((completedEnrollments / totalEnrollments) * 100).toFixed(2))
            : null,
        totalAssessments,
        totalAttempts,
        averageScore:
          completedAssessments > 0 && resultStats._avg.percentage !== null
            ? Number(resultStats._avg.percentage.toFixed(2))
            : null,
        passRate:
          completedAssessments > 0
            ? Number(((completedCount / completedAssessments) * 100).toFixed(2))
            : null,
      },
      courses: courses.map((course) => {
        const performance = summaryByCourse.get(course.id);
        const enrollmentRows = completedByCourse.filter((row) => row.courseId === course.id);
        const completed =
          enrollmentRows.find((row) => row.status === 'COMPLETED')?._count._all ?? 0;
        const active =
          enrollmentRows.find((row) => row.status === 'ACTIVE')?._count._all ?? 0;
        return {
          id: course.id,
          title: course.title,
          status: course.status,
          category: course.category,
          thumbnailUrl: course.thumbnailUrl,
          enrollments: active + completed,
          completedEnrollments: completed,
          assessments: course._count.assessments,
          averageScore: performance?.average
            ? Number(performance.average.toFixed(2))
            : null,
          attempts: performance?.attempts ?? 0,
        };
      }),
      enrollmentTrend: enrollmentTrend.reverse(),
      recentActivity,
      hasData: totalEnrollments > 0 || totalAttempts > 0,
    };
  }

  async course(courseId: string, user: AuthUser) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: { select: { id: true, name: true } },
        _count: { select: { enrollments: true, modules: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (user.role !== 'ADMIN' && course.instructorId !== user.id) {
      throw new ForbiddenException('You do not own this course');
    }

    const since = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000);
    const [
      activeEnrollments,
      completedEnrollments,
      totalPublishedLessons,
      lessonCompletions,
      assessments,
      resultStats,
      passedGroups,
      enrollmentTrend,
      progressRows,
    ] = await Promise.all([
      this.prisma.enrollment.count({ where: { courseId, status: 'ACTIVE' } }),
      this.prisma.enrollment.count({ where: { courseId, status: 'COMPLETED' } }),
      this.prisma.lesson.count({ where: { module: { courseId }, published: true } }),
      this.prisma.lessonProgress.count({
        where: { enrollment: { courseId }, lesson: { published: true } },
      }),
      this.prisma.assessment.findMany({
        where: { courseId },
        select: {
          id: true,
          title: true,
          published: true,
          _count: { select: { attempts: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.assessmentResult.aggregate({
        where: { assessment: { courseId } },
        _avg: { percentage: true },
        _count: { _all: true },
      }),
      this.prisma.assessmentResult.groupBy({
        by: ['passed'],
        where: { assessment: { courseId } },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<Array<{ week: string; count: number }>>`
        SELECT to_char(date_trunc('week', "enrolledAt"), 'YYYY-MM-DD') AS week,
               COUNT(*)::int AS count
        FROM "Enrollment"
        WHERE "courseId" = ${courseId} AND "enrolledAt" >= ${since}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      this.prisma.enrollment.findMany({
        where: { courseId, status: { in: ['ACTIVE', 'COMPLETED'] } },
        select: {
          id: true,
          lessonProgress: { select: { lessonId: true } },
        },
      }),
    ]);

    const totalEnrollments = activeEnrollments + completedEnrollments;
    const passedCount = passedGroups.find((row) => row.passed)?._count._all ?? 0;
    const completedAssessments = resultStats._count._all;
    const averageProgress =
      totalPublishedLessons > 0 && progressRows.length > 0
        ? Math.round(
            (progressRows.reduce(
              (sum, row) => sum + Math.min(row.lessonProgress.length, totalPublishedLessons),
              0,
            ) /
              (progressRows.length * totalPublishedLessons)) *
              100,
          )
        : null;

    return {
      course: {
        id: course.id,
        title: course.title,
        status: course.status,
        category: course.category,
        instructor: course.instructor,
        createdAt: course.createdAt,
      },
      overview: {
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        completionRate:
          totalEnrollments > 0
            ? Number(((completedEnrollments / totalEnrollments) * 100).toFixed(2))
            : null,
        totalPublishedLessons,
        lessonCompletions,
        averageLessonProgress: averageProgress,
        totalAssessments: assessments.length,
        totalAttempts: assessments.reduce(
          (sum, assessment) => sum + assessment._count.attempts,
          0,
        ),
        averageScore:
          completedAssessments > 0 && resultStats._avg.percentage !== null
            ? Number(resultStats._avg.percentage.toFixed(2))
            : null,
        passRate:
          completedAssessments > 0
            ? Number(((passedCount / completedAssessments) * 100).toFixed(2))
            : null,
      },
      assessments: assessments.map((assessment) => ({
        id: assessment.id,
        title: assessment.title,
        published: assessment.published,
        attempts: assessment._count.attempts,
      })),
      enrollmentTrend,
    };
  }
}
