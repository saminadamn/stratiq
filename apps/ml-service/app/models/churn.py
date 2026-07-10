"""Customer Churn Prediction.

There's no ground-truth "did this customer churn" label in a generic
uploaded sales export, so this uses the standard proxy-label technique for
unlabeled churn modeling: customers in the top third of recency (least
recently active) are labeled "at risk" as training targets, and a classifier
learns to predict that label from frequency/monetary/AOV — recency itself is
deliberately excluded as a model input because it defines the label, so
including it would make the "model" a tautology rather than a genuine
learned relationship between purchase behavior and risk.

On very small samples (too few customers, or a degenerate single-class
label split) a trained classifier isn't meaningful, so this falls back to a
transparent recency-percentile heuristic instead of failing — still returns
a real probability and a lower confidence, with the explanation naming the
fallback.
"""

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import StandardScaler

FEATURE_NAMES = ["frequency", "monetary", "avgOrderValue"]
MIN_CUSTOMERS_FOR_TRAINING = 6
AT_RISK_PERCENTILE = 66.0


def _feature_matrix(customers: list[dict]) -> np.ndarray:
    return np.array(
        [[c["frequency"], c["monetary"], c["avgOrderValue"]] for c in customers],
        dtype=float,
    )


def _proxy_labels(customers: list[dict]) -> np.ndarray:
    recency = np.array([c["recencyDays"] for c in customers], dtype=float)
    threshold = np.percentile(recency, AT_RISK_PERCENTILE)
    return (recency >= threshold).astype(int)


def train(customers: list[dict]) -> tuple[Pipeline | None, str, dict]:
    """Returns (model, algorithm, metrics). model is None when the sample is
    too small or degenerate to train on, signalling the heuristic fallback."""
    labels = _proxy_labels(customers)
    if len(customers) < MIN_CUSTOMERS_FOR_TRAINING or len(set(labels.tolist())) < 2:
        return None, "recency_percentile_heuristic", {
            "reason": "insufficient_or_single_class_sample",
            "sampleSize": len(customers),
        }

    features = _feature_matrix(customers)
    model = make_pipeline(StandardScaler(), LogisticRegression(random_state=42, max_iter=1000))
    model.fit(features, labels)
    training_accuracy = float(model.score(features, labels))
    return model, "logistic_regression", {"trainingAccuracy": training_accuracy, "sampleSize": len(customers)}


def predict(model: Pipeline | None, customers: list[dict]) -> list[dict]:
    if model is None:
        return _predict_heuristic(customers)

    features = _feature_matrix(customers)
    probabilities = model.predict_proba(features)[:, 1]
    classifier: LogisticRegression = model.named_steps["logisticregression"]
    coefficients = classifier.coef_[0]
    total_weight = float(np.sum(np.abs(coefficients))) or 1.0
    top_features = [
        {"feature": name, "importance": round(float(abs(coef)) / total_weight, 4)}
        for name, coef in sorted(
            zip(FEATURE_NAMES, coefficients), key=lambda item: abs(item[1]), reverse=True
        )
    ]

    results = []
    for customer, probability in zip(customers, probabilities):
        confidence = round(float(max(probability, 1 - probability)), 4)
        results.append(
            {
                "customerId": customer["customerId"],
                "customerName": customer.get("customerName"),
                "churnProbability": round(float(probability), 4),
                "confidence": confidence,
                "explanation": {
                    "method": "logistic_regression_coefficients",
                    "topFeatures": top_features,
                },
            }
        )
    return results


def _predict_heuristic(customers: list[dict]) -> list[dict]:
    recency = np.array([c["recencyDays"] for c in customers], dtype=float)
    max_recency = float(np.max(recency)) or 1.0
    results = []
    for customer, days in zip(customers, recency):
        probability = round(float(days) / max_recency, 4)
        results.append(
            {
                "customerId": customer["customerId"],
                "customerName": customer.get("customerName"),
                "churnProbability": probability,
                # Lower confidence than a trained model — this is a
                # transparent heuristic, not a learned relationship.
                "confidence": 0.5,
                "explanation": {
                    "method": "recency_percentile_heuristic",
                    "topFeatures": [{"feature": "recencyDays", "importance": 1.0}],
                },
            }
        )
    return results
