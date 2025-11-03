const express = require("express"); 
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const http = require("http");

const app = express();
app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://ruqaiyah:RR1026@cw1.u4ssebh.mongodb.net/?appName=1";
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 })

let db = client.db('Afterschool');

async function startServer() {
  try {
    await client.connect();
    db = client.db('Afterschool');
    console.log("Connected to MongoDB");
    
  http.createServer(app).listen(3000, () => {
      console.log("Server running on port 3000");
    });

  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
}


app.param('lesson', function(req,res,next, lesson) {
  req.collection = db.collection(lesson);
  return next();
})

app.get('/Afterschool/:lesson', async (req, res, next) => {
  try {
    const results = await req.collection.find({}).toArray();
    res.send(results);
  } catch (err) {
    next(err);
  }
});

app.post('/Afterschool/:orderInfo', async (req, res, next) => {
  try {
    const { name, phoneNumber, email } = req.body;

    const collection = db.collection('orderInfo');
    const order = { name, phoneNumber, email };

    const result = await collection.insertOne(order);
    res.status(201).send(result);
  } catch (err) {
    next(err);
  }
});

startServer();