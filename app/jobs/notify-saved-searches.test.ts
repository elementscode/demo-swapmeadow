import { test, assert, sql } from "@elements/app";
import { makeUser, makeListing } from "#app/shared/testing";
import { NotifySavedSearchesJob } from "./notify-saved-searches";

function saveSearch(userId: string, neighborhoodId: string, query: string, maxPrice: number | null = null): string {
  return sql<{ id: string }>(`
    insert into savedSearches (userId, neighborhoodId, query, maxPrice)
         values (${userId}, ${neighborhoodId}, ${query}, ${maxPrice})
      returning id
  `).firstOrThrow().id;
}

function notified(id: string): boolean {
  return sql<{ lastNotifiedAt: Date | null }>(`select lastNotifiedAt from savedSearches where id = ${id}`).firstOrThrow().lastNotifiedAt !== null;
}

test("notify saved searches", () => {
  test("emails the neighbors whose searches match, and nobody else", () => {
    let seller = makeUser("Sella");
    let fan = makeUser("Fan");
    let cheap = makeUser("Cheap");
    let far = makeUser("Far", "Riverside");

    let match = saveSearch(fan.id, fan.neighborhoodId, "road bike");
    let tooPricey = saveSearch(cheap.id, cheap.neighborhoodId, "bike", 50);
    let otherHood = saveSearch(far.id, far.neighborhoodId, "bike");
    let own = saveSearch(seller.id, seller.neighborhoodId, "bike");

    let listing = makeListing(seller, { title: "Blue road bike", price: 180, category: "sports" });
    new NotifySavedSearchesJob({ listingId: listing.id }).run();

    assert(notified(match), "the matching search is notified");
    assert(!notified(tooPricey), "a search capped below the price is not");
    assert(!notified(otherHood), "another neighborhood is not");
    assert(!notified(own), "the seller is not told about their own listing");
  });

  test("does nothing for a listing that sold before the job ran", () => {
    let seller = makeUser("Sella");
    let fan = makeUser("Fan");
    let search = saveSearch(fan.id, fan.neighborhoodId, "bike");
    let listing = makeListing(seller, { title: "Bike", status: "sold" });

    new NotifySavedSearchesJob({ listingId: listing.id }).run();

    assert(!notified(search));
  });
});
