import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import { useDisclosure } from '../hooks/useDisclosure';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { isOpen: sidebarOpen, open: openSidebar, close: closeSidebar } = useDisclosure();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #f8f9ff 50%, #eef2ff 100%)' }}>
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onMenuClick={openSidebar} />

        <main className="flex-1 overflow-y-auto">
          {/* Subtle dot grid background pattern */}
          <div className="relative min-h-full">
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
            <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-6">
              {children ?? <Outlet />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
