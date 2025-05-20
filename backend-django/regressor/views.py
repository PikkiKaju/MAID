from rest_framework.views import APIView
from rest_framework.response import Response
from .services import (
    linear_regression,
    polynomial_regression,
    ridge_regression,
    lasso_regression,
    elasticnet_regression,
    svr_regression,
    decision_tree_regression,
    random_forest_regression,
    gradient_boosting_regression
)

class LinearRegressionView(APIView):
    def post(self, request): return Response(linear_regression(request.data))

class PolynomialRegressionView(APIView):
    def post(self, request): return Response(polynomial_regression(request.data))

class RidgeRegressionView(APIView):
    def post(self, request): return Response(ridge_regression(request.data))

class LassoRegressionView(APIView):
    def post(self, request): return Response(lasso_regression(request.data))

class ElasticNetRegressionView(APIView):
    def post(self, request): return Response(elasticnet_regression(request.data))

class SVRRegressionView(APIView):
    def post(self, request): return Response(svr_regression(request.data))

class DecisionTreeRegressionView(APIView):
    def post(self, request): return Response(decision_tree_regression(request.data))

class RandomForestRegressionView(APIView):
    def post(self, request): return Response(random_forest_regression(request.data))

class GradientBoostingRegressionView(APIView):
    def post(self, request): return Response(gradient_boosting_regression(request.data))
