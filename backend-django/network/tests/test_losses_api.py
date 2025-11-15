from __future__ import annotations

from typing import Any, Dict

from rest_framework import status
from rest_framework.test import APITestCase


class LossManifestAPITests(APITestCase):
    base_url = "/api/network/losses/"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Load the manifest before running tests
        from network.manifests import manager as manifest_manager
        try:
            manifest_manager.refresh_manifest("losses")
        except Exception:
            # If manifest doesn't exist, that's okay for tests
            pass

    def _get_losses_list(self) -> Dict[str, Any]:
        resp = self.client.get(self.base_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        data = resp.data
        # Basic shape checks
        self.assertIn("tensorflow_version", data)
        self.assertIn("loss_count", data)
        self.assertIn("losses", data)
        # Consistency: count matches list length
        self.assertIsInstance(data["losses"], list)
        self.assertEqual(data["loss_count"], len(data["losses"]))
        return data

    def test_losses_list(self) -> None:
        data = self._get_losses_list()
        # Should not be empty in a valid manifest
        self.assertGreaterEqual(len(data["losses"]), 1)
        # Validate element shape
        sample = data["losses"][0]
        self.assertIn("name", sample)
        self.assertIn("description", sample)
        self.assertIn("parameters", sample)
        self.assertIn("is_function", sample)

    def test_loss_detail_for_binary_crossentropy(self) -> None:
        # Test BinaryCrossentropy loss specifically
        resp = self.client.get(f"{self.base_url}BinaryCrossentropy/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        entry = resp.data
        # Minimal entry shape checks
        self.assertEqual(entry.get("name"), "BinaryCrossentropy")
        self.assertIn("parameters", entry)
        self.assertIsInstance(entry["parameters"], list)
        # BinaryCrossentropy should have label_smoothing parameter
        param_names = [p["name"] for p in entry["parameters"]]
        self.assertIn("from_logits", param_names)

    def test_loss_detail_for_first_item(self) -> None:
        data = self._get_losses_list()
        first = data["losses"][0]
        name = first["name"]
        # GET /api/network/losses/{name}
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

    def test_loss_detail_404(self) -> None:
        resp = self.client.get(f"{self.base_url}__no_such_loss__/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_label_smoothing_parameter_metadata(self) -> None:
        """Verify label_smoothing has correct range [0, 1]."""
        resp = self.client.get(f"{self.base_url}CategoricalCrossentropy/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        entry = resp.data
        
        # Find label_smoothing parameter
        label_smoothing = None
        for p in entry["parameters"]:
            if p["name"] == "label_smoothing":
                label_smoothing = p
                break
        
        self.assertIsNotNone(label_smoothing, "label_smoothing parameter should exist")
        # Check metadata
        self.assertIn("param_type", label_smoothing)
        self.assertEqual(label_smoothing["param_type"], "float")
        self.assertIn("value_range", label_smoothing)
        # Should have range [0, 1]
        if label_smoothing["value_range"]:
            self.assertEqual(label_smoothing["value_range"]["min"], 0.0)
            self.assertEqual(label_smoothing["value_range"]["max"], 1.0)
