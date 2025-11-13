from __future__ import annotations

from typing import Any, Dict

from rest_framework import status
from rest_framework.test import APITestCase


class OptimizerManifestAPITests(APITestCase):
    base_url = "/api/network/optimizers/"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Load the manifest before running tests
        from network.manifests.optimizers import refresh_manifest
        try:
            refresh_manifest()
        except Exception:
            # If manifest doesn't exist, that's okay for tests
            pass

    def _get_optimizers_list(self) -> Dict[str, Any]:
        resp = self.client.get(self.base_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        data = resp.data
        # Basic shape checks
        self.assertIn("tensorflow_version", data)
        self.assertIn("optimizer_count", data)
        self.assertIn("optimizers", data)
        # Consistency: count matches list length
        self.assertIsInstance(data["optimizers"], list)
        self.assertEqual(data["optimizer_count"], len(data["optimizers"]))
        return data

    def test_optimizers_list(self) -> None:
        data = self._get_optimizers_list()
        # Should not be empty in a valid manifest
        self.assertGreaterEqual(len(data["optimizers"]), 1)
        # Validate element shape
        sample = data["optimizers"][0]
        self.assertIn("name", sample)
        self.assertIn("description", sample)
        self.assertIn("parameters", sample)

    def test_optimizer_detail_for_adam(self) -> None:
        # Test Adam optimizer specifically (most common)
        resp = self.client.get(f"{self.base_url}Adam/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        entry = resp.data
        # Minimal entry shape checks
        self.assertEqual(entry.get("name"), "Adam")
        self.assertIn("parameters", entry)
        self.assertIsInstance(entry["parameters"], list)
        # Adam should have learning_rate parameter
        param_names = [p["name"] for p in entry["parameters"]]
        self.assertIn("learning_rate", param_names)

    def test_optimizer_detail_for_first_item(self) -> None:
        data = self._get_optimizers_list()
        first = data["optimizers"][0]
        name = first["name"]
        # GET /api/network/optimizers/{name}
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

    def test_optimizer_detail_404(self) -> None:
        resp = self.client.get(f"{self.base_url}__no_such_optimizer__/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_parameter_metadata_quality(self) -> None:
        """Verify parameter metadata includes type, range, and value information."""
        resp = self.client.get(f"{self.base_url}Adam/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        entry = resp.data
        
        # Find learning_rate parameter
        lr_param = None
        for p in entry["parameters"]:
            if p["name"] == "learning_rate":
                lr_param = p
                break
        
        self.assertIsNotNone(lr_param, "learning_rate parameter should exist")
        # Check metadata fields
        self.assertIn("param_type", lr_param)
        self.assertIn("value_range", lr_param)
        self.assertIn("possible_values", lr_param)
        self.assertIn("doc", lr_param)
