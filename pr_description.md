💡 What:
Updated static `aria-label` attributes on dynamically changing buttons (like "Refresh", "Try Again") to dynamic values that always contain the visible button text across all states (e.g., loading states). Affected files: `Conflicts.tsx`, `Dashboard.tsx`, and `Graph.tsx`.

🎯 Why:
To comply with WCAG 2.5.3 (Label in Name). Previously, the visible text inside buttons changed dynamically during async loading operations, but the static `aria-label` did not. Because `aria-label` overrides visible text for assistive technologies, screen readers would not announce the loading state change, and the disconnect between visible text and accessible name constituted an accessibility violation.

📸 Before/After:
Before: The visible text was `Retrying...` but the screen reader announced `Retry loading conflicts`.
After: The visible text is `Retrying...` and the screen reader announces `Retrying loading conflicts...`.

♿ Accessibility:
Prevents WCAG 2.5.3 (Label in Name) violations and ensures screen reader users correctly receive auditory feedback on dynamic loading states.
