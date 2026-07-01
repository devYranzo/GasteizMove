import test from "node:test";
import assert from "node:assert/strict";

import { normalizeTransitDatasetPayload } from "../services/transit/transitRepository";
import { staticTransitDataset } from "../services/transit/staticTransitDataset";

test("normalizeTransitDatasetPayload merges remote payload with local fallback", () => {
  const remotePayload = {
    metadata: {
      id: "remote-region",
      name: "Remote Region",
      regionId: "bilbao",
      agencyId: "test-agency",
      modes: ["bus"],
    },
    stops: [{
      id: "remote-stop",
      name: "Remote stop",
      latitude: 43.25,
      longitude: -2.92,
      routes: [{ id: "R1", name: "Route 1" }],
    }],
  };

  const normalized = normalizeTransitDatasetPayload(remotePayload, "bilbao");

  assert.equal(normalized.metadata.regionId, "bilbao");
  assert.equal(normalized.stops[0].id, "remote-stop");
  assert.equal(normalized.routes.length, staticTransitDataset.routes.length);
  assert.ok(Object.keys(normalized.timetables).length > 0);
});
