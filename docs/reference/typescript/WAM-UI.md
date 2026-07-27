# WAM UI

`@channel.io/app-sdk-wam-ui` provides runtime-aware UI infrastructure and presets for Channel.io
WAMs. Use it together with the WAM bridge and redesigned Bezier components instead of treating it
as a replacement design system.

## Package responsibilities

```text
@channel.io/app-sdk-wam       WAM data, app/native calls, sizing, and closing
@channel.io/app-sdk-wam-ui    WAM theme, height sync, navigation, states, and presets
@channel.io/bezier-react/beta General-purpose redesigned UI components
```

Use `wam-ui` when behavior depends on the WAM host, such as detecting appearance, synchronizing
iframe height, closing the current WAM, or showing a compact WAM loading/error state. Import
buttons, forms, settings, inputs, selects, switches, search, banners, and modals directly from
`@channel.io/bezier-react/beta`.

## Versions

The current verified baseline is:

| Package                      | Version         |
| ---------------------------- | --------------- |
| `@channel.io/app-sdk-wam-ui` | `0.4.0`         |
| `@channel.io/bezier-react`   | `4.0.0-next.14` |
| `@channel.io/bezier-icons`   | `0.60.0`        |
| `styled-components`          | `6.x`           |

Bezier React 4 is published under the `next` tag. Pin the exact prerelease in application
lockfiles and review release notes before upgrading.

## Setup

```tsx
import { WamProvider } from "@channel.io/app-sdk-wam";
import {
  HeightSynchronizer,
  WamHeader,
  WamThemeProvider,
} from "@channel.io/app-sdk-wam-ui";
import { Button, HStack } from "@channel.io/bezier-react/beta";

export function App() {
  return (
    <WamProvider>
      <WamThemeProvider>
        <HeightSynchronizer maxHeight={480}>
          <WamHeader title="Example" />
          <HStack padding={16} justify="end">
            <Button label="Save" variant="filled" semantic="primary" />
          </HStack>
        </HeightSynchronizer>
      </WamThemeProvider>
    </WamProvider>
  );
}
```

`WamThemeProvider` uses Bezier's root `AppProvider` because provider and stable token APIs remain
at the root. Import UI components from the `/beta` subpath and use the current token APIs.

## WAM-specific exports

- `WamThemeProvider`: detects light/dark appearance and installs Bezier providers
- `HeightSynchronizer`: observes content and synchronizes height through the host bridge
- `WamHeader`: standard back and close behavior
- `LoadingPage`, `ErrorPage`, `EmptyState`: compact WAM state presets
- `InlineBanner`: semantic preset over Bezier beta `Banner`
- `ConfirmDialog`: confirmation preset over Bezier beta `ConfirmModal`
- `SkeletonBox`, `SkeletonCircle`: loading placeholders
- `BottomSheet`: compact overlay with focus, Escape, and scroll handling

`BottomSheet` requires an `ariaLabel` that describes the dialog.

## General UI components

Import forms, settings, sections, fields, inputs, selects, switches, and search directly from
`@channel.io/bezier-react/beta`. Bezier beta buttons use `label`, `variant`, and `semantic`.

## Complete examples

- [TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts)
- [Go tutorial](https://github.com/channel-io/app-tutorial)

See the [package README](../../../ts/packages/wam-ui/README.md) for the full API and examples.
