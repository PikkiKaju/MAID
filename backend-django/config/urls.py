from django.urls import path, include
from regressor.views import (
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
    path('api/', include('regressor.urls')),
]
