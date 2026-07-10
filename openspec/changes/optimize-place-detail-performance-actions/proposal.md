## Why

`PlaceDetailScreen` concentrates gallery rendering, place metadata, action buttons, services, reviews, nearby/visit state, feedback, favorites and location checks in one screen. Moving between places can feel uneven because derived data, handlers and list items are rebuilt more often than necessary, and places with AR currently stack the `Como llegar` and `Realidad aumentada` actions in a less balanced layout.

## What Changes

- Optimize `PlaceDetailScreen` rendering by memoizing derived place data, normalized images, service presentation, map props, review slices and primary handlers.
- Stabilize the top gallery and horizontal place pager with memoized `renderItem`, `keyExtractor`, scroll handlers and safe `FlatList` options where applicable.
- Keep location, nearby, visit/check-in, review, feedback and favorites behavior unchanged while ensuring focus guards still prevent location polling/tracking when the screen is blurred.
- Improve the primary action layout so AR-capable places show `Como llegar` and `Realidad aumentada` as two responsive columns when space allows, with controlled wrapping/stacking on smaller widths.
- Preserve the existing visual language, endpoints, navigation contracts, AR internals and backend response contracts.

## Capabilities

### New Capabilities

- `place-detail-experience`: Covers perceived performance, render stability, gallery fluidity, action-button responsiveness and focus-safe location behavior for the tourist place detail screen.

### Modified Capabilities

- None.

## Impact

- Affected code: primarily `src/screens/PlaceDetailScreen.jsx`; small pure helpers may be extracted only if they keep the change focused.
- Affected UI: gallery, detail card, main action buttons, services/amenities, reviews, location map preview, loading/error/empty states and modals inside the place detail screen.
- Affected runtime flows: favorites, directions, AR entry, nearby context, visit/check-in confirmation, reviews and feedback remain functionally compatible.
- No new dependencies, endpoints, navigation routes, AR/Viro/ARCore internals, dashboard, reservations, Home or API service changes.
