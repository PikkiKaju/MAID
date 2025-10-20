from __future__ import annotations

from typing import Any, Dict

from rest_framework import status
from rest_framework.test import APITestCase


class LayerManifestAPITests(APITestCase):
    base_url = "/api/network/layers/"

    def _get_layers_list(self) -> Dict[str, Any]:
        resp = self.client.get(self.base_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        data = resp.data
        # Basic shape checks
        self.assertIn("tensorflow_version", data)
        self.assertIn("keras_version", data)
        self.assertIn("layer_count", data)
        self.assertIn("layers", data)
        # Consistency: count matches list length
        self.assertIsInstance(data["layers"], list)
        self.assertEqual(data["layer_count"], len(data["layers"]))
        return data

    def test_layers_list(self) -> None:
        data = self._get_layers_list()
        # Should not be empty in a valid manifest
        self.assertGreaterEqual(len(data["layers"]), 1)
        # Validate element shape
        sample = data["layers"][0]
        self.assertIn("name", sample)
        self.assertIn("description", sample)
        self.assertIn("deprecated", sample)

    def test_layer_detail_for_first_item(self) -> None:
        data = self._get_layers_list()
        first = data["layers"][0]
        name = first["name"]
        # GET /api/network/layers/{name}
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
        self.assertIn("keras_version", data)
        self.assertIn("param_value_specs", data)
        self.assertIsInstance(data["param_value_specs"], dict)
        # Expect at least a global or overrides key in specs
        self.assertTrue(
            "global" in data["param_value_specs"] or "overrides" in data["param_value_specs"]
        )

    def test_layer_detail_404(self) -> None:
        resp = self.client.get(f"{self.base_url}__no_such_layer__/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)