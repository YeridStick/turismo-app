## ADDED Requirements

### Requirement: Place detail functionality remains compatible
`PlaceDetailScreen` SHALL preserve all existing user-facing functionality while optimizing rendering and action layout.

#### Scenario: Existing detail actions remain available
- **WHEN** a user opens a place detail screen with valid place data
- **THEN** the screen MUST still support back navigation, gallery viewing, favorite toggling, directions, AR entry when available, services, reviews, feedback, nearby context and visit/check-in flows where applicable

#### Scenario: Existing external contracts are unchanged
- **WHEN** the implementation is completed
- **THEN** it MUST NOT change navigation route names, route params, endpoint names, response contracts, AR internals, model loading or dependencies

### Requirement: Derived place data is stable across secondary state changes
`PlaceDetailScreen` SHALL memoize derived place presentation data so unrelated state updates do not rebuild heavy arrays, objects or child props.

#### Scenario: Place-derived values are memoized
- **WHEN** modal visibility, visit countdown, favorite loading or review submission state changes without a place data change
- **THEN** normalized image data, coordinates, map preview props, service presentation, info details, AR config and visible review items MUST retain stable identities where practical

#### Scenario: Services are prepared without repeated lookup work
- **WHEN** services or amenities are rendered for a place
- **THEN** icon and label presentation MUST be derived from memoized data or a stable lookup instead of repeated per-render scans where practical

### Requirement: Primary handlers are stable
`PlaceDetailScreen` SHALL memoize primary event handlers that are passed into lists, memoized children or repeated UI controls.

#### Scenario: Main actions use stable callbacks
- **WHEN** the detail screen renders action controls
- **THEN** handlers for back, favorite toggle, directions, AR entry, gallery open/close, review modal, feedback modal, review submit, feedback submit and nearby refresh MUST avoid unnecessary inline recreation where practical

#### Scenario: List callbacks are stable
- **WHEN** the outer place pager or gallery lists render
- **THEN** `renderItem`, `keyExtractor`, scroll handlers and layout helpers MUST be memoized or defined outside render where practical

### Requirement: Gallery rendering remains fluid
The top gallery and fullscreen gallery SHALL preserve their visual behavior while reducing rebuild work during paging and image changes.

#### Scenario: Top gallery preserves behavior
- **WHEN** a user views a place with one or more images
- **THEN** the top gallery MUST keep the current visual size, image fit, placeholder behavior, pagination indicator and autoplay behavior

#### Scenario: Gallery list data and callbacks are stable
- **WHEN** image index, modal visibility or nearby state changes
- **THEN** gallery image data, gallery item rendering, key extraction and scroll callbacks MUST avoid being rebuilt unless their inputs change

#### Scenario: List configuration is safe for paging
- **WHEN** a gallery or place pager uses `FlatList`
- **THEN** it MUST use deterministic keys and safe render-window configuration such as `initialNumToRender`, `windowSize` and `removeClippedSubviews` where applicable

### Requirement: AR action buttons use responsive two-column layout
The primary action area SHALL present directions and AR actions in a balanced responsive layout.

#### Scenario: AR place with coordinates shows two columns when width allows
- **WHEN** a place has valid coordinates and an AR model URL
- **THEN** `Como llegar` and `Realidad aumentada` MUST be displayed in a horizontal two-column row when the available width allows it

#### Scenario: AR action layout wraps safely on narrow widths
- **WHEN** the available width is too small or button text would not fit in two columns
- **THEN** the action buttons MUST wrap or stack vertically without clipping text, icons or touch targets

#### Scenario: Non-AR place keeps one primary action
- **WHEN** a place has valid coordinates and no AR model URL
- **THEN** `Como llegar` MUST remain the primary action and MUST NOT leave an empty second-column gap

#### Scenario: Button styling remains consistent
- **WHEN** one or two primary action buttons are shown
- **THEN** the buttons MUST use consistent height, radius, alignment, icon spacing and disabled/touch behavior, with directions retaining the primary style and AR retaining a secondary or bordered style

### Requirement: Location and nearby polling respect screen focus
`PlaceDetailScreen` SHALL NOT request location or run nearby polling while the detail screen is blurred.

#### Scenario: Blurred screen skips nearby refresh
- **WHEN** the detail screen is not focused
- **THEN** nearby refresh MUST return before requesting foreground permissions, reading coordinates or calling the nearby context endpoint

#### Scenario: Blurred screen does not run polling interval
- **WHEN** the detail screen loses focus
- **THEN** any nearby polling interval MUST be cleaned up and MUST NOT continue ticking until the screen is focused again

#### Scenario: Auto visit flows remain focus-safe
- **WHEN** automatic check-in or automatic visit confirmation conditions become true while the screen is blurred
- **THEN** the automatic flow MUST NOT request coordinates, start check-in or confirm a visit until focus is restored

### Requirement: Validation is possible without backend changes
The change SHALL be verifiable with existing local tests and manual runtime flows.

#### Scenario: Local validation commands pass
- **WHEN** the implementation is complete
- **THEN** `npm test -- --runInBand` and `git diff --check` MUST pass without adding dependencies

#### Scenario: Manual AR and non-AR flows remain usable
- **WHEN** manual validation is performed with one AR-capable place and one non-AR place
- **THEN** the AR place MUST show the improved two-action layout, the non-AR place MUST show only `Como llegar`, and gallery paging, back navigation, AR entry/return, favorites, reviews, feedback and location focus behavior MUST remain usable
