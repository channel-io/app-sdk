# 설정 화면에 조회값 표시

`config.display.load`는 앱이 조회한 값을 설정 화면의 읽기 전용 필드에 채웁니다.
연동한 매장명, 도메인, 주문 수처럼 사용자가 확인할 정보를 표시할 때 사용합니다.
기존 Config 필드를 정의하고, 값을 조회할 앱 Function을 hook에 연결하면 됩니다.

이 가이드는 TypeScript와 NestJS 기준입니다. Config의 기본 구조는
[Config Extension](config.md)에서 확인해주세요.

## 데이터 흐름과 저장 위치

매장명을 화면에 표시하는 흐름은 다음과 같습니다.

1. 앱의 `metadata.getConfigSchema`가 `storeName` 필드와 hook을 반환합니다.
2. 표준 설정 화면이 hook에 지정한 앱 Function을 호출합니다.
3. 앱 Function이 앱 DB나 외부 API에서 매장명을 조회합니다.
4. 앱이 `{ displayValues: { storeName: "예시 상점" } }`을 반환합니다.
5. 설정 화면이 필드 이름과 값의 타입을 검증한 뒤 `storeName` 필드에 표시합니다.

| 데이터                    | 위치                        | 용도                                     |
| ------------------------- | --------------------------- | ---------------------------------------- |
| 필드 정의와 hook          | 앱이 반환하는 Config 스키마 | 화면 구성과 호출할 Function 지정         |
| 매장명 원본               | 앱 DB나 외부 서비스         | 앱 Function이 조회                       |
| 조회한 표시값             | 현재 설정 화면의 메모리     | 읽기 전용 필드에 표시                    |
| 사용자가 저장한 일반 설정 | AppStore의 Config 저장소    | 이후 Function 호출의 `ctx.config`에 전달 |

표시값은 Config 저장 요청, 변경 여부 판단, `ctx.config`에 포함하지 않습니다.
화면을 다시 열면 앱 Function을 호출해 값을 조회합니다. 조회한 값만 바뀌어도 저장 버튼이
활성화되지는 않습니다. 표시 전용 필드만 있으면 기본 저장 버튼을 만들지 않습니다.

## 사용 전 확인

`config.display.load`를 지원하는 AppStore 서버와 표준 설정 화면이 필요합니다.
앱의 SDK 버전만 올려서는 이 기능을 사용할 수 없습니다. 서버와 화면의 지원을 먼저 확인한 뒤
hook을 등록해주세요. 이전 서버는 새 hook을 거부합니다.

2026-09-15 기준 SDK의 `GetConfigSchemaOutputSchema`는 `hooks`를 기존 객체 형태로 정의하고,
필드의 `readOnly` 속성을 정의하지 않습니다. 아래 예제는 새 hook 배열과 필드 속성을 보존하도록
Config 스키마 응답에 `z.record(z.string(), z.unknown())`을 사용합니다.
기존 SDK 스키마로 새 응답을 파싱하면 hook 배열을 거부하거나 필드 속성을 제거할 수 있습니다.

이 방식에서도 AppStore가 Config 스키마를 검증합니다. 표시 Function의 응답은 별도의
`OutputSchema`로 구조를 검사하고, 표준 설정 화면이 Config 필드별 타입을 검사합니다.

## TypeScript 구현

### 1. 필드와 hook 정의

다음 코드를 앱 서버의 `config.extension.ts`에 추가해주세요.
기존 Config Extension이 있다면 그 클래스의 스키마에 필드와 hook을 추가합니다.

```ts
import { Extension, Func, OutputSchema } from "@channel.io/app-sdk-server";
import { z } from "zod";

@Extension({ name: "config", systemVersion: "v1" })
export class ConfigExtension {
  @Func("metadata.getConfigSchema")
  @OutputSchema(z.record(z.string(), z.unknown()))
  getConfigSchema() {
    return {
      schemaVersion: "v1",
      configScope: "channel",
      supportsMultiple: false,
      providerName: "예시 상점",
      hooks: [
        {
          type: "config.display.load",
          actionFunctionName: "commerce.config.getDisplayValues",
        },
      ],
      blocks: [
        {
          type: "text",
          key: "storeName",
          label: "매장명",
          readOnly: true,
          storageClass: "transient",
          overviewSummary: true,
        },
        {
          type: "number",
          key: "orderCount",
          label: "주문 수",
          readOnly: true,
          storageClass: "transient",
        },
        {
          type: "switch",
          key: "active",
          label: "매장 운영",
          readOnly: true,
          storageClass: "transient",
        },
      ],
    };
  }
}
```

`readOnly: true`는 사용자 편집을 막고, `storageClass: "transient"`는 값을 저장하지 않도록
지정합니다. 두 속성이 모두 필요합니다. 기존 `readonly: true` 표기도 지원합니다.

hook은 호출 시점과 Function 이름을 연결하는 설정입니다. `config.display.load`는 정해진
hook 이름이고, `commerce.config.getDisplayValues`는 앱이 선택한 Function 이름입니다.
이 이름에 `commerce`를 사용해도 Commerce Extension을 등록할 필요는 없습니다.
기존 hook이 있다면 배열에 함께 유지해주세요.
특정 Function 버전을 호출하려면 hook에 `systemVersion`을 지정합니다.
생략하면 기존 앱 버전 선택 방식을 사용합니다.

### 2. 표시값을 반환할 Function 구현

다음 코드를 `config-display.functions.ts`에 추가해주세요.
고정값으로 동작을 확인하는 예제이며, 실제 앱에서는 반환할 값을 앱 DB나 외부 API에서 조회합니다.

```ts
import { Injectable } from "@nestjs/common";
import {
  Ctx,
  Func,
  Input,
  InputSchema,
  OutputSchema,
  type Context,
} from "@channel.io/app-sdk-server";
import { z } from "zod";

const DisplayInputSchema = z.object({ key: z.string().optional() }).strict();
const DisplayOutputSchema = z.object({ displayValues: z.record(z.string(), z.unknown()) }).strict();

@Injectable()
export class ConfigDisplayFunctions {
  @Func("commerce.config.getDisplayValues")
  @InputSchema(DisplayInputSchema)
  @OutputSchema(DisplayOutputSchema)
  getDisplayValues(@Ctx() ctx: Context, @Input() _params: z.infer<typeof DisplayInputSchema>) {
    if (!ctx.channel?.id) {
      throw new Error("Channel context is required");
    }

    // 실제 조회에서는 ctx.channel.id에 속한 데이터만 반환합니다.
    return {
      displayValues: {
        storeName: "예시 상점",
        orderCount: 0,
        active: false,
      },
    };
  }
}
```

이 클래스는 `@Extension` 없이 일반 앱 Function으로 등록합니다.
`@Func`의 문자열을 앞에서 지정한 `actionFunctionName`과 일치시켜주세요.
`display`라는 이름의 SDK 내장 함수를 구현하는 방식은 아닙니다.

응답의 최상위 속성은 `displayValues` 하나입니다. 내부 key는 Config의 `field.key`와
정확히 일치해야 합니다. 그룹 안의 필드도 동일하며, `store.name`처럼 점을 포함한 key는
`{ "store.name": "예시 상점" }`으로 반환합니다.
필드별 응답 스키마를 중복 작성할 필요는 없습니다.

### 3. NestJS에 클래스 등록

기존 `ChannelAppModule` 설정을 유지하고, 앱 모듈의 `providers`에 두 클래스를 추가해주세요.

```ts
import { Module } from "@nestjs/common";
import { ConfigExtension } from "./config.extension";
import { ConfigDisplayFunctions } from "./config-display.functions";

@Module({
  providers: [ConfigExtension, ConfigDisplayFunctions],
})
export class ConfigModule {}
```

앱의 루트 모듈이 이 `ConfigModule`을 import하도록 연결합니다.
`ChannelAppModule.forRoot({ ..., autoRegister: true })`를 사용하는 앱은 SDK가 클래스를 발견해
Config Extension과 일반 Function을 등록합니다. 기존의 함수 서버, 요청 서명 검증, 인증 설정은
[Extension 등록 가이드](../extensions.md)를 따라 유지해주세요.

## Function에 전달하는 값

| 설정 방식           | 호출 시점                             | `params`                        | 저장된 값 조회             |
| ------------------- | ------------------------------------- | ------------------------------- | -------------------------- |
| 단일 설정           | 처음 열 때, 저장된 설정이 없어도 호출 | `{}`                            | `ctx.config`               |
| 복수 설정           | 저장한 항목을 열 때                   | `{ "key": "saved-config-key" }` | `ctx.config?.[params.key]` |
| 복수 설정의 새 항목 | 저장 전에는 호출하지 않음             | 없음                            | 없음                       |

`supportsMultiple: true`로 설정하면 복수 설정을 사용합니다.
새 항목을 저장한 뒤에는 반환된 설정 key로 동적 선택지를 조회하고, 같은 key로 표시 Function을
호출합니다. 복수 설정의 일반 Function은 항목이 하나여도 `ctx.config`를 key별 값의 맵으로
받습니다. 표시 Function에서 `ctx.config.storeName`처럼 단일 설정 구조로 읽지 않도록 주의해주세요.

저장한 설정이 없거나 외부 조회에 필요한 값이 아직 준비되지 않았다면 앱 Function이 처리 방식을
정합니다. 처음 연동하기 전처럼 정상적인 빈 상태는 `{ displayValues: {} }`를 반환할 수 있습니다.
이전에 표시한 값을 지우려면 해당 key에 `null`을 반환해주세요.
플랫폼은 함수에 필요한 입력값이나 기본값을 자동으로 만들어주지 않습니다.

### 채널과 매니저 스콥

`configScope: "channel"`과 `configScope: "manager"`를 모두 지원합니다.
`scope`, `channelId`, `managerId`를 표시 Function의 `params`에 추가하지 않습니다.

- 채널 ID는 인증된 `ctx.channel.id`에서 읽습니다.
- 매니저 설정은 `ctx.caller.type === "manager"`일 때 `ctx.caller.id`에 해당하는 본인 설정입니다.
- 매니저 스콥의 Function은 매니저 context가 없으면 오류를 반환해야 합니다.
- 복수 설정의 key로 앱 DB나 외부 데이터를 찾을 때는 해당 채널과 매니저의 소유인지 확인합니다.
  key 자체를 접근 권한으로 사용하지 않습니다.

매니저 스콥에서는 조회 전에 다음 조건을 검사해주세요.

```ts
if (ctx.caller?.type !== "manager" || !ctx.caller.id) {
  throw new Error("Manager context is required");
}
const managerId = ctx.caller.id;
```

표시 Function은 데이터를 조회하는 용도입니다. 호출 중 설정 저장이나 외부 데이터 변경은 하지 않습니다.

## 응답 규칙

`readOnly + transient`인 비민감 필드만 응답에 포함합니다.
일반 저장 필드, credential, password, `sensitive: true`, `resolvesTo`가 있는 필드는 허용하지 않습니다.

| 필드 타입            | 허용하는 값                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `text`, `textarea`   | 문자열                                                                                                           |
| `number`             | 유한한 숫자                                                                                                      |
| `switch`, `checkbox` | `true` 또는 `false`                                                                                              |
| `select`, `radio`    | 현재 선택지의 `value` 또는 빈 문자열                                                                             |
| `multiselect`        | 현재 선택지의 `value`로 구성한 배열                                                                              |
| `phone`              | 문자열 `countryCode`, `number`를 가진 객체                                                                       |
| `address`            | 문자열 `name`, `zipcode`, `address1`, `address2`와 `phone` 구조의 `cellphone`을 가진 객체                        |
| `image`              | `name`, `size`, `contentType`과 `dataUrl`·`url`·`previewUrl` 중 하나를 가진 객체. `multiple: true`이면 객체 배열 |

이미지의 `name`과 `contentType`, URL 값은 문자열이며, `size`는 0 이상의 유한한 숫자입니다.
위 필드들은 모두 `null`로 비울 수 있습니다. 그 외 필드 타입은 지원하지 않습니다.

| 응답                                                        | 화면 처리                                          |
| ----------------------------------------------------------- | -------------------------------------------------- |
| `{ "displayValues": {} }`                                   | 같은 대상에서 이전에 조회한 유효한 표시값 유지     |
| `{ "displayValues": { "storeName": null } }`                | 매장명 비우기. `defaultValue`를 다시 적용하지 않음 |
| `{ "displayValues": { "orderCount": 0, "active": false } }` | `0`과 `false`를 그대로 표시                        |
| `{ "displayValues": { "storeName": "" } }`                  | 빈 문자열 적용                                     |
| `{}` 또는 `{ "displayValues": null }`                       | 응답 형식 오류                                     |
| 미정의 key, 잘못된 타입, 저장 필드가 하나라도 포함된 응답   | 응답 전체 거부                                     |

누락한 key는 현재 필드 정의에 유효한 이전 표시값을 유지합니다.
`null`은 필드의 빈 상태로 바꿉니다. 스위치·체크박스는 `false`, 복수 선택은 `[]`가 됩니다.

동적 선택지는 `choicesSource.type: "function"`으로 기존 선택지 Function을 연결합니다.
설정 화면은 초기 선택지 조회를 마친 뒤 표시값을 검증합니다. 예를 들어 선택지에
`{ label: "기본 요금제", value: "basic" }`가 있으면 표시 Function은 `"basic"`을 반환합니다.
이전에 표시한 선택값이 새 선택지에 없으면 비웁니다.

## 재조회와 실패 처리

설정 화면 진입, 기존 설정 새로고침, 연동 완료 후 갱신, 표시값 조회 재시도 때 호출합니다.
사용자가 입력값을 편집할 때마다 호출하지는 않습니다.

- hook을 생략하면 표시 Function을 호출하지 않고 기존 Config 동작을 유지합니다.
- hook을 등록했지만 대상 Function이 없거나 호출이 실패하면 오류 배너와 재시도를 표시합니다.
- 같은 대상의 조회가 실패하면 마지막 성공값을 유지합니다.
- 표시값 재시도와 OAuth 연동 완료 후 갱신은 사용자가 편집 중인 일반 설정값을 유지합니다.
- 다른 설정으로 이동하거나 화면을 닫은 뒤 도착한 응답은 적용하지 않습니다.

표시값 조회 성공은 설정 검증이나 연동 완료를 의미하지 않습니다.
연동 상태는 기존 Config 검증과 OAuth 상태로 판단합니다.

### 요약 화면의 표시 범위

단일 설정의 저장된 연동 요약에는 필드의 `overviewSummary: true`로 표시값을 노출할 수 있습니다.
2026-09-15 기준 복수 설정은 상세 화면에서 표시값을 확인할 수 있지만, 목록 카드는 저장된 값만
사용하므로 이 hook의 표시값을 노출하지 않습니다. 목록 카드에 표시가 필요한 데이터는 이 기능만으로
구현할 수 없습니다.

## 동작 확인

앱을 등록한 뒤 표준 설정 화면에서 다음 항목을 확인해주세요.

1. 저장된 단일 설정 없이 화면을 열면 `{}`로 호출하고, 매장명·주문 수 `0`·스위치 `false`를 표시합니다.
2. 표시 필드를 편집할 수 없고, 표시값 조회만으로 저장 버튼이 활성화되지 않습니다.
3. 일반 저장 필드가 있는 앱은 저장 후 `ctx.config`에 표시값이 없는지 확인합니다.
4. 빈 `displayValues`는 이전 값을 유지하고, `null`은 해당 필드를 비웁니다.
5. 미정의 key나 잘못된 타입을 반환하면 값을 일부만 적용하지 않고 오류를 표시합니다.
6. 조회 실패 후 재시도해도 편집 중인 일반 설정값을 유지합니다.
7. 복수 설정은 저장 전 호출을 생략하고, 저장 후 선택한 key를 전달합니다.
8. 매니저 스콥은 인증된 매니저의 데이터만 조회하고, 매니저 context가 없는 요청을 거부합니다.
