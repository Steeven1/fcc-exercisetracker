const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const userSchema = mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseSchemas = mongoose.Schema({
  username: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String, required: true },
  user_id: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchemas);
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", (req, res) => {
  const user = new User({ username: req.body.username });
  user
    .save()
    .then((data) => {
      res.json(data);
    })
    .catch((err) =>
      res.json({
        error: "some ocurrs to saver user",
      }),
    );
});

app.get("/api/users", async (req, res) => {
  const usersFound = await User.find({}).select("_id username");
  if (!usersFound) {
    res.json({ error: "not found users" });
  }
  res.json(usersFound);
});

app.post("/api/users/:_id/exercises", (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;
  User.findById(id)
    .then((user) => {
      const username = user.username;
      const newExercise = new Exercise({
        username,
        description,
        duration,
        date: date ? new Date(date).toDateString() : new Date().toDateString(),
        user_id: user._id,
      });
      newExercise
        .save()
        .then((data) => {
          res.json({
            _id: user._id,
            username: user.username,
            date: new Date(newExercise.date).toDateString(),
            duration: newExercise.duration,
            description: newExercise.description,
          });
        })
        .catch((err) =>
          res.json({
            error: "some ocurrs to save exercise",
          }),
        );
    })
    .catch((err) =>
      res.json({
        error: "not found user",
      }),
    );
});

app.get("/api/users/:_id/logs", async (req, res) => {
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;
  let id = req.params._id;
  let user = await User.findById(id);
  if (!user) {
    res.json({ error: "not found user" });
  }
  let dateObj = {};
  if (from) {
    dateObj["$gte"] = new Date(from);
  }
  if (to) {
    dateObj["$lte"] = new Date(to);
  }

  let filter = {
    user_id: id,
  };

  if (from || to) {
    filter.date = dateObj;
  }

  let exercises = await Exercise.find(filter)
    .limit(+limit ?? 500)
    .select("description duration date -_id")
    .lean();

  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log: exercises.map((e) => ({
      ...e,
      date: e.date,
    })),
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
