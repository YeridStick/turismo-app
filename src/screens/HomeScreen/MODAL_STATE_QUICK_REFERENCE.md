# Modal State Management - Quick Reference Guide

**For HomeScreen Modal Operations**

---

## Hook Usage

### Basic Import
```javascript
import { useModalState } from './hooks/useModalState';

// In component
const { modals, modalData, openModal, closeModal, updateModalData } = useModalState();
```

---

## Opening Modals

### Without Data
```javascript
// Profile Modal
openModal('profile');

// Filter Modal
openModal('filter');

// Verification Modal
openModal('verification');

// AR Modal
openModal('ar');
```

### With Data
```javascript
// Agency Modal with selected agency
openModal('agency', { selectedAgency: agencyObject });

// Package Detail Modal with selected package
openModal('packageDetail', { selectedPackage: packageObject });
```

---

## Closing Modals

### Standard Close (Resets Data)
```javascript
// Profile Modal
closeModal('profile');

// Filter Modal
closeModal('filter');

// Agency Modal (also resets selectedAgency to null)
closeModal('agency');

// Package Detail Modal (also resets selectedPackage to null)
closeModal('packageDetail');

// Verification Modal
closeModal('verification');

// AR Modal
closeModal('ar');
```

### Close Without Resetting Data
```javascript
// Preserve selectedPackage when closing (useful for workflows)
closeModal('packageDetail', false);
```

---

## Checking Modal Visibility

```javascript
// Is profile modal visible?
if (modals.profile) { /* ... */ }

// Is agency modal visible?
if (modals.agency) { /* ... */ }

// In JSX
<ProfileModal
  visible={modals.profile}
  // ...
/>
```

---

## Accessing Modal Data

```javascript
// Get selected agency
const agency = modalData.selectedAgency;
// Returns: { id, name, ... } or null

// Get selected package
const pkg = modalData.selectedPackage;
// Returns: { id, name, price, ... } or null

// In JSX
<AgencyModal
  visible={modals.agency}
  agency={modalData.selectedAgency}
  // ...
/>
```

---

## Updating Modal Data

```javascript
// Update agency
updateModalData({ selectedAgency: newAgency });

// Update package
updateModalData({ selectedPackage: newPackage });

// Update both
updateModalData({
  selectedAgency: newAgency,
  selectedPackage: newPackage
});

// Clear data
updateModalData({
  selectedAgency: null,
  selectedPackage: null
});
```

---

## Common Patterns

### Opening Sequential Modals
```javascript
// Profile → Verification
onOpenVerification={() => {
  closeModal('profile');
  openModal('verification');
}}
```

### Modal with Data and Reserve Action
```javascript
// Open package detail
openPackageDetail = useCallback((pkg) => {
  openModal('packageDetail', { selectedPackage: pkg });
}, [openModal]);

// Reserve action
onReserve={() => {
  closeModal('packageDetail', false);  // Close but keep data
  openReservation(modalData.selectedPackage);  // Pass data to reservation
}}
```

### Info Button Pattern
```javascript
<TouchableOpacity
  onPress={() => openModal('agency', { selectedAgency: item })}
>
  <Text>View Details</Text>
</TouchableOpacity>
```

---

## Modal List

| Modal Name | Key | Data Property | Notes |
|------------|-----|---------------|-------|
| ProfileModal | `profile` | None | User profile, logout, routes |
| FilterModal | `filter` | None | Category, distance filters |
| AgencyModal | `agency` | `selectedAgency` | Agency details view |
| PackageDetailModal | `packageDetail` | `selectedPackage` | Package information |
| VerificationModal | `verification` | None | Email verification form |
| ReservationModal | `reservation` | None | Uses separate useReservation hook |
| ArWebViewModal | `ar` | None | AR content viewer |

---

## State Structure Reference

### Modals State
```javascript
{
  profile: false,        // boolean
  filter: false,         // boolean
  agency: false,         // boolean
  packageDetail: false,  // boolean
  verification: false,   // boolean
  reservation: false,    // boolean (managed by useReservation)
  ar: false              // boolean
}
```

### Modal Data State
```javascript
{
  selectedAgency: null,    // null or { id, name, ... }
  selectedPackage: null    // null or { id, name, price, ... }
}
```

---

## Troubleshooting

### Modal not appearing
**Check**:
- Is `visible={modals.modalName}` set correctly?
- Is `openModal('modalName')` being called?
- Check browser console for errors

### Modal not closing
**Check**:
- Is `onClose={() => closeModal('modalName')}` set on modal?
- Is closeModal being called in the right place?
- Check if modal component is checking the `visible` prop

### Data not persisting
**Check**:
- Use `openModal('modalName', { ...data })`
- Use `closeModal('modalName', false)` if you need to preserve data
- Verify `modalData.selectedProperty` in modal component

### Data not clearing
**Check**:
- Use `closeModal('modalName', true)` (or no second param, true is default)
- For agency: closeModal('agency') automatically resets selectedAgency
- For packageDetail: closeModal('packageDetail') automatically resets selectedPackage

---

## Adding a New Modal

### 1. Update modalHelpers.js
```javascript
// Add to createInitialModalState()
myNewModal: false,

// Add to createInitialModalData() if needed
myNewProperty: null,
```

### 2. Update HomeScreen
```javascript
// Use hook
const { modals, modalData, openModal, closeModal } = useModalState();

// Create modal component
<MyNewModal
  visible={modals.myNewModal}
  onClose={() => closeModal('myNewModal')}
  // ... other props
/>

// Create trigger
onOpenMyModal={() => openModal('myNewModal')}
```

---

## Best Practices

✅ **Do**:
- Always wrap callbacks with useCallback
- Reset data on close unless workflow requires preservation
- Use descriptive modal names (avoid generic 'modal' names)
- Group related modal operations together
- Document modal-specific behavior in comments

❌ **Don't**:
- Manually manage modal state outside the hook
- Use setTimeout to close modals (use callback instead)
- Create cyclic modal dependencies (A→B→A)
- Pass entire objects as modal names
- Forget to set onClose handler

---

## Examples

### Complete Agency Modal Flow
```javascript
// Open agency with data
const openAgency = useCallback((agency) => {
  openModal('agency', { selectedAgency: agency });
}, [openModal]);

// In JSX
<TouchableOpacity onPress={() => openAgency(agencyItem)}>
  <Text>View Agency</Text>
</TouchableOpacity>

// Modal component
<AgencyModal
  visible={modals.agency}
  agency={modalData.selectedAgency}
  onClose={() => closeModal('agency')}
/>
```

### Complete Package Detail Flow
```javascript
// Open package detail
const openPackageDetail = useCallback((pkg) => {
  openModal('packageDetail', { selectedPackage: pkg });
}, [openModal]);

// Open reservation (closes package modal)
const openPackagePayment = useCallback((pkg) => {
  closeModal('packageDetail', false);
  openReservation(pkg);
}, [closeModal, openReservation]);

// Modal component
<PackageDetailModal
  visible={modals.packageDetail}
  pkg={modalData.selectedPackage}
  onClose={() => closeModal('packageDetail')}
  onReserve={() => openPackagePayment(modalData.selectedPackage)}
/>
```

---

## Resources

- **Hook Implementation**: `src/screens/HomeScreen/hooks/useModalState.js`
- **Helper Functions**: `src/screens/HomeScreen/utils/modalHelpers.js`
- **Usage Example**: `src/screens/HomeScreen/index.js` (search for "useModalState")
- **Sign-Off Document**: `src/screens/HomeScreen/PHASE_2_VALIDATION.md`

---

**Last Updated**: December 19, 2024
**Status**: Active - Phase 2 Complete

