"""Customer Segmentation.

K-Means over the same RFM feature vectors the churn model uses (Node's
Feature Store computes these once and both models read them — see
docs/ARCHITECTURE.md) — segmentation and churn are two different questions
asked of the same underlying features, not two separate feature pipelines.
"""

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

FEATURE_NAMES = ["recencyDays", "frequency", "monetary"]
MAX_SEGMENTS = 3


def _feature_matrix(customers: list[dict]) -> np.ndarray:
    return np.array(
        [[c["recencyDays"], c["frequency"], c["monetary"]] for c in customers],
        dtype=float,
    )


def train(customers: list[dict]) -> tuple[dict, str, dict]:
    features = _feature_matrix(customers)
    # Can't ask for more clusters than distinct customers.
    k = max(1, min(MAX_SEGMENTS, len(customers)))

    scaler = StandardScaler()
    scaled = scaler.fit_transform(features)

    if k == 1:
        labels = np.zeros(len(customers), dtype=int)
        model = {"scaler": scaler, "kmeans": None, "k": 1}
        return model, "single_segment", {"sampleSize": len(customers)}

    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = kmeans.fit_predict(scaled)

    metrics: dict = {"sampleSize": len(customers), "clusters": k}
    if len(customers) > k:
        metrics["silhouetteScore"] = round(float(silhouette_score(scaled, labels)), 4)

    model = {"scaler": scaler, "kmeans": kmeans, "k": k}
    return model, "kmeans", metrics


def predict(model: dict, customers: list[dict]) -> dict:
    features = _feature_matrix(customers)

    if model["k"] == 1 or model["kmeans"] is None:
        labels = np.zeros(len(customers), dtype=int)
    else:
        scaled = model["scaler"].transform(features)
        labels = model["kmeans"].predict(scaled)

    segment_ids = sorted(set(labels.tolist()))
    # Rank segments by average monetary value so "Segment 0" is always
    # meaningful (highest-value first) rather than an arbitrary cluster index.
    segment_monetary = {
        segment_id: float(np.mean([c["monetary"] for c, label in zip(customers, labels) if label == segment_id]))
        for segment_id in segment_ids
    }
    ranked = sorted(segment_ids, key=lambda sid: segment_monetary[sid], reverse=True)
    tier_labels = ["High Value", "Growth", "At Risk"]

    segments = []
    for rank, segment_id in enumerate(ranked):
        members = [c for c, label in zip(customers, labels) if label == segment_id]
        segments.append(
            {
                "segmentId": int(segment_id),
                "label": tier_labels[rank] if rank < len(tier_labels) else f"Segment {rank + 1}",
                "customerCount": len(members),
                "averageSpend": round(float(np.mean([c["monetary"] for c in members])), 2),
                "averageOrders": round(float(np.mean([c["frequency"] for c in members])), 2),
            }
        )

    assignments = [
        {"customerId": customer["customerId"], "segmentId": int(label)}
        for customer, label in zip(customers, labels)
    ]
    return {"segments": segments, "assignments": assignments}
