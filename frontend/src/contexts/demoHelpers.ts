/**
 * Helper functions for demo mode
 * Separated from DemoContext to comply with react-refresh/only-export-components
 */

/**
 * Enter demo mode by setting localStorage and reloading the page
 */
export const enterDemoMode = (): void => {
  localStorage.setItem('demoMode', 'true');
  window.location.reload(); // Reload to trigger context update
};

/**
 * Exit demo mode by removing from localStorage and reloading the page
 */
export const exitDemoMode = (): void => {
  localStorage.removeItem('demoMode');
  window.location.reload(); // Reload to trigger context update
};
