# Palette's Journal

## Critical UX/Accessibility Learnings
## 2026-04-02 - [Keyboard Accessibility & Disabled States]
**Learning:** Components frequently rely on framework specific utility classes (like Tailwind) for interactive state styling. When these frameworks aren't present or fully implemented, global interactive states (like focus and disabled) get overlooked, creating severe keyboard navigation barriers across the entire app.
**Action:** Add global `:focus-visible` and robust `:disabled` states in the baseline CSS to ensure every button, link, and input is keyboard accessible by default, regardless of individual component styling.

## 2024-04-03 - Accessible Async Action Loading States
**Learning:** While this app uses distinct button classes with clear visual indicators, `aria-busy` and explicit spinning icons are often missing from async action submission buttons. This prevents screen reader users from understanding that an operation (like executing a search or database garbage collection) is actively in-progress, and visual users can be confused by the lack of clear loading state.
**Action:** When adding visual loading states (`animate-spin` on a `Loader2` icon), always pair them with the `aria-busy={loading}` attribute on the button/form to ensure screen-readers announce the progressing state.

## 2024-04-04 - Programmatic Associations for Conditional Inputs
**Learning:** React conditional rendering frequently leads to unlabelled inputs. When form fields dynamically appear (like an inline editing textarea), developers often rely on visual context (an adjacent `<h4>`) instead of proper programmatic association. Without `aria-labelledby`, screen reader users get no context for the new input. Additionally, submitting empty states can trigger errors without user feedback.
**Action:** Always provide programmatic label associations for conditionally rendered inputs using `id` on the heading and `aria-labelledby` on the input. Disable submission buttons when the input is empty, and provide a descriptive `title` tooltip so users know why the action is restricted.
