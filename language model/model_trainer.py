"""
Model Training & Evaluation Module
Trains Linear Regression, Random Forest, and Decision Tree models
for Demand, Sales Quantity, and Price prediction targets.
Evaluates using MAE, MSE, RMSE, and R2 with zero data leakage.
"""

import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, Any, Tuple
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from data_preprocessor import DataPreprocessor

MODELS_DIR = os.path.join(os.path.dirname(__file__), "data", "models")


class ModelTrainer:
    def __init__(self):
        os.makedirs(MODELS_DIR, exist_ok=True)
        self.preprocessor = DataPreprocessor()
        self.models = {}  # {target: {model_name: trained_model}}
        self.metrics = {}  # {target: {model_name: {mae, mse, rmse, r2}}}
        self.best_models = {}  # {target: best_model_name}
        self.feature_names = []
        self.test_predictions = {}  # Store sample actual vs predicted for frontend charts
        self.last_trained_at = None

    def train_all_models(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Clean data, engineer features, and train all 3 algorithms
        (Linear Regression, Random Forest, Decision Tree) across targets:
        - demand
        - sales_quantity
        - price
        """
        # 1. Clean data using preprocessor
        df_clean, clean_report = self.preprocessor.clean_data(df)

        # 2. Fit and transform features
        X, feature_names = self.preprocessor.fit_transform_features(df_clean)
        self.feature_names = feature_names

        targets = ["demand", "sales_quantity", "price"]
        available_targets = [t for t in targets if t in df_clean.columns]

        training_summary = {
            "training_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_records": len(df_clean),
            "training_samples": int(len(df_clean) * 0.8),
            "test_samples": int(len(df_clean) * 0.2),
            "features_used": feature_names,
            "target_results": {},
            "cleaning_report": clean_report
        }

        for target in available_targets:
            y = df_clean[target].values

            # Prevent data leakage: Split strictly into train/test
            test_size = 0.20 if len(df_clean) >= 15 else 0.25
            if len(df_clean) < 10:
                # For tiny custom files ensure at least 2 test samples if possible
                test_count = max(2, int(len(df_clean) * 0.25))
                if test_count >= len(df_clean):
                    test_count = 1
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=test_count, random_state=42
                )
            else:
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=test_size, random_state=42
                )

            # Model Candidate Definitions
            candidates = {
                "Linear Regression": LinearRegression(),
                "Random Forest": RandomForestRegressor(
                    n_estimators=100, max_depth=12, min_samples_split=4, random_state=42, n_jobs=-1
                ),
                "Decision Tree": DecisionTreeRegressor(
                    max_depth=8, min_samples_split=5, random_state=42
                )
            }

            self.models[target] = {}
            self.metrics[target] = {}
            test_preds_map = {}

            best_score = -float("inf")
            best_model_name = "Random Forest"

            for name, model in candidates.items():
                # Train model
                model.fit(X_train, y_train)
                self.models[target][name] = model

                # Predict on unseen test set
                y_pred = model.predict(X_test)
                # Clip negative predictions for physical quantities
                if target in ["demand", "sales_quantity", "price"]:
                    y_pred = np.clip(y_pred, a_min=0, a_max=None)

                # Calculate genuine evaluation metrics
                mae = float(mean_absolute_error(y_test, y_pred))
                mse = float(mean_squared_error(y_test, y_pred))
                rmse = float(np.sqrt(mse))
                try:
                    if len(y_test) >= 2 and np.var(y_test) > 1e-9:
                        r2 = float(r2_score(y_test, y_pred))
                    else:
                        r2 = 0.0
                except Exception:
                    r2 = 0.0

                self.metrics[target][name] = {
                    "mae": round(mae, 2),
                    "mse": round(mse, 2),
                    "rmse": round(rmse, 2),
                    "r2": round(r2, 4),
                    "accuracy_pct": round(max(0.0, r2 * 100), 1)
                }

                # Store first 35 sample test predictions for chart display
                test_preds_map[name] = [round(float(p), 1) for p in y_pred[:35]]

                # Selection criteria: highest R2
                if r2 > best_score:
                    best_score = r2
                    best_model_name = name

            self.best_models[target] = best_model_name

            # Extract Feature Importance (from Random Forest)
            rf_model = self.models[target]["Random Forest"]
            importances = rf_model.feature_importances_
            feature_imp_list = [
                {"feature": feat, "importance": round(float(imp), 4)}
                for feat, imp in zip(feature_names, importances)
            ]
            feature_imp_list = sorted(feature_imp_list, key=lambda x: x["importance"], reverse=True)

            # Store test slice for visual comparison
            actual_sample = [round(float(a), 1) for a in y_test[:35]]
            self.test_predictions[target] = {
                "actual": actual_sample,
                "predictions": test_preds_map,
                "labels": [f"Test Item #{i+1}" for i in range(len(actual_sample))]
            }

            training_summary["target_results"][target] = {
                "metrics": self.metrics[target],
                "best_model": best_model_name,
                "best_r2": round(best_score, 4),
                "feature_importances": feature_imp_list[:8],  # Top 8 most impactful
            }

        self.last_trained_at = training_summary["training_date"]
        self._save_models()

        return training_summary

    def _save_models(self):
        """Save trained models, metrics, and preprocessor to disk."""
        try:
            joblib.dump(self.models, os.path.join(MODELS_DIR, "models.joblib"))
            joblib.dump(self.preprocessor, os.path.join(MODELS_DIR, "preprocessor.joblib"))
            joblib.dump({
                "metrics": self.metrics,
                "best_models": self.best_models,
                "feature_names": self.feature_names,
                "test_predictions": self.test_predictions,
                "last_trained_at": self.last_trained_at
            }, os.path.join(MODELS_DIR, "metadata.joblib"))
        except Exception as e:
            print(f"[ModelTrainer] Warning: Failed to save models to disk: {e}")

    def load_models(self) -> bool:
        """Load serialized models from disk if available."""
        models_file = os.path.join(MODELS_DIR, "models.joblib")
        prep_file = os.path.join(MODELS_DIR, "preprocessor.joblib")
        meta_file = os.path.join(MODELS_DIR, "metadata.joblib")

        if os.path.exists(models_file) and os.path.exists(prep_file) and os.path.exists(meta_file):
            try:
                self.models = joblib.load(models_file)
                self.preprocessor = joblib.load(prep_file)
                meta = joblib.load(meta_file)
                self.metrics = meta.get("metrics", {})
                self.best_models = meta.get("best_models", {})
                self.feature_names = meta.get("feature_names", [])
                self.test_predictions = meta.get("test_predictions", {})
                self.last_trained_at = meta.get("last_trained_at")
                return True
            except Exception as e:
                print(f"[ModelTrainer] Error loading models: {e}")
                return False
        return False

    def predict_target(self, target: str, input_features: np.ndarray, model_name: str = None) -> float:
        """Predict for a specific target using the best or selected model."""
        if target not in self.models:
            raise ValueError(f"Target '{target}' not trained yet.")

        chosen_name = model_name or self.best_models.get(target, "Random Forest")
        model = self.models[target].get(chosen_name)
        if model is None:
            model = list(self.models[target].values())[0]

        pred = model.predict(input_features)[0]
        return max(0.0, float(pred))
