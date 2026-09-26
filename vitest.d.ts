/**
 * jest-dom ships separate augmentations for jest and for vitest. Naming the
 * package in tsconfig's `types` array pulls in the jest one, which leaves
 * `toBeInTheDocument` missing from vitest's `Assertion`. This reference picks
 * the right one.
 */
/// <reference types="@testing-library/jest-dom/vitest" />
