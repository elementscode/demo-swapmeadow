import { Request, Response, redirect, session } from "@elements/app";
import { listings } from "#app/shared/services/listings";
import { messages, openInbox, openConversation, markRead } from "#app/shared/services/conversations";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  let conversation = openConversation(req.params.id);

  markRead(conversation.id);

  return new html({
    me: session.getOrThrow("userId"),
    myName: session.getOrThrow("userName"),
    conversation,
    listing: listings.view({ id: conversation.listingId }),
    messages: messages.view({ conversationId: conversation.id }),
    inbox: openInbox(),
  });
}
