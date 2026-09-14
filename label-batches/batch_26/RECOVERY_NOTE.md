# Batch 26 recovery checkpoint

The ChatGPT labeling session repeatedly hit message-stream timeouts.

Status:
- `batch_26_img001..img040`: review session reached these images; coordinates are stored in `RESULT.recovery.reviewed-through-040.json`.
- `batch_26_img041..img050`: not fully reviewed after the last timeout; preserved as pending in the recovery JSON.
- `batch_26_img041` and `batch_26_img047` remain marked `LOW_CONFIDENCE` in the unfinished tail.
- This is intentionally a PARTIAL/RECOVERY checkpoint, not the final benchmark submission.
- `batch_23`, `batch_24`, and `batch_25` were already finalized and pushed separately.
- `batch_27` was already finalized separately.

Resume from `batch_26_img041`.
