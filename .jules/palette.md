# Palette's Journal

## Critical UX/Accessibility Learnings
## 2026-04-02 - [Keyboard Accessibility & Disabled States]
**Learning:** Components frequently rely on framework specific utility classes (like Tailwind) for interactive state styling. When these frameworks aren't present or fully implemented, global interactive states (like focus and disabled) get overlooked, creating severe keyboard navigation barriers across the entire app.
**Action:** Add global `:focus-visible` and robust `:disabled` states in the baseline CSS to ensure every button, link, and input is keyboard accessible by default, regardless of individual component styling.
