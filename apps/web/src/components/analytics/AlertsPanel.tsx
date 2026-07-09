import { useEffect, useState } from 'react';
import type { AlertDto, AlertSeverity } from '@stratiq/shared';
import { ApiError } from '../../lib/api-client';
import { acknowledgeAlert, getAlerts, resolveAlert } from '../../lib/intelligence-api';

interface AlertsPanelProps {
  organizationId: string;
}

const SEVERITY_STYLE: Record<AlertSeverity, string> = {
  CRITICAL: 'border-red-200 bg-red-50 text-red-900',
  WARNING: 'border-amber-200 bg-amber-50 text-amber-900',
  INFORMATIONAL: 'border-slate-200 bg-slate-50 text-slate-900',
};

// Alerts raised by the Business Rules Engine — open by default, with
// acknowledge/resolve actions wired straight to the Alert Engine's status
// transitions (OPEN -> ACKNOWLEDGED -> RESOLVED).
export function AlertsPanel({ organizationId }: AlertsPanelProps): JSX.Element {
  const [alerts, setAlerts] = useState<AlertDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function load(): void {
    setError(null);
    getAlerts(organizationId, 'OPEN')
      .then(setAlerts)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load alerts.'));
  }

  useEffect(load, [organizationId]);

  async function handleAction(alertId: string, action: 'acknowledge' | 'resolve'): Promise<void> {
    setPendingId(alertId);
    try {
      if (action === 'acknowledge') {
        await acknowledgeAlert(organizationId, alertId);
      } else {
        await resolveAlert(organizationId, alertId);
      }
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update alert.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Alerts</h3>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !alerts ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : alerts.length === 0 ? (
        <p className="text-sm text-slate-400">No open alerts.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className={`rounded-md border p-3 text-sm ${SEVERITY_STYLE[alert.severity]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="opacity-90">{alert.message}</p>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={pendingId === alert.id}
                    onClick={() => handleAction(alert.id, 'acknowledge')}
                    className="rounded border border-current px-2 py-0.5 text-xs font-medium hover:bg-white/50 disabled:opacity-50"
                  >
                    Acknowledge
                  </button>
                  <button
                    type="button"
                    disabled={pendingId === alert.id}
                    onClick={() => handleAction(alert.id, 'resolve')}
                    className="rounded border border-current px-2 py-0.5 text-xs font-medium hover:bg-white/50 disabled:opacity-50"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
