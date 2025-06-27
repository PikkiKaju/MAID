import base64
import io
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import (
    LinearRegression, Ridge, Lasso, ElasticNet
)
from sklearn.svm import SVR
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import make_pipeline


def plot_to_svg(fig):
    buf = io.StringIO()
    fig.savefig(buf, format="svg")
    svg_data = buf.getvalue()
    buf.close()
    return base64.b64encode(svg_data.encode()).decode()


def create_plot_and_predict(model, X, y, predict):
    fig, ax = plt.subplots()
    ax.scatter(X, y, color="blue", label="Data")

    model.fit(X, y)
    prediction = model.predict(predict).tolist()

    x_range = np.linspace(X.min(), X.max(), 300).reshape(-1, 1)
    ax.plot(x_range, model.predict(x_range), color="red", label="Regression")
    ax.scatter(predict, prediction, color="green", label="Prediction")
    ax.legend()
    ax.grid(True)

    svg_image = plot_to_svg(fig)
    plt.close(fig)
    return {"prediction": prediction, "svg_plot": svg_image}


# Regression Models
def linear_regression(data):
    print("Received data:", data)
    X = np.array([[1], [2], [3]])
    y = np.array([2, 4, 6])
    predict = np.array([[10], [15]])
    return create_plot_and_predict(LinearRegression(), X=X, y=y, predict=predict)
def polynomial_regression(data): return create_plot_and_predict(make_pipeline(PolynomialFeatures(data.get("degree", 2)), LinearRegression()), **data)
def ridge_regression(data): return create_plot_and_predict(Ridge(), **data)
def lasso_regression(data): return create_plot_and_predict(Lasso(), **data)
def elasticnet_regression(data): return create_plot_and_predict(ElasticNet(), **data)
def svr_regression(data): return create_plot_and_predict(SVR(), **data)
def decision_tree_regression(data): return create_plot_and_predict(DecisionTreeRegressor(), **data)
def random_forest_regression(data): return create_plot_and_predict(RandomForestRegressor(), **data)
def gradient_boosting_regression(data): return create_plot_and_predict(GradientBoostingRegressor(), **data)
