# 설정 화면에 연동 정보 표시

## 어떤 기능인가요

앱이나 외부 서비스에서 조회한 정보를 채널톡의 표준 설정 화면에 표시하는 기능입니다.
사용자는 설정 화면에서 연동한 매장명, 도메인처럼 앱이 제공하는 정보를 확인할 수 있습니다.

`config.display.load` 훅에 값을 조회할 앱 함수를 연결하면, 설정 화면이 함수를 호출하고 반환한
값을 읽기 전용 필드에 표시합니다. 별도의 화면 코드를 작성할 필요 없이 기존 Config 필드를
사용할 수 있습니다.

표시한 값은 Config에 저장하지 않습니다. 원본 데이터는 앱이나 외부 서비스에서 관리하고,
설정 화면에서는 조회한 결과를 보여줍니다.

## 언제 사용하나요

사용자가 직접 입력할 필요 없이, 앱이 알고 있는 정보를 설정 화면에서 확인하게 하고 싶을 때
사용합니다.

- **연동한 대상을 확인할 때**: 매장명과 도메인을 표시해 어떤 매장을 연동했는지 알려줍니다.
- **외부 서비스에서 관리하는 정보를 보여줄 때**: 이용 중인 요금제나 계약 만료일을 조회해 표시합니다.
- **앱의 처리 현황을 보여줄 때**: 마지막 동기화 시각이나 처리한 주문 수를 조회해 표시합니다.

설정 화면을 열거나 설정 저장·연동 완료 후 화면을 갱신할 때 값을 다시 조회합니다.
화면을 열어둔 동안 주기적으로 갱신하거나, 사용자가 입력값을 바꿀 때마다 조회하는 기능은 아닙니다.

사용자가 입력한 값을 저장하고 이후 앱 함수에서 사용해야 한다면 일반 Config 필드를 사용해주세요.

## 예제: 연동한 매장 정보 표시

쇼핑몰 연동 앱에서 매장명과 도메인을 보여주는 예제입니다. 사용자는 앱 설정을 열어 연동한
매장이 맞는지 확인할 수 있습니다.

| 항목   | 표시할 값        |
| ------ | ---------------- |
| 매장명 | 채널상점         |
| 도메인 | shop.example.com |

구현에 필요한 것은 표시할 필드와 매장 정보를 조회하는 앱 함수입니다.

### 1. 표시할 필드와 조회 함수 연결

`metadata.getConfigSchema` 응답에 매장명과 도메인 필드를 정의하고, `hooks`에 조회할 함수 이름을
지정해주세요.

```json
{
  "schemaVersion": "v1",
  "configScope": "channel",
  "providerName": "Shop",
  "hooks": [
    {
      "type": "config.display.load",
      "actionFunctionName": "shop.getDisplayValues"
    }
  ],
  "blocks": [
    {
      "type": "text",
      "key": "storeName",
      "label": "매장명",
      "readOnly": true,
      "storageClass": "transient",
      "overviewSummary": true
    },
    {
      "type": "text",
      "key": "storeDomain",
      "label": "도메인",
      "readOnly": true,
      "storageClass": "transient",
      "overviewSummary": true
    }
  ]
}
```

각 필드에 `readOnly: true`와 `storageClass: "transient"`를 함께 지정합니다. 사용자의 편집을
막고, 값을 저장 대상에서 제외하는 설정입니다.

이 예제는 단일 설정을 사용합니다. `overviewSummary: true`를 추가하면 저장된 연동의 요약 화면에도
해당 정보를 표시할 수 있습니다.

### 2. 앱 함수에서 매장 정보 반환

`shop.getDisplayValues`를 일반 앱 함수로 등록하고, 해당 채널에 연동된 매장 정보를 조회하도록
구현해주세요. 함수 이름은 앱에서 정할 수 있으며, `actionFunctionName`과 일치해야 합니다.

이 예제에서 함수의 입력값은 `{}`입니다. 조회할 채널은 인증된 호출 정보인 `ctx.channel.id`로
확인합니다. 실제 데이터 조회와 접근 권한 확인은 앱 함수에서 처리합니다.

조회한 값은 다음 형식으로 반환합니다.

```json
{
  "displayValues": {
    "storeName": "채널상점",
    "storeDomain": "shop.example.com"
  }
}
```

`displayValues`의 키는 앞서 정의한 필드의 `key`와 일치해야 합니다. 위 응답을 받으면 설정 화면의
‘매장명’에 ‘채널상점’, ‘도메인’에 ‘shop.example.com’을 표시합니다.

함수는 표시할 정보를 조회하는 역할만 맡습니다. 설정을 저장하거나 외부 데이터를 변경하는 작업은
포함하지 않습니다.

### 3. 정보가 없거나 조회에 실패한 경우 처리

아직 매장을 연동하지 않아 표시할 정보가 없다면 다음과 같이 반환할 수 있습니다.

```json
{
  "displayValues": {}
}
```

빈 객체를 반환하면 같은 대상의 기존 표시값 중 현재 필드 정의에 맞는 값을 유지합니다.
이전 값을 지우려면 해당 키에 `null`을 반환해주세요.

```json
{
  "displayValues": {
    "storeName": null,
    "storeDomain": null
  }
}
```

조회에 실패하면 설정 화면이 오류와 재시도 버튼을 표시합니다. 같은 대상에서 마지막으로 조회에
성공한 값이 있다면 유지합니다.

표시값은 저장 요청이나 이후 함수 호출의 `ctx.config`에 포함되지 않습니다. 연동 완료 여부도
별도로 검증하므로, 정보가 표시됐다는 사실만으로 연동 성공을 판단하지 않습니다.

---

적용하려면 `config.display.load`를 지원하는 AppStore 서버와 표준 설정 화면이 필요합니다.
SDK 0.24.2의 `GetConfigSchemaOutputSchema`를 사용한다면 `hooks` 배열과 `readOnly` 속성을
보존하도록 `metadata.getConfigSchema`의 출력 스키마를
`@OutputSchema(z.record(z.string(), z.unknown()))`으로 지정해주세요.
