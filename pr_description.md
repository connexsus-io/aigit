💡 What:
Introduced a separate `isRefreshing` state in `context-ui/src/pages/Graph.tsx` to handle background data fetching.

🎯 Why:
Previously, clicking the "Refresh Graph" or "Try Again" buttons reused the initial `loading` state. This caused the entire component to unmount its data and flash a full-page loading spinner, resulting in a jarring layout shift. By separating the initial load state from the background refresh state, the existing graph or error state remains visible while updating.

📸 Before/After:
Before: Clicking refresh triggered a full-page loading state, replacing content.
After: Clicking refresh shows a spinning icon on the button itself ("Scanning...") while keeping the content (or error) mounted and stable.

♿ Accessibility:
Maintained correct `aria-busy` and `disabled` attributes on the buttons by updating them to respect both the `loading` and `isRefreshing` states, ensuring screen readers announce the progressing background state.
