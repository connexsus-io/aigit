## 2024-05-16 - Screen Reader Context in Generic UI Lists
**Learning:** In React components rendering lists (like search results or conflict items) using non-semantic `<div>` elements instead of `<ul>`/`<li>`, screen readers fail to group the items or announce list context, and visually obvious text blocks lack structural meaning.
**Action:** Always add `role="list"` to the container and `role="listitem"` to iteration elements. Use a standard `.sr-only` utility class to prefix visually ambiguous text blocks (like memory contents or result snippets) with context labels (e.g., `<span className="sr-only">Result content: </span>`).

## 2024-05-17 - Screen Reader Announcements for Dynamic Deletions
**Learning:** When users perform inline actions that remove an item from a list (e.g., dismissing an alert or resolving a conflict), visually the item disappears, but screen readers remain silent, leaving users uncertain if the action succeeded.
**Action:** Implement an invisible `aria-live="polite"` region and dynamically update its text (e.g., "Conflict from feature-branch assimilated") upon successful completion of the destructive/resolution action.

## 2024-05-19 - Inline Action Accessibility
**Learning:** Inline icon-only actions (like "Copy") that solely rely on visual indicator changes (like an icon swap) fail to inform screen reader users that the action succeeded.
**Action:** For visually silent asynchronous or inline actions, use an invisible `aria-live="polite"` region combined with temporary text state updates to ensure assistive technologies announce success.
