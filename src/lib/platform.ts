const IS_APPLE = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Keyboard hint for the user's system: `⌘K` on Apple devices, `Ctrl+K` elsewhere. */
export const shortcut = (key: string) => (IS_APPLE ? `⌘${key}` : `Ctrl+${key}`);
