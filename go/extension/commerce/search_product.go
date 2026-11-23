package commerce

import (
	"context"
	"encoding/json"
	"math"

	"github.com/channel-io/app-sdk/go/appsdk"
	"google.golang.org/protobuf/encoding/protojson"
)

// searchProductResult preserves the required empty products array while leaving
// optional fields absent, matching Cafe24's existing search response.
type searchProductResult struct{ response *SearchProductOutput }

func (r *searchProductResult) MarshalSDKResult() (json.RawMessage, error) {
	data, err := protojson.Marshal(r.response)
	if err != nil {
		return nil, err
	}

	var fields map[string]json.RawMessage
	if err := json.Unmarshal(data, &fields); err != nil {
		return nil, err
	}
	if len(r.response.GetProducts()) == 0 {
		fields["products"] = json.RawMessage(`[]`)
	} else {
		var products []map[string]json.RawMessage
		if err := json.Unmarshal(fields["products"], &products); err != nil {
			return nil, err
		}
		for _, product := range products {
			for _, key := range []string{"id", "name"} {
				if _, ok := product[key]; !ok {
					product[key] = json.RawMessage(`""`)
				}
			}
			if raw, ok := product["defaultImage"]; ok {
				var image map[string]json.RawMessage
				if err := json.Unmarshal(raw, &image); err != nil {
					return nil, err
				}
				for _, key := range []string{"bucket", "key", "id", "type", "name"} {
					if _, ok := image[key]; !ok {
						image[key] = json.RawMessage(`""`)
					}
				}
				if _, ok := image["size"]; !ok {
					image["size"] = json.RawMessage(`0`)
				}
				encoded, err := json.Marshal(image)
				if err != nil {
					return nil, err
				}
				product["defaultImage"] = encoded
			}
		}
		encoded, err := json.Marshal(products)
		if err != nil {
			return nil, err
		}
		fields["products"] = encoded
	}
	return json.Marshal(fields)
}

func handleSearchProduct(handler appsdk.TypedHandlerFunc[SearchProductInput, SearchProductOutput]) appsdk.FunctionOption {
	return appsdk.HandleProto(func(ctx context.Context, fnCtx appsdk.Context, input *SearchProductInput) (*searchProductResult, error) {
		if size := input.GetSize(); math.IsNaN(size) || math.IsInf(size, 0) || math.Trunc(size) != size {
			return nil, appsdk.NewError(appsdk.CodeBadRequest, "invalidParams", "size must be an integer")
		}
		response, err := handler(ctx, fnCtx, input)
		if err != nil || response == nil {
			return nil, err
		}
		return &searchProductResult{response: response}, nil
	})
}
