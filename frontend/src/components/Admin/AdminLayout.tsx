import type { ReactNode } from 'react';
import AdminTabs from './AdminTabs';

interface Props {
  children: ReactNode;
}

export default function AdminLayout({ children }: Props) {
  return (
    <>
      <AdminTabs />
      {children}
    </>
  );
}
