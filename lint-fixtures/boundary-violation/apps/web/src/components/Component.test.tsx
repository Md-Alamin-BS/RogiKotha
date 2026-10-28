// FX14 (control): a component test may import a Node built-in (BR2.5).
import { readFileSync } from 'node:fs';

export const componentTest = readFileSync;
