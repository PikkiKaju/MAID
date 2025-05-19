import numpy as np
import matplotlib.pyplot as plt
import io
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet
from sklearn.preprocessing import PolynomialFeatures
from sklearn.svm import SVR
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

# Utility to convert plot to SVG
def plot_to_svg(fig):
    buf = io.StringIO()
    fig.savefig(buf, format='svg')
    svg_data = buf.getvalue()
    buf.close()
    return svg_data

# Utility to format model information
def model_summary(model, X, y):
    try:
        r2_score = model.score(X, y)
        info = {
            "coefficients": model.coef_.tolist() if hasattr(model, 'coef_') else None,
            "intercept": model.intercept_ if hasattr(model, 'intercept_') else None,
            "r_squared": r2_score
        }
    except:
        info = {
            "coefficients": None,
            "intercept": None,
            "r_squared": None
        }
    return info

# =========================
# Regression Implementations
# =========================
def linear_regression(data):
    X = np.array(data.get('X')).reshape(-1, 1)
    y = np.array(data.get('y'))
    fig, ax = plt.subplots()
    model = LinearRegression().fit(X, y)
    ax.scatter(X, y, color='blue')
    ax.plot(X, model.predict(X), color='red')
    svg_image = plot_to_svg(fig)
    plt.close(fig)
    return {"svg_plot": svg_image, "model_info": model_summary(model, X, y)}

def polynomial_regression(data):
    X = np.array(data.get('X')).reshape(-1, 1)
    y = np.array(data.get('y'))
    degree = int(data.get('degree', 2))
    fig, ax = plt.subplots()
    poly = PolynomialFeatures(degree)
    X_poly = poly.fit_transform(X)
    model = LinearRegression().fit(X_poly, y)
    x_range = np.linspace(X.min(), X.max(), 100).reshape(-1, 1)
    ax.scatter(X, y, color='blue')
    ax.plot(x_range, model.predict(poly.transform(x_range)), color='red')
    svg_image = plot_to_svg(fig)
    plt.close(fig)
    return {"svg_plot": svg_image, "model_info": model_summary(model, X_poly, y)}

def ridge_regression(data):
    X = np.array(data.get('X')).reshape(-1, 1)
    y = np.array(data.get('y'))
    alpha = float(data.get('alpha', 1.0))
    fig, ax = plt.subplots()
    model = Ridge(alpha=alpha).fit(X, y)
    ax.scatter(X, y, color='blue')
    ax.plot(X, model.predict(X), color='red')
    svg_image = plot_to_svg(fig)
    plt.close(fig)
    return {"svg_plot": svg_image, "model_info": model_summary(model, X, y)}

def svr_regression(data):
    X = np.array(data.get('X')).reshape(-1, 1)
    y = np.array(data.get('y'))
    fig, ax = plt.subplots()
    model = SVR().fit(X, y)
    ax.scatter(X, y, color='blue')
    ax.plot(X, model.predict(X), color='red')
    svg_image = plot_to_svg(fig)
    plt.close(fig)
    return {"svg_plot": svg_image, "model_info": model_summary(model, X, y)}

def decision_tree_regression(data):
    X = np.array(data.get('X')).reshape(-1, 1)
    y = np.array(data.get('y'))
    fig, ax = plt.subplots()
    model = DecisionTreeRegressor().fit(X, y)
    ax.scatter(X, y, color='blue')
    x_range = np.linspace(X.min(), X.max(), 100).reshape(-1, 1)
    ax.plot(x_range, model.predict(x_range), color='red')
    svg_image = plot_to_svg(fig)
    plt.close(fig)
    return {"svg_plot": svg_image, "model_info": model_summary(model, X, y)}

def random_forest_regression(data):
    X = np.array(data.get('X')).reshape(-1, 1)
    y = np.array(data.get('y'))
    fig, ax = plt.subplots()
    model = RandomForestRegressor().fit(X, y)
    ax.scatter(X, y, color='blue')
    x_range = np.linspace(X.min(), X.max(), 100).reshape(-1, 1)
    ax.plot(x_range, model.predict(x_range), color='red')
    svg_image = plot_to_svg(fig)
    plt.close(fig)
    return {"svg_plot": svg_image, "model_info": model_summary(model, X, y)}

def gradient_boosting_regression(data):
    X = np.array(data.get('X')).reshape(-1, 1)
    y = np.array(data.get('y'))
    fig, ax = plt.subplots()
    model = GradientBoostingRegressor().fit(X, y)
    ax.scatter(X, y, color='blue')
    x_range = np.linspace(X.min(), X.max(), 100).reshape(-1, 1)
    ax.plot(x_range, model.predict(x_range), color='red')
    svg_image = plot_to_svg(fig)
    plt.close(fig)
    return {"svg_plot": svg_image, "model_info": model_summary(model, X, y)}
