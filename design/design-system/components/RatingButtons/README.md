The four spaced-repetition answers (Again, Hard, Good, Easy) under a flashcard, each showing the next interval and its number-key shortcut.

- `previews`: for each rating, an object whose `label` is the interval text ("10 min", "4 days").
- `onRate(rating)` fires with `"again" | "hard" | "good" | "easy"`; `disabled` greys all four.
- Two columns on phones, four from the `sm` breakpoint. Place it full width under the card.
