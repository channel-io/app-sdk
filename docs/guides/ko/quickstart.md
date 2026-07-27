# 첫 Channel 앱 만들기

이 문서 하나로 개발용 private app 생성부터 `/tutorial` Command, React WAM, bot/manager 메시지
전송까지 실행할 수 있습니다. 서버 언어만 TypeScript 또는 Go 중 하나를 선택하세요. 두 경로 모두
공식 SDK와 공개 튜토리얼 저장소를 사용하며 token 발급, Extension 등록, signature 검증, WAM
bridge를 직접 구현하지 않습니다.

완료하면 다음을 확인할 수 있습니다.

- SDK가 `command` Extension과 Function schema를 자동 등록합니다.
- `/tutorial`을 실행하면 Channel 클라이언트 안에서 WAM이 열립니다.
- WAM에서 app bot 또는 현재 manager 권한으로 테스트 메시지를 보낼 수 있습니다.
- 잘못된 signature와 부족한 permission은 명시적으로 거절됩니다.

## 1. 준비 사항

공통으로 다음이 필요합니다.

- Channel 개발자 포털에 접근할 수 있는 계정
- 로컬 서버를 공개할 안정적인 HTTPS 주소 또는 tunnel
- Git

TypeScript 경로는 Node.js 20.11 이상과 Corepack이 필요합니다. Go 경로는 Go 1.25, WAM build용
Node.js와 Corepack이 필요합니다.

처음 앱을 만든다면 Channel 설정의 App Store에서 앱 생성 화면을 엽니다. 화면 배치는 바뀔 수
있지만 App Store, Create App, Auth and Access, Permissions, Server Settings라는 설정의 의미는
같습니다.

![Channel 설정에서 App Store 열기](../../assets/first-app/app-store-entry.png)

개발용 이름을 입력하고 약관에 동의해 private app을 만듭니다.

![개발용 앱 생성](../../assets/first-app/create-app.png)

## 2. Credential과 permission 설정

General settings에서 App ID를 확인합니다. App ID는 공개 식별자이지만 App Secret과 Signing Key는
서버 비밀입니다.

![App ID 확인](../../assets/first-app/app-id.png)

Auth and Access에서 App Secret을 발급합니다. Server Settings에서 Signing Key도 발급합니다. 두
값은 다시 표시되지 않을 수 있으므로 secret manager에 보관하고 Git, 문서, WAM, log에 넣지
마세요.

![App Secret 발급](../../assets/first-app/app-secret.png)

Authentication and permissions에서 튜토리얼에 필요한 최소 permission만 활성화합니다.

- Channel: `writeGroupMessage`
- Manager: `writeGroupMessageAsManager`

![튜토리얼 permission 설정](../../assets/first-app/permissions.png)

이 앱에서 사용하는 인증 경계는 네 가지입니다.

- 수신 Function: Signing Key로 `x-signature` 검증
- 서버의 AppStore 호출: SDK `TokenManager`가 app/channel token 관리
- WAM의 manager 동작: Channel host가 현재 manager를 승인
- 외부 provider: OAuth는 `ctx.authToken`, API key와 `client_credentials`는 Config credential 사용

자세한 차이는 [핵심 개념](concepts.md#인증과-token)을 참고하세요.

## 3. 서버 언어 선택하고 clone하기

둘 중 한 경로만 선택합니다.

### TypeScript

```bash
git clone https://github.com/channel-io/app-tutorial-ts.git
cd app-tutorial-ts
corepack enable
cp server/.env.example server/.env
```

`server/.env`에 다음 값을 입력합니다.

```dotenv
APP_ID=your-app-id
APP_SECRET=your-app-secret
SIGNING_KEY=your-hex-signing-key
```

### Go

```bash
git clone https://github.com/channel-io/app-tutorial.git
cd app-tutorial
corepack enable
cp .env.example .env
```

`.env`에 `APP_ID`, `APP_SECRET`, `SIGNING_KEY`를 입력한 뒤 현재 shell에 불러옵니다.

```bash
set -a
. ./.env
set +a
```

각 저장소의 lockfile과 Go module이 검증된 SDK 버전을 고정합니다. 처음 실행할 때 임의 버전으로
바꾸지 마세요.

## 4. HTTPS endpoint 준비하기

서버를 시작하기 전에 고정된 HTTPS tunnel을 준비합니다.

| 경로       | 로컬 port |
| ---------- | --------- |
| TypeScript | `3000`    |
| Go         | `3022`    |

[ngrok](https://ngrok.com/) 같은 HTTPS tunnel 도구를 자유롭게 선택할 수 있습니다. 예를 들어
ngrok을 설치하고 인증한 뒤 선택한 튜토리얼의 로컬 port를 공개합니다.

```bash
# TypeScript 튜토리얼
ngrok http 3000

# Go 튜토리얼
ngrok http 3022
```

ngrok이 표시한 `Forwarding` HTTPS origin을 `YOUR_HOST`로 사용합니다. Tunnel 주소가 바뀌면
개발자 포털의 endpoint를 갱신하고 서버를 재시작하세요.

공개 주소가 `https://YOUR_HOST`라면 개발자 포털 Server Settings에 다음 root를 저장합니다.

| 설정              | 값                               |
| ----------------- | -------------------------------- |
| Function Endpoint | `https://YOUR_HOST/functions`    |
| WAM Endpoint      | `https://YOUR_HOST/resource/wam` |

![Function과 WAM Endpoint 설정](../../assets/first-app/endpoints.png)

Function Endpoint에 `/v1`을, WAM Endpoint에 `/tutorial`을 덧붙이지 마세요. SDK와 AppStore가
system version과 WAM 이름을 추가합니다. Credential, permission, endpoint를 바꾼 뒤에는 startup
auto-registration이 다시 실행되도록 서버를 재시작합니다.

## 5. 설치·build·test하기

### TypeScript

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm test
corepack pnpm typecheck
```

### Go

```bash
make build
make test
```

모든 명령이 성공해야 합니다. 실패한 install을 무시하거나 signature 검증을 끈 상태로 다음 단계로
넘어가지 마세요.

## 6. 서버 실행하기

### TypeScript

```bash
corepack pnpm start
```

### Go

```bash
make run
```

서버 log에서 listener 시작과 Extension 등록 성공을 확인합니다. SDK는 app token을 cache하고
`registerExtension(appId, extensionName, systemVersion)`을 camelCase payload로 호출한 뒤
`extension.core.function.getFunctions` discovery에 응답합니다.

튜토리얼이 제공하는 주소는 다음과 같습니다.

| 경로              | TypeScript                                    | Go                                            |
| ----------------- | --------------------------------------------- | --------------------------------------------- |
| Function Endpoint | `https://YOUR_HOST/functions`                 | `https://YOUR_HOST/functions`                 |
| WAM Endpoint      | `https://YOUR_HOST/resource/wam`              | `https://YOUR_HOST/resource/wam`              |
| Local WAM         | `http://localhost:3000/resource/wam/tutorial` | `http://localhost:3022/resource/wam/tutorial` |
| Health check      | 서버 listener                                 | `http://localhost:3022/ping`                  |

## 7. 테스트 채널에서 실행하기

개발자 포털에서 private app을 테스트 채널에 설치하거나 기존 설치를 새로고침합니다. Channel의 그룹
대화에서 `/tutorial`을 실행하세요. Command가 보이지 않으면 server log의 Extension 등록과 Function
discovery부터 확인합니다.

WAM이 열리면 app bot과 manager 두 버튼을 각각 실행합니다.

![Channel 클라이언트에서 열린 tutorial WAM](../../assets/first-app/tutorial-wam.png)

두 메시지가 모두 도착해야 합니다.

![Bot과 manager가 보낸 테스트 메시지](../../assets/first-app/tutorial-result.png)

추가로 다음 실패도 확인합니다.

- group chat이 아닌 surface에서는 지원하지 않는다는 UI가 표시됩니다.
- Manager permission을 제거하면 manager 전송이 명시적으로 실패합니다.
- 잘못된 Signing Key나 누락된 `x-signature` 요청은 거절됩니다.
- 중복 클릭 중에는 추가 제출이 비활성화됩니다.

## 8. 방금 실행한 구조 이해하기

- **Extension**: `command:v1`이 `/tutorial` metadata를 공개합니다.
- **Function**: `tutorial.open`, `tutorial.sendAsBot`이 typed server operation으로 실행됩니다.
- **WAM**: React UI가 `/resource/wam/tutorial`에서 열립니다.
- **App Function call**: `useCallFunction`이 AppStore를 거쳐 app server를 호출합니다.
- **Native Function call**: `useNativeFunction`이 현재 manager 권한으로 Channel 동작을 호출합니다.
- **Token**: server-side `TokenManager`만 app/channel token을 관리합니다.

TypeScript와 Go 구현 파일의 위치는 각 튜토리얼 README의 project map을 참고하세요.

## 9. 문제 해결

| 증상                      | 확인할 것                                                                    |
| ------------------------- | ---------------------------------------------------------------------------- |
| Extension 등록 실패       | App ID/Secret, app token, public AppStore URL, 서버 재시작                   |
| `401` 또는 signature 오류 | hex Signing Key, raw body 보존, `x-signature` 검증                           |
| `/functions/v1`이 `404`   | 포털에는 `/functions` root를 입력했는지, 같은 SDK handler로 연결되는지       |
| WAM이 열리지 않음         | WAM Endpoint가 `/resource/wam` root인지, WAM build가 성공했는지              |
| Manager 전송 실패         | `writeGroupMessageAsManager`, group chat surface, 현재 manager authorization |
| Bot 전송 실패             | `writeGroupMessage`, 설치 channel, channel token cache                       |

`SKIP_SIGNATURE_VERIFICATION=true`는 격리된 local debugging 외에는 사용하지 마세요. App Secret,
Signing Key, access/refresh token, provider credential을 issue나 log에 붙이지 마세요.

## 다음 문서는 이 순서로 확인하세요

1. 현재 문서인 첫 앱 Quickstart를 완료합니다.
2. [핵심 개념](concepts.md)에서 Function, Extension, WAM, 인증, token의 경계를 이해합니다.
3. [Function 등록](functions.md)에서 wire contract와 standalone typed app Function을 확인합니다.
4. [Command 가이드](extensions/command.md)에서 metadata, action, autocomplete를 구현합니다.
5. [WAM 가이드](wam.md)에서 React UI, host authorization, Function 호출을 구현합니다.
6. [Extension 전체 가이드](extensions.md)에서 등록 흐름을 이해하고 필요한 기능과 상세 recipe를 선택합니다.
7. 출시 전 [프로덕션 준비 가이드](app-development.md)에서 보안, 신뢰성, 운영, 배포, rollback을 검증합니다.
8. 언어별 API는 [TypeScript 레퍼런스 맵](../../reference/typescript/README.md) 또는
   [Go 레퍼런스](../../reference/go/README.md)에서 확인합니다.
9. 구현 중에는 완성된 [TypeScript 튜토리얼](https://github.com/channel-io/app-tutorial-ts) 또는
   [Go 튜토리얼](https://github.com/channel-io/app-tutorial)을 함께 봅니다.
