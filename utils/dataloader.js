const Dataloader = require("dataloader");

async function batchUsers(Users, keys) {
  return await Users.find({ _id: { $in: keys } }).toArray();
}

async function batchLinks(Links, keys) {
  return await Links.find({ _id: { $in: keys } }).toArray();
}

const cacheKeyFn = (key) => key.toString();

module.exports = ({ Users, Links }) => ({
  userLoader: new Dataloader((keys) => batchUsers(Users, keys), {
    cacheKeyFn,
  }),
  linkLoader: new Dataloader((keys) => batchLinks(Links, keys), {
    cacheKeyFn,
  }),
});
