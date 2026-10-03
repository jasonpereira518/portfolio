---
title: Orbit
short: Orbit
tagline: Networking intelligence platform
kind: flagship
group: flagship
order: 2
role: Solo build
dates: Jul 2026–present
status: Live prototype; used by me and a few pilot testers
summary: "A personal networking CRM for a job search: who you know, how warm they are, and who is drifting."
proof:
  - 466 commits
  - Exposes an MCP server
  - Free for the first 500 contacts
stack:
  - Next.js 16
  - React 19
  - TypeScript
  - Tailwind
  - shadcn/ui
  - Drizzle ORM
  - Neon Postgres
  - pgvector
  - Clerk
  - Stripe
  - Playwright
  - Vercel
links:
  - label: Live site
    href: https://orbit.jasonpereira.live
  - label: Repo
    href: https://github.com/jasonpereira518/orbit
cover: orbit.png
problem: "After events and coffee chats I couldn't remember who I'd met or what we'd discussed, so warm connections went cold before they turned into anything."
result: "466 commits. A working prototype in use by me and a small group of pilot testers, demoed at a UNC CS Founded showcase table, with end-to-end tests, per-page performance budgets, CI and error monitoring."
---

Paste raw notes and AI pulls out contacts, companies and context. Imports from LinkedIn, address books, calendar and Gmail are deduplicated into one record per person.

An interactive map clusters people by company and school, a chat answers questions over your own network, and follow-up cadences flag who is drifting. It also exposes an MCP server and ships a browser extension.
