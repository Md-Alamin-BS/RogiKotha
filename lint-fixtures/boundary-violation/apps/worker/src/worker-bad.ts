// FX8 (violation): the worker never imports Better Auth, installed or not (BR3.4, AD-6).
import { betterAuth } from 'better-auth';

export const workerBad = betterAuth;
