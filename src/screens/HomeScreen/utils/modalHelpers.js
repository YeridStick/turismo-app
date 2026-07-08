/**
 * Creates the initial state object for all modals in HomeScreen.
 * All modals are initialized to false (closed) by default.
 *
 * @returns {Object} Modal state object with keys for all 7 modals set to false
 * @example
 * const initialState = createInitialModalState();
 * // Returns: { profile: false, filter: false, agency: false, packageDetail: false, verification: false, reservation: false, ar: false }
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
 * Creates the initial state object for modal-related data (selected items).
 * Stores references to items selected within modals (e.g., selected agency or package).
 *
 * @returns {Object} Modal data object with selectedAgency and selectedPackage set to null
 * @example
 * const initialData = createInitialModalData();
 * // Returns: { selectedAgency: null, selectedPackage: null }
 */
export const createInitialModalData = () => ({
  selectedAgency: null,
  selectedPackage: null,
});

/**
 * Toggles the visibility state of a specific modal.
 * Returns a new state object with the specified modal's visibility inverted.
 *
 * @param {string} modalName - The name of the modal to toggle (e.g., 'profile', 'filter', 'agency')
 * @param {Object} currentState - The current modal state object
 * @returns {Object} New modal state object with the specified modal toggled
 * @example
 * const currentState = { profile: false, filter: true, agency: false };
 * const newState = toggleModal('profile', currentState);
 * // Returns: { profile: true, filter: true, agency: false }
 */
export const toggleModal = (modalName, currentState) => ({
  ...currentState,
  [modalName]: !currentState[modalName],
});
