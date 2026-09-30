import { LiveTable, LiveView, sql, session, ForbiddenError, ValidationError } from "@elements/app";
import { Category } from "#app/shared/services/listings";

export interface SavedListing {
  id: string;
  createdAt: Date;
  userId: string;
  listingId: string;
}

export interface SavedSearch {
  id: string;
  createdAt: Date;
  userId: string;
  neighborhoodId: string;
  query: string;
  category: Category | null;
  maxPrice: number | null;
  freeOnly: boolean;
  lastNotifiedAt: Date | null;
}

function requireOwner(userId: string | undefined) {
  session.isLoggedInOrThrow();

  if (userId !== session.getOrThrow("userId")) {
    throw new ForbiddenError();
  }
}

export let savedListings: LiveTable<SavedListing> = new LiveTable<SavedListing>({
  insert: (item) => {
    requireOwner(item.userId);

    let visible = !sql(`
      select 1 from listings
       where id = ${item.listingId}
         and neighborhoodId = ${session.getOrThrow("neighborhoodId")}
    `).empty();

    if (!visible) {
      throw new ForbiddenError("You can save listings in your own neighborhood.");
    }

    // A second save of the same listing (two tabs, a double click) takes the
    // new id, so the row the browser minted is the row that comes back.
    return sql<SavedListing>(`
      insert into savedListings (id, userId, listingId)
           values (${item.id}, ${item.userId}, ${item.listingId})
      on conflict (userId, listingId) do update set id = excluded.id
        returning *
    `).firstOrThrow("insert returned no row");
  },
  update: () => {
    throw new ForbiddenError();
  },
  delete: (item) => {
    requireOwner(item.userId);
    return savedListings.delete(item);
  },
});

export let savedSearches: LiveTable<SavedSearch> = new LiveTable<SavedSearch>({
  insert: (item) => {
    requireOwner(item.userId);

    if (item.neighborhoodId !== session.getOrThrow("neighborhoodId")) {
      throw new ForbiddenError();
    }

    if (!(item.query ?? "").trim() && !item.category && item.maxPrice == null && !item.freeOnly) {
      throw new ValidationError("Add a search term or a filter before saving.");
    }

    return savedSearches.insert({ ...item, query: (item.query ?? "").trim() });
  },
  update: () => {
    throw new ForbiddenError();
  },
  delete: (item) => {
    requireOwner(item.userId);
    return savedSearches.delete(item);
  },
});

export function openSavedListings(): LiveView<SavedListing> {
  return savedListings.view({ userId: session.getOrThrow("userId") });
}

export function openSavedSearches(): LiveView<SavedSearch> {
  return savedSearches.view({ userId: session.getOrThrow("userId") });
}

export function isSaved(saved: LiveView<SavedListing>, listingId: string): boolean {
  return saved.some((s) => s.listingId === listingId);
}

export function toggleSaved(saved: LiveView<SavedListing>, listingId: string, userId: string) {
  let existing = saved.find((s) => s.listingId === listingId);

  if (existing) {
    saved.delete(existing);
  } else {
    saved.insert({ userId, listingId, createdAt: new Date() });
  }
}
