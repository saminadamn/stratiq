import { useState, type RefObject } from 'react';
import { toPng } from 'html-to-image';
import type { AnalyticsFiltersDto, DashboardType, ExportFormat } from '@stratiq/shared';
import { useAuth } from '../../auth/auth-context';
import { exportDashboard } from '../../lib/analytics-api';

interface ExportMenuProps {
  dashboardType: DashboardType;
  filters: AnalyticsFiltersDto;
  // The DOM node to rasterize for PNG export — omit to hide that option.
  // PNG is captured client-side from the already-rendered SVG charts rather
  // than server-side (see docs/ARCHITECTURE.md, "Export: CSV/PDF
  // server-side, PNG client-side").
  pngTargetRef?: RefObject<HTMLElement>;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ExportMenu({
  dashboardType,
  filters,
  pngTargetRef,
}: ExportMenuProps): JSX.Element | null {
  const { organizations } = useAuth();
  const organizationId = organizations[0]?.id;
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport(format: ExportFormat): Promise<void> {
    if (!organizationId) {
      return;
    }
    setIsExporting(true);
    try {
      const blob = await exportDashboard(organizationId, { dashboardType, format, filters });
      downloadBlob(blob, `${dashboardType.toLowerCase()}-dashboard.${format.toLowerCase()}`);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  }

  async function handleExportPng(): Promise<void> {
    if (!pngTargetRef?.current) {
      return;
    }
    setIsExporting(true);
    try {
      const dataUrl = await toPng(pngTargetRef.current, { backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${dashboardType.toLowerCase()}-dashboard.png`;
      link.click();
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  }

  if (!organizationId) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={isExporting}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        {isExporting ? 'Exporting…' : 'Export'}
      </button>
      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-40 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => void handleExport('CSV')}
            className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            CSV
          </button>
          <button
            type="button"
            onClick={() => void handleExport('PDF')}
            className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            PDF
          </button>
          {pngTargetRef && (
            <button
              type="button"
              onClick={() => void handleExportPng()}
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              PNG (charts)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
