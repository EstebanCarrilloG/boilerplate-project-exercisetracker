const express = require("express");

const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();

//Mongodb connection
async function dbConnection() {
  mongoose.connect(process.env.MONGO_URI);
}

dbConnection().catch((err) => console.log(err));

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

let Users;

const usersSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
  },

  log: [
    {
      description: { type: String },
      duration: { type: Number },
      date: Date,
    },
  ],
});

Users = mongoose.model("Users", usersSchema);

const createAndSaveUser = (username) => {
  let user = new Users({ username: username });
  let error = user.validateSync();

  if (error === undefined) {
    user.save();
    return { username: user.username, _id: user._id };
  } else {
    return { error: error.errors.username.message };
  }
};

app.route("/api/users").post((req, res) => {
  const { username } = req.body;
  let newUser = createAndSaveUser(username);
  return res.json(newUser);
});

const findPersonById = async (id) => {
  return await Users.findById(id)
    .then((user) => {
      if (user) {
        return user;
      }
    })
    .catch((error) => {
      return { error: error };
    });
};

app.route("/api/users/:_id/exercises").post(async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  let newLog = {
    description: description,
    duration: duration,
    date: new Date(date).toDateString(),
  };

  const user = await findPersonById(_id);

  if (user.error) return res.json(user.error);
  user.log.push(newLog);
  let error = user.validateSync();

  if (error !== undefined) return res.json({ Error: error.message });
  user.save();
  return res.json({ _id: user._id, username: user.username, ...newLog });
});

app.get("/api/users/:id/logs", async (req, res) => {
  const { id } = req.params;
  const { from, to, limit } = req.query;

  console.log(limit);

  const user = await Users.find({ _id: id })
    .sort({ username: 1 })
    .select({ __v: 0 })
    .limit(Number(limit))
    .exec();
  console.log(user);

  // console.log(req.query)

  // const user = await findPersonById(id)
  // if (user.error) return res.json(user.error);
  // let userLog = [...user.log]
  // userLog = userLog.map((e)=>{
  //   return{description:e.description, duration:e.duration, date:new Date(e.date).toDateString()}
  // });

  // res.json({_id:user._id,username:user.username, count:user.__v,log:userLog})
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
