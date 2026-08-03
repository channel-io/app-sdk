package appsdk

import (
	"strings"
	"testing"
)

func TestNeedsUserInputResultValidate(t *testing.T) {
	result := NewNeedsUserInputResult("creatorDiscovery", "opaque-token", []UserInputQuestion{
		{
			Key:       "platform",
			Label:     "Platform",
			Prompt:    "Choose a platform",
			InputType: UserInputTypeSingleSelect,
			Required:  true,
			Options: []UserInputOption{
				{Value: "youtube", Label: "YouTube"},
				{Value: "instagram", Label: "Instagram"},
			},
		},
	})

	if err := result.Validate(); err != nil {
		t.Fatalf("Validate() error = %v", err)
	}
}

func TestNeedsUserInputResultValidateRejectsDuplicateKeys(t *testing.T) {
	result := NewNeedsUserInputResult("creatorDiscovery", "opaque-token", []UserInputQuestion{
		{Key: "platform", Label: "Platform", Prompt: "Choose", InputType: UserInputTypeText},
		{Key: "platform", Label: "Platform", Prompt: "Choose", InputType: UserInputTypeText},
	})

	if err := result.Validate(); err == nil {
		t.Fatal("Validate() error = nil, want duplicate-key error")
	}
}

func TestNeedsUserInputResultValidateRejectsSelectionBoundsBeyondOptions(t *testing.T) {
	maximum := 3
	result := NewNeedsUserInputResult("creatorDiscovery", "opaque-token", []UserInputQuestion{
		{
			Key:           "tiers",
			Label:         "Creator tiers",
			Prompt:        "Choose tiers",
			InputType:     UserInputTypeMultiSelect,
			Required:      true,
			MaxSelections: &maximum,
			Options: []UserInputOption{
				{Value: "micro", Label: "Micro"},
				{Value: "mid", Label: "Mid"},
			},
		},
	})

	if err := result.Validate(); err == nil || !strings.Contains(err.Error(), "maxSelections") {
		t.Fatalf("Validate() error = %v, want maxSelections error", err)
	}
}

func TestNeedsUserInputResultValidateRejectsInvalidDateBounds(t *testing.T) {
	result := NewNeedsUserInputResult("creatorDiscovery", "opaque-token", []UserInputQuestion{
		{
			Key:       "period",
			Label:     "Period",
			Prompt:    "Choose a period",
			InputType: UserInputTypeDate,
			Required:  true,
			Min:       "2026-08-05",
			Max:       "2026-08-04",
		},
	})

	if err := result.Validate(); err == nil || !strings.Contains(err.Error(), "min must be less") {
		t.Fatalf("Validate() error = %v, want inverted date-bound error", err)
	}
}

func TestNeedsUserInputResultValidateRejectsInvalidNumberConstraints(t *testing.T) {
	zero := 0.0
	result := NewNeedsUserInputResult("creatorDiscovery", "opaque-token", []UserInputQuestion{
		{
			Key:       "budget",
			Label:     "Budget",
			Prompt:    "Enter a budget",
			InputType: UserInputTypeNumber,
			Required:  true,
			Min:       100,
			Max:       10,
			Step:      &zero,
		},
	})

	if err := result.Validate(); err == nil || !strings.Contains(err.Error(), "min must be less") {
		t.Fatalf("Validate() error = %v, want inverted number-bound error", err)
	}

	result.Questions[0].Min = 0
	result.Questions[0].Max = 100
	if err := result.Validate(); err == nil || !strings.Contains(err.Error(), "step") {
		t.Fatalf("Validate() error = %v, want invalid step error", err)
	}
}
