# @channel.io/app-sdk-wam-ui

WAM-specific UI infrastructure and presets for Channel.io apps.

Use this package for WAM runtime behavior such as theme detection, iframe height synchronization,
navigation, and common full-page states. Import general-purpose UI components directly from the
redesigned Bezier subpath.

## Installation

```bash
npm install @channel.io/app-sdk-wam-ui
npm install react @channel.io/bezier-react@4.0.0-next.14 @channel.io/bezier-icons@0.60.0 styled-components@^6
```

Bezier React 4 is still a prerelease. Pin `4.0.0-next.14` in application lockfiles and review its
release notes before upgrading.

## Quick start

```tsx
import { SendIcon } from "@channel.io/bezier-icons";
import { Button, HStack } from "@channel.io/bezier-react/beta";
import {
  HeightSynchronizer,
  InlineBanner,
  WamHeader,
  WamThemeProvider,
} from "@channel.io/app-sdk-wam-ui";

export function App() {
  return (
    <WamThemeProvider>
      <HeightSynchronizer maxHeight={480}>
        <WamHeader title="Example" />
        <HStack spacing={8} padding={16}>
          <Button label="Send" leadingContent={SendIcon} variant="filled" semantic="primary" />
        </HStack>
        <InlineBanner variant="info" content="Ready to send." />
      </HeightSynchronizer>
    </WamThemeProvider>
  );
}
```

## Bezier usage

New WAM interfaces should import redesigned components from
`@channel.io/bezier-react/beta`:

```tsx
import {
  Banner,
  Button,
  ConfirmModal,
  FormField,
  Search,
  Select,
  SettingsField,
  Switch,
  TextInput,
} from "@channel.io/bezier-react/beta";
```

Provider and stable token APIs that are not exported by the beta subpath remain available from
`@channel.io/bezier-react`. Import UI components from `/beta` and use the current token APIs.

## Components

### `WamThemeProvider`

Wraps a WAM with Bezier's `AppProvider` and redesigned `ToastProvider`. It detects the light or
dark appearance from the WAM runtime, or accepts an explicit override.

```tsx
<WamThemeProvider>
  <MyWam />
</WamThemeProvider>
```

### `HeightSynchronizer`

Observes content changes and synchronizes the current iframe height through the host bridge.

```tsx
<HeightSynchronizer maxHeight={600}>
  <MyContent />
</HeightSynchronizer>
```

Use `excludePaths` with `pathname` when a route manages its own size.

### `WamHeader`

Provides WAM back and close behavior with Bezier beta icon buttons. Pass WAM SDK navigation and
close callbacks when the surrounding app controls those actions.

```tsx
<WamHeader title="Settings" showBackButton />
```

### `LoadingPage`, `ErrorPage`, and `EmptyState`

Consistent full-page states for small WAM surfaces.

```tsx
if (loading) return <LoadingPage message="Loading data..." />;
if (error) return <ErrorPage error={error} onRetry={refetch} />;
return <EmptyState title="No results" description="Try a different search." />;
```

### `InlineBanner`

A semantic success, error, or information preset over Bezier beta `Banner`.

```tsx
<InlineBanner variant="success" content="Saved successfully." />
```

### `ConfirmDialog`

A compact confirmation preset over Bezier beta `ConfirmModal`.

```tsx
<ConfirmDialog
  show={open}
  onHide={() => setOpen(false)}
  title="Delete this item?"
  description="This action cannot be undone."
  destructive
  confirmText="Delete"
  onConfirm={handleDelete}
/>
```

### `SkeletonBox`, `SkeletonCircle`, and `BottomSheet`

WAM-oriented loading placeholders and compact overlay layouts that do not have a direct Bezier
beta equivalent. Give every `BottomSheet` an `ariaLabel`; it manages focus, Escape, and scroll
locking while open.

## Examples

- [TypeScript tutorial](https://github.com/channel-io/app-tutorial-ts)
- [Go tutorial](https://github.com/channel-io/app-tutorial)

Both tutorials show a React WAM using `@channel.io/app-sdk-wam` and this package alongside a
language-specific app server.

## Peer dependencies

| Package                    | Version                |
| -------------------------- | ---------------------- |
| `react`                    | >=17.0.0               |
| `@channel.io/bezier-react` | >=4.0.0-next.14 <5.0.0 |
| `@channel.io/bezier-icons` | >=0.60.0 <1.0.0        |
| `styled-components`        | >=6.0.0                |

Apps still using Bezier 3 should remain on `@channel.io/app-sdk-wam-ui` 0.2.x.

## License

MIT
