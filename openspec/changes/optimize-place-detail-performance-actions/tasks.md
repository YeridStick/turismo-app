## 1. Diagnose Detail Hot Spots

- [ ] 1.1 Review `src/screens/PlaceDetailScreen.jsx` state updates, derived arrays/objects, inline callbacks and child props that change during paging, modal toggles, nearby updates and visit countdown.
- [ ] 1.2 Confirm the existing focus guards around nearby refresh, nearby interval setup, auto check-in and auto confirm before editing location-related code.
- [ ] 1.3 Identify the minimum local helpers or memoized values needed; avoid moving logic into unrelated files unless it reduces repeated work clearly.

## 2. Memoize Derived Place Data

- [ ] 2.1 Memoize normalized image data and deterministic gallery keys from `place.imageUrls`.
- [ ] 2.2 Memoize coordinates, directions URL, location map region and marker props so the map preview does not receive fresh objects on unrelated renders.
- [ ] 2.3 Memoize AR config, AR availability and AR navigation payload without changing `getPlaceArConfig` behavior.
- [ ] 2.4 Memoize services/amenities presentation using a stable lookup for `PLACE_SERVICES`.
- [ ] 2.5 Memoize info details, rating labels and the visible reviews slice used by the rendered review list.

## 3. Stabilize Gallery And Pager Rendering

- [ ] 3.1 Replace the outer place pager `Math.random()` key fallback with deterministic keys and memoize `keyExtractor`, `renderItem`, `getItemLayout`, momentum handler and scroll-failure handler.
- [ ] 3.2 Stabilize top gallery item rendering, item press behavior and horizontal scroll handler while preserving autoplay, image fit, placeholder behavior and pagination indicators.
- [ ] 3.3 Memoize fullscreen gallery `FlatList` callbacks, item renderer and layout helper; keep the current modal behavior and counter updates.
- [ ] 3.4 Review `FlatList` options for the outer pager and fullscreen gallery, keeping `initialNumToRender`, `windowSize` and `removeClippedSubviews` only where safe for current behavior.

## 4. Stabilize Primary Handlers And UI Props

- [ ] 4.1 Memoize back navigation, favorite toggle usage, directions, AR entry, gallery open/close, review modal, feedback modal and status modal close handlers where they are passed to controls.
- [ ] 4.2 Convert review submit and feedback submit handlers to `useCallback` with explicit dependencies.
- [ ] 4.3 Remove avoidable inline callbacks in repeated review, service, feedback type and modal action rendering where doing so improves prop stability without obscuring the code.
- [ ] 4.4 Preserve focus-safe behavior so no blurred screen path requests permissions, reads coordinates or calls nearby context.

## 5. Improve Action Button Layout

- [ ] 5.1 Derive `hasDirections`, `hasArAction` and action layout state from memoized coordinates and AR config.
- [ ] 5.2 Update the action row styles so AR-capable places with coordinates show `Como llegar` and `Realidad aumentada` as two balanced columns when width allows.
- [ ] 5.3 Ensure the action row wraps or stacks cleanly on narrow widths without clipping text, icons or touch targets.
- [ ] 5.4 Ensure non-AR places keep `Como llegar` as a single primary action without an empty second-column gap.

## 6. Validate

- [ ] 6.1 Run `npm test -- --runInBand`.
- [ ] 6.2 Run `git diff --check`.
- [ ] 6.3 Manually validate an AR-capable place such as San Agustin: action buttons, gallery movement, AR entry, return from AR and no camera flicker regression.
- [ ] 6.4 Manually validate a non-AR place: only `Como llegar` appears, directions open, reviews/feedback/nearby/visit flows remain usable.
- [ ] 6.5 Manually validate focus behavior: leaving the detail screen or opening AR stops nearby polling and does not request coordinates while blurred.
