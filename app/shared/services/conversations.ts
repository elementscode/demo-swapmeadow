import { LiveTable, LiveView, sql, session, ForbiddenError, NotFoundError, ValidationError } from "@elements/app";

export interface Conversation {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  listingId: string;
  listingTitle: string;
  listingCover: string | null;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  lastMessageBody: string;
  lastMessageAt: Date;
  lastSenderId: string | null;
  buyerReadAt: Date;
  sellerReadAt: Date;
}

export interface Message {
  id: string;
  createdAt: Date;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
}

/** Both sides of a user's inbox: where they are buying and where they are selling. */
export interface Inbox {
  buying: LiveView<Conversation>;
  selling: LiveView<Conversation>;
}

const MAX_MESSAGE = 2000;

// Every conversation write is a trigger-maintained side effect of a message,
// so nothing writes through a view.
export let conversations = new LiveTable<Conversation>({
  channel: (partition) => (partition ? `conversations:${partition}` : "conversations"),
  insert: () => {
    throw new ForbiddenError();
  },
  update: () => {
    throw new ForbiddenError();
  },
  delete: () => {
    throw new ForbiddenError();
  },
});

export let messages: LiveTable<Message> = new LiveTable<Message>({
  channel: (partition) => (partition ? `messages:${partition}` : "messages"),
  insert: (item) => {
    session.isLoggedInOrThrow();

    let me = session.getOrThrow("userId");
    let body = (item.body ?? "").trim();

    if (!body) {
      throw new ValidationError("Write a message first.");
    }

    if (body.length > MAX_MESSAGE) {
      throw new ValidationError(`Keep messages under ${MAX_MESSAGE} characters.`);
    }

    if (!isParticipant(item.conversationId!, me)) {
      throw new ForbiddenError();
    }

    return sql<Message>(`
      insert into messages (id, conversationId, senderId, senderName, body)
           values (${item.id}, ${item.conversationId}, ${me}, ${session.getOrThrow("userName")}, ${body})
        returning *
    `).firstOrThrow("insert returned no row");
  },
  update: () => {
    throw new ForbiddenError();
  },
  delete: () => {
    throw new ForbiddenError();
  },
});

function isParticipant(conversationId: string, userId: string): boolean {
  return !sql(`
    select 1 from conversations
     where id = ${conversationId}
       and (buyerId = ${userId} or sellerId = ${userId})
  `).empty();
}

/** The signed-in user's inbox, for the header badge and the messages page. */
export function openInbox(): Inbox {
  let me = session.getOrThrow("userId");

  return {
    buying: conversations.view({ buyerId: me }),
    selling: conversations.view({ sellerId: me }),
  };
}

export function isUnread(c: Conversation, me: string): boolean {
  if (!c.lastSenderId || c.lastSenderId === me) {
    return false;
  }

  let readAt = c.buyerId === me ? c.buyerReadAt : c.sellerReadAt;

  return +c.lastMessageAt > +readAt;
}

export function inboxRows(inbox: Inbox): Conversation[] {
  return [...inbox.buying, ...inbox.selling].sort((a, b) => +b.lastMessageAt - +a.lastMessageAt);
}

export function unreadCount(inbox: Inbox, me: string): number {
  return inboxRows(inbox).filter((c) => isUnread(c, me)).length;
}

export function openConversation(id: string): Conversation {
  session.isLoggedInOrThrow();

  let me = session.getOrThrow("userId");
  let c = sql<Conversation>(`select * from conversations where id = ${id}`).first();

  if (!c || (c.buyerId !== me && c.sellerId !== me)) {
    throw new NotFoundError("conversation not found");
  }

  return c;
}

/**
 * Opens the buyer's conversation about a listing, or reuses the one they
 * already have, and sends the first message. Returns the conversation id.
 *
 * @rpc
 */
export function contactSeller(listingId: string, body: string): string {
  session.isLoggedInOrThrow();

  let me = session.getOrThrow("userId");
  let text = body.trim();

  if (!text) {
    throw new ValidationError("Write a message first.");
  }

  if (text.length > MAX_MESSAGE) {
    throw new ValidationError(`Keep messages under ${MAX_MESSAGE} characters.`);
  }

  let listing = sql<{ id: string; title: string; coverPhoto: string | null; sellerId: string; sellerName: string }>(`
    select id, title, coverPhoto, sellerId, sellerName from listings where id = ${listingId}
  `).first();

  if (!listing) {
    throw new NotFoundError("That listing is gone.");
  }

  if (listing.sellerId === me) {
    throw new ValidationError("This is your own listing.");
  }

  let conversation = sql<{ id: string }>(`
    insert into conversations (listingId, listingTitle, listingCover, buyerId, buyerName, sellerId, sellerName)
         values (${listing.id}, ${listing.title}, ${listing.coverPhoto}, ${me},
                 ${session.getOrThrow("userName")}, ${listing.sellerId}, ${listing.sellerName})
    on conflict (listingId, buyerId) do update set updatedAt = now()
      returning id
  `).firstOrThrow("upsert returned no row");

  sql(`
    insert into messages (conversationId, senderId, senderName, body)
         values (${conversation.id}, ${me}, ${session.getOrThrow("userName")}, ${text})
  `);

  return conversation.id;
}

/** @rpc */
export function markRead(conversationId: string) {
  session.isLoggedInOrThrow();

  let me = session.getOrThrow("userId");

  sql(`
    update conversations
       set buyerReadAt = case when buyerId = ${me} then now() else buyerReadAt end,
           sellerReadAt = case when sellerId = ${me} then now() else sellerReadAt end
     where id = ${conversationId}
       and (buyerId = ${me} or sellerId = ${me})
  `);
}

/** The buyer's existing conversation about a listing, if they have one. */
export function findConversation(listingId: string, buyerId: string): string | null {
  return sql<{ id: string }>(
    `select id from conversations where listingId = ${listingId} and buyerId = ${buyerId}`,
  ).first()?.id ?? null;
}
