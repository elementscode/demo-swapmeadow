import { test, equal } from "@elements/app";
import { SavedSearch } from "#app/shared/services/saved";
import { searchUrl } from "./template";

function search(fields: Partial<SavedSearch>): SavedSearch {
  return { id: "s", createdAt: new Date(), userId: "u", neighborhoodId: "n", query: "", category: null, maxPrice: null, freeOnly: false, lastNotifiedAt: null, ...fields };
}

test("saved", () => {
  test("links a saved search to its matches on the browse page", () => {
    equal(searchUrl(search({ query: "bike", maxPrice: 100 })), "/?q=bike&price=100");
    equal(searchUrl(search({ category: "kids", freeOnly: true })), "/?category=kids&price=free");
    equal(searchUrl(search({})), "/");
  });
});
