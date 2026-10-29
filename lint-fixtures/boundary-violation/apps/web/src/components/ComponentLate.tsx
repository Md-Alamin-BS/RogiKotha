// FX19 (violation): component source may not load a Node built-in with import() (BR1.4, BR3.3).
export const loadFs = async () => await import('node:fs');
