# Claude Instructions

Before writing any code or taking any action in this repo, read **all** of the following.
If any file is missing, stop and tell the user which one is absent and how to regenerate it.

- [ARCHITECTURE.md](ARCHITECTURE.md) — component boundaries, APIs, interfaces, and scope
- [STYLE.md](STYLE.md) — linting, code style rules, and how to enforce them
- [DESIGN.md](DESIGN.md) — visual direction ("Soft Maritime Journal"), tokens, primitives, screen specs
- [PLAN.md](PLAN.md) — workstreams, scope, and status
- [TASKS.md](TASKS.md) — full task manifest: dependencies, unlocks, estimates, human requirements

## Issue tracking — beads (bd)

This project uses **bd (beads)** for live issue tracking. The markdown files (`PLAN.md`, `TASKS.md`) are the static plan manifest; **bd is the source of truth for live state** (claimed, in-progress, blocked, closed).

Run `bd prime` once per session for the full workflow context.

**Quick reference:**

```bash
bd ready                  # find available work
bd show <id>              # view issue details
bd update <id> --claim    # claim work atomically
bd close <id>             # complete work
bd dolt push              # push beads data to remote
bd remember "<note>"      # persistent knowledge — use this, not MEMORY.md
```

**Rules:**

- Use `bd` for ALL task tracking. Do NOT use TodoWrite, TaskCreate, or markdown TODO lists.
- Use `bd remember` for persistent knowledge. Do NOT create MEMORY.md files.
- Each `Tnnn` ID in `TASKS.md` maps to a bd issue via `.beads_map.json`. Treat the markdown Status fields as initial state only — query bd for current state.

## Picking up a task

1. Confirm the task belongs to your workstream before starting.
2. Update the **Current Task** field in `WORKSTREAM.md` as you begin.
3. Claim the task in bd: `bd update <id> --claim`.
4. When done: `bd close <id>` and clear **Current Task** in `WORKSTREAM.md`.

## Non-interactive shell commands

`cp`, `mv`, and `rm` are aliased to `-i` (interactive) on some systems and will hang the agent waiting for y/n input. **Always use the non-interactive forms:**

```bash
cp -f source dest         # not: cp source dest
mv -f source dest         # not: mv source dest
rm -f file                # not: rm file
rm -rf directory          # not: rm -r directory
cp -rf source dest        # not: cp -r source dest
```

Other commands that may prompt:

- `scp` / `ssh` — pass `-o BatchMode=yes` to fail instead of prompt
- `apt-get` — pass `-y`
- `brew` — set `HOMEBREW_NO_AUTO_UPDATE=1`

## Session completion

**Work is NOT complete until `git push` succeeds.** When ending a session, complete every step below:

1. **File issues for remaining work** — create bd issues for anything that needs follow-up.
2. **Run quality gates** (if code changed) — tests, linters, builds.
3. **Update issue status** — close finished work, update in-progress items.
4. **Push to remote — MANDATORY:**
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status   # MUST show "up to date with origin"
   ```
5. **Clean up** — clear stashes, prune remote branches.
6. **Verify** — all changes committed AND pushed.
7. **Hand off** — provide context for the next session.

**Hard rules:**

- Never stop before pushing. That leaves work stranded locally.
- Never say "ready to push when you are." YOU push.
- If a push fails, resolve it and retry until it succeeds.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
