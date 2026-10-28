// FX4 (violation): components never import server files other than actions (BR2.4).
import { auth } from '../server/auth';

export const componentAuth = auth;
