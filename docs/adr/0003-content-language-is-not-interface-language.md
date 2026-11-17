# 3. Keep content language separate from interface language

Status: accepted

## Context

The interface is available in 22 languages. Claims and sources are written by people,
in the language they were published in. Translating a claim changes what it says, and
a mistranslated claim on an evidence platform is a factual error.

## Decision

Only the interface is translated. A claim, its evidence and its sources keep the
language they were written in, recorded in a `language` column and exposed in the markup
with `lang` and `dir="auto"`. A page in one language can therefore show a claim in
another, and says so to assistive technology.

The list of supported interface languages lives in one registry
(`src/lib/i18n/locales.ts`) with each language's name, direction and script. Fonts,
direction, the language switcher, the offline page and the checks all read from it.

Translation quality is checked by tools, not assumed. `pnpm locales:check` fails the
build on a missing key, a broken ICU message or a changed placeholder.
`pnpm locales:report` lists strings that still look untranslated.

## Consequences

- The translations were written without native-speaker review and must be reviewed
  before production use. [translations.md](../translations.md) describes how.
- Status names are worded as states of the evidence. A translation that turns one into a
  verdict ("true", "false") is a defect, and the review guide says so.
- Search matches the text as written; it does not translate queries.
