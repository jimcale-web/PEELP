import { useState } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import '../../styles/UserList.css';
import '../../styles/StudentList.css';
import CreateStudentModal from '../../components/Admin/CreateStudentModal';
import ManagePlanModal, { formatPlanStatus } from '../../components/Admin/ManagePlanModal';
import type { StudentRow } from '../../components/Admin/EditStudentModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function fetchStudents(): Promise<StudentRow[]> {
  const res = await axios.get<{ students: StudentRow[] }>(`${API_URL}/admin/students`, {
    withCredentials: true,
  });
  return res.data.students;
}

interface CategoryOption {
  id: string;
  name: string;
}

async function fetchCategories(): Promise<CategoryOption[]> {
  const res = await axios.get<{ categories: CategoryOption[] }>(`${API_URL}/admin/categories`, {
    withCredentials: true,
  });
  return res.data.categories;
}

export default function StudentList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<'' | 'PENDING' | 'APPROVED' | 'REJECTED'>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [accessErrorByStudentId, setAccessErrorByStudentId] = useState<Record<string, string>>({});
  const [managingPlanStudentId, setManagingPlanStudentId] = useState<string | null>(null);

  const { data: students = [], isLoading, isError } = useQuery({
    queryKey: ['admin', 'students'],
    queryFn: fetchStudents,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: fetchCategories,
  });
  const [categorySavingId, setCategorySavingId] = useState<string | null>(null);

  const pendingCount = students.filter((s) => s.approvalStatus === 'PENDING').length;

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.city ?? '').toLowerCase().includes(q) ||
      (s.country ?? '').toLowerCase().includes(q);
    const matchesApproval = approvalFilter === '' || s.approvalStatus === approvalFilter;
    return matchesSearch && matchesApproval;
  });

  const activeCount = students.filter((s) => !s.deletedAt && s.approvalStatus === 'APPROVED').length;

  const managingPlanStudent = managingPlanStudentId
    ? students.find((s) => s.id === managingPlanStudentId) ?? null
    : null;

  async function setApproval(student: StudentRow, status: 'APPROVED' | 'REJECTED') {
    if (approvingId === student.id) return;
    setApprovingId(student.id);
    try {
      await axios.patch(
        `${API_URL}/admin/students/${student.id}/approval`,
        { approvalStatus: status },
        { withCredentials: true },
      );
      await queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
    } finally {
      setApprovingId(null);
    }
  }

  async function setCategory(student: StudentRow, categoryId: string) {
    if (!categoryId || categorySavingId === student.id) return;
    setCategorySavingId(student.id);
    try {
      await axios.patch(
        `${API_URL}/admin/students/${student.id}/category`,
        { categoryId },
        { withCredentials: true },
      );
      await queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error ?? 'Failed to update the course category. Please try again.'
        : 'Failed to update the course category. Please try again.';
      setAccessErrorByStudentId((errors) => ({ ...errors, [student.id]: message }));
    } finally {
      setCategorySavingId(null);
    }
  }

  const skeletonCols = 9;

  return (
    <div className="student-list-container">
      <div className="student-list-card">
        {/* Header */}
        <div className="student-list-header">
          <h1>Student Management</h1>
          {!isLoading && (
            <p>
              {students.length} total &nbsp;·&nbsp; {activeCount} active
              {pendingCount > 0 && (
                <span className="pending-badge">{pendingCount} pending</span>
              )}
            </p>
          )}
        </div>

        <div className="student-list-toolbar">
          <button className="btn-new-student" onClick={() => setShowCreateModal(true)}>
            + Add Student
          </button>
        </div>

        {showCreateModal && <CreateStudentModal onClose={() => setShowCreateModal(false)} />}

        {/* Filters */}
        <div className="student-list-filters" style={{ visibility: isLoading ? 'hidden' : 'visible' }}>
          <input
            type="text"
            className="student-search-input"
            placeholder="Search by name, email, city or country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="role-select"
            aria-label="Filter by approval status"
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value as typeof approvalFilter)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div className="table-wrapper">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Location</th>
                  <th>Phone</th>
                  <th>Verified</th>
                  <th>Joined</th>
                  <th>Category</th>
                  <th>Approval</th>
                  <th>Accessibility Duration</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: skeletonCols }).map((__, j) => (
                      <td key={j}><span className="skeleton skeleton-text" style={{ width: '80px' }} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isError && <p className="state-message error">Failed to load students.</p>}

        {/* Data table */}
        {!isLoading && !isError && (
          <div className="table-wrapper">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Location</th>
                  <th>Phone</th>
                  <th>Verified</th>
                  <th>Joined</th>
                  <th>Category</th>
                  <th>Approval</th>
                  <th>Accessibility Duration</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="no-results">
                      {search || approvalFilter ? 'No students match your filters.' : 'No students yet.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s.id}>
                      <td className="student-name-cell">
                        <span className="student-avatar" aria-hidden="true">
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                        {s.name}
                      </td>
                      <td className="email-cell">{s.email}</td>
                      <td className="location-cell">
                        {s.city && s.country
                          ? `${s.city}, ${s.country}`
                          : s.city || s.country || <span className="empty-cell">—</span>}
                      </td>
                      <td>{s.phoneNumber ?? <span className="empty-cell">—</span>}</td>
                      <td>
                        <span className={`verified-pill ${s.emailVerified ? 'verified' : 'unverified'}`}>
                          {s.emailVerified ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>{new Date(s.createdAt).toLocaleDateString()}</td>

                      {/* Category column — a student only unlocks courses within this category */}
                      <td>
                        <select
                          className="category-select"
                          value={s.enrolledCategoryId ?? ''}
                          onChange={(e) => setCategory(s, e.target.value)}
                          disabled={categorySavingId === s.id}
                          title="Enrolled category (controls which courses this student can access)"
                        >
                          <option value="" disabled>
                            {s.enrolledCategory ? s.enrolledCategory.name : 'Select category…'}
                          </option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        {accessErrorByStudentId[s.id] && (
                          <p className="duration-error" role="alert">
                            {accessErrorByStudentId[s.id]}
                          </p>
                        )}
                      </td>

                      {/* Approval column */}
                      <td>
                        {s.approvalStatus === 'PENDING' ? (
                          <div className="approval-actions">
                            <button
                              className="btn-approve"
                              onClick={() => setApproval(s, 'APPROVED')}
                              disabled={approvingId === s.id}
                              title="Approve student"
                            >
                              ✓ Approve
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => setApproval(s, 'REJECTED')}
                              disabled={approvingId === s.id}
                              title="Reject student"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : (
                          <span className={`approval-pill approval-${s.approvalStatus.toLowerCase()}`}>
                            {s.approvalStatus === 'APPROVED' ? '✓ Approved' : '✕ Rejected'}
                          </span>
                        )}
                      </td>

                      {/* Accessibility Duration column — all plan actions live in the Manage Plan modal */}
                      <td className="duration-cell">
                        <button
                          className="btn-manage-plan"
                          onClick={() => setManagingPlanStudentId(s.id)}
                        >
                          Manage Plan
                        </button>
                        <div className={`plan-status-text ${s.accessExpiresAt && (new Date(s.accessExpiresAt).getTime() > Date.now()) ? 'plan-status--active' : 'plan-status--expired'}`}>
                          {formatPlanStatus(s.accessExpiresAt)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {managingPlanStudent && (
          <ManagePlanModal
            student={managingPlanStudent}
            onClose={() => setManagingPlanStudentId(null)}
          />
        )}
      </div>
    </div>
  );
}
