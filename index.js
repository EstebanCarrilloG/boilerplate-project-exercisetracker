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
  count: { type: Number, default: 0 },
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

app
  .route("/api/users")
  .get(async (req, res) => {
    const users = await Users.find();
    return res.json(users);
  })
  .post((req, res) => {
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
    duration: Number(duration),
    date:
      date === "" || date === undefined
        ? new Date().toDateString()
        : new Date(date).toDateString(),
  };

  const user = await findPersonById(_id);

  if (user.error) return res.json(user.error);
  user.log.push(newLog);
  let error = user.validateSync();

  if (error !== undefined) return res.json({ Error: error.message });
  user.count = user.log.length;
  user.save();
  return res.json({ username: user.username, ...newLog, _id: user._id });
});

function convertDateType(date) {
  if (date?.match(/^(\d+)$/)) {
    return new Date(Number(date));
  } else {
    return new Date(date);
  }
}

app.route("/api/users/:id/logs").get(async (req, res) => {
  const { id } = req.params;
  const { from, to, limit } = req.query;

  console.log(req.query);

  const fromDate = convertDateType(from);
  const toDate = convertDateType(to);

  console.log({ from: fromDate, to: toDate });

  const user = await findPersonById(id);
  if (user.error) return res.json(user.error);
  let userLog = [...user.log];

  let fromAndToDate = {};

  if (
    fromDate.toDateString() !== "Invalid Date" &&
    toDate.toDateString() !== "Invalid Date"
  ) {
    fromAndToDate = {
      from: fromDate.toDateString(),
      to: toDate.toDateString(),
    };
    userLog = userLog.filter((n) => n.date > fromDate && n.date < toDate);
  } else if (fromDate.toDateString() !== "Invalid Date") {
    fromAndToDate = { from: fromDate.toDateString() };
    userLog = userLog.filter((n) => n.date > fromDate);
  } else if (toDate.toDateString() !== "Invalid Date") {
    fromAndToDate = { to: toDate.toDateString() };
    userLog = userLog.filter((n) => n.date < toDate);
  }

  userLog = userLog.map((e) => {
    return {
      description: e.description,
      duration: e.duration,
      date: new Date(e.date).toDateString(),
    };
  });

  limit ? userLog.splice(limit) : 0;

  const { __v, log: _, ...userInfo } = user._doc;

  let resObject = {
    ...userInfo,
    ...fromAndToDate,
    log: userLog,
  };
  res.json(resObject);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
