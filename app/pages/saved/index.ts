import { Request, Response, redirect, session } from "@elements/app";
import { listings } from "#app/shared/services/listings";
import { openInbox } from "#app/shared/services/conversations";
import { openSavedListings, openSavedSearches } from "#app/shared/services/saved";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  // Saving is limited to your own neighborhood, so its view holds every
  // saved listing and keeps their status live.
  return new html({
    me: session.getOrThrow("userId"),
    listings: listings.view({ neighborhoodId: session.getOrThrow("neighborhoodId") }),
    saved: openSavedListings(),
    searches: openSavedSearches(),
    inbox: openInbox(),
  });
}
