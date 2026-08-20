# Git Branching & Workflow Rules for Mikrotek Marzipano Importer

1. **Development Always on `dev` Branch**:
   - Every feature request, bug fix, or code change MUST be developed, tested, and committed strictly on the `dev` branch.
   - Never write code directly to `main`.

2. **Merge and Push to `main` Only Upon User Approval ("Oke")**:
   - Do NOT merge into `main` or push to `main` until the USER explicitly gives confirmation/approval (e.g., "oke", "merge to main", "push to main").

3. **Preserve Complete Commit History for Rollbacks**:
   - NEVER erase, squash, force-push rewrite (`push --force`), or hard-reset commit history in a way that loses history.
   - Maintain a clear, atomic commit history so that any previous commit can be easily inspected or rolled back if needed.
