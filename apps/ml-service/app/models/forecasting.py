"""Sales Forecasting.

A linear trend fit blended with a seasonal-naive adjustment when there's
enough history to detect one. This deliberately isn't Prophet/ARIMA (see
docs/ARCHITECTURE.md's model-choice decision) — those need long, regular
history to outperform a simple trend line, and degrade badly on the
CSV-scale histories this platform typically sees. Node computes the input
monthly revenue series itself (reusing computeMetricMonthlySeries), so this
module only ever sees a plain (period, value) series, never raw rows.
"""

import re

import numpy as np

SEASONAL_MIN_PERIODS = 24


def _increment_period(period: str, months: int) -> str:
    match = re.match(r"^(\d{4})-(\d{2})$", period)
    if not match:
        # Fallback for non-YYYY-MM periods (e.g. quarter/year labels) — just
        # tag it rather than guess an increment.
        return f"{period}+{months}"
    year, month = int(match.group(1)), int(match.group(2))
    total = (year * 12 + (month - 1)) + months
    new_year, new_month = divmod(total, 12)
    return f"{new_year:04d}-{new_month + 1:02d}"


def train(history: list[dict]) -> tuple[dict, str, dict]:
    values = np.array([point["value"] for point in history], dtype=float)
    x = np.arange(len(values), dtype=float)

    slope, intercept = np.polyfit(x, values, 1)
    predicted = slope * x + intercept
    residuals = values - predicted

    ss_res = float(np.sum(residuals**2))
    ss_tot = float(np.sum((values - values.mean()) ** 2)) or 1.0
    r_squared = max(0.0, 1 - ss_res / ss_tot)

    seasonal_pattern = None
    algorithm = "linear_trend"
    if len(values) >= SEASONAL_MIN_PERIODS:
        # Average residual per position-in-cycle (assumes a 12-period annual
        # cycle for monthly data) — a seasonal-naive adjustment layered on
        # top of the trend line, not a replacement for it.
        cycle = 12
        seasonal_pattern = [
            float(np.mean(residuals[i::cycle])) for i in range(cycle)
        ]
        algorithm = "linear_trend_with_seasonal_naive"

    model = {
        "slope": float(slope),
        "intercept": float(intercept),
        "history_length": len(values),
        "seasonal_pattern": seasonal_pattern,
        "last_period": history[-1]["period"],
    }
    metrics = {"rSquared": round(r_squared, 4), "sampleSize": len(values)}
    return model, algorithm, metrics


def predict(model: dict, history: list[dict], periods_ahead: int) -> dict:
    slope, intercept = model["slope"], model["intercept"]
    start_index = model["history_length"]
    seasonal_pattern = model["seasonal_pattern"]

    forecast_points = []
    period = model["last_period"]
    for step in range(1, periods_ahead + 1):
        period = _increment_period(period, 1)
        index = start_index + step - 1
        value = slope * index + intercept
        if seasonal_pattern:
            value += seasonal_pattern[index % len(seasonal_pattern)]
        forecast_points.append({"period": period, "value": round(float(value), 2), "isForecast": True})

    top_features = [{"feature": "trendSlope", "importance": 0.7 if seasonal_pattern else 1.0}]
    if seasonal_pattern:
        top_features.append({"feature": "seasonalAdjustment", "importance": 0.3})

    return {
        "history": history,
        "forecast": forecast_points,
        "explanation": {
            "method": "linear_trend_with_seasonal_naive" if seasonal_pattern else "linear_trend",
            "topFeatures": top_features,
        },
    }
