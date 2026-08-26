# `userAuthorization` Extension 사용 가이드

`userAuthorization`은 민감한 앱 Function을 실행하기 전에, 현재 Channel User가 요청에 담긴
식별자를 사용할 수 있는지 AppStore가 확인하도록 선언하는 Extension입니다. 확인할 수 있는
식별자는 휴대폰 번호(`phone`), 이메일(`email`), 회원 ID(`memberId`)입니다.

예를 들어 ALF가 `orders.cancel`을 호출할 때 다음 순서로 동작합니다.

```text
ALF가 주문 취소 Function 호출
  → AppStore가 이 Function의 본인 확인 설정을 조회
  → 요청에서 휴대폰 번호·이메일·회원 ID를 읽음
  → 본인 확인에 실패하면 앱 Function을 호출하지 않음
  → 본인 확인에 성공하면 앱 Function 호출
  → 앱 서버가 주문 소유권과 취소 가능 상태를 최종 확인
  → 조건이 맞을 때만 주문 취소
```

AppStore의 본인 확인은 건물 입구에서 신분을 확인하는 절차와 같습니다. 앱 서버는 안쪽 창구에서
그 사람이 정말 해당 주문이나 계정의 주인인지 다시 확인해야 합니다. 입구를 통과했다고 다른 사람의
주문까지 변경할 수 있는 것은 아닙니다.

> [!IMPORTANT]
> 현재 AppStore는 `invokeSource`가 `alfTask`이고, 호출자가 신뢰된 User인 ALF Task 호출에만
> `userAuthorization`을 적용합니다. Command, Widget, CustomTab, 일반 Function 호출,
> Manager·System 호출, legacy direct ALF 호출은 이 정책을 거치지 않습니다. 이 경로에도 본인 확인이
> 필요하다면 앱에서 별도 보호 절차를 유지해야 합니다.

## AppStore와 앱 서버의 책임

### AppStore가 확인하는 것

보호 설정이 켜진 지원 경로에서 AppStore는 다음을 처리합니다.

- 등록 당시 discovery한 정확한 Function 이름으로 정책을 찾습니다.
- Channel 관리자가 저장한 Function별 ON/OFF 설정을 적용합니다.
- ALF 호출의 신뢰된 User와 앱에 전달할 `context.user`가 일치하는지 확인합니다.
- `phone`과 `email`은 같은 Channel, 같은 User, 같은 식별자에 유효한 본인 확인 세션이 있는지
  확인합니다.
- `memberId`는 현재 Core User의 `memberId`와 요청값을 그대로 비교합니다.
- 확인에 실패하면 OAuth, API key, Config 같은 credential을 읽거나 앱 Function을 호출하기 전에
  요청을 막습니다.
- `phone` 또는 `email` 세션이 없으면 OTP 발송을 한 번 시도하고, 호출 측에서 인증을 이어갈 수
  있는 정보를 제한적으로 반환합니다.

지원되는 ALF Task User 호출에서 해당 Function의 보호 설정이 켜져 있고 앱 Function이 실제로
호출됐다면, AppStore가 **그 요청에 선언된 식별자 확인을 통과시켰다**고 볼 수 있습니다.

### 앱 개발자가 계속 확인할 것

`userAuthorization`은 앱의 비즈니스 권한까지 판정하지 않습니다. 앱 서버는 다음을 직접 처리해야
합니다.

- 요청한 User가 해당 주문·예약·계정·문서의 소유자인지 확인합니다.
- 주문 상태, 환불 가능 기간, 역할, 요금제처럼 작업에 필요한 조건을 확인합니다.
- AppStore가 확인한 식별자와 앱 저장소의 소유자 식별자를 비교합니다.
- Mutation을 transaction, 조건부 update, idempotency key로 보호합니다.
- Function 요청의 AppStore 서명을 검증한 뒤에만 `context`를 신뢰합니다.
- 식별자, OTP, token, credential 같은 민감한 값을 일반 로그나 오류 메시지에 남기지 않습니다.

다음 두 요청은 모두 올바른 `memberId`로 AppStore 검사를 통과할 수 있습니다.

```json
{
  "orderId": "my-order",
  "authorization": { "type": "memberId", "value": "member-42" }
}
```

```json
{
  "orderId": "another-users-order",
  "authorization": { "type": "memberId", "value": "member-42" }
}
```

AppStore는 `member-42`가 현재 User의 회원 ID라는 사실을 확인합니다. 두 번째 주문이
`member-42`의 주문인지는 앱 서버만 알 수 있습니다. 앱 서버에서 주문 소유자를 비교하지 않으면 다른
사람의 주문을 변경하는 문제가 생깁니다.

## 시작하기 전에

- TypeScript SDK `@channel.io/app-sdk-server` `0.21.0` 이상을 사용합니다.
- 보호할 Function이 ALF Task에서 User를 대신해 호출되는 Function인지 확인합니다.
- Function 입력에 식별자 종류와 값을 문자열로 받을 위치를 정합니다.
- `phone`이나 `email`을 사용한다면 호출 측 ALF가 OTP 입력과 원 요청 재호출을 지원하는지
  확인합니다. 이 흐름이 준비되지 않았다면 production 설정을 켜지 않습니다.
- 처음에는 `enabledByDefault: false`로 등록하고 테스트 Channel에서 먼저 켜는 방식을 권장합니다.

SDK는 아직 `userAuthorization` metadata 전용 schema를 제공하지 않습니다. 앱에서 Zod schema와
metadata Function을 함께 정의해야 합니다.

```bash
pnpm add @channel.io/app-sdk-server@^0.21.0 zod
```

## TypeScript로 적용하기

### 1. 보호할 Function의 입력을 설계하기

식별자 종류와 값을 Function input에 명시적으로 포함합니다. 다음 예시는 휴대폰 번호, 이메일, 회원
ID를 모두 지원합니다.

```ts
import { Injectable } from "@nestjs/common";
import { z } from "zod";
import type { Context } from "@channel.io/app-sdk-server";
import {
  Ctx,
  Func,
  Input,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";

export const CancelOrderInputSchema = z
  .object({
    orderId: z.string().min(1),
    authorization: z
      .object({
        type: z.enum(["phone", "email", "memberId"]),
        value: z.string().min(1),
      })
      .strict(),
  })
  .strict();

const CancelOrderOutputSchema = z
  .object({
    cancelled: z.boolean(),
  })
  .strict();

@Injectable()
export class OrderFunctions {
  constructor(private readonly orders: OrdersService) {}

  @Func("orders.cancel")
  @InputSchema(CancelOrderInputSchema)
  @OutputSchema(CancelOrderOutputSchema)
  async cancelOrder(
    @Ctx() ctx: Context,
    @Input() input: z.infer<typeof CancelOrderInputSchema>,
  ) {
    const cancelled = await this.orders.cancelIfOwned({
      channelId: ctx.channel.id,
      orderId: input.orderId,
      identifierType: input.authorization.type,
      identifierValue: input.authorization.value,
    });

    if (!cancelled) {
      throw new Error("The caller cannot cancel this order");
    }

    return { cancelled: true };
  }
}
```

`cancelIfOwned`는 소유권과 취소 가능 상태를 확인하고 주문을 변경하는 과정을 하나의 transaction이나
조건부 update로 처리하는 원자적 mutation을 나타냅니다. 취소 과정에서 환불 같은 외부 side effect가
발생한다면 idempotency key나 영구 deduplication record를 사용해 동시 호출과 재시도가 같은 작업을 두
번 실행하지 않게 해야 합니다.

한 가지 식별자만 지원한다면 선택지를 좁혀도 됩니다. 예를 들어 휴대폰 번호만 받는 Function은 다음과
같이 선언할 수 있습니다.

```ts
const PhoneAuthorizationSchema = z.object({
  type: z.enum(["phone"]),
  value: z.string().min(1),
});
```

AppStore가 schema를 바탕으로 Function 입력 UI를 만들 때 `type`에는 휴대폰 번호만 선택지로
표시됩니다.

### 2. metadata Function 구현하기

`userAuthorization` Extension의 metadata Function은 앱에서 보호할 Function과 식별자를 읽을 경로를
AppStore에 알려줍니다.

```ts
import { z } from "zod";
import {
  Extension,
  Func,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";

const DescriptionSchema = z
  .object({
    description: z.string().min(1),
  })
  .strict();

const PathSchema = z
  .object({
    path: z.string().min(1),
  })
  .strict();

const UserAuthorizationFunctionSchema = z
  .object({
    functionName: z.string().min(1),
    enabledByDefault: z.boolean().optional(),
    description: z.string().optional(),
    i18nMap: z
      .object({
        ko: DescriptionSchema.optional(),
        en: DescriptionSchema.optional(),
        ja: DescriptionSchema.optional(),
      })
      .strict()
      .optional(),
    identifier: z
      .object({
        type: PathSchema,
        value: PathSchema,
      })
      .strict(),
  })
  .strict();

const UserAuthorizationConfigSchema = z
  .object({
    functions: z.array(UserAuthorizationFunctionSchema).optional(),
  })
  .strict();

@Extension({ name: "userAuthorization", systemVersion: "v1" })
export class UserAuthorizationExtension {
  @Func("metadata.getConfig")
  @InputSchema(z.object({}).strict())
  @OutputSchema(UserAuthorizationConfigSchema)
  getConfig(): z.infer<typeof UserAuthorizationConfigSchema> {
    return {
      functions: [
        {
          functionName: "orders.cancel",
          enabledByDefault: false,
          description: "주문자 본인 확인 후 주문을 취소합니다.",
          i18nMap: {
            en: {
              description:
                "Cancel an order after verifying the customer identifier.",
            },
            ja: {
              description: "注文者の本人確認後に注文をキャンセルします。",
            },
          },
          identifier: {
            type: { path: "authorization.type" },
            value: { path: "authorization.value" },
          },
        },
      ],
    };
  }
}
```

SDK가 공개하는 metadata Function의 전체 이름은 다음과 같습니다.

```text
extension.userAuthorization.metadata.getConfig
```

### Metadata field

| Field                   | 역할                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `functions`             | 앱 전체의 현재 보호 정책 목록입니다. 생략하거나 빈 배열을 반환하면 보호할 Function이 없다는 뜻입니다. |
| `functionName`          | Discovery에 노출한 보호 대상 Function의 정확한 전체 이름입니다.                                       |
| `identifier.type.path`  | Function input에서 `phone`, `email`, `memberId` 중 하나를 읽을 경로입니다.                            |
| `identifier.value.path` | 확인할 식별자 문자열을 읽을 경로입니다.                                                               |
| `enabledByDefault`      | Channel별 설정의 초기값입니다. 생략하면 `true`입니다.                                                 |
| `description`           | 설정 화면에 표시할 기본 설명입니다.                                                                   |
| `i18nMap`               | `ko`, `en`, `ja`별 설명입니다.                                                                        |

`functions`는 일부 항목만 고치는 patch가 아니라 앱의 **전체 정책 snapshot**입니다. 재등록할 때 기존
목록에 있던 Function을 빼면 해당 보호 정책과 Channel별 설정도 제거됩니다.

같은 `functionName`을 두 번 넣거나, discovery에 없는 Function을 선언하거나, 두 identifier path를
같게 지정하면 등록 전체가 실패합니다. AppStore는 잘못된 snapshot을 일부만 저장하지 않고 이전에
정상 등록한 snapshot을 유지합니다.

### 3. Provider와 자동 등록 설정하기

두 class를 NestJS module의 `providers`에 추가합니다. Provider에서 빠진 class는 SDK가 discovery할
수 없습니다.

```ts
import { Module } from "@nestjs/common";
import { ChannelAppModule } from "@channel.io/app-sdk-server";

@Module({
  imports: [
    ChannelAppModule.forRoot({
      appId: process.env.APP_ID!,
      appSecret: process.env.APP_SECRET!,
      signingKey: process.env.SIGNING_KEY!,
      autoRegister: true,
    }),
  ],
  providers: [OrderFunctions, UserAuthorizationExtension],
})
export class AppModule {}
```

개발 환경이나 단일 instance 앱에서는 자동 등록을 사용할 수 있습니다. 여러 instance를 순차 배포하는
운영 환경에서는 모든 instance의 `getFunctions`와 `getConfig` 응답이 같아진 뒤 등록 요청을 한 번만
실행하세요. 서로 다른 release가 동시에 응답하는 동안 자동 등록하면 이전 metadata가 마지막
snapshot으로 저장될 수 있습니다.

직접 등록을 관리한다면 app token을 발급한 뒤
`nativeClient.registerExtension(appId, "userAuthorization", "v1", appToken.accessToken)`을
호출합니다. Function Endpoint가 외부 요청에 응답할 준비를 마친 뒤 등록해야 합니다.

### 4. Channel에서 보호 설정 켜기

앱을 Channel에 설치하고 등록을 마치면 AppStore 설정 화면에 Function별 toggle이 표시됩니다. 실제
적용값은 다음 순서로 결정합니다.

```text
Channel에서 저장한 ON/OFF 값이 있음
  → 저장한 값 사용

저장한 값이 없음
  → enabledByDefault 사용
```

`enabledByDefault`를 생략하면 `true`입니다. 새 정책이 등록되는 순간 기존 설치 Channel에도 보호가
켜질 수 있으므로, 처음 배포할 때는 `false`를 명시하고 통제된 Channel에서 먼저 켜는 방식을
권장합니다.

설정이 OFF인 호출도 앱의 리소스 권한 검사는 생략하면 안 됩니다. 본인 확인이 꺼져 있어도 앱 서버의
소유권·상태 검사는 항상 같은 기준으로 실행해야 합니다.

## Metadata 작성 규칙

### Function 이름은 정확히 맞추기

`functionName`은 SDK discovery의 canonical Function 이름과 글자 하나까지 같아야 합니다.

```text
Discovery: orders.cancel
Metadata:  orders.cancel            ✅
Metadata:  extension.orders.cancel  ❌
Metadata:  Extension.Orders.Cancel  ❌
```

AppStore는 공백을 자르거나 대소문자를 바꾸지 않습니다. Prefix를 붙이거나 떼지 않고 alias도 만들지
않습니다. `userAuthorization`을 등록한 앱의 지원 대상 ALF User 호출에서 catalog에 없는 이름을
사용하면 보호 여부와 관계없이 `-32601`을 반환합니다.

### Path는 문자열 field를 가리키기

Path는 점으로 구분한 JSON object 경로입니다. 각 경로의 마지막 field는 Function input schema에서
문자열이어야 합니다.

```json
{
  "authorization": {
    "type": "phone",
    "value": "01012345678"
  }
}
```

위 입력에는 다음 경로를 사용합니다.

```json
{
  "identifier": {
    "type": { "path": "authorization.type" },
    "value": { "path": "authorization.value" }
  }
}
```

AppStore는 비슷한 key를 찾거나 배열을 탐색하지 않습니다. 등록할 때 discovery schema에서 두 경로를
검증하고, 실행할 때도 같은 경로에서 문자열을 읽습니다.

### Function version을 metadata에 넣지 않기

정책의 identity는 다음 두 값입니다.

```text
(appId, canonicalFunctionName)
```

`systemVersion: "v1"`은 `userAuthorization` Extension metadata 계약의 버전입니다. 보호 대상
Function의 버전이 아닙니다. Metadata에 `targetSystemVersion`이나 Function별 `systemVersion`을
추가하지 마세요. 같은 canonical Function을 versioned 또는 unversioned route로 호출해도 같은 정책을
사용합니다. 더 이상 쓰지 않는 version field를 넣으면 AppStore가 등록을 거절합니다.

## 식별자별 보증 범위

| Type       | AppStore가 확인하는 것                                              | 앱 서버가 추가로 확인할 것                                     |
| ---------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| `phone`    | 같은 Channel과 User가 해당 휴대폰 번호로 만든 유효한 본인 확인 세션 | 이 번호가 주문·예약·계정에 저장된 번호와 일치하는지 확인       |
| `email`    | 같은 Channel과 User가 해당 이메일로 만든 유효한 본인 확인 세션      | 이 이메일이 앱 계정이나 대상 리소스의 이메일과 일치하는지 확인 |
| `memberId` | 현재 Core User의 `memberId`와 요청 문자열의 exact match             | 해당 `memberId`가 대상 리소스의 소유자인지 확인                |

휴대폰 번호와 이메일의 본인 확인 세션은 영구적인 소유권 증명이 아닙니다. 세션이 만료될 수 있고,
전화번호가 재할당되거나 계정 정보가 바뀔 수도 있습니다. 앱의 위험도에 맞춰 추가 확인과 변경 제한을
적용하세요.

세션 identity에는 app ID가 들어가지 않습니다. 같은 Channel의 같은 User가 같은 식별자로 본인 확인을
마쳤다면 다른 앱의 보호 Function에서도 유효한 세션을 재사용할 수 있습니다.

본인 확인 앱은 휴대폰 번호와 이메일을 정규화해 세션을 찾지만, 보호 대상 Function에는 원래
`params`가 전달됩니다. 앱 저장소의 값과 비교할 때는 앱이 사용하는 기준으로 두 값을 같은 형태로
정규화하세요.

`memberId`는 공백 제거, 대소문자 변환, alias 변환 없이 그대로 비교합니다. 앱 저장소에서도 같은
identity를 사용해야 합니다.

## 실행 결과 이해하기

현재 지원되는 ALF Task User 호출은 다음처럼 처리됩니다.

| 상태                                             | 결과                                                   |
| ------------------------------------------------ | ------------------------------------------------------ |
| 앱이 `userAuthorization`을 등록하지 않음         | 기존 method로 호출                                     |
| 등록했지만 요청 이름이 discovery catalog에 없음  | `-32601`, 앱 Function 미호출                           |
| Function은 catalog에 있지만 metadata에 없음      | 본인 확인 없이 canonical Function 호출                 |
| 보호 metadata가 있지만 설정이 OFF                | 본인 확인 없이 canonical Function 호출                 |
| 보호 설정 ON, 식별자 입력이 잘못됨               | `-32602`, 앱 Function 미호출                           |
| 보호 설정 ON, 본인 확인이 필요함                 | `-32801`, 앱 Function 미호출                           |
| 보호 설정 ON, AppStore·Core·DB·본인 확인 앱 장애 | `-32000`, 앱 Function 미호출                           |
| 보호 설정 ON, 본인 확인 성공                     | 앱 Function 호출                                       |
| ALF Task 요청이지만 신뢰된 User가 없음           | `userAuthorization`을 적용하지 않고 기존 method로 호출 |
| ALF Task User가 아닌 호출                        | `userAuthorization`을 적용하지 않고 기존 method로 호출 |

`userAuthorization` 정책에 들어온 뒤 실패하면 AppStore는 보호 대상 Function을 호출하지 않습니다.
따라서 앱 서버에서 이 오류를 받아 처리하는 구조가 아니라, ALF 같은 Function 호출자가 오류를 받고
다음 동작을 결정합니다.

## OTP 인증 흐름

`phone` 또는 `email` 세션이 없으면 AppStore가 본인 확인 앱에 OTP 발송을 한 번 요청하고
`-32801`을 반환합니다. 발송 요청이 접수된 경우에만 오류 `data`에 다음 형태의 후속 호출 정보를
담습니다.

```json
{
  "userAuthorization": {
    "otp": {
      "sent": true,
      "appId": "personal-auth-app-id",
      "method": "verifyCode",
      "systemVersion": "v1",
      "identifierType": "email",
      "identifier": "customer@example.com"
    }
  }
}
```

`sent: true`는 발송 요청을 접수했다는 뜻입니다. 사용자의 단말이나 받은편지함에 도착했다는 보증은
아닙니다. 발송 제한, 발송 실패, `memberId` 확인 실패처럼 OTP로 이어갈 수 없는 `-32801`에는 이
`data`가 없을 수 있습니다. `identifier`는 원문이므로 호출 측에서도 이 오류 `data`를 일반 로그에
남기지 마세요.

호출 측 ALF 연동은 다음 절차를 구현해야 합니다.

1. `-32801`과 `data.userAuthorization.otp`를 확인합니다.
2. 사용자에게 OTP를 물어봅니다.
3. 안내받은 `verifyCode@v1`을 같은 Channel과 User context로 호출합니다.
4. 인증에 성공하면 원래 Function 요청을 다시 호출합니다.

AppStore는 원래 요청을 자동으로 다시 실행하지 않습니다. 앱 Function은 인증 뒤 같은 요청이 다시
들어와도 중복 취소나 중복 환불이 생기지 않도록 idempotent하게 구현하세요. 앱 서버가 OTP를 직접
받거나 본인 확인 앱을 직접 호출할 필요는 없습니다.

## 오류 처리 기준

| Code     | 의미                                           | 확인할 것                                                 |
| -------- | ---------------------------------------------- | --------------------------------------------------------- |
| `-32601` | Canonical Function을 찾지 못함                 | `functionName`, discovery, 호출 method의 exact match 확인 |
| `-32602` | 식별자 type 또는 value가 없거나 잘못됨         | Input schema와 metadata path 확인                         |
| `-32801` | 본인 확인이 필요하거나 확인에 실패함           | OTP 후속 정보가 있으면 인증을 이어가고, 없으면 다시 안내  |
| `-32000` | AppStore, Core, DB, 본인 확인 앱의 일시적 장애 | 작업이 실행되지 않았다고 보고 제한적으로 재시도           |

App Function이 호출된 뒤 반환한 오류는 기존 계약을 그대로 사용합니다. 본인 확인 오류 메시지에
휴대폰 번호, 이메일, 회원 ID 같은 원문을 복사하지 마세요.

## 배포와 재등록

정책을 안전하게 바꾸려면 다음 순서로 배포합니다.

1. 새 Function과 metadata를 모든 app server instance에 먼저 배포합니다.
2. 모든 instance의 `getFunctions`와 `getConfig` 응답이 같은지 확인합니다.
3. `userAuthorization:v1`을 한 번 등록하거나 재등록합니다.
4. Test Channel에서 Function 목록과 설명을 확인합니다.
5. Function별 설정을 ON으로 바꿉니다.
6. 본인 확인 성공·실패와 앱의 리소스 권한 검사를 함께 테스트합니다.
7. 검증을 마친 뒤 대상 ALF traffic을 엽니다.

Function을 추가하거나 이름을 바꿀 때는 traffic보다 재등록을 먼저 완료하세요. 등록된 catalog에 없는
새 이름은 `-32601`로 차단됩니다. 보호를 잠시 끌 때는 Extension을 해제하지 말고 Channel 설정을
OFF로 바꿉니다. Extension 등록을 해제하면 snapshot과 Function별 설정이 함께 제거됩니다.

## 출시 전 체크리스트

- [ ] `@channel.io/app-sdk-server` `0.21.0` 이상을 사용합니다.
- [ ] 보호 대상이 현재 지원되는 ALF Task User 호출인지 확인했습니다.
- [ ] `functionName`이 discovery의 canonical 이름과 정확히 일치합니다.
- [ ] `identifier.type.path`와 `identifier.value.path`가 input schema의 문자열을 가리킵니다.
- [ ] `functions`가 일부 변경분이 아니라 앱 전체 정책 snapshot입니다.
- [ ] 첫 배포에서는 `enabledByDefault: false`를 명시했습니다.
- [ ] 모든 app server instance의 discovery와 metadata가 같아진 뒤 등록했습니다.
- [ ] OFF, ON, 잘못된 입력, 세션 없음, 인증 성공을 각각 테스트했습니다.
- [ ] `phone`, `email`, `memberId`를 앱 리소스의 소유자와 다시 비교합니다.
- [ ] Manager와 정책 적용 제외 경로에 필요한 앱 자체 권한 검사가 있습니다.
- [ ] Mutation을 transaction, 조건부 update, idempotency로 보호했습니다.
- [ ] 식별자, OTP, token, credential을 로그와 오류에 남기지 않습니다.

[Function 등록](../functions.md), [Extension 전체 가이드](../extensions.md),
[TypeScript User Authorization 레퍼런스](../../../reference/typescript/extensions/user-authorization.md),
[프로덕션 준비 가이드](../app-development.md)를 함께 확인하세요.
