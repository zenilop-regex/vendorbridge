import ActivityLog from '../models/ActivityLog.js';

/**
 * Creates an audit log entry in the database.
 * @param {string} action - The action description (e.g. "RFQ-2026-0001 published")
 * @param {string} module - The target module ('RFQ', 'Vendor', 'PO', 'Invoice', 'Auth', 'Approval')
 * @param {string} actorName - The name of the user who performed the action
 * @param {string} [details] - Additional contextual details
 */
export const logActivity = async (action, module, actorName, details = '') => {
  try {
    const log = new ActivityLog({
      action,
      module,
      actorName,
      details
    });
    await log.save();
  } catch (error) {
    console.error('Failed to write audit activity log:', error);
  }
};
