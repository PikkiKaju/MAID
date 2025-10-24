import numpy as np
import matplotlib.pyplot as plt
import io
import mpl_toolkits.mplot3d
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet
from sklearn.preprocessing import PolynomialFeatures
from sklearn.svm import SVR
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from mpl_toolkits.mplot3d import Axes3D
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
    """
    Performs polynomial regression on given data.
    - Supports multiple X features (2D input)
    - Fits PolynomialFeatures and LinearRegression
    - Returns SVG plot for 1D or 2D visualization
    """

    # Extract data
    # Extract data and parameters
    X = np.array(data.get("X"))
    y = np.array(data.get("y"))
    params = data.get("params", {})
    degree = int(params.get("degree", 2))


    # Ensure X is 2D
    if X.ndim == 1:
        X = X.reshape(-1, 1)

    # Create polynomial features
    poly = PolynomialFeatures(degree=degree, include_bias=False)
    X_poly = poly.fit_transform(X)

    # Fit model
    model = LinearRegression().fit(X_poly, y)

    # Prepare plot
    fig, ax = plt.subplots()
    if X.shape[1] == 1:
        # Univariate case: easy line plot
        x_range = np.linspace(X.min(), X.max(), 200).reshape(-1, 1)
        y_pred = model.predict(poly.transform(x_range))
        ax.scatter(X, y, color='blue', label='Data')
        ax.plot(x_range, y_pred, color='red', label='Polynomial fit')
        ax.set_xlabel('X')
        ax.set_ylabel('y')
        ax.legend()
    elif X.shape[1] == 2:
        # Bivariate case: surface plot

        ax = fig.add_subplot(111, projection='3d')
        ax.scatter(X[:, 0], X[:, 1], y, color='blue', label='Data')

        # Create a grid for the surface
        x_surf, y_surf = np.meshgrid(
            np.linspace(X[:, 0].min(), X[:, 0].max(), 30),
            np.linspace(X[:, 1].min(), X[:, 1].max(), 30)
        )
        X_grid = np.column_stack((x_surf.ravel(), y_surf.ravel()))
        z_pred = model.predict(poly.transform(X_grid)).reshape(x_surf.shape)

        ax.plot_surface(x_surf, y_surf, z_pred, color='red', alpha=0.5)
        ax.set_xlabel('X1')
        ax.set_ylabel('X2')
        ax.set_zlabel('y')
    else:
        # Higher-dimensional case: cannot plot
        ax.text(0.5, 0.5, "Plot unavailable for >2 features", ha='center', va='center')
        ax.axis('off')

    # Convert plot to SVG
    svg_image = plot_to_svg(fig)
    plt.close(fig)

    # Return model info
    return {
        "svg_plot": svg_image,
        "model_info": model_summary(model, X_poly, y),
        "n_features": X.shape[1],
        "degree": degree,
        "coefficients": model.coef_.tolist(),
        "intercept": model.intercept_.item() if np.ndim(model.intercept_) == 0 else model.intercept_.tolist()
    }
def ridge_regression(data):
    """
    Performs Ridge regression on given data.

    Supports:
    - Multiple features (X can be 1D or 2D)
    - Alpha regularization parameter (default = 0.1, light regularization)
    - Visualizes results for 1D or 2D data

    Returns:
        dict with SVG plot, model info, coefficients, and intercept.
    """
    # Extract data
    X = np.array(data.get('X'))
    y = np.array(data.get('y'))
    params = data.get("params", {})
    # Light regularization by default
    alpha = float(params.get('alpha', 0.1)) # zastanawiam się czy zostawiać default

    # Ensure X is 2D
    if X.ndim == 1:
        X = X.reshape(-1, 1)

    # Fit Ridge regression model
    model = Ridge(alpha=alpha).fit(X, y)

    # Plot setup
    fig, ax = plt.subplots()

    if X.shape[1] == 1:
        # Univariate case: simple line plot
        x_range = np.linspace(X.min(), X.max(), 200).reshape(-1, 1)
        y_pred = model.predict(x_range)
        ax.scatter(X, y, color='blue', label='Data')