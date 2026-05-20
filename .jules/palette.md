## 2024-05-20 - Dynamic Page Titles
**Learning:** Implementing dynamic `document.title` updates on route changes in a React SPA is a simple yet crucial accessibility enhancement for screen reader users and browser tab navigation.
**Action:** Always include a mechanism (like a `RouteAnnouncer` component using `useLocation` and `useEffect`) to update the title when building or refactoring React routing structures.
