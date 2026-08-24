# 첫 Channel 앱 만들기

이 튜토리얼에서는 Channel 대화창에서 `/tutorial`을 입력하면 작은 앱 화면이 열리고, 버튼을 눌러 테스트 메시지를 보내는 앱을 만듭니다. 처음에는 TypeScript 경로를 권장합니다. Go를 사용한다면 [Go로 진행하기](#6-go로-진행하기)로 이동하세요.

완성된 모습은 다음과 같습니다.

![Channel 클라이언트에서 열린 tutorial WAM](../../assets/first-app/tutorial-wam.png)

시작하기 전에 세 가지 용어만 알아두세요.

- **Function**: 앱 서버가 수행하는 한 가지 작업입니다. 이 튜토리얼에서는 화면 열기와 메시지 보내기가 Function입니다.
- **Extension**: 앱의 Function을 Channel의 기능과 연결하는 설정입니다. 여기서는 `/tutorial` Command를 연결합니다.
- **WAM**: Channel 안에서 열리는 앱 화면입니다. 이 튜토리얼에서는 두 개의 메시지 전송 버튼을 보여줍니다.

SDK가 Function 요청의 서명 확인, Extension 등록, WAM과 서버의 연결을 처리하므로 이 동작을 직접 구현할 필요는 없습니다.

## 1. 시작 전 준비

다음 항목이 필요합니다.

- Channel 개발자 포털에 접근할 수 있는 계정
- Node.js 20.11 이상과 Corepack
- Git
- 로컬 서버를 외부에 공개할 HTTPS tunnel 도구(예: [ngrok](https://ngrok.com/))

Channel 설정에서 App Store를 열고 앱 만들기 화면으로 이동합니다.

![Channel 설정에서 App Store 열기](../../assets/first-app/app-store-entry.png)

개발용 이름을 입력하고 약관에 동의한 뒤 private app을 만듭니다. Private app은 지정한 테스트 채널에만 설치할 수 있으므로 첫 개발과 검증에 적합합니다.

![개발용 앱 생성](../../assets/first-app/create-app.png)

**완료 확인:** 만든 앱의 General settings 화면이 열리면 다음 단계로 이동합니다.

**먼저 확인할 것:** 앱 만들기 메뉴가 보이지 않으면 해당 Channel에서 앱을 만들 권한이 있는지 확인하세요.

## 2. 앱 정보와 권한 설정

General settings에서 App ID를 확인합니다.

![App ID 확인](../../assets/first-app/app-id.png)

Auth and Access에서 App Secret을 발급하고, Server Settings에서 Signing Key를 발급합니다.

![App Secret 발급](../../assets/first-app/app-secret.png)

App ID는 앱을 구분하는 공개 값입니다. App Secret과 Signing Key는 서버에서만 사용하는 비밀 값이며 다시 표시되지 않을 수 있습니다. 안전한 곳에 보관하고 Git, 문서, WAM 코드, 로그에 남기지 마세요.

Authentication and permissions에서 이 튜토리얼에 필요한 권한만 켭니다.

- Channel: `writeGroupMessage`
- Manager: `writeGroupMessageAsManager`

![튜토리얼 permission 설정](../../assets/first-app/permissions.png)

**완료 확인:** App ID, App Secret, Signing Key 세 값을 준비하고 두 권한을 켰다면 다음 단계로 이동합니다.

**먼저 확인할 것:** Secret이나 Signing Key를 잃어버렸다면 임의의 값을 사용하지 말고 개발자 포털에서 다시 발급하세요.

## 3. TypeScript 튜토리얼 실행

터미널에서 튜토리얼 저장소를 내려받고 환경 파일을 만듭니다.

```bash
git clone https://github.com/channel-io/app-tutorial-ts.git
cd app-tutorial-ts
corepack enable
cp server/.env.example server/.env
```

`server/.env`에 앞에서 준비한 값을 입력합니다.

```dotenv
APP_ID=your-app-id
APP_SECRET=your-app-secret
SIGNING_KEY=your-hex-signing-key
```

의존성을 설치한 뒤 build, test, typecheck를 실행합니다.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm test
corepack pnpm typecheck
```

모든 명령이 성공하면 서버를 실행합니다.

```bash
corepack pnpm start
```

**완료 확인:** 터미널에 서버가 `3000` port에서 시작되었다는 로그가 표시되어야 합니다. 이 터미널은 계속 실행해 두세요.

**먼저 확인할 것:** 설치나 build가 실패하면 Node.js 버전과 첫 번째 오류를 확인하세요. 서명 검증을 끄거나 실패한 명령을 건너뛰지 마세요.

## 4. 서버를 Channel과 연결

새 터미널을 열고 로컬 `3000` port를 HTTPS로 공개합니다. 다음은 ngrok을 사용하는 예시입니다.

```bash
ngrok http 3000
```

ngrok 화면의 `Forwarding` 항목에 표시된 HTTPS 주소를 복사합니다. 이 문서에서는 그 주소를 `https://YOUR_HOST`라고 부릅니다.

개발자 포털의 Server Settings에 다음 두 주소를 입력합니다.

| 설정              | 값                               |
| ----------------- | -------------------------------- |
| Function Endpoint | `https://YOUR_HOST/functions`    |
| WAM Endpoint      | `https://YOUR_HOST/resource/wam` |

![Function과 WAM Endpoint 설정](../../assets/first-app/endpoints.png)

Function Endpoint 뒤에 `/v1`을 붙이거나 WAM Endpoint 뒤에 `/tutorial`을 붙이지 마세요. 저장한 뒤 앱 서버를 한 번 재시작합니다.

**완료 확인:** 서버 로그에 Extension 등록 성공이 표시되면 Channel이 `/tutorial` Command를 찾을 수 있는 상태입니다.

**먼저 확인할 것:** 등록에 실패하면 App ID와 App Secret, tunnel 주소를 다시 확인하세요. Tunnel 주소가 바뀌었다면 개발자 포털의 두 Endpoint도 갱신해야 합니다.

## 5. 테스트 채널에서 실행

개발자 포털에서 private app을 테스트 채널에 설치합니다. 이미 설치했다면 설치 정보를 새로고침합니다.

1. Channel의 그룹 대화를 엽니다.
2. 메시지 입력창에 `/tutorial`을 입력하고 Command를 실행합니다.
3. WAM이 열리면 app bot 전송 버튼과 manager 전송 버튼을 차례로 누릅니다.

다음처럼 두 메시지가 모두 도착하면 성공입니다.

![Bot과 manager가 보낸 테스트 메시지](../../assets/first-app/tutorial-result.png)

**완료 확인:** app bot 메시지와 현재 manager 이름으로 보낸 메시지가 각각 하나씩 보여야 합니다.

**먼저 확인할 것:** `/tutorial`이 목록에 없다면 서버 로그의 Extension 등록 결과를 확인하고 앱을 다시 설치하거나 새로고침하세요. WAM은 열리지만 전송이 실패하면 [문제 해결](#8-문제-해결)에서 권한 항목을 확인하세요.

## 6. Go로 진행하기

Go를 사용한다면 TypeScript 대신 이 절차를 진행합니다. Go 1.25와 WAM build를 위한 Node.js 및 Corepack이 필요합니다.

```bash
git clone https://github.com/channel-io/app-tutorial.git
cd app-tutorial
corepack enable
cp .env.example .env
```

`.env`에 `APP_ID`, `APP_SECRET`, `SIGNING_KEY`를 입력하고 현재 shell에 불러옵니다.

```bash
set -a
. ./.env
set +a
```

Build와 test를 실행한 뒤 서버를 시작합니다.

```bash
make build
make test
make run
```

새 터미널에서 `3022` port를 공개합니다.

```bash
ngrok http 3022
```

개발자 포털에는 TypeScript와 동일하게 Function Endpoint를 `https://YOUR_HOST/functions`, WAM Endpoint를 `https://YOUR_HOST/resource/wam`으로 입력합니다. Go 서버의 상태는 `http://localhost:3022/ping`에서도 확인할 수 있습니다. 이후 [테스트 채널에서 실행](#5-테스트-채널에서-실행) 절차는 같습니다.

**완료 확인:** `make test`가 성공하고 서버 로그에 listener 시작과 Extension 등록 성공이 표시되어야 합니다.

**먼저 확인할 것:** `make run` 직후 종료된다면 `.env`의 세 값이 현재 shell에 로드되었는지 확인하세요.

## 7. SDK가 처리한 일

첫 실행을 마쳤다면 방금 지나온 흐름을 다음처럼 이해할 수 있습니다.

1. SDK가 `command:v1` Extension을 등록해 Channel에 `/tutorial` Command가 있음을 알립니다.
2. Command를 실행하면 `tutorial.open` Function이 WAM을 엽니다.
3. WAM의 app bot 버튼은 `tutorial.sendAsBot` Function을 앱 서버에서 실행합니다.
4. Manager 버튼은 WAM의 `useNativeFunction`을 통해 현재 로그인한 manager의 권한으로 Channel 기능을 실행합니다.

서버에서는 SDK가 Function schema 공개, `x-signature` 검증, app/channel token 관리를 담당합니다. 구체적으로 `TokenManager`가 token을 재사용하고 SDK가 `registerExtension(appId, extensionName, systemVersion)` 호출과 Function discovery에 응답합니다. WAM에서는 `useCallFunction`이 AppStore를 거쳐 앱 서버의 Function을 호출합니다.

이 내부 동작을 변경해야 할 때만 [핵심 개념](concepts.md#인증-서명-token), [Function 등록](functions.md), [Command 가이드](extensions/command.md), [WAM 가이드](wam.md)를 이어서 확인하세요.

## 8. 문제 해결

| 증상                      | 먼저 확인할 것                                                                |
| ------------------------- | ----------------------------------------------------------------------------- |
| Extension 등록 실패       | App ID와 App Secret, 공개 HTTPS 주소, 서버 재시작 여부                        |
| `401` 또는 signature 오류 | Signing Key를 hex 문자열 그대로 입력했는지                                    |
| `/functions/v1`이 `404`   | 포털의 Function Endpoint가 `/functions`로 끝나는지                            |
| WAM이 열리지 않음         | WAM Endpoint가 `/resource/wam`으로 끝나는지, WAM build가 성공했는지           |
| Manager 전송 실패         | `writeGroupMessageAsManager` 권한, 그룹 대화인지, 현재 manager로 로그인했는지 |
| Bot 전송 실패             | `writeGroupMessage` 권한, 앱이 현재 채널에 설치되었는지                       |

`SKIP_SIGNATURE_VERIFICATION=true`는 격리된 로컬 디버깅 외에는 사용하지 마세요. App Secret, Signing Key, access/refresh token을 이슈나 로그에 붙이지 마세요.

## 다음 문서

1. [핵심 개념](concepts.md)에서 Function, Extension, WAM의 관계를 이해합니다.
2. [Function 등록](functions.md)과 [Command 가이드](extensions/command.md)에서 서버 동작과 Command를 확장합니다.
3. [WAM 가이드](wam.md)에서 화면과 Function 호출을 확장합니다.
4. [Extension 전체 가이드](extensions.md)에서 앱에 필요한 다른 기능을 선택합니다.
5. 출시 전 [프로덕션 준비 가이드](app-development.md)를 확인합니다.
6. 언어별 API는 [TypeScript 레퍼런스](../../reference/typescript/README.md)와 [Go 레퍼런스](../../reference/go/README.md)에서 확인합니다.

전체 구현은 [TypeScript 튜토리얼](https://github.com/channel-io/app-tutorial-ts) 또는 [Go 튜토리얼](https://github.com/channel-io/app-tutorial)에서 확인할 수 있습니다.
