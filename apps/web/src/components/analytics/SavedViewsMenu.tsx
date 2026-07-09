import { useEffect, useState } from 'react';
import type { AnalyticsFiltersDto, DashboardType, SavedDashboardViewDto } from '@stratiq/shared';
import { useAuth } from '../../auth/auth-context';
import { createSavedView, deleteSavedView, listSavedViews } from '../../lib/analytics-api';

interface SavedViewsMenuProps {
  dashboardType: DashboardType;
  currentFilters: AnalyticsFiltersDto;
  onApply: (filters: AnalyticsFiltersDto) => void;
}

export function SavedViewsMenu({
  dashboardType,
  currentFilters,
  onApply,
}: SavedViewsMenuProps): JSX.Element | null {
  const { organizations } = useAuth();
  const organizationId = organizations[0]?.id;
  const [views, setViews] = useState<SavedDashboardViewDto[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    listSavedViews(organizationId, dashboardType)
      .then(setViews)
      .catch(() => undefined);
  }, [organizationId, dashboardType]);

  async function handleSave(): Promise<void> {
    if (!organizationId || !newName.trim()) {
      return;
    }
    const view = await createSavedView(organizationId, {
      name: newName.trim(),
      dashboardType,
      filters: currentFilters,
    });
    setViews((current) => [view, ...current]);
    setNewName('');
  }

  async function handleDelete(viewId: string): Promise<void> {
    if (!organizationId) {
      return;
    }
    await deleteSavedView(organizationId, viewId);
    setViews((current) => current.filter((view) => view.id !== viewId));
  }

  if (!organizationId) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Saved views
      </button>
      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-72 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              placeholder="View name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!newName.trim()}
              className="rounded-md bg-indigo-600 px-2 py-1 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Save
            </button>
          </div>

          {views.length === 0 ? (
            <p className="text-xs text-slate-400">No saved views yet.</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {views.map((view) => (
                <li
                  key={view.id}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-slate-50"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onApply(view.filters);
                      setIsOpen(false);
                    }}
                    className="flex-1 truncate text-left text-sm text-slate-700"
                  >
                    {view.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(view.id)}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
