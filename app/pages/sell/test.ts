import { test, assert, equal, errorf, File, ValidationError, AuthError } from "@elements/app";
import { makeUser, loginAs, photoFile } from "#app/shared/testing";
import { createListing, MAX_PHOTOS, ListingForm } from "#app/shared/services/listings";

function form(photos: File[]): ListingForm {
  return { title: "Lamp", price: "10", free: false, category: "home", condition: "good", description: "", photos };
}

test("sell", () => {
  test("caps the number of photos", () => {
    loginAs(makeUser("Sella"));

    try {
      createListing(form(Array.from({ length: MAX_PHOTOS + 1 }, () => new File(photoFile()))));
      errorf("expected a ValidationError");
    } catch (err: any) {
      assert(err instanceof ValidationError, `got ${err}`);
      equal(err.errors?.photos?.[0], `Up to ${MAX_PHOTOS} photos.`);
    }
  });

  test("refuses a file that is not an image", () => {
    loginAs(makeUser("Sella"));

    try {
      createListing(form([new File({ ...photoFile("notes.html"), contentType: "text/html" })]));
      errorf("expected a ValidationError");
    } catch (err: any) {
      assert(err instanceof ValidationError, `got ${err}`);
    }
  });

  test("needs a signed-in seller", () => {
    try {
      createListing(form([new File(photoFile())]));
      errorf("expected an AuthError");
    } catch (err: any) {
      assert(err instanceof AuthError, `got ${err}`);
    }
  });
});
