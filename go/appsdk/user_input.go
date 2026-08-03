package appsdk

import (
	"fmt"
	"math"
	"strings"
	"time"
	"unicode/utf8"
)

type UserInputType string

const (
	UserInputTypeSingleSelect UserInputType = "singleSelect"
	UserInputTypeMultiSelect  UserInputType = "multiSelect"
	UserInputTypeText         UserInputType = "text"
	UserInputTypeDate         UserInputType = "date"
	UserInputTypeNumber       UserInputType = "number"
)

type UserInputOption struct {
	Value     string `json:"value"`
	Label     string `json:"label"`
	Exclusive bool   `json:"exclusive,omitempty"`
}

type UserInputQuestion struct {
	Key           string            `json:"key"`
	Label         string            `json:"label"`
	Prompt        string            `json:"prompt"`
	InputType     UserInputType     `json:"inputType"`
	Required      bool              `json:"required"`
	Options       []UserInputOption `json:"options,omitempty"`
	MinSelections *int              `json:"minSelections,omitempty"`
	MaxSelections *int              `json:"maxSelections,omitempty"`
	Placeholder   string            `json:"placeholder,omitempty"`
	MinLength     *int              `json:"minLength,omitempty"`
	MaxLength     *int              `json:"maxLength,omitempty"`
	Min           any               `json:"min,omitempty"`
	Max           any               `json:"max,omitempty"`
	Step          *float64          `json:"step,omitempty"`
}

type NeedsUserInputResult struct {
	Type              string              `json:"type"`
	RequestID         string              `json:"requestId"`
	Questions         []UserInputQuestion `json:"questions"`
	ContinuationToken string              `json:"continuationToken"`
	Message           string              `json:"message,omitempty"`
}

func NewNeedsUserInputResult(requestID, continuationToken string, questions []UserInputQuestion) NeedsUserInputResult {
	return NeedsUserInputResult{
		Type:              "needsUserInput",
		RequestID:         requestID,
		Questions:         questions,
		ContinuationToken: continuationToken,
	}
}

func (r NeedsUserInputResult) Validate() error {
	if r.Type != "needsUserInput" {
		return fmt.Errorf("type must be needsUserInput")
	}
	if err := validateRequiredString(r.RequestID, 200, "requestId"); err != nil {
		return err
	}
	if err := validateRequiredString(r.ContinuationToken, 8_192, "continuationToken"); err != nil {
		return err
	}
	if r.Message != "" && utf8.RuneCountInString(strings.TrimSpace(r.Message)) > 1_000 {
		return fmt.Errorf("message must contain at most 1000 characters")
	}
	if len(r.Questions) == 0 || len(r.Questions) > 10 {
		return fmt.Errorf("questions must contain between 1 and 10 entries")
	}

	keys := make(map[string]struct{}, len(r.Questions))
	for index, question := range r.Questions {
		if err := validateUserInputQuestion(question, keys); err != nil {
			return fmt.Errorf("questions[%d]: %w", index, err)
		}
	}
	return nil
}

func validateUserInputQuestion(question UserInputQuestion, keys map[string]struct{}) error {
	if err := validateRequiredString(question.Key, 100, "key"); err != nil {
		return err
	}
	key := strings.TrimSpace(question.Key)
	if _, exists := keys[key]; exists {
		return fmt.Errorf("duplicate key %q", key)
	}
	keys[key] = struct{}{}
	if err := validateRequiredString(question.Label, 1_000, "label"); err != nil {
		return err
	}
	if err := validateRequiredString(question.Prompt, 1_000, "prompt"); err != nil {
		return err
	}
	if utf8.RuneCountInString(question.Placeholder) > 500 {
		return fmt.Errorf("placeholder must contain at most 500 characters")
	}

	switch question.InputType {
	case UserInputTypeSingleSelect:
		if question.MinSelections != nil || question.MaxSelections != nil {
			return fmt.Errorf("singleSelect does not support selection bounds")
		}
		if err := validateUserInputOptions(question.Options); err != nil {
			return err
		}
	case UserInputTypeMultiSelect:
		if err := validateUserInputOptions(question.Options); err != nil {
			return err
		}
		if err := validateIntegerBounds(
			question.MinSelections,
			question.MaxSelections,
			0,
			len(question.Options),
			"minSelections",
			"maxSelections",
		); err != nil {
			return err
		}
	case UserInputTypeText:
		if len(question.Options) > 0 {
			return fmt.Errorf("text does not support options")
		}
		if err := validateIntegerBounds(
			question.MinLength,
			question.MaxLength,
			0,
			10_000,
			"minLength",
			"maxLength",
		); err != nil {
			return err
		}
	case UserInputTypeDate:
		if len(question.Options) > 0 {
			return fmt.Errorf("date does not support options")
		}
		minimum, err := optionalDate(question.Min)
		if err != nil {
			return fmt.Errorf("min: %w", err)
		}
		maximum, err := optionalDate(question.Max)
		if err != nil {
			return fmt.Errorf("max: %w", err)
		}
		if minimum != "" && maximum != "" && minimum > maximum {
			return fmt.Errorf("min must be less than or equal to max")
		}
	case UserInputTypeNumber:
		if len(question.Options) > 0 {
			return fmt.Errorf("number does not support options")
		}
		minimum, err := optionalNumber(question.Min)
		if err != nil {
			return fmt.Errorf("min: %w", err)
		}
		maximum, err := optionalNumber(question.Max)
		if err != nil {
			return fmt.Errorf("max: %w", err)
		}
		if minimum != nil && maximum != nil && *minimum > *maximum {
			return fmt.Errorf("min must be less than or equal to max")
		}
		if question.Step != nil && (*question.Step <= 0 || math.IsNaN(*question.Step) || math.IsInf(*question.Step, 0)) {
			return fmt.Errorf("step must be a positive finite number")
		}
	default:
		return fmt.Errorf("unsupported inputType %q", question.InputType)
	}

	return nil
}

func validateUserInputOptions(options []UserInputOption) error {
	if len(options) == 0 || len(options) > 50 {
		return fmt.Errorf("select options must contain between 1 and 50 entries")
	}
	values := make(map[string]struct{}, len(options))
	for _, option := range options {
		if err := validateRequiredString(option.Value, 200, "option value"); err != nil {
			return err
		}
		if err := validateRequiredString(option.Label, 200, "option label"); err != nil {
			return err
		}
		if _, exists := values[option.Value]; exists {
			return fmt.Errorf("duplicate option value %q", option.Value)
		}
		values[option.Value] = struct{}{}
	}
	return nil
}

func validateRequiredString(value string, maximum int, field string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("%s is required", field)
	}
	if utf8.RuneCountInString(value) > maximum {
		return fmt.Errorf("%s must contain at most %d characters", field, maximum)
	}
	return nil
}

func validateIntegerBounds(minimum, maximum *int, floor, ceiling int, minimumField, maximumField string) error {
	if minimum != nil && (*minimum < floor || *minimum > ceiling) {
		return fmt.Errorf("%s must be between %d and %d", minimumField, floor, ceiling)
	}
	if maximum != nil && (*maximum < floor || *maximum > ceiling) {
		return fmt.Errorf("%s must be between %d and %d", maximumField, floor, ceiling)
	}
	if minimum != nil && maximum != nil && *minimum > *maximum {
		return fmt.Errorf("%s must be less than or equal to %s", minimumField, maximumField)
	}
	return nil
}

func optionalDate(value any) (string, error) {
	if value == nil {
		return "", nil
	}
	date, ok := value.(string)
	if !ok {
		return "", fmt.Errorf("must be a YYYY-MM-DD string")
	}
	if _, err := time.Parse("2006-01-02", date); err != nil {
		return "", fmt.Errorf("must be a YYYY-MM-DD string")
	}
	return date, nil
}

func optionalNumber(value any) (*float64, error) {
	if value == nil {
		return nil, nil
	}
	var number float64
	switch typed := value.(type) {
	case int:
		number = float64(typed)
	case int32:
		number = float64(typed)
	case int64:
		number = float64(typed)
	case float32:
		number = float64(typed)
	case float64:
		number = typed
	default:
		return nil, fmt.Errorf("must be a number")
	}
	if math.IsNaN(number) || math.IsInf(number, 0) {
		return nil, fmt.Errorf("must be finite")
	}
	return &number, nil
}
