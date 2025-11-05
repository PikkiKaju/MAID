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
    """
    Performs simple linear regression on given data.
    - Supports a single feature (1D input)
    - Fits a LinearRegression model
    - Returns SVG plot showing data points and fitted line
    """

    # Extract data
    X = np.array(data.get("X"))
    y = np.array(data.get("y"))

    # Ensure X is 2D
    if X.ndim == 1:
        X = X.reshape(-1, 1)

    # Fit linear regression model
    model = LinearRegression().fit(X, y)

    # Prepare plot
    fig, ax = plt.subplots()
    if X.shape[1] == 1:
        # Univariate case: simple line plot
        x_range = np.linspace(X.min(), X.max(), 200).reshape(-1, 1)
        y_pred = model.predict(x_range)
        ax.scatter(X, y, color="blue", label="Data")
        ax.plot(x_range, y_pred, color="red", label="Linear fit")
        ax.set_xlabel("X")
        ax.set_ylabel("y")
        ax.legend()
    elif X.shape[1] == 2:
        # Bivariate case: surface plot
        ax = fig.add_subplot(111, projection="3d")
        ax.scatter(X[:, 0], X[:, 1], y, color="blue", label="Data")

        # Create a grid for the surface
        x_surf, y_surf = np.meshgrid(
            np.linspace(X[:, 0].min(), X[:, 0].max(), 30),
            np.linspace(X[:, 1].min(), X[:, 1].max(), 30)
        )
        X_grid = np.column_stack((x_surf.ravel(), y_surf.ravel()))
        z_pred = model.predict(X_grid).reshape(x_surf.shape)

        ax.plot_surface(x_surf, y_surf, z_pred, color="red", alpha=0.5)
        ax.set_xlabel("X1")
        ax.set_ylabel("X2")
        ax.set_zlabel("y")
    else:
        # Higher-dimensional case: cannot plot
        ax.text(0.5, 0.5, "Plot unavailable for >2 features", ha="center", va="center")
        ax.axis("off")

    # Convert plot to SVG
    svg_image = plot_to_svg(fig)
    plt.close(fig)

    # Return model info
    return {
        "svg_plot": svg_image,
        "model_info": model_summary(model, X, y),
        "n_features": X.shape[1],
        "coefficients": model.coef_.tolist(),
        "intercept": model.intercept_.item() if np.ndim(model.intercept_) == 0 else model.intercept_.tolist(),
    }

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
    alpha = float(params.get('alpha', 0.1))  # zastanawiam się czy zostawiać default

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
        ax.plot(x_range, y_pred, color='red', label=f'Ridge fit (alpha={alpha})')
        ax.set_xlabel('X')
        ax.set_ylabel('y')
        ax.legend()

    elif X.shape[1] == 2:
        # Bivariate case: 3D surface plot
        from mpl_toolkits.mplot3d import Axes3D
        ax = fig.add_subplot(111, projection='3d')
        ax.scatter(X[:, 0], X[:, 1], y, color='blue', label='Data')

        # Create grid for surface
        x_surf, y_surf = np.meshgrid(
            np.linspace(X[:, 0].min(), X[:, 0].max(), 30),
            np.linspace(X[:, 1].min(), X[:, 1].max(), 30)
        )
        X_grid = np.column_stack((x_surf.ravel(), y_surf.ravel()))
        z_pred = model.predict(X_grid).reshape(x_surf.shape)

        ax.plot_surface(x_surf, y_surf, z_pred, color='red', alpha=0.5)
        ax.set_xlabel('X1')
        ax.set_ylabel('X2')
        ax.set_zlabel('y')

    else:
        # Higher-dimensional case: cannot plot
        # Możemy to wymienić że wgl to już za dużo kolumn jak to ułatwi rzeczy
        ax.text(0.5, 0.5, "Plot unavailable for >2 features", ha='center', va='center')
        ax.axis('off')

    # Convert plot to SVG
    svg_image = plot_to_svg(fig)
    plt.close(fig)

    # Return results
    return {
        "svg_plot": svg_image,
        "model_info": model_summary(model, X, y),
        "n_features": X.shape[1],
        "alpha": alpha,
        "coefficients": model.coef_.tolist(),
        "intercept": model.intercept_.item() if np.ndim(model.intercept_) == 0 else model.intercept_.tolist()
    }


def svr_regression(data):
    """
    Performs Support Vector Regression (SVR) on given data.

    Supports:
    - Multiple X features (1D or 2D)
    - Custom kernel, C, epsilon parameters
    - Visualization for 1D or 2D data

    Returns:
        dict with SVG plot, model info, and parameters.
    """

    # Extract and prepare data
    X = np.array(data.get('X'))
    y = np.array(data.get('y'))
    params = data.get("params", {})
    kernel = params.get('kernel', 'rbf')   # 'linear', 'poly', 'rbf', 'sigmoid'
    C = float(params.get('C', 1.0))        # Regularization strength
    epsilon = float(params.get('epsilon', 0.1))  # Insensitive loss margin
    # Ensure X is 2D
    if X.ndim == 1:
        X = X.reshape(-1, 1)

    # Get hyperparameters
    #Tu nie ma wartości domyślnych, ale w sumie czy są one potrzebne? Zostawiłabym chyba rodzaje
    #kernela na stałe może ale reszta by do dostosowania przez użytkownika


    # Fit the SVR model
    model = SVR(kernel=kernel, C=C, epsilon=epsilon).fit(X, y)

    # Create plot
    fig, ax = plt.subplots()

    if X.shape[1] == 1:
        # Univariate case
        x_range = np.linspace(X.min(), X.max(), 300).reshape(-1, 1)
        y_pred = model.predict(x_range)
        ax.scatter(X, y, color='blue', label='Data')
        ax.plot(x_range, y_pred, color='red', label=f'SVR fit (kernel={kernel})')
        ax.set_xlabel('X')
        ax.set_ylabel('y')
        ax.legend()

    elif X.shape[1] == 2:
        # Bivariate case
        fig.clf()
        ax = fig.add_subplot(111, projection='3d')
        ax.scatter(X[:, 0], X[:, 1], y, color='blue', label='Data')

        # Create mesh grid for surface
        x_surf, y_surf = np.meshgrid(
            np.linspace(X[:, 0].min(), X[:, 0].max(), 40),
            np.linspace(X[:, 1].min(), X[:, 1].max(), 40)
        )
        X_grid = np.column_stack((x_surf.ravel(), y_surf.ravel()))
        z_pred = model.predict(X_grid).reshape(x_surf.shape)

        ax.plot_surface(x_surf, y_surf, z_pred, cmap='viridis', alpha=0.6)
        ax.set_xlabel('X1')
        ax.set_ylabel('X2')
        ax.set_zlabel('y')

    else:
        # Higher-dimensional case
        ax.text(0.5, 0.5, "Plot unavailable for >2 features", ha='center', va='center')
        ax.axis('off')

    # Convert to SVG
    svg_image = plot_to_svg(fig)
    plt.close(fig)

    # Return structured model info
    return {
        "svg_plot": svg_image,
        "model_info": model_summary(model, X, y),
        "n_features": X.shape[1],
        "kernel": kernel,
        "C": C,
        "epsilon": epsilon
    }


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
    """
    Performs Random Forest Regression on given data.

    Supports:
    - Multiple input features (1D or 2D visualization)
    - Configurable hyperparameters (n_estimators, max_depth, random_state)
    - Feature importance output
    - Automatic visualization for 1D/2D data

    Returns:
        dict with SVG plot, model info, and feature importances.
    """

    # Extract data
    X = np.array(data.get('X'))
    y = np.array(data.get('y'))
    params = data.get("params", {})
    n_estimators = int(params.get('n_estimators', 200))  # number of trees
    max_depth = int(params.get('max_depth'))                  # limit depth or None
    random_state = int(params.get('random_state', 42))   # reproducibility
    # Ensure X is 2D
    if X.ndim == 1:
        X = X.reshape(-1, 1)

    # Fit model
    model = RandomForestRegressor(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=random_state
    ).fit(X, y)

    # Plot setup
    fig, ax = plt.subplots()

    if X.shape[1] == 1:
        # Univariate case: line plot
        x_range = np.linspace(X.min(), X.max(), 300).reshape(-1, 1)
        y_pred = model.predict(x_range)
        ax.scatter(X, y, color='blue', label='Data')
        ax.plot(x_range, y_pred, color='red', label='Random Forest fit')
        ax.set_xlabel('X')
        ax.set_ylabel('y')
        ax.legend()

    elif X.shape[1] == 2:
        # Bivariate case: 3D surface
        fig.clf()
        ax = fig.add_subplot(111, projection='3d')
        ax.scatter(X[:, 0], X[:, 1], y, color='blue', label='Data')

        # Create grid for predictions
        x_surf, y_surf = np.meshgrid(
            np.linspace(X[:, 0].min(), X[:, 0].max(), 40),
            np.linspace(X[:, 1].min(), X[:, 1].max(), 40)
        )
        X_grid = np.column_stack((x_surf.ravel(), y_surf.ravel()))
        z_pred = model.predict(X_grid).reshape(x_surf.shape)

        ax.plot_surface(x_surf, y_surf, z_pred, cmap='viridis', alpha=0.7)
        ax.set_xlabel('X1')
        ax.set_ylabel('X2')
        ax.set_zlabel('y')

    else:
        # Higher-dimensional case: no visualization
        ax.text(0.5, 0.5, "Plot unavailable for >2 features", ha='center', va='center')
        ax.axis('off')

    # Convert to SVG
    svg_image = plot_to_svg(fig)
    plt.close(fig)

    # Return detailed output
    return {
        "svg_plot": svg_image,
        "model_info": model_summary(model, X, y),
        "n_features": X.shape[1],
        "n_estimators": n_estimators,
        "max_depth": max_depth,
        "feature_importances": model.feature_importances_.tolist(),
        "random_state": random_state
    }

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
