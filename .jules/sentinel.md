## 2025-02-27 - [Timing Attack in Token Verification]
**Vulnerability:** Length-based early returns before `timingSafeEqual` comparison.
**Learning:** Returning early when string lengths mismatch (`if (provided.length !== expected.length) return false`) before a constant-time comparison leaks the length of the expected token via a timing side channel.
**Prevention:** Always hash both the provided and expected strings using a strong cryptographic hash (like SHA-256) before passing them to `timingSafeEqual`. This ensures the inputs are consistently sized (e.g., 32 bytes) preventing any length-based timing leaks.
