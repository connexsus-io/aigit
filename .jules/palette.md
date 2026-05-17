## 2024-05-17 - Keyboard Accessible Copy to Clipboard Feedback
**Learning:** When replacing an interactive element (like swapping a copy icon for a checkmark on click) or providing ephemeral feedback, ensuring the element is accessible via screen readers requires dynamic ARIA label updates (`aria-label={copied ? "Copied" : "Copy"}`). Also, providing a visual tooltip (`title`) aids sighted users who rely on hover context, especially for icon-only buttons.
**Action:** Always pair `aria-label` and `title` updates when swapping icons for temporary success states in micro-interactions.
