import { test, equal, sql } from "@elements/app";
import { makeUser, loginAs, makeListing } from "#app/shared/testing";
import { contactSeller, openInbox, inboxRows } from "#app/shared/services/conversations";

test("messages", () => {
  test("the inbox holds buying and selling threads, newest first", () => {
    let me = makeUser("Mae");
    let other = makeUser("Otto");

    loginAs(other);
    let selling = contactSeller(makeListing(me, { title: "My lamp" }).id, "Want your lamp");

    loginAs(me);
    let buying = contactSeller(makeListing(other, { title: "Their bike" }).id, "Want your bike");

    // One transaction shares one now(); age the older thread by hand.
    sql(`update conversations set lastMessageAt = lastMessageAt - interval '1 hour' where id = ${selling}`);

    equal(inboxRows(openInbox()).map((c) => c.id), [buying, selling]);
  });
});
