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

**Git LFS:** Variant repos include a `.gitattributes` rule so `course.imscc` is stored with **Git LFS** (large cartridges with embedded slides/audio can exceed GitHub’s 100MB blob limit). Install [Git LFS](https://git-lfs.com/) (`git lfs install`) on the machine that runs `--push`.

## Config (`myst-imscc.config.json`)

| Field | Meaning |
|--------|---------|
| `courseTitle` | Title in manifest and Pages |
| `mystProject` | Path to MyST project (folder with `myst.yml`), relative to this file |
| `variantsFile` | JSON map of variant keys → metadata (default `variants.json`) |
| `organization` | GitHub org for display / naming |
| `repoPrefix` | Repo basename prefix (default `aima`) |
| `outputRoot` | Parent directory containing `aima-*` clones (default `..`) |
| `repoRoot` | **Monorepo root** (where `package.json` / hooks run), relative to config. Default: `..` |
| `jupyterBook` | `{ "chapters": [...], "binderRepo"?, "binderRef"?, "thebe"? }` — **Thebe** in the emitted Jupyter Book defaults on when `variantKey === dialogic` (supplemental; dialogic still expects Codespaces + LLM at runtime). |
| `beforeImsccHook` | ESM module exporting `beforeImscc(ctx)` — after MyST HTML build, before IMS CC. |
| `beforeMystBuildHook` | ESM module exporting `beforeMystBuild(ctx)` — after preprocess, **before** `myst build`. |

## CLI

```text
myst-imscc build --config course/myst-imscc.config.json [--variant basic] [--dry-run]
myst-imscc build-all --config course/myst-imscc.config.json [--push] [--variant basic]
```

## API

See `src/index.js` exports: `buildVariantPipeline`, `syncVariantToRepo`, `buildImsccFromMystHtml`, `buildJupyterBookProject`, etc.

## License

MIT — see [LICENSE](./LICENSE).
