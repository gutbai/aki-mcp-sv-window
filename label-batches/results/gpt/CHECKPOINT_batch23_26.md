# GPT visual-grounding checkpoint — batches 23–26

This is a recovery checkpoint created because the interactive labeling session was interrupted/retried.

- `RESULT.partial.json` files contain all 50 entries for each batch.
- `notes: "manual-reviewed"` = visually reviewed/corrected in the current session.
- `notes: "auto-match; REVIEW_PENDING"` = generated from the shape matcher and still needs visual review.
- `LOW_CONFIDENCE` marks matcher assignments that should be prioritized during review.
- Do **not** treat these partial files as final benchmark submissions until `REVIEW_PENDING` is cleared.

Current review counts:

- batch_23: 14 manual-reviewed, 36 pending (0 low-confidence)
- batch_24: 4 manual-reviewed, 46 pending (7 low-confidence)
- batch_25: 0 manual-reviewed, 50 pending (9 low-confidence)
- batch_26: 0 manual-reviewed, 50 pending (8 low-confidence)

batch_27 was already completed separately and is not included in this checkpoint.
