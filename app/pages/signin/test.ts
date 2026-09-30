import { test, assert, errorf, session, AuthError } from "@elements/app";
import { makeUser } from "#app/shared/testing";
import { signin } from "#app/shared/services/auth";

test("signin", () => {
  test("signs a neighbor in with their neighborhood on the session", () => {
    let user = makeUser("Mae", "Riverside");

    signin(`  ${user.email.toUpperCase()} `, "password1");

    assert(session.isLoggedIn());
    assert(session.get("neighborhoodName") === "Riverside");
    assert(session.get("userId") === user.id);
  });

  test("a wrong password is refused without saying which part was wrong", () => {
    let user = makeUser("Mae");

    try {
      signin(user.email, "nope-nope");
      errorf("expected an AuthError");
    } catch (err: any) {
      assert(err instanceof AuthError, `got ${err}`);
      assert(err.message === "That email and password don't match.", err.message);
    }
  });
});
