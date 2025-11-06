from __future__ import annotations

from typing import Any, Dict

from rest_framework import status
from rest_framework.test import APITestCase


class MetricManifestAPITests(APITestCase):
    base_url = "/api/network/metrics/"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Load the manifest before running tests
        from network.manifests.metrics import refresh_manifest
        try:
            refresh_manifest()
        except Exception:
            # If manifest doesn't exist, that's okay for tests
            pass

    def _get_metrics_list(self) -> Dict[str, Any]:
        resp = self.client.get(self.base_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        data = resp.data
        # Basic shape checks
        self.assertIn("tensorflow_version", data)
        self.assertIn("metric_count", data)
        self.assertIn("metrics", data)
        # Consistency: count matches list length
        self.assertIsInstance(data["metrics"], list)
        self.assertEqual(data["metric_count"], len(data["metrics"]))
        return data

    def test_metrics_list(self) -> None:
        data = self._get_metrics_list()
        # Should not be empty in a valid manifest
        self.assertGreaterEqual(len(data["metrics"]), 1)
        # Validate element shape
        sample = data["metrics"][0]
        self.assertIn("name", sample)
        self.assertIn("description", sample)
        self.assertIn("parameters", sample)
        self.assertIn("is_base_class", sample)

    def test_metric_detail_for_accuracy(self) -> None:
        # Test Accuracy metric specifically
        resp = self.client.get(f"{self.base_url}Accuracy/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        entry = resp.data
        # Minimal entry shape checks
        self.assertEqual(entry.get("name"), "Accuracy")
        self.assertIn("parameters", entry)
        self.assertIsInstance(entry["parameters"], list)

    def test_metric_detail_for_first_item(self) -> None:
        data = self._get_metrics_list()
        first = data["metrics"][0]
        name = first["name"]
        # GET /api/network/metrics/{name}
        resp = self.client.get(f"{self.base_url}{name}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        entry = resp.data
        # Minimal entry shape checks
        self.assertEqual(entry.get("name"), name)
        self.assertIn("parameters", entry)
        self.assertIsInstance(entry["parameters"], list)

    def test_specs_endpoint(self) -> None:
        resp = self.client.get(f"{self.base_url}specs/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        data = resp.data
        self.assertIn("tensorflow_version", data)

    def test_metric_detail_404(self) -> None:
        resp = self.client.get(f"{self.base_url}__no_such_metric__/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_auc_metric_parameters(self) -> None:
        """Verify AUC metric has expected parameters with metadata."""
        resp = self.client.get(f"{self.base_url}AUC/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        entry = resp.data
        
        param_names = [p["name"] for p in entry["parameters"]]
        # AUC should have these parameters
        self.assertIn("num_thresholds", param_names)
        self.assertIn("curve", param_names)
        
        # Find curve parameter and check for enum values
        curve_param = None
        for p in entry["parameters"]:
            if p["name"] == "curve":
                curve_param = p
                break
        
        self.assertIsNotNone(curve_param)
        # Should have possible values: ROC, PR
        if curve_param.get("possible_values"):
            self.assertIn("ROC", curve_param["possible_values"])
            self.assertIn("PR", curve_param["possible_values"])
