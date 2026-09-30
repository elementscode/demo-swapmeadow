import { LiveTable, LiveView, sql, tx, session, File, ForbiddenError, ValidationError } from "@elements/app";
import { NotifySavedSearchesJob } from "#app/jobs/notify-saved-searches";

export type Category = "furniture" | "electronics" | "home" | "kids" | "sports" | "books" | "tools" | "clothing";
export type Condition = "new" | "like-new" | "good" | "fair";
export type Status = "available" | "pending" | "sold";

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "furniture", label: "Furniture" },
  { id: "home", label: "Home & garden" },
  { id: "kids", label: "Kids & baby" },
  { id: "electronics", label: "Electronics" },
  { id: "sports", label: "Sports & outdoors" },
  { id: "books", label: "Books, music & games" },
  { id: "tools", label: "Tools" },
  { id: "clothing", label: "Clothing" },
];

export const CONDITIONS: { id: Condition; label: string }[] = [
  { id: "new", label: "New" },
  { id: "like-new", label: "Like new" },
  { id: "good", label: "Good" },
  { id: "fair", label: "Fair" },
];

export const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export interface Listing {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  sellerId: string;
  sellerName: string;
  neighborhoodId: string;
  title: string;
  price: number;
  category: Category;
  condition: Condition;
  description: string;
  status: Status;
  coverPhoto: string | null;
}

export interface Photo {
  id: string;
  hash: string;
}

export interface ListingPhoto extends Photo {
  credit: string | null;
}

/** What the browse filters and a saved search have in common. */
export interface SearchFilter {
  query: string;
  category: Category | null;
  maxPrice: number | null;
  freeOnly: boolean;
}

export interface ListingForm {
  title: string;
  price: string;
  free: boolean;
  category: string;
  condition: string;
  description: string;
  photos: File[];
}

export let listings: LiveTable<Listing> = new LiveTable<Listing>({
  channel: (partition) => (partition ? `listings:${partition}` : "listings"),
  insert: () => {
    throw new ForbiddenError("Post a listing from the sell page.");
  },
  update: (item) => {
    session.isLoggedInOrThrow();

    if (!["available", "pending", "sold"].includes(item.status)) {
      throw new ValidationError("Unknown status.");
    }

    let row = sql<Listing>(`
      update listings
         set status = ${item.status}
       where id = ${item.id}
         and sellerId = ${session.getOrThrow("userId")}
   returning *
    `).first();

    if (!row) {
      throw new ForbiddenError("Only the seller can change this listing.");
    }

    return row;
  },
  delete: () => {
    throw new ForbiddenError();
  },
});

export function photoUrl(photo: Photo): string {
  return `/photos/${photo.id}/${photo.hash}`;
}

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function conditionLabel(id: string): string {
  return CONDITIONS.find((c) => c.id === id)?.label ?? id;
}

export function formatPrice(price: number): string {
  return price === 0 ? "Free" : `$${price.toLocaleString("en-US")}`;
}

export function timeAgo(date: Date): string {
  let seconds = Math.max(0, (Date.now() - +date) / 1000);

  if (seconds < 60) {
    return "just now";
  }

  let minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  let hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  let days = Math.floor(hours / 24);

  if (days < 30) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isFilterEmpty(filter: SearchFilter): boolean {
  return !filter.query.trim() && !filter.category && filter.maxPrice === null && !filter.freeOnly;
}

/**
 * The one definition of a match. The browse page filters with it and the
 * saved-search job decides who to email with it, so the two cannot disagree.
 */
export function matchesFilter(listing: Listing, filter: SearchFilter): boolean {
  if (filter.category && listing.category !== filter.category) {
    return false;
  }

  if (filter.freeOnly && listing.price !== 0) {
    return false;
  }

  if (filter.maxPrice !== null && listing.price > filter.maxPrice) {
    return false;
  }

  let haystack = `${listing.title} ${listing.description} ${categoryLabel(listing.category)}`.toLowerCase();
  let terms = filter.query.toLowerCase().split(/\s+/).filter((t) => t);

  return terms.every((t) => haystack.includes(t));
}

export function describeFilter(filter: SearchFilter): string {
  let parts: string[] = [];

  if (filter.query.trim()) {
    parts.push(`“${filter.query.trim()}”`);
  }

  if (filter.category) {
    parts.push(categoryLabel(filter.category));
  }

  if (filter.freeOnly) {
    parts.push("free");
  } else if (filter.maxPrice !== null) {
    parts.push(`under $${filter.maxPrice}`);
  }

  return parts.length ? parts.join(" · ") : "Everything";
}

export function listingPhotos(listingId: string): ListingPhoto[] {
  return sql<ListingPhoto>(
    `select id, hash, credit from listingPhotos where listingId = ${listingId} order by position`,
  ).all();
}

/** @rpc */
export function createListing(form: ListingForm): string {
  session.isLoggedInOrThrow();

  let title = form.title.trim();
  let description = form.description.trim();
  let price = form.free ? 0 : Number(form.price.replace(/[$,\s]/g, ""));
  let errors: Record<string, string[]> = {};

  if (!title) {
    errors.title = ["Give it a title."];
  } else if (title.length > 80) {
    errors.title = ["Keep the title under 80 characters."];
  }

  if (!form.free && (!form.price.trim() || !Number.isInteger(price) || price < 1)) {
    errors.price = ["Enter a whole-dollar price, or mark it free."];
  }

  if (!CATEGORIES.some((c) => c.id === form.category)) {
    errors.category = ["Pick a category."];
  }

  if (!CONDITIONS.some((c) => c.id === form.condition)) {
    errors.condition = ["Pick a condition."];
  }

  if (form.photos.length === 0) {
    errors.photos = ["Add at least one photo."];
  } else if (form.photos.length > MAX_PHOTOS) {
    errors.photos = [`Up to ${MAX_PHOTOS} photos.`];
  } else if (form.photos.some((f) => !PHOTO_TYPES.has(f.contentType))) {
    errors.photos = ["Photos must be JPEG, PNG, GIF or WebP."];
  } else if (form.photos.some((f) => f.size > MAX_PHOTO_BYTES)) {
    errors.photos = ["Each photo must be under 8 MB."];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  return tx(() => {
    let listing = sql<{ id: string }>(`
      insert into listings (sellerId, sellerName, neighborhoodId, title, price, category, condition, description)
           values (${session.getOrThrow("userId")},
                   ${session.getOrThrow("userName")},
                   ${session.getOrThrow("neighborhoodId")},
                   ${title},
                   ${price},
                   ${form.category},
                   ${form.condition},
                   ${description})
        returning id
    `).firstOrThrow("insert returned no row");

    let cover = "";

    for (let position = 0; position < form.photos.length; position++) {
      let f = form.photos[position];
      let photo = sql<Photo>(`
        insert into listingPhotos (listingId, position, contentType, data)
             values (${listing.id}, ${position}, ${f.contentType}, ${f.data})
          returning id, hash
      `).firstOrThrow("insert returned no row");

      if (position === 0) {
        cover = photoUrl(photo);
      }
    }

    sql(`update listings set coverPhoto = ${cover} where id = ${listing.id}`);

    new NotifySavedSearchesJob({ listingId: listing.id }).schedule();

    return listing.id;
  });
}

/** Marks a listing through the view the page holds, so every watcher moves. */
export function setStatus(view: LiveView<Listing>, listing: Listing, status: Status) {
  view.update({ ...listing, status });
}
