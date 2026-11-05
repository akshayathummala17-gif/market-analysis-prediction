"""
AI-Based Market Product Analysis and Prediction System
Main Flask Application Server
"""

import os
import sys
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

from dataset_manager import DatasetManager
from model_trainer import ModelTrainer
from predictor import Predictor

app = Flask(__name__)
CORS(app)

# Initialize application components
dataset_manager = DatasetManager()
model_trainer = ModelTrainer()

# Attempt to load existing trained models; if missing, train on active dataset
if not model_trainer.load_models():
    print("[Flask] No existing models found. Initiating training on active dataset...")
    df_init = dataset_manager.get_active_dataset()
    model_trainer.train_all_models(df_init)
else:
    print("[Flask] Existing models successfully loaded from disk.")

predictor = Predictor(model_trainer)


# -------------------------------------------------------------
# Frontend Route
# -------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


# -------------------------------------------------------------
# API: Dataset Overview & Summary
# -------------------------------------------------------------
@app.route("/api/overview", methods=["GET"])
def get_overview():
    try:
        stats = dataset_manager.get_summary_stats()
        # Add best model R2 info
        best_r2 = 0.0
        if "demand" in model_trainer.best_models:
            best_name = model_trainer.best_models["demand"]
            best_r2 = model_trainer.metrics.get("demand", {}).get(best_name, {}).get("r2", 0.0)
        stats["best_model_r2"] = round(best_r2 * 100, 1)
        stats["last_trained"] = model_trainer.last_trained_at or "Ready"
        return jsonify({"success": True, "data": stats})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# -------------------------------------------------------------
# API: Dataset Records with Pagination & Filtering
# -------------------------------------------------------------
@app.route("/api/dataset/records", methods=["GET"])
def get_dataset_records():
    try:
        df = dataset_manager.get_active_dataset()
        category = request.args.get("category", "").strip()
        search = request.args.get("search", "").strip()
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 15))

        filtered_df = df.copy()
        if category and "category" in filtered_df.columns:
            filtered_df = filtered_df[filtered_df["category"].str.lower() == category.lower()]

        if search and "product_name" in filtered_df.columns:
            filtered_df = filtered_df[filtered_df["product_name"].str.contains(search, case=False, na=False)]

        total_records = len(filtered_df)
        total_pages = max(1, (total_records + page_size - 1) // page_size)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size

        page_records = filtered_df.iloc[start_idx:end_idx].fillna("").to_dict(orient="records")

        return jsonify({
            "success": True,
            "data": {
                "records": page_records,
                "total_records": total_records,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "columns": list(df.columns)
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# -------------------------------------------------------------
# API: Upload Dataset (CSV / Excel)
# -------------------------------------------------------------
@app.route("/api/dataset/upload", methods=["POST"])
def upload_dataset():
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file uploaded. Please choose a CSV or Excel file."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "error": "Empty filename provided."}), 400

    upload_result = dataset_manager.handle_upload(file)
    if not upload_result.get("success"):
        return jsonify(upload_result), 400

    # Retrain models with new dataset
    try:
        df_new = dataset_manager.get_active_dataset()
        train_summary = model_trainer.train_all_models(df_new)
        upload_result["training_summary"] = train_summary
        return jsonify(upload_result)
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"File uploaded, but model retraining failed: {str(e)}"
        }), 500


# -------------------------------------------------------------
# API: Reset to Sample Dataset
# -------------------------------------------------------------
@app.route("/api/dataset/reset", methods=["POST"])
def reset_dataset():
    try:
        reset_res = dataset_manager.reset_to_sample()
        df_sample = dataset_manager.get_active_dataset()
        train_summary = model_trainer.train_all_models(df_sample)
        reset_res["training_summary"] = train_summary
        return jsonify({"success": True, "data": reset_res})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# -------------------------------------------------------------
# API: Market Overview Analytics
# -------------------------------------------------------------
@app.route("/api/analytics/market-overview", methods=["GET"])
def get_market_overview():
    try:
        df = dataset_manager.get_active_dataset()
        eda = model_trainer.preprocessor.compute_eda_summary(df)

        return jsonify({
            "success": True,
            "data": {
                "category_breakdown": eda.get("category_breakdown", []),
                "monthly_trends": eda.get("monthly_trends", []),
                "market_trend_distribution": eda.get("market_trend_distribution", {}),
                "top_products": eda.get("top_products", []),
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# -------------------------------------------------------------
# API: Product Analysis Deep Dive
# -------------------------------------------------------------
@app.route("/api/analytics/product-analysis", methods=["GET"])
def get_product_analysis():
    try:
        df = dataset_manager.get_active_dataset()
        selected_prod = request.args.get("product_name", "").strip()

        # Unique products list for dropdowns
        products_list = []
        if "product_name" in df.columns:
            prods = df[["product_name", "category", "price", "rating", "competitor_price"]].drop_duplicates(subset=["product_name"]).to_dict(orient="records")
            products_list = prods

        # Price vs Demand scatter samples (first 80 points)
        scatter_points = []
        if "price" in df.columns and "demand" in df.columns:
            sample_df = df.sample(min(80, len(df)), random_state=42)
            scatter_points = [
                {
                    "x": float(row["price"]),
                    "y": float(row["demand"]),
                    "product": str(row.get("product_name", "")),
                    "category": str(row.get("category", ""))
                }
                for _, row in sample_df.iterrows()
            ]

        # Ratings vs Sales scatter samples
        rating_scatter = []
        if "rating" in df.columns and "sales_quantity" in df.columns:
            sample_df = df.sample(min(80, len(df)), random_state=42)
            rating_scatter = [
                {
                    "x": float(row["rating"]),
                    "y": float(row["sales_quantity"]),
                    "product": str(row.get("product_name", ""))
                }
                for _, row in sample_df.iterrows()
            ]

        # Specific product details if requested
        product_detail = None
        if selected_prod:
            matches = df[df["product_name"].str.lower() == selected_prod.lower()]
            if not matches.empty:
                product_detail = {
                    "product_name": selected_prod,
                    "category": str(matches["category"].iloc[0]),
                    "latest_price": float(matches["price"].iloc[-1]),
                    "latest_competitor_price": float(matches["competitor_price"].iloc[-1]),
                    "avg_rating": float(round(matches["rating"].mean(), 2)),
                    "total_sales_units": int(matches["sales_quantity"].sum()),
                    "avg_monthly_demand": int(round(matches["demand"].mean())),
                    "total_revenue": float(matches["revenue"].sum()),
                    "history": matches[["date", "price", "competitor_price", "demand", "sales_quantity"]].to_dict(orient="records")
                }

        return jsonify({
            "success": True,
            "data": {
                "products_catalog": products_list,
                "price_vs_demand": scatter_points,
                "rating_vs_sales": rating_scatter,
                "product_detail": product_detail
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# -------------------------------------------------------------
# API: Statistical Correlation Matrix & EDA
# -------------------------------------------------------------
@app.route("/api/analytics/correlations", methods=["GET"])
def get_correlations():
    try:
        df = dataset_manager.get_active_dataset()
        corr_data = model_trainer.preprocessor.compute_correlations(df)
        return jsonify({"success": True, "data": corr_data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# -------------------------------------------------------------
# API: Model Performance & Live Evaluation
# -------------------------------------------------------------
@app.route("/api/models/performance", methods=["GET"])
def get_model_performance():
    try:
        return jsonify({
            "success": True,
            "data": {
                "metrics": model_trainer.metrics,
                "best_models": model_trainer.best_models,
                "feature_names": model_trainer.feature_names,
                "last_trained_at": model_trainer.last_trained_at,
                "training_test_split": "80% Training / 20% Testing (Zero Data Leakage)"
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# -------------------------------------------------------------
# API: Model Retraining
# -------------------------------------------------------------
@app.route("/api/models/retrain", methods=["POST"])
def retrain_models():
    try:
        df = dataset_manager.get_active_dataset()
        summary = model_trainer.train_all_models(df)
        return jsonify({"success": True, "data": summary})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# -------------------------------------------------------------
# API: Interactive Prediction Endpoint
# -------------------------------------------------------------
@app.route("/api/predict", methods=["POST"])
def run_prediction():
    try:
        req_data = request.get_json() or {}
        df = dataset_manager.get_active_dataset()
        result = predictor.predict_product_performance(req_data, historical_df=df)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# -------------------------------------------------------------
# API: Actual vs Predicted Test Data for Visual Backtesting
# -------------------------------------------------------------
@app.route("/api/predict/actual-vs-predicted", methods=["GET"])
def get_actual_vs_predicted():
    try:
        target = request.args.get("target", "demand")
        preds = model_trainer.test_predictions.get(target, {})
        return jsonify({
            "success": True,
            "data": {
                "target": target,
                "labels": preds.get("labels", []),
                "actual": preds.get("actual", []),
                "predictions": preds.get("predictions", {})
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# -------------------------------------------------------------
# Main Application Entrypoint
# -------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"============================================================")
    print(f" AI-Based Market Product Analysis and Prediction System")
    print(f" Server running at: http://127.0.0.1:{port}")
    print(f"============================================================")
    app.run(host="0.0.0.0", port=port, debug=False)

