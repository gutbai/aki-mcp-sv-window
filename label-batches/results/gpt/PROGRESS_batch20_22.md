# GPT progress — batch 20–22

Updated: 2026-09-14 (VN time)

## Completed and pushed
- `batch_20`: complete 50/50, `label-batches/batch_20/RESULT.json`.
  - commit: `831bfd43349ff9bc4fcf7c8f39a10cc5ad4c02fd`
- `batch_21`: complete 50/50, `label-batches/batch_21/RESULT.json`.
  - commit: `4b01cb2be8b9a1ec3289b3c837f7cd90403d3b89`
  - lower-confidence matches are marked in `notes` for img039, img045, img048.

## Batch 22 handoff
- `batch_22` is **NOT complete; do not treat as benchmark-final**.
- Partial work is now pushed to `label-batches/batch_22/RESULT_PARTIAL.json`.
- Partial-result commit: `caf46810972a6659795829cd47cb6b1b7ae32d57`.
- 45/50 tasks have three coordinates recorded.
- 5 tasks remain unresolved and have `coords: null`: `img001`, `img010`, `img023`, `img030`, `img042`.
- `img010` and `img042` use the same scene; candidate-center details are preserved in `RESULT_PARTIAL.json`.
- Current best estimates that should receive a quick review before final submission are marked in `notes` for `img019`, `img022`, `img025`, `img028`, `img037`, `img039`, `img044`, `img048`.
- No official `label-batches/batch_22/RESULT.json` has been committed, so a handoff session can safely finish from the partial file without mistaking it for a completed submission.

## Image transport / reproduction
- Binary images were exported via temporary branch `tmp-gpt-export-batch20-22` and GitHub Actions rather than visually reading base64.
- GitHub Actions run: `34769155546`.
- Artifact: `label-batches-20-22` (artifact id `10320859077`).

## Coordination
Another session was assigned `batch_27` down through `batch_23`; this work covers `batch_20` through `batch_22` to avoid overlap.
