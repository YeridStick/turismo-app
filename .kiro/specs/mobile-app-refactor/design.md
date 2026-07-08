# Mobile App Refactor - Design Document

## Overview

This design document outlines the first iteration refactoring of HomeScreen and its direct child components. The focus is on improving code organization, reducing unnecessary re-renders, eliminating duplicate logic, and establishing clearer separation of concerns while preserving all existing functionality.

### Goals

- Extract business logic from HomeScreen into dedicated hooks
- Break HomeScreen into focused section components
- Eliminate unnecessary re-renders in HomeScreen and NearbyMapBlock
- Consolidate duplicate logic patterns
- Improve modal state management consistency
- Add lightweight JSDoc documentation

### Design Principles

- Incremental: Small, independently testable phases
- Safe: No breaking changes; preserve all functionality
- Practical: Avoid over-engineering
- Manual-first: Validation through manual testing, not automated

---

## Folder Structure & File Organization

### Current State

```
src/screens/HomeScreen/
├── index.js                    # Main HomeScreen component (~650 lines)
├── components/
│   ├── HeroMediaBackground.jsx
│   ├── HomeHeader.jsx
│   ├── HomeFooter.jsx
│   ├── NearbyMapBlock.jsx      # Interactive map component
│   ├── NotificationPanel.jsx
│   ├── PlaceCard.jsx
│   ├── PackageCard.jsx
│   ├── SidePanel.jsx
│   └── modals/                 # Modal components
├── hooks/
│   ├── useHomeData.js          # Data fetching & places/packages/agencies state
│   ├── useReservation.js       # Reservation form & submission logic
│   ├── useNotifications.js     # Notification state & subscriptions
│   ├── useAR.js                # AR modal state & HTML generation
│   └── useVerification.js      # Email verification state & token handling
├── utils/
│   ├── constants.js            # Colors, dimensions, defaults
│   └── helpers.js              # Formatting & image selection functions
└── styles/
    └── index.js                # StyleSheet definitions
```

### Proposed New Structure

```
src/screens/HomeScreen/
├── index.js                    # Refactored HomeScreen (primary layout coordinator)
├── components/
│   ├── sections/               # NEW: Section components
│   │   ├── NearbySection.jsx   # Map, carousel, distance toggle
│   │   ├── CatalogSection.jsx  # Places carousel with category filters
│   │   ├── PackagesSection.jsx # Agencies + packages with filtering
│   │   └── FooterSection.jsx   # Footer with image carousel
│   ├── HeroMediaBackground.jsx
│   ├── HomeHeader.jsx
│   ├── HomeFooter.jsx
│   ├── NearbyMapBlock.jsx      # Optimized with React.memo, useCallback
│   ├── NotificationPanel.jsx
│   ├── PlaceCard.jsx
│   ├── PackageCard.jsx
│   ├── SidePanel.jsx
│   └── modals/                 # Unchanged structure
├── hooks/
│   ├── useHomeData.js          # Existing
│   ├── useReservation.js       # Existing
│   ├── useNotifications.js     # Existing
│   ├── useAR.js                # Existing
│   ├── useVerification.js      # Existing
│   ├── useModalState.js        # NEW: Centralized modal state
│   └── useFilterLogic.js       # NEW: Shared filter/search logic
├── utils/
│   ├── constants.js            # Existing
│   ├── helpers.js              # Existing + consolidated duplicates
│   ├── filterHelpers.js        # NEW: Category, agency, search filters
│   ├── imageHelpers.js         # NEW: Deduplicated image selection
│   └── modalHelpers.js         # NEW: Modal lifecycle utilities
└── styles/
    └── index.js                # Existing
```

### File Naming Conventions

- **Section Components**: `[SectionName]Section.jsx` (e.g., `NearbySection.jsx`)
- **Custom Hooks**: `use[PurposeOrState].js` (e.g., `useModalState.js`)
- **Utility Files**: Descriptive names matching their purpose (e.g., `filterHelpers.js`)
- **Constants**: All-caps for constant values, organized by category
- **Components**: PascalCase for component names, align with React conventions

---

## Suggested Custom Hooks for Logic Extraction

### Existing Hooks (No Changes)

- **useHomeData**: Fetches places, packages, agencies; manages search/filter state
- **useReservation**: Handles reservation form and submission workflow
- **useNotifications**: Manages notification subscriptions and read state
- **useAR**: Manages AR modal state and HTML generation
- **useVerification**: Manages email verification state and token flow

### New Hooks

#### 1. useModalState (NEW)

**Purpose**: Centralize modal open/close state management to eliminate boilerplate

**Responsibilities**:
- Track which modal is currently open (single modal active at a time OR independent modals)
- Provide open/close handlers with optional data passing
- Reset modal state on close
- Manage modal transitions and z-index

**Proposed Implementation**:

```javascript
const useModalState = () => {
  const [modals, setModals] = useState({
    profile: false,
    filter: false,
    agency: false,
    packageDetail: false,
    verification: false,
    reservation: false,
    ar: false,
  });
  
  const [modalData, setModalDataState] = useState({
    selectedAgency: null,
    selectedPackage: null,
  });
  
  const openModal = useCallback((name, data = null) => {
    setModals(prev => ({ ...prev, [name]: true }));
    if (data) {
      setModalDataState(prev => ({ ...prev, ...data }));
    }
  }, []);
  
  const closeModal = useCallback((name, resetData = true) => {
    setModals(prev => ({ ...prev, [name]: false }));
    if (resetData) {
      if (name === 'agency') setModalDataState(prev => ({ ...prev, selectedAgency: null }));
      if (name === 'packageDetail') setModalDataState(prev => ({ ...prev, selectedPackage: null }));
    }
  }, []);

  const updateModalData = useCallback((updates) => {
    setModalDataState(prev => ({ ...prev, ...updates }));
  }, []);

  return { modals, modalData, openModal, closeModal, updateModalData };
};
```

**Integration Point**: Replace 7 individual useState declarations in HomeScreen

**Benefits**: Reduces HomeScreen useState count from 10+ to 2-3, consistent modal lifecycle


#### 2. useFilterLogic (NEW)

**Purpose**: Consolidate duplicate category, agency, and search filtering logic

**Responsibilities**:
- Manage active filters (category, distance, agency, search query)
- Compute filtered results from source data
- Reset filters to defaults
- Provide filter change handlers

**Proposed Implementation**:

```javascript
const useFilterLogic = (sourceData) => {
  const [filters, setFilters] = useState({
    category: 'todos',
    distanceKm: 5,
    agencyFilter: null,
    searchQuery: '',
  });
  
  const filteredResults = useMemo(() => {
    let results = sourceData;
    if (filters.category !== 'todos') {
      results = results.filter(item => item.category === filters.category);
    }
    if (filters.searchQuery) {
      results = results.filter(item =>
        item.name.toLowerCase().includes(filters.searchQuery.toLowerCase())
      );
    }
    if (filters.agencyFilter) {
      results = results.filter(item => item.agencyId === filters.agencyFilter.id);
    }
    return results;
  }, [sourceData, filters]);
  
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const resetFilters = () => {
    setFilters({ category: 'todos', distanceKm: 5, agencyFilter: null, searchQuery: '' });
  };
  
  return { filters, filteredResults, updateFilter, resetFilters };
};
```

**Integration Point**: Used in CatalogSection and PackagesSection to replace inline filter logic

**Benefits**: DRY filtering logic, reusable across sections, easier to add new filters


### Hook Dependencies

```
HomeScreen
├── useHomeData (existing)
├── useReservation (existing)
├── useNotifications (existing)
├── useAR (existing)
├── useVerification (existing)
├── useModalState (new)
└── [Individual sections]
    ├── NearbySection
    │   └── (inherits coords, nearby, distanceKm from parent)
    ├── CatalogSection
    │   └── useFilterLogic (for category/search)
    └── PackagesSection
        └── useFilterLogic (for agency/search)
```

---

## Proposed Section Components



### 1. NearbySection Component

**File**: `src/screens/HomeScreen/components/sections/NearbySection.jsx`

**Purpose**: Encapsulate map, carousel, and distance control UI

**Props**:
```javascript
/**
 * @component NearbySection - Displays nearby places map and carousel
 * @param {Object} coords - User location { latitude, longitude }
 * @param {Array} nearby - Nearby places array
 * @param {number} distanceKm - Current search radius
 * @param {boolean} mapGestureLocked - Map gesture lock state
 * @param {boolean} isInteractingWithMap - Active map interaction
 * @param {Function} onMapTouchStart - Called when user touches map
 * @param {Function} onMapTouchEnd - Called when user stops touching map
 * @param {Function} onToggleMapGestureLock - Toggle gesture lock
 * @param {Function} onUnlockMapGesture - Explicitly unlock map
 * @param {Function} onPlacePress - Navigate to place detail
 * @param {Function} onArPress - Open AR viewer
 * @param {Function} onIncreaseRadius - Increase search distance
 * @param {Function} onReloadNearby - Reload nearby data
 * @param {Function} getTopPlaceMeta - Get metadata (rating, distance) for place
 * @param {boolean} loadingNearby - Loading state
 * @param {boolean} pauseMapUpdates - Pause map updates when panels open
 */
```

**Responsibilities**:
- Render section header with icon and title
- Render NearbyMapBlock with all props
- Handle touch gestures for map/carousel transitions
- Manage local animation state (pulse, carousel opacity) using useRef

**Local State Details**: 
- NearbyMapBlock keeps all its animation state (pulseAnim, carouselOpacity) local using useRef
- These animations affect ONLY the NearbyMapBlock's internal rendering (pulse badge, carousel fade)
- They do NOT affect HomeScreen or sibling components
- This keeps NearbyMapBlock self-contained and prevents animation state from cascading upward
- Animations remain non-blocking and performant


### 2. CatalogSection Component

**File**: `src/screens/HomeScreen/components/sections/CatalogSection.jsx`

**Purpose**: Display places carousel with category filters and search results

**Props**:
```javascript
/**
 * @component CatalogSection - Displays places catalog with filters
 * @param {Array} places - All available places
 * @param {Array} displayPlaces - Filtered places to display
 * @param {Array} categories - Available category options
 * @param {string} selectedCategory - Active category
 * @param {string} searchQuery - Current search text
 * @param {number} allPlacesPage - Pagination cursor
 * @param {boolean} hasMorePlaces - More pages available
 * @param {boolean} loadingMorePlaces - Loading state for pagination
 * @param {string} catalogBannerImageUri - Banner image
 * @param {Function} onCategoryChange - Category filter changed
 * @param {Function} onSearchChange - Search text changed
 * @param {Function} onPlacePress - Place card clicked
 * @param {Function} onArPress - AR button clicked
 * @param {Function} onLoadMore - Load next page
 * @param {Function} getTopPlaceMeta - Get metadata (rating, distance)
 * @param {Function} getPlaceImages - Get place image URIs
 */
```

**Responsibilities**:
- Render banner image section with inspirational text
- Render section header with icon and title
- Render FlatList carousel of PlaceCards
- Handle "Load More" pagination
- Pass filtered displayPlaces to carousel


### 3. PackagesSection Component

**File**: `src/screens/HomeScreen/components/sections/PackagesSection.jsx`

**Purpose**: Display agencies and packages with filtering capability

**Props**: (Too many to list fully - see code template)

**Responsibilities**:
- Render agencies filter carousel with search input
- Render packages list/carousel below agencies
- Handle agency selection and filtering
- Show empty states for errors or no data
- Manage pagination for both agencies and packages
- Render banner image section


### 4. FooterSection Component

**File**: `src/screens/HomeScreen/components/sections/FooterSection.jsx`

**Purpose**: Render HomeFooter with image carousel

**Props**:
```javascript
/**
 * @component FooterSection
 * @param {Array<string>} imageUris - 3 footer image URIs
 */
```

**Responsibilities**:
- Render HomeFooter component as-is
- Add bottom spacing

---

## Utility Functions for Duplicate Logic

### Duplicate Patterns Identified

**Pattern A**: Image Selection
- Current: `getPlaceImage(item)` scattered across multiple files
- Duplication: Used in PlaceCard, NearbyMapBlock, CatalogSection
- Solution: Consolidate in `utils/imageHelpers.js`

**Pattern B**: Metadata Formatting
- Current: `getTopPlaceMeta(item)` called repeatedly in HomeScreen
- Used in: PlaceCard renders, NearbyMapBlock carousel, SidePanel
- Solution: Keep centralized but ensure no re-computation (memoize selectively)

**Pattern C**: Modal Lifecycle
- Current: Individual `useState` for each modal with separate open/close handlers
- Solution: `useModalState` hook + helper functions in `utils/modalHelpers.js`

**Pattern D**: Filter/Search Logic
- Current: Inline `useMemo` for displayPlaces filtering, agency filtering
- Solution: Extract to `useFilterLogic` hook + utilities in `utils/filterHelpers.js`

### New Utility Files

#### 1. utils/imageHelpers.js

```javascript
/**
 * Get primary image URI for a place, with fallback
 * @param {Object} item - Place or package object
 * @param {string} fallback - Fallback image URI
 * @returns {string} Image URI
 */
export const getPlaceImage = (item, fallback = DEFAULT_PLACE_IMAGE) => {
  if (!item) return fallback;
  return item.image || item.thumbnail || fallback;
};

/**
 * Get all image URIs from place for hero image pool
 * @param {Object} item - Place object
 * @returns {Array<string>} Array of image URIs
 */
export const getPlaceImages = (item) => {
  if (!item) return [];
  const images = [item.image, item.thumbnail, item.heroImage].filter(Boolean);
  return images;
};

/**
 * Get video URI for a place if available
 * @param {Object} item - Place object
 * @returns {string|null} Video URI or null
 */
export const getPlaceVideo = (item) => {
  return item?.videoUrl || item?.video || null;
};

/**
 * Get package image with category-based fallback
 * @param {Object} pkg - Package object
 * @returns {string} Image URI
 */
export const getPackageImage = (pkg) => {
  return pkg?.image || DEFAULT_PACKAGE_IMAGE;
};

/**
 * Get gradient colors for package card based on category
 * @param {Object} pkg - Package object
 * @returns {Array<string>} [startColor, endColor]
 */
export const getPackageGradient = (pkg) => {
  const categoryGradients = {
    adventure: ['#FF6B6B', '#FF8E72'],
    cultural: ['#4ECDC4', '#44A08D'],
    relax: ['#95E1D3', '#F38181'],
  };
  return categoryGradients[pkg?.category] || ['#0E7490', '#06B6D4'];
};
```

#### 2. utils/filterHelpers.js

```javascript
/**
 * Filter places by category
 * @param {Array} places - Places to filter
 * @param {string} category - Category filter (or 'todos' for all)
 * @returns {Array} Filtered places
 */
export const filterByCategory = (places, category) => {
  if (category === 'todos') return places;
  return places.filter(p => p.category === category);
};

/**
 * Filter items by search query
 * @param {Array} items - Items to search
 * @param {string} query - Search text
 * @returns {Array} Matching items
 */
export const filterBySearchQuery = (items, query) => {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter(item =>
    (item.name || '').toLowerCase().includes(q) ||
    (item.description || '').toLowerCase().includes(q)
  );
};

/**
 * Filter items by agency
 * @param {Array} items - Packages or places
 * @param {Object} agency - Selected agency filter
 * @returns {Array} Filtered items
 */
export const filterByAgency = (items, agency) => {
  if (!agency) return items;
  return items.filter(item => item.agencyId === agency.id);
};
```

#### 3. utils/modalHelpers.js

```javascript
/**
 * Create initial modal state object
 * @returns {Object} Modal state with all modals set to false
 */
export const createInitialModalState = () => ({
  profile: false,
  filter: false,
  agency: false,
  packageDetail: false,
  verification: false,
  reservation: false,
  ar: false,
});

/**
 * Create initial modal data object
 * @returns {Object} Modal data (selected items, form state)
 */
export const createInitialModalData = () => ({
  selectedAgency: null,
  selectedPackage: null,
});

/**
 * Helper to open modal with logging (for debugging)
 * @param {string} modalName - Modal to open
 * @param {Object} currentState - Current modal state
 * @returns {Object} Updated modal state
 */
export const toggleModal = (modalName, currentState) => ({
  ...currentState,
  [modalName]: !currentState[modalName],
});
```

---

## NearbyMapBlock Optimization Strategy

### Current Issues

1. **Unnecessary Re-renders**: Entire component re-renders when parent HomeScreen re-renders, even if `nearby` data unchanged
2. **Prop Drilling**: 12+ props passed to component, many not directly used
3. **Animation State Cascading**: Pulse and carousel opacity animations trigger parent re-renders
4. **Callback Stability**: Inline callbacks passed from parent cause child comparison failures

### Optimization Techniques

#### 1. React.memo Wrapper (Start Simple, Profile Later)

**Current**: `export default NearbyMapBlock;`

**Initial Optimization**:
```javascript
export default React.memo(NearbyMapBlock);
```

**Implementation Order**:
1. First: Apply React.memo(NearbyMapBlock) with STANDARD shallow comparison
2. Next: Add useCallback to all callbacks in HomeScreen
3. Then: Add useMemo to data props (coords, nearby)
4. Test: Use React DevTools Profiler to check if NearbyMapBlock still re-renders unnecessarily
5. ONLY IF profiler shows problems: Consider custom comparison function

**Do NOT implement custom comparison in Phase 4**. Leave it as future optimization only.

**Strategy**: Start with standard React.memo (shallow comparison). If React DevTools Profiler shows NearbyMapBlock still re-renders unnecessarily after useCallback/useMemo optimization, THEN consider custom comparison.

**Why defer custom comparison**: This avoids premature optimization. Shallow comparison combined with callback stabilization often eliminates unwanted re-renders.

**If profiling later shows remaining issues**, then add custom comparison:
```javascript
export default React.memo(NearbyMapBlock, (prevProps, nextProps) => {
  // Only re-render if these key props change
  return (
    prevProps.coords === nextProps.coords &&
    prevProps.filteredNearby === nextProps.filteredNearby &&
    prevProps.distanceKm === nextProps.distanceKm &&
    prevProps.mapGestureLocked === nextProps.mapGestureLocked &&
    prevProps.isInteractingWithMap === nextProps.isInteractingWithMap &&
    prevProps.loadingNearby === nextProps.loadingNearby &&
    prevProps.pauseMapUpdates === nextProps.pauseMapUpdates
  );
});
```

**Rationale**: Shallow comparison is simpler and more maintainable. Custom comparison is a fallback for edge cases.

#### 2. useCallback for All Callbacks

**Current**:
```javascript
const handleTouchEnd = useCallback(..., [mapGestureLocked, onMapTouchEnd, onToggleMapGestureLock]);
```

**Issue**: Dependencies array includes `onMapTouchEnd` and `onToggleMapGestureLock` which are recreated on every parent render

**Solution**: In HomeScreen, wrap all callbacks passed to NearbyMapBlock with useCallback:
```javascript
const handleMapTouchStart = useCallback(() => {
  setIsInteractingWithMap(true);
}, []);

const handleMapTouchEnd = useCallback(() => {
  setIsInteractingWithMap(false);
}, []);

const toggleMapGestureLock = useCallback(() => {
  setMapGestureLocked(prev => !prev);
}, []);
```

#### 3. Animated Values Stay Local

**Current**: Animations might trigger parent re-renders if not properly isolated

**Solution**: Keep pulseAnim and carouselOpacity as local refs in NearbyMapBlock; do NOT expose to parent

#### 4. Memoize Data Arrays

**In HomeScreen, before passing to NearbyMapBlock**:
```javascript
const memoizedNearby = useMemo(() => nearby, [nearby]);
const memoizedCoords = useMemo(() => coords, [coords]);

<NearbyMapBlock
  coords={memoizedCoords}
  filteredNearby={memoizedNearby}
  // ... other props
/>
```

#### 5. Prevent Sibling Re-renders During Map Interaction

**Strategy**: When map is locked (mapGestureLocked = true), prevent HomeScreen's ScrollView and other sections from re-rendering

**Implementation**:
```javascript
// In HomeScreen
const isMapLocked = mapGestureLocked;
const shouldFreezeScrollView = isMapLocked || panelMotionCount > 0;

<ScrollView
  scrollEnabled={!shouldFreezeScrollView}
  // Don't trigger re-renders of FlatLists while map is locked
  // Use shouldComponentUpdate or memoization on sibling components
/>
```

---

## Modal State Management Strategy

### Current Issue

HomeScreen declares 7+ individual `useState` hooks for modals:
```javascript
const [filtersVisible, setFiltersVisible] = useState(false);
const [profileVisible, setProfileVisible] = useState(false);
const [agencyVisible, setAgencyVisible] = useState(false);
const [packageDetailVisible, setPackageDetailVisible] = useState(false);
const [showMap, setShowMap] = useState(false);
const [selectedAgency, setSelectedAgency] = useState(null);
const [selectedPackage, setSelectedPackage] = useState(null);
```

This creates:
- Repetitive open/close handler patterns
- Inconsistent state lifecycle (some reset data on close, some don't)
- Difficulty adding new modals without duplicating pattern
- Large HomeScreen surface area

---

## Modal Activation Pattern (First Iteration)

**Pattern**: Each modal is independent. Multiple modals CAN be open simultaneously IF the UI supports stacking.

**Current Behavior**: Looking at HomeScreen, modals are typically opened one at a time:
- ProfileModal, AgencyModal, FilterModal, VerificationModal are rarely open together
- ReservationModal and VerificationModal can open together (verification before reservation)
- AR modal is always standalone
- These are separate workflows, not simultaneous

**Implementation**: useModalState allows independent modal states. Do NOT enforce mutual exclusion in code. Let natural UI flow handle it.

**For Phase 2 (first iteration)**: Implement as independent modals. If future work identifies need for exclusive modals, add that constraint later.

**Validation**: 
- Test that closing one modal does not close others
- Test that workflows still work as-is (filter, profile, agency modals open/close as before)
- Test that reservation workflow still requires verification modal first

---

## Modal State Management Solution

### Proposed Solution: useModalState Hook

**Hook (new file)**:
```javascript
// hooks/useModalState.js
import { useState, useCallback } from 'react';
import { createInitialModalState, createInitialModalData } from '../utils/modalHelpers';

export const useModalState = () => {
  const [modals, setModals] = useState(createInitialModalState());
  const [modalData, setModalDataState] = useState(createInitialModalData());

  const openModal = useCallback((name, data = null) => {
    setModals(prev => ({ ...prev, [name]: true }));
    if (data) {
      setModalDataState(prev => ({ ...prev, ...data }));
    }
  }, []);

  const closeModal = useCallback((name, resetData = true) => {
    setModals(prev => ({ ...prev, [name]: false }));
    if (resetData) {
      if (name === 'agency') {
        setModalDataState(prev => ({ ...prev, selectedAgency: null }));
      } else if (name === 'packageDetail') {
        setModalDataState(prev => ({ ...prev, selectedPackage: null }));
      }
    }
  }, []);

  const updateModalData = useCallback((updates) => {
    setModalDataState(prev => ({ ...prev, ...updates }));
  }, []);

  return { modals, modalData, openModal, closeModal, updateModalData };
};
```

**Integration in HomeScreen**:
```javascript
const { modals, modalData, openModal, closeModal } = useModalState();

// Usage:
<ProfileModal
  visible={modals.profile}
  onClose={() => closeModal('profile')}
  // ...
/>

<AgencyModal
  visible={modals.agency}
  agency={modalData.selectedAgency}
  onClose={() => closeModal('agency')}
  // ...
/>

// Open with data:
const openAgency = useCallback((agency) => {
  openModal('agency', { selectedAgency: agency });
}, [openModal]);
```

**Benefits**:
- Reduces HomeScreen useState count from 7 to 1
- Consistent lifecycle pattern
- Easy to add new modals
- Centralizes modal logic

---

## Technical Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Breaking modal workflows during hook consolidation | High: User cannot open/close modals correctly | Implement useModalState in isolation first; test all modal transitions before integrating into HomeScreen |
| Re-render loops from memoization mistakes | High: App becomes slow or unresponsive | Use React DevTools Profiler to verify no unnecessary renders; test with large datasets |
| Animation state loses smoothness after optimization | Medium: Visual regression | Maintain test APK with before/after comparison; test on real devices |
| Section component prop interfaces change unexpectedly | Medium: Components break | Use JSDoc @param validation; create test wrapper that verifies prop types |
| NearbyMapBlock becomes rigid after React.memo | Low: Hard to add features later | Document custom comparison logic; keep comparison function as separate function for clarity |

---

## Incremental Migration Plan

### Phase 1: Modal State Infrastructure (1 sprint, 10-12 hours)

**Objective**: Create modal state utilities and hook without changing HomeScreen yet

**Tasks**:
1. Create `utils/modalHelpers.js` - Helper functions only (createInitialModalState, createInitialModalData)
2. Create `hooks/useModalState.js` - The modal state hook
3. Verify hook works in isolation with mock data
4. Test hook initialization and state transitions

**Files Modified/Created**:
- (NEW) `utils/modalHelpers.js`
- (NEW) `hooks/useModalState.js`

**Manual Validation**:
- Import new utilities in HomeScreen and verify no import errors
- Manually test modal state hook in a test component
- Verify all existing imports still work

**Note**: Image helpers, filter helpers, and useFilterLogic are deferred to Phase 3 when extracting sections that need them. This keeps Phase 1 focused and fast (10-12 hours instead of 20-25).

---

### Phase 2: HomeScreen Modal State Refactoring (1 sprint, 20-25 hours)

**Objective**: Replace HomeScreen's 7 useState declarations with useModalState hook

**Tasks**:
1. Replace individual modal useState with useModalState hook
2. Update all modal open/close handlers to use openModal/closeModal
3. Replace modal visibility props with modals[name]
4. Replace selectedAgency/selectedPackage useState with modalData
5. Test all modal transitions manually

**Files Modified**:
- (MODIFY) `index.js` (HomeScreen)

**Manual Validation**:
- Open each of 7 modals individually
- Close each modal by clicking close button
- Open one modal, then open another (verify first closes)
- Verify modal data (selectedAgency, selectedPackage) persists correctly
- Test navigation from modal (e.g., navigate to details from modal)

---

### Phase 3: Extract Section Components (1-2 sprints, 25-30 hours)

**Objective**: Break HomeScreen into NearbySection, CatalogSection, PackagesSection, FooterSection

**Tasks**:
1. Create `components/sections/` directory
2. Extract NearbySection (move map, carousel, distance controls)
3. Extract CatalogSection (move places carousel, filters, banner)
4. Extract PackagesSection (move agencies, packages, filters, banner)
5. Extract FooterSection (move footer)
6. Pass required props to each section from HomeScreen
7. Test each section rendering and interaction

**Files Created**:
- (NEW) `components/sections/NearbySection.jsx`
- (NEW) `components/sections/CatalogSection.jsx`
- (NEW) `components/sections/PackagesSection.jsx`
- (NEW) `components/sections/FooterSection.jsx`

**Files Modified**:
- (MODIFY) `index.js` (HomeScreen now primarily coordinates sections)

**Manual Validation**:
- Each section renders without visual changes
- All interactions within each section work (filters, carousel scroll, buttons)
- Modals still open/close correctly
- Navigation from cards still works

---

### Phase 4: Optimize NearbyMapBlock (1 sprint, 15-20 hours)

**Objective**: Add React.memo, useCallback, and optimize prop passing to reduce re-renders

**Tasks**:
1. Wrap NearbyMapBlock with React.memo (standard shallow comparison)
2. Add useCallback to all callbacks in HomeScreen before passing to NearbyMapBlock
3. Add useMemo to coord and nearby data in HomeScreen
4. Test with React DevTools Profiler to verify reduced re-renders
5. Verify animations still smooth on real device
6. Profile with React DevTools; document findings for future custom comparison if needed

**Files Modified**:
- (MODIFY) `index.js` (add useCallback, useMemo for props)
- (MODIFY) `components/NearbyMapBlock.jsx` (React.memo)

**Manual Validation**:
- Open map, lock it, verify carousel fades smoothly
- Scroll HomeScreen while map locked; verify map doesn't re-render
- Open side panel while viewing map; verify smooth transition
- Test on device with Profiler if available (Flipper or React DevTools)

---

### Phase 5: Add JSDoc Documentation (1 sprint, 10-15 hours)

**Objective**: Add JSDoc @param and @returns tags to all modified/new components and hooks

**Tasks**:
1. Add JSDoc to NearbySection, CatalogSection, PackagesSection, FooterSection
2. Add JSDoc to useModalState, useFilterLogic
3. Add JSDoc to HomeScreen highlighting new structure
4. Add JSDoc to utility functions
5. Verify JSDoc syntax with IDE linter

**Files Modified**:
- (MODIFY) All modified components and hooks with JSDoc

**Manual Validation**:
- Hover over components in IDE and verify JSDoc tooltips appear
- Check linter has no JSDoc warnings

---

## Design Guardrails (Safety First)

1. **No Backend Changes**: API contracts remain identical. No endpoint modifications.
2. **No Visual Changes**: UI appearance and behavior identical to current implementation.
3. **No Global Service Changes**: Only HomeScreen and direct children refactored.
4. **No New Error Handling Patterns**: Existing error handling preserved.
5. **No Automated Testing Required**: Manual validation is sufficient for this iteration.
6. **Reversible Changes**: Each phase can be reverted without cascading failures.
7. **Incremental Deployment**: Each phase is independently deployable.

If any change violates these guardrails, it is OUT OF SCOPE and deferred to future iteration.

---

## Manual Validation Required Per Phase

### Phase 1 Validation Checklist

- [ ] Create `utils/modalHelpers.js`; verify file imports with no syntax errors
- [ ] Create `hooks/useModalState.js`; verify file imports with no syntax errors
- [ ] Import useModalState in a test component; no errors
- [ ] Call `useModalState()` in test component; state initializes correctly
- [ ] Verify `modals` object has all 7 modal keys (profile, filter, agency, etc.)
- [ ] Verify `modalData` object has selectedAgency and selectedPackage
- [ ] Call `openModal('profile')` and verify modals.profile = true
- [ ] Call `closeModal('profile')` and verify modals.profile = false
- [ ] Call `updateModalData({ selectedAgency: testAgency })` and verify state updated
- [ ] All existing HomeScreen imports still work (no breaking changes)

### Phase 2 Validation Checklist

- [ ] Open ProfileModal by clicking profile icon; modal appears
- [ ] Close ProfileModal by clicking X button; modal disappears
- [ ] Open FilterModal by clicking filter icon; modal appears with selected filters
- [ ] Change filter in modal and apply; modal closes and filter applied
- [ ] Click on agency in Packages section; AgencyModal opens with correct agency data
- [ ] Close AgencyModal; agency data cleared in state
- [ ] Open reservation modal; form appears
- [ ] Verification modal opens from profile menu; shows email verification UI
- [ ] AR modal opens from PlaceCard AR button; WebView shows AR content
- [ ] Open ProfileModal, then open AgencyModal; verify both can be displayed independently if UI allows, OR verify AgencyModal opens and ProfileModal closes based on current UI flow
- [ ] Verify that closing one modal (e.g., AgencyModal) does not affect other modals' state (e.g., ProfileModal remains unchanged if open)
- [ ] All existing routes still navigate correctly

### Phase 3 Validation Checklist

- [ ] NearbySection renders with map and carousel visible
- [ ] Map interaction still works (touch, lock/unlock, carousel updates)
- [ ] CatalogSection carousel scrolls smoothly
- [ ] Category filters in header still work
- [ ] Search still works across places
- [ ] PackagesSection agencies carousel scrolls
- [ ] Agency filter toggles packages correctly
- [ ] Package load more pagination works
- [ ] FooterSection appears with images at bottom
- [ ] All scroll positions maintained as user scrolls HomeScreen
- [ ] No visual regression (compare before/after screenshots)

### Phase 4 Validation Checklist

- [ ] Open map, lock it with double-tap
- [ ] Verify carousel fades (opacity animation smooth)
- [ ] Verify lock badge pulse animation continues
- [ ] Unlock map by clicking lock badge
- [ ] Verify carousel opacity returns to full (smooth)
- [ ] Scroll HomeScreen while map locked; verify map doesn't jitter or re-render
- [ ] Open side panel while map locked; verify smooth side panel animation
- [ ] Open notification panel; verify panels don't overlap visually
- [ ] Test on iOS and Android devices to verify animation smoothness

### Phase 5 Validation Checklist

- [ ] Open IDE and hover over NearbySection component
- [ ] Verify JSDoc tooltip shows @param props and descriptions
- [ ] Verify @returns tag is present
- [ ] Check HomeScreen JSDoc explains new structure
- [ ] Linter shows no JSDoc warnings

---

## Files Likely to Be Modified/Created

| File | Type | Description |
|------|------|-------------|
| `index.js` | MODIFY | Refactor to use useModalState, section components, optimized callbacks |
| `utils/imageHelpers.js` | NEW | Centralized image selection and formatting |
| `utils/filterHelpers.js` | NEW | Shared filtering logic for categories, agencies, search |
| `utils/modalHelpers.js` | NEW | Modal state initialization and helper functions |
| `hooks/useModalState.js` | NEW | Centralized modal state management hook |
| `hooks/useFilterLogic.js` | NEW | Reusable filtering hook with memoization |
| `components/sections/NearbySection.jsx` | NEW | Extracted nearby map + carousel section |
| `components/sections/CatalogSection.jsx` | NEW | Extracted places catalog section |
| `components/sections/PackagesSection.jsx` | NEW | Extracted packages + agencies section |
| `components/sections/FooterSection.jsx` | NEW | Extracted footer section |
| `components/NearbyMapBlock.jsx` | MODIFY | Add React.memo, optimize animations |
| `components/PlaceCard.jsx` | REFERENCE | No changes; used by sections |
| `components/PackageCard.jsx` | REFERENCE | No changes; used by sections |
| `hooks/useHomeData.js` | REFERENCE | No changes; data layer stays the same |
| `hooks/useReservation.js` | REFERENCE | No changes |
| `hooks/useNotifications.js` | REFERENCE | No changes |
| `hooks/useAR.js` | REFERENCE | No changes |
| `hooks/useVerification.js` | REFERENCE | No changes |

---

## Error Handling Strategy

### During Refactoring

1. **Modal Hook Errors**: If openModal/closeModal fail, HomeScreen logs warning and continues
2. **Utility Errors**: If image/filter utilities fail, fallback values are used
3. **Section Component Errors**: If section fails to render, use existing error handling (console.error). Do not add ErrorBoundary as it would change visual behavior.
4. **Props Validation**: Log warnings if expected props are missing, don't crash

### For Production

1. **Modal State Consistency**: Validate modalData shapes match expectations
2. **Filter Application**: Graceful fallback if filter logic produces empty results
3. **Image Loading**: Use default images if URIs fail
4. **Animation Failures**: Animations are non-blocking; if they fail, UI still works

---

## Testing Strategy

### Manual Testing (Primary for This Iteration)

- **Visual Regression**: Screenshot before/after on multiple screen sizes
- **Functional Testing**: Run through all user workflows (search, filter, reserve, navigate)
- **Performance Testing**: Use React DevTools Profiler to verify reduced re-renders
- **Mobile Device Testing**: Test on iOS and Android devices to verify animations

### Code Review Checkpoints

1. **Phase 1**: Review utility and hook implementations; verify no side effects
2. **Phase 2**: Review HomeScreen modal state usage; verify no state leaks
3. **Phase 3**: Review section component prop interfaces; verify clear contracts
4. **Phase 4**: Review memo and callback optimizations; verify safe comparisons
5. **Phase 5**: Review JSDoc coverage; verify clarity and completeness

---

## Rollback Plan

If critical regressions occur:

1. **Identify phase** where regression was introduced
2. **Revert commits** for that phase (git revert)
3. **Restore previous backup** of relevant component files
4. **Communicate** regression to team; schedule retrospective
5. **Address root cause** before re-attempting phase

**Safety nets**:
- Each phase is independently deployable; can skip problematic phases
- Manual validation checkpoints prevent broken code from reaching production
- Git history preserved for easy rollback

---

## Success Criteria (First Iteration Only)

✓ Phase 1 and Phase 2 complete and deployed
✓ Modal state hook (useModalState) working correctly
✓ HomeScreen useState count reduced from 10+ to 1 (modals + modalData only)
✓ All 7 modal workflows functional (profile, filter, agency, reservation, verification, AR, packageDetail)
✓ Modal data persists correctly (selectedAgency, selectedPackage)
✓ Modal data clears appropriately when modals close
✓ All existing user workflows still work identically
✓ Visual appearance unchanged
✓ Manual validation checklist passes with zero regressions
✓ Code reviewed and approved by peer developer

Note: Section component extraction (Phase 3+) and NearbyMapBlock optimization (Phase 4+) are FUTURE WORK, not part of this first iteration scope.

---

## Timeline & Effort Estimate (First Iteration)

**FIRST ITERATION (MANDATORY - 1-2 sprints, 40-50 hours):**

- **Phase 1**: Modal State Infrastructure (10-12 hours)
- **Phase 2**: HomeScreen Modal Refactoring (30-35 hours)

These are the ONLY phases included in this spec's scope.

**FUTURE ITERATIONS (OPTIONAL - out of scope, deferred):**

- **Phase 3**: Section Component Extraction (25-30 hours)
- **Phase 4**: NearbyMapBlock Optimization (15-20 hours) — includes React.memo with standard comparison; custom comparison only if profiling shows need
- **Phase 5**: JSDoc Documentation (10-15 hours)

These phases MAY be pursued after Phase 1-2 are complete and validated, but are NOT part of this first iteration.

**Total for all iterations**: 90-125 hours

**Team Size**: 1-2 developers
**Release Strategy**: Phase-by-phase with manual validation between releases
