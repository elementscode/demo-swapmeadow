-- marketplace schema

-- Auto-update updatedAt on row changes.
create or replace function touchUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

-- A timestamp in the shape the browser decodes as a Date. A plain string
-- would arrive as a string, and the templates sort and format these.
create or replace function jsDate(t timestamptz)
returns json
language sql
immutable
as $$
  select case
    when t is null then 'null'::json
    else json_build_object('$type', 'Date', '$value', (extract(epoch from t) * 1000)::bigint)
  end;
$$;

create table neighborhoods (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  name text not null unique,
  area text not null
);

create trigger neighborhoodsTouchUpdatedAt
  before update on neighborhoods
  for each row execute function touchUpdatedAt();

create table users (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  email text not null unique,
  passwordHash text not null,
  name text not null,
  neighborhoodId uuid not null references neighborhoods(id)
);

create index usersNeighborhoodIdIdx on users (neighborhoodId);

create trigger usersTouchUpdatedAt
  before update on users
  for each row execute function touchUpdatedAt();

-- price is whole dollars; 0 is a giveaway. sellerName and coverPhoto are
-- copied onto the row so a live broadcast carries everything a card shows.
create table listings (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  sellerId uuid not null references users(id) on delete cascade,
  sellerName text not null,
  neighborhoodId uuid not null references neighborhoods(id),
  title text not null,
  price integer not null default 0 check (price >= 0),
  category text not null check (category in ('furniture', 'electronics', 'home', 'kids', 'sports', 'books', 'tools', 'clothing')),
  condition text not null check (condition in ('new', 'like-new', 'good', 'fair')),
  description text not null default '',
  status text not null default 'available' check (status in ('available', 'pending', 'sold')),
  coverPhoto text
);

create index listingsNeighborhoodIdIdx on listings (neighborhoodId, createdAt desc);
create index listingsSellerIdIdx on listings (sellerId);

create trigger listingsTouchUpdatedAt
  before update on listings
  for each row execute function touchUpdatedAt();

create table listingPhotos (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  listingId uuid not null references listings(id) on delete cascade,
  position integer not null default 0,
  contentType text not null,
  data bytea not null,
  hash text generated always as (encode(sha256(data), 'hex')) stored,
  credit text
);

create index listingPhotosListingIdIdx on listingPhotos (listingId, position);

create trigger listingPhotosTouchUpdatedAt
  before update on listingPhotos
  for each row execute function touchUpdatedAt();

-- One conversation per buyer per listing. The last message and each side's
-- read mark live on the row so an inbox renders from it alone.
create table conversations (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  listingId uuid not null references listings(id) on delete cascade,
  listingTitle text not null,
  listingCover text,
  buyerId uuid not null references users(id) on delete cascade,
  buyerName text not null,
  sellerId uuid not null references users(id) on delete cascade,
  sellerName text not null,
  lastMessageBody text not null default '',
  lastMessageAt timestamptz not null default now(),
  lastSenderId uuid,
  buyerReadAt timestamptz not null default now(),
  sellerReadAt timestamptz not null default 'epoch',
  unique (listingId, buyerId)
);

create index conversationsBuyerIdIdx on conversations (buyerId);
create index conversationsSellerIdIdx on conversations (sellerId);

create trigger conversationsTouchUpdatedAt
  before update on conversations
  for each row execute function touchUpdatedAt();

create table messages (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  conversationId uuid not null references conversations(id) on delete cascade,
  senderId uuid not null references users(id) on delete cascade,
  senderName text not null,
  body text not null
);

create index messagesConversationIdIdx on messages (conversationId, createdAt);

create trigger messagesTouchUpdatedAt
  before update on messages
  for each row execute function touchUpdatedAt();

create table savedListings (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  userId uuid not null references users(id) on delete cascade,
  listingId uuid not null references listings(id) on delete cascade,
  unique (userId, listingId)
);

create trigger savedListingsTouchUpdatedAt
  before update on savedListings
  for each row execute function touchUpdatedAt();

-- Blank query and null category or price bounds match anything.
create table savedSearches (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  userId uuid not null references users(id) on delete cascade,
  neighborhoodId uuid not null references neighborhoods(id),
  query text not null default '',
  category text,
  maxPrice integer,
  freeOnly boolean not null default false,
  lastNotifiedAt timestamptz
);

create index savedSearchesNeighborhoodIdIdx on savedSearches (neighborhoodId);

create trigger savedSearchesTouchUpdatedAt
  before update on savedSearches
  for each row execute function touchUpdatedAt();

-- Live broadcasts. Rows change from rpc, jobs and seeds as well as through
-- views, so each watched table notifies its own partition channels.

create or replace function listingsNotify() returns trigger
language plpgsql as $$
declare
  r record;
  payload text;
begin
  r := coalesce(new, old);

  payload := json_build_object(
    'op', lower(tg_op),
    'data', json_build_object(
      'id', r.id,
      'createdAt', jsDate(r.createdAt),
      'updatedAt', jsDate(r.updatedAt),
      'sellerId', r.sellerId,
      'sellerName', r.sellerName,
      'neighborhoodId', r.neighborhoodId,
      'title', r.title,
      'price', r.price,
      'category', r.category,
      'condition', r.condition,
      'description', r.description,
      'status', r.status,
      'coverPhoto', r.coverPhoto
    )
  )::text;

  -- NOTIFY takes under 8000 bytes. A larger row goes as its id, and the
  -- server reads the row back.
  if octet_length(payload) >= 8000 then
    payload := json_build_object('op', lower(tg_op), 'id', r.id)::text;
  end if;

  perform pg_notify(channel_name('listings:neighborhoodId=' || r.neighborhoodId), payload);
  perform pg_notify(channel_name('listings:id=' || r.id), payload);
  perform pg_notify(channel_name('listings:sellerId=' || r.sellerId), payload);

  return r;
end;
$$;

create trigger listingsNotifyTrigger
  after insert or update or delete on listings
  for each row execute function listingsNotify();

create or replace function conversationsNotify() returns trigger
language plpgsql as $$
declare
  r record;
  payload text;
begin
  r := coalesce(new, old);

  payload := json_build_object(
    'op', lower(tg_op),
    'data', json_build_object(
      'id', r.id,
      'createdAt', jsDate(r.createdAt),
      'updatedAt', jsDate(r.updatedAt),
      'listingId', r.listingId,
      'listingTitle', r.listingTitle,
      'listingCover', r.listingCover,
      'buyerId', r.buyerId,
      'buyerName', r.buyerName,
      'sellerId', r.sellerId,
      'sellerName', r.sellerName,
      'lastMessageBody', r.lastMessageBody,
      'lastMessageAt', jsDate(r.lastMessageAt),
      'lastSenderId', r.lastSenderId,
      'buyerReadAt', jsDate(r.buyerReadAt),
      'sellerReadAt', jsDate(r.sellerReadAt)
    )
  )::text;

  if octet_length(payload) >= 8000 then
    payload := json_build_object('op', lower(tg_op), 'id', r.id)::text;
  end if;

  perform pg_notify(channel_name('conversations:buyerId=' || r.buyerId), payload);
  perform pg_notify(channel_name('conversations:sellerId=' || r.sellerId), payload);
  perform pg_notify(channel_name('conversations:id=' || r.id), payload);

  return r;
end;
$$;

create trigger conversationsNotifyTrigger
  after insert or update or delete on conversations
  for each row execute function conversationsNotify();

-- A new message moves its conversation to the top of both inboxes and marks
-- it read for the sender.
create or replace function messagesTouchConversation() returns trigger
language plpgsql as $$
begin
  update conversations
     set lastMessageBody = left(new.body, 280),
         lastMessageAt = new.createdAt,
         lastSenderId = new.senderId,
         buyerReadAt = case when new.senderId = buyerId then new.createdAt else buyerReadAt end,
         sellerReadAt = case when new.senderId = sellerId then new.createdAt else sellerReadAt end
   where id = new.conversationId;

  return new;
end;
$$;

create trigger messagesTouchConversationTrigger
  after insert on messages
  for each row execute function messagesTouchConversation();

create or replace function messagesNotify() returns trigger
language plpgsql as $$
declare
  r record;
  payload text;
begin
  r := coalesce(new, old);

  payload := json_build_object(
    'op', lower(tg_op),
    'data', json_build_object(
      'id', r.id,
      'createdAt', jsDate(r.createdAt),
      'updatedAt', jsDate(r.updatedAt),
      'conversationId', r.conversationId,
      'senderId', r.senderId,
      'senderName', r.senderName,
      'body', r.body
    )
  )::text;

  if octet_length(payload) >= 8000 then
    payload := json_build_object('op', lower(tg_op), 'id', r.id)::text;
  end if;

  perform pg_notify(channel_name('messages:conversationId=' || r.conversationId), payload);

  return r;
end;
$$;

create trigger messagesNotifyTrigger
  after insert or update or delete on messages
  for each row execute function messagesNotify();
