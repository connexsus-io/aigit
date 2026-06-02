# Palette's Journal

## Critical UX/Accessibility Learnings
## 2026-04-02 - [Keyboard Accessibility & Disabled States]
**Learning:** Components frequently rely on framework specific utility classes (like Tailwind) for interactive state styling. When these frameworks aren't present or fully implemented, global interactive states (like focus and disabled) get overlooked, creating severe keyboard navigation barriers across the entire app.
**Action:** Add global `:focus-visible` and robust `:disabled` states in the baseline CSS to ensure every button, link, and input is keyboard accessible by default, regardless of individual component styling.

## 2024-04-03 - Accessible Async Action Loading States
**Learning:** While this app uses distinct button classes with clear visual indicators, `aria-busy` and explicit spinning icons are often missing from async action submission buttons. This prevents screen reader users from understanding that an operation (like executing a search or database garbage collection) is actively in-progress, and visual users can be confused by the lack of clear loading state.
**Action:** When adding visual loading states (`animate-spin` on a `Loader2` icon), always pair them with the `aria-busy={loading}` attribute on the button/form to ensure screen-readers announce the progressing state.
## 2026-04-09 - Accessible Dynamically Rendered Form Elements
**Learning:** When creating dynamically rendered form elements like textareas in a mapped list, global labeling isn't sufficient. Without unique `id` and `aria-labelledby` linkages that incorporate the item's unique identifier (like \`synth-heading-\${item.id}\`), screen readers cannot determine which label belongs to which input, and empty/disabled states can trap users without feedback.
**Action:** When mapping over items to render forms or inputs, always construct unique IDs by combining a descriptive prefix with the data object's ID, and explicitly link labels to inputs. Additionally, when a submit button relies on input state, provide a disabled `title` to explain why it is inactive.
## 2024-04-13 - [Destructive Action Confirmations]
**Learning:** Users can accidentally click destructive action buttons (like running Garbage Collection or Discarding context) and permanently lose data because there are no safeguards.
**Action:** Always wrap destructive actions in a `window.confirm` dialog to double check intent and provide context on what data might be lost.
## 2026-04-16 - [Empty State Discoverability]
**Learning:** Search interfaces often load blank or without contextual guidance, leaving users to guess what queries are effective. An initial "Ready to Search" empty state serves as an implicit tutorial, reducing cognitive load and preventing a broken-page feel before the first interaction.
**Action:** When implementing or refining search interfaces, always provide an initial visual state (when query is empty and no search has been executed) that clearly instructs the user on the purpose of the search and how to begin.

## 2024-04-14 - Empty State Disabled Inputs
**Learning:** Empty states in input fields (like the Search bar) should disable the primary submission button. However, simply disabling the button can leave screen-reader users and visual users confused about *why* the button is inaccessible without feedback.
**Action:** Always add a descriptive `title` attribute to the button detailing the reason for its disabled state (e.g., `title="Please enter a search query"`) when it depends on an empty input.
## 2024-04-19 - Focus Management in In-Place Forms
**Learning:** Replacing an interactive element (like a button) with an inline form (like a textarea) causes the original element to unmount. If the newly mounted input does not have `autoFocus`, keyboard focus is lost and resets to the document body, forcing keyboard users to tab through the entire page again.
**Action:** Always use the `autoFocus` attribute on the primary input when an inline edit form is toggled. Additionally, implement standard keyboard cancellation patterns (like `Escape` to cancel and `Cmd/Ctrl + Enter` to submit) to restore the previous state fluidly.

## 2024-04-14 - Keyboard Accessibility for Inline Forms
**Learning:** In React components (like in `context-ui`), when conditionally rendering an inline form to replace an interactive element (e.g., the synthesize area in Conflicts.tsx), keyboard focus is easily lost if the user has to click into the text area.
**Action:** When conditionally rendering an inline form, always use the `autoFocus` attribute to immediately transfer focus. Additionally, implement `onKeyDown` handlers for `Escape` (to cancel) and `Cmd/Ctrl + Enter` (to submit) to ensure the inline form is fully keyboard accessible without forcing mouse interaction.

## 2024-04-24 - Visual Keyboard Shortcut Hints
**Learning:** Keyboard accessibility features (like supporting `Escape` to cancel or `Cmd/Ctrl + Enter` to submit) are highly effective, but often go unused because they are undiscoverable visually, trapping users who may prefer keyboard interactions but don't know they exist.
**Action:** When implementing keyboard shortcuts for inline forms or interactive elements, always explicitly render a visual hint (e.g. using a `<kbd>` element with `aria-hidden="true"`) near the corresponding action button.

## 2026-04-29 - [Accessible Initial Page Loading States]
**Learning:** Throughout the application, initial page load states were simple text divs without ARIA roles or loading indicators. This creates layout jumping when content loads and fails to notify screen readers of the initial loading state.
**Action:** Always wrap initial page loading states in a visual container (like a glass-card), include a spinning loader icon, and attach role="status" and aria-live="polite".

## 2026-05-07 - Focus Management on State Reset
**Learning:** When clearing a search or resetting a state that unmounts the triggering button (like the 'Clear Search' button in an empty state), keyboard focus is lost and resets to the document body, causing a poor keyboard navigation experience.
**Action:** Always programmatically return focus to the primary logical input (e.g., the search bar) using a `ref` when a reset action is triggered, wrapping it in a `setTimeout` to ensure it fires after React unmounts the current element.
## 2025-05-10 - Focus restoration after conditional unmount

**Learning:** When an item is successfully removed from a dynamic list in React (e.g. after a submit/assimilate action), attempting to restore focus to its original triggering button using a `ref` will fail because the button is unmounted from the DOM.
**Action:** Only restore focus to triggering elements on non-destructive actions (like 'Cancel' or 'Escape'). If the action removes the element, let standard focus management apply or explicitly shift focus to a stable parent container instead.

## 2026-05-12 - Unhandled empty arrays cause false-positive success states
**Learning:** If a network request fails without explicit error handling, and the initial state of `items` is an empty array (`[]`), the UI might erroneously present a "Success" or "Clean" state instead of an error message.
**Action:** Always include an explicit `error` state, catch network failures, and display an actionable error UI with a retry button instead of defaulting to the empty state logic.
## 2026-05-16 - Prevent Silent API Failures in Search
**Learning:** Network errors in search or autocomplete fields often fail silently and default to "empty state" UI, misleading users into thinking their query returned zero results rather than indicating a system error.
**Action:** Always wrap API search calls in explicit error catching, setting a dedicated `error` state. Conditionally render a user-friendly error block (e.g., "Search Failed") with an actionable retry button, overriding the empty state logic when an error is present.

## 2024-05-17 - Keyboard Accessible Copy to Clipboard Feedback
**Learning:** When adding copy-to-clipboard micro-interactions, icon-only feedback must remain understandable to screen-reader and sighted users after the icon changes.
**Action:** Pair temporary success icons with dynamic `aria-label` and `title` values so the control clearly announces and displays the copied state.

## 2024-05-24 - Dynamic Document Title Updates for SPAs
**Learning:** In React SPAs utilizing standard client-side routing (like `react-router-dom`), standard page transitions do not trigger a full page reload, meaning the `<title>` element remains static. This is a severe accessibility issue because screen readers rely on the title change to announce a successful navigation and to inform the user of their new context.
**Action:** When implementing or modifying an SPA with client-side routing, always utilize a listener (such as `useLocation` and `useEffect`) to dynamically update `document.title` based on the current active route, ensuring users utilizing assistive technologies are explicitly notified of view changes.

## 2024-05-30 - [Input Cancellation Discoverability]
**Learning:** Search inputs often require manual interaction to clear the text. By introducing standard keyboard cancellation patterns (like `Escape` to clear) and matching them with a visual hint (`<kbd>Esc</kbd>`) next to the action button, we dramatically improve discoverability and keyboard accessibility for users.
**Action:** When adding clear functionality to a search input, always map the `Escape` key to trigger the clear action (if the query is not empty), and add a visual `<kbd>Esc</kbd>` hint next to the clear button to ensure discoverability and keyboard accessibility.

## 2026-05-20 - Accessible Dynamic Inline Results
**Learning:** When an async operation completes (like a database GC), rendering an inline result block without an ARIA role or live region causes screen readers to remain completely silent, leaving users unaware of the success or failure.
**Action:** Always attach `role="status"` (or `role="alert"` for errors) and `aria-live="polite"` to dynamically rendered inline result blocks so assistive technologies announce the outcome immediately. Additionally, ensure decorative status icons within the result block use `aria-hidden="true"`.
