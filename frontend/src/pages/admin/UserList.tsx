import { useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import '../../styles/UserList.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
  emailVerified: boolean;
  createdAt: string;
  deletedAt: string | null;
}

async function fetchUsers(): Promise<UserRow[]> {
  const res = await axios.get<{ users: UserRow[] }>(`${API_URL}/admin/users`, {
    withCredentials: true,
  });
  return res.data.users;
}

export default function UserList() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'>('');

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: fetchUsers,
  });

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === '' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleLabel: Record<string, string> = {
    ADMIN: 'Admin',
    INSTRUCTOR: 'Instructor',
    STUDENT: 'Student',
  };

  return (
    <div className="user-list-container">
      <div className="user-list-card">
        <div className="user-list-header">
          <h1>User Management</h1>
          <p>{users.length} total users</p>
        </div>

        <div className="user-list-filters">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="role-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="INSTRUCTOR">Instructor</option>
            <option value="STUDENT">Student</option>
          </select>
        </div>

        {isLoading && <p className="state-message">Loading users…</p>}
        {isError && <p className="state-message error">Failed to load users.</p>}

        {!isLoading && !isError && (
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="no-results">No users match your filters.</td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.id} className={u.deletedAt ? 'row-deleted' : ''}>
                      <td>{u.name}</td>
                      <td className="email-cell">{u.email}</td>
                      <td>
                        <span className={`role-pill role-${u.role.toLowerCase()}`}>
                          {roleLabel[u.role]}
                        </span>
                      </td>
                      <td>
                        <span className={`verified-pill ${u.emailVerified ? 'verified' : 'unverified'}`}>
                          {u.emailVerified ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${u.deletedAt ? 'deactivated' : 'active'}`}>
                          {u.deletedAt ? 'Deactivated' : 'Active'}
                        </span>
                      </td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
