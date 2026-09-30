import { test, equal, sql } from "@elements/app";
import { makeUser, loginAs, makeListing } from "#app/shared/testing";
import { listings, setStatus } from "#app/shared/services/listings";

test("selling", () => {
  test("a seller moves a listing through pending to sold from their own list", () => {
    let seller = makeUser("Sella");
    let listing = makeListing(seller);
    loginAs(seller);

    let mine = listings.view({ sellerId: seller.id });
    setStatus(mine, listing, "pending");
    equal(sql<{ status: string }>(`select status from listings where id = ${listing.id}`).firstOrThrow().status, "pending");

    setStatus(mine, { ...listing, status: "pending" }, "sold");
    equal(sql<{ status: string }>(`select status from listings where id = ${listing.id}`).firstOrThrow().status, "sold");
  });
});
