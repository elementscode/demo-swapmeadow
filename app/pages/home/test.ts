import { test, equal } from "@elements/app";
import { initialState } from "./index";

test("home", () => {
  test("reads a filter from the query string", () => {
    equal(initialState({ q: "bike", category: "kids", price: "25" }), { query: "bike", category: "kids", price: "25", showSold: false });
  });

  test("ignores values it does not know", () => {
    equal(initialState({ category: "boats", price: "7" }), { query: "", category: "", price: "any", showSold: false });
  });
});
