---
"@channel.io/app-sdk-core": minor
---

commerce·order 계약에 몰 공통 필드를 추가한다.

표준 모델이 담지 못해 각 앱이 자기 확장으로 따로 실어 나르던 값들이다. 카페24를 commerce
extension 으로 옮기며 드러났지만 카페24만의 문제가 아니라, 같은 값을 shopby·godomall 도
지금 버리고 있다.

CommerceOrder
market_id / market_order_no — 외부 마켓(네이버·쿠팡 등) 유입 주문의 마켓과 그 마켓 주문번호.
shopby channelId, godomall channelId·mall 이 같은 개념이다.

CommerceOrderItem
status_code / status_text — 몰이 준 진행 상태 원문 코드와 표시 문구. state 는 정규화 값이라
몰 고유 상태로 분기하려면 원문이 필요하다. shopby orderStatusType, godomall currentStatus.
claim_status_code — 클레임 성격(정상·취소·반품·교환) 코드. 진행 상태와 축이 다르다.
shopby 도 orderStatusType 과 claimStatusType 을 따로 둔다.
supplier_id / supplier_name — 상품 공급사.
option_amount — 옵션 추가금. amount 에 합산돼 있으나 분리해 보여줘야 하는 몰이 있다.
bundle / bundle_id / bundle_name / bundle_type / bundle_items — 세트(번들) 상품과 그 구성품.

OrderPayment (order·commerce 공유)
point_amount / credit_amount / coupon_discount_amount — discount_amount 는 이 셋의 합이라
무엇으로 깎였는지 안내할 수 없었다. godomall mileage, colorme point_discount,
shopby 쿠폰 할인 3종이 같은 개념이다.
due_amount — 아직 결제되지 않은 잔액(무통장 입금 대기 등).

OrderAddress (order·commerce 공유)
country_code — ISO 3166-1 alpha-2. country 는 표시용 국가명이라 코드 비교에 쓸 수 없다.
shopby·godomall 은 이미 이 값을 갖고 있고 ch-dropwizard 의 주소 모델에도 있다.

OrderFulfillment (order·commerce 공유)
tracking_company_name — tracking_company 에 택배사 "코드" 가 들어가는 몰이 있어 사람이 읽을
수 없었다(shopby DeliveryCompanyType, 카페24 shippingCompanyCode). 표시용 이름을 따로 둔다.
items — 한 배송 안에서 항목별로 상태가 갈리는 몰이 있다. state 는 배송 단위 상태다.

전부 추가 필드이고 기존 필드의 타입·필수 여부는 건드리지 않는다. 새 필드는 모두 optional 이라
채우지 않는 앱은 영향이 없다.
