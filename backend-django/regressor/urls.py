from django.urls import path
from .views import (
    LinearRegressionView,
    PolynomialRegressionView,
    RidgeRegressionView,
    LassoRegressionView,
    ElasticNetRegressionView,
    SVRRegressionView,
    DecisionTreeRegressionView,
    RandomForestRegressionView,
    GradientBoostingRegressionView
)

urlpatterns = [
    path('linear/', LinearRegressionView.as_view(), name='linear_regression'),
    path('polynomial/', PolynomialRegressionView.as_view(), name='polynomial_regression'),
    path('ridge/', RidgeRegressionView.as_view(), name='ridge_regression'),
    path('lasso/', LassoRegressionView.as_view(), name='lasso_regression'),
    path('elasticnet/', ElasticNetRegressionView.as_view(), name='elasticnet_regression'),
    path('svr/', SVRRegressionView.as_view(), name='svr_regression'),
    path('decision-tree/', DecisionTreeRegressionView.as_view(), name='decision_tree_regression'),
    path('random-forest/', RandomForestRegressionView.as_view(), name='random_forest_regression'),
    path('gradient-boosting/', GradientBoostingRegressionView.as_view(), name='gradient_boosting_regression'),
]
