import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function DashboardLayout(): JSX.Element {
  // Sidebar is always visible inline on large screens (see Sidebar.tsx's
  // lg: breakpoint) — this state only matters below that, where it's an
  // off-canvas panel toggled from the Topbar's hamburger button.
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F8F9FB]">
      <Sidebar isMobileOpen={isMobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
