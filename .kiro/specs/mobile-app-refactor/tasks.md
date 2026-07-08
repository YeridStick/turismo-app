# Mobile App Refactor - Tasks (Phase 1 & Phase 2 Only)

## Overview

This document outlines the executable tasks for the **first iteration only** of the mobile-app-refactor spec. Phase 1 and Phase 2 are scoped to 40-50 hours total and focus on modal state infrastructure and HomeScreen refactoring.

**Scope**: PHASE 1 & PHASE 2 ONLY
- Phase 1: Modal State Infrastructure (10-12 hours)
- Phase 2: HomeScreen Modal State Refactoring (30-35 hours)

**Out of Scope**: Phase 3 (Section Component Extraction), Phase 4 (NearbyMapBlock Optimization), Phase 5 (JSDoc Documentation)

---

## Task Dependency Graph

```
PHASE 1 (Modal State Infrastructure)
│
├─ P1.1: Create utils/modalHelpers.js
│  └─ (No dependencies)
│
├─ P1.2: Create hooks/useModalState.js
│  └─ Depends on P1.1
│
└─ P1.3: Manual verification of Phase 1 deliverables
   └─ Depends on P1.1, P1.2

        ↓ (Phase 1 complete, ready for Phase 2)

PHASE 2 (HomeScreen Modal State Refactoring)
│
├─ P2.1: Analyze current modal state in HomeScreen
│  └─ Depends on Phase 1 complete
│
├─ P2.2: Replace individual useState calls with useModalState hook
│  └─ Depends on P2.1
│
├─ P2.3: Update all modal open/close handlers
│  └─ Depends on P2.2
│
├─ P2.4: Update modal visibility props and data bindings
│  └─ Depends on P2.3
│
├─ P2.5: Manual testing of modal workflows
│  └─ Depends on P2.4
│
└─ P2.6: Final validation and sign-off
   └─ Depends on P2.5
```

---

## Phase 1: Modal State Infrastructure (10-12 hours)

### Task P1.1: Create utils/modalHelpers.js

**Effort**: 2-3 hours
**Difficulty**: Low
**Description**: Create utility file containing helper functions for modal state initialization and lifecycle management.

**Acceptance Criteria**:
1. File exists at `src/screens/HomeScreen/utils/modalHelpers.js`
2. Exports `createInitialModalState()` function that returns object with all 7 modal keys (profile, filter, agency, packageDetail, verification, reservation, ar) set to false
3. Exports `createInitialModalData()` function that returns object with selectedAgency and selectedPackage set to null
4. Exports `toggleModal(modalName, currentState)` helper function that toggles a modal's visibility state
5. Each function includes JSDoc comments describing purpose, parameters, and return value
6. File has no side effects or external dependencies (pure functions only)
7. Code compiles without errors when imported into HomeScreen

**Files Affected**:
- (NEW) `src/screens/HomeScreen/utils/modalHelpers.js`

**Manual Validation**:
- [x] Import modalHelpers in HomeScreen; verify no import errors
- [x] Call createInitialModalState() and verify returns object with all 7 modal keys
- [x] Call createInitialModalData() and verify returns { selectedAgency: null, selectedPackage: null }
- [x] Call toggleModal('profile', {profile: false, ...}) and verify returns {profile: true, ...}
- [x] Verify all functions include JSDoc @param and @returns tags
- [x] Verify no console errors or warnings in IDE

---

### Task P1.2: Create hooks/useModalState.js

**Effort**: 3-4 hours
**Difficulty**: Medium
**Description**: Create custom hook that encapsulates modal state management (open/close/update modal data).

**Acceptance Criteria**:
1. File exists at `src/screens/HomeScreen/hooks/useModalState.js`
2. Hook exports useModalState() function that returns { modals, modalData, openModal, closeModal, updateModalData }
3. Hook initializes modals state using createInitialModalState() from utils/modalHelpers
4. Hook initializes modalData state using createInitialModalData() from utils/modalHelpers
5. openModal(name, data) function sets modal[name] = true and merges data into modalData if provided
6. closeModal(name, resetData) function sets modal[name] = false and resets associated data if resetData = true
7. updateModalData(updates) function merges updates into modalData
8. All callbacks are wrapped with useCallback with correct dependency arrays
9. Each function includes JSDoc comments with @param and @returns tags
10. Hook can be imported and used in React components without errors

**Files Affected**:
- (NEW) `src/screens/HomeScreen/hooks/useModalState.js`
- (REFERENCE) `src/screens/HomeScreen/utils/modalHelpers.js`

**Manual Validation**:
- [x] Import useModalState in HomeScreen; verify no import errors
- [x] Call hook in a test component; verify returns object with all expected properties
- [x] Verify modals object has all 7 modal keys (profile, filter, agency, etc.)
- [x] Verify modalData object has selectedAgency and selectedPackage
- [x] Call openModal('profile') and verify modals.profile = true
- [x] Call closeModal('profile') and verify modals.profile = false
- [x] Call openModal('agency', {selectedAgency: testAgency}) and verify data is stored
- [x] Call closeModal('agency', true) and verify selectedAgency = null
- [x] Verify closeModal('agency', false) does NOT reset selectedAgency
- [x] Call updateModalData() and verify state updates correctly

---

### Task P1.3: Manual Verification of Phase 1 Deliverables

**Effort**: 2-3 hours
**Difficulty**: Low
**Description**: Verify Phase 1 files are syntactically correct and functionally complete before proceeding to Phase 2.

**Acceptance Criteria**:
1. Both P1.1 and P1.2 files exist in correct directories
2. modalHelpers.js exports all 3 expected functions
3. useModalState.js imports modalHelpers correctly and exports hook
4. No TypeScript or syntax errors when files are imported
5. All existing HomeScreen imports still resolve correctly (no breaking changes)
6. A developer can understand the modal state pattern by reading useModalState.js + modalHelpers.js within 5 minutes
7. Documentation (JSDoc comments) is clear and accurate
8. Hook is ready for integration into HomeScreen in Phase 2

**Files Affected**:
- (VERIFY) `src/screens/HomeScreen/utils/modalHelpers.js`
- (VERIFY) `src/screens/HomeScreen/hooks/useModalState.js`
- (VERIFY) `src/screens/HomeScreen/index.js` (existing imports unchanged)

**Manual Validation**:
- [x] Navigate to src/screens/HomeScreen/utils/; verify modalHelpers.js exists
- [x] Navigate to src/screens/HomeScreen/hooks/; verify useModalState.js exists
- [x] Open HomeScreen (index.js); verify no new import errors
- [x] Hover over useModalState import in IDE; verify JSDoc appears
- [x] Check IDE output panel; verify no TypeScript or eslint errors
- [x] Read modalHelpers.js; understand purpose and functions within 3 minutes
- [x] Read useModalState.js; understand hook interface within 5 minutes
- [x] Confirm all 7 modal names match HomeScreen's current modals
- [x] Phase 1 sign-off: Ready to proceed to Phase 2

---

## Phase 2: HomeScreen Modal State Refactoring (30-35 hours)

### Task P2.1: Analyze Current Modal State in HomeScreen

**Effort**: 3-4 hours
**Difficulty**: Low
**Description**: Document current modal state declarations, handlers, and usage patterns in HomeScreen before refactoring.

**Acceptance Criteria**:
1. Document identifies all useState declarations for modal visibility (filtersVisible, profileVisible, agencyVisible, packageDetailVisible, showMap, etc.)
2. Document identifies all useState declarations for modal data (selectedAgency, selectedPackage, detailPackage, etc.)
3. Document identifies all modal open/close handlers (e.g., setFiltersVisible(true), setProfileVisible(false), etc.)
4. Document maps each modal to its corresponding component (ProfileModal, AgencyModal, etc.)
5. Document notes edge cases: modals that open conditionally, modals that depend on verification state, modals that trigger navigation
6. Document is saved in ANALYSIS.md or similar for reference during refactoring
7. At least 7 distinct modals are identified

**Files Affected**:
- (ANALYZE) `src/screens/HomeScreen/index.js`
- (CREATE) `src/screens/HomeScreen/REFACTOR_ANALYSIS.md` (temporary reference file)

**Manual Validation**:
- [x] Read HomeScreen code; identify all modal useState declarations
- [x] Count modal useState declarations; document at least 7
- [x] Count modal-related callbacks (open/close handlers); document count
- [x] For each modal, note: component name, visibility prop, data props, handlers
- [x] Identify edge cases: conditional modals, nested dependencies, navigation triggers
- [x] Create analysis document; save for Phase 2 reference

---

### Task P2.2: Replace Individual useState Calls with useModalState Hook

**Effort**: 4-5 hours
**Difficulty**: Medium
**Description**: Replace all individual modal useState declarations in HomeScreen with single useModalState hook call.

**Acceptance Criteria**:
1. useModalState hook is imported at top of HomeScreen
2. Single line: `const { modals, modalData, openModal, closeModal, updateModalData } = useModalState();` added to HomeScreen
3. All individual modal visibility useState declarations removed (filtersVisible, profileVisible, agencyVisible, packageDetailVisible, showMap, etc.)
4. All individual modal data useState declarations removed (selectedAgency, selectedPackage, detailPackage, etc.)
5. oldState variables that are NOT modal-related are preserved unchanged
6. No other component logic is modified in this task
7. File compiles without errors

**Files Affected**:
- (MODIFY) `src/screens/HomeScreen/index.js`

**Manual Validation**:
- [~] Search HomeScreen for "useState(false)" for modals; count instances before change
- [~] Search HomeScreen for "useState(null)" for modal data; count instances before change
- [x] After modification, search again; verify all modal-related useState declarations removed
- [x] Verify useModalState hook is imported correctly
- [x] Verify { modals, modalData, openModal, closeModal, updateModalData } destructuring is present
- [x] Verify no syntax errors in HomeScreen
- [x] Verify IDE shows no missing variable errors

---

### Task P2.3: Update All Modal Open/Close Handlers

**Effort**: 5-6 hours
**Difficulty**: Medium
**Description**: Replace all inline modal open/close handler logic with hook-based openModal/closeModal/updateModalData calls.

**Acceptance Criteria**:
1. ProfileModal opening: Replace `setProfileVisible(true)` with `openModal('profile')`
2. ProfileModal closing: Replace `setProfileVisible(false)` with `closeModal('profile')`
3. FilterModal opening: Replace `setFiltersVisible(true)` with `openModal('filter')`
4. FilterModal closing: Replace `setFiltersVisible(false)` with `closeModal('filter')`
5. AgencyModal opening: Replace `setAgencyVisible(true)` with `openModal('agency', { selectedAgency })`
6. AgencyModal closing: Replace `setAgencyVisible(false)` with `closeModal('agency')`
7. PackageDetailModal opening: Replace `setPackageDetailVisible(true)` with `openModal('packageDetail', { selectedPackage: pkg })`
8. PackageDetailModal closing: Replace `setPackageDetailVisible(false)` with `closeModal('packageDetail')`
9. VerificationModal opening: Replace `setEmailVerifyVisible(true)` with `openModal('verification')`
10. VerificationModal closing: Replace `setEmailVerifyVisible(false)` with `closeModal('verification')`
11. ReservationModal opening: Replace `openReservation(pkg)` with combined hook calls if needed (preserve existing hook behavior)
12. ArWebViewModal opening: Replace `setArVisible(true)` with `openModal('ar')`
13. ArWebViewModal closing: Replace `setArVisible(false)` with `closeModal('ar')`
14. All handlers wrapped with useCallback maintain correct dependency arrays
15. File compiles without errors

**Files Affected**:
- (MODIFY) `src/screens/HomeScreen/index.js`

**Manual Validation**:
- [~] Search for "setProfileVisible"; verify all replaced with openModal/closeModal
- [~] Search for "setFiltersVisible"; verify all replaced
- [~] Search for "setAgencyVisible"; verify all replaced
- [~] Search for "setPackageDetailVisible"; verify all replaced
- [~] Search for "setEmailVerifyVisible"; verify all replaced
- [~] Search for "setArVisible"; verify all replaced
- [~] Search for "setReservationVisible" if it exists; verify replaced
- [x] Verify no remaining useState setters for modal visibility
- [~] Verify IDE shows no "undefined variable" errors
- [x] Verify callbacks use useCallback with correct dependencies

---

### Task P2.4: Update Modal Visibility Props and Data Bindings

**Effort**: 4-5 hours
**Difficulty**: Medium
**Description**: Update all modal component props to use modals state from hook instead of individual useState variables.

**Acceptance Criteria**:
1. ProfileModal: visible={modals.profile} (instead of visible={profileVisible})
2. FilterModal: visible={modals.filter} (instead of visible={filtersVisible})
3. AgencyModal: visible={modals.agency}, agency={modalData.selectedAgency} (instead of visible={agencyVisible}, agency={selectedAgency})
4. PackageDetailModal: visible={modals.packageDetail}, pkg={modalData.selectedPackage} (instead of visible={packageDetailVisible}, pkg={detailPackage})
5. VerificationModal: visible={modals.verification} (instead of visible={emailVerifyVisible})
6. ReservationModal: visible handled by existing hook (preserve useReservation behavior)
7. ArWebViewModal: visible={modals.ar} (instead of visible={arVisible})
8. All modal onClose handlers updated to use closeModal() with correct reset behavior
9. All modal data bindings use modalData object properties
10. File compiles without errors

**Files Affected**:
- (MODIFY) `src/screens/HomeScreen/index.js`

**Manual Validation**:
- [x] Find ProfileModal component; verify visible={modals.profile}
- [~] Find FilterModal component; verify visible={modals.filter}
- [~] Find AgencyModal component; verify visible={modals.agency}, agency={modalData.selectedAgency}
- [~] Find PackageDetailModal component; verify visible={modals.packageDetail}, pkg={modalData.selectedPackage}
- [~] Find VerificationModal component; verify visible={modals.verification}
- [~] Find ArWebViewModal component; verify visible={modals.ar}
- [~] Verify all onClose props use closeModal() function
- [~] Verify no remaining references to old state variables in modal props
- [~] Verify IDE shows no missing prop type errors
- [~] Verify no TypeScript errors

---

### Task P2.5: Manual Testing of Modal Workflows

**Effort**: 4-5 hours
**Difficulty**: Low (Testing)
**Description**: Manually test all modal open/close workflows to verify refactored state management works correctly.

**Acceptance Criteria**:
1. ProfileModal can be opened by clicking profile icon; modal appears
2. ProfileModal can be closed by clicking X button; modal disappears and state clears
3. FilterModal can be opened by clicking filter icon; modal appears with current filters
4. FilterModal can be closed by clicking close; filters applied or reverted as expected
5. AgencyModal can be opened by clicking agency in Packages section; modal appears with agency data
6. AgencyModal can be closed; agency data clears from state
7. PackageDetailModal can be opened by clicking package; modal appears with package details
8. PackageDetailModal can be closed; package data clears
9. VerificationModal can be opened from profile menu; modal appears with email verification form
10. VerificationModal can be closed; verification state resets
11. ReservationModal still opens after package selection (if applicable)
12. ArWebViewModal can be opened from place/package AR button; WebView displays
13. ArWebViewModal can be closed; state clears
14. Multiple modals can be opened/closed in sequence without errors
15. App does not crash during modal transitions
16. No console errors or warnings observed during modal testing

**Files Affected**:
- (TEST) `src/screens/HomeScreen/index.js` (manual testing, no code changes)

**Manual Validation Checklist**:
- [~] Open app and navigate to HomeScreen
- [~] Click profile icon (top-left); ProfileModal appears
- [~] Click close button on ProfileModal; modal disappears
- [~] Click filter icon (top-right); FilterModal appears
- [~] Click close on FilterModal; modal disappears
- [~] In Packages section, click on an agency card
- [~] Click info icon on agency card; AgencyModal appears with agency details
- [~] Close AgencyModal; modal disappears
- [~] In Packages section, click on a package card
- [~] Click details button; PackageDetailModal appears
- [~] Close PackageDetailModal; modal disappears
- [~] Open profile menu; click "Verify Email" option
- [~] VerificationModal appears; close it
- [~] In Catalog or Nearby section, click AR button on a place card
- [~] ArWebViewModal appears with AR content; close it
- [~] Open 2-3 modals in sequence; verify all open/close correctly
- [~] Check browser console; no errors or warnings
- [~] App responsive and no crashes observed

---

### Task P2.6: Final Validation and Sign-Off

**Effort**: 2-3 hours
**Difficulty**: Low
**Description**: Complete final validation checklist and document sign-off for Phase 2 completion.

**Acceptance Criteria**:
1. All acceptance criteria from P2.1 through P2.5 are met
2. Code review completed by at least one peer developer
3. No new console errors or warnings introduced
4. All existing functionality preserved (no regressions)
5. Modal state hook integration successful and stable
6. HomeScreen useState count reduced from 10+ to 1-2 (modals + other non-modal state)
7. Documentation updated if needed (e.g., comments added to useModalState usage)
8. Ready for deployment to QA/staging environment
9. Sign-off document created and saved

**Files Affected**:
- (DOCUMENT) Create `PHASE_2_VALIDATION.md` with sign-off checklist
- (REVIEW) `src/screens/HomeScreen/index.js` (peer code review)
- (REVIEW) `src/screens/HomeScreen/hooks/useModalState.js` (peer code review)
- (REVIEW) `src/screens/HomeScreen/utils/modalHelpers.js` (peer code review)

**Manual Validation Checklist**:
- [~] P2.1 Complete: Analysis document created and accurate
- [~] P2.2 Complete: useModalState hook integrated into HomeScreen
- [~] P2.3 Complete: All modal handlers updated to use openModal/closeModal
- [~] P2.4 Complete: All modal components updated with new prop bindings
- [~] P2.5 Complete: Manual testing passed; all modals functional
- [~] Code quality: No new linting errors or warnings
- [~] Code style: Changes follow existing project conventions
- [~] Peer review: At least one developer reviewed and approved changes
- [~] Git commits: Changes committed with clear, descriptive messages
- [~] Documentation: Added comments explaining useModalState usage in HomeScreen
- [~] Performance: No noticeable performance regression observed
- [~] Backwards compatibility: All existing imports and APIs unchanged
- [~] Ready for merge: All sign-off criteria met; ready to merge to main branch
- [~] Create `PHASE_2_VALIDATION.md` documenting completion and sign-off

---

## Summary of Tasks by Phase

| Phase | Task | Effort | Status |
|-------|------|--------|--------|
| 1 | P1.1: Create modalHelpers.js | 2-3 hrs | Pending |
| 1 | P1.2: Create useModalState.js | 3-4 hrs | Pending |
| 1 | P1.3: Verify Phase 1 | 2-3 hrs | Pending |
| 2 | P2.1: Analyze current modal state | 3-4 hrs | Pending |
| 2 | P2.2: Replace useState with hook | 4-5 hrs | Pending |
| 2 | P2.3: Update handlers | 5-6 hrs | Pending |
| 2 | P2.4: Update props/bindings | 4-5 hrs | Pending |
| 2 | P2.5: Manual testing | 4-5 hrs | Pending |
| 2 | P2.6: Final validation | 2-3 hrs | Pending |

**Total Phase 1**: 7-10 hours (estimated 10-12 hours with buffer)
**Total Phase 2**: 27-32 hours (estimated 30-35 hours with buffer)
**Grand Total**: 34-42 hours (estimated 40-50 hours with buffer)

---

## File Changes Summary

### Phase 1 (Infrastructure)

| File | Type | Status |
|------|------|--------|
| `utils/modalHelpers.js` | NEW | To create |
| `hooks/useModalState.js` | NEW | To create |

### Phase 2 (Refactoring)

| File | Type | Status |
|------|------|--------|
| `index.js` (HomeScreen) | MODIFY | To integrate useModalState |

### Reference Files (No Changes)

| File | Purpose |
|------|---------|
| `hooks/useHomeData.js` | Data layer (unchanged) |
| `hooks/useReservation.js` | Reservation logic (unchanged) |
| `hooks/useNotifications.js` | Notification logic (unchanged) |
| `hooks/useAR.js` | AR logic (unchanged) |
| `hooks/useVerification.js` | Verification logic (unchanged) |

---

## Future Phases (OUT OF SCOPE)

The following phases are **NOT** included in this first iteration and are deferred to future work:

| Phase | Focus | Effort | Status |
|-------|-------|--------|--------|
| 3 | Section Component Extraction (NearbySection, CatalogSection, PackagesSection, FooterSection) | 25-30 hrs | DEFERRED |
| 4 | NearbyMapBlock Optimization (React.memo, useCallback, custom comparison) | 15-20 hrs | DEFERRED |
| 5 | JSDoc Documentation (Full coverage of components, hooks, utilities) | 10-15 hrs | DEFERRED |

These phases may be pursued after Phase 1-2 are complete and successfully deployed.

---

## Validation Success Criteria (Phase 1 & 2)

### Code Quality
- ✓ No new TypeScript/linting errors introduced
- ✓ All imports resolve correctly
- ✓ All functions have JSDoc comments
- ✓ Code follows project conventions

### Functionality
- ✓ All 7 modals can be opened and closed
- ✓ Modal data (selectedAgency, selectedPackage) persists correctly
- ✓ Modal data resets appropriately when modals close
- ✓ No broken workflows or regressions

### Performance
- ✓ App responsive; no noticeable slowdowns
- ✓ Modal transitions smooth
- ✓ No excessive re-renders observed

### Review & Approval
- ✓ Peer code review completed
- ✓ All feedback addressed
- ✓ Approved for merge to main branch

---

## How to Execute Tasks

### For Phase 1

1. **Start with P1.1**: Create `utils/modalHelpers.js` with pure helper functions
2. **Then P1.2**: Create `hooks/useModalState.js` importing from P1.1
3. **Finally P1.3**: Verify both files exist, compile, and functions work as expected
4. **Deliverable**: Two new files ready for Phase 2 integration

### For Phase 2

1. **Start with P2.1**: Document current modal state structure in HomeScreen
2. **Then P2.2**: Import useModalState hook; remove individual useState declarations
3. **Then P2.3**: Replace all open/close handlers with hook-based calls
4. **Then P2.4**: Update modal component props to use new state objects
5. **Then P2.5**: Systematically test each modal workflow
6. **Finally P2.6**: Document completion and get sign-off
7. **Deliverable**: Refactored HomeScreen with centralized modal state management

---

## Notes

- Each task includes specific acceptance criteria and manual validation steps
- Tasks are sequenced to ensure dependencies are met before starting
- Phase 1 must complete before Phase 2 begins
- Manual testing is the primary validation method (no automated test framework required)
- If any task fails validation, revisit the acceptance criteria and debug before proceeding
- Rollback to previous commit if critical regressions occur

