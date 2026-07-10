import { useEffect, useState } from 'react';
import type {
  ChurnPredictionDto,
  CustomerSegmentationDto,
  ProductRecommendationDto,
  SalesForecastDto,
} from '@stratiq/shared';
import { ApiError } from '../../lib/api-client';
import {
  getChurnPredictions,
  getCustomerSegments,
  getProductRecommendations,
  getSalesForecast,
} from '../../lib/predictions-api';
import { formatCurrency, formatPercent } from '../../lib/format';

interface PredictionsPanelProps {
  organizationId: string;
}

const CHURN_RISK_THRESHOLD = 0.6;

// One panel covering all four Predictive Intelligence models — churn,
// forecast, segments, recommendations — rather than four separate panels,
// matching how Sprint 4 kept Insights/Alerts each to a single panel instead
// of one per metric.
export function PredictionsPanel({ organizationId }: PredictionsPanelProps): JSX.Element {
  const [churn, setChurn] = useState<ChurnPredictionDto[] | null>(null);
  const [forecast, setForecast] = useState<SalesForecastDto | null>(null);
  const [segments, setSegments] = useState<CustomerSegmentationDto | null>(null);
  const [recommendations, setRecommendations] = useState<ProductRecommendationDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([
      getChurnPredictions(organizationId),
      getSalesForecast(organizationId),
      getCustomerSegments(organizationId),
      getProductRecommendations(organizationId),
    ])
      .then(([churnResult, forecastResult, segmentsResult, recommendationsResult]) => {
        if (cancelled) return;
        setChurn(churnResult);
        setForecast(forecastResult);
        setSegments(segmentsResult);
        setRecommendations(recommendationsResult);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Unable to load predictions.');
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const isLoading = !churn && !error;
  const atRiskCustomers = (churn ?? [])
    .filter((prediction) => prediction.churnProbability >= CHURN_RISK_THRESHOLD)
    .sort((a, b) => b.churnProbability - a.churnProbability);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Predictions</h3>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Churn Risk</p>
            {atRiskCustomers.length === 0 ? (
              <p className="mt-1 text-sm text-slate-400">No customers currently at high risk.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {atRiskCustomers.slice(0, 5).map((prediction) => (
                  <li key={prediction.customerId} className="flex justify-between text-red-700">
                    <span>{prediction.customerName ?? prediction.customerId}</span>
                    <span>{formatPercent(prediction.churnProbability * 100)} risk</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Sales Forecast</p>
            {!forecast || forecast.forecast.length === 0 ? (
              <p className="mt-1 text-sm text-slate-400">Not enough history to forecast.</p>
            ) : (
              <p className="mt-1 text-sm text-slate-700">
                Next period: {formatCurrency(forecast.forecast[0]?.value ?? null)}{' '}
                <span className="text-slate-400">
                  (confidence {formatPercent(forecast.confidence * 100)})
                </span>
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Customer Segments</p>
            {!segments || segments.segments.length === 0 ? (
              <p className="mt-1 text-sm text-slate-400">Not enough customers to segment.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                {segments.segments.map((segment) => (
                  <li key={segment.segmentId} className="flex justify-between">
                    <span>{segment.label}</span>
                    <span>
                      {segment.customerCount} customers · {formatCurrency(segment.averageSpend)} avg
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Top Product Recommendations
            </p>
            {!recommendations || recommendations.length === 0 ? (
              <p className="mt-1 text-sm text-slate-400">No recommendations available yet.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                {recommendations.slice(0, 5).map((recommendation, index) => (
                  <li key={`${recommendation.customerId}-${recommendation.recommendedProductId}-${index}`}>
                    {recommendation.customerId} → {recommendation.recommendedProductName ?? recommendation.recommendedProductId}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
