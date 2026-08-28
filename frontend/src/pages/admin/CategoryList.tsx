import { useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import '../../styles/CourseList.css';
import CreateCategoryModal from '../../components/Admin/CreateCategoryModal';
import EditCategoryModal from '../../components/Admin/EditCategoryModal';
import DeleteCategoryModal from '../../components/Admin/DeleteCategoryModal';
import type { CategoryRow } from '../../components/Admin/EditCategoryModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function fetchCategories(): Promise<CategoryRow[]> {
  const res = await axios.get<{ categories: CategoryRow[] }>(`${API_URL}/admin/categories`, {
    withCredentials: true,
  });
  return res.data.categories;
}

export default function CategoryList() {
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryRow | null>(null);

  const { data: categories = [], isLoading, isError } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: fetchCategories,
  });

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="user-list-container">
      <div className="user-list-card">
        <div className="user-list-header">
          <h1>Category Management</h1>
          <p>{isLoading ? '' : `${categories.length} total categories`}</p>
        </div>

        <div className="user-list-toolbar">
          <button className="btn-new-user" onClick={() => setShowCreateModal(true)}>
            + New Category
          </button>
        </div>

        <div className="user-list-filters">
          <input
            className="search-input"
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isError && <p className="state-message error">Failed to load categories. Please refresh.</p>}

        {isLoading ? (
          <p className="state-message">Loading categories…</p>
        ) : (
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Courses</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="no-results">No categories found.</td>
                  </tr>
                ) : (
                  filtered.map((category) => (
                    <tr key={category.id}>
                      <td><strong>{category.name}</strong></td>
                      <td className="cell-desc">
                        {category.description
                          ? category.description.length > 70
                            ? category.description.slice(0, 70) + '…'
                            : category.description
                          : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        <span className="course-count-pill">{category._count.courses}</span>
                      </td>
                      <td>{new Date(category.createdAt).toLocaleDateString()}</td>
                      <td className="actions-cell">
                        <button
                          className="btn-edit-user"
                          onClick={() => setEditingCategory(category)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete-user"
                          onClick={() => setDeletingCategory(category)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && <CreateCategoryModal onClose={() => setShowCreateModal(false)} />}
      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}
      {deletingCategory && (
        <DeleteCategoryModal
          category={deletingCategory}
          onClose={() => setDeletingCategory(null)}
        />
      )}
    </div>
  );
}
