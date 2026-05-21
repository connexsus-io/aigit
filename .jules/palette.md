## 2024-05-21 - Dynamic Title Announcement
**Learning:** For SPAs, screen readers fail to announce page transitions if the title tag remains static, and users lose track of tabs.
**Action:** Always implement a top-level route observer (e.g. `useLocation` with `document.title`) to dynamically announce view transitions.
