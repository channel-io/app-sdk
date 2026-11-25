# 첫 Channel 앱 만들기

[Channel App SDK](https://github.com/channel-io/app-sdk)로 가상의 주문 관리 시스템을 만들고 채널톡과 연동해봅니다. 채널톡은 HTTP로 앱 서버를 호출하고, 앱 코드는 개발자가 띄운 서버에서 실행됩니다. 채널 설정의 **앱스토어**는 앱을 설치하는 화면입니다. 그 뒤에서 앱스토어 서버가 앱의 설치 상태와 Extension 등록을 관리하고 함수 요청을 중계합니다.

```text
채널톡 → 앱스토어 → 앱 서버        앱 함수 호출
앱 서버 → 앱스토어 → 채널톡        Native Function 호출
채널톡 클라이언트 → WAM Endpoint   웹 화면 로드
```

- **앱 함수**는 주문 조회처럼 앱 서버가 제공하는 기능입니다. **개발자 도구**에서 직접 호출해보고, 같은 함수를 Command, ALF, CoS에서도 쓸 수 있습니다.
- **Extension**은 Command처럼 채널톡에서 제공할 기능과 그 기능을 실행할 함수의 형식을 정하는 계약입니다.
- **WAM(Web App Module)**은 채널톡 안에 뜨는 앱의 웹 화면입니다. 채널톡 클라이언트가 앱의 WAM Endpoint에서 화면을 직접 불러옵니다.
- **Native Function**은 알림 전송처럼 채널톡이 제공하고 앱이 호출하는 기능입니다.

먼저 `ping`으로 앱 서버가 응답하는지 확인하고 주문 조회 함수를 추가해봅니다. 이어서 `/cancel-order`로 WAM을 열고 주문을 취소한 뒤, Native Function으로 매니저에게 알려봅니다. 마지막으로 조회 함수를 CoS와 ALF에서 사용해봅니다. [앱 핵심 개념](concepts.md)

## 사전 준비

- **Node.js 24 LTS** 최신 버전을 설치하세요. [Node.js 다운로드](https://nodejs.org/en/download)
- **pnpm 10.26 이상(10.x)**을 설치하세요. 서버와 WAM의 패키지를 관리하고 각 프로젝트를 빌드할 때 사용합니다. [pnpm 설치](https://pnpm.io/installation)
- **코드 편집기와 터미널**을 준비하세요. 터미널 하나에서 서버를 실행하고, 다른 터미널에서 실습 명령을 입력합니다.
- **ngrok CLI와 계정**을 준비하세요. 앱스토어가 로컬 서버에 요청을 보낼 수 있도록 HTTPS 주소를 만들 때 사용합니다. [ngrok 설치와 설정](https://ngrok.com/docs/start)
- 앱을 설치할 **테스트 채널**을 준비하고 [Channel Developer Portal](https://channel.works/-/developers/apps)에 로그인하세요.

HTTP 요청과 응답, TypeScript 모듈을 알면 코드를 따라가기 좋습니다. 이 실습에서는 [NestJS 데코레이터](https://docs.nestjs.com/providers)로 함수를 등록하고, `providers`에 등록한 서비스를 생성자에서 주입받습니다. [Zod](https://zod.dev/)로 함수의 입출력 형식을 정의하고, [React](https://react.dev/)로 만든 화면은 [Vite](https://vite.dev/)로 빌드합니다.

## 1. 첫 앱 만들기

개발자 포털에서 앱을 만들고 발급받은 키를 저장한 뒤, [Channel App SDK](https://github.com/channel-io/app-sdk)로 `ping` 함수를 구현해 [NestJS](https://nestjs.com/) 기반 서버를 띄워봅니다. 개발자 도구에서 이 함수를 호출해 연결을 확인해봅니다.

### Channel Developer Portal에서 앱 생성하기

[Channel Developer Portal](https://channel.works/-/developers/apps)의 **내 앱**에서 **앱 만들기**를 누르세요. 앱 이름에 **주문 관리 시스템**을 입력하세요. 약관에 동의한 뒤 **확인**을 누르세요.

![내 앱의 앱 만들기 버튼과 주문 관리 시스템 생성 화면](../../assets/app-tutorial/create-app.png)

### 앱 ID와 키 저장하기

앱을 만든 뒤 터미널에서 아래 명령을 실행해 실습 폴더와 `.env` 파일을 만드세요.

```sh
mkdir order-management
cd order-management
mkdir -p server/src
touch server/.env
```

이제 `server/.env`를 열고 아래 세 항목을 추가하세요. Git을 사용한다면 키를 넣기 전에 `.env`를 `.gitignore`에 추가하세요. Secret과 Signing Key는 발급 직후에 한 번만 볼 수 있습니다. 화면을 닫기 전에 각 값을 `server/.env`에 바로 저장하세요.

```dotenv
APP_ID=
APP_SECRET=
SIGNING_KEY=
```

![앱 이름 아래의 Application ID와 인증 및 권한 탭의 Secret 발급 버튼](../../assets/app-tutorial/app-secret.png)

앱 상세 화면에서 앱 이름 아래에 있는 **Application ID**를 `APP_ID`에 넣으세요. 이 값으로 앱스토어가 앱을 구분합니다.

**인증 및 권한**에서 **Secret**의 **발급하기**를 누르고 발급받은 값을 `APP_SECRET`에 넣으세요. SDK는 이 값으로 앱스토어에서 앱 토큰을 받습니다.

![서버 설정의 Signing Key 발급하기 버튼](../../assets/app-tutorial/endpoints.png)

**서버 설정**에서 **Signing Key**의 **발급하기**를 누르고 발급받은 값을 `SIGNING_KEY`에 넣으세요. 서버는 이 값으로 앱스토어가 보낸 요청의 서명을 검증합니다.

| 값          | 용도                                                            |
| ----------- | --------------------------------------------------------------- |
| App ID      | 앱을 구분하는 공개 식별자                                       |
| App Secret  | SDK가 앱 토큰과 채널 토큰을 발급받을 때 쓰는 비밀 값            |
| Signing Key | 앱스토어가 보낸 요청의 서명을 검증하는 키                       |
| 앱 토큰     | Extension 등록처럼 앱 단위 작업에 쓰는 토큰                     |
| 채널 토큰   | 앱을 설치한 특정 채널에서 Native Function을 호출할 때 쓰는 토큰 |

**Signing Key가 필요한 이유.** 서명을 검증하지 않으면 제3자가 앱스토어를 사칭해 앱 함수를 호출할 수 있습니다. 앱스토어는 Signing Key와 요청 본문으로 HMAC-SHA256 서명을 계산하고, Base64로 인코딩한 값을 `x-signature` 헤더에 담아 보냅니다. 앱 서버는 같은 키와 수신한 본문의 원본 바이트로 서명을 다시 계산합니다. **서명이 헤더 값과 일치하는 요청만 함수 처리 단계로 넘겨야 합니다.** Channel App SDK는 이 검증을 `SignatureGuard`로 제공합니다.

### 프로젝트 준비하기

프로젝트 루트에 `pnpm-workspace.yaml`을 만들고 아래와 같이 `server`를 등록하세요.

```yaml
packages:
  - server

allowBuilds:
  protobufjs: false
```

`allowBuilds`는 pnpm이 설치 중 실행할 의존성 스크립트를 정합니다. 서버 SDK가 사용하는 `protobufjs`에 `false`를 지정해 설치 스크립트를 건너뜁니다.

`server/package.json`을 만들고 아래와 같이 작성하세요. 서버가 사용할 빌드와 실행 명령을 정의합니다.

```json
{
  "name": "order-server",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node --env-file=.env dist/index.js"
  }
}
```

프로젝트 루트에서 아래 명령을 실행해 서버 패키지에 의존성을 설치하세요. `@channel.io/app-sdk-server`는 NestJS 기반 패키지입니다. 이 실습에서는 HTTP 어댑터로 `@nestjs/platform-express`를 사용합니다.

```sh
pnpm --dir server add @channel.io/app-sdk-server@0.46.0 @nestjs/common@11 @nestjs/core@11 @nestjs/platform-express@11 reflect-metadata zod@^4.6.7
pnpm --dir server add -D typescript@5 @types/node@24
```

`server/tsconfig.json`을 만들고 아래와 같이 작성하세요. 서버 코드는 `server/src`에 작성하세요. TypeScript는 컴파일한 JavaScript를 `server/dist`에 저장합니다.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

### `ping` 함수 만들기

`server/src/ping.function.ts`를 만들고 아래와 같이 작성하세요. `ping`은 입력값 없이 호출할 수 있고, `message`에 `pong`을 담아 반환합니다. `@Func`는 함수 이름을 선언하고, `@InputSchema`와 `@OutputSchema`는 입출력 형식을 정의합니다. `description`에는 함수가 언제 쓰이고 무엇을 반환하는지 적으세요. ALF와 CoS는 도구로 쓸 함수를 고를 때 이 설명을 참고하고, 입력 스키마를 보고 전달할 값을 정합니다.

```ts
import { Injectable } from "@nestjs/common";
import {
  type Context,
  Ctx,
  Func,
  Input,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";
import { z } from "zod";

const PingInputSchema = z.object({});
type PingInput = z.infer<typeof PingInputSchema>;
const PingOutputSchema = z.object({ message: z.literal("pong") });

@Injectable()
export class PingFunctions {
  @Func({ name: "ping", description: "Check that the app server responds." })
  @InputSchema(PingInputSchema)
  @OutputSchema(PingOutputSchema)
  ping(@Ctx() ctx: Context, @Input() input: PingInput) {
    console.log("ping function call", { ctx, input });
    return { message: "pong" };
  }
}
```

`server/src/index.ts`를 만들고 아래와 같이 작성하세요. 이 파일에서 SDK 모듈을 설정하고 `PingFunctions`를 `providers`에 등록합니다. Express 어댑터의 메서드를 사용할 수 있도록 앱 타입을 `NestExpressApplication`으로 지정합니다.

TypeScript의 `NodeNext` 설정에서는 실행할 때 쓰는 파일 이름으로 import합니다. 그래서 `ping.function.ts`를 컴파일해 얻는 `./ping.function.js`를 적습니다.

```ts
import "reflect-metadata";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import {
  CHANNEL_APP_OPTIONS,
  ChannelAppModule,
  SignatureGuard,
} from "@channel.io/app-sdk-server";
import { PingFunctions } from "./ping.function.js";

@Module({
  imports: [
    ChannelAppModule.forRoot({
      appId: process.env["APP_ID"] ?? "",
      appSecret: process.env["APP_SECRET"] ?? "",
      signingKey: process.env["SIGNING_KEY"] ?? "",
      autoRegister: true,
    }),
  ],
  providers: [PingFunctions],
})
class AppModule {}

const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  rawBody: true,
});
app.useGlobalGuards(new SignatureGuard(app.get(CHANNEL_APP_OPTIONS)));
await app.listen(3000);
```

앱스토어는 서버의 `PUT /functions/v1`으로 요청을 보냅니다. NestJS의 `rawBody: true`는 요청 본문의 원본을 보관합니다. SDK의 `SignatureGuard`는 그 원본과 Signing Key로 `x-signature` 헤더의 서명을 검증합니다.

버전을 지정해 `ping`을 호출하면 앱스토어는 `PUT /functions/v1`로 아래와 같은 요청을 보냅니다. 본문의 `systemVersion`은 선택 사항입니다.

```json
{
  "method": "ping",
  "params": {},
  "context": {
    "caller": { "type": "manager", "id": "example-manager-id" },
    "channel": { "id": "example-channel-id" }
  },
  "systemVersion": "v1"
}
```

SDK는 `method`로 `@Func`에 등록한 함수를 찾고, `params`를 `@Input()`에, `context`를 `@Ctx()`에 전달합니다. 이 요청의 응답은 `{"result":{"message":"pong"}}`입니다. 함수가 `FunctionCallError`를 던지면 응답 본문에 `error`를 담습니다.

### ngrok으로 서버 열기

앱스토어가 로컬 서버를 호출할 수 있도록 ngrok으로 HTTPS 주소를 만드세요. 인증 토큰을 아직 등록하지 않았다면 첫 번째 명령을 실행하세요. 다른 터미널에서 `ngrok http 3000`을 실행하고 켜 두세요.

```sh
ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN
ngrok http 3000
```

ngrok을 다시 시작해 HTTPS 주소가 바뀌면 개발자 포털의 Function Endpoint도 갱신하세요. 뒤에서 WAM Endpoint를 추가한 뒤에는 두 주소를 함께 갱신하세요.

### Function Endpoint 설정하기

`Forwarding`에 나온 HTTPS 주소 뒤에 `/functions`를 붙이세요. 예를 들어 `https://YOUR-NGROK-DOMAIN/functions`입니다. 개발자 포털의 **서버 설정**에서 이 주소를 **Function Endpoint**에 입력하고 **저장**을 누르세요. 앱스토어가 버전을 지정해 함수를 호출하면 `/v1`을 붙여 요청합니다.

![서버 설정의 Function Endpoint 입력란과 저장 버튼](../../assets/app-tutorial/function-endpoint.png)

### 앱 서버 등록하기

프로젝트 루트에서 아래 명령으로 서버를 빌드하고 실행하세요. `pnpm --dir server start`는 `server/.env`를 읽습니다. `autoRegister: true`로 설정했기 때문에 서버가 시작되면 아래 순서로 앱 함수를 등록합니다.

1. SDK가 App Secret으로 앱스토어에서 앱 토큰을 받습니다.
2. SDK가 앱 토큰으로 함수 목록을 공개하는 `core` Extension의 `v1` 계약을 등록합니다.
3. 앱스토어가 Function Endpoint에 서명된 `extension.core.function.getFunctions` 요청을 보내 함수 목록을 조회합니다.
4. SDK가 `@Func`로 선언한 함수 이름과 입출력 스키마를 반환합니다.

```sh
pnpm --dir server build
pnpm --dir server start
```

서버 로그에 `Successfully registered extension: core`가 표시되면 `core:v1` 등록에 성공한 거예요. 이제 개발자 도구에서 `@Func`로 선언한 `ping`을 호출해봅니다.

### 개발자 도구에서 실제 요청 확인하기

테스트 채널 왼쪽 아래의 설정 아이콘으로 채널 설정을 여세요. **앱스토어**에서 **주문 관리 시스템**을 검색하고 **설치**를 누르세요. 설치한 뒤 앱 상세에서 **개발자 도구**를 선택하세요.

![채널 설정에서 주문 관리 시스템을 설치하고 개발자 도구를 여는 위치](../../assets/app-tutorial/install.png)

**함수** 탭에서 `ping`을 선택한 뒤 **실행**을 누르세요. **실행 결과**에 `{"message":"pong"}`이 표시됩니다.

![개발자 도구에서 ping을 실행하고 pong을 받은 화면](../../assets/app-tutorial/ping-result.png)

함수를 호출한 뒤 서버 터미널에서 `ctx`가 어떤 형태로 들어오는지 확인해보세요. 다음은 호출자 정보인 `caller`와 채널 정보인 `channel`이 포함된 출력 예시입니다.

```text
ping function call {
  ctx: {
    caller: { type: 'manager', id: 'example-manager-id' },
    channel: { id: 'example-channel-id' }
  },
  input: {}
}
```

`ctx.caller.type`은 호출 주체를 나타냅니다. `manager`는 채널의 매니저, `user`는 고객, `system`은 자동화 등 시스템, `app`은 앱이 주체인 호출입니다. `ctx.channel.id`는 요청이 들어온 채널의 ID입니다.

## 2. 주문 조회 함수 추가하기

같은 앱에 샘플 주문을 저장하는 서비스와 주문 조회 함수를 추가해봅니다.

`server/src/orders.service.ts`를 만들고 아래 코드를 넣으세요. `OrderService`는 샘플 주문을 메모리에 채널별로 저장합니다. `order-1`은 이미 발송한 주문(`shipped`)입니다. `order-2`와 `order-3`은 나중에 취소해 볼 수 있도록 대기 상태(`pending`)로 둡니다. 서버를 다시 띄우면 주문 상태가 처음으로 돌아갑니다.

```ts
import { Injectable } from "@nestjs/common";

type OrderStatus = "pending" | "shipped" | "cancelled";

export class NotFoundError extends Error {}

@Injectable()
export class OrderService {
  private readonly ordersByChannel = new Map<string, Map<string, OrderStatus>>();

  getStatus(channelId: string, orderId: string) {
    const status = this.ordersFor(channelId).get(orderId);
    if (!status) {
      throw new NotFoundError("Order not found");
    }
    return { orderId, status };
  }

  private ordersFor(channelId: string) {
    let orders = this.ordersByChannel.get(channelId);
    if (!orders) {
      orders = new Map<string, OrderStatus>([
        ["order-1", "shipped"],
        ["order-2", "pending"],
        ["order-3", "pending"],
      ]);
      this.ordersByChannel.set(channelId, orders);
    }
    return orders;
  }
}
```

**채널 단위 인가**

앱은 여러 채널에 설치할 수 있습니다. 이 예제에서는 요청 컨텍스트의 `ctx.channel.id`로 채널별 주문을 구분합니다. 실제 주문을 조회하거나 취소할 때는 호출자가 해당 채널에서 그 작업을 할 권한이 있는지도 확인하세요.

`server/src/orders.function.ts`를 만들고 아래와 같이 작성하세요. `OrderFunctions`는 요청에 담긴 채널 ID로 `OrderService`에서 주문을 조회합니다. 주문을 찾지 못하면 `OrderService`가 `NotFoundError`를 던지고, `OrderFunctions`가 이 오류를 SDK의 `FunctionCallError`로 바꿉니다.

```ts
import { Injectable } from "@nestjs/common";
import {
  type Context,
  Ctx,
  Func,
  FunctionCallError,
  FunctionCallErrorCode,
  Input,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";
import { z } from "zod";
import { NotFoundError, OrderService } from "./orders.service.js";

const GetStatusInputSchema = z.object({ orderId: z.string() });
type GetStatusInput = z.infer<typeof GetStatusInputSchema>;
const GetStatusOutputSchema = z.object({ orderId: z.string(), status: z.string() });

@Injectable()
export class OrderFunctions {
  constructor(private readonly orderService: OrderService) {}

  @Func({
    name: "orders.getStatus",
    description: "Look up the shipping status of an order by its ID.",
  })
  @InputSchema(GetStatusInputSchema)
  @OutputSchema(GetStatusOutputSchema)
  getStatus(@Ctx() ctx: Context, @Input() input: GetStatusInput) {
    console.log("orders.getStatus function call", { ctx, input });
    try {
      return this.orderService.getStatus(ctx.channel.id, input.orderId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new FunctionCallError(error.message, FunctionCallErrorCode.NotFound);
      }
      throw error;
    }
  }
}
```

`server/src/index.ts`에 아래 import를 추가하고, `@Module`의 `providers`에 `OrderService`와 `OrderFunctions`를 추가하세요.

```ts
// server/src/index.ts (add imports)
import { OrderFunctions } from "./orders.function.js";
import { OrderService } from "./orders.service.js";
```

```ts
// server/src/index.ts (AppModule providers)
providers: [PingFunctions, OrderService, OrderFunctions],
```

서버를 `Ctrl+C`로 종료하고 아래 명령으로 다시 빌드해 띄우세요.

```sh
pnpm --dir server build
pnpm --dir server start
```

앱스토어가 함수 목록을 다시 읽으면 개발자 도구의 **함수** 탭에서 `getStatus`를 선택하세요. 함수 상세에 전체 이름인 `orders.getStatus`가 표시됩니다. `orderId`에 `order-1`을 입력하고 **실행**을 누르세요. 응답의 `status`가 `shipped`인지, 서버 터미널에 아래처럼 찍히는지 확인하세요.

![개발자 도구에서 order-1의 배송 상태를 조회한 화면](../../assets/app-tutorial/order-result.png)

```text
orders.getStatus function call {
  ctx: {
    caller: { type: 'manager', id: 'example-manager-id' },
    channel: { id: 'example-channel-id' }
  },
  input: { orderId: 'order-1' }
}
```

함수가 목록에 없다면 서버를 켠 상태에서 `core:v1` 등록 결과와 Function Endpoint를 확인하세요. **실행** 버튼이 비활성화돼 있다면 현재 채널에 앱을 설치했는지, 함수의 필수 입력값을 채웠는지 확인하세요.

## 3. Command Extension을 등록하고 WAM 열기

![팀챗 메시지 입력창에 슬래시를 입력해 /cancel-order 커맨드를 찾은 화면](../../assets/app-tutorial/command-menu.png)

커맨드는 채팅 중에 앱 기능을 실행하는 명령어입니다. 위 화면처럼 팀챗의 메시지 입력창에 `/`를 입력하면 커맨드 목록이 열립니다.

Command Extension에 커맨드 이름과 실행할 앱 함수를 지정하면 앱에 커맨드를 추가할 수 있습니다. 이번에는 `command:v1`을 등록해 `/cancel-order`로 주문 취소 화면을 열어봅니다.

1. 앱스토어는 `extension.command.metadata.getCommands`를 호출해 `/cancel-order`의 설정을 읽습니다.
2. 팀챗에서 커맨드를 실행하면 앱스토어가 `actionFunctionName`에 지정한 `commands.orders.cancel`을 호출합니다. `systemVersion: "v1"`이므로 요청은 `PUT /functions/v1`로 들어옵니다.
3. 액션 함수는 `type: "wam"`과 WAM을 식별하는 `name`, 화면에 전달할 `wamArgs`를 반환합니다.
4. 채널톡 클라이언트는 등록된 WAM Endpoint 뒤에 `name`을 붙인 주소에서 화면을 불러옵니다.

### 앱 서버에 Command 추가하기

`server/src/command.extension.ts`를 만들고 아래와 같이 작성하세요. `CommandExtension`은 명령을 정의하고, `CommandActions`의 `commands.orders.cancel`은 WAM을 엽니다.

```ts
import { Injectable } from "@nestjs/common";
import {
  type Context,
  CommandResultSchema,
  Ctx,
  Extension,
  Func,
  type GetCommandsInput,
  GetCommandsOutputSchema,
  Input,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";
import { z } from "zod";

@Extension({ name: "command", systemVersion: "v1" })
export class CommandExtension {
  @Func("metadata.getCommands")
  @OutputSchema(GetCommandsOutputSchema)
  getCommands(@Ctx() ctx: Context, @Input() input: GetCommandsInput) {
    console.log("extension.command.metadata.getCommands function call", { ctx, input });
    return {
      commands: [
        {
          name: "cancel-order",
          scope: "desk",
          description: "Open order cancellation",
          actionFunctionName: "commands.orders.cancel",
          systemVersion: "v1",
          alfMode: "disable",
          enabledByDefault: true,
          paramDefinitions: [{ name: "orderId", type: "string", required: true }],
        },
      ],
    };
  }
}

const ExecuteCancelOrderInputSchema = z.object({
  input: z.object({ orderId: z.string() }),
});
type ExecuteCancelOrderInput = z.infer<typeof ExecuteCancelOrderInputSchema>;

@Injectable()
export class CommandActions {
  @Func("commands.orders.cancel")
  @InputSchema(ExecuteCancelOrderInputSchema)
  @OutputSchema(CommandResultSchema)
  executeCancelOrder(@Ctx() ctx: Context, @Input() input: ExecuteCancelOrderInput) {
    console.log("commands.orders.cancel function call", { ctx, input });
    const { orderId } = input.input;
    return {
      type: "wam",
      attributes: {
        appId: process.env["APP_ID"] ?? "",
        name: "order-cancel",
        wamArgs: { orderId },
      },
    };
  }
}
```

SDK는 `@Extension` 안의 함수 이름에 `extension.<이름>.`을 붙입니다. 그래서 `metadata.getCommands`는 `extension.command.metadata.getCommands`로 등록됩니다. `CommandActions`처럼 Extension 밖에 선언한 함수는 `@Func`에 적은 이름을 그대로 씁니다. 개발자 도구에서는 `orders.getStatus`를 `orders` 그룹의 `getStatus`로 찾을 수 있습니다.

| 설정                     | 이 실습에서 하는 일                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `scope: "desk"`          | 운영자가 쓰는 데스크에 커맨드를 표시합니다. `front`는 고객이 쓰는 메신저용입니다.         |
| `alfMode: "disable"`     | ALF의 커맨드 추천을 끕니다. 5단계에서는 별도의 앱 함수인 `orders.getStatus`를 사용합니다. |
| `enabledByDefault: true` | 앱 설치 시 커맨드를 기본으로 활성화합니다.                                                |
| `paramDefinitions`       | 입력창에 표시할 항목과 타입을 정의합니다. 여기서는 주문번호가 필수입니다.                 |
| `systemVersion: "v1"`    | 액션 요청을 Function Endpoint의 `/v1` 경로로 보냅니다.                                    |

커맨드 실행 요청에는 주문번호 외에도 `chat`, `language` 같은 정보가 함께 올 수 있습니다. 앱스토어는 입력창에서 받은 값만 `input`에 담으므로, 액션 함수는 `input.input.orderId`로 주문번호를 읽습니다. [Command Extension 가이드](extensions/command.md)

위 예제에서 `commands.orders.cancel`이 반환한 `name`은 WAM Endpoint 뒤에 붙는 경로입니다. 뒤에서 WAM을 React로 구현할 때는 `useWamData("orderId")`로 `wamArgs`에 담긴 주문번호를 읽어 화면에 표시해봅니다.

나중에 다른 WAM을 구현할 때는 액션의 `name`에 새 WAM 이름을 넣으세요. WAM마다 `wam/<name>`에 소스를 두고, 빌드한 정적 파일을 `/wam/<name>/`에서 제공하면 됩니다.

`server/src/index.ts`에 아래 import를 추가하고, `@Module`의 `providers`에 `CommandExtension`과 `CommandActions`를 추가하세요.

```ts
// server/src/index.ts (add imports)
import { CommandExtension, CommandActions } from "./command.extension.js";
```

```ts
// server/src/index.ts (AppModule providers)
providers: [
  PingFunctions,
  OrderService,
  OrderFunctions,
  CommandExtension,
  CommandActions,
],
```

### WAM을 빌드하고 서버에서 제공하기

프로젝트 루트의 `pnpm-workspace.yaml` 내용을 아래와 같이 교체하세요. `wam/*`을 추가하면 `wam/` 아래의 각 화면을 별도 패키지로 관리할 수 있습니다.

```yaml
packages:
  - server
  - "wam/*"

allowBuilds:
  esbuild: true
  protobufjs: false
```

`esbuild: true`는 Vite가 사용하는 `esbuild`의 설치 스크립트를 허용합니다.

프로젝트 루트에서 아래 명령을 실행해 `wam/order-cancel`에 Vite의 React와 TypeScript 기본 템플릿을 만들고 WAM SDK를 설치하세요. 템플릿이 만든 `package.json`, TypeScript, ESLint 설정을 그대로 사용합니다.

```sh
pnpm create vite@7 wam/order-cancel --template react-ts --no-interactive
pnpm --dir wam/order-cancel add @channel.io/app-sdk-wam
```

`wam/order-cancel/vite.config.ts`를 아래와 같이 수정하세요. `base: "./"`를 설정하면 빌드한 HTML이 `/wam/order-cancel/` 아래에서 JavaScript 같은 정적 파일을 상대 경로로 불러옵니다.

```ts
// wam/order-cancel/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "../../server/dist/static/order-cancel",
    emptyOutDir: true,
  },
});
```

`wam/order-cancel/src/main.tsx`와 `wam/order-cancel/src/App.tsx`의 내용을 각각 아래 코드로 교체하세요.

```tsx
// wam/order-cancel/src/main.tsx
import { createRoot } from "react-dom/client";
import { WamProvider } from "@channel.io/app-sdk-wam";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <WamProvider>
    <App />
  </WamProvider>,
);
```

```tsx
// wam/order-cancel/src/App.tsx
import { useEffect } from "react";
import { useWamData, useWamSize } from "@channel.io/app-sdk-wam";

export default function App() {
  const orderId = useWamData("orderId");
  const { setSize } = useWamSize();
  useEffect(() => setSize({ width: 400, height: 200 }), [setSize]);

  return <h1>{typeof orderId === "string" ? `Order ${orderId}` : "Order cancellation"}</h1>;
}
```

`server/src/index.ts` 상단에 아래 import를 추가하세요.

```ts
// server/src/index.ts (add import)
import { resolve } from "node:path";
```

같은 파일에서 `await app.listen(3000)` 바로 앞에 아래 코드를 추가하세요. 서버는 빌드된 `index.js`와 같은 위치의 `static/` 디렉터리를 `/wam` 경로로 제공합니다.

```ts
// server/src/index.ts (before app.listen(...))
app.useStaticAssets(resolve(import.meta.dirname, "static"), {
  prefix: "/wam",
});
```

ngrok의 `Forwarding`에 나온 HTTPS 주소 뒤에 `/wam`을 붙이세요. 개발자 포털에서 **주문 관리 시스템**의 **서버 설정**을 열고, **WAM Endpoint**에 이 주소를 입력한 뒤 **저장**을 누르세요. 예를 들어 `https://YOUR-NGROK-DOMAIN/wam`입니다.

![서버 설정의 WAM Endpoint 입력란과 저장 버튼](../../assets/app-tutorial/wam-endpoint.png)

앱스토어는 이 주소에 `name` 값인 `order-cancel`을 붙여 앱 서버에 `GET /wam/order-cancel/` 요청을 보냅니다.

서버를 종료하고, 프로젝트 루트에서 서버와 WAM을 각각 빌드한 뒤 서버를 다시 실행하세요.

```sh
pnpm --dir server build
pnpm --dir wam/order-cancel build
pnpm --dir server start
```

WAM 빌드 결과물은 `server/dist/static/order-cancel/`에 저장됩니다.

서버 로그에서 `command` 등록 성공을 확인하세요. 채널 설정의 **앱스토어**에서 **주문 관리 시스템**을 열고 **커맨드** 탭을 선택하세요. **데스크 커맨드**에 `/cancel-order`가 표시되면 스위치를 확인하고, 꺼져 있으면 켜세요.

![앱스토어의 커맨드 탭에서 /cancel-order 활성화 스위치를 확인하는 화면](../../assets/app-tutorial/command-activation.png)

테스트 채널의 팀챗 입력창에서 `/`를 입력하고 `/cancel-order`를 선택하세요. 주문번호에 `order-2`를 입력해 실행한 뒤 WAM에 **Order order-2**가 표시되는지 확인하세요.

![팀챗에서 /cancel-order를 실행해 Order order-2가 표시된 WAM](../../assets/app-tutorial/wam-order-result.png)

명령이 보이지 않으면 서버의 `command` 등록 로그와 채널의 앱 설치 상태를 확인하세요. 명령은 보이는데 화면이 열리지 않으면 WAM Endpoint와 `http://127.0.0.1:3000/wam/order-cancel/`에서 페이지가 열리는지 확인하세요.

## 4. 주문을 취소하고 매니저에게 알리기

이제 주문 상태를 바꾸는 `orders.cancel`을 추가해봅니다. 개발자 도구에서 이 함수를 직접 실행하거나 `/cancel-order`로 연 WAM에서 실행할 수 있습니다. 매니저가 주문을 처음 취소할 때 요청의 `ctx`에서 매니저 ID를 읽고 Native Function으로 알려봅시다.

### 취소할 수 있는 주문 정하기

`server/src/orders.service.ts`를 아래 코드로 교체하세요. `pending` 상태의 주문만 취소할 수 있습니다. 이미 취소한 주문에는 `false`를 반환합니다.

```ts
// server/src/orders.service.ts (replace the file)
import { Injectable } from "@nestjs/common";

type OrderStatus = "pending" | "shipped" | "cancelled";

export class NotFoundError extends Error {}

export class OrderNotCancellableError extends Error {}

@Injectable()
export class OrderService {
  private readonly ordersByChannel = new Map<string, Map<string, OrderStatus>>();

  getStatus(channelId: string, orderId: string) {
    const status = this.ordersFor(channelId).get(orderId);
    if (!status) {
      throw new NotFoundError("Order not found");
    }
    return { orderId, status };
  }

  cancel(channelId: string, orderId: string) {
    const { status } = this.getStatus(channelId, orderId);
    if (status === "cancelled") return false;
    if (status !== "pending") {
      throw new OrderNotCancellableError("Only pending orders can be cancelled");
    }

    this.ordersFor(channelId).set(orderId, "cancelled");
    return true;
  }

  private ordersFor(channelId: string) {
    let orders = this.ordersByChannel.get(channelId);
    if (!orders) {
      orders = new Map<string, OrderStatus>([
        ["order-1", "shipped"],
        ["order-2", "pending"],
        ["order-3", "pending"],
      ]);
      this.ordersByChannel.set(channelId, orders);
    }
    return orders;
  }
}
```

### 취소 함수에서 알림 보내기

앞에서 채널톡이 앱스토어를 거쳐 앱 함수를 호출했습니다. 알림을 보낼 때는 앱 서버가 앱스토어를 거쳐 채널톡의 Native Function `announce`를 호출합니다. 이 호출에는 알림을 보낼 채널의 토큰을 사용합니다.

개발자 포털의 **인증 및 권한**에서 **Channel** 역할의 `announce`를 체크하고 **저장**을 누르세요.

![인증 및 권한 화면의 announce 체크박스와 저장 버튼](../../assets/app-tutorial/announce-permission.png)

`server/src/alert.service.ts`를 만들고 아래와 같이 작성하세요. `AlertService`는 `ChannelAppModule`이 제공하는 `TokenManager`로 채널 토큰을 받아 `announce`를 호출합니다. 지정한 매니저의 **나와의 대화방**에 알림을 보냅니다.

```ts
import { Injectable } from "@nestjs/common";
import { NativeFunctionClient, TokenManager } from "@channel.io/app-sdk-server";

@Injectable()
export class AlertService {
  constructor(
    private readonly tokenManager: TokenManager,
    private readonly nativeFunctionClient: NativeFunctionClient,
  ) {}

  async send(input: {
    channelId: string;
    managerId: string;
    message: string;
    writer: string;
  }) {
    const { channelId, managerId, message, writer } = input;
    const { accessToken } = await this.tokenManager.getChannelToken({ channelId });
    const params = {
      channelId,
      managerIds: [managerId],
      message: { plainText: message },
      botName: writer,
    };
    const { sent } = await this.nativeFunctionClient.callNativeFunctionWithToken<
      typeof params,
      { sent?: number }
    >("announce", params, accessToken);
    return (sent ?? 0) > 0;
  }
}
```

SDK의 `getChannelToken()`은 기본적으로 채널별 토큰을 메모리에 캐싱합니다. 같은 채널의 토큰을 재사용하고, 만료가 가까우면 호출 시 갱신합니다.

`server/src/orders.function.ts`를 아래 코드로 교체하세요. 조회 함수에 이어 `orders.cancel`을 추가하고, 생성자에서 `AlertService`를 주입받습니다. 취소는 `ctx.channel.id`로 구분한 채널의 주문에 적용합니다. 주문을 처음 취소하고 호출 주체가 매니저이면 해당 매니저에게 알립니다.

```ts
// server/src/orders.function.ts (replace the file)
import { Injectable } from "@nestjs/common";
import {
  type Context,
  Ctx,
  Func,
  FunctionCallError,
  FunctionCallErrorCode,
  Input,
  InputSchema,
  OutputSchema,
} from "@channel.io/app-sdk-server";
import { z } from "zod";
import { AlertService } from "./alert.service.js";
import { NotFoundError, OrderNotCancellableError, OrderService } from "./orders.service.js";

const GetStatusInputSchema = z.object({ orderId: z.string() });
type GetStatusInput = z.infer<typeof GetStatusInputSchema>;
const GetStatusOutputSchema = z.object({ orderId: z.string(), status: z.string() });

const CancelOrderInputSchema = z.object({ orderId: z.string() });
type CancelOrderInput = z.infer<typeof CancelOrderInputSchema>;
const CancelOrderOutputSchema = z.object({
  orderId: z.string(),
  status: z.literal("cancelled"),
  notification: z.enum(["sent", "failed", "skipped"]),
});

@Injectable()
export class OrderFunctions {
  constructor(
    private readonly orderService: OrderService,
    private readonly alertService: AlertService,
  ) {}

  @Func({
    name: "orders.getStatus",
    description: "Look up the shipping status of an order by its ID.",
  })
  @InputSchema(GetStatusInputSchema)
  @OutputSchema(GetStatusOutputSchema)
  getStatus(@Ctx() ctx: Context, @Input() input: GetStatusInput) {
    console.log("orders.getStatus function call", { ctx, input });
    try {
      return this.orderService.getStatus(ctx.channel.id, input.orderId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new FunctionCallError(error.message, FunctionCallErrorCode.NotFound);
      }
      throw error;
    }
  }

  @Func({
    name: "orders.cancel",
    description: "Cancel a pending sample order and notify the calling manager.",
  })
  @InputSchema(CancelOrderInputSchema)
  @OutputSchema(CancelOrderOutputSchema)
  async cancel(@Ctx() ctx: Context, @Input() input: CancelOrderInput) {
    console.log("orders.cancel function call", { ctx, input });
    const { orderId } = input;
    const channelId = ctx.channel.id;

    let changed: boolean;
    try {
      changed = this.orderService.cancel(channelId, orderId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new FunctionCallError(error.message, FunctionCallErrorCode.NotFound);
      }
      if (error instanceof OrderNotCancellableError) {
        throw new FunctionCallError(error.message, FunctionCallErrorCode.Conflict);
      }
      throw error;
    }

    const result = { orderId, status: "cancelled" } as const;
    const managerId = ctx.caller?.type === "manager" ? ctx.caller.id : undefined;
    if (!changed || !managerId) {
      return { ...result, notification: "skipped" };
    }

    try {
      const sent = await this.alertService.send({
        channelId,
        managerId,
        message: `Order ${orderId} was cancelled.`,
        writer: "Order Management",
      });
      return { ...result, notification: sent ? "sent" : "failed" };
    } catch {
      console.error("Could not send order cancellation notification", { orderId });
      return { ...result, notification: "failed" };
    }
  }
}
```

알림을 보내면 `notification`에 `sent`를 반환합니다. 전송에 실패하면 `failed`, 호출자가 매니저가 아니거나 매니저 ID가 없거나 이미 취소한 주문이면 `skipped`를 반환합니다. 알림에 실패해도 주문은 취소 상태로 유지됩니다.

### WAM에서 취소 확인하기

`wam/order-cancel/src/App.tsx`를 다음 코드로 교체하세요. WAM은 Command가 전달한 주문번호를 표시하고, **Confirm cancellation**을 누르면 `useCallFunction`으로 `orders.cancel`을 실행합니다.

```tsx
// wam/order-cancel/src/App.tsx (replace the file)
import { useEffect, useState } from "react";
import { useCallFunction, useWamData, useWamSize } from "@channel.io/app-sdk-wam";

type CancelResult = {
  orderId: string;
  status: "cancelled";
  notification: "sent" | "failed" | "skipped";
};
type CancelResponse = { result?: CancelResult; error?: { message: string } };

const messages = {
  sent: "Order cancelled. Check My Chatroom for the notification.",
  failed: "Order cancelled. Could not confirm the notification.",
  skipped: "Order cancelled.",
};

export default function App() {
  const appId = useWamData("appId");
  const orderId = useWamData("orderId");
  const { call: cancelOrder, loading } = useCallFunction<CancelResponse>({
    appId: typeof appId === "string" ? appId : "",
    name: "orders.cancel",
  });
  const [result, setResult] = useState<CancelResult>();
  const [error, setError] = useState("");
  const { setSize } = useWamSize();
  useEffect(() => setSize({ width: 400, height: 200 }), [setSize]);

  if (typeof appId !== "string" || !appId || typeof orderId !== "string" || !orderId) {
    return <p>Open this WAM with /cancel-order.</p>;
  }

  async function handleCancelOrder() {
    setError("");
    try {
      const response = await cancelOrder({ orderId });
      if (!response.result) {
        setError(response.error?.message ?? "Could not cancel the order.");
        return;
      }
      setResult(response.result);
    } catch {
      setError("Could not confirm the result. Check the order status.");
    }
  }

  return (
    <main>
      <h1>Cancel order {orderId}</h1>
      <button type="button" onClick={handleCancelOrder} disabled={loading || !!result}>
        Confirm cancellation
      </button>
      {result && <p role="status">{messages[result.notification]}</p>}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
```

마지막으로 `server/src/index.ts`를 아래 코드로 교체하세요. `providers`에 `AlertService`를 등록하고 앞에서 설정한 서명 검증과 WAM 정적 파일 경로도 유지합니다.

WAM의 `useCallFunction`은 함수 버전을 받는 옵션이 없습니다. 앱스토어는 이 호출을 `PUT /functions`로 전달할 수 있고, SDK 컨트롤러는 `PUT /functions/:version`을 받습니다. 아래 미들웨어가 NestJS 라우팅과 가드보다 먼저 실행돼 버전 없는 요청의 경로만 `/functions/v1`로 바꿉니다. 두 경로 모두 SDK의 `SignatureGuard`가 원본 요청 본문으로 서명을 검증합니다.

```ts
// server/src/index.ts (replace the file)
import { resolve } from "node:path";
import "reflect-metadata";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import {
  CHANNEL_APP_OPTIONS,
  ChannelAppModule,
  SignatureGuard,
} from "@channel.io/app-sdk-server";
import { AlertService } from "./alert.service.js";
import { CommandActions, CommandExtension } from "./command.extension.js";
import { OrderFunctions } from "./orders.function.js";
import { OrderService } from "./orders.service.js";
import { PingFunctions } from "./ping.function.js";

@Module({
  imports: [
    ChannelAppModule.forRoot({
      appId: process.env["APP_ID"] ?? "",
      appSecret: process.env["APP_SECRET"] ?? "",
      signingKey: process.env["SIGNING_KEY"] ?? "",
      autoRegister: true,
    }),
  ],
  providers: [
    PingFunctions,
    OrderService,
    OrderFunctions,
    CommandExtension,
    CommandActions,
    AlertService,
  ],
})
class AppModule {}

const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  rawBody: true,
});
app.useGlobalGuards(new SignatureGuard(app.get(CHANNEL_APP_OPTIONS)));
app.use((request: { method: string; url: string }, _response: unknown, next: () => void) => {
  if (request.method === "PUT" && request.url === "/functions") {
    request.url = "/functions/v1";
  }
  next();
});
app.useStaticAssets(resolve(import.meta.dirname, "static"), {
  prefix: "/wam",
});
await app.listen(3000);
```

### 개발자 도구와 Command에서 확인하기

서버를 종료하고, 프로젝트 루트에서 서버와 WAM을 각각 다시 빌드한 뒤 서버를 실행하세요.

```sh
pnpm --dir server build
pnpm --dir wam/order-cancel build
pnpm --dir server start
```

1. 앱의 **개발자 도구**에서 `orders.cancel`을 선택하고 `order-2`를 입력해 실행하세요. `status: "cancelled"`, `notification: "sent"`가 반환되는지 확인하세요. 팀챗에서 내 이름을 눌러 **나와의 대화방**을 열면 `Order order-2 was cancelled.` 메시지를 확인할 수 있습니다.
2. 같은 테스트 채널의 팀챗에서 `/cancel-order`를 선택하고 주문번호 `order-3`을 입력하세요. WAM에 표시된 주문번호를 확인한 뒤 **Confirm cancellation**을 누르세요. **나와의 대화방**에 `Order order-3 was cancelled.` 메시지가 도착하는지 확인하세요.
3. 개발자 도구에서 `orders.getStatus`로 `order-3`을 조회하세요. `cancelled`가 표시됩니다. 같은 주문을 다시 취소하면 `notification: "skipped"`가 반환됩니다.

![WAM의 주문 취소 완료 문구와 나와의 대화방에 도착한 Order Management 봇 알림](../../assets/app-tutorial/order-cancel-result.png)

## 5. CoS와 ALF에서 주문 조회하기

서버와 ngrok을 켜 두세요. 같은 테스트 채널에서 `orders.getStatus`를 CoS와 ALF에서도 사용해봅니다.

- **CoS로 호출하기.** 테스트 채널에 설치한 앱이 CoS에 함수를 공개하면 **AI CoS**에서 사용할 수 있습니다. 왼쪽 메뉴의 **AI CoS**를 열고 “주문 관리 시스템 앱으로 order-1의 배송 상태를 확인해 줘”라고 요청하세요. [CoS 알아보기](https://docs.channel.io/help/ko/articles/CoS-a8e86305)
- **ALF 태스크에서 사용하기.** **고객 → 서포트 → 설정 → 태스크**에서 테스트 태스크를 여세요. **AI 에이전트** 단계의 지시문에 `@`를 입력해 주문 관리 시스템의 `orders.getStatus`를 추가하세요. `orderId`에 `order-1`을 넣고 반환된 `status`를 안내하도록 지시한 뒤 **미리보기**에서 확인하세요. [ALF 태스크 가이드](https://docs.channel.io/alfv2/ko/articles/%ED%83%9C%EC%8A%A4%ED%81%AC--8cb5b41a), [태스크에 앱 함수 넣기](https://docs.channel.io/help/ko/articles/%ED%83%9C%EC%8A%A4%ED%81%AC-ALF-v2-2a16be8b)
- **ALF 프로시저에서 사용하기.** 프로시저를 사용할 수 있는 테스트 채널에서 **고객 → 서포트 → ALF → 설정 → 프로시저**로 이동해 편집 화면을 여세요. 지시문의 **앱** 도구로 `orders.getStatus`를 추가하고, 주문번호를 확인하면 함수를 호출해 반환된 상태를 안내하도록 지시하세요. 오른쪽 **미리보기**에서 `order-1`을 조회하세요. [ALF 프로시저 가이드](https://docs.channel.io/help/ko/articles/%ED%94%84%EB%A1%9C%EC%8B%9C%EC%A0%80Beta-6d520d9d)

세 경우 모두 `order-1`의 상태가 `shipped`로 반환되는지 서버 로그의 `orders.getStatus function call`과 함께 확인하세요. 일반적인 CoS 앱 호출에서는 팀 멤버 정보가 있으면 `manager`가 들어옵니다. ALF 태스크는 매니저가 실행하는 미리보기에서는 `manager`, 고객 정보가 있는 상담에서는 `user`, 두 정보가 없는 실행에서는 `system`이 들어올 수 있습니다. 실행 방식에 따라 달라지므로 실제 `ctx.caller.type`을 확인하세요.

## 다음 단계

앱 함수를 등록하고, Command로 WAM을 열어 주문을 취소했습니다. Native Function은 취소 알림을 보냈고, 같은 주문 조회 함수는 CoS와 ALF에서 다시 사용했습니다. 실습을 마치면 서버와 ngrok을 종료하세요.

- [앱 핵심 개념](concepts.md)에서 요청 방향과 인증을 다시 살펴보세요.
- [함수 가이드](functions.md)에서 앱 함수의 이름, 스키마, 요청과 응답을 확인하세요.
- [WAM 가이드](wam.md)와 [Extension 가이드](extensions.md)에서 앱에 추가할 화면과 기능을 찾아보세요.
- [앱 개발과 운영](app-development.md)에서 운영 환경에 맞게 준비할 항목을 확인하세요.
- 기존 TypeScript와 Go 예제 프로젝트를 실행하려면 [이전 Quickstart](quickstart-legacy.md)를 확인하세요.
