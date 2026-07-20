💡 What: Added dynamic `aria-live` announcements when conflict items are assimilated or discarded, and added `aria-describedby` hints for keyboard shortcuts in the synthesis textarea.
🎯 Why: When items are removed from lists via inline actions, the visual change is obvious, but screen readers are silent, leaving users unsure if the action succeeded. Additionally, keyboard shortcuts for textareas need to be discoverable for non-visual users.
📸 Before/After: Visuals are unchanged (enhancements are screen-reader only using `.sr-only`).
♿ Accessibility: Improves WCAG compliance for dynamic content updates and keyboard navigability discoverability.
