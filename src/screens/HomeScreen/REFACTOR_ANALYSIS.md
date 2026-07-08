# Phase 2.1: HomeScreen Modal State Analysis

**Date**: Analysis conducted during Phase 2 refactoring preparation
**Purpose**: Document current modal state structure before refactoring to centralized useModalState hook
**Next Steps**: Reference this document during P2.2-P2.4 implementation

---

## Summary

HomeScreen currently manages **7 distinct modals** across **10+ useState declarations**. Modal visibility and data are distributed across independent state variables with inconsistent patterns for opening, closing, and resetting data. This analysis documents the current state before consolidation into the useModalState hook.

---

## 1. Modal Visibility State Variables (useState for Visibility)

All located in HomeScreen/index.js lines 183-191:

| Line | Variable | Type | Initial | Associated Modal | Current Usage |
|------|----------|------|---------|-------------------|---------------|
| 183 | `filtersVisible` | boolean | `false` | FilterModal | Opens via HomeHeader click; closes via FilterModal onClose |
| 184 | `profileVisible` | boolean | `false` | ProfileModal | Opens via HomeHeader click; closes via ProfileModal onClose |
| 185 | `agencyVisible` | boolean | `false` | AgencyModal | Opens via agency card click; closes via AgencyModal onClose |
| 187 | `packageDetailVisible` | boolean | `false` | PackageDetailModal | Opens via package card details click; closes via modal onClose |
| 189 | `showMap` | boolean | `false` | (UNUSED - dead code) | Not referenced in any component render; dead state variable |
| 190 | `isInteractingWithMap` | boolean | `false` | NearbyMapBlock interaction | Used to prevent scroll during map interaction |
| 191 | `mapGestureLocked` | boolean | `false` | NearbyMapBlock gesture lock | Used to track map lock state |

**MODAL-RELATED visibility state**: filtersVisible, profileVisible, agencyVisible, packageDetailVisible = **4 variables**

**NON-MODAL visibility state**: showMap (dead), isInteractingWithMap, mapGestureLocked = **3 variables** (keep separate from modal state)

**From Hooks (not useState in HomeScreen)**:
- `emailVerifyVisible` from useVerification hook → VerificationModal
- `arVisible` from useAR hook → ArWebViewModal
- `reservationVisible` from useReservation hook → ReservationModal

**Total Modals with External State**: 3 additional (verification, ar, reservation)

**Total Modal Visibility Variables**: 7 (4 local + 3 from hooks)

---

## 2. Modal Data State Variables (useState for Modal Data)

All located in HomeScreen/index.js lines 186-188:

| Line | Variable | Type | Initial | Associated Modal | Usage Pattern |
|------|----------|------|---------|-------------------|---------------|
| 186 | `selectedAgency` | object\|null | `null` | AgencyModal | Stores selected agency when opening modal; cleared on close |
| 188 | `detailPackage` | object\|null | `null` | PackageDetailModal | Stores selected package details; cleared on close |

**Total Modal Data Variables**: 2 (selectedAgency, detailPackage)

**Note**: Additional modal data stored in hooks:
- `selectedPackage` from useReservation hook
- Various form state from useVerification hook

---

## 3. Modal Handlers and Open/Close Patterns

### ProfileModal Handlers

**Open Pattern** (HomeHeader component, triggered on profile icon click):
```javascript
// Line ~234 (in HomeHeader component)
<TouchableOpacity onPress={() => setProfileVisible(true)}>
  {/* Profile Icon */}
</TouchableOpacity>
```

**Close Pattern** (ProfileModal component):
```javascript
// ProfileModal onClose prop
onClose={() => setProfileVisible(false)}
```

**Edge Case**: ProfileModal contains button to open VerificationModal:
```javascript
// From ProfileModal component
onOpenVerification={() => setEmailVerifyVisible(true)}
```

---

### FilterModal Handlers

**Open Pattern** (HomeHeader component):
```javascript
// Line ~234 (in HomeHeader)
<TouchableOpacity onPress={() => setFiltersVisible(true)}>
  {/* Filter Icon */}
</TouchableOpacity>
```

**Close Pattern** (FilterModal component):
```javascript
// FilterModal onClose prop
onClose={() => setFiltersVisible(false)}
```

**Data Handling**: No modal-specific data; FilterModal uses HomeScreen's filter state (category, search query, etc.) directly passed as props.

---

### AgencyModal Handlers

**Open Pattern** (NearbySection/PackagesSection, triggered on agency card click):
```javascript
// Pattern: inline handler
const openAgency = useCallback((agency) => {
  setSelectedAgency(agency);
  setAgencyVisible(true);
}, []);

// Usage:
<TouchableOpacity onPress={() => openAgency(agency)}>
  {/* Agency Card */}
</TouchableOpacity>
```

**Close Pattern** (AgencyModal component):
```javascript
// AgencyModal onClose prop
onClose={() => {
  setAgencyVisible(false);
  setSelectedAgency(null); // Data cleared on close
}}
```

**Data Handling**: Explicitly passes `selectedAgency` to AgencyModal; clears on close.

---

### PackageDetailModal Handlers

**Open Pattern** (PackageCard component):
```javascript
// Pattern: useCallback with state setters
const openPackageDetail = useCallback((pkg) => {
  setDetailPackage(pkg);
  setPackageDetailVisible(true);
}, []);

// Usage:
<TouchableOpacity onPress={() => openPackageDetail(pkg)}>
  {/* Details Button */}
</TouchableOpacity>
```

**Close Pattern** (PackageDetailModal component):
```javascript
// PackageDetailModal onClose prop
onClose={() => {
  setPackageDetailVisible(false);
  setDetailPackage(null); // Data cleared on close
}}
```

**Data Handling**: Passes `detailPackage` to modal; clears on close.

---

### VerificationModal Handlers

**Open Pattern** (ProfileModal component - nested modal):
```javascript
// Called from ProfileModal button
onOpenVerification={() => setEmailVerifyVisible(true)}
```

**Managed By**: useVerification hook (not HomeScreen useState)

**Close Pattern** (VerificationModal component):
```javascript
// VerificationModal onClose prop
onClose={() => setEmailVerifyVisible(false)}
```

**Edge Case**: Opens conditionally from ProfileModal; depends on verification state; can trigger navigation on success.

---

### ReservationModal Handlers

**Managed By**: useReservation hook (completely external to HomeScreen state management)

**Open Pattern**:
```javascript
// From useReservation hook
openReservation(pkg) // Called from PackageCard or elsewhere
```

**Close Pattern**:
```javascript
// From useReservation hook
closeReservation()
```

**Data Handling**: Hook manages all reservation state, form data, loading, errors.

**Edge Case**: Requires email verification first; calls `setEmailVerifyVisible(true)` to trigger verification modal before reservation can proceed.

---

### ArWebViewModal Handlers

**Managed By**: useAR hook (external state management)

**Open Pattern**:
```javascript
// From useAR hook
openAR(item) // Called from PlaceCard or PackageCard AR button
```

**Close Pattern**:
```javascript
// From useAR hook (via setArVisible(false))
arVisible ? <ArWebViewModal onClose={() => setArVisible(false)} /> : null
```

**Data Handling**: Hook generates AR HTML content via `generateArHtml(item)`.

---

## 4. Modal Component Mapping

| Modal | Component File | Visibility Prop | Data Props | Open Handler | Close Handler | State Location |
|-------|----------------|-----------------|------------|--------------|---------------|-----------------|
| **ProfileModal** | `components/modals/ProfileModal.jsx` | `visible={profileVisible}` | None (uses auth context) | `setProfileVisible(true)` | `setProfileVisible(false)` | HomeScreen useState |
| **FilterModal** | `components/modals/FilterModal.jsx` | `visible={filtersVisible}` | Filter props passed via spreading | `setFiltersVisible(true)` | `setFiltersVisible(false)` | HomeScreen useState |
| **AgencyModal** | `components/modals/AgencyModal.jsx` | `visible={agencyVisible}` | `agency={selectedAgency}` | `openAgency(agency)` → `setSelectedAgency()`, `setAgencyVisible(true)` | `setAgencyVisible(false)` + `setSelectedAgency(null)` | HomeScreen useState |
| **PackageDetailModal** | `components/modals/PackageDetailModal.jsx` | `visible={packageDetailVisible}` | `pkg={detailPackage}` | `openPackageDetail(pkg)` → `setDetailPackage()`, `setPackageDetailVisible(true)` | `setPackageDetailVisible(false)` + `setDetailPackage(null)` | HomeScreen useState |
| **VerificationModal** | `components/modals/VerificationModal.jsx` | `visible={emailVerifyVisible}` | Form state from useVerification | `setEmailVerifyVisible(true)` | `setEmailVerifyVisible(false)` | useVerification hook |
| **ReservationModal** | `components/modals/ReservationModal.jsx` | `visible={reservationVisible}` | Form data from useReservation hook | `openReservation(pkg)` | `closeReservation()` | useReservation hook |
| **ArWebViewModal** | `components/modals/ArWebViewModal.jsx` | `visible={arVisible}` | AR HTML from useAR hook | `openAR(item)` | `setArVisible(false)` | useAR hook |

**Total Modals**: 7

---

## 5. Edge Cases and Dependencies

### 5.1 Conditional Modal Opening (VerificationModal)

**Scenario**: VerificationModal opens conditionally from ProfileModal

**Current Pattern**:
```javascript
// In ProfileModal component
<TouchableOpacity onPress={() => {
  // Close ProfileModal and open VerificationModal
  setProfileVisible(false);
  setEmailVerifyVisible(true);
}}>
  <Text>Verify Email</Text>
</TouchableOpacity>
```

**Behavior**: One modal (ProfileModal) can trigger opening another modal (VerificationModal)

**Refactor Implication**: Need to preserve this conditional opening in openModal/closeModal functions. Solution: allow multiple modals to be open simultaneously (independent modal states).

---

### 5.2 Nested Modal Dependency (ReservationModal → VerificationModal)

**Scenario**: Reservation workflow can trigger verification requirement

**Current Pattern**:
```javascript
// In useReservation hook
if (user.emailVerified === false) {
  // Trigger verification modal
  onRequireVerification(); // Callback to setEmailVerifyVisible(true)
}
```

**Behavior**: ReservationModal may close and VerificationModal opens automatically

**Refactor Implication**: Hook-based modals (useReservation, useAR, useVerification) need to integrate with centralized useModalState for consistency. Consider: should hooks call openModal from parent, or should they maintain local state and parent coordinates?

**Decision for Phase 2**: Keep hooks' existing state management. Parent (HomeScreen) coordinates between hook-based modals and component-based modals. Future optimization in Phase 3+ can merge all modal states into single hook if needed.

---

### 5.3 Data Persistence Across Modal Cycles

**Current Behavior**:
- When AgencyModal closes: `setSelectedAgency(null)` clears data immediately
- When PackageDetailModal closes: `setDetailPackage(null)` clears data immediately

**Refactor Implication**: closeModal function needs `resetData` parameter to decide whether to clear associated data on close.

**Pattern**:
```javascript
// Close without clearing data (preserve for re-opening)
closeModal('agency', false);

// Close and clear data (fresh state on next open)
closeModal('agency', true);
```

---

### 5.4 Modal Gesture Lock (NearbyMapBlock)

**Current State**: `mapGestureLocked` and `isInteractingWithMap` are technically UI state, not modal state

**Current Pattern**:
```javascript
const unlockMapGesture = useCallback(() => {
  setMapGestureLocked(false);
  setIsInteractingWithMap(false);
}, []);
```

**Refactor Decision**: Keep these separate from useModalState hook. They control map behavior, not modal visibility. Include in analysis for completeness, but DO NOT consolidate into useModalState.

**Reasoning**: Confusing to mix map interaction state with modal visibility. Better separation of concerns.

---

### 5.5 Dead Code: showMap State Variable

**Location**: Line 189: `const [showMap, setShowMap] = useState(false);`

**Current Usage**: Never referenced in renders or callbacks

**Refactor Action**: DELETE this unused state variable during P2.2. It should not be migrated to useModalState.

---

## 6. Current Modal Handler Patterns

### Pattern A: Simple Toggle (ProfileModal, FilterModal)

**Profile Open**:
```javascript
setProfileVisible(true)
```

**Profile Close**:
```javascript
setProfileVisible(false)
```

**Data**: None

**Refactor Target**:
```javascript
openModal('profile')
closeModal('profile')
```

---

### Pattern B: Open with Data, Close with Reset (AgencyModal, PackageDetailModal)

**Agency Open**:
```javascript
const openAgency = useCallback((agency) => {
  setSelectedAgency(agency);
  setAgencyVisible(true);
}, []);
```

**Agency Close**:
```javascript
setAgencyVisible(false);
setSelectedAgency(null); // Reset data
```

**Refactor Target**:
```javascript
openModal('agency', { selectedAgency: agency })
closeModal('agency', true) // true = reset data
```

---

### Pattern C: Hook-Managed (ReservationModal, VerificationModal, ArWebViewModal)

**Current**: Hooks manage their own state; HomeScreen passes callbacks

**Example (ReservationModal)**:
```javascript
const {
  reservationVisible,
  openReservation,
  closeReservation,
} = useReservation({...});

// Usage:
<ReservationModal
  visible={reservationVisible}
  onClose={closeReservation}
/>
```

**Refactor Strategy for Phase 2**: Leave as-is. These hooks maintain their existing state management. Consolidation into useModalState deferred to future phases.

**Rationale**: Hooks contain complex state (form, loading, errors) tightly coupled with reservation/verification logic. Extracting to separate useModalState would complicate dependencies. Better to stabilize Phase 2 with ProfileModal/FilterModal/AgencyModal/PackageDetailModal first, then optionally refactor hooks in Phase 3+.

---

## 7. Summary: useState Declarations to Consolidate (Phase 2.2)

**These will be replaced with useModalState hook**:

```javascript
// BEFORE (10+ useState declarations)
const [filtersVisible, setFiltersVisible] = useState(false);              // Line 183
const [profileVisible, setProfileVisible] = useState(false);              // Line 184
const [agencyVisible, setAgencyVisible] = useState(false);                // Line 185
const [selectedAgency, setSelectedAgency] = useState(null);               // Line 186
const [packageDetailVisible, setPackageDetailVisible] = useState(false); // Line 187
const [detailPackage, setDetailPackage] = useState(null);                // Line 188
const [showMap, setShowMap] = useState(false);                            // Line 189 - DELETE (dead code)
const [isInteractingWithMap, setIsInteractingWithMap] = useState(false);  // Line 190 - KEEP separate
const [mapGestureLocked, setMapGestureLocked] = useState(false);          // Line 191 - KEEP separate

// AFTER (1 hook call + 2 separate state for map interaction)
const { modals, modalData, openModal, closeModal, updateModalData } = useModalState();
const [isInteractingWithMap, setIsInteractingWithMap] = useState(false);
const [mapGestureLocked, setMapGestureLocked] = useState(false);
```

**Reduction**: 10 useState → 3 useState (1 hook + 2 map interaction states)

---

## 8. Summary: Handler Updates Required (Phase 2.3)

**Current Handlers to Update**:

| Handler | Current Pattern | Refactored Pattern |
|---------|-----------------|-------------------|
| Open ProfileModal | `setProfileVisible(true)` | `openModal('profile')` |
| Close ProfileModal | `setProfileVisible(false)` | `closeModal('profile')` |
| Open FilterModal | `setFiltersVisible(true)` | `openModal('filter')` |
| Close FilterModal | `setFiltersVisible(false)` | `closeModal('filter')` |
| Open AgencyModal | `setSelectedAgency(a); setAgencyVisible(true)` | `openModal('agency', { selectedAgency: a })` |
| Close AgencyModal | `setAgencyVisible(false); setSelectedAgency(null)` | `closeModal('agency', true)` |
| Open PackageDetailModal | `setDetailPackage(p); setPackageDetailVisible(true)` | `openModal('packageDetail', { selectedPackage: p })` |
| Close PackageDetailModal | `setPackageDetailVisible(false); setDetailPackage(null)` | `closeModal('packageDetail', true)` |
| Open VerificationModal | `setEmailVerifyVisible(true)` (from hook) | `openModal('verification')` (requires hook integration) |
| Close VerificationModal | `setEmailVerifyVisible(false)` (from hook) | `closeModal('verification')` (requires hook integration) |
| Open ReservationModal | `openReservation(pkg)` (from hook) | Keep hook call; optionally integrate with useModalState later |
| Close ReservationModal | `closeReservation()` (from hook) | Keep hook call |
| Open ArWebViewModal | `openAR(item)` (from hook) | Keep hook call |
| Close ArWebViewModal | `setArVisible(false)` (from hook) | `closeModal('ar')` (requires hook integration) |

**Scope for Phase 2.3**: Focus on the first 8 handlers (ProfileModal, FilterModal, AgencyModal, PackageDetailModal). Hook-based modals (Verification, Reservation, AR) refactoring is deferred to Phase 3+ or handled as separate task.

---

## 9. Summary: Props Updates Required (Phase 2.4)

**Modal Components Receiving Props**:

| Component | Current Props | Refactored Props |
|-----------|---------------|------------------|
| `<ProfileModal>` | `visible={profileVisible}` | `visible={modals.profile}` |
| `<FilterModal>` | `visible={filtersVisible}` | `visible={modals.filter}` |
| `<AgencyModal>` | `visible={agencyVisible}` `agency={selectedAgency}` | `visible={modals.agency}` `agency={modalData.selectedAgency}` |
| `<PackageDetailModal>` | `visible={packageDetailVisible}` `pkg={detailPackage}` | `visible={modals.packageDetail}` `pkg={modalData.selectedPackage}` |
| `<VerificationModal>` | `visible={emailVerifyVisible}` | `visible={modals.verification}` (pending hook integration) |
| `<ReservationModal>` | `visible={reservationVisible}` | Keep hook state (no change for Phase 2) |
| `<ArWebViewModal>` | `visible={arVisible}` | `visible={modals.ar}` (pending hook integration) |

**OnClose Handlers to Update**:

```javascript
// BEFORE
<AgencyModal
  visible={agencyVisible}
  agency={selectedAgency}
  onClose={() => {
    setAgencyVisible(false);
    setSelectedAgency(null);
  }}
/>

// AFTER
<AgencyModal
  visible={modals.agency}
  agency={modalData.selectedAgency}
  onClose={() => closeModal('agency', true)}
/>
```

---

## 10. Acceptance Criteria Verification

✅ **Criterion 1**: Document identifies all useState declarations for modal visibility
- Identified: filtersVisible, profileVisible, agencyVisible, packageDetailVisible, showMap, isInteractingWithMap, mapGestureLocked
- Plus 3 from hooks: emailVerifyVisible, reservationVisible, arVisible

✅ **Criterion 2**: Document identifies all useState declarations for modal data
- Identified: selectedAgency, detailPackage
- Plus additional state in hooks (reservationForm, etc.)

✅ **Criterion 3**: Document identifies all modal open/close handlers
- ProfileModal: setProfileVisible(true/false)
- FilterModal: setFiltersVisible(true/false)
- AgencyModal: openAgency, closeAgency handlers
- PackageDetailModal: openPackageDetail, closePackageDetail handlers
- VerificationModal: setEmailVerifyVisible(true/false) via hook
- ReservationModal: openReservation, closeReservation via hook
- ArWebViewModal: openAR, setArVisible via hook

✅ **Criterion 4**: Document maps each modal to its corresponding component
- All 7 modals mapped with file paths, visibility props, data props, and handlers

✅ **Criterion 5**: Document notes edge cases
- Conditional modal opening (ProfileModal → VerificationModal)
- Nested modal dependency (ReservationModal → VerificationModal)
- Data persistence patterns
- Map gesture lock state (not a modal)
- Dead code (showMap)

✅ **Criterion 6**: Document is saved
- Saved as REFACTOR_ANALYSIS.md in src/screens/HomeScreen/

✅ **Criterion 7**: At least 7 distinct modals identified
- 7 modals identified: ProfileModal, FilterModal, AgencyModal, PackageDetailModal, VerificationModal, ReservationModal, ArWebViewModal

---

## 11. Files Affected by Analysis

**Analyzed**:
- `src/screens/HomeScreen/index.js` (main component, modal state declarations and handlers)
- `src/screens/HomeScreen/components/modals/` (all modal component files)
- `src/screens/HomeScreen/hooks/useVerification.js` (VerificationModal state)
- `src/screens/HomeScreen/hooks/useReservation.js` (ReservationModal state)
- `src/screens/HomeScreen/hooks/useAR.js` (ArWebViewModal state)

**Referenced Components**:
- `src/screens/HomeScreen/components/HomeHeader.jsx` (triggers ProfileModal, FilterModal)
- `src/screens/HomeScreen/components/NearbyMapBlock.jsx` (uses map gesture lock state)

---

## 12. Next Steps (Phase 2.2 onwards)

**Phase P2.2 (Replace useState with useModalState)**:
1. Import useModalState hook into HomeScreen
2. Add hook call: `const { modals, modalData, openModal, closeModal, updateModalData } = useModalState();`
3. Delete old useState declarations (except map gesture states and non-modal states)
4. Delete dead code (showMap)
5. Verify no TypeScript/linting errors

**Phase P2.3 (Update Handlers)**:
1. Replace `setProfileVisible(true)` with `openModal('profile')`
2. Replace `setProfileVisible(false)` with `closeModal('profile')`
3. Replace all handler patterns with openModal/closeModal equivalents
4. Update useCallback dependencies where necessary

**Phase P2.4 (Update Props)**:
1. Replace `visible={profileVisible}` with `visible={modals.profile}`
2. Replace `agency={selectedAgency}` with `agency={modalData.selectedAgency}`
3. Replace `pkg={detailPackage}` with `pkg={modalData.selectedPackage}`
4. Update onClose handlers to call closeModal function

**Phase P2.5 (Manual Testing)**:
1. Test each modal opens correctly
2. Test each modal closes correctly
3. Test modal data persists and resets as expected
4. Test nested modal workflows (ProfileModal → VerificationModal, etc.)
5. Verify no console errors

---

**Document Status**: ✅ Complete - Ready for Phase 2.2 implementation

**Analysis Conducted By**: Kiro Spec Task Execution
**Date**: Current session
**Version**: 1.0
