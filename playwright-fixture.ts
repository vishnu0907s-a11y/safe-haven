// Re-export the base fixture from the package
import { test as base, expect } from '@playwright/test';

export const test = base;
export { expect };
