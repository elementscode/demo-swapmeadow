import { App } from "@elements/app";
import config from "#config";
import home from "#app/pages/home";
import signin from "#app/pages/signin";
import signup from "#app/pages/signup";
import listing from "#app/pages/listing";
import sell from "#app/pages/sell";
import messages from "#app/pages/messages";
import conversation from "#app/pages/conversation";
import saved from "#app/pages/saved";
import selling from "#app/pages/selling";
import servePhoto from "#app/routes/photos";
import notFound from "#app/pages/errors/not-found";
import unhandled from "#app/pages/errors/unhandled";

const app = new App();

app.route("/", home);
app.route("/signin", signin);
app.route("/signup", signup);
app.route("/sell", sell);
app.route("/listings/:id", listing);
app.route("/messages", messages);
app.route("/messages/:id", conversation);
app.route("/saved", saved);
app.route("/selling", selling);
app.route("/photos/:id/:hash", servePhoto);

app.error((req, res, err) => {
  switch (err.statusCode) {
    case 401:
      res.redirect("/signin");
      return;

    case 404:
      return notFound(req, res, err);

    default:
      return unhandled(req, res, err);
  }
});

app.start(config);
