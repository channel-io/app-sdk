package code

import (
	"encoding/json"
	"google.golang.org/protobuf/types/known/structpb"
	"testing"
)

func TestSnapshotRetainsRequiredZeroAndNullValues(t *testing.T) {
	data, err := (&codeResult{response: &Snapshot{SessionKey: "s", Version: "0", Status: "idle", Observation: &Observation{Status: "unknown", ObservedAt: structpb.NewNullValue()}, UpdatedAt: "2026-10-22T00:00:00Z"}}).MarshalSDKResult()
	if err != nil {
		t.Fatal(err)
	}
	var value map[string]any
	if err := json.Unmarshal(data, &value); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"question", "lastResult", "error"} {
		item, ok := value[name]
		if !ok || item != nil {
			t.Fatalf("%s must be explicit null: %s", name, data)
		}
	}
	if value["pendingInputCount"] != float64(0) {
		t.Fatalf("missing zero: %s", data)
	}
	if items, ok := value["artifacts"].([]any); !ok || len(items) != 0 {
		t.Fatalf("missing empty array: %s", data)
	}
	observation := value["observation"].(map[string]any)
	if item, ok := observation["observedAt"]; !ok || item != nil {
		t.Fatalf("missing observation null: %s", data)
	}
}
