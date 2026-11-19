# Lesson scripts

Every lesson is one plain-text file in this folder, named after its id
(`pron1-01-alphabet.txt`). The order of lessons, and which unit each belongs
to, lives in `../course.txt`, so moving a lesson never touches its file.

A build step (planned: `npm run lessons:build`) checks every file and turns it
into the JSON the lesson screen reads. Writers never think about layout: the
screen decides where the board, teacher, dialogue and buttons go on a phone or
a computer.

## The header

```
---
id: pron1-02-vowels        never changes once published (XP is tied to it)
title: The twelve vowels
kind: pronunciation        pronunciation | grammar | review
dialogue: en               en | mixed | vi (the language the teacher speaks)
cast: tuoi, vinh           only for two-teacher lessons; leave out otherwise
status: draft              draft | reviewed | recorded | live
---
```

- `id`: letters, digits, `-` and `_` only.
- `kind: pronunciation` puts two play buttons on every board item, one per
  accent. Other kinds show one button, in the accent the learner chose.
- `status`: only `live` lessons appear on the live site.

## Steps

**One teacher line is one step, and one press of Next.** Board commands
written above a teacher line happen when that line appears. The board keeps
everything until `CLEAR`.

### Teacher lines

```
TEACHER: Plain line.
TEACHER explain: Line with an expression.
TUOI encourage: In a two-teacher lesson, name the speaker: TUOI or VINH.
```

- Normal lessons use `TEACHER`. The app picks the teacher, so lesson text
  never names its own teacher.
- Two-teacher lessons (`cast: tuoi, vinh`) name the speaker on every line.
- Expressions: `neutral` (default), `welcome`, `explain`, `encourage`.
  Questions, right and wrong answers set their own.
- Keep each line to **160 characters** or fewer, so it fits a phone.
- **Vietnamese inside a teacher line goes in square brackets**: `put [có]
  before the verb`. Brackets tell the app which words are Vietnamese, for the
  dictionary lookup and their styling. Names (Cô Tươi, Hà Nội) don't need them.
- When `dialogue` is `vi`, add the English after `|`:
  `TEACHER: Chúng ta dùng [đã] khi … | We use đã when …`

### Board commands

All Vietnamese the learner should hear goes on the board. Every board item
gets play buttons; the teacher's lines are not recorded.

```
BOARD s1: Chào các em! | Hello, students!      a word, phrase or sentence (one recording)

WORDS w1: me, mê                                 a row of words, each its own recording
WORDS w2:                                        the same, with meanings
  an | safe, peaceful
  ăn | to eat

LETTERS abc: a ă â b c                           letter tiles; recordings are the letter names

CHANGE s1: Anh có ăn phở không? | Do you eat phở?   rewrite an item; new words animate in
MARK s1: có, không                               highlight words (or letters) in an item
POINT s1: south                                  make one accent's play button pulse
CLEAR                                            wipe the board
```

- Item names (`s1`, `w2`, `abc`) only need to be unique within the lesson.
- In `WORDS`, the play buttons play each word in turn. Words without a
  meaning reuse one given elsewhere in the course.
- Indented under an item:
  - `RECORD: …`, `RECORD south: …`, `RECORD north: …`: directions for the
    voice actor. They go on the recording sheet, never on screen. Write one
    whenever a teacher line describes what a recording sounds like.
  - `SOUTH: …` / `NORTH: …`: different wording for one accent (thìa / muỗng).
  - `VOICE: m` or `VOICE: f`: who says it, for example dialogues (later).

### Questions

```
TUOI ask: Which vowel do we make with unrounded lips?
  WRONG: [u] | Replay the pair. Make [u] first, then relax your lips.
  RIGHT: [ư] | Yes! For [ư], relax that rounding.
```

- `ask` in place of an expression turns the line into a question.
- Exactly one `RIGHT`. Every `WRONG` needs its own feedback after `|`.
  Feedback on `RIGHT` is optional (the teacher's stock "correct" line is used).
- Answers appear in the order written.
- Leave out "Try again!": the app handles retries.
- Aim for a question at least every 4 or 5 steps.

### Notes for writers and reviewers

Lines starting with `#` are ignored by the app. Conventions:

- `# NEW:` something added that wasn't in the draft.
- `# REVIEW:` a question for the native-speaker reviewer.
- `# DECIDE:` a decision for the course owner.

## Audio

Each recording is named after its accent and its exact text, so the same
word used in ten lessons is recorded once, and editing a board item's text
asks for a new recording automatically. Lessons can be written and played
before any audio exists; a missing recording just hides its button.

In the pronunciation unit, Cô Tươi records the Southern audio and Thầy Vinh
the Northern audio.
