import { test, assert, equal, errorf, sql, session, ValidationError } from "@elements/app";
import { makeUser, neighborhood } from "#app/shared/testing";
import { signup } from "#app/shared/services/auth";

test("signup", () => {
  test("creates an account in the chosen neighborhood and signs in", () => {
    let hood = neighborhood("Old Town");

    signup({ name: " Ada ", email: "Ada@Example.com", password: "long enough", neighborhoodId: hood.id });

    let user = sql<{ name: string; neighborhoodId: string }>(`select name, neighborhoodId from users where email = 'ada@example.com'`).firstOrThrow();
    equal(user.name, "Ada");
    equal(user.neighborhoodId, hood.id);
    equal(session.get("neighborhoodName"), "Old Town");
  });

  test("reports each bad field", () => {
    try {
      signup({ name: "", email: "not-an-email", password: "short", neighborhoodId: "" });
      errorf("expected a ValidationError");
    } catch (err: any) {
      assert(err instanceof ValidationError, `got ${err}`);
      let fields: string[] = Object.keys(err.errors ?? {}).sort();
      equal(fields.join(","), "email,name,neighborhoodId,password");
    }
  });

  test("an email can only have one account", () => {
    let existing = makeUser("Mae");

    try {
      signup({ name: "Mae again", email: existing.email, password: "long enough", neighborhoodId: existing.neighborhoodId });
      errorf("expected a ValidationError");
    } catch (err: any) {
      assert(err instanceof ValidationError, `got ${err}`);
    }
  });
});
