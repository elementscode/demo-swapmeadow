import { Request, Response, redirect, session } from "@elements/app";
import { openInbox } from "#app/shared/services/conversations";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  return new html({
    neighborhoodName: session.getOrThrow("neighborhoodName"),
    inbox: openInbox(),
  });
}
