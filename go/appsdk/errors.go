package appsdk

import (
	"encoding/json"
	"errors"
	"fmt"
)

const (
	CodeUnprocessableEntity = 1
	CodeBadRequest          = 2
	CodeNotFound            = 3
	CodeUnauthorized        = 4
	CodeMethodNotFound      = -32601
	CodeInternal            = -32603
)

type FunctionError struct {
	Code    int
	Type    string
	Message string
	Data    any
}

func (e *FunctionError) Error() string {
	if e == nil {
		return ""
	}
	return e.Message
}

func NewError(code int, typ string, message string, data ...any) *FunctionError {
	err := &FunctionError{Code: code, Type: typ, Message: message}
	if len(data) > 0 {
		err.Data = data[0]
	}
	return err
}

func NewVersionMismatchError(requestedVersion string, availableVersions []string) *FunctionError {
	return NewError(
		CodeBadRequest,
		"versionMismatch",
		fmt.Sprintf(
			"system version %q not found; available versions: %v",
			requestedVersion,
			availableVersions,
		),
		map[string]any{
			"requestedVersion":  requestedVersion,
			"availableVersions": availableVersions,
		},
	)
}

func ErrorResponse(err error) FunctionResponse {
	var fnErr *FunctionError
	if errors.As(err, &fnErr) {
		return FunctionResponse{Error: functionErrorResponse(fnErr)}
	}

	return FunctionResponse{
		Error: &FunctionErrorResponse{
			Code:    CodeInternal,
			Type:    "internal",
			Message: "internal error",
		},
	}
}

func functionErrorResponse(err *FunctionError) *FunctionErrorResponse {
	res := &FunctionErrorResponse{
		Code:    err.Code,
		Type:    err.Type,
		Message: err.Message,
	}
	if err.Data != nil {
		if data, marshalErr := json.Marshal(err.Data); marshalErr == nil {
			res.Data = data
		}
	}
	return res
}
