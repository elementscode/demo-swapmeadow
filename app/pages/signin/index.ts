import { Request, Response, redirect, session, sql } from "@elements/app";
import html, { DemoLogin } from "./template";

export default function route(req: Request, res: Response) {
  if (session.isLoggedIn()) {
    redirect("/");
    return;
  }

  // The seeded neighbors, so a visitor can sign in without signing up.
  let demos = sql<DemoLogin>(`
    select u.name, u.email, n.name as neighborhood
      from users u
      join neighborhoods n on n.id = u.neighborhoodId
     where u.email like '%@swapmeadow.test'
     order by n.name, u.name
  `).all();

  return new html({ demos });
}
