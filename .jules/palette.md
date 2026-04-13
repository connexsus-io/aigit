# Palette's Journal

## Critical UX/Accessibility Learnings
## 2026-04-02 - [Keyboard Accessibility & Disabled States]
**Learning:** Components frequently rely on framework specific utility classes (like Tailwind) for interactive state styling. When these frameworks aren't present or fully implemented, global interactive states (like focus and disabled) get overlooked, creating severe keyboard navigation barriers across the entire app.
**Action:** Add global `:focus-visible` and robust `:disabled` states in the baseline CSS to ensure every button, link, and input is keyboard accessible by default, regardless of individual component styling.

## 2024-04-03 - Accessible Async Action Loading States
**Learning:** While this app uses distinct button classes with clear visual indicators, `aria-busy` and explicit spinning icons are often missing from async action submission buttons. This prevents screen reader users from understanding that an operation (like executing a search or database garbage collection) is actively in-progress, and visual users can be confused by the lack of clear loading state.
**Action:** When adding visual loading states (`animate-spin` on a `Loader2` icon), always pair them with the `aria-busy={loading}` attribute on the button/form to ensure screen-readers announce the progressing state.
## 2026-04-09 - Accessible Dynamically Rendered Form Elements\n**Learning:** When creating dynamically rendered form elements like textareas in a mapped list, global labeling isn't sufficient. Without unique uid=1001(jules) gid=1001(jules) groups=1001(jules),27(sudo),103(docker) and  linkages that incorporate the item's unique identifier (like `synth-heading-${item.id}`), screen readers cannot determine which label belongs to which input, and empty/disabled states can trap users without feedback.\n**Action:** When mapping over items to render forms or inputs, always construct unique IDs by combining a descriptive prefix with the data object's ID, and explicitly link labels to inputs. Additionally, when a submit button relies on input state, provide a disabled `title` to explain why it is inactive.\n
## 2026-04-09 - Accessible Dynamically Rendered Form Elements
**Learning:** When creating dynamically rendered form elements like textareas in a mapped list, global labeling isn't sufficient. Without unique `id` and `aria-labelledby` linkages that incorporate the item's unique identifier (like \`synth-heading-\${item.id}\`), screen readers cannot determine which label belongs to which input, and empty/disabled states can trap users without feedback.
**Action:** When mapping over items to render forms or inputs, always construct unique IDs by combining a descriptive prefix with the data object's ID, and explicitly link labels to inputs. Additionally, when a submit button relies on input state, provide a disabled `title` to explain why it is inactive.
## 2024-04-13 - [Destructive Action Confirmations]
**Learning:** Users can accidentally click destructive action buttons (like running Garbage Collection or Discarding context) and permanently lose data because there are no safeguards.
**Action:** Always wrap destructive actions in a `window.confirm` dialog to double check intent and provide context on what data might be lost.
