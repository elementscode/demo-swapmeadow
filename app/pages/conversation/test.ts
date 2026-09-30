import { test, assert, equal, errorf, NotFoundError } from "@elements/app";
import { makeUser, loginAs, makeListing } from "#app/shared/testing";
import { contactSeller, openConversation } from "#app/shared/services/conversations";

test("conversation", () => {
  test("both sides can open it", () => {
    let seller = makeUser("Sella");
    let buyer = makeUser("Bea");
    loginAs(buyer);
    let id = contactSeller(makeListing(seller).id, "Hi");

    equal(openConversation(id).buyerId, buyer.id);

    loginAs(seller);
    equal(openConversation(id).sellerId, seller.id);
  });

  test("anyone else gets a not found", () => {
    loginAs(makeUser("Bea"));
    let id = contactSeller(makeListing(makeUser("Sella")).id, "Hi");

    loginAs(makeUser("Nosy"));

    try {
      openConversation(id);
      errorf("expected a NotFoundError");
    } catch (err: any) {
      assert(err instanceof NotFoundError, `got ${err}`);
    }
  });
});
