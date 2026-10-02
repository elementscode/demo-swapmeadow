![Swapmeadow, a neighborhood marketplace built with Elements: the Maple Hill listings grid with photos, prices, Free listings, saved hearts and a Pending bike.](https://elements.dev/demos/01a0f3f0-6a71-7c35-9b88-bc3992ca1a54/poster?v=c5dfbd636791)

# Swapmeadow

> A demo app built with [Elements](https://elements.dev).

Photo listings, priced or free, neighborhood search, buyer-seller threads, live pending and sold, and saved search email alerts.

**Demo:** [Swapmeadow](https://elements.dev/demos/01a0f3f0-6a71-7c35-9b88-bc3992ca1a54)

## Agent specs

- **Agent:** Claude Code, Opus 5.5 Medium
- **Time:** 25 min
- **Cost:** $7.39 at API rates, September 2026

## Get started

```bash
elements create swapmeadow -scaffold=elementscode/demo-swapmeadow
```

## How it's built

Swapmeadow needed photo uploads, listings kept to each neighborhood, buyer and seller threads, pending and sold that change on every open page, and email when a new listing matches a saved search. Each of those is a part of Elements, so the agent spent its 25 minutes on the marketplace itself.

### What Elements gave the app

- **Live listings.** Listings are a LiveTable opened per neighborhood and per seller. When a seller marks an item pending or sold, every neighbor's browse page updates with it.

- **Live threads and an inbox.** Messages and conversations are LiveTables. A database trigger copies each new message onto its conversation, so the header badge and the inbox fill in as a reply arrives.

- **Photo uploads as function calls.** The sell page sends up to six photos to an `@rpc` as `File` values, which stores the listing and its photos in one transaction, and a route serves each photo under its content hash.

- **Saved searches by email.** Posting a listing schedules a background job that finds the neighbors whose saved searches match and sends each one a single email, however many of their searches it matches.

- **Data from SQL files.** Four migrations define the schema, add four neighborhoods, and seed eight neighbors with 30 listings, buyer and seller threads, saved items and saved searches, plus 34 credited listing photos.

- **Sessions.** Every write checks the signed-in user: the seller sets a listing's status, the two people in a thread post to it, and saves stay in your own neighborhood.

### What the project server gave the agent

The project server runs alongside the agent and answers as soon as a file is saved: it type-checks the templates, TypeScript and SQL, applies migrations and reruns the tests, so every question came back right away and the agent kept building.

### What shipped

The app type-checks with zero errors and all 36 tests pass. Every page works on desktop and phone, and live updates arrive across tabs, such as new messages and a listing marked pending or sold.

## Seed data and demo accounts

The development seed creates four neighborhoods, eight neighbors in Maple Hill
and Riverside, 30 listings with photos across eight categories (some free,
pending or sold), six buyer-seller conversations, and a few saved listings and
saved searches. The listing photos are CC0 or public domain, credited under
each photo.

Every account's password is `meadowlark`, and the sign-in page lists them.
Maya has two unread messages, so she is a good first account.

| Email                  | Name           | Neighborhood |
| ---------------------- | -------------- | ------------ |
| maya@swapmeadow.test   | Maya Patel     | Maple Hill   |
| ben@swapmeadow.test    | Ben Okafor     | Maple Hill   |
| rosa@swapmeadow.test   | Rosa Jiménez   | Maple Hill   |
| theo@swapmeadow.test   | Theo Lindqvist | Maple Hill   |
| june@swapmeadow.test   | June Park      | Maple Hill   |
| sam@swapmeadow.test    | Sam Whitfield  | Riverside    |
| priya@swapmeadow.test  | Priya Nair     | Riverside    |
| leo@swapmeadow.test    | Leo Moretti    | Riverside    |

Saved search alerts are sent by a background job. In development, emails are
written to `.elements/logs/job.log` instead of being sent.

**Demo:** [Swapmeadow](https://elements.dev/demos/01a0f3f0-6a71-7c35-9b88-bc3992ca1a54)

## License

MIT. See [LICENSE](LICENSE).

Listing photos are CC0 or public domain, from Wikimedia Commons and Openverse; credits are in the seed.
