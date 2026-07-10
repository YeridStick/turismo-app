## Context

`src/screens/PlaceDetailScreen.jsx` renders a horizontally paged detail experience. Each page mounts `PlaceDetailContent`, which owns detailed place fetches, the top gallery, place card, services, reviews, location preview, feedback, visit/check-in flow and nearby polling. The screen already has an important AR safety guard: nearby refresh and automatic visit effects check focus before requesting coordinates, and the interval is not set while the screen is blurred.

Current render hot spots:

- `PlaceDetailScreen` passes inline `renderItem`, `keyExtractor`, `onMomentumScrollEnd`, `onScrollToIndexFailed` and `getItemLayout` props to the outer `FlatList`.
- The outer key extractor falls back to `Math.random()`, which can produce unstable keys for places without ids.
- `PlaceDetailContent` derives coordinates, map region/markers, image props, services, review slices and action URLs during render.
- The top gallery maps images directly inside a `ScrollView`, while the fullscreen gallery uses inline `renderItem`, `keyExtractor` and scroll handlers.
- Action buttons build `Linking` and `navigation.navigate` handlers inline.
- Services run a `PLACE_SERVICES.find()` for each rendered service.
- Location preview creates fresh `initialRegion` and `markers` objects on every render, which can cause heavier child updates.

The change should stay small and focused: no endpoint changes, no AR internals, no navigation route changes, no new dependencies and no broad screen rewrite.

## Goals / Non-Goals

**Goals:**

- Reduce unnecessary render work when paging between places, opening modals, updating nearby/visit state or scrolling.
- Stabilize `FlatList`/gallery props and expensive child props so memoization can actually help.
- Keep existing loading, error, empty, favorites, directions, AR, nearby, visit/check-in, reviews and feedback behavior.
- Preserve the focus-safe location behavior so blurred detail screens do not request coordinates or run nearby polling.
- Improve AR action layout with two balanced columns when width allows, and controlled vertical wrapping on narrow widths.

**Non-Goals:**

- Do not touch `ARScreen`, `ARViewer`, Viro, ARCore, model loading or AR navigation contracts.
- Do not change backend endpoints, response contracts or `api.js`.
- Do not alter Dashboard, Reservas, Home or unrelated screens.
- Do not introduce new libraries, global caches or architectural rewrites.
- Do not redesign the full visual language of the detail screen.

## Decisions

### 1. Keep the optimization local to `PlaceDetailScreen`

Use local helpers, `useMemo`, `useCallback` and selective `React.memo` instead of moving the detail screen into a new feature module.

Rationale: the requested scope is narrow, and the existing file already contains the full detail behavior. Local changes reduce regression risk around AR, navigation and visit flows.

Alternative considered: split the whole screen into many new files. That could improve long-term maintainability, but it would make this performance/layout change much larger than needed.

### 2. Memoize derived place presentation

Create stable derived values for:

- normalized image list and gallery item keys
- coordinates, directions URL and map preview props
- `hasAR`, `arConfig` and AR navigation payload
- service chips, using a precomputed lookup from `PLACE_SERVICES`
- visible review items and rating labels
- info details such as price, hours, distance and phone

Rationale: these values are pure derivations of `place`, `ratingSummary`, `reviews` or window width. Memoizing them prevents secondary state changes, such as modal visibility or visit countdown, from rebuilding large arrays/objects.

Alternative considered: leave data inline and only wrap children in `React.memo`. That would not help much because new array/object/function identities would still invalidate memoized children.

### 3. Stabilize list and gallery callbacks

Move `FlatList` callbacks to `useCallback` and keep layout helpers stable:

- outer place pager `keyExtractor`, `renderItem`, `onMomentumScrollEnd`, `onScrollToIndexFailed` and `getItemLayout`
- fullscreen gallery `renderItem`, `keyExtractor`, `onMomentumScrollEnd` and `getItemLayout`
- top gallery item press and scroll handlers

Rationale: `FlatList` and memoized children benefit from stable props, especially when paging across detail cards or changing favorite state.

Alternative considered: replacing the top gallery `ScrollView` with a `FlatList`. This may be useful if galleries grow large, but the current top gallery has manual swipe disabled and autoplay behavior; a minimal pass should first stabilize the existing implementation. If converted, it must preserve the same visual behavior.

### 4. Use focus checks as a hard boundary for location work

Keep the existing `isFocusedRef` checks and effect guards. Any memoization or handler extraction must not move `Location.requestForegroundPermissionsAsync()` or `Location.getCurrentPositionAsync()` outside focused paths.

Rationale: the previous AR camera issue depends on detail screens not continuing location polling/tracking while blurred. This is a functional guardrail, not just a performance detail.

Alternative considered: centralizing nearby polling into a helper hook. That could be cleaner, but it risks changing lifecycle boundaries during this scoped proposal.

### 5. Make primary actions responsive with stable button styles

For AR-capable places, render `Como llegar` and `Realidad aumentada` in a wrapping row. Each button gets a shared base style, consistent height/radius/alignment, and a two-column width target such as `flexBasis: "48%"`, `flexGrow: 1` and a minimum width. On narrow widths or long labels, wrapping allows vertical stacking without clipping.

For non-AR places, keep `Como llegar` as the only primary action and let it span the available row without reserving AR space.

Rationale: this matches the existing card style while improving balance on normal mobile widths and preventing text/icon overflow on small devices.

Alternative considered: always stack actions vertically. That is safer for text length, but it misses the requested two-column AR layout on capable widths.

## Risks / Trade-offs

- Missing dependency in a memoized value -> stale UI. Mitigation: keep dependency arrays explicit and prefer small pure helper inputs over large objects where practical.
- Over-memoization makes the screen harder to read. Mitigation: memoize only arrays, objects and handlers that feed lists, memoized children or heavy child components.
- `FlatList` key changes can affect paging restoration. Mitigation: use stable id-based keys and deterministic index fallback, never `Math.random()`.
- Changing gallery implementation can alter autoplay or scroll behavior. Mitigation: preserve the current visual behavior; only convert to `FlatList` if the same paging/autoplay behavior is maintained.
- Action row wrapping can look uneven on very narrow widths. Mitigation: use consistent min height, `flexGrow`, `flexBasis`, `minWidth` and text constraints so both horizontal and vertical states remain polished.
- Location optimizations can accidentally reintroduce blurred polling. Mitigation: keep focus checks in `refreshNearbyState`, interval setup, auto check-in and auto confirm effects, and include this in manual validation.

## Migration Plan

1. Implement the memoization and handler stabilization in `PlaceDetailScreen.jsx`.
2. Adjust the action row styles and button composition for AR and non-AR states.
3. Run `npm test -- --runInBand` and `git diff --check`.
4. Manually validate an AR place, a non-AR place, gallery paging, favorites, directions, AR entry/return, reviews, feedback and blurred/focused location behavior.

Rollback is a normal source revert of the `PlaceDetailScreen.jsx` changes because no backend, dependency or migration state is introduced.

## Open Questions

- None for implementation. Runtime validation still needs real device/emulator coverage for the AR return flow and small-width wrapping.
