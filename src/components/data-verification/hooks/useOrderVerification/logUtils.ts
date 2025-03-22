
/**
 * Logger for debugging
 */
export const logDebug = (message: string, data?: any) => {
  console.log(`[OrderVerification] ${message}`, data || '');
};
