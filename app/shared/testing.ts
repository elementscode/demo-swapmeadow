import { sql, session } from "@elements/app";
import { Listing } from "#app/shared/services/listings";

/** Test fixtures. The test database has the neighborhoods but none of the seeded neighbors. */
export interface TestUser {
  id: string;
  name: string;
  email: string;
  neighborhoodId: string;
  neighborhoodName: string;
}

export function neighborhood(name: string): { id: string; name: string } {
  return sql<{ id: string; name: string }>(`select id, name from neighborhoods where name = ${name}`).firstOrThrow("no such neighborhood");
}

export function makeUser(name: string, hood = "Maple Hill"): TestUser {
  let n = neighborhood(hood);
  let email = `${name.toLowerCase()}@test.example`;

  let user = sql<{ id: string }>(`
    insert into users (email, passwordHash, name, neighborhoodId)
         values (${email}, crypt('password1', genSalt('bf', 4)), ${name}, ${n.id})
      returning id
  `).firstOrThrow();

  return { id: user.id, name, email, neighborhoodId: n.id, neighborhoodName: n.name };
}

export function loginAs(user: TestUser) {
  session.login({
    userId: user.id,
    userName: user.name,
    neighborhoodId: user.neighborhoodId,
    neighborhoodName: user.neighborhoodName,
  });
}

export function makeListing(seller: TestUser, fields: Partial<Listing> = {}): Listing {
  return sql<Listing>(`
    insert into listings (sellerId, sellerName, neighborhoodId, title, price, category, condition, description, status)
         values (${seller.id},
                 ${seller.name},
                 ${seller.neighborhoodId},
                 ${fields.title ?? "Oak bookshelf"},
                 ${fields.price ?? 40},
                 ${fields.category ?? "furniture"},
                 ${fields.condition ?? "good"},
                 ${fields.description ?? "Solid oak, five shelves."},
                 ${fields.status ?? "available"})
      returning *
  `).firstOrThrow();
}

export function photoFile(name = "photo.jpg") {
  let data = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

  return { name, size: data.length, contentType: "image/jpeg", data, lastModified: new Date() };
}
