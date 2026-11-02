import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

const PREFIX = '/api/v1';

type Agent = ReturnType<typeof request.agent>;

class Client {
  csrfToken = '';

  constructor(readonly agent: Agent) {}

  async init(): Promise<void> {
    const response = await this.agent.get(`${PREFIX}/auth/csrf`).expect(200);
    this.csrfToken = response.body.csrfToken;
    expect(this.csrfToken).toHaveLength(64);
  }

  get(path: string): request.Test {
    return this.agent.get(`${PREFIX}${path}`);
  }

  post(path: string, body?: unknown): request.Test {
    return this.agent
      .post(`${PREFIX}${path}`)
      .set('x-csrf-token', this.csrfToken)
      .send(body ?? {});
  }

  patch(path: string, body?: unknown): request.Test {
    return this.agent
      .patch(`${PREFIX}${path}`)
      .set('x-csrf-token', this.csrfToken)
      .send(body ?? {});
  }

  put(path: string, body?: unknown): request.Test {
    return this.agent
      .put(`${PREFIX}${path}`)
      .set('x-csrf-token', this.csrfToken)
      .send(body ?? {});
  }
}

describe('LearnFlow API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let instructor: Client;
  let outsider: Client;
  let student: Client;

  const stamp = Date.now();
  const createdUserIds: string[] = [];
  const createdCourseIds: string[] = [];

  const instructorEmail = `instructor.${stamp}@learnflow.test`;
  const outsiderEmail = `outsider.${stamp}@learnflow.test`;
  const studentEmail = `student.${stamp}@learnflow.test`;
  const password = 'CorrectHorseBattery9!';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);
    server = app.getHttpServer();

    instructor = new Client(request.agent(server));
    outsider = new Client(request.agent(server));
    student = new Client(request.agent(server));
    await Promise.all([instructor.init(), outsider.init(), student.init()]);
  });

  afterAll(async () => {
    if (prisma) {
      try {
        // Remove every artifact created by either the current or a previous run.
        const testUsers = await prisma.user.findMany({
          where: { email: { endsWith: '@learnflow.test' } },
          select: { id: true },
        });
        const userIds = [...new Set([...createdUserIds, ...testUsers.map((user) => user.id)])];
        const courses = await prisma.course.findMany({
          where: { instructorId: { in: userIds } },
          select: { id: true },
        });
        const courseIds = [
          ...new Set([...createdCourseIds, ...courses.map((course) => course.id)]),
        ];
        await prisma.assessment.deleteMany({ where: { courseId: { in: courseIds } } });
        await prisma.question.deleteMany({ where: { courseId: { in: courseIds } } });
        await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      } finally {
        await app?.close();
      }
    } else {
      await app?.close();
    }
  });

  it('reports liveness and readiness', async () => {
    const live = await request(server).get(`${PREFIX}/health/live`).expect(200);
    expect(live.body).toMatchObject({ status: 'ok', service: 'learnflow' });

    const ready = await request(server).get(`${PREFIX}/health/ready`).expect(200);
    expect(ready.body).toMatchObject({ status: 'ok', database: 'connected' });
  });

  it('rejects unsafe cookie requests without a CSRF token', async () => {
    const response = await request(server)
      .post(`${PREFIX}/auth/login`)
      .send({ email: instructorEmail, password });
    expect(response.status).toBe(403);
    expect(response.body.message).toContain('CSRF');
  });

  it('rejects invalid registration payloads', async () => {
    await student.post('/auth/register', { email: 'not-an-email' }).expect(400);
  });

  it('bootstraps an instructor with the configured secret', async () => {
    const secret = process.env.INSTRUCTOR_BOOTSTRAP_SECRET;
    expect(secret).toBeTruthy();

    const response = await instructor
      .post('/auth/bootstrap-instructor', {
        name: 'E2E Instructor',
        email: instructorEmail,
        password,
      })
      .set('x-bootstrap-secret', secret as string)
      .expect(201);

    expect(response.body.user.role).toBe('INSTRUCTOR');
    expect(response.body.created).toBe(true);
    createdUserIds.push(response.body.user.id);
    await instructor.init();

    const me = await instructor.get('/auth/me').expect(200);
    expect(me.body.user.email).toBe(instructorEmail);
  });

  it('rejects bootstrap with a wrong secret', async () => {
    await outsider
      .post('/auth/bootstrap-instructor', {
        name: 'Outsider',
        email: outsiderEmail,
        password,
      })
      .set('x-bootstrap-secret', 'not-the-secret')
      .expect(403);
  });

  it('registers a student and never exposes password hashes', async () => {
    const response = await student
      .post('/auth/register', {
        name: 'E2E Student',
        email: studentEmail,
        password,
      })
      .expect(201);

    expect(response.body.user.role).toBe('STUDENT');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    createdUserIds.push(response.body.user.id);
    await student.init();
  });

  it('rejects duplicate registration', async () => {
    await student
      .post('/auth/register', {
        name: 'E2E Student',
        email: studentEmail,
        password,
      })
      .expect(409);
  });

  it('lets a student browse only published courses', async () => {
    const list = await request(server).get(`${PREFIX}/courses`).expect(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    list.body.data.forEach((course: { status: string }) => {
      expect(course.status).toBe('PUBLISHED');
    });
  });

  it('creates a course, module, lesson and questions as an instructor', async () => {
    const course = await instructor
      .post('/courses', {
        title: `E2E Full-Stack Course ${stamp}`,
        description:
          'A realistic end-to-end course created by the automated verification suite.',
        category: 'Engineering',
        level: 'Intermediate',
      })
      .expect(201);
    expect(course.body.status).toBe('DRAFT');
    createdCourseIds.push(course.body.id);

    const module = await instructor
      .post(`/courses/${course.body.id}/modules`, {
        title: 'Foundations',
        description: 'Core concepts',
      })
      .expect(201);

    const lesson = await instructor
      .post(`/modules/${module.body.id}/lessons`, {
        title: 'Server-authoritative exams',
        content: 'Timers and grading are enforced on the server, never in the browser.',
        estimatedMinutes: 12,
        published: true,
      })
      .expect(201);
    expect(lesson.body.id).toBeTruthy();

    const questions: string[] = [];
    for (let index = 1; index <= 3; index += 1) {
      const question = await instructor
        .post('/questions', {
          courseId: course.body.id,
          questionText: `Which statement about server-side grading is correct (${index})?`,
          explanation: 'Answer keys stay on the server.',
          difficulty: 'MEDIUM',
          topic: 'Security',
          marks: 2,
          options: [
            {
              optionText: `Correct option ${index}`,
              isCorrect: true,
            },
            { optionText: `Incorrect option A ${index}`, isCorrect: false },
            { optionText: `Incorrect option B ${index}`, isCorrect: false },
          ],
        })
        .expect(201);
      questions.push(question.body.id);
      expect(
        question.body.options.filter((option: { isCorrect: boolean }) => option.isCorrect),
      ).toHaveLength(1);
    }

    await instructor.post(`/courses/${course.body.id}/publish`).expect(200);

    const enrolled = await student.post(`/courses/${course.body.id}/enroll`).expect(201);
    expect(enrolled.body.enrollment.status).toBe('ACTIVE');

    const detail = await student.get(`/courses/${course.body.id}`).expect(200);
    expect(detail.body.modules[0].lessons[0].content).toContain('server');

    const assessment = await instructor
      .post('/assessments', {
        courseId: course.body.id,
        title: 'Server Authoritative Exam',
        description: 'Two questions chosen from a three question pool.',
        instructions: 'Choose the best answer. The timer is enforced by the API.',
        durationMinutes: 10,
        totalQuestions: 2,
        passPercentage: 40,
        maxAttempts: 2,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResultsImmediately: true,
        allowAnswerReview: true,
        questionIds: questions,
      })
      .expect(201);

    expect(assessment.body.totalMarks).toBe(4);
    await instructor.post(`/assessments/${assessment.body.id}/publish`).expect(200);

    const available = await student.get('/assessments/available').expect(200);
    const entry = available.body.data.find(
      (row: { id: string }) => row.id === assessment.body.id,
    );
    expect(entry).toBeTruthy();
    expect(entry.canStart).toBe(true);
    expect(entry.attemptsUsed).toBe(0);
  });

  it('enforces role-based access and ownership', async () => {
    await student.get('/questions').expect(403);
    await student.get('/assessments').expect(403);

    const courses = await instructor.get('/courses?mine=true').expect(200);
    const courseId = courses.body.data[0].id;

    const secret = process.env.INSTRUCTOR_BOOTSTRAP_SECRET as string;
    const second = await outsider
      .post('/auth/bootstrap-instructor', {
        name: 'Outsider Instructor',
        email: outsiderEmail,
        password,
      })
      .set('x-bootstrap-secret', secret)
      .expect(201);
    createdUserIds.push(second.body.user.id);
    await outsider.init();

    await outsider
      .patch(`/courses/${courseId}`, { title: 'Hijacked course' })
      .expect(403);
  });

  it('runs a timed attempt with autosave, server grading and answer review', async () => {
    const available = await student.get('/assessments/available').expect(200);
    const assessment = available.body.data[0];

    const started = await student
      .post(`/assessments/${assessment.id}/attempts`)
      .expect(201);

    const attemptId = started.body.id;
    expect(started.body.status).toBe('IN_PROGRESS');
    expect(started.body.questions).toHaveLength(2);
    expect(started.body.remainingSeconds).toBeGreaterThan(0);
    expect(started.body.remainingSeconds).toBeLessThanOrEqual(600);
    expect(started.body.serverTime).toBeTruthy();

    // The answer key must never reach a student before submission.
    for (const question of started.body.questions) {
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      question.options.forEach((option: Record<string, unknown>) => {
        expect(option.isCorrect).toBeUndefined();
      });
    }

    const stored = await prisma.attemptQuestion.findMany({
      where: { attemptId },
      include: { options: { orderBy: { position: 'asc' } } },
      orderBy: { position: 'asc' },
    });
    expect(stored).toHaveLength(2);

    const [first, second] = stored;
    const wrongOption = second.options.find(
      (option: { id: string }) => option.id !== second.correctAttemptOptionId,
    );
    expect(first.correctAttemptOptionId).toBeTruthy();
    expect(wrongOption).toBeTruthy();

    const saved = await student
      .put(`/attempts/${attemptId}/answers/${first.id}`, {
        selectedAttemptOptionId: first.correctAttemptOptionId,
      })
      .expect(200);
    expect(saved.body.saved).toBe(true);

    await student
      .put(`/attempts/${attemptId}/answers/${second.id}`, {
        selectedAttemptOptionId: wrongOption!.id,
      })
      .expect(200);

    // Autosaved answers are visible when the attempt is resumed.
    const resumed = await student.get(`/attempts/${attemptId}`).expect(200);
    expect(resumed.body.questions[0].selectedOptionId).toBe(
      first.correctAttemptOptionId,
    );

    // An option from another question is rejected.
    await student
      .put(`/attempts/${attemptId}/answers/${first.id}`, {
        selectedAttemptOptionId: second.options[0].id,
      })
      .expect(400);

    const submitted = await student
      .post(`/attempts/${attemptId}/submit`)
      .expect(200);
    expect(submitted.body.status).toBe('GRADED');
    expect(submitted.body.score).toBe(2);
    expect(submitted.body.percentage).toBe(50);
    expect(submitted.body.passed).toBe(true);
    expect(submitted.body.resultsReleased).toBe(true);

    const result = await student.get(`/attempts/${attemptId}/result`).expect(200);
    expect(result.body.released).toBe(true);
    expect(result.body.reviewAllowed).toBe(true);
    expect(result.body.result.correctCount).toBe(1);
    expect(result.body.review).toHaveLength(2);
    const reviewOptions = result.body.review.flatMap(
      (question: { options: Array<{ isCorrect: boolean }> }) => question.options,
    );
    expect(reviewOptions.some((option: { isCorrect: boolean }) => option.isCorrect)).toBe(
      true,
    );

    // Submitting twice is idempotent and does not create a second result.
    const again = await student
      .post(`/attempts/${attemptId}/submit`)
      .expect(200);
    expect(again.body.idempotent).toBe(true);
    expect(await prisma.assessmentResult.count({ where: { attemptId } })).toBe(1);
  });

  it('hides results until the instructor releases them', async () => {
    const courses = await instructor.get('/courses?mine=true').expect(200);
    const courseId = courses.body.data[0].id;

    const questions = await instructor
      .get(`/questions?courseId=${courseId}`)
      .expect(200);
    const questionId = questions.body.data[0].id;

    const assessment = await instructor
      .post('/assessments', {
        courseId,
        title: 'Held Results Exam',
        durationMinutes: 5,
        totalQuestions: 1,
        passPercentage: 50,
        maxAttempts: 1,
        showResultsImmediately: false,
        allowAnswerReview: true,
        questionIds: [questionId],
      })
      .expect(201);
    await instructor.post(`/assessments/${assessment.body.id}/publish`).expect(200);

    const started = await student
      .post(`/assessments/${assessment.body.id}/attempts`)
      .expect(201);
    const attemptId = started.body.id;

    const stored = await prisma.attemptQuestion.findFirstOrThrow({
      where: { attemptId },
    });
    await student
      .put(`/attempts/${attemptId}/answers/${stored.id}`, {
        selectedAttemptOptionId: stored.correctAttemptOptionId,
      })
      .expect(200);

    const submitted = await student
      .post(`/attempts/${attemptId}/submit`)
      .expect(200);
    expect(submitted.body.resultsReleased).toBe(false);
    expect(submitted.body.score).toBeNull();

    const hidden = await student.get(`/attempts/${attemptId}/result`).expect(200);
    expect(hidden.body.released).toBe(false);
    expect(hidden.body.result).toBeUndefined();

    const history = await student.get('/attempts/me/history').expect(200);
    const hiddenHistory = history.body.data.find(
      (row: { id: string }) => row.id === attemptId,
    );
    expect(hiddenHistory.resultsReleased).toBe(false);
    expect(hiddenHistory.score).toBeNull();

    await instructor
      .post(`/assessments/${assessment.body.id}/release-results`)
      .expect(200);

    const released = await student.get(`/attempts/${attemptId}/result`).expect(200);
    expect(released.body.released).toBe(true);
    expect(released.body.result.score).toBe(2);

    const releasedHistory = await student.get('/attempts/me/history').expect(200);
    const row = releasedHistory.body.data.find(
      (entry: { id: string }) => entry.id === attemptId,
    );
    expect(row.resultsReleased).toBe(true);
    expect(row.score).toBe(2);
  });

  it('finalizes an expired attempt lazily and grades it as timed out', async () => {
    const courses = await instructor.get('/courses?mine=true').expect(200);
    const courseId = courses.body.data[0].id;
    const questions = await instructor
      .get(`/questions?courseId=${courseId}`)
      .expect(200);
    const questionId = questions.body.data[1].id;

    const assessment = await instructor
      .post('/assessments', {
        courseId,
        title: 'Expiry Enforcement Exam',
        durationMinutes: 1,
        totalQuestions: 1,
        passPercentage: 50,
        maxAttempts: 1,
        showResultsImmediately: true,
        allowAnswerReview: true,
        questionIds: [questionId],
      })
      .expect(201);
    await instructor.post(`/assessments/${assessment.body.id}/publish`).expect(200);

    const started = await student
      .post(`/assessments/${assessment.body.id}/attempts`)
      .expect(201);

    await prisma.assessmentAttempt.update({
      where: { id: started.body.id },
      data: { expiresAt: new Date(Date.now() - 5_000) },
    });

    const expired = await student.get(`/attempts/${started.body.id}`).expect(200);
    expect(expired.body.status).toBe('TIMED_OUT');
    expect(expired.body.remainingSeconds).toBe(0);
    expect(expired.body.score).toBe(0);
    expect(expired.body.passed).toBe(false);

    const result = await student
      .get(`/attempts/${started.body.id}/result`)
      .expect(200);
    expect(result.body.status).toBe('TIMED_OUT');

    // Saving an answer after the deadline is rejected.
    await student
      .put(`/attempts/${started.body.id}/answers/${expired.body.questions[0].id}`, {
        selectedAttemptOptionId: expired.body.questions[0].options[0].id,
      })
      .expect(409);
  });

  it('logs out and rejects the revoked session', async () => {
    await student.post('/auth/logout').expect(200);
    await student.get('/auth/me').expect(401);
  });
});
