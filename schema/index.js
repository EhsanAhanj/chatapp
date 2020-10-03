const { GraphQLSchema } = require("graphql");
const { ObjectId } = require("mongodb");
const moment = require("moment");
const {
  GraphQLID,
  GraphQLObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInputObjectType,
} = require("graphql");
const { PubSub } = require("graphql-subscriptions");

const pubsub = new PubSub();

const MESSAGE_CREATED = "messageCreated";

const { User } = require("../model/User");
const { Message } = require("../model/Message");

const MutationType = new GraphQLObjectType({
  name: "Mutation",
  fields: () => ({
    createMessage: {
      type: MessageType,
      args: {
        sender: { type: new GraphQLNonNull(GraphQLID) },
        sendTo: { type: new GraphQLNonNull(GraphQLID) },
        content: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_, data, { user }) => {
        // if (!user) {
        //   throw new Error("You must be logged in to send Message");
        // }
        const { sender, content, sendTo } = data;

        const message = new Message({
          sender,
          sendTo,
          content,
          created_at: moment(Date.now()).format(
            "{YYYY} MM-DDTHH:mm:ss SSS [Z] A"
          ),
        });

        const response = await message.save();

        pubsub.publish(MESSAGE_CREATED, { messageCreated: message });
        console.log(
          pubsub.publish(MESSAGE_CREATED, { messageCreated: message })
        );

        return response;
      },
    },
    createImageLink: {
      type: ImageLinkType,
      args: {
        url: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_, { url, messageId }, user) => {
        if (!user) {
          throw new Error("You must be logged in to send An Image");
        }
        const response = await Message.findByIdAndUpdate(messageId, {
          has_image: true,
          image: url,
        });

        return response;
      },
    },
    // destroyImageLink: {
    //   type: ImageLinkType,
    //   args: {
    //     id: { type: new GraphQLNonNull(GraphQLID) },
    //   },
    //   resolve: async (_, { messageId }, user) => {
    //     if (!user) {
    //       throw new Error("You must be logged in to remove a Image");
    //     }

    //     const imageLinke = await Message.findByIdAndUpdate(messageId, {
    //       has_image: false,
    //       image: "",
    //     });

    //     if (!imageLinke) {
    //       throw new Error("imageLinke does not exist");
    //     }

    //     const response = await imageLinkes.deleteOne(messageId);
    //   },
    // },
    createUser: {
      type: UserType,
      args: {
        username: { type: new GraphQLNonNull(GraphQLString) },
        provider: { type: new GraphQLNonNull(AuthProvider) },
      },
      resolve: async (_, { username, provider }) => {
        const hash = await bcrypt.hash(provider.password, 10);

        const newUser = {
          username,
          email: provider.email,
          password: hash,
          created_at: moment(Date.now()).format(
            "{YYYY} MM-DDTHH:mm:ss SSS [Z] A"
          ),
        };
        const response = await Users.insert(newUser);

        return Object.assign({ _id: response.insertedIds[0] }, newUser);
      },
    },
    signInUser: {
      type: SignInPayload,
      args: {
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_, { email, password }, { db: { Users } }) => {
        const user = await Users.findOne({ email });

        if (!user) {
          throw new UserInputError(
            "No user exists with that email address. Please try again"
          );
        }

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
          throw new UserInputError("Incorrect password. Please try again.");
        }

        const token = jsonwebtoken.sign(
          {
            id: user._id,
            email: user.email,
          },
          process.env.JWT_SECRET,
          { expiresIn: "3w" }
        );

        return { token, user };
      },
    },
  }),
});

const AuthProvider = new GraphQLInputObjectType({
  name: "AuthProvider",
  fields: {
    email: { type: new GraphQLNonNull(GraphQLString) },
    password: { type: new GraphQLNonNull(GraphQLString) },
  },
});

const SubscriptionType = new GraphQLObjectType({
  name: "Subscription",
  fields: () => ({
    messsageCreated: {
      type: MessageType,
      subscribe: () => {
        pubsub.asyncIterator(MESSAGE_CREATED);
      },
    },
  }),
});
const ImageLinkType = new GraphQLObjectType({
  name: "Image",
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLID) },
    messageID: { type: new GraphQLNonNull(GraphQLID) },
    url: { type: new GraphQLNonNull(GraphQLString) },
    created_at: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const UserType = new GraphQLObjectType({
  name: "User",
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLID) },
    inbox: {
      type: new GraphQLList(MessageType),
      resolve: async ({ _id }, data, { db: { Messages } }) =>
        await Messages.find({ author: _id }).toArray(),
    },
    created_at: { type: new GraphQLNonNull(GraphQLString) },
    username: { type: new GraphQLNonNull(GraphQLString) },
  }),
});
const SignInPayload = new GraphQLObjectType({
  name: "SignInPayload",
  fields: {
    token: { type: new GraphQLNonNull(GraphQLString) },
    user: {
      type: new GraphQLNonNull(UserType),
    },
  },
});

const MessageType = new GraphQLObjectType({
  name: "MessageName",
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLID) },
    messages: {
      type: new GraphQLList(MessageType),
      resolve: async ({ _id }, data) => {
        const messages = await Message.find({}).toArray();
        return messages;
      },
    },
    sender: {
      type: UserType,
      args: {
        sender: { type: GraphQLID },
      },
      resolve: async ({ sender }, data, { db: { Users } }) =>
        await Users.findOne(ObjectId(sender)),
    },
    sendTo: {
      type: UserType,
      args: {
        sender: { type: GraphQLID },
      },
      resolve: async ({ sendTo }, data, { db: { Users } }) =>
        await Users.findOne(ObjectId(sendTo)),
    },
    content: { type: new GraphQLNonNull(GraphQLString) },
    created_at: { type: new GraphQLNonNull(GraphQLString) },
  }),
});

const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: () => ({
    allUsers: {
      type: new GraphQLList(UserType),
      resolve: async (_, data, { db: { Users } }) =>
        await Users.find({}).toArray(),
    },
    user: {
      type: UserType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (_, { id }, { db: { Users } }) =>
        await Users.findOne(ObjectId(id)),
    },
    allMessages: {
      type: new GraphQLList(MessageType),
      resolve: async (_, data) => await Message.find(),
    },
    InboxMessages: {
      type: new GraphQLList(MessageType),
      args: {
        _id: { type: new GraphQLNonNull(GraphQLID) },
      },
      resolve: async (_, data) => {
        const messages = await Message.find();
        return messages.filter((i) => {
          if (i.link) {
            return i.link.toString() === data._id && i.parent === null;
          }
        });
      },
    },
  }),
});

const graphQLSchemaConfig = {
  query: QueryType,
  mutation: MutationType,
  subscription: SubscriptionType,
};
const schema = new GraphQLSchema(graphQLSchemaConfig);

module.exports = schema;
