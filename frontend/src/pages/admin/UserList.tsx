import { useEffect, useState } from 'react';
import api from '../../services/api';
import '../../styles/UserList.css';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
  emailVerified: boolean;
  createdAt: string;
  deletedAt: string | null;
}

export default function UserList() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'>('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get<{ users: UserRow[] }>('/admin/users');
        setUsers(res.data.users);
      } catch {
        setError('Failed to load users.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

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
        {error && <p className="state-message error">{error}</p>}

        {!isLoading && !error && (
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
