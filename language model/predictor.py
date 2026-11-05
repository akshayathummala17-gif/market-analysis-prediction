"""
Prediction Engine Module
Generates comprehensive predictions for product demand, sales revenue,
future price recommendations, performance tiering, and market trends.
Provides historical comparisons and honest ML performance metrics.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
from model_trainer import ModelTrainer


class Predictor:
    def __init__(self, trainer: ModelTrainer):
        self.trainer = trainer

    def predict_product_performance(self, input_data: dict, historical_df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
        """
        Execute prediction pipeline for product input:
        - Transforms feature vector
        - Predicts demand, sales units, revenue
        - Evaluates optimal future price curve
        - Classifies performance tier
        - Calculates market growth momentum
        - Retrieves actual historical benchmarks if product is in dataset
        """
        product_name = input_data.get("product_name", "Custom Product").strip()
        category = input_data.get("category", "General")
        price = float(input_data.get("price", 1000.0))
        competitor_price = float(input_data.get("competitor_price", price))
        rating = float(input_data.get("rating", 4.2))
        market_trend_input = input_data.get("market_trend", "Stable")
        month = int(input_data.get("month", 11))
        chosen_model_name = input_data.get("model_name", None)  # None for auto-best

        # Transform inputs into feature matrix
        X_vec = self.trainer.preprocessor.transform_single_input({
            "price": price,
            "competitor_price": competitor_price,
            "rating": rating,
            "category": category,
            "market_trend": market_trend_input,
            "month": month
        })

        # 1. Predict Demand (units)
        demand_model_used = chosen_model_name or self.trainer.best_models.get("demand", "Random Forest")
        predicted_demand_units = self.trainer.predict_target("demand", X_vec, demand_model_used)
        predicted_demand_units = int(round(max(predicted_demand_units, 10.0)))

        # 2. Predict Sales Quantity (units)
        sales_model_used = chosen_model_name or self.trainer.best_models.get("sales_quantity", "Random Forest")
        predicted_sales_units = self.trainer.predict_target("sales_quantity", X_vec, sales_model_used)
        # Physical constraint: sales cannot exceed demand
        predicted_sales_units = int(round(min(predicted_sales_units, predicted_demand_units)))
        predicted_sales_units = max(predicted_sales_units, 5)

        # 3. Expected Total Revenue (₹)
        expected_sales_revenue = float(round(price * predicted_sales_units, 2))

        # 4. Future / Recommended Optimal Price Simulation
        # Simulate revenue at 5 price points (-20%, -10%, current, +10%, +20%)
        price_simulations = []
        best_sim_revenue = 0.0
        optimal_price = price

        for delta in [-0.20, -0.10, 0.0, 0.10, 0.20]:
            test_p = round(price * (1 + delta), 2)
            sim_X = self.trainer.preprocessor.transform_single_input({
                "price": test_p,
                "competitor_price": competitor_price,
                "rating": rating,
                "category": category,
                "market_trend": market_trend_input,
                "month": month
            })
            sim_sales = self.trainer.predict_target("sales_quantity", sim_X, sales_model_used)
            sim_rev = round(test_p * sim_sales, 2)
            price_simulations.append({
                "price": test_p,
                "label": f"{'+' if delta > 0 else ''}{int(delta*100)}%",
                "expected_sales": int(round(sim_sales)),
                "expected_revenue": sim_rev
            })
            if sim_rev > best_sim_revenue:
                best_sim_revenue = sim_rev
                optimal_price = test_p

        # 5. Market Growth Trend Calculation
        price_ratio = price / competitor_price if competitor_price > 0 else 1.0
        if price_ratio < 0.93 and rating >= 4.2:
            growth_trend = "Strong Growth (High Competitiveness)"
            trend_direction = "Increasing"
            trend_badge = "success"
        elif price_ratio <= 1.05 and rating >= 3.8:
            growth_trend = "Stable Growth (Balanced Positioning)"
            trend_direction = "Stable"
            trend_badge = "info"
        else:
            growth_trend = "Declining / Market Pressure"
            trend_direction = "Declining"
            trend_badge = "warning"

        # 6. Product Performance Tier
        if predicted_demand_units >= 800 and rating >= 4.4:
            performance_tier = "Top Tier Leader"
            tier_desc = "High market demand with excellent consumer sentiment."
            tier_badge = "success"
        elif predicted_demand_units >= 400:
            performance_tier = "Moderate Contender"
            tier_desc = "Steady sales volume with good baseline market viability."
            tier_badge = "info"
        elif expected_sales_revenue >= 1000000:
            performance_tier = "High-Value Premium"
            tier_desc = "Lower volume offset by high unit price and strong margins."
            tier_badge = "primary"
        else:
            performance_tier = "Needs Optimization"
            tier_desc = "Subdued demand; consider competitive price revision or marketing boost."
            tier_badge = "warning"

        # 7. Actual Historical Benchmark Comparison (if exists)
        historical_comparison = None
        if historical_df is not None and not historical_df.empty:
            matches = historical_df[historical_df["product_name"].astype(str).str.strip().str.lower() == product_name.lower()]
            if not matches.empty:
                hist_avg_demand = int(round(matches["demand"].mean()))
                hist_avg_sales = int(round(matches["sales_quantity"].mean()))
                hist_avg_price = float(round(matches["price"].mean(), 2))
                hist_avg_revenue = float(round(matches["revenue"].mean(), 2))
                hist_avg_rating = float(round(matches["rating"].mean(), 2))

                demand_diff_pct = round(((predicted_demand_units - hist_avg_demand) / hist_avg_demand) * 100, 1) if hist_avg_demand > 0 else 0
                revenue_diff_pct = round(((expected_sales_revenue - hist_avg_revenue) / hist_avg_revenue) * 100, 1) if hist_avg_revenue > 0 else 0

                historical_comparison = {
                    "is_existing": True,
                    "historical_records": len(matches),
                    "historical_avg_demand": hist_avg_demand,
                    "historical_avg_sales": hist_avg_sales,
                    "historical_avg_price": hist_avg_price,
                    "historical_avg_revenue": hist_avg_revenue,
                    "historical_avg_rating": hist_avg_rating,
                    "demand_change_pct": demand_diff_pct,
                    "revenue_change_pct": revenue_diff_pct,
                    "demand_delta_label": f"{'+' if demand_diff_pct >= 0 else ''}{demand_diff_pct}% vs historical avg",
                    "revenue_delta_label": f"{'+' if revenue_diff_pct >= 0 else ''}{revenue_diff_pct}% vs historical avg"
                }
            else:
                historical_comparison = {
                    "is_existing": False,
                    "note": "New / unrecorded product in historical dataset. Predictions generated via generalized category & price regression model."
                }

        # 8. Honest Model Accuracy / Evaluation Metrics
        demand_metrics = self.trainer.metrics.get("demand", {}).get(demand_model_used, {})
        sales_metrics = self.trainer.metrics.get("sales_quantity", {}).get(sales_model_used, {})

        model_eval_details = {
            "demand_model": demand_model_used,
            "demand_r2_score": demand_metrics.get("r2", 0.0),
            "demand_mae": demand_metrics.get("mae", 0.0),
            "demand_rmse": demand_metrics.get("rmse", 0.0),
            "demand_accuracy_pct": demand_metrics.get("accuracy_pct", 0.0),
            "sales_model": sales_model_used,
            "sales_r2_score": sales_metrics.get("r2", 0.0),
            "sales_mae": sales_metrics.get("mae", 0.0),
            "disclaimer": "Predictions are machine learning statistical approximations trained on validated test data. Market conditions, unexpected shocks, and advertising spend may influence real-world outcomes."
        }

        # Currency formatted string for Indian Rupees
        formatted_revenue = self._format_inr(expected_sales_revenue)
        formatted_price = self._format_inr(price)
        formatted_optimal_price = self._format_inr(optimal_price)

        return {
            "product_name": product_name,
            "category": category,
            "input_price": price,
            "formatted_input_price": formatted_price,
            "competitor_price": competitor_price,
            "rating": rating,
            "predicted_demand": predicted_demand_units,
            "expected_sales_quantity": predicted_sales_units,
            "expected_sales_revenue": expected_sales_revenue,
            "formatted_expected_sales": formatted_revenue,
            "optimal_recommended_price": optimal_price,
            "formatted_optimal_price": formatted_optimal_price,
            "price_simulations": price_simulations,
            "growth_trend": growth_trend,
            "market_trend": trend_direction,
            "trend_badge": trend_badge,
            "performance_tier": performance_tier,
            "tier_description": tier_desc,
            "tier_badge": tier_badge,
            "historical_comparison": historical_comparison,
            "model_evaluation": model_eval_details
        }

    @staticmethod
    def _format_inr(number: float) -> str:
        """Format number into Indian Rupee notation (e.g. ₹2,50,000 or ₹42,999)."""
        num_int = int(round(number))
        s = str(num_int)
        if len(s) <= 3:
            return f"₹{s}"
        last_three = s[-3:]
        remaining = s[:-3]
        groups = []
        while remaining:
            groups.append(remaining[-2:])
            remaining = remaining[:-2]
        groups.reverse()
        formatted = ",".join(groups) + "," + last_three
        return f"₹{formatted}"

