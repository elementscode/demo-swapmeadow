![Swapmeadow, a neighborhood marketplace built with Elements: the Maple Hill listings grid with photos, prices, Free listings, saved hearts and a Pending bike.](https://elements.dev/demos/01a0f3f0-6a71-7c35-9b88-bc3992ca1a54/poster?v=c5dfbd636791)

# Swapmeadow

> A demo app built with [Elements](https://elements.dev).

Photo listings, priced or free, neighborhood search, buyer-seller threads, live pending and sold, and saved search email alerts.

**Demo:** [Swapmeadow](https://elements.dev/demos/01a0f3f0-6a71-7c35-9b88-bc3992ca1a54)

## Agent specs

What one run of the prompt below took, from an empty Elements project to this
app.

- **Agent:** Claude Code, Opus 5.5 Medium
- **Time:** 25 min
- **Cost:** $7.39 at API rates, September 2026

## Get started

```bash
elements create swapmeadow -scaffold=elementscode/demo-swapmeadow
```

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

## The prompt

```text
Build a neighborhood marketplace named swapmeadow, for buying, selling and giving
away things locally.

- Sign up with a neighborhood.
- Post a listing: title, price or free, category, condition, description,
  photos.
- Browse listings in your neighborhood, filter by category and price, search.
- Message a seller about a listing; each conversation is between one buyer
  and the seller.
- Sellers mark a listing pending or sold.
- Save listings, and get an email when a saved search has new matches.

Seed eight neighbors, thirty listings with photos across categories, and a few
conversations. Show the seeded logins on the sign-in page.

Messages and listing status update in real time.
```

## License

MIT. See [LICENSE](LICENSE).

Listing photos are CC0 or public domain, from Wikimedia Commons and Openverse; credits are in the seed.
