The chunky, raised button for every action: a solid face over a darker bottom edge that flattens when pressed.

- `variant`: `primary` (red, the one main action on a screen), `secondary` (yellow, Continue / next step), `outline` (white, Cancel or Skip), `ghost` (text only, Maybe later), `danger` (red tint, Delete).
- `size`: `md` (default) or `sm` for rows, tables and toolbars.
- `fullWidth` defaults to `true`; pass `fullWidth={false}` whenever buttons sit side by side.
- `loading` swaps the label for a spinner and disables the button.
- Passes through native button props: `onClick`, `type`, `disabled`, `className`.
- Labels are short verbs; the component upper-cases them. One primary per view.
