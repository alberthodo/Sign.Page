/** Native overlay input for drop zones (direct click, no programmatic .click()). */
export const FILE_INPUT_OVERLAY_CLASS =
  "absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0";

/**
 * Programmatic file picker — prefer <label htmlFor> when possible.
 * Uses showPicker() when available (Chrome/Safari 16+), else deferred .click().
 */
export function openFileDialog(input: HTMLInputElement | null | undefined) {
  if (!input || input.disabled) {
    return;
  }

  const open = () => {
    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    } catch {
      // Fall through to .click()
    }
    input.click();
  };

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(open);
  });
}
