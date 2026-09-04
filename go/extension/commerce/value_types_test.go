package commerce_test

import (
	"reflect"
	"testing"

	"google.golang.org/protobuf/reflect/protoreflect"

	"github.com/channel-io/app-sdk/go/extension/commerce"
)

// 주문 계약에서 도달 가능한 모든 메시지는 이 패키지에 별칭이 있어야 한다.
//
// 생성 코드는 go/internal/gen 에 있어 앱이 import 할 수 없다. proto 에 메시지를 더하고
// 별칭을 빠뜨리면 스키마에는 필드가 보이는데 앱이 그 값을 만들 방법이 없는 상태가 된다 —
// 컴파일은 SDK 안에서 멀쩡히 통과해서 릴리즈 전까지 드러나지 않는다(#116).
//
// 아래 목록을 손으로 관리하지만, 진실의 원천은 proto 디스크립터다. Order 에서 도달 가능한
// 메시지를 걸어 목록과 대조하므로, 새 메시지를 추가하고 이 목록을 갱신하지 않으면 실패한다.
// 값은 별칭 자체를 참조하므로 별칭이 없으면 컴파일도 되지 않는다.
func TestOrderValueTypesAreAliased(t *testing.T) {
	aliases := map[string]any{
		"CommerceOrder":     commerce.Order{},
		"CommerceOrderItem": commerce.OrderItem{},
		"Buyer":             commerce.Buyer{},
		"OrderAddress":      commerce.Address{},
		"OrderPayment":      commerce.Payment{},
		"OrderFulfillment":  commerce.Fulfillment{},
		"OrderClaim":        commerce.Claim{},
		"OrderClaimability": commerce.Claimability{},
		"OrderTaxLine":      commerce.TaxLine{},
		"OrderAttribute":    commerce.Attribute{},
		"OrderShippingLine": commerce.ShippingLine{},
		"OrderTransaction":  commerce.Transaction{},
		"OrderMetafield":    commerce.Metafield{},
	}

	reachable := map[string]protoreflect.MessageDescriptor{}
	collectMessages((&commerce.Order{}).ProtoReflect().Descriptor(), reachable)

	for name := range reachable {
		if _, ok := aliases[name]; !ok {
			t.Errorf(
				"proto 메시지 %s 가 주문 계약에서 도달 가능한데 commerce 별칭이 없다 — "+
					"extension/commerce/types.go 에 별칭을 추가하고 이 목록에도 넣어라",
				name,
			)
		}
	}

	// 별칭이 실제로 그 메시지를 가리키는지도 본다. 이름만 맞고 다른 타입을 걸어두면
	// 위 대조는 통과하므로 여기서 걸러야 한다.
	for name, value := range aliases {
		desc, ok := reachable[name]
		if !ok {
			// 주문 계약에서 도달하지 않는 별칭은 이 테스트의 관심사가 아니다.
			continue
		}

		msg, ok := reflect.New(reflect.TypeOf(value)).Interface().(protoreflect.ProtoMessage)
		if !ok {
			t.Errorf("별칭 %s 가 proto 메시지가 아니다", name)
			continue
		}

		if got := msg.ProtoReflect().Descriptor().FullName(); got != desc.FullName() {
			t.Errorf("별칭 %s 가 %s 를 가리킨다 — %s 를 가리켜야 한다", name, got, desc.FullName())
		}
	}
}

// collectMessages 는 메시지 필드를 따라 도달 가능한 메시지 디스크립터를 모은다.
func collectMessages(desc protoreflect.MessageDescriptor, seen map[string]protoreflect.MessageDescriptor) {
	name := string(desc.Name())
	if _, ok := seen[name]; ok {
		return
	}
	seen[name] = desc

	fields := desc.Fields()
	for i := range fields.Len() {
		field := fields.Get(i)
		if field.Kind() != protoreflect.MessageKind && field.Kind() != protoreflect.GroupKind {
			continue
		}
		collectMessages(field.Message(), seen)
	}
}
