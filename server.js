const express = require('express')
const  MongoClient  = require('mongodb').MongoClient
 const ObjectID = require('mongodb').ObjectID;

const app = express()
app.use(express.json());
app.set('port', 3000)


app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader("Access-Control-Allow-Credentials", "true")
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    next()
})

let db;

MongoClient.connect(
  'mongodb+srv://ruqaiyah:RR1026@cw1.u4ssebh.mongodb.net',
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err, client) => {
    if (err) {
      console.log("Failed to connect:", err);
      return;
    }

    db = client.db("Afterschool");
    console.log("Connected to MongoDB");

    app.listen(app.get('port'), () => {
      console.log(`Server running on port ${app.get('port')}`);
    });
  }
);

app.param('lesson', function(req,res,next, lesson) {
  req.collection = db.collection(lesson);
  return next();
})

app.get('/Afterschool/:lesson', (req, res, next) => {
      req.collection.find({}).toArray((e, results) => {
        if(e) return next(e)
          res.send(results)
      })
});


app.post('/Afterschool/:orderInfo', (req, res, next) => {
  const { name, phoneNumber, email, spaces, lessonId } = req.body;

  req.collection = db.collection('orderInfo');

    const lessonIds = req.body.lessonId.map(id => ObjectID(id));

    const order = {
        name: name,
        phoneNumber: phoneNumber,
        email: email,
        spaces: spaces,
        lessonId: lessonIds
    }

  req.collection.insert(
          order, (e, results) => {
    if(e) return next(e) 
      res.send(results.ops)
  })
});


app.put("/Afterschool/lesson/:id"), (req,res, next) => {
    req.collection = db.collection('lesson')
    const lessonId = req.params.id
    const spaces = req.body
    
    req.collection.update(
        {_id: new ObjectID(lessonId)}, 
        {$set: spaces},
        {safe: true, multi: false},
        (e,result) => {
            if (e) return next(e)
            res.send(result.result.n === 1? {msg: 'success'} : {msg: 'error'})
        }
    )
}
