A small modal that asks before a destructive or sweeping action, with Cancel and a confirm button.

- `title` as a question ("Delete this card?"), `description` naming the consequence, `confirmLabel` (default "Confirm"), `onConfirm`, `onCancel`.
- `danger` (default `true`) styles the confirm button as danger; set `danger={false}` for non-destructive actions (it becomes primary).
