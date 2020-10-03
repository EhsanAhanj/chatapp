const express = require("express");
const path = require("path");
const jwt = require("express-jwt");
const bodyParser = require("body-parser");
const graphqlHTTP = require("graphql-in-motion_express-graphql");
const cors = require("cors");
const expressPlayground = require("graphql-playground-middleware-express")
  .default;
const { execute, subscribe } = require("graphql");
const { createServer } = require("http");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const mongoose = require("mongoose");
const schema = require("./schema");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;
const WS_PORT = process.env.WS_PORT || 4040;
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/task";
const MONGO_DB = process.env.MONGO_DB || "task";
const JWT_SECRET = process.env.JWT_SECRET || "superdupersecret";

const connectDB = async () => {
  let col;

  await mongoose
    .connect(MONGO_URL, {
      promiseLibrary: Promise,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .catch((err) => console.error(err.stack))
    .then((client) => {
      console.log("Connect to MongoDB");
    });

  return col;
};

const runSubscriptionServer = async () => {
  await connectDB();

  const websocketServer = createServer(app);

  websocketServer.listen(WS_PORT, () =>
    console.log(
      `Websocket Server is now running on ws://localhost:${WS_PORT}/api/subscriptions`
    )
  );

  new SubscriptionServer(
    {
      onConnect: () => console.log("Websocket connection established"),
      onDisconnect: () => console.log("Websocket connection terminated"),
      schema,
      execute,
      subscribe,
    },
    {
      server: websocketServer,
      path: "/api/subscriptions",
    }
  );
};

runSubscriptionServer();

const buildOptions = async (req) => {
  await connectDB();

  return {
    context: {
      user: req.user,
    },
    schema,
    graphiql: true,
  };
};

app.use(express.static(path.join(__dirname, "./images")));
app.use(bodyParser.json());
app.use(
  jwt({
    secret: JWT_SECRET,
    credentialsRequired: false,
    algorithms: ["RS256"],
  })
);
app.use("/api/v1", cors(), graphqlHTTP(buildOptions));
app.get("/api/graphql", expressPlayground({ endpoint: "/api/v1" }));

app.listen(PORT, () => {
  console.log(`Running a GraphQL API server at localhost:${PORT}/graphql`);
});
