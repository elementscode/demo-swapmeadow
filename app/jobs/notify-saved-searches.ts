import { Job, sql, email } from "@elements/app";
import { Listing, SearchFilter, matchesFilter, describeFilter } from "#app/shared/services/listings";
import SavedSearchMatchEmail from "#app/emails/saved-search-match";

export interface NotifySavedSearchesJobFields {
  listingId: string;
}

interface Candidate extends SearchFilter {
  id: string;
  userId: string;
  email: string;
  name: string;
}

/**
 * Emails each neighbor whose saved searches match a new listing, once per
 * neighbor however many of their searches it matches.
 */
export class NotifySavedSearchesJob extends Job<NotifySavedSearchesJobFields> {
  static maxAttempts = 5;

  run() {
    let listing = sql<Listing & { neighborhoodName: string }>(`
      select l.*, n.name as neighborhoodName
        from listings l
        join neighborhoods n on n.id = l.neighborhoodId
       where l.id = ${this.fields.listingId}
    `).first();

    if (!listing || listing.status !== "available") {
      return;
    }

    let candidates = sql<Candidate>(`
      select s.id, s.userId, s.query, s.category, s.maxPrice, s.freeOnly, u.email, u.name
        from savedSearches s
        join users u on u.id = s.userId
       where s.neighborhoodId = ${listing.neighborhoodId}
         and s.userId <> ${listing.sellerId}
    `).all();

    let byUser = new Map<string, Candidate[]>();

    for (let c of candidates.filter((c) => matchesFilter(listing!, c))) {
      byUser.set(c.userId, [...(byUser.get(c.userId) ?? []), c]);
    }

    for (let matches of byUser.values()) {
      let who = matches[0];

      email({
        to: who.email,
        subject: `New in ${listing.neighborhoodName}: ${listing.title}`,
        body: new SavedSearchMatchEmail({
          name: who.name.split(" ")[0],
          neighborhood: listing.neighborhoodName,
          searches: matches.map((m) => describeFilter(m)),
          listing,
        }),
      });

      sql(`update savedSearches set lastNotifiedAt = now() where id = any(${matches.map((m) => m.id)}::uuid[])`);
    }
  }
}
