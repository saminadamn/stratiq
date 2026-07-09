import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/datasets', label: 'Datasets', end: false },
  { to: '/analytics/executive', label: 'Executive', end: false },
  { to: '/analytics/customers', label: 'Customers', end: false },
  { to: '/analytics/products', label: 'Products', end: false },
  { to: '/analytics/inventory', label: 'Inventory', end: false },
];

export function Sidebar(): JSX.Element {
  const { organizations } = useAuth();
  const primaryOrganization = organizations[0];

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="px-6 py-5 text-lg font-semibold text-slate-900">StratIQ</div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm font-medium ${
                isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {primaryOrganization && (
        <div className="border-t border-slate-200 px-3 py-4">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Workspace
          </p>
          <div className="rounded-md px-3 py-2 text-sm text-slate-700">
            <p className="font-medium">{primaryOrganization.name}</p>
            <p className="text-xs text-slate-400">{primaryOrganization.role}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
