# Mobile App Refactor - First Iteration Requirements

## Introduction

This document specifies the requirements for the first iteration of the mobile app refactoring effort, focusing exclusively on **HomeScreen and its direct child components**. The goal is to improve code maintainability, reduce unnecessary re-renders, eliminate duplicate logic, and establish clearer separation of concerns—while preserving all existing functionality, visual appearance, and API contracts.

This is a **scoped, practical first iteration** designed to be completed by a team in 1-2 sprints without disrupting existing features.

---

## Glossary

- **HomeScreen**: The main screen component located at `src/screens/HomeScreen/index.js`
- **Direct Child Components**: NearbyMapBlock, PlaceCard, PackageCard, HomeHeader, HomeFooter, HeroMediaBackground, NotificationPanel, SidePanel, and modal components used by HomeScreen
- **Section Components**: Logically grouped UI sections within HomeScreen (Nearby Section, Catalog Section, Packages Section, etc.)
- **Business Logic Hooks**: Reusable custom hooks that encapsulate data fetching and state management (useHomeData, useAR, useReservation, useNotifications, useVerification, useLocation)
- **Utilities**: Helper functions and constants (formatPrice, getCategoryLabel, getPlaceImages, etc.)
- **JSDoc Props**: Lightweight documentation using JSDoc comments to describe component prop types and requirements
- **Unnecessary Re-render**: A render cycle that does not result in a visual change or user interaction update (e.g., parent state change that does not affect child component props)
- **Duplicate Logic**: Identical or nearly identical code patterns repeated in two or more locations
- **Manual Verification**: Visual inspection by a developer to confirm that functionality and appearance remain unchanged after refactoring
- **Iteration Scope**: The specific files, directories, and concerns addressed in this first pass (HomeScreen + direct children only)

---

## Requirements

### Requirement 1: Extract Business Logic from HomeScreen

**User Story:** As a developer, I want the data fetching and state management logic extracted from HomeScreen into dedicated custom hooks, so that HomeScreen becomes primarily a presentation component focused on layout and user interaction.

#### Acceptance Criteria

1. WHEN the HomeScreen component is rendered, THE Business_Logic should be sourced exclusively from the Business_Logic_Hooks (useHomeData, useReservation, useNotifications, useAR, useVerification)

2. WHERE modal state management exists within HomeScreen (filtersVisible, profileVisible, agencyVisible, packageDetailVisible, showMap, etc.), THE Modal_State_Manager SHOULD consolidate repetitive modal open/close patterns into a dedicated utility or hook to reduce boilerplate

3. THE HomeScreen component SHALL contain no direct state initialization for data that belongs to a hook (e.g., places, packages, agencies, coordinates, loading flags)

4. WHEN the HomeScreen is reviewed, a developer SHOULD be able to identify the separation between data concerns (hooks) and UI concerns (component structure) within 2 minutes of reading the file

---

### Requirement 2: Break Down HomeScreen into Focused Section Components

**User Story:** As a developer, I want HomeScreen split into smaller, single-responsibility section components, so that each section can be maintained, tested, and reused independently.

#### Acceptance Criteria

1. WHERE a distinct visual section exists in HomeScreen (Nearby Section, Catalog Section, Packages Section, Footer), THE Section_Component SHALL be extracted as a separate component file in `src/screens/HomeScreen/components/`

2. WHEN each Section_Component is rendered, THE Component SHALL receive only the props it needs to function (no passing entire state trees)

3. WHERE cascading prop drilling occurs in the current implementation, THE new Section_Components SHALL eliminate that drilling by passing only necessary data

4. THE extracted Section_Components SHALL preserve all existing visual styling and interactive behavior (buttons, modals, animations, etc.)

5. WHERE a Section_Component uses display logic (e.g., useMemo for filtered lists), THE Logic SHALL remain within the Section_Component or be extracted into utilities accessible only to that section

---

### Requirement 3: Eliminate Unnecessary Re-renders in HomeScreen and NearbyMapBlock

**User Story:** As a developer, I want to identify and eliminate re-renders triggered by props or state changes that don't affect component visual output or interaction, so that the app responds faster to user interactions and scales better as data grows.

#### Acceptance Criteria

1. WHEN HomeScreen updates its parent state (e.g., panel position, notification count) AND the update does not affect NearbyMapBlock's rendered output, THE NearbyMapBlock SHOULD NOT re-render (verified via React.memo or optimization)

2. WHERE the NearbyMapBlock receives callback functions as props, THE Callbacks SHALL be wrapped with useCallback and have stable dependencies to prevent child re-renders

3. WHEN HomeScreen's ScrollView is scrolled or panels are opened/closed, THE Marketplace_Carousel (FlatList in Catalog Section) SHALL NOT re-render unless its data (displayPlaces) actually changes

4. WHERE animations or state updates occur in NearbyMapBlock (pulseAnim, carouselOpacity), THE Animated_Values SHALL not cause re-renders of sibling components (use local state, not parent state)

5. WHEN unnecessary re-renders are identified (via manual code review, temporary logging, or React DevTools Profiler where available), developers SHALL apply optimization patterns (React.memo, useCallback, useMemo) to eliminate confirmed unnecessary renders without enforcing a specific percentage target

---

### Requirement 4: Consolidate Duplicate Logic Patterns

**User Story:** As a developer, I want to identify and consolidate duplicate code patterns across HomeScreen and components, so that the codebase is easier to maintain and bugs are fixed in fewer places.

#### Acceptance Criteria

1. WHERE duplicate filter/search logic appears (e.g., category filtering, agency filtering, search text filtering), THE Logic SHALL be extracted into a reusable hook or utility function in `src/screens/HomeScreen/utils/`

2. WHEN a Place_Card or Package_Card is rendered, THE image selection, metadata formatting, and press handler patterns SHALL be identical and derived from the same set of helper functions

3. WHERE modal lifecycle management is duplicated (opening, closing, status handling), THE Pattern SHALL be abstracted into a custom hook that encapsulates the lifecycle

4. THE Duplicate_Logic_Audit SHOULD identify at least 2-3 consolidation opportunities in the current codebase and propose refactoring without breaking existing functionality

---

### Requirement 5: Improve Modal State Management Consistency

**User Story:** As a developer, I want modal state management in HomeScreen to follow a consistent, predictable pattern, so that adding new modals or maintaining existing ones is straightforward and less error-prone.

#### Acceptance Criteria

1. WHILE a modal is open, THE Modal's state (visibility, loading, data, error) SHALL be managed using a consistent pattern across all modals (ProfileModal, AgencyModal, FilterModal, PackageDetailModal, VerificationModal, ReservationModal, ArWebViewModal)

2. WHEN a modal is closed by the user or programmatically, THE Modal's internal state (form data, selection, etc.) SHALL be reset or handled consistently

3. WHERE a modal depends on data from parent (e.g., selectedAgency, selectedPackage), THE Data SHALL be passed as a prop AND clearly documented in JSDoc comments

4. THE Modal_State_Management pattern SHOULD reduce boilerplate code in HomeScreen by at least 15% (e.g., fewer repetitive useState declarations, fewer repetitive onClose handlers)

---

### Requirement 6: Add JSDoc Documentation and Prop Validation (Lightweight Approach)

**User Story:** As a developer, I want components in HomeScreen and its children to have JSDoc prop type documentation and basic runtime validation, so that the codebase is self-documenting and prop misuse is caught early.

#### Acceptance Criteria

1. WHERE the HomeScreen component is modified in this iteration, IT SHALL include JSDoc comment blocks documenting its props, navigation object, and key contracts

2. WHERE a component is extracted or significantly modified in this iteration, IT SHALL include JSDoc @param tags describing each prop's type, required status, and purpose (e.g., `@param {number} distanceKm - The search radius in kilometers`)

3. WHEN a component receives a prop of incorrect type (e.g., string instead of number), THE Component SHALL either validate and log a warning or gracefully handle the mismatch without crashing

4. WHERE complex object props are used in extracted or modified components, THE JSDoc comments SHALL include example shapes or type definitions

5. WHEN a new developer reads an extracted or modified component code, they SHOULD understand the required props and their purposes within 3-5 minutes of reading the JSDoc comments

---

### Requirement 7: Preserve All Existing Functionality, Visual Consistency, and API Contracts

**User Story:** As a product owner, I want the refactored HomeScreen to behave identically to the current implementation and maintain the same visual appearance, so that users see no disruptions and all features remain available.

#### Acceptance Criteria

1. WHEN the refactored HomeScreen is deployed, ALL existing user workflows (searching, filtering, viewing nearby places, opening modals, navigating to detail screens, making reservations) SHALL work identically to the current version

2. WHERE visual styling is applied (colors, spacing, fonts, animations), THE Styling SHALL remain unchanged with no unintended perceptual visual changes. Manual validation of visual appearance is required.

3. WHEN the app communicates with backend APIs, THE API Request/Response contracts SHALL remain unchanged (no endpoint modifications, parameter changes, or response schema alterations)

4. WHERE third-party libraries or dependencies are used (React Navigation, Expo, Reanimated, etc.), THE Usage patterns SHALL not change (no version updates, no API rewrites in this iteration)

5. WHEN manual QA testing is performed on the refactored version, a tester SHOULD NOT identify any regressions, new bugs, or unexpected behavior changes compared to the current release

---

### Requirement 8: Provide Refactoring Validation Checklist for Manual Testing

**User Story:** As a QA engineer, I want a clear, step-by-step checklist to verify that the refactoring did not introduce regressions, so that I can confidently sign off on the changes.

#### Acceptance Criteria

1. THE Validation_Checklist SHALL include at least 10-15 manual test steps covering key user workflows (search, filter, view details, reserve, navigate, interact with map)

2. WHERE the checklist references specific UI elements or interactions, THE Reference SHALL be precise enough for a QA engineer to find and execute without ambiguity

3. WHEN a QA engineer completes all checklist items and finds no issues, the Refactoring_Sign_Off SHALL proceed

4. WHERE a regression is found during manual testing, THE Issue SHALL be documented in the checklist and traced back to the refactoring change for root cause analysis

5. THE Validation_Checklist SHALL be included in the project repository at `src/screens/HomeScreen/REFACTORING_VALIDATION_CHECKLIST.md` for future reference and iteration

---

## Notes & Constraints

### Out of Scope for This Iteration

- TypeScript migration or full type coverage (JSDoc only for this iteration)
- Dependency version updates (analysis and recommendations only, no actual updates)
- Visual redesigns or pixel-perfect changes
- Accessibility audit or WCAG compliance review
- Backend API contract changes
- Navigation structure modifications
- Global service layer refactoring
- Complete app refactoring (HomeScreen focus only)

### Assumptions

- The existing codebase uses React Native + Expo
- All tests (if any) remain compatible with the refactored structure
- The team has access to profiling tools (React DevTools Profiler) to verify render optimization
- Manual testing is the primary validation method for this iteration

### Success Criteria

- All acceptance criteria for Requirements 1-8 are met
- Manual validation checklist passes with zero regressions
- Refactored code is reviewed and approved by at least one peer developer
- Total effort to complete: 1-2 sprints (80-120 developer hours estimated)

---

## Appendix: Known Code Patterns to Address

### Pattern A: Repetitive Modal Management

**Current Issue**: HomeScreen declares individual useState for each modal (filtersVisible, profileVisible, agencyVisible, etc.), each with its own open/close handlers.

**Refactoring Goal**: Consolidate into a reusable modal state management pattern (e.g., custom hook or utility).

### Pattern B: Prop Drilling in Section Components

**Current Issue**: NearbyMapBlock receives 12+ props, many passed through from hooks without intermediate filtering.

**Refactoring Goal**: Extract Section_Components to receive only necessary props, reducing drilling depth.

### Pattern C: Duplicate Formatting Functions

**Current Issue**: getPlaceImage, formatDistance, formatPrice, getCategoryLabel functions are duplicated or scattered.

**Refactoring Goal**: Centralize and deduplicate in `src/screens/HomeScreen/utils/helpers.js` with clear documentation.

### Pattern D: Animation State in NearbyMapBlock

**Current Issue**: Multiple Animated.Value instances in NearbyMapBlock are initialized and reset repeatedly, causing cascading re-renders.

**Refactoring Goal**: Use useCallback and React.memo more aggressively; consider extracting animation logic into a dedicated utility or sub-component.
