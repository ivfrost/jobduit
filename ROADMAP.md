# Roadmap

## Core

- improve smart company and posting matchers for saving, avoiding duplicates
- add posting history table for tracking changes
- passwordless login (passkeys)
- new users can signup via admin invite codes
- add rate limiting (including per-user caps on LLM calls)

## Applications & outcomes

- applied flow: confirm an application from the extension, with notes
- structured statuses: no reply, rejected, interview, offer (plus optional stage)
- reminders and prompt to action ("applied 10 days ago, no reply")

## Insights

- tag normalization (React / React.js / ReactJS; one tag)
- skill-gap view: skills frequent in saved postings that the user lacks, ranked by frequency
- pattern analysis across applications (what gets replies vs. not), shown only after ~15-20 applications
- LLM reading of notes for possible rejection reasons, clearly labelled as speculation
- mismatch flags: location, seniority, or language requirements that don't fit the profile

## CV tools

- CV upload
- parse check: show what text a parser extracts (broken columns, missing sections)
- CV vs. posting keyword match (present / missing terms)
- ATS formatting tips

## Extension polish

- fix the Analyzed counter vs. per-posting analyzed state
- strip site suffixes ("| LinkedIn") from titles and company names
- unambiguous or relative dates
- confirm step before deleting a posting
- search and filter on the postings list

## Distribution

- Proxmox CT installer (community-scripts)
- README screenshots and one-command install
- bring-your-own LLM key
- managed hosted version once the extension is solid
