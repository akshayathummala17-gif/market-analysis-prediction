"""
Dataset Manager Module
Handles sample dataset generation, file uploads (CSV / Excel),
column mapping & normalization, and dataset state management.
"""

import os
import re
import numpy as np
import pandas as pd
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
SAMPLE_DATA_PATH = os.path.join(DATA_DIR, "sample_market_data.csv")
UPLOADED_DATA_PATH = os.path.join(DATA_DIR, "uploaded_market_data.csv")
ACTIVE_DATA_INFO_PATH = os.path.join(DATA_DIR, "active_dataset_info.json")

# Standardized schema expected by the application
STANDARD_COLUMNS = [
    "product_name",
    "category",
    "price",
    "sales_quantity",
    "demand",
    "rating",
    "competitor_price",
    "date",
    "market_trend",
    "revenue",
]

# Fuzzy matching aliases for user uploads
COLUMN_ALIASES = {
    "product_name": ["product_name", "product", "item_name", "item", "productname", "title", "name"],
    "category": ["category", "product_category", "productcategory", "dept", "department", "segment", "type"],
    "price": ["price", "product_price", "productprice", "unit_price", "unitprice", "selling_price", "mrp", "cost"],
    "sales_quantity": ["sales_quantity", "salesquantity", "sales", "units_sold", "quantity", "units", "volume", "sales_units"],
    "demand": ["demand", "product_demand", "productdemand", "demand_index", "market_demand", "estimated_demand"],
    "rating": ["rating", "customer_rating", "customerrating", "customer_ratings", "reviews_rating", "score", "stars"],
    "competitor_price": ["competitor_price", "competitorprice", "comp_price", "market_price", "rival_price"],
    "date": ["date", "order_date", "transaction_date", "sale_date", "timestamp", "period", "month"],
    "market_trend": ["market_trend", "markettrend", "trend", "growth_trend", "growth", "market_growth"],
    "revenue": ["revenue", "total_revenue", "sales_value", "total_sales", "turnover", "gross_sales"],
}


class DatasetManager:
    def __init__(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        os.makedirs(os.path.join(DATA_DIR, "models"), exist_ok=True)
        self.active_path = None
        self._initialize_dataset()

    def _initialize_dataset(self):
        """Ensure sample data exists and initialize the active dataset."""
        if not os.path.exists(SAMPLE_DATA_PATH):
            self.generate_sample_dataset()

        # If an uploaded dataset exists, default to it; otherwise use sample
        if os.path.exists(UPLOADED_DATA_PATH):
            self.active_path = UPLOADED_DATA_PATH
        else:
            self.active_path = SAMPLE_DATA_PATH

    def generate_sample_dataset(self, num_records_target: int = 1200) -> pd.DataFrame:
        """
        Generate a rich, realistic market product dataset across diverse categories
        spanning 24 months (Nov 2024 - Oct 2026).
        Incorporates realistic economic dynamics:
        - Price elasticity (higher price reduces demand, discounted price vs competitor boosts sales)
        - Rating impact (higher rating boosts demand and sales)
        - Seasonality (electronics peak in Q4 holiday season, fitness in Jan/Feb, fashion seasonal shifts)
        """
        np.random.seed(42)

        products_catalog = [
            # Electronics
            {"name": "Wireless Noise-Cancelling Headphones", "category": "Electronics", "base_price": 7999, "base_demand": 620, "base_rating": 4.6},
            {"name": "Ultra-Slim 14-inch Laptop", "category": "Electronics", "base_price": 54999, "base_demand": 210, "base_rating": 4.5},
            {"name": "Smartwatch Pro Series 5", "category": "Electronics", "base_price": 9999, "base_demand": 540, "base_rating": 4.4},
            {"name": "4K Ultra-HD Smart OLED TV 55", "category": "Electronics", "base_price": 42999, "base_demand": 280, "base_rating": 4.7},
            {"name": "Mechanical RGB Gaming Keyboard", "category": "Electronics", "base_price": 3499, "base_demand": 750, "base_rating": 4.3},
            {"name": "True Wireless Earbuds ANC", "category": "Electronics", "base_price": 2999, "base_demand": 920, "base_rating": 4.5},
            {"name": "Portable Bluetooth Speaker 20W", "category": "Electronics", "base_price": 2499, "base_demand": 810, "base_rating": 4.2},
            {"name": "1TB High-Speed External SSD", "category": "Electronics", "base_price": 6499, "base_demand": 430, "base_rating": 4.8},

            # Fashion & Apparel
            {"name": "Premium Cotton Oxford Casual Shirt", "category": "Fashion", "base_price": 1499, "base_demand": 1150, "base_rating": 4.3},
            {"name": "Pro Running Athletic Shoes", "category": "Fashion", "base_price": 3299, "base_demand": 780, "base_rating": 4.6},
            {"name": "Waterproof All-Weather Windbreaker", "category": "Fashion", "base_price": 2899, "base_demand": 610, "base_rating": 4.4},
            {"name": "Slim-Fit Stretch Denim Jeans", "category": "Fashion", "base_price": 1899, "base_demand": 940, "base_rating": 4.1},
            {"name": "Polarized UV Aviator Sunglasses", "category": "Fashion", "base_price": 1299, "base_demand": 890, "base_rating": 4.5},
            {"name": "Genuine Leather Bifold Wallet", "category": "Fashion", "base_price": 999, "base_demand": 1050, "base_rating": 4.2},

            # Home & Kitchen
            {"name": "Digital Air Fryer Pro 5.5L", "category": "Home & Kitchen", "base_price": 4999, "base_demand": 640, "base_rating": 4.7},
            {"name": "Robot Vacuum & Mop Cleaner", "category": "Home & Kitchen", "base_price": 19999, "base_demand": 320, "base_rating": 4.4},
            {"name": "Espresso Coffee Machine 15-Bar", "category": "Home & Kitchen", "base_price": 8499, "base_demand": 410, "base_rating": 4.6},
            {"name": "Stainless Steel 5-Piece Cookware", "category": "Home & Kitchen", "base_price": 3799, "base_demand": 530, "base_rating": 4.3},
            {"name": "True HEPA Air Purifier Room", "category": "Home & Kitchen", "base_price": 7299, "base_demand": 470, "base_rating": 4.5},
            {"name": "Ergonomic Memory Foam Bed Pillow", "category": "Home & Kitchen", "base_price": 1599, "base_demand": 890, "base_rating": 4.4},

            # Health & Personal Care
            {"name": "Sonic Electric Toothbrush Rechargeable", "category": "Health & Personal Care", "base_price": 1899, "base_demand": 720, "base_rating": 4.6},
            {"name": "Deep Tissue Percussion Massage Gun", "category": "Health & Personal Care", "base_price": 3499, "base_demand": 510, "base_rating": 4.5},
            {"name": "Organic Vitamin C Radiance Serum", "category": "Health & Personal Care", "base_price": 799, "base_demand": 1420, "base_rating": 4.3},
            {"name": "Smart Bluetooth Body Fat Scale", "category": "Health & Personal Care", "base_price": 1699, "base_demand": 680, "base_rating": 4.4},
            {"name": "Multi-Grooming Cordless Beard Trimmer", "category": "Health & Personal Care", "base_price": 1399, "base_demand": 990, "base_rating": 4.2},

            # Sports & Fitness
            {"name": "Non-Slip Eco Alignment Yoga Mat", "category": "Sports & Fitness", "base_price": 1199, "base_demand": 860, "base_rating": 4.7},
            {"name": "Adjustable Quick-Select Dumbbell Pair", "category": "Sports & Fitness", "base_price": 8999, "base_demand": 340, "base_rating": 4.8},
            {"name": "Heavy Duty Resistance Bands 5-Set", "category": "Sports & Fitness", "base_price": 799, "base_demand": 1280, "base_rating": 4.4},
            {"name": "Double-Wall Insulated Steel Flask 1L", "category": "Sports & Fitness", "base_price": 899, "base_demand": 1100, "base_rating": 4.5},
            {"name": "Ergonomic Road Cycling Helmet", "category": "Sports & Fitness", "base_price": 2299, "base_demand": 490, "base_rating": 4.3},
        ]

        # 24 monthly periods
        date_range = pd.date_range(start="2024-11-01", end="2026-10-01", freq="MS")

        rows = []
        for dt in date_range:
            month = dt.month
            year = dt.year
            # Seasonal factor
            # Q4 (Oct, Nov, Dec) holiday bump (festival shopping in India/Global)
            # Jan New Year bump for fitness & health
            # May-June summer
            q4_boost = 1.30 if month in [10, 11, 12] else 1.0
            jan_fitness_boost = 1.45 if month == 1 else 1.0
            summer_boost = 1.20 if month in [5, 6] else 1.0

            for prod in products_catalog:
                cat = prod["category"]
                cat_mult = 1.0
                if cat == "Electronics":
                    cat_mult = q4_boost
                elif cat == "Sports & Fitness" or cat == "Health & Personal Care":
                    cat_mult = jan_fitness_boost if month == 1 else (1.1 if month in [2, 3] else 1.0)
                elif cat == "Fashion":
                    cat_mult = max(q4_boost * 0.95, summer_boost if month in [5, 6] else 1.0)
                elif cat == "Home & Kitchen":
                    cat_mult = 1.25 if month in [10, 11] else 1.0

                # Slight inflation/market trend over 2 years (+4% annual)
                year_trend = 1.0 + (year - 2024) * 0.04 + (month / 12.0) * 0.03

                # Product price with small realistic monthly promotions / fluctuation (+- 7%)
                price_fluct = np.random.uniform(-0.06, 0.05)
                price = int(round(prod["base_price"] * (1 + price_fluct) / 10) * 10)

                # Competitor price generally within 85% to 115% of product base price
                comp_ratio = np.random.uniform(0.88, 1.14)
                competitor_price = int(round(prod["base_price"] * comp_ratio / 10) * 10)

                # Customer rating with minor periodic review variance
                rating_noise = np.random.normal(0, 0.12)
                rating = float(np.clip(round(prod["base_rating"] + rating_noise, 1), 3.4, 5.0))

                # Price competitiveness ratio: if our price < competitor, demand increases
                price_advantage = (competitor_price - price) / competitor_price
                competitiveness_factor = 1.0 + (price_advantage * 0.8)

                # Demand calculation (units that market desires)
                rating_factor = (rating / 4.0) ** 1.3
                random_noise = np.random.uniform(0.92, 1.08)

                calc_demand = int(round(prod["base_demand"] * cat_mult * year_trend * rating_factor * competitiveness_factor * random_noise))
                demand = max(int(calc_demand), 25)

                # Sales quantity is typically 80% - 95% of demand due to inventory fulfillment & cart conversion
                conversion_rate = np.random.uniform(0.82, 0.96)
                sales_quantity = max(int(round(demand * conversion_rate)), 15)

                # Total revenue
                revenue = int(price * sales_quantity)

                # Market trend determination
                if cat_mult * year_trend > 1.15 or price_advantage > 0.05:
                    trend = "Increasing"
                elif cat_mult * year_trend < 0.92 or price_advantage < -0.06:
                    trend = "Declining"
                else:
                    trend = "Stable"

                rows.append({
                    "product_name": prod["name"],
                    "category": prod["category"],
                    "price": price,
                    "sales_quantity": sales_quantity,
                    "demand": demand,
                    "rating": rating,
                    "competitor_price": competitor_price,
                    "date": dt.strftime("%Y-%m-%d"),
                    "market_trend": trend,
                    "revenue": revenue,
                })

        df = pd.DataFrame(rows)
        # Add a tiny controlled amount of realistic missing values or edge cases that preprocessor can handle
        # (e.g. 5 records with missing rating or competitor price) to demonstrate robust preprocessing
        df.loc[12, "rating"] = np.nan
        df.loc[45, "competitor_price"] = np.nan
        df.loc[88, "rating"] = np.nan

        # Save to disk
        df.to_csv(SAMPLE_DATA_PATH, index=False)
        print(f"[DatasetManager] Sample dataset generated successfully at {SAMPLE_DATA_PATH} ({len(df)} rows)")
        return df

    def get_active_dataset(self) -> pd.DataFrame:
        """Load and return the currently active dataset."""
        if not self.active_path or not os.path.exists(self.active_path):
            self._initialize_dataset()

        try:
            df = pd.read_csv(self.active_path)
            return df
        except Exception as e:
            print(f"[DatasetManager] Error reading active dataset from {self.active_path}: {e}")
            if os.path.exists(SAMPLE_DATA_PATH):
                self.active_path = SAMPLE_DATA_PATH
                return pd.read_csv(SAMPLE_DATA_PATH)
            return self.generate_sample_dataset()

    def reset_to_sample(self) -> dict:
        """Reset the active dataset to the default sample dataset."""
        if os.path.exists(UPLOADED_DATA_PATH):
            try:
                os.remove(UPLOADED_DATA_PATH)
            except Exception:
                pass
        self.active_path = SAMPLE_DATA_PATH
        df = self.get_active_dataset()
        return {
            "status": "success",
            "message": "Reset to default sample dataset successfully.",
            "total_rows": len(df),
            "is_sample": True
        }

    def handle_upload(self, file_storage) -> dict:
        """
        Process uploaded CSV or Excel file:
        - Determine format
        - Parse into DataFrame
        - Match and standardize column names
        - Validate minimum required columns
        - Compute revenue if missing
        - Save as UPLOADED_DATA_PATH
        """
        filename = file_storage.filename or "uploaded_file"
        lower_name = filename.lower()

        try:
            if lower_name.endswith(".csv"):
                df_raw = pd.read_csv(file_storage)
            elif lower_name.endswith((".xlsx", ".xls")):
                df_raw = pd.read_excel(file_storage)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported file extension in '{filename}'. Please upload a .csv, .xlsx, or .xls file."
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to parse file '{filename}': {str(e)}"
            }

        if df_raw.empty:
            return {"success": False, "error": "The uploaded file is empty."}

        # Normalize column headers
        matched_df, missing_cols, mapped_details = self._map_and_normalize_columns(df_raw)

        # Critical columns required for machine learning and core dashboard features
        critical_cols = ["product_name", "price", "sales_quantity", "demand"]
        absent_critical = [c for c in critical_cols if c in missing_cols]
        if absent_critical:
            return {
                "success": False,
                "error": f"Missing essential columns: {', '.join(absent_critical)}. "
                         f"Please ensure your file has columns for Product Name, Price, Sales, and Demand."
            }

        # If competitor_price is missing, synthesize from price +- 5%
        if "competitor_price" in missing_cols:
            matched_df["competitor_price"] = matched_df["price"] * np.random.uniform(0.95, 1.05, size=len(matched_df))

        # If category is missing, set to 'General'
        if "category" in missing_cols:
            matched_df["category"] = "General"

        # If rating is missing, set default 4.2
        if "rating" in missing_cols:
            matched_df["rating"] = 4.2

        # If date is missing, fill with current timestamp
        if "date" in missing_cols:
            matched_df["date"] = datetime.now().strftime("%Y-%m-%d")

        # If revenue missing or invalid, compute price * sales_quantity
        if "revenue" in missing_cols or matched_df["revenue"].isnull().all():
            matched_df["revenue"] = matched_df["price"] * matched_df["sales_quantity"]

        # If market_trend is missing, infer from demand
        if "market_trend" in missing_cols:
            median_demand = matched_df["demand"].median()
            matched_df["market_trend"] = matched_df["demand"].apply(
                lambda d: "Increasing" if d > median_demand * 1.1 else ("Declining" if d < median_demand * 0.9 else "Stable")
            )

        # Reorder to STANDARD_COLUMNS
        matched_df = matched_df[STANDARD_COLUMNS]

        # Save to UPLOADED_DATA_PATH
        matched_df.to_csv(UPLOADED_DATA_PATH, index=False)
        self.active_path = UPLOADED_DATA_PATH

        return {
            "success": True,
            "message": f"Successfully loaded '{filename}' ({len(matched_df)} rows).",
            "total_rows": len(matched_df),
            "columns": list(matched_df.columns),
            "column_mapping": mapped_details,
            "is_sample": False
        }

    def _map_and_normalize_columns(self, df_raw: pd.DataFrame):
        """Map fuzzy raw column headers to standard columns."""
        normalized_cols = {}
        for col in df_raw.columns:
            clean_col = re.sub(r"[^a-zA-Z0-9_]", "", str(col).strip().lower().replace(" ", "_"))
            normalized_cols[col] = clean_col

        mapping = {}
        mapped_details = {}
        found_targets = set()

        # Direct alias check
        for std_col, aliases in COLUMN_ALIASES.items():
            for orig_col, clean_col in normalized_cols.items():
                if orig_col in mapping.values():
                    continue
                if clean_col in aliases:
                    mapping[std_col] = orig_col
                    mapped_details[std_col] = orig_col
                    found_targets.add(std_col)
                    break

        # Substring fuzzy fallback for unmapped
        for std_col, aliases in COLUMN_ALIASES.items():
            if std_col in found_targets:
                continue
            for orig_col, clean_col in normalized_cols.items():
                if orig_col in mapping.values():
                    continue
                for alias in aliases:
                    if alias in clean_col or clean_col in alias:
                        mapping[std_col] = orig_col
                        mapped_details[std_col] = orig_col
                        found_targets.add(std_col)
                        break
                if std_col in found_targets:
                    break

        # Build output dataframe
        out_df = pd.DataFrame()
        for std_col in STANDARD_COLUMNS:
            if std_col in mapping:
                out_df[std_col] = df_raw[mapping[std_col]]
            else:
                out_df[std_col] = np.nan

        missing_cols = [col for col in STANDARD_COLUMNS if col not in found_targets]
        return out_df, missing_cols, mapped_details

    def get_summary_stats(self) -> dict:
        """Get high-level summary statistics of the active dataset."""
        df = self.get_active_dataset()

        is_sample = (self.active_path == SAMPLE_DATA_PATH)
        total_rows = len(df)
        total_products = df["product_name"].nunique() if "product_name" in df else 0
        categories = df["category"].dropna().unique().tolist() if "category" in df else []
        total_revenue = float(df["revenue"].sum()) if "revenue" in df else 0.0
        avg_demand = float(df["demand"].mean()) if "demand" in df else 0.0
        avg_price = float(df["price"].mean()) if "price" in df else 0.0
        avg_rating = float(df["rating"].mean()) if "rating" in df else 0.0

        # Date range
        date_min, date_max = "N/A", "N/A"
        if "date" in df and not df["date"].empty:
            try:
                date_series = pd.to_datetime(df["date"], errors="coerce")
                valid_dates = date_series.dropna()
                if not valid_dates.empty:
                    date_min = valid_dates.min().strftime("%b %Y")
                    date_max = valid_dates.max().strftime("%b %Y")
            except Exception:
                pass

        # Data health
        missing_count = int(df.isnull().sum().sum())
        duplicates_count = int(df.duplicated().sum())

        return {
            "total_rows": total_rows,
            "total_products": total_products,
            "total_categories": len(categories),
            "categories": categories,
            "total_revenue": total_revenue,
            "avg_demand": round(avg_demand, 1),
            "avg_price": round(avg_price, 2),
            "avg_rating": round(avg_rating, 2),
            "date_range": f"{date_min} to {date_max}",
            "missing_values": missing_count,
            "duplicate_records": duplicates_count,
            "is_sample": is_sample,
            "file_source": "Sample Dataset (Built-in)" if is_sample else "Uploaded Custom Dataset"
        }

