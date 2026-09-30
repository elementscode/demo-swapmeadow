import { test, assert, equal, errorf, sql, session, ForbiddenError, ValidationError } from "@elements/app";
import { makeUser, loginAs, makeListing } from "#app/shared/testing";
import { messages, contactSeller, markRead, openInbox, unreadCount, isUnread, Conversation } from "./conversations";

function conversation(id: string): Conversation {
  return sql<Conversation>(`select * from conversations where id = ${id}`).firstOrThrow();
}

test("conversations", () => {
  test("contactSeller opens one conversation per buyer and listing", () => {
    let seller = makeUser("Sella");
    let buyer = makeUser("Bea");
    let listing = makeListing(seller, { title: "Oak bookshelf" });
    loginAs(buyer);

    let first = contactSeller(listing.id, "  Is this still available?  ");
    let again = contactSeller(listing.id, "Also, how tall is it?");

    equal(again, first, "the second message reuses the conversation");

    let c = conversation(first);
    equal(c.listingTitle, "Oak bookshelf");
    equal(c.sellerId, seller.id);
    equal(c.lastMessageBody, "Also, how tall is it?");
    equal(c.lastSenderId, buyer.id);
    equal(sql<{ n: number }>(`select count(*)::int as n from messages where conversationId = ${first}`).firstOrThrow().n, 2);
  });

  test("a seller cannot message their own listing", () => {
    let seller = makeUser("Sella");
    let listing = makeListing(seller);
    loginAs(seller);

    try {
      contactSeller(listing.id, "hello me");
      errorf("expected a ValidationError");
    } catch (err: any) {
      assert(err instanceof ValidationError, `got ${err}`);
    }
  });

  test("messages", () => {
    test("a reply shows as unread for the other side until they read it", () => {
      let seller = makeUser("Sella");
      let buyer = makeUser("Bea");
      let listing = makeListing(seller);
      loginAs(buyer);

      let id = contactSeller(listing.id, "Still there?");
      assert(isUnread(conversation(id), seller.id), "new message is unread for the seller");
      assert(!isUnread(conversation(id), buyer.id), "and read for the buyer who sent it");

      // A test is one transaction, so now() never moves. Put the first
      // message a minute in the past so the reply comes after it.
      sql(`update conversations set lastMessageAt = lastMessageAt - interval '1 minute', buyerReadAt = buyerReadAt - interval '1 minute' where id = ${id}`);

      loginAs(seller);
      equal(unreadCount(openInbox(), seller.id), 1);

      messages.view({ conversationId: id }).insert({ senderId: seller.id, senderName: seller.name, body: "Yes, come by!" });

      let c = conversation(id);
      equal(c.lastMessageBody, "Yes, come by!");
      assert(!isUnread(c, seller.id), "replying reads the thread");
      assert(isUnread(c, buyer.id), "the buyer has an unread reply");

      loginAs(buyer);
      markRead(id);
      assert(!isUnread(conversation(id), buyer.id));
    });

    test("a neighbor outside the conversation cannot post in it", () => {
      let seller = makeUser("Sella");
      loginAs(makeUser("Bea"));
      let id = contactSeller(makeListing(seller).id, "Hi");

      let outsider = makeUser("Nosy");
      loginAs(outsider);

      try {
        messages.view({ conversationId: id }).insert({ senderId: outsider.id, senderName: outsider.name, body: "me too" });
        errorf("expected a ForbiddenError");
      } catch (err: any) {
        assert(err instanceof ForbiddenError, `got ${err}`);
      }
    });

    test("the sender is always the signed-in neighbor", () => {
      let seller = makeUser("Sella");
      let buyer = makeUser("Bea");
      loginAs(buyer);
      let id = contactSeller(makeListing(seller).id, "Hi");

      messages.view({ conversationId: id }).insert({ senderId: seller.id, senderName: "Sella", body: "spoofed" });

      let row = sql<{ senderId: string }>(`select senderId from messages where body = 'spoofed'`).firstOrThrow();
      equal(row.senderId, session.getOrThrow("userId"));
    });
  });
});
