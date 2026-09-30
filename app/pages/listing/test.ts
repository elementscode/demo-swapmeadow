import { test, equal } from "@elements/app";
import { makeUser, loginAs, makeListing } from "#app/shared/testing";
import { contactSeller, findConversation } from "#app/shared/services/conversations";

test("listing", () => {
  test("finds the buyer's conversation so the page offers to open it", () => {
    let seller = makeUser("Sella");
    let buyer = makeUser("Bea");
    let listing = makeListing(seller);

    equal(findConversation(listing.id, buyer.id), null);

    loginAs(buyer);
    let id = contactSeller(listing.id, "Is it still available?");

    equal(findConversation(listing.id, buyer.id), id);
    equal(findConversation(listing.id, seller.id), null, "a seller has no buyer-side conversation");
  });
});
