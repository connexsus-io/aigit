💡 What: Disabled sibling action buttons globally when any specific conflict item is being processed, and added a helpful tooltip (`Please wait for the current action to finish`) explaining the locked state.
🎯 Why: Prevents users from clicking multiple action buttons concurrently, avoiding UI race conditions, conflicting API calls, and silent failures while clearly communicating the system's loading state.
📸 Before/After: Sibling buttons remained enabled without tooltips when another action was in flight. Now, they are disabled with an explanatory tooltip.
♿ Accessibility: Ensures that keyboard users and screen reader users can reliably discover the disabled state and reason when interacting with the UI.
