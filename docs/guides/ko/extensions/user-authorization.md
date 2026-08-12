# User Authorization 가이드

`userAuthorization` Extension은 앱 Function을 실행하기 전에 요청에 포함된 식별자를 확인하도록
선언하는 계약입니다. 지원하는 식별자는 `memberId`, `phone`, `email`입니다.

이 Extension은 **사용자 확인을 비즈니스 리소스 권한으로 바꾸지 않습니다.** AppStore와 앱 서버의
책임은 다음처럼 분리됩니다.

| 주체 | 책임 |
| --- | --- |
| AppStore | 요청 식별자가 인증된 사용자 정보 또는 점유 인증 결과와 일치하는지 확인 |
| 앱 서버 | 그 식별자가 실제 주문·예약·계정·문서 등 요청 대상 리소스의 소유자인지 최종 확인 |

예를 들어 `memberId` 확인을 통과했다는 사실은 요청값이 인증된 Channel Front 사용자의
`memberId`와 일치한다는 뜻입니다. 해당 사용자가 특정 주문의 주문자라는 뜻은 아닙니다.

## 전체 처리 흐름

```text
앱 서버가 보호할 Function과 식별자 경로를 등록
  → Channel에서 Function별 보호 설정을 활성화
  → Channel Front 사용자가 Function 호출
  → AppStore가 선언된 경로에서 식별자 종류와 값을 확인
  → 확인 실패: 앱 Function을 호출하지 않고 오류 반환
  → 확인 성공: 앱 Function 호출
  → 앱 서버가 자체 저장소에서 리소스 소유권과 작업 권한을 다시 확인
  → 조건이 맞을 때만 주문 취소 등의 작업 수행
```

브라우저에서 전송되는 `orderId`, `memberId`, 전화번호, 이메일을 포함한 모든 Function 입력은 사용자가
조작할 수 있습니다. 앱 서버는 서명 검증이 완료된 Function 요청만 신뢰하고, 입력값만으로 리소스를
조회한 뒤 곧바로 변경하지 마세요.

## TypeScript로 Extension 등록하기

SDK는 이 metadata의 공용 schema helper를 제공하지 않으므로 앱에서 schema를 정의합니다.

```ts
import { z } from "zod";
import {
  Extension,
  Func,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";

const DescriptionSchema = z.object({ description: z.string() });
const PathSchema = z.object({ path: z.string().min(1) });
const UserAuthorizationConfigSchema = z.object({
  functions: z
    .array(
      z.object({
        functionName: z.string().min(1),
        identifier: z.object({
          type: PathSchema,
          value: PathSchema,
        }),
        enabledByDefault: z.boolean().optional(),
        description: z.string().optional(),
        i18nMap: z
          .object({
            ko: DescriptionSchema.optional(),
            en: DescriptionSchema.optional(),
            ja: DescriptionSchema.optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

@Extension({ name: "userAuthorization", systemVersion: "v1" })
export class UserAuthorizationExtension {
  @Func("metadata.getConfig")
  @InputSchema(z.object({}))
  @OutputSchema(UserAuthorizationConfigSchema)
  getConfig(): z.infer<typeof UserAuthorizationConfigSchema> {
    return {
      functions: [
        {
          functionName: "orders.cancel",
          enabledByDefault: false,
          description: "주문자 식별자를 확인한 뒤 주문을 취소합니다.",
          i18nMap: {
            en: {
              description:
                "Verify the customer identifier before cancelling an order.",
            },
          },
          identifier: {
            type: { path: "input.authorizationType" },
            value: { path: "input.authorizationValue" },
          },
        },
      ],
    };
  }
}
```

Decorated class를 NestJS module의 `providers`에 추가하고 SDK 자동 등록을 활성화하세요. 직접 등록을
관리하는 앱은 `registerExtension("userAuthorization", "v1")`을 호출할 수 있습니다. Metadata
Function의 전체 이름은 `extension.userAuthorization.metadata.getConfig`입니다.

### Metadata field

| Field | 설명 |
| --- | --- |
| `functions` | 앱이 선언하는 전체 보호 정책 목록. 생략하거나 빈 배열이면 보호할 Function이 없음 |
| `functionName` | Function discovery에 노출한 정확한 전체 이름 |
| `identifier.type.path` | Function input에서 `phone`, `email`, `memberId` 중 하나를 읽을 dot path |
| `identifier.value.path` | 확인할 식별자 문자열을 읽을 dot path |
| `enabledByDefault` | Channel별 설정의 초기값. 생략하면 `true` |
| `description` | 설정 화면에 표시할 기본 설명 |
| `i18nMap` | `ko`, `en`, `ja`별 설명 |

`functionName`과 path는 공백 제거, 대소문자 변환 또는 alias 처리 없이 정확히 일치해야 합니다. 두
path의 leaf는 Function input schema에서 `string`이어야 합니다. `systemVersion: "v1"`은 Extension의
계약 버전이며 보호 대상 Function의 자체 버전이 아닙니다.

`functions`는 부분 수정이 아니라 앱 전체의 현재 정책을 나타냅니다. 재등록할 때 목록에서 Function을
제거하면 해당 Function의 보호 정책도 제거됩니다.

## 보호할 Function 구현하기

Metadata 예시와 일치하는 입력 schema를 정의합니다.

```ts
import { z } from "zod";
import type { Context } from "@channel.io/app-sdk-server";
import {
  Ctx,
  Func,
  Input,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";

const CancelOrderInputSchema = z.object({
  input: z.object({
    orderId: z.string().min(1),
    authorizationType: z.enum(["memberId", "phone", "email"]),
    authorizationValue: z.string().min(1),
  }),
});

const CancelOrderOutputSchema = z.object({ cancelled: z.boolean() });

class OrderFunctions {
  @Func("orders.cancel")
  @InputSchema(CancelOrderInputSchema)
  @OutputSchema(CancelOrderOutputSchema)
  async cancelOrder(
    @Ctx() ctx: Context,
    @Input() params: z.infer<typeof CancelOrderInputSchema>,
  ) {
    const { orderId, authorizationType, authorizationValue } = params.input;

    const ownerMatches = await this.orders.isOwnedByIdentifier({
      channelId: ctx.channel.id,
      orderId,
      identifierType: authorizationType,
      identifierValue: authorizationValue,
    });

    if (!ownerMatches) {
      throw new Error("The caller is not allowed to cancel this order");
    }

    await this.orders.cancel(orderId);
    return { cancelled: true };
  }
}
```

예시는 책임 경계를 보여주기 위해 조회와 변경을 나눴습니다. 실제 mutation은 두 요청 사이의 상태
변경을 막기 위해 가능한 한 하나의 transaction이나 조건부 update로 처리하세요.

```sql
UPDATE orders
SET status = 'cancelled'
WHERE channel_id = :channelId
  AND id = :orderId
  AND customer_identifier_type = :identifierType
  AND normalized_customer_identifier = :normalizedIdentifier
  AND status = 'cancellable';
```

변경된 row가 정확히 하나일 때만 성공으로 응답합니다. 전화번호와 이메일은 앱 저장소에 기록할 때와
비교할 때 같은 정규화 규칙을 사용하세요.

## 식별자별 보증 범위

### `memberId`

보호된 User 호출에서는 입력의 `memberId`가 인증된 Channel Front 사용자의 현재 `memberId`와
일치하는지 확인합니다.

이 확인은 다음을 보증하지 않습니다.

- 그 `memberId`가 입력의 `orderId` 또는 `reservationId`를 소유함
- 앱 DB에 저장된 고객 계정과 Channel User가 자동으로 연결됨
- 브라우저에서 받은 `memberId` 자체가 조작되지 않음

따라서 `memberId`를 보안 경계로 사용할 때는 Channel Front 사용자 인증을 활성화하고 공식 사용자
인증 가이드를 따라야 합니다. 앱은 확인된 요청값과 자체 리소스의 소유자 field를 다시 비교합니다.

### `phone`

입력의 전화번호에 대해 해당 Channel에서 유효한 점유 인증 결과가 있는지 확인합니다. 이것은 그
전화번호가 현재 Function을 호출한 User 또는 특정 주문에 영구적으로 귀속된다는 보증이 아닙니다.

앱은 전화번호를 자체 규칙으로 정규화하고 주문·예약·계정에 저장된 전화번호와 비교해야 합니다.
전화번호 재할당이나 계정 정보 변경을 고려해 민감한 작업에는 추가 정책을 적용하세요.

### `email`

입력의 이메일에 대해 해당 Channel에서 유효한 점유 인증 결과가 있는지 확인합니다. 이것은 이메일이
현재 Function을 호출한 User 또는 특정 리소스의 소유자라는 보증이 아닙니다.

앱은 이메일을 자체 규칙으로 정규화하고 주문·예약·계정에 저장된 이메일과 비교해야 합니다. 별칭과
대소문자 처리 규칙을 임의로 확장하면 다른 계정을 같은 주소로 오인할 수 있으므로 앱의 계정 정책과
일치시키세요.

## 주문 취소 예시

인증된 Front 사용자 `customer-42`가 다음 요청을 보냈다고 가정합니다.

```json
{
  "input": {
    "orderId": "order-100",
    "authorizationType": "memberId",
    "authorizationValue": "customer-42"
  }
}
```

AppStore가 `authorizationValue`와 인증된 사용자의 `memberId`가 일치하는지 확인한 뒤 Function을
호출합니다. 앱 서버는 이어서 자체 DB에서 다음 관계를 확인해야 합니다.

```text
order-100.customerMemberId == customer-42
```

두 값이 같고 주문 상태가 취소 가능할 때만 취소합니다.

### 조작된 요청

공격자가 자신의 올바른 `memberId`와 다른 사람의 주문 ID를 함께 보낼 수 있습니다.

```json
{
  "input": {
    "orderId": "order-victim",
    "authorizationType": "memberId",
    "authorizationValue": "attacker-member-id"
  }
}
```

`attacker-member-id` 자체는 인증된 사용자의 값이므로 User Authorization 검사를 통과할 수 있습니다.
앱이 `orderId`만 보고 취소하면 다른 사람의 주문이 변경됩니다. 앱 DB에서
`order-victim.customerMemberId`와 `attacker-member-id`가 다름을 확인하고 반드시 거절해야 합니다.

전화번호와 이메일도 같은 원칙을 적용합니다. 점유 인증된 식별자와 리소스 식별자를 한 요청에 넣는
것만으로 두 값 사이의 소유 관계가 만들어지지는 않습니다.

## Manager 호출

Manager가 Desk 등 지원되는 surface에서 호출하면 End User용 User Authorization 확인을 적용하지
않을 수 있습니다. 이는 Manager에게 앱의 모든 리소스 권한을 부여한다는 뜻이 아닙니다.

앱 서버는 서명 검증을 마친 `context.caller`를 기준으로 User와 Manager 흐름을 구분하고, Manager의
역할과 대상 Channel, 작업 종류에 맞는 자체 RBAC와 리소스 권한을 검사하세요. Function input의
`caller`, `managerId`, `userId` 같은 값으로 Manager 권한을 만들지 마세요.

## 오류 처리

보호 정책이 활성화된 호출은 다음 단계에서 앱 Function에 도달하지 않을 수 있습니다.

| 상황 | 대표 오류 code | 앱의 처리 |
| --- | --- | --- |
| 등록된 Function 이름과 호출 이름이 다름 | `-32601` | canonical Function 이름과 discovery 확인 |
| 식별자 type/value 누락 또는 형식 오류 | `-32602` | 입력 schema와 metadata path 확인 |
| 사용자 또는 식별자 확인 실패 | `-32801` | 작업을 실행하지 않고 사용자에게 재확인 안내 |
| 확인 과정의 일시적 장애 | `-32000` | 작업이 실행되지 않았다고 간주하고 제한적으로 재시도 |

오류 message에 전화번호, 이메일, `memberId`, 주문 정보를 그대로 포함하지 마세요. Mutation 재시도는
idempotency key나 조건부 update로 중복 실행을 방지해야 합니다.

## 보안 체크리스트

- [ ] `functionName`이 discovery의 정확한 전체 이름과 일치합니다.
- [ ] identifier의 type/value path가 Function input의 string field를 가리킵니다.
- [ ] 보호가 필요한 Function은 Channel별 설정이 실제로 활성화됐는지 테스트했습니다.
- [ ] Channel Front 사용자 인증을 활성화하고 공식 사용자 인증 가이드를 따릅니다.
- [ ] AppStore 서명을 raw request body로 검증한 뒤에만 `context`를 신뢰합니다.
- [ ] 브라우저가 보낸 `orderId`, 식별자, caller 관련 값을 권한 근거로 단독 사용하지 않습니다.
- [ ] 세 식별자 모두 앱 DB에서 주문·예약·계정·리소스 소유권을 다시 확인합니다.
- [ ] Manager 호출에 별도의 RBAC와 리소스 권한 검사를 적용합니다.
- [ ] Mutation을 transaction, 조건부 update, idempotency로 보호합니다.
- [ ] 식별자 원문, 고객 데이터, token, credential을 log나 오류에 남기지 않습니다.

[Function 등록](../functions.md), [Extension 전체 가이드](../extensions.md),
[TypeScript User Authorization 레퍼런스](../../../reference/typescript/extensions/user-authorization.md),
[프로덕션 준비 가이드](../app-development.md)를 함께 확인하세요.
