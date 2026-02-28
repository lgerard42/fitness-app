## Project Topic Overview — Finalizing the MOTIONS Taxonomy (Foundation of the Exercise Configurator)

### Context

The **MUSCLES table is finalized and locked** (no changes allowed). The next critical step is to finalize the **MOTIONS table**, which is the **foundation of the entire exercise configurator + scoring system**.

In the app UI, a user will:

1. pick the **muscle(s)** they want to target (from the locked **MUSCLES** table), then
2. pick the **motion** they want to perform (from **MOTIONS**).

So, the MOTIONS table must represent the **highest-level exercise building blocks** that a real resistance-training user/bodybuilder would look for when configuring a lift.

---

### What “MOTIONS” means in this system

“Motions” are not just abstract biomechanics primitives. They are the **baseline exercise categories** where we assign **baseline `muscle_targets`**.

A motion (or motion-variation) should exist as its **own MOTION row** when the variation changes targeted muscles **enough** that it’s better to give it its own baseline `muscle_targets`—instead of trying to recreate it by stacking a large number of delta rules later.

Example intent:

* `CHEST_PRESS` has a general baseline target distribution.
* `CHEST_PRESS_INCLINE` exists as a child because incline meaningfully changes the baseline distribution (big enough difference that it shouldn’t be “manufactured” via heavy deltas).

---

### Scope of this discussion

This discussion is ONLY about making the **MOTIONS taxonomy perfect**.

**We are working ONLY on these columns:**

* `id` (we can rename anything; the final IDs must be consistent)
* `parent_id` (single-parent max: 0 or 1 parent)
* `motion_type` (new column; see below)

**Everything else in the motions table is out of scope** for this session (no fine-tuning muscle_targets, no detailed delta rules).

---

### `motion_type` column (new)

Add a new column: `motion_type` with exactly one of these values:

* **Umbrella**
  Grouping-only motion. No baseline scores. Used to aggregate/view results across children in the UI.
* **Standard**
  Normal training motion. Will have baseline scores.
* **Rehab**
  Primarily therapeutic/prehab motion. Will have baseline scores, and may be filtered differently in the UI later.
* **Mixed**
  Commonly used both for training and rehab/prehab. Will have baseline scores, and may be shown in both contexts in the UI later.

Important: `motion_type` is **classification metadata for organization + future UI filtering**. It is not meant to drive scoring logic in this discussion.

---

### Key structural rules

* **Single-parent hierarchy:** every motion has at most **one** `parent_id`.
* **Parent should precede child in naming/structure:** e.g.
  `CHEST_PRESS` → `CHEST_PRESS_INCLINE` (not reversed).
* **We can add/delete motions freely.** The current `motions.csv` is treated as a rough first draft.

---

### “Umbrella vs Baseline” concept (mirrors MUSCLES)

We will likely have umbrella/grouping motions (roots/families) that exist to make browsing and analytics intuitive (e.g., viewing all “Chest Press” variations together), while individual child motions exist when they deserve distinct baseline targeting.

---

### Scope boundaries

* Focus is **resistance training** broadly (including rehab-like resistance actions such as external rotation).
* Cardio is not a priority for now.
* It’s acceptable if some muscles are only strongly expressed via deltas on broader motions later.

---

### Success criteria for ending this session

We are done when:

1. Everyone agrees the **MOTIONS taxonomy (`id`, `parent_id`, `motion_type`)** is *perfect* for real-world use and long-term system design, and
2. We do a quick sanity check that the chosen motion baselines won’t force **unrealistic delta gymnastics** downstream.

Next sessions (not this one): we’ll go motion-by-motion to finalize baseline `muscle_targets`, then finalize delta modifier tables/configs afterward.
