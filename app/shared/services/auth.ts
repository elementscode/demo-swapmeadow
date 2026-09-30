import { sql, session, AuthError, ValidationError } from "@elements/app";

export const MIN_PASSWORD = 8;

export interface Neighborhood {
  id: string;
  name: string;
  area: string;
}

interface Account {
  id: string;
  name: string;
  neighborhoodId: string;
  neighborhoodName: string;
}

export interface SignupForm {
  name: string;
  email: string;
  password: string;
  neighborhoodId: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function login(account: Account) {
  session.login({
    userId: account.id,
    userName: account.name,
    neighborhoodId: account.neighborhoodId,
    neighborhoodName: account.neighborhoodName,
  });
}

export function listNeighborhoods(): Neighborhood[] {
  return sql<Neighborhood>(`select id, name, area from neighborhoods order by name`).all();
}

/** @rpc */
export function signin(email: string, password: string) {
  let address = normalizeEmail(email);

  if (!address || !password) {
    throw new AuthError("Enter your email and password.");
  }

  let account = sql<Account>(`
    select u.id, u.name, u.neighborhoodId, n.name as neighborhoodName
      from users u
      join neighborhoods n on n.id = u.neighborhoodId
     where u.email = ${address}
       and u.passwordHash = crypt(${password}, u.passwordHash)
  `).first();

  if (!account) {
    throw new AuthError("That email and password don't match.");
  }

  login(account);
}

/** @rpc */
export function signup(form: SignupForm) {
  let name = form.name.trim();
  let address = normalizeEmail(form.email);
  let errors: Record<string, string[]> = {};

  if (!name) {
    errors.name = ["Tell your neighbors what to call you."];
  }

  if (!isEmail(address)) {
    errors.email = ["Enter a valid email address."];
  }

  if (form.password.length < MIN_PASSWORD) {
    errors.password = [`Use at least ${MIN_PASSWORD} characters.`];
  }

  let neighborhood = sql<Neighborhood>(
    `select id, name, area from neighborhoods where id::text = ${form.neighborhoodId}`,
  ).first();

  if (!neighborhood) {
    errors.neighborhoodId = ["Pick your neighborhood."];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  if (!sql(`select 1 from users where email = ${address}`).empty()) {
    throw new ValidationError({ email: ["That email already has an account."] });
  }

  let user = sql<{ id: string }>(`
    insert into users (email, passwordHash, name, neighborhoodId)
         values (${address}, crypt(${form.password}, genSalt('bf', 12)), ${name}, ${neighborhood!.id})
      returning id
  `).firstOrThrow("insert returned no row");

  login({
    id: user.id,
    name,
    neighborhoodId: neighborhood!.id,
    neighborhoodName: neighborhood!.name,
  });
}

/** @rpc */
export function signout() {
  session.logout();
}
