import { test, assert, equal, errorf, sql, ForbiddenError, ValidationError } from "@elements/app";
import { makeUser, loginAs, makeListing } from "#app/shared/testing";
import { savedListings, savedSearches, toggleSaved, isSaved, SavedListing } from "./saved";

test("saved", () => {
  test("saving a listing twice keeps one row", () => {
    let me = makeUser("Mae");
    let listing = makeListing(makeUser("Sella"));
    loginAs(me);

    let saved = savedListings.view({ userId: me.id });
    toggleSaved(saved, listing.id, me.id);
    let second = saved.insert({ userId: me.id, listingId: listing.id });

    let rows = sql<SavedListing>(`select * from savedListings where userId = ${me.id}`).all();
    equal(rows.length, 1);
    equal(rows[0].id, second.id, "the latest save's id wins");
  });

  test("toggleSaved removes a saved listing", () => {
    let me = makeUser("Mae");
    let listing = makeListing(makeUser("Sella"));
    loginAs(me);

    let saved = savedListings.view({ userId: me.id });
    saved.insert({ userId: me.id, listingId: listing.id });

    let fresh = savedListings.view({ userId: me.id });
    assert(isSaved(fresh, listing.id), "a new view reads the saved row");

    toggleSaved(fresh, listing.id, me.id);
    equal(sql<{ n: number }>(`select count(*)::int as n from savedListings where userId = ${me.id}`).firstOrThrow().n, 0);
  });

  test("a listing in another neighborhood cannot be saved", () => {
    let me = makeUser("Mae");
    let far = makeListing(makeUser("Faraway", "Riverside"));
    loginAs(me);

    try {
      savedListings.view({ userId: me.id }).insert({ userId: me.id, listingId: far.id });
      errorf("expected a ForbiddenError");
    } catch (err: any) {
      assert(err instanceof ForbiddenError, `got ${err}`);
    }
  });

  test("a search needs a term or a filter", () => {
    let me = makeUser("Mae");
    loginAs(me);

    let searches = savedSearches.view({ userId: me.id });

    try {
      searches.insert({ userId: me.id, neighborhoodId: me.neighborhoodId, query: "  ", category: null, maxPrice: null, freeOnly: false });
      errorf("expected a ValidationError");
    } catch (err: any) {
      assert(err instanceof ValidationError, `got ${err}`);
    }

    searches.insert({ userId: me.id, neighborhoodId: me.neighborhoodId, query: " bike ", category: null, maxPrice: null, freeOnly: false });
    equal(sql<{ query: string }>(`select query from savedSearches where userId = ${me.id}`).firstOrThrow().query, "bike");
  });

  test("nobody saves a search for someone else", () => {
    let victim = makeUser("Vic");
    let me = makeUser("Mae");
    loginAs(me);

    try {
      savedSearches.view({ userId: victim.id }).insert({ userId: victim.id, neighborhoodId: me.neighborhoodId, query: "spam", category: null, maxPrice: null, freeOnly: false });
      errorf("expected a ForbiddenError");
    } catch (err: any) {
      assert(err instanceof ForbiddenError, `got ${err}`);
    }
  });
});
