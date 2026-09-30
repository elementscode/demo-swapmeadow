import { Request, Response, redirect, session } from "@elements/app";
import { listings } from "#app/shared/services/listings";
import { openInbox } from "#app/shared/services/conversations";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  return new html({
    listings: listings.view({ sellerId: session.getOrThrow("userId") }),
    inbox: openInbox(),
  });
}
