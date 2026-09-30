import { Request, Response, redirect, session, sql, NotFoundError } from "@elements/app";
import { listings, listingPhotos } from "#app/shared/services/listings";
import { openInbox, findConversation } from "#app/shared/services/conversations";
import { openSavedListings } from "#app/shared/services/saved";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  let id = req.params.id;

  if (sql(`select 1 from listings where id::text = ${id}`).empty()) {
    throw new NotFoundError("listing not found");
  }

  let me = session.getOrThrow("userId");

  return new html({
    me,
    listing: listings.view({ id }),
    photos: listingPhotos(id),
    saved: openSavedListings(),
    inbox: openInbox(),
    conversationId: findConversation(id, me),
  });
}
