// FX2 (violation): component source may not import a Node built-in (BR3.3).
import { readFileSync } from 'node:fs';

export const componentBad = readFileSync;
