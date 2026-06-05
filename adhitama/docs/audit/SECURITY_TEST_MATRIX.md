# SECURITY TEST MATRIX

This document records security-focused auth coverage and invariant validation.

## Coverage Matrix

- Replay protection validated for password reset and email verification tokens.
- Tenant isolation validated for token lookups and session revocation.
- Audit emission validated for success, failure, and security rejection paths.
- Session revocation validated for logout and password reset success flows.
