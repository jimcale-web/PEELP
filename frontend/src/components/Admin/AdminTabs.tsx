import { NavLink } from 'react-router-dom';
import './AdminTabs.css';

const tabs = [
  { to: '/admin/users', label: 'User Management' },
  { to: '/admin/students', label: 'Student Management' },
];

export default function AdminTabs() {
  return (
    <div className="admin-tabs-bar">
      <div className="admin-tabs-inner">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              isActive ? 'admin-tab admin-tab--active' : 'admin-tab'
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
