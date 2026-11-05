"""
Data Preprocessing & EDA Module
Performs data cleaning, missing value imputation, outlier detection,
feature engineering, categorical encoding, and correlation analysis.
"""

import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, List
from sklearn.preprocessing import OneHotEncoder, StandardScaler


class DataPreprocessor:
    def __init__(self):
        self.encoder = None
        self.scaler = None
        self.feature_columns = []
        self.categorical_columns = ["category", "market_trend"]
        self.numerical_columns = ["price", "competitor_price", "rating", "price_diff", "price_ratio", "month", "quarter"]
        self.imputation_values = {}
        self.categories_list = []
        self.trends_list = []

    def clean_data(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Clean raw DataFrame:
        - Remove duplicate records
        - Impute missing values with robust statistics
        - Return cleaned DataFrame and a report of changes made
        """
        df_clean = df.copy()
        report = {
            "initial_rows": len(df_clean),
            "duplicates_removed": 0,
            "missing_values_imputed": {},
            "outliers_detected": {},
        }

        # 1. Remove duplicate records
        duplicates = df_clean.duplicated().sum()
        if duplicates > 0:
            df_clean = df_clean.drop_duplicates().reset_index(drop=True)
            report["duplicates_removed"] = int(duplicates)

        # 2. Handle missing values
        num_cols = ["price", "sales_quantity", "demand", "rating", "competitor_price", "revenue"]
        cat_cols = ["product_name", "category", "market_trend"]

        for col in num_cols:
            if col in df_clean.columns:
                null_count = int(df_clean[col].isnull().sum())
                if null_count > 0:
                    median_val = float(df_clean[col].median())
                    if pd.isna(median_val):
                        median_val = 0.0
                    df_clean[col] = df_clean[col].fillna(median_val)
                    self.imputation_values[col] = median_val
                    report["missing_values_imputed"][col] = {
                        "count": null_count,
                        "imputed_with": "median",
                        "value": round(median_val, 2)
                    }

        for col in cat_cols:
            if col in df_clean.columns:
                null_count = int(df_clean[col].isnull().sum())
                if null_count > 0:
                    mode_series = df_clean[col].mode()
                    mode_val = mode_series[0] if not mode_series.empty else "Unknown"
                    df_clean[col] = df_clean[col].fillna(mode_val)
                    self.imputation_values[col] = mode_val
                    report["missing_values_imputed"][col] = {
                        "count": null_count,
                        "imputed_with": "mode",
                        "value": str(mode_val)
                    }

        # Date handling
        if "date" in df_clean.columns:
            df_clean["date"] = pd.to_datetime(df_clean["date"], errors="coerce")
            # If dates failed, fill with default sequence
            if df_clean["date"].isnull().any():
                df_clean["date"] = df_clean["date"].bfill().ffill()

        # Recalculate revenue if missing or zero
        if "revenue" in df_clean.columns and (df_clean["revenue"] == 0).all():
            df_clean["revenue"] = df_clean["price"] * df_clean["sales_quantity"]

        # 3. Detect Outliers (IQR Method)
        for col in ["price", "sales_quantity", "demand"]:
            if col in df_clean.columns:
                q1 = df_clean[col].quantile(0.25)
                q3 = df_clean[col].quantile(0.75)
                iqr = q3 - q1
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                outliers = df_clean[(df_clean[col] < lower_bound) | (df_clean[col] > upper_bound)]
                report["outliers_detected"][col] = {
                    "count": int(len(outliers)),
                    "lower_bound": round(float(lower_bound), 2),
                    "upper_bound": round(float(upper_bound), 2),
                    "iqr": round(float(iqr), 2)
                }

        report["final_rows"] = len(df_clean)
        return df_clean, report

    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create domain-specific predictive features:
        - price_diff: competitor_price - price
        - price_ratio: price / competitor_price
        - month, quarter, is_q4
        """
        df_feat = df.copy()

        # Price competitiveness
        if "competitor_price" in df_feat.columns and "price" in df_feat.columns:
            df_feat["price_diff"] = df_feat["competitor_price"] - df_feat["price"]
            df_feat["price_ratio"] = (df_feat["price"] / df_feat["competitor_price"].replace(0, 1)).round(4)
        else:
            df_feat["price_diff"] = 0.0
            df_feat["price_ratio"] = 1.0

        # Temporal features
        if "date" in df_feat.columns:
            date_dt = pd.to_datetime(df_feat["date"])
            df_feat["month"] = date_dt.dt.month
            df_feat["quarter"] = date_dt.dt.quarter
            df_feat["is_q4"] = (date_dt.dt.month.isin([10, 11, 12])).astype(int)
        else:
            df_feat["month"] = 1
            df_feat["quarter"] = 1
            df_feat["is_q4"] = 0

        return df_feat

    def fit_transform_features(self, df: pd.DataFrame) -> Tuple[np.ndarray, List[str]]:
        """
        Fit categorical encoder and prepare full numerical feature matrix X.
        Returns:
            X: 2D numpy array of engineered and encoded features
            feature_names: List of all column names in X
        """
        df_feat = self.engineer_features(df)

        # Store distinct categories and trends
        self.categories_list = sorted(list(df_feat["category"].astype(str).unique()))
        self.trends_list = sorted(list(df_feat["market_trend"].astype(str).unique()))

        # One-Hot Encoding for categorical variables
        self.encoder = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
        cat_encoded = self.encoder.fit_transform(df_feat[self.categorical_columns].astype(str))
        cat_feature_names = list(self.encoder.get_feature_names_out(self.categorical_columns))

        # Numerical feature matrix
        num_matrix = df_feat[self.numerical_columns].fillna(0).values

        # Combine
        X = np.hstack([num_matrix, cat_encoded])
        self.feature_columns = self.numerical_columns + cat_feature_names

        return X, self.feature_columns

    def transform_single_input(self, input_dict: dict) -> np.ndarray:
        """
        Transform a single product record/scenario into model-ready feature vector.
        input_dict keys:
            price, competitor_price, rating, category, market_trend, month (optional)
        """
        price = float(input_dict.get("price", 1000.0))
        competitor_price = float(input_dict.get("competitor_price", price))
        rating = float(input_dict.get("rating", 4.2))
        category = str(input_dict.get("category", self.categories_list[0] if self.categories_list else "General"))
        market_trend = str(input_dict.get("market_trend", "Stable"))
        month = int(input_dict.get("month", 10))
        quarter = (month - 1) // 3 + 1

        price_diff = competitor_price - price
        price_ratio = round(price / (competitor_price if competitor_price > 0 else 1.0), 4)

        # Numerical vector
        num_vec = np.array([[price, competitor_price, rating, price_diff, price_ratio, month, quarter]])

        # Categorical vector
        if self.encoder is not None:
            cat_df = pd.DataFrame([{"category": category, "market_trend": market_trend}])
            cat_vec = self.encoder.transform(cat_df)
            X = np.hstack([num_vec, cat_vec])
        else:
            X = num_vec

        return X

    def compute_correlations(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Calculate Pearson correlation matrix between key product metrics
        and return formatted matrix + natural language insights.
        """
        target_cols = ["price", "competitor_price", "sales_quantity", "demand", "rating", "revenue"]
        available_cols = [c for c in target_cols if c in df.columns]

        if len(available_cols) < 2:
            return {"columns": [], "matrix": [], "insights": []}

        corr_df = df[available_cols].corr().round(3)

        # Format for frontend heatmap/table
        matrix_data = []
        for row_col in available_cols:
            row_dict = {"metric": row_col}
            for col in available_cols:
                row_dict[col] = float(corr_df.loc[row_col, col])
            matrix_data.append(row_dict)

        # Generate business insights based on correlations
        insights = []
        if "price" in available_cols and "demand" in available_cols:
            p_d_corr = float(corr_df.loc["price", "demand"])
            if p_d_corr < -0.3:
                insights.append({
                    "title": "Strong Price Sensitivity",
                    "text": f"Negative correlation ({p_d_corr:.2f}) between price and demand confirms market price elasticity. Premium pricing requires stronger brand positioning or value addition."
                })
            else:
                insights.append({
                    "title": "Inelastic Demand",
                    "text": f"Moderate correlation ({p_d_corr:.2f}) indicates customers are relatively price-insensitive or products hold high essential utility."
                })

        if "rating" in available_cols and "sales_quantity" in available_cols:
            r_s_corr = float(corr_df.loc["rating", "sales_quantity"])
            if r_s_corr > 0.2:
                insights.append({
                    "title": "Rating Multiplier Effect",
                    "text": f"Positive correlation (+{r_s_corr:.2f}) between customer rating and sales volume confirms high social proof directly elevates conversions."
                })

        if "sales_quantity" in available_cols and "demand" in available_cols:
            s_d_corr = float(corr_df.loc["sales_quantity", "demand"])
            insights.append({
                "title": "Demand Fulfillment Alignment",
                "text": f"Sales quantity tightly tracks demand (+{s_d_corr:.2f}), showing efficient inventory replenishment and minimal stockout drag."
            })

        return {
            "columns": available_cols,
            "matrix": matrix_data,
            "insights": insights
        }

    def compute_eda_summary(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate comprehensive exploratory data analysis metrics."""
        summary = {}

        # 1. Descriptive stats
        numeric_cols = ["price", "sales_quantity", "demand", "rating", "revenue"]
        valid_num_cols = [c for c in numeric_cols if c in df.columns]
        desc = df[valid_num_cols].describe().round(2).to_dict()
        summary["descriptive_stats"] = desc

        # 2. Category Breakdown
        if "category" in df.columns:
            cat_group = df.groupby("category").agg(
                total_revenue=("revenue", "sum"),
                avg_demand=("demand", "mean"),
                avg_sales=("sales_quantity", "sum"),
                avg_price=("price", "mean"),
                avg_rating=("rating", "mean"),
                product_count=("product_name", "nunique")
            ).round(2).reset_index()
            summary["category_breakdown"] = cat_group.to_dict(orient="records")
        else:
            summary["category_breakdown"] = []

        # 3. Monthly Trends
        if "date" in df.columns:
            try:
                df_temp = df.copy()
                df_temp["year_month"] = pd.to_datetime(df_temp["date"]).dt.strftime("%Y-%m")
                monthly = df_temp.groupby("year_month").agg(
                    total_sales=("sales_quantity", "sum"),
                    total_demand=("demand", "sum"),
                    total_revenue=("revenue", "sum"),
                    avg_price=("price", "mean")
                ).round(2).reset_index()
                summary["monthly_trends"] = monthly.to_dict(orient="records")
            except Exception:
                summary["monthly_trends"] = []
        else:
            summary["monthly_trends"] = []

        # 4. Top 10 Performing Products (by revenue)
        if "product_name" in df.columns:
            top_prods = df.groupby(["product_name", "category"]).agg(
                total_revenue=("revenue", "sum"),
                total_units_sold=("sales_quantity", "sum"),
                avg_rating=("rating", "mean"),
                avg_price=("price", "mean")
            ).round(2).reset_index().sort_values(by="total_revenue", ascending=False).head(10)
            summary["top_products"] = top_prods.to_dict(orient="records")
        else:
            summary["top_products"] = []

        # 5. Market Trend Distribution
        if "market_trend" in df.columns:
            trend_counts = df["market_trend"].value_counts().to_dict()
            summary["market_trend_distribution"] = trend_counts
        else:
            summary["market_trend_distribution"] = {}

        return summary

