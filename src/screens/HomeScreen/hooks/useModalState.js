import { useState, useCallback } from 'react';
import { createInitialModalState, createInitialModalData } from '../utils/modalHelpers';

/**
 * Custom hook that encapsulates modal state management for HomeScreen.
 * Manages the open/closed state of all modals and their associated data.
 *
 * @returns {Object} Object containing modal state and handlers
 * @returns {Object} returns.modals - Object with boolean flags for each modal (e.g., { profile: false, filter: true, ... })
 * @returns {Object} returns.modalData - Object containing data associated with modals (e.g., { selectedAgency: null, selectedPackage: {...} })
 * @returns {Function} returns.openModal - Function to open a modal and optionally set associated data
 * @returns {Function} returns.closeModal - Function to close a modal and optionally reset associated data
 * @returns {Function} returns.updateModalData - Function to update modal data state
 *
 * @example
 * const { modals, modalData, openModal, closeModal, updateModalData } = useModalState();
 * // Open profile modal
 * openModal('profile');
 * // Open agency modal with data
 * openModal('agency', { selectedAgency: agencyObject });
 * // Close modal and reset data
 * closeModal('agency', true);
 * // Update modal data without opening/closing modal
 * updateModalData({ selectedPackage: packageObject });
 */
export const useModalState = () => {
  const [modals, setModals] = useState(createInitialModalState());
  const [modalData, setModalDataState] = useState(createInitialModalData());

  /**
   * Opens a modal and optionally sets associated data.
   * Sets the specified modal to true and merges provided data into modalData state.
   *
   * @param {string} name - Name of the modal to open (e.g., 'profile', 'filter', 'agency', 'packageDetail', 'verification', 'reservation', 'ar')
   * @param {Object} [data=null] - Optional data object to merge into modalData state
   *
   * @example
   * openModal('profile'); // Open profile modal without data
   * openModal('agency', { selectedAgency: { id: 1, name: 'Travel Co' } }); // Open with data
   */
  const openModal = useCallback((name, data = null) => {
    setModals(prev => ({ ...prev, [name]: true }));
    if (data) {
      setModalDataState(prev => ({ ...prev, ...data }));
    }
  }, []);

  /**
   * Closes a modal and optionally resets its associated data.
   * Sets the specified modal to false and optionally clears modal data if resetData is true.
   *
   * @param {string} name - Name of the modal to close (e.g., 'profile', 'filter', 'agency', 'packageDetail', 'verification', 'reservation', 'ar')
   * @param {boolean} [resetData=true] - If true, resets the associated data in modalData state. If false, preserves modal data.
   *
   * @example
   * closeModal('profile'); // Close and reset associated data
   * closeModal('agency', true); // Explicitly close and reset data
   * closeModal('packageDetail', false); // Close but preserve selectedPackage data
   */
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

  /**
   * Updates modal data without opening or closing any modal.
   * Merges the provided updates object into the modalData state.
   *
   * @param {Object} updates - Object containing data to merge into modalData state
   *
   * @example
   * updateModalData({ selectedAgency: { id: 2, name: 'Adventure Tours' } }); // Update agency
   * updateModalData({ selectedPackage: null }); // Clear package
   * updateModalData({ selectedAgency: null, selectedPackage: null }); // Clear both
   */
  const updateModalData = useCallback((updates) => {
    setModalDataState(prev => ({ ...prev, ...updates }));
  }, []);

  return { modals, modalData, openModal, closeModal, updateModalData };
};
