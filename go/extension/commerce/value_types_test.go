package commerce_test

import (
	"reflect"
	"strings"
	"testing"

	"google.golang.org/protobuf/reflect/protoreflect"

	"github.com/channel-io/app-sdk/go/extension/commerce"
	sdkv1 "github.com/channel-io/app-sdk/go/internal/gen/channel/app/sdk/v1"
)

// sdkProtoPackage 밖의 메시지는 별칭 대상이 아니다. google.protobuf.Value 같은 well-known
// 타입까지 요구하면 이 검사가 정상 변경을 막는다.
const sdkProtoPackage = "channel.app.sdk.v1"

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

// map 필드에서 FieldDescriptor.Message() 는 synthetic map-entry 를 돌려준다. 그걸 그대로
// 수집하면 별칭이 있을 수 없는 XxxEntry 를 요구해, 주문 계약에 map 을 추가하는 정상 변경이
// 이 검사에 막힌다. 실제 값 타입은 MapValue().Message() 다.
//
// 주문 계약에는 아직 map 이 없어 위 테스트로는 이 처리가 검증되지 않는다. map 을 가진
// 다른 메시지로 확인한다 — 그래서 여기서만 생성 패키지를 직접 참조한다.
func TestCollectMessagesSkipsMapEntries(t *testing.T) {
	seen := map[string]protoreflect.MessageDescriptor{}
	collectMessages((&sdkv1.ConfigChoice{}).ProtoReflect().Descriptor(), seen)

	// i18n_map 은 map<string, ConfigLocalizedText> 다.
	if _, ok := seen["I18nMapEntry"]; ok {
		t.Error("synthetic map-entry 가 수집됐다 — 별칭을 요구할 수 없는 타입이다")
	}
	if _, ok := seen["ConfigLocalizedText"]; !ok {
		t.Error("map 값 타입이 수집되지 않았다 — MapValue().Message() 를 따라가야 한다")
	}

	// google.protobuf.Value 는 SDK 패키지 밖이라 대상이 아니다.
	if _, ok := seen["Value"]; ok {
		t.Error("well-known 타입이 수집됐다 — 별칭 대상이 아니다")
	}
}

// collectMessages 는 메시지 필드를 따라 도달 가능한 SDK 메시지 디스크립터를 모은다.
func collectMessages(desc protoreflect.MessageDescriptor, seen map[string]protoreflect.MessageDescriptor) {
	if !strings.HasPrefix(string(desc.FullName()), sdkProtoPackage+".") {
		return
	}

	name := string(desc.Name())
	if _, ok := seen[name]; ok {
		return
	}
	seen[name] = desc

	fields := desc.Fields()
	for i := range fields.Len() {
		field := fields.Get(i)

		// map 은 Message() 가 synthetic entry 라 값 타입을 직접 따라간다. 스칼라 값 map 은
		// 따라갈 메시지가 없다.
		if field.IsMap() {
			if field.MapValue().Kind() == protoreflect.MessageKind {
				collectMessages(field.MapValue().Message(), seen)
			}
			continue
		}

		if field.Kind() != protoreflect.MessageKind && field.Kind() != protoreflect.GroupKind {
			continue
		}
		collectMessages(field.Message(), seen)
	}
}
