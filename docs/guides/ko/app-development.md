# 프로덕션 준비 가이드

설치된 Test Channel에서 앱의 전체 흐름이 동작한 뒤 이 문서를 사용하세요. 첫 앱 Quickstart를
완료하기 위한 필수 문서는 아닙니다. 동작하는 Function, Extension, 선택적 WAM을 안전하게 배포하고
rollback하며 관측·운영할 수 있는 release로 만드는 것이 목적입니다.

먼저 [핵심 개념](concepts.md), [Extension 전체 가이드](extensions.md), 필요한 family 상세 문서를
완료하세요. 정확한 API는 [TypeScript 레퍼런스](../../reference/typescript/README.md)와
[Go 레퍼런스](../../reference/go/README.md)를 기준으로 확인합니다.

## 이 가이드를 사용하는 방법

각 section을 release gate로 사용합니다. 앱에 해당하는 각 항목의 담당자, 검증 근거, rollback
결정을 기록하세요.

| Gate        | Release 전 필요한 근거                                            |
| ----------- | ----------------------------------------------------------------- |
| Contract    | Function schema, Extension discovery, permission 검토 완료        |
| Security    | Signature, credential, authorization, secret rotation 테스트 통과 |
| Reliability | Retry, idempotency, timeout, token cache, provider limit가 제한됨 |
| Operations  | 안전한 log, metric, alert, runbook, rollback 준비 완료            |
| Runtime     | 설치된 private app에서 server와 WAM build 검증 완료               |

## 1. 공개 계약 확정

- Release 전에 모든 공개 Function name, 입출력 schema, 안정적인 error type, Extension metadata ID,
  `systemVersion`을 검토합니다.
- `getFunctions` discovery에 모든 metadata Function과 참조된 runtime Function이 포함되는지 확인합니다.
- 출시할 각 기능의 실제 호출을 하나 이상 실행합니다. 등록 성공만으로 runtime 동작이 증명되지는
  않습니다.
- AppStore가 즉시 discovery를 호출할 수 있으므로 등록이나 schema 변경 전에 호환되는 Function
  Endpoint를 먼저 배포합니다.
- Permission 추가는 product rollout으로 취급합니다. 기존 설치가 새 permission을 받거나 승인하는
  방식을 확인한 뒤 해당 permission에 의존합니다.

표준 Extension 계약에 속하지 않는 provider 고유 작업은 standalone으로 유지합니다. 이 문서에서
계약 설명을 중복하지 말고 [Function 등록](functions.md)과
[Extension 전체 가이드](extensions.md)를 따르세요.

## 2. 보안과 데이터 처리 gap 제거

- Process startup에서 App ID, App Secret, Signing Key를 필수로 검사하고 값이 없으면 안전하게
  실패합니다.
- 모든 inbound Function 요청의 정확한 raw body를 `x-signature`로 검증합니다. 배포 환경에서는
  검증을 끄지 않습니다.
- App Secret, Signing Key, refresh token, provider credential, server access token을 WAM bundle,
  source map, log, analytics, `wamArgs`에 넣지 않습니다.
- Function input과 WAM host data를 검증합니다. 유효한 token이나 signature가 요청된 Channel,
  user, manager, provider resource에 대한 business authorization을 대신하지는 않습니다.
- Secret rotation 순서, overlap 기간, 폐기, 검증 방법을 문서화합니다. 사고가 발생하기 전에
  secret rotation을 테스트합니다.
- 고객·provider data의 log 보존, masking, 삭제 정책을 정합니다.

## 3. 실패와 동시성 제한

- Client, server, provider timeout을 설정합니다. Function 요청이 무기한 기다리지 않게 합니다.
- 일시적인 실패만 제한된 exponential backoff와 jitter로 retry합니다. Provider throttling과 제공되는
  `Retry-After`를 지킵니다.
- Mutation에 idempotency key 또는 durable deduplication record를 둡니다. Function, hook, polling,
  webhook의 중복 전달을 테스트합니다.
- 여러 replica에서는 shared token cache storage를 사용합니다. App token rate limit를 넘기지 않고
  refresh lock과 fallback token 발급이 동작하는지 확인합니다.
- Extension auto-registration을 idempotent하고 제한된 흐름으로 유지합니다. 여러 replica가 startup에서
  경쟁할 수 있으므로 token state를 공유하고 registration race가 무한 retry storm을 만들지 않게 합니다.
- Liveness와 readiness를 분리합니다. 필요한 schema, migration, credential, provider check가 끝나기
  전에는 traffic을 받지 않습니다.
- Queue, batch size, cursor progress, WAM payload, provider response size에 상한을 둡니다.

## 4. Release candidate 테스트

네 단계로 검증합니다.

1. Schema, serialization, 순수 business rule
2. Signature 거부, token scope, permission 거부, structured Function error
3. Function discovery, Extension metadata, server/WAM build, endpoint routing
4. Test Channel에 설치한 private app의 성공, 거부, retry, 중복 전달, provider 장애, 복구 흐름

Production과 같은 artifact와 configuration 형태를 사용합니다. 앱이 두 구현을 모두 지원하면
TypeScript와 Go server가 같은 공개 계약을 만족하는지 확인합니다. Go server도 TypeScript server와
같은 React WAM package를 제공할 수 있습니다.

## 5. 안전한 관측성 추가

앱 운영에 필요한 field만 기록합니다.

- Operation 또는 full Function name
- Request/correlation ID
- App deployment version과 Extension system version
- Latency, 결과, 안정적인 error type, retry count, provider status category

Message body, token, credential, raw Function input, 고객 record, provider payload, signed request body를
log에 남기지 않습니다. Error가 log나 trace에 도달하기 전에 sanitize합니다.

지속적인 signature 실패, Extension 등록 실패, token refresh 오류, provider throttling, queue lag,
Function latency/error rate 상승, 반복되는 rollback 조건에 alert를 설정합니다. 개별 실패마다
alert하지 말고 각 alert를 담당자와 runbook에 연결하세요.

## 6. 안전한 배포와 rollback

- Database와 schema migration은 이전·다음 app version 모두와 backward compatible하게 만듭니다.
  파괴적인 정리는 이후 release로 분리합니다.
- 새 Function을 가리키는 metadata보다 server를 먼저 rollout합니다. WAM asset은 immutable filename
  또는 검증된 cache invalidation을 사용합니다.
- Provider, permission set, Extension contract가 크게 바뀌면 canary 또는 제한된 test 설치를 사용합니다.
- Function error 상승, discovery 실패, authorization regression, provider saturation, data integrity
  위험 같은 rollback trigger를 정의합니다.
- 이전 server/WAM artifact, configuration, migration position, permission 동작을 rollback에 사용할 수
  있게 보관합니다. Rollback 뒤 registration과 discovery가 호환되는 계약으로 돌아오는지 확인합니다.
- 설치된 Channel에서 post-deploy smoke test를 실행하고 release window 동안 합의된 metric을 확인합니다.

## 7. 최종 출시 체크리스트

- [ ] 공개 Function과 Extension 계약을 검토하고 discovery를 확인했습니다.
- [ ] Signature, permission, business authorization, secret rotation 테스트가 통과합니다.
- [ ] Token cache, registration race, idempotency, timeout, retry, provider throttling이 제한되어 있습니다.
- [ ] Log와 trace에 credential이나 고객·provider payload가 없습니다.
- [ ] Alert, dashboard, 담당자, incident runbook이 있습니다.
- [ ] Migration, 배포 순서, smoke test, rollback을 연습했습니다.
- [ ] 실제 production artifact가 설치된 private app에서 동작합니다.

## 레퍼런스 맵

- [Extension 전체 가이드와 family 상세 문서](extensions.md)
- [Function 등록](functions.md)
- [WAM 가이드](wam.md)
- [TypeScript 레퍼런스](../../reference/typescript/README.md)
- [Go 레퍼런스](../../reference/go/README.md)
- [공통 protocol](../../reference/protocol.md)
- [TypeScript 튜토리얼](https://github.com/channel-io/app-tutorial-ts)
- [Go 튜토리얼](https://github.com/channel-io/app-tutorial)
