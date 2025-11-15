from __future__ import annotations

from typing import Any, Dict

from rest_framework import status
from rest_framework.test import APITestCase


class ActivationManifestAPITests(APITestCase):
    base_url = "/api/network/activations/"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Load the manifest before running tests
        from network.manifests import manager as manifest_manager
        try:
            manifest_manager.refresh_manifest("activations")
        except Exception:
            # If manifest doesn't exist, that's okay for tests
            pass

    def _get_activations_list(self) -> Dict[str, Any]:
        resp = self.client.get(self.base_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        data = resp.data
        # Basic shape checks
        self.assertIn("tensorflow_version", data)
        self.assertIn("activation_count", data)
        self.assertIn("activations", data)
        # Consistency: count matches list length
        self.assertIsInstance(data["activations"], list)
        self.assertEqual(data["activation_count"], len(data["activations"]))
        return data

    def test_activations_list(self) -> None:
        data = self._get_activations_list()
        # Should not be empty in a valid manifest
        self.assertGreaterEqual(len(data["activations"]), 1)
        # Validate element shape
        sample = data["activations"][0]
        self.assertIn("name", sample)
        self.assertIn("description", sample)
        self.assertIn("parameters", sample)
        self.assertIn("is_utility", sample)

    def test_activation_detail_for_relu(self) -> None:
        # Test relu activation specifically
        resp = self.client.get(f"{self.base_url}relu/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        entry = resp.data
        # Minimal entry shape checks
        self.assertEqual(entry.get("name"), "relu")
        self.assertIn("parameters", entry)
        self.assertIsInstance(entry["parameters"], list)

    def test_activation_detail_for_first_item(self) -> None:
        data = self._get_activations_list()
        first = data["activations"][0]
        name = first["name"]
        # GET /api/network/activations/{name}
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

    def test_activation_detail_404(self) -> None:
        resp = self.client.get(f"{self.base_url}__no_such_activation__/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_leaky_relu_parameters(self) -> None:
        """Verify leaky_relu has negative_slope parameter with correct type."""
        resp = self.client.get(f"{self.base_url}leaky_relu/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        entry = resp.data
        
        # Find negative_slope parameter
        negative_slope = None
        for p in entry["parameters"]:
            if p["name"] == "negative_slope":
                negative_slope = p
                break
        
        self.assertIsNotNone(negative_slope, "negative_slope parameter should exist")
        # Check type
        self.assertEqual(negative_slope.get("param_type"), "float")
        self.assertIn("doc", negative_slope)

    def test_softmax_axis_parameter(self) -> None:
        """Verify softmax has axis parameter typed as int."""
        resp = self.client.get(f"{self.base_url}softmax/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        entry = resp.data
        
        # Find axis parameter
        axis_param = None
        for p in entry["parameters"]:
            if p["name"] == "axis":
                axis_param = p
                break
        
        self.assertIsNotNone(axis_param, "axis parameter should exist")
        # Check type
        self.assertEqual(axis_param.get("param_type"), "int")
