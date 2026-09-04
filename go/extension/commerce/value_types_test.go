package commerce_test

import (
	"testing"

	"github.com/channel-io/app-sdk/go/extension/commerce"
)

// 주문 계약이 노출하는 값 타입은 전부 이 패키지에 별칭이 있어야 한다.
//
// 생성 코드는 go/internal/gen 에 있어 앱에서 import 할 수 없다. proto 에 메시지를 더하고
// 별칭을 빠뜨리면 스키마에는 필드가 보이는데 앱이 그 값을 만들 방법이 없는 상태가 된다 —
// 컴파일은 SDK 안에서 멀쩡히 통과해서 릴리즈 전까지 드러나지 않는다.
//
// 아래는 런타임 단언이 아니라 컴파일 단언이다. 별칭이 없으면 이 파일이 빌드되지 않는다.
func TestOrderValueTypesAreAliased(t *testing.T) {
	order := &commerce.Order{
		Payment:          &commerce.Payment{},
		BillingAddress:   &commerce.Address{},
		CustomAttributes: []*commerce.Attribute{{}},
		ShippingLines: []*commerce.ShippingLine{{
			TaxLines: []*commerce.TaxLine{{}},
		}},
		Transactions: []*commerce.Transaction{{}},
		Metafields:   []*commerce.Metafield{{}},
		Items: []*commerce.OrderItem{{
			Claimability:     &commerce.Claimability{},
			CustomAttributes: []*commerce.Attribute{{}},
			TaxLines:         []*commerce.TaxLine{{}},
		}},
	}

	if order.GetPayment() == nil {
		t.Fatal("빌드만 통과하면 되는 테스트인데 구성이 잘못됐다")
	}
}
