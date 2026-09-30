import { Request, Response, redirect, session, sql } from "@elements/app";
import html, { DemoLogin } from "./template";

export default function route(req: Request, res: Response) {
  if (session.isLoggedIn()) {
    redirect("/");
    return;
  }

  // The seeded neighbors exist only in development, so this is empty anywhere else.
  let demos = sql<DemoLogin>(`
    select u.name, u.email, n.name as neighborhood
      from users u
      join neighborhoods n on n.id = u.neighborhoodId
     where u.email like '%@swapmeadow.test'
     order by n.name, u.name
  `).all();

  return new html({ demos });
}
