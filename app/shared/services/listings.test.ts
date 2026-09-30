import { test, assert, equal, errorf, sql, File, ForbiddenError, ValidationError } from "@elements/app";
import { makeUser, loginAs, makeListing, photoFile } from "#app/shared/testing";
import { listings, matchesFilter, describeFilter, formatPrice, createListing, SearchFilter, ListingForm } from "./listings";

const ANY: SearchFilter = { query: "", category: null, maxPrice: null, freeOnly: false };

function form(fields: Partial<ListingForm> = {}): ListingForm {
  return {
    title: "Blue bike",
    price: "80",
    free: false,
    category: "sports",
    condition: "good",
    description: "Steel frame.",
    photos: [new File(photoFile())],
    ...fields,
  };
}

test("listings", () => {
  test("formatPrice shows free for zero", () => {
    equal(formatPrice(0), "Free");
    equal(formatPrice(1250), "$1,250");
  });

  test("matchesFilter", () => {
    let seller = makeUser("Sella");
    let bike = makeListing(seller, { title: "Blue road bike", price: 180, category: "sports" });
    let books = makeListing(seller, { title: "Picture books", price: 0, category: "books" });

    assert(matchesFilter(bike, ANY), "an empty filter matches everything");
    assert(matchesFilter(bike, { ...ANY, query: "ROAD bike" }), "every term, any case");
    assert(!matchesFilter(bike, { ...ANY, query: "road tricycle" }), "a missing term fails");
    assert(matchesFilter(bike, { ...ANY, query: "outdoors" }), "the category label is searchable");
    assert(!matchesFilter(bike, { ...ANY, maxPrice: 100 }));
    assert(matchesFilter(books, { ...ANY, freeOnly: true }));
    assert(!matchesFilter(bike, { ...ANY, freeOnly: true }));
    assert(!matchesFilter(books, { ...ANY, category: "kids" }));
  });

  test("describeFilter", () => {
    equal(describeFilter(ANY), "Everything");
    equal(describeFilter({ query: "bike", category: "kids", maxPrice: 25, freeOnly: false }), "“bike” · Kids & baby · under $25");
  });

  test("createListing", () => {
    test("stores the listing, its photos and a cover, and queues the saved-search job", () => {
      let seller = makeUser("Sella");
      loginAs(seller);

      let id = createListing(form({ photos: [new File(photoFile("a.jpg")), new File(photoFile("b.jpg"))] }));
      let row = sql<{ title: string; price: number; coverPhoto: string; neighborhoodId: string }>(
        `select title, price, coverPhoto, neighborhoodId from listings where id = ${id}`,
      ).firstOrThrow();

      equal(row.title, "Blue bike");
      equal(row.price, 80);
      equal(row.neighborhoodId, seller.neighborhoodId);
      assert(row.coverPhoto.startsWith("/photos/"), `cover is ${row.coverPhoto}`);
      equal(sql<{ n: number }>(`select count(*)::int as n from listingPhotos where listingId = ${id}`).firstOrThrow().n, 2);

      let jobs = sql<{ n: number }>(`
        select count(*)::int as n from elements.jobs where fields->>'listingId' = ${id}
      `).firstOrThrow();
      equal(jobs.n, 1);
    });

    test("a free listing is priced at zero", () => {
      loginAs(makeUser("Sella"));

      let id = createListing(form({ free: true, price: "" }));
      equal(sql<{ price: number }>(`select price from listings where id = ${id}`).firstOrThrow().price, 0);
    });

    test("rejects a bad form field by field", () => {
      loginAs(makeUser("Sella"));

      try {
        createListing(form({ title: " ", price: "abc", category: "boats", photos: [] }));
        errorf("expected a ValidationError");
      } catch (err: any) {
        assert(err instanceof ValidationError, `got ${err}`);
        let fields: string[] = Object.keys(err.errors ?? {}).sort();
        equal(fields.join(","), "category,photos,price,title");
      }
    });
  });

  test("status updates", () => {
    test("the seller can mark a listing pending", () => {
      let seller = makeUser("Sella");
      let listing = makeListing(seller);
      loginAs(seller);

      let view = listings.view({ id: listing.id });
      view.update({ ...listing, status: "pending" });

      equal(sql<{ status: string }>(`select status from listings where id = ${listing.id}`).firstOrThrow().status, "pending");
    });

    test("another neighbor cannot", () => {
      let listing = makeListing(makeUser("Sella"));
      loginAs(makeUser("Nosy"));

      try {
        listings.view({ id: listing.id }).update({ ...listing, status: "sold" });
        errorf("expected a ForbiddenError");
      } catch (err: any) {
        assert(err instanceof ForbiddenError, `got ${err}`);
      }

      equal(sql<{ status: string }>(`select status from listings where id = ${listing.id}`).firstOrThrow().status, "available");
    });
  });
});
