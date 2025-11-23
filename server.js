// Import Packages
const express = require("express");
const MongoClient = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;

// Initailiz app
const app = express();
app.use(express.json());

app.set("port", 3000);

// CORS set up
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

let db;

// MongoDB connection
MongoClient.connect(
  "mongodb+srv://ruqaiyah:RR1026@cw1.u4ssebh.mongodb.net/",
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err, client) => {
    if (err) {
      console.log("Failed to connect:", err);
      return;
    }

    db = client.db("Afterschool");
    console.log("Connected to MongoDB");

    // start the server only if connection is successful
    app.listen(app.get("port"), () => {
      console.log(`Server running on port ${app.get("port")}`);
    });
  }
);

// Logger Middleware
app.use(function (req, res, next) {
  console.log("in comes a " + req.method + " to " + req.url);
  next();
});

app.param("lesson", function (req, res, next, lesson) {
  req.collection = db.collection(lesson);
  return next();
});

// GET all lessons
app.get("/Afterschool/:lesson", (req, res, next) => {
  req.collection.find({}).toArray((e, results) => {
    if (e) return next(e);
    res.send(results);
  });
});

// POST order
app.post("/Afterschool/orderInfo", (req, res, next) => {
  const errors = []; // array to collect validation errors

  // Regex
  const nameRegex = /^[A-Za-z]+$/;
  const phoneRegex = /^\d{10}$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const { name, phoneNumber, email, spaces, subject, lessonId } = req.body;

  // required field validation
  if (!name || !phoneNumber || !email || !spaces || !subject || !lessonId) {
    errors.push("All fields are required.");
  }

  // Validations for each field
  if (!nameRegex.test(name)) {
    errors.push("Please enter valid name");
  }

  if (!phoneRegex.test(phoneNumber)) {
    errors.push("Please enter valid phone number");
  }

  if (!emailRegex.test(email)) {
    errors.push("Please enter valid email");
  }

  // checks if there are validation errors and returns 400
  if (errors.length > 0) {
    return res.status(400).send({
      orderSaved: false,
      errors,
    });
  }


  const lessonCollection = db.collection("lesson");
  const lessonIds = lessonId.map((id) => id.toString());

  // Checks if lessonIDs exist and validates details
  lessonCollection.find({ _id: { $in: lessonIds.map(id => ObjectID(id)) } })
    .toArray((err, existingLessons) => {
      if (err) return next(err);

      const lessonMap = {};
      existingLessons.forEach((l) => {
        lessonMap[l._id.toString()] = { subject: l.subject, spaces: l.spaces };
      });

      // Checks if Subject and lessonIDs exsist, match and have spaces left
      lessonIds.forEach((idStr, index) => {
        const currentSubject = subject[index];
        const currentSpaces = spaces[index];

        const lesson = lessonMap[idStr]
        if (!lesson) {
          errors.push(`Lesson id ${idStr} does not exist`);
        } else {
          if (lesson.subject !== currentSubject) {
            errors.push(`Subject for lesson ${idStr} does not match the id`);
          }

          if (currentSpaces > lesson.spaces) {
            errors.push(`No spaces left for Subject: ${currentSubject}, Id: ${idStr}`);
          }
        }
      });

      if (errors.length > 0) {
        return res.status(400).send({
          orderSaved: false,
          errors,
        });
      }

      // Inserts order if validation is successful
      const orderInfoCollection = db.collection("orderInfo");
      const order = {
        name: name,
        phoneNumber: phoneNumber,
        email: email,
        subject: subject,
        spaces: spaces,
        lessonId: lessonIds,
      };

      orderInfoCollection.insert(order, (e, results) => {
        if (e) return next(e);
        res.send(results.ops);
      });
    });
});
// PUT route to update spaces
app.put("/Afterschool/lesson/:id", (req, res, next) => {
  req.collection = db.collection("lesson");
  const lessonId = req.params.id;
  const spaces = req.body.spaces;

  //update the spaces for each lesson
  req.collection.update(
    { _id: new ObjectID(lessonId) },
    { $set: { spaces: spaces } },
    { safe: true, multi: false },
    (e, result) => {
      if (e) return next(e);
      if (result.result && result.result.n === 1) {
        res.send({ message: "success" });
      } else {
        res.send({ message: "error" });
      }
    }
  );
});

// Search for lessons
app.get("/Afterschool/:lesson/search", (req, res, next) => {
  const keyword = req.query.q || ""; // query string
  console.log(keyword);

  const regex = new RegExp(keyword, "i"); // case-insensitive search
  const isNumber = !isNaN(keyword); // checks if keyword is numeric
  const numberValue = parseInt(keyword);
  const collection = db.collection("lesson");

  const search = {
    $or: [
      { subject: { $regex: regex } },
      { location: { $regex: regex } },
      ...(isNumber ? [{ price: numberValue }, { spaces: numberValue }] : []),
    ],
  };
  //Execute search
  collection.find(search).toArray((err, results) => {
    if (err) {
      console.error("MongoDB error:", err);
      return next(err);
    }

    console.log("Search results:", results);
    res.send(results);
  });
});
