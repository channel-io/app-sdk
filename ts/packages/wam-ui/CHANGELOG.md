# @channel.io/app-sdk-wam-ui

## 0.4.1

### Patch Changes

- 6dfd90d: Generate a current secure TypeScript starter, add first-class Messaging helpers, and verify WAM UI
  against Bezier React 4.0.0-next.14.

## 0.4.0

### Minor Changes

- a4583bb: Use redesigned Bezier components from `@channel.io/bezier-react/beta` throughout WAM UI.

  Remove the general-purpose `FormSection`, `FormRow`, `InputRow`, `SelectRow`, `ToggleRow`, and
  `SearchInput` exports in favor of their Bezier beta equivalents. Update the remaining WAM-specific
  components and presets to the Bezier v4 button, banner, icon, form, and toast APIs.

  Require `BottomSheet.ariaLabel` and add dialog semantics, focus containment, Escape handling, and
  scroll restoration.

## 0.3.0

### Minor Changes

- 1d6c88d: Require and verify Bezier React 4.0.0-next.13 with Bezier Icons 0.60.0, migrate components to the current semantic color tokens, and document the prerelease baseline. Apps that still use Bezier 3 should remain on WAM UI 0.2.x.

## 0.4.0

### Patch Changes

- 47047ac: Allow `@channel.io/bezier-react` v4 prerelease versions and verify WAM UI against `4.0.0-next.8`.

## 0.2.1

### Patch Changes

- 93f39be: Add InlineBanner component for inline success/error/info feedback messages
