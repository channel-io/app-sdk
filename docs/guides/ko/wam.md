# WAM 가이드

WAM(Web App Module)은 Channel 클라이언트 안에서 열리는 앱의 React 웹 UI입니다. 앱 서버가 아니며
서버 credential을 보관하지 않습니다. Command, widget, custom tab처럼 사용자 상호작용이 필요한
Extension action에서 사용합니다.

## WAM을 여는 action

Function이 다음과 같은 action result를 반환하면 Channel 클라이언트가 WAM을 엽니다.

```json
{
  "type": "wam",
  "attributes": {
    "appId": "public-app-id",
    "name": "tutorial",
    "wamArgs": { "view": "summary" }
  }
}
```

`appId`는 공개 식별자이고 `name`은 WAM 경로를 선택합니다. `wamArgs`는 브라우저에서 읽을 수
있으므로 secret, token, provider credential, 고객 원문을 넣지 마세요.

## Endpoint와 React 설정

Developer portal에는 WAM root를 등록하고 빌드된 SPA는 `${WAM_ENDPOINT}/${name}`에서 제공합니다.

```text
WAM Endpoint: https://app.example.com/resource/wam
실제 WAM:     https://app.example.com/resource/wam/tutorial
```

React root를 `WamProvider`로 감쌉니다.

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { WamProvider } from "@channel.io/app-sdk-wam";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WamProvider>
      <App />
    </WamProvider>
  </React.StrictMode>,
);
```

Go 앱도 같은 TypeScript/React WAM package를 사용합니다. Go 서버는 WAM을 여는 action과 Function을
제공하고 정적 SPA route를 별도로 mount합니다.

## Runtime data와 신뢰 경계

`useWamData` 또는 `useTypedWamData`로 host가 주입한 값을 읽습니다. Surface에 따라 `appId`,
`channelId`, `managerId`, `chatId`, `chatType`, `rootMessageId`와 `wamArgs`가 제공될 수 있습니다.
Optional 값은 항상 존재한다고 가정하지 말고 schema로 검증하세요.

WAM은 Channel host가 관리하는 manager/user authorization을 사용합니다. App Secret, Signing Key,
app token, channel token을 WAM bundle이나 runtime data로 전달하지 마세요.

## App Function과 Native Function 호출

앱의 business logic이나 app/bot 권한 작업은 `useCallFunction`으로 서버 Function에 요청합니다.
서버가 `TokenManager`로 channel token을 얻어 필요한 작업을 수행합니다.

```tsx
const appId = useWamData("appId") as string;
const { call, loading, error } = useCallFunction({
  appId,
  name: "orders.get",
});

const order = await call({ orderId: "order-1" });
```

현재 manager/user가 직접 수행하는 Channel operation만 `useNativeFunction`을 사용합니다. 권한은 현재
Channel surface와 역할에 따라 host가 결정하며 앱 서버의 `TokenManager`가 대신 만들 수 없습니다.

```tsx
const { call } = useNativeFunction({ name: "writeGroupMessageAsManager" });
await call({ channelId, groupId, dto: { plainText: "Hello" } });
```

SDK가 공개하는 Native Function 이름과 입력 타입만 사용하고 필요한 permission을 활성화하세요.

## 크기와 닫기

`useWamSize`로 초기 크기와 콘텐츠 변경 후 크기를 설정하고 `useWamClose`로 닫습니다.

```tsx
const { setSize } = useWamSize();
const { close } = useWamClose();

useEffect(() => setSize({ width: 480, height: 320 }), [setSize]);
```

닫으면서 다른 작업을 실행해야 하면 먼저 `useCallFunction` 또는 `useNativeFunction`의 완료를 확인한
뒤 `close()`를 호출하세요. 실패 상태를 사용자에게 보여주지 않은 채 WAM부터 닫지 마세요.

## 테스트 체크리스트

- 설치된 private app에서 WAM을 열고 host bridge가 준비되는지 확인합니다.
- 직접 WAM URL을 연 브라우저에는 host bridge가 없다는 점을 처리합니다.
- 누락된 optional context, 잘못된 `wamArgs`, Function error를 테스트합니다.
- manager/user permission 거부와 server-side channel token 흐름을 각각 테스트합니다.
- 초기 크기, 동적 resize, 정상 close를 확인합니다.
- bundle, source map, log, `wamArgs`에 credential이 없는지 검사합니다.

Command에서 WAM을 여는 방법은 [Command 가이드](extensions/command.md), 등록은
[Extension 전체 가이드](extensions.md), 출시 전 검증은 [프로덕션 준비 가이드](app-development.md)를
확인하세요. 정확한 hook API는
[TypeScript WAM 레퍼런스](../../reference/typescript/WAM.md), Go 서버 연결은
[Go WAM 레퍼런스](../../reference/go/WAM.md)를 기준으로 합니다.
