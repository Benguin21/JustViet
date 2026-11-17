A centred dialog over a dimmed page, with a title bar and close button; Escape and clicking the backdrop close it.

- `title`, `onClose` (required), `children` (the body), `maxWidth` `md` | `lg` (default) | `xl` | `2xl`.
- Render it only while open. It is `position: fixed` and locks page scroll.
- Put forms inside with `flex flex-col gap-4` and end with a row of `Button`s (outline Cancel, primary action).
