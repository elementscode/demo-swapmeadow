import { Request, Response, redirect, session } from "@elements/app";
import { listings, Category, CATEGORIES } from "#app/shared/services/listings";
import { openInbox } from "#app/shared/services/conversations";
import { openSavedListings, openSavedSearches } from "#app/shared/services/saved";
import html, { BrowseState, PRICE_OPTIONS } from "./template";

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Reads a filter from the query string, so a saved search can link straight to its matches. */
export function initialState(query: Request["query"]): BrowseState {
  let category = one(query.category);
  let price = one(query.price);

  return {
    query: one(query.q),
    category: CATEGORIES.some((c) => c.id === category) ? (category as Category) : "",
    price: PRICE_OPTIONS.some((p) => p.value === price) ? (price as BrowseState["price"]) : "any",
    showSold: false,
  };
}

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  let neighborhoodId = session.getOrThrow("neighborhoodId");

  return new html({
    me: session.getOrThrow("userId"),
    neighborhoodId,
    neighborhoodName: session.getOrThrow("neighborhoodName"),
    listings: listings.view({ neighborhoodId }),
    saved: openSavedListings(),
    searches: openSavedSearches(),
    inbox: openInbox(),
    state: initialState(req.query),
  });
}
