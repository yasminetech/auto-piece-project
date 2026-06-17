# TODO - UI/UX Redesign (Premium Automotive)

## Phase 1 — Motion system + Topbar behavior (Store)
- [x] Add CSS motion primitives: cinematic enter/exit + reveal-on-scroll + reduced-motion fallbacks in `frontend/src/styles.css`.
- [x] Implement store topbar auto-hide/show on scroll direction in `frontend/src/App.tsx` using `document.body.dataset.storeTopbarVisibility`.
- [x] Add store nav hide/show CSS behavior in `frontend/src/styles.css`.


## Phase 2 — Cinematic section/page feel
- [ ] Add lightweight section enter animations (no routing changes) for storefront transitions (detail focus, view switch, admin/store switch) via class toggles/data attributes.

## Phase 3 — Scroll reveal system
- [ ] Add IntersectionObserver in `frontend/src/App.tsx` and `frontend/src/AdminPanel.tsx` to apply reveal states on elements.

## Phase 4 — Admin UX polish
- [ ] Add reveal/enter animations for admin section switches in `frontend/src/AdminPanel.tsx`.

## Phase 5 — QA
- [ ] Verify light/dark theme parity.
- [ ] Verify mobile drawer + header visibility.
- [ ] Verify tables and cards remain performant (no layout thrash).
- [ ] Run `frontend` build/dev to catch TS/CSS issues.

