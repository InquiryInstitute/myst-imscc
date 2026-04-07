# myst-imscc

Build **IMS Common Cartridge** (`.imscc`) and **Jupyter Book** projects from a **MyST** course repo, render **GitHub Pages** via [`@inquiryinstitute/imscc-pages`](https://github.com/InquiryInstitute/imscc-pages) (same tree an LMS imports), and **sync** per-variant repositories (e.g. `InquiryInstitute/aima-basic`).

## Install

```bash
npm install github:InquiryInstitute/myst-imscc
```

Peer usage expects `mystmd` (bundled as a dependency of this package).

## Workflow

1. Author MyST under `course/myst/` (or your configured path).
2. Use variant blocks to tailor content per delivery mode:

   ```markdown
   <!-- myst-imscc-variant: codespace -->
   Use GitHub Codespaces for this assignment.
   <!-- /myst-imscc-variant -->
   ```

3. `myst-imscc build --config course/myst-imscc.config.json` — runs MyST `build --html --ci`, packages `course.imscc`, renders `docs/` from the cartridge.
4. `myst-imscc build-all --config … --push` — repeats for every variant in `variants.json`, wipes sibling repos (`../aima-*`), copies `docs/`, `course.imscc`, optional `jupyter-book/`, then commits and pushes.

## Config (`myst-imscc.config.json`)

| Field | Meaning |
|--------|---------|
| `courseTitle` | Title in manifest and Pages |
| `mystProject` | Path to MyST project (folder with `myst.yml`), relative to this file |
| `variantsFile` | JSON map of variant keys → metadata (default `variants.json`) |
| `organization` | GitHub org for display / naming |
| `repoPrefix` | Repo basename prefix (default `aima`) |
| `outputRoot` | Parent directory containing `aima-*` clones (default `..`) |
| `jupyterBook` | Optional `{ "chapters": [{ "path": "syllabus.md", "title": "Syllabus" }] }` |
| `repoRoot` | Path relative to the config file for the **monorepo root** (where `package.json` and hooks run). Default: `..` |
| `outputRoot` | Path relative to the config file for **sibling variant repos** (`aima-*`). Default: `..` |
| `beforeImsccHook` | ESM module (relative to config) exporting `beforeImscc(ctx)` — runs after MyST `build --html`, before IMS CC packaging. Used in aima for Polly TTS (delivery / dialogic). |
| `beforeMystBuildHook` | ESM module exporting `beforeMystBuild(ctx)` — runs after variant preprocessing, **before** `myst build`. Used in aima for **AI Dialogic** (`project.jupyter` / Thebe + Binder in `myst.yml`). |
| `jupyterBook` | Optional `binderRepo`, `binderRef`, `thebe` — **Thebe** defaults on when `variantKey === dialogic`. |

## CLI

```text
myst-imscc build --config course/myst-imscc.config.json [--variant basic] [--dry-run]
myst-imscc build-all --config course/myst-imscc.config.json [--push] [--variant basic]
```

## API

See `src/index.js` exports: `buildVariantPipeline`, `syncVariantToRepo`, `buildImsccFromMystHtml`, `buildJupyterBookProject`, etc.

## License

MIT — see [LICENSE](./LICENSE).
