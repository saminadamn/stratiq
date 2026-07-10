from app.models import forecasting


def test_forecasts_a_rising_linear_trend():
    history = [{"period": f"2024-{month:02d}", "value": 100.0 + month * 10} for month in range(1, 7)]
    model, algorithm, metrics = forecasting.train(history)
    assert algorithm == "linear_trend"
    assert model["slope"] > 0
    assert metrics["rSquared"] > 0.9

    result = forecasting.predict(model, history, periods_ahead=3)
    assert len(result["forecast"]) == 3
    assert result["forecast"][0]["period"] == "2024-07"
    assert result["forecast"][-1]["period"] == "2024-09"
    assert all(point["isForecast"] for point in result["forecast"])
    # Rising trend should keep forecasting higher values.
    assert result["forecast"][-1]["value"] > result["forecast"][0]["value"]


def test_wraps_period_across_year_boundary():
    history = [{"period": "2023-11", "value": 100.0}, {"period": "2023-12", "value": 110.0}]
    model, _, _ = forecasting.train(history)
    result = forecasting.predict(model, history, periods_ahead=2)
    assert result["forecast"][0]["period"] == "2024-01"
    assert result["forecast"][1]["period"] == "2024-02"


def test_detects_seasonal_pattern_with_enough_history():
    # 24 months of a repeating 12-month wave on top of a flat trend.
    history = []
    for i in range(24):
        seasonal = 50.0 if i % 12 in (0, 1, 2) else 0.0
        history.append({"period": f"m{i}", "value": 200.0 + seasonal})
    model, algorithm, _ = forecasting.train(history)
    assert algorithm == "linear_trend_with_seasonal_naive"
    assert model["seasonal_pattern"] is not None
