![A neighborhood marketplace with messaging, built by Claude Code on Elements: the Maple Hill listings grid with photos, prices, Free listings, saved hearts and a Pending bike.](https://elements.dev/demos/01a0f3f0-6a71-7c35-9b88-bc3992ca1a54/poster?v=c5dfbd636791)

# A neighborhood marketplace with messaging, built by Claude Code on Elements

> Swapmeadow is a full-stack app built with Claude Code on Elements.

Photo listings, priced or free, neighborhood search, buyer-seller threads, live pending and sold, and saved search email alerts.

[Run this app on your machine](https://elements.dev/demos/01a0f3f0-6a71-7c35-9b88-bc3992ca1a54). Use this demo as inspiration, or as the starting point for your own app. Your agent creates a new app with this one as the scaffold, and you prompt it to add whatever features you want.

## How it's built

Swapmeadow needed photo uploads, listings kept to each neighborhood, buyer and seller threads, pending and sold that change on every open page, and email when a new listing matches a saved search. Each of those is a part of Elements, so the agent spent its 25 minutes on the marketplace itself.

- **Live listings.** Listings are a LiveTable opened per neighborhood and per seller. When a seller marks an item pending or sold, every neighbor's browse page updates with it.

- **Live threads and an inbox.** Messages and conversations are LiveTables. A database trigger copies each new message onto its conversation, so the header badge and the inbox fill in as a reply arrives.

- **Photo uploads as function calls.** The sell page sends up to six photos to an `@rpc` as `File` values, which stores the listing and its photos in one transaction, and a route serves each photo under its content hash.

- **Saved searches by email.** Posting a listing schedules a background job that finds the neighbors whose saved searches match and sends each one a single email, however many of their searches it matches.

- **Data from SQL files.** Four migrations define the schema, add four neighborhoods, and seed eight neighbors with 30 listings, buyer and seller threads, saved items and saved searches, plus 34 credited listing photos.

- **Sessions.** Every write checks the signed-in user: the seller sets a listing's status, the two people in a thread post to it, and saves stay in your own neighborhood.

## Why Elements

Elements is an integrated full-stack app framework and a project server. The project server checks the agent's work as it builds: it type-checks the server and browser code, analyzes the program, applies migrations and runs the tests, then reports the results to the agent. A security mistake, such as calling a server-only function from the browser, is a compile error. The agent reads the report and fixes its own mistakes before it tells you a feature is done. The same checks run on every feature you ask for next.
