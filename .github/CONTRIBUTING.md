# Contributing to Softcurse's Chess

First off, thank you for considering contributing to **Softcurse's Chess**! It's people like you that make open-source a remarkable place to learn, build, and interact.

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to Contribute

There are many ways you can help out—it isn't all about writing code!

*   🐛 **Bug Reports**: Triaging crashes inside WebGL render loops, or isolating AI infinite parsing states. 
*   ✨ **Feature Requests**: Dreaming up aesthetic improvements or new soundscapes.
*   📖 **Documentation**: Polishing standard markdown boundaries, adding to `README` architecture descriptors, mapping Three.js implementations out simply for new users.
*   💻 **Code & Design**: Merging refactors or adding feature commits smoothly through PRs.

---

## Reporting Bugs

Before submitting a bug report, please check the existing issues to ensure it hasn't already been reported.

If you are opening a new bug report, use our provided `Bug Report Template` and include:
*   A clear and descriptive title.
*   The exact steps necessary to reproduce the problem.
*   What you expected to happen vs what actually occurred.
*   Operating system, Browser, and specific `Node`/`NPM` versions used when encountering the issue locally.

---

## Suggesting Features

We track feature requests via GitHub Issues using the `Feature Request` template. 
If your feature requires a fundamental shift in architecture (like rewriting all shaders natively in raw GLSL), please drop a Discussion topic first to ensure the core maintainers are aligned on the implementation direction prior to writing any complex code blocks.

---

## Development Setup

To get a native environment spinning on your local rig so that you can dive into the code:

1.  **Fork and Clone the Repository:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/Softcurse-Chess.git
    cd Softcurse-Chess
    ```

2.  **Add the Upstream:**
    ```bash
    git remote add upstream https://github.com/Beardicuss/Softcurse-Chess.git
    ```

3.  **Install Node Dependencies:**
    Please ensure you are operating under at least Node.js v18+.
    ```bash
    npm install
    ```

4.  **Run the Local Server:**
    ```bash
    npm run dev
    ```
    This bridges Vite's Hot-Module Replacement server natively. Point your web browser to `http://localhost:5173`. 

---

## Making Changes

### Branch Naming Conventions
Keep your branch namespaces crisp so we know immediately what's happening.

*   `feat/your-feature-name` (For brand new features!)
*   `fix/your-fix-name` (For specific bug resolutions)
*   `docs/api-cleanup` (Documentation and markdown updates only)
*   `refactor/mesh-loading` (Aesthetic updates, engine architecture adjustments under the hood)

### Commit Message Conventions
We adhere to **Conventional Commits** syntax explicitly:

*   `feat: added volumetric global illumination parameters`
*   `fix: stopped AI from infinite while-locking the main execution thread`
*   `chore: updated Vite backend bundler libraries`
*   `docs: expanded contributing protocols`

### Keeping in Sync
Periodically jump to your main branch, pull upstream shifts, and rebase onto your working branch to maintain a clean history.
```bash
git checkout main
git pull upstream main
git checkout feat/my-great-update
git rebase main
```

---

## Submitting a Pull Request

Whenever you're ready, deploy a PR cleanly via the GitHub UI interface using our integrated Pull Request format. 

**Review the checklist before submitting:**
* [ ] Does the `npm run build` command exit safely without strict minification breaking chunks?
* [ ] Do `eslint` linting guidelines strictly pass?
* [ ] Is your work focused entirely on one primary issue? (Break massive multi-system rewrites down cleanly!)

**What to expect:**
A maintainer will generally respond within 2-3 business days. Be prepared to address small formatting feedback quickly!

## Getting Help

If you have questions, join the discussion explicitly over GitHub Issues/Discussions. Thanks again for participating in making Softcurse's Chess flawless!
