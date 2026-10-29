// FX20 (violation): components import the shared helpers, so helper source may not import a Node
// built-in either (BR3.3, FD-093 (6)).
import { readFileSync } from 'node:fs';

export const sharedNode = readFileSync;
