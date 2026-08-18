---
name: dsh-forge-plugin-implementation
description: Implement or continue the dsh-forge skill self-forging plugin for the DeepSeek Harness by creating host/client Cordis plugins, validating them, and wiring up git/npm publishing checks.
whenToUse: When the task is to build, extend, or resume work on a skill self-forging harness plugin (dsh-forge) that watches session traces and distills reusable skills, especially when the user intent is only '继续' and you must first inspect existing state before continuing.
---

1. Inspect the current harness state before writing anything.
   - Use `cordis_inspect_self` with the relevant pluginId/packageId to see what is already loaded.
   - Check for an existing forge output directory such as `<workspace>/.dsh-forge` with `Test-Path` and `Get-ChildItem`.
   - Inspect the harness profile path, typically `C:\Users\Administrator\.dsh\profiles\node_modules\@deepseek-ai`, to understand available packages and plugin conventions.

2. Create or locate the plugin project directory, e.g. `<workspace>/dsh-forge`.
   - If no `.git` exists, run `git init` in that directory.
   - Plan a structure with at least:
     - `lib/index.js` for the host-side Cordis plugin.
     - A client-side plugin file for the UI panel.
     - `package.json` with plugin metadata and main entry.
     - `README.md`, `README.zh.md`, and `LICENSE` for documentation and licensing.

3. Write the host-side plugin (`lib/index.js`).
   - Listen to session/tool events emitted by the harness.
   - Capture user intents and the ordered tool call sequence.
   - Distill each trace into one reusable skill with exactly these fields: `name` (kebab-case), `description` (one sentence), `whenToUse`, and `content` (markdown instructions).
   - Persist generated skill artifacts to the forge output directory, e.g. `<workspace>/.dsh-forge/`.
   - Expose RPC methods so the client side can request, preview, approve, or activate forged skills.

4. Write the client-side plugin.
   - Implement a 'forge furnace' panel in the active client UI.
   - Connect it to the host plugin through the harness RPC layer.
   - Allow the user to see proposed skills and approve/activate them.

5. Run syntax checks.
   - Execute `node --check` on every JavaScript file you created/modified.
   - Fix any syntax errors before continuing.

6. Inspect the forge output directory again.
   - Confirm that skill artifacts are being written under `.dsh-forge`.
   - Use `cordis_inspect_self` again to confirm the plugin is loaded and healthy.

7. Check authentication and publishing readiness.
   - Run `gh auth status` and `npm whoami` to see available identity.
   - Run `npm config get registry` to record the current registry.
   - If a fork remote already exists, try to reuse its embedded credentials to authenticate to GitHub Packages or npm.
   - Test connectivity with `npm ping --registry https://registry.npmjs.org/`.

8. Track progress and continue deliberately.
   - Use `todo_write` to mark completed implementation steps and list remaining publishing/verification work.
   - If the user intent is just '继续', never restart from scratch; inspect existing directories, git state, and loaded plugins, then continue from the last incomplete milestone.
