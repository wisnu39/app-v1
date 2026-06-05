# Lint Fix Report

## Summary
The lint pipeline for apps/api is now operational and succeeds after installing the missing dependency and correcting parser/type issues.

## Fixes applied
1. Installed the missing eslint dependency: typescript-eslint.
2. Updated ESLint parser configuration to allow spec files to be parsed by the project service.
3. Updated TypeScript config so spec files are included in the project service context.
4. Fixed an explicit return type on Permission decorator.
5. Removed unsafe casts and unbound-method warnings in the user repository.
6. Fixed a health controller enum comparison warning.
7. Rewrote affected specs to use typed test doubles.

## Validation evidence
- Full command run: npm run lint && npm run type-check && npm run build && npm test -- --runInBand
- Result: success
- Lint output: 0 errors, 10 warnings
- Type-check: success
- Build: success
- Tests: 3 suites passed, 16 tests passed

## Notes
- The remaining warnings are console statements in seed code paths.
- No production behavior or endpoint contracts were changed.
