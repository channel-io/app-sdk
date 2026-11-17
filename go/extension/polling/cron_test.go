package polling

import (
	"encoding/json"
	"google.golang.org/protobuf/encoding/protojson"
	"testing"
)

func TestCronPollerWireCompatibility(t *testing.T) {
	raw, err := protojson.Marshal(&Poller{PollerId: "daily", FunctionName: "poll", CronExpression: "0 9 * * *", Timezone: "Asia/Seoul"})
	if err != nil {
		t.Fatal(err)
	}
	var fields map[string]any
	if err = json.Unmarshal(raw, &fields); err != nil {
		t.Fatal(err)
	}
	if _, ok := fields["intervalSeconds"]; ok {
		t.Fatal("cron must omit the zero interval")
	}
	for key, want := range map[string]string{"pollerId": "daily", "functionName": "poll", "cronExpression": "0 9 * * *", "timezone": "Asia/Seoul"} {
		if fields[key] != want {
			t.Fatalf("%s: got %v", key, fields[key])
		}
	}
	legacy, err := protojson.Marshal(&Poller{FunctionName: "poll", IntervalSeconds: 60})
	if err != nil {
		t.Fatal(err)
	}
	fields = map[string]any{}
	if err = json.Unmarshal(legacy, &fields); err != nil {
		t.Fatal(err)
	}
	if len(fields) != 2 || fields["intervalSeconds"] != float64(60) {
		t.Fatalf("legacy wire changed: %s", legacy)
	}
}
