/**
 * Toast notification utility for non-intrusive warnings and messages
 */

type ToastType = 'info' | 'warning' | 'error' | 'success';

/**
 * Show a toast notification
 */
export function showToast(
  message: string,
  type: ToastType = 'info',
  duration: number = 3000
): void {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = getToastIcon(type);
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Auto-remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Get icon for toast type
 */
function getToastIcon(type: ToastType): string {
  switch (type) {
    case 'info':
      return 'ℹ️';
    case 'warning':
      return '⚠️';
    case 'error':
      return '❌';
    case 'success':
      return '✅';
  }
}
