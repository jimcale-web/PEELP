export type UserRole = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';

export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DEACTIVATED';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  approvedAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  instructorId: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
}

export interface Module {
  id: string;
  title: string;
  courseId: string;
  order: number;
}

export interface Lesson {
  id: string;
  title: string;
  moduleId: string;
  type: 'video' | 'pdf';
  contentUrl?: string;
  order: number;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELED';
  course: Course;
  createdAt: string;
}

export interface Subscription {
  id: string;
  studentId: string;
  type: 'MONTHLY' | 'YEARLY' | 'CATEGORY';
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELED' | 'REVOKED';
  startDate: string;
  endDate: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: QuestionOption[];
  order: number;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  attemptNumber: number;
  score: number;
  isPassed: boolean;
  createdAt: string;
}

export interface Certificate {
  id: string;
  studentId: string;
  courseId: string;
  certificateUrl: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}
