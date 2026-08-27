import { useState } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import '../../styles/UserList.css';
import CreateUserModal from '../../components/Admin/CreateUserModal';
import EditUserModal from '../../components/Admin/EditUserModal';
import DeleteUserModal from '../../components/Admin/DeleteUserModal';
import type { UserRow } from '../../components/Admin/EditUserModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function fetchUsers(): Promise<UserRow[]> {
  const res = await axios.get<{ users: UserRow[] }>(`${API_URL}/admin/users`, {
    withCredentials: true,
  });
  return res.data.users;
}

export default function UserList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'>('');
  const [approvalFilter, setApprovalFilter] = useState<'' | 'PENDING' | 'APPROVED' | 'REJECTED'>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: fetchUsers,
  });

  const pendingCount = users.filter((u) => u.approvalStatus === 'PENDING').length;

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === '' || u.role === roleFilter;
    const matchesApproval = approvalFilter === '' || u.approvalStatus === approvalFilter;
    return matchesSearch && matchesRole && matchesApproval;
  });

  const roleLabel: Record<string, string> = {
    ADMIN: 'Admin',
    INSTRUCTOR: 'Instructor',
    STUDENT: 'Student',
  };

  async function setApproval(user: UserRow, status: 'APPROVED' | 'REJECTED') {
    if (approvingId === user.id) return;
    setApprovingId(user.id);
    try {
      await axios.patch(
        `${API_URL}/admin/users/${user.id}/approval`,
        { approvalStatus: status },
        { withCredentials: true },
      );
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <div className="user-list-container">
      <div className="user-list-card">
        <div className="user-list-header">
          <h1>User Management</h1>
          <p>
            {isLoading ? '' : `${users.length} total users`}
            {!isLoading && pendingCount > 0 && (
              <span className="pending-badge">{pendingCount} pending</span>
            )}
          </p>
        </div>

        <div className="user-list-toolbar">
          <button className="btn-new-user" onClick={() => setShowCreateModal(true)}>
            + New User
          </button>
        </div>

        {showCreateModal && <CreateUserModal onClose={() => setShowCreateModal(false)} />}
        {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />}
        {deletingUser && <DeleteUserModal user={deletingUser} onClose={() => setDeletingUser(null)} />}

        <div className="user-list-filters" style={{ visibility: isLoading ? 'hidden' : 'visible' }}>
          <input
            type="text"
            className="search-input"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="role-select"
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="INSTRUCTOR">Instructor</option>
            <option value="STUDENT">Student</option>
          </select>
          <select
            className="role-select"
            aria-label="Filter by approval"
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value as typeof approvalFilter)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {isLoading && (
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Status</th>
                  <th>Approval</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td><span className="skeleton skeleton-text" style={{ width: '120px' }} /></td>
                    <td><span className="skeleton skeleton-text" style={{ width: '180px' }} /></td>
                    <td><span className="skeleton skeleton-pill" style={{ width: '70px' }} /></td>
                    <td><span className="skeleton skeleton-pill" style={{ width: '40px' }} /></td>
                    <td><span className="skeleton skeleton-pill" style={{ width: '65px' }} /></td>
                    <td><span className="skeleton skeleton-pill" style={{ width: '75px' }} /></td>
                    <td><span className="skeleton skeleton-text" style={{ width: '80px' }} /></td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                  <th>Approval</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="no-results">No users match your filters.</td>
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
                      <td>
                        {u.approvalStatus === 'PENDING' ? (
                          <div className="approval-actions">
                            <button
                              className="btn-approve"
                              onClick={() => setApproval(u, 'APPROVED')}
                              disabled={approvingId === u.id}
                              title="Approve user"
                            >
                              ✓ Approve
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => setApproval(u, 'REJECTED')}
                              disabled={approvingId === u.id}
                              title="Reject user"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : (
                          <span className={`approval-pill approval-${u.approvalStatus.toLowerCase()}`}>
                            {u.approvalStatus === 'APPROVED' ? '✓ Approved' : '✕ Rejected'}
                          </span>
                        )}
                      </td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="actions-cell">
                        <button
                          className="btn-edit-user"
                          onClick={() => setEditingUser(u)}
                          aria-label={`Edit ${u.name}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Edit
                        </button>
                        {u.role !== 'ADMIN' && !u.deletedAt && (
                          <button
                            className="btn-delete-user"
                            onClick={() => setDeletingUser(u)}
                            aria-label={`Delete ${u.name}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                            {u.role === 'INSTRUCTOR' ? 'Deactivate' : 'Delete'}
                          </button>
                        )}
                      </td>
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
