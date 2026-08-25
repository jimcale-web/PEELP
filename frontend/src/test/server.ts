import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const USERS_URL = 'http://localhost:5000/api/admin/users';

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

export const handlers = [
  http.get(USERS_URL, () => HttpResponse.json({ users: mockUsers })),
];

export const server = setupServer(...handlers);
