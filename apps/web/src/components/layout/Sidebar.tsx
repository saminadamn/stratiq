import type { SVGProps } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';

function IconDatabase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} {...props}>
      <ellipse cx="10" cy="5" rx="6" ry="2.2" />
      <path d="M4 5v10c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V5" strokeLinecap="round" />
      <path d="M4 10c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconChart(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} {...props}>
      <path d="M3 17V3" strokeLinecap="round" />
      <path d="M3 17h14" strokeLinecap="round" />
      <path d="M6.5 14v-4M10.5 14V7M14.5 14v-6" strokeLinecap="round" />
    </svg>
  );
}

function IconUsers(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} {...props}>
      <circle cx="7.5" cy="6.5" r="2.5" />
      <path d="M2.5 16.5c0-2.8 2.2-5 5-5s5 2.2 5 5" strokeLinecap="round" />
      <path d="M12.8 4.3a2.5 2.5 0 0 1 0 4.9" strokeLinecap="round" />
      <path d="M14.5 11.7c1.7.5 3 2.2 3 4.8" strokeLinecap="round" />
    </svg>
  );
}

function IconBox(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} {...props}>
      <path d="M10 2.5 17 6.5v7L10 17.5 3 13.5v-7L10 2.5Z" strokeLinejoin="round" />
      <path d="M3 6.5 10 10.5l7-4" strokeLinejoin="round" />
      <path d="M10 10.5v7" />
    </svg>
  );
}

function IconDocument(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} {...props}>
      <path
        d="M6 2.5h6l3 3v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z"
        strokeLinejoin="round"
      />
      <path d="M12 2.5v3h3" strokeLinejoin="round" />
      <path d="M7 11h6M7 14h6" strokeLinecap="round" />
    </svg>
  );
}

// No separate "Dashboard" entry pointing at "/" — the Executive dashboard
// *is* the main dashboard (see App.tsx, which redirects "/" straight here),
// so a distinct placeholder landing page would just be a second, emptier
// copy of this same destination.
const NAV_ITEMS = [
  { to: '/analytics/executive', label: 'Executive', end: false, icon: IconChart },
  { to: '/datasets', label: 'Datasets', end: false, icon: IconDatabase },
  { to: '/analytics/customers', label: 'Customers', end: false, icon: IconUsers },
  { to: '/analytics/products', label: 'Products', end: false, icon: IconBox },
  { to: '/analytics/inventory', label: 'Inventory', end: false, icon: IconBox },
  { to: '/reports', label: 'Reports', end: false, icon: IconDocument },
];

interface SidebarProps {
  // Mobile-only: the sidebar is always visible inline on large screens
  // (lg: and up) regardless of these props — see DashboardLayout.tsx.
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps): JSX.Element {
  const { organizations } = useAuth();
  const primaryOrganization = organizations[0];

  return (
    <>
      {/* Backdrop: mobile-only, closes the sidebar on tap outside it. */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-shrink-0 flex-col border-r border-slate-200/80 bg-white transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            S
          </div>
          <span className="text-base font-semibold tracking-tight text-slate-900">StratIQ</span>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  `group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-indigo-600" />
                    )}
                    <Icon
                      className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500'}`}
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {primaryOrganization && (
          <div className="border-t border-slate-200/80 px-3 py-4">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </p>
            <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                {primaryOrganization.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-700">
                  {primaryOrganization.name}
                </p>
                <p className="text-xs text-slate-400">{primaryOrganization.role}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
