# Roadmap

## Foundation

- improve smart company and posting matchers for saving, avoiding duplicates
- tag normalization (React / React.js / ReactJS; one tag)
- add posting history table for tracking changes
- add rate limiting (including per-user caps on LLM calls)
- new users can signup via admin invite codes

### Extension polish

- fix the Analyzed counter vs. per-posting analyzed state
- strip site suffixes ("| LinkedIn") from titles and company names
- unambiguous or relative dates
- polished confirm step before deleting a posting instead of alert
- search and filter on the postings list

## Application tracking

- applied flow: confirm an application from the extension, with notes
- structured statuses: no reply, rejected, interview, offer (plus optional stage)
- application notes that can be written at different stages
- reminders and prompts to action ("applied 10 days ago, no reply")
- skill-gap view: skills frequent in saved postings that the user lacks, ranked by frequency
- email connection (IMAP first) for job alert parsing and automatic status updates

## Smarter matching

- mismatch flags: location, seniority, or language requirements that don't fit the profile
- CV upload
- CV vs. posting keyword match (present / missing terms)

## Self-hosting & launch

- Proxmox CT installer (community-scripts)
- README screenshots and one-command install
- bring-your-own LLM key
- managed hosted version once the extension is solid

## Future ideas

- pattern analysis across applications (needs ~15-20 tracked applications to mean anything)
- LLM reading of notes for possible rejection reasons, clearly labelled as speculation
- CV parse check and ATS formatting tips
- passwordless login (passkeys)
- quizzes generated from the user's skill gaps (interview practice)
