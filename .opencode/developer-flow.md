# 🚦 Agentic Feature Development Workflow: Idea → PR

## 1. **Feature Ideation & Scoping**
- **Clarify the feature:** Write a concise description of the feature, its purpose, and expected user impact.
- **Check project guidelines:** Review AGENTS.md and README.md for privacy, kindness, and technical requirements.
- **Break down the feature:** List all sub-tasks (UI, backend, tests, docs, etc.) in a todo list.

## 2. **Branching & Environment Prep**
- **Create a feature branch:**  
  - Naming: `feature/<short-description>`
  - Example: `feature/char-counter`
- **Sync with main:**  
  - Pull latest changes from `main` to avoid conflicts.
- **Set up environment:**  
  - Install dependencies (`npm install`, `pip install -r requirements.txt`)
  - Copy `.env.example` to `.env` and fill required variables.

## 3. **Design & Planning**
- **Review architecture:**  
  - Read AGENTS.md, architecture docs, and relevant code files.
- **Plan implementation:**  
  - Decide where code changes will go (files, modules, UI components).
  - Update the todo list with specific, actionable steps.

## 4. **Implementation (Agentic Coding)**
- **Delegate technical work:**  
  - Use the specialist developer agent for all code changes.
- **Code in small increments:**  
  - Implement one sub-task at a time (backend, frontend, etc.).
  - After each change, run lint (`flake8 .`, `eslint .`) and relevant tests.
- **Document as you go:**  
  - Add docstrings, comments, and update docs if needed.

## 5. **Testing**
- **Unit tests:**  
  - Write/extend tests for new code (backend: pytest, frontend: JS unit tests).
- **Integration/E2E tests:**  
  - Add/modify Playwright E2E tests if feature affects user flows.
- **Run all tests:**  
  - `docker compose run web pytest`
  - `npm run e2e`
- **Fix all failures:**  
  - Iterate until all tests pass.

## 6. **Linting & Code Quality**
- **Run linters:**  
  - `flake8 .` for Python
  - `eslint .` for JS
- **Fix all lint errors:**  
  - Do not leave issues for CI to catch.

## 7. **Documentation**
- **Update docs:**  
  - README, AGENTS.md, or API docs as needed.
- **Document feature flags/env vars:**  
  - Update `.env.example` if new variables are added.

## 8. **Final Review**
- **Manual test:**  
  - Run the app locally, verify feature works as intended.
- **Check for secrets:**  
  - Ensure no secrets/keys are committed.
- **Review code for privacy, kindness, and security.**

## 9. **Commit & PR**
- **Stage changes:**  
  - `git add <relevant-files>`
- **Commit:**  
  - Write a clear, purpose-driven commit message (not just "Update").
- **Push branch:**  
  - `git push -u origin feature/<short-description>`
- **Create PR:**  
  - Use `gh pr create` or GitHub UI.
  - Fill out PR template: summary, motivation, test evidence, screenshots if relevant.
- **Verify CI passes:**  
  - Wait for CI to run, fix any issues if they arise.

## 10. **Merge & Cleanup**
- **After approval:**  
  - Merge PR into `main`.
- **Delete feature branch:**  
  - Clean up local and remote branches.

---

## 📝 Example Agentic Todo List

```
- [ ] Clarify feature requirements and expected impact
- [ ] Create feature branch from main
- [ ] Review architecture and relevant code files
- [ ] Update todo list with implementation steps
- [ ] Implement backend logic (models, routes, utils)
- [ ] Implement frontend changes (UI, JS)
- [ ] Write/extend unit and integration tests
- [ ] Run and fix all tests (backend, frontend, E2E)
- [ ] Run linters and fix all errors
- [ ] Update documentation and .env.example if needed
- [ ] Manual test feature locally
- [ ] Stage, commit, and push changes
- [ ] Create PR with summary and test evidence
- [ ] Verify CI passes and address any issues
- [ ] Merge PR after approval and clean up branches
```

---

## 🦾 Agentic Principles

- **Delegate technical work to specialist developer agent.**
- **Use todo lists to track every sub-task.**
- **Test and lint after every change.**
- **Never commit secrets or broken code.**
- **Document everything.**
- **Iterate until all tests and CI pass.**

---

## 📦 Proven Commands (jeetSocial)

- `flake8 .` — Python lint
- `docker compose run web pytest` — Backend tests
- `npm run e2e` — E2E tests
- `gh pr create` — Create PR
- `act` — Local CI test

---

**This workflow is proven in production and enforced by jeetSocial’s CI/CD and agentic guidelines.  
Follow every step, delegate technical work to the specialist developer agent, and you will deliver fully functional, well-tested features every time.**

If you want a printable checklist or a markdown template for your own workflow, just ask!
