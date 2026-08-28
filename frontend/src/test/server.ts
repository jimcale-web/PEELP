import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const USERS_URL = 'http://localhost:5000/api/admin/users';
export const USER_URL = (id: string) => `http://localhost:5000/api/admin/users/${id}`;
export const DELETE_USER_URL = USER_URL; // DELETE uses the same URL pattern

export const CATEGORIES_URL = 'http://localhost:5000/api/admin/categories';
export const CATEGORY_URL = (id: string) => `http://localhost:5000/api/admin/categories/${id}`;

export const mockUsers = [
  {
    id: '1',
    name: 'Alice Admin',
    email: 'alice@example.com',
    role: 'ADMIN',
    emailVerified: true,
    createdAt: '2024-01-15T10:00:00.000Z',
    deletedAt: null,
  },
  {
    id: '2',
    name: 'Bob Instructor',
    email: 'bob@example.com',
    role: 'INSTRUCTOR',
    emailVerified: true,
    createdAt: '2024-02-20T10:00:00.000Z',
    deletedAt: null,
  },
  {
    id: '3',
    name: 'Carol Student',
    email: 'carol@example.com',
    role: 'STUDENT',
    emailVerified: false,
    createdAt: '2024-03-10T10:00:00.000Z',
    deletedAt: null,
  },
  {
    id: '4',
    name: 'Dave Deleted',
    email: 'dave@example.com',
    role: 'STUDENT',
    emailVerified: true,
    createdAt: '2024-04-01T10:00:00.000Z',
    deletedAt: '2024-05-01T10:00:00.000Z',
  },
];

export const mockCategories = [
  {
    id: 'cat-1',
    name: 'Programming',
    description: 'All things code',
    createdAt: '2024-01-01T10:00:00.000Z',
    updatedAt: '2024-01-01T10:00:00.000Z',
    _count: { courses: 3 },
  },
  {
    id: 'cat-2',
    name: 'Design',
    description: null,
    createdAt: '2024-02-01T10:00:00.000Z',
    updatedAt: '2024-02-01T10:00:00.000Z',
    _count: { courses: 0 },
  },
  {
    id: 'cat-3',
    name: 'Business',
    description: 'Management and entrepreneurship',
    createdAt: '2024-03-01T10:00:00.000Z',
    updatedAt: '2024-03-01T10:00:00.000Z',
    _count: { courses: 1 },
  },
];

export const handlers = [
  http.get(USERS_URL, () => HttpResponse.json({ users: mockUsers })),
  http.get(CATEGORIES_URL, () => HttpResponse.json({ categories: mockCategories })),
];

export const server = setupServer(...handlers);
