# Versioning and changelog

Every versionable unit (snippet, block, section, JS module) carries a version header and an inline changelog. This doc covers the shared format and policy. File-type-specific rules in `.claude/rules/` specify the syntax of the header, where the changelog lives, and what counts as an "interface change" for that type.

## Versioning

Semver applied to the unit's public interface, not its implementation:

- **Patch** (`v1.0.0` → `v1.0.1`) — bug fix with no interface change
- **Minor** (`v1.0.0` → `v1.1.0`) — additive: new param/setting/export, new accepted value
- **Major** (`v1.0.0` → `v2.0.0`) — breaking: removed/renamed param, changed default that flips behavior, changed signature

The version lives in a header comment at the top of the file. Exact syntax is file-type-specific.

## Changelog

An **interface changelog**, not a commit log. Git owns the commit log. This log answers "if I consume this, what has changed at each version?"

### Format

- One line per entry
- Order: newest on top
- Entry syntax: `vX.Y.Z — <change>`
- No dates, no authors (git has those)
- One entry per version bump; don't batch multiple changes across versions into one line

### When to add an entry

Add when bumping the version header — unless the bump is a pure patch with no interface effect (header still bumps, but no narrative is needed).

"Interface" is file-type-specific. See the rule for the file you're editing.

### Pruning

When releasing a major version (e.g. v2.0.0), drop or collapse pre-major entries. The file's full history belongs in git; the in-file changelog is only the current-major interface story.
