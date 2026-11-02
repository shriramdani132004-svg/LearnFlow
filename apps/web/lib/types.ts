export type Role = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'TIMED_OUT' | 'GRADED';
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface InstructorSummary {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  level: string;
  thumbnailUrl?: string | null;
  status: CourseStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  instructor: InstructorSummary;
  enrollmentCount?: number;
  moduleCount?: number;
  assessmentCount?: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  content?: string;
  resourceUrl?: string | null;
  position: number;
  estimatedMinutes: number;
  published: boolean;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  position: number;
  lessons: Lesson[];
}

export interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt?: string | null;
}

export interface CourseDetail extends CourseSummary {
  modules: CourseModule[];
  viewerEnrollment?: Enrollment | null;
  completedLessonIds: string[];
  enrollmentCount: number;
  assessmentCount: number;
}

export interface MyEnrollment {
  id: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt?: string | null;
  course: CourseSummary & { modules: CourseModule[] };
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
  completedLessonIds: string[];
}

export interface QuestionOption {
  id: string;
  optionText: string;
  isCorrect?: boolean;
  position: number;
}

export interface Question {
  id: string;
  instructorId: string;
  courseId: string;
  questionText: string;
  explanation?: string | null;
  difficulty: Difficulty;
  topic: string;
  marks: number;
  createdAt: string;
  updatedAt: string;
  options: QuestionOption[];
  course?: { id: string; title: string; status?: CourseStatus };
}

export interface AssessmentSummary {
  id: string;
  courseId: string;
  instructorId: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  passPercentage: number;
  maxAttempts: number;
  availableFrom?: string | null;
  availableUntil?: string | null;
  published: boolean;
  publishedAt?: string | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  allowAnswerReview: boolean;
  resultsReleasedAt?: string | null;
  course: { id: string; title: string; status?: CourseStatus; category?: string };
  instructor?: InstructorSummary;
  attemptCount?: number;
  poolSize?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentAttemptSummary {
  id: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: string;
  expiresAt: string;
  submittedAt?: string | null;
  percentage?: number | null;
  passed?: boolean | null;
  score?: number | null;
  resultsReleased?: boolean;
}

export interface AvailableAssessment {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  passPercentage: number;
  maxAttempts: number;
  availableFrom?: string | null;
  availableUntil?: string | null;
  showResultsImmediately: boolean;
  allowAnswerReview: boolean;
  resultsReleasedAt?: string | null;
  course: { id: string; title: string };
  instructor: InstructorSummary;
  attemptsUsed: number;
  attemptsRemaining: number;
  inProgressAttemptId?: string | null;
  lastAttempt: AssessmentAttemptSummary | null;
  canStart: boolean;
  windowState: 'OPEN' | 'UPCOMING' | 'CLOSED';
}

export interface AssessmentResultSummary {
  id: string;
  attemptId: string;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
}

export interface AttemptQuestionOption {
  id: string;
  text: string;
  position: number;
  isCorrect?: boolean;
  isSelected?: boolean;
}

export interface AttemptQuestion {
  id: string;
  position: number;
  questionText: string;
  topic: string;
  marks: number;
  selectedOptionId: string | null;
  answeredAt?: string | null;
  options: AttemptQuestionOption[];
  explanation?: string | null;
  isCorrect?: boolean;
}

export interface Attempt {
  id: string;
  assessmentId: string;
  status: AttemptStatus;
  attemptNumber: number;
  startedAt: string;
  expiresAt: string;
  submittedAt?: string | null;
  finalizedAt?: string | null;
  remainingSeconds: number;
  serverTime: string;
  assessment: {
    id: string;
    title: string;
    description?: string | null;
    instructions?: string | null;
    durationMinutes: number;
    totalQuestions: number;
    totalMarks: number;
    passPercentage: number;
    course: { id: string; title: string };
  };
  questions: AttemptQuestion[];
  score?: number | null;
  percentage?: number | null;
  passed?: boolean | null;
  result?: AssessmentResultSummary | null;
  resultsReleased?: boolean;
  idempotent?: boolean;
}

export interface AttemptResult {
  attemptId: string;
  released: boolean;
  reviewAllowed?: boolean;
  status: AttemptStatus;
  startedAt?: string;
  submittedAt?: string | null;
  finalizedAt?: string | null;
  expiresAt?: string;
  message?: string;
  assessment?: {
    id: string;
    title: string;
    course: { id: string; title: string };
    passPercentage: number;
    totalQuestions: number;
    totalMarks: number;
  };
  result?: {
    score: number;
    totalMarks: number;
    percentage: number;
    passed: boolean;
    correctCount: number;
    totalQuestions: number;
    submittedAt: string;
  } | null;
  review?: Array<{
    id: string;
    position: number;
    questionText: string;
    explanation?: string | null;
    topic: string;
    marks: number;
    selectedOptionId: string | null;
    options: AttemptQuestionOption[];
  }>;
}

export interface HistoryItem {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  course: { id: string; title: string };
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: string;
  submittedAt?: string | null;
  expiresAt: string;
  resultsReleased: boolean;
  score?: number | null;
  totalMarks?: number | null;
  percentage?: number | null;
  passed?: boolean | null;
  correctCount?: number | null;
  totalQuestions?: number | null;
}

export interface StudentAnalytics {
  overview: {
    enrolledCourses: number;
    completedCourses: number;
    totalLessons: number;
    completedLessons: number;
    overallLessonProgress: number | null;
    availableAssessments: number;
    completedAssessments: number;
    averageScore: number | null;
    bestScore: number | null;
    passRate: number | null;
  };
  courses: Array<{
    enrollmentId: string;
    courseId: string;
    title: string;
    category: string;
    level: string;
    thumbnailUrl?: string | null;
    instructor: string;
    status: EnrollmentStatus;
    enrolledAt: string;
    completedAt?: string | null;
    totalLessons: number;
    completedLessons: number;
    progressPercentage: number;
  }>;
  trend: Array<{
    attemptId: string;
    assessmentId: string;
    assessmentTitle: string;
    percentage: number;
    passed: boolean;
    submittedAt: string;
  }>;
  topics: Array<{ topic: string; responses: number; correct: number; accuracy: number }>;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    course: { id: string; title: string };
    availableUntil: string;
  }>;
  recentActivity: ActivityEvent[];
}

export interface ActivityEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  metadata?: unknown;
  user?: { name: string; email?: string } | null;
  course?: { title: string } | null;
}

export interface InstructorAnalytics {
  overview: {
    totalCourses: number;
    publishedCourses: number;
    draftCourses: number;
    totalEnrollments: number;
    activeLearners: number;
    completedEnrollments: number;
    completionRate: number | null;
    totalAssessments: number;
    totalAttempts: number;
    averageScore: number | null;
    passRate: number | null;
  };
  courses: Array<{
    id: string;
    title: string;
    status: CourseStatus;
    category: string;
    thumbnailUrl?: string | null;
    enrollments: number;
    completedEnrollments: number;
    assessments: number;
    averageScore: number | null;
    attempts: number;
  }>;
  enrollmentTrend: Array<{ week: string; count: number }>;
  recentActivity: ActivityEvent[];
  hasData: boolean;
}

export interface CourseAnalytics {
  course: {
    id: string;
    title: string;
    status: CourseStatus;
    category: string;
    instructor: { id: string; name: string };
    createdAt: string;
  };
  overview: {
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    completionRate: number | null;
    totalPublishedLessons: number;
    lessonCompletions: number;
    averageLessonProgress: number | null;
    totalAssessments: number;
    totalAttempts: number;
    averageScore: number | null;
    passRate: number | null;
  };
  assessments: Array<{ id: string; title: string; published: boolean; attempts: number }>;
  enrollmentTrend: Array<{ week: string; count: number }>;
}

export interface AssessmentReport {
  assessment: {
    id: string;
    title: string;
    course: { id: string; title: string };
    totalQuestions: number;
    totalMarks: number;
    passPercentage: number;
    published: boolean;
  };
  totals: {
    attempts: number;
    uniqueStudents: number;
    inProgress: number;
    completed: number;
    passed: number;
    failed: number;
    completionRate: number | null;
  };
  scores: {
    average: number | null;
    median: number | null;
    highest: number | null;
    lowest: number | null;
    passRate: number | null;
    distribution: Array<{ range: string; count: number }>;
  };
  questions: Array<{
    questionId: string;
    questionText: string;
    topic: string;
    marks: number;
    attempts: number;
    correct: number;
    unanswered: number;
    accuracy: number | null;
  }>;
  topics: Array<{ topic: string; responses: number; correct: number; accuracy: number | null }>;
  difficultyDistribution: Array<{ difficulty: Difficulty; count: number }>;
  trend: Array<{ attemptId: string; percentage: number; submittedAt: string }>;
}

export interface RosterEntry {
  id: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt?: string | null;
  student: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    createdAt: string;
    lastLoginAt?: string | null;
  };
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
}

export interface Roster {
  data: RosterEntry[];
  meta: PaginationMeta;
  summary: {
    totalLessons: number;
    active: number;
    completed: number;
    cancelled: number;
  };
}

export interface AssessmentAttemptRow {
  id: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: string;
  submittedAt?: string | null;
  percentage?: number | null;
  passed?: boolean | null;
  score?: number | null;
  student: { id: string; name: string; email: string; avatarUrl?: string | null };
  result?: AssessmentResultSummary | null;
}

export interface AdminStats {
  users: { total: number; students: number; instructors: number; admins: number };
  courses: { total: number; published: number; draft: number; archived: number };
  enrollments: number;
  assessments: number;
  attempts: number;
  results: number;
  recentActivity: ActivityEvent[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
  _count: { enrollments: number; coursesTaught: number; attempts: number };
}
