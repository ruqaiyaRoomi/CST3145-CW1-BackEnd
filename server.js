const e = require('express');
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
  'mongodb+srv://ruqaiyah:RR1026@cw1.u4ssebh.mongodb.net/',
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

app.use(function(req, res, next){
    console.log("in comes a " + req.method + " to " + req.url);
    next();
});

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

app.post('/Afterschool/orderInfo', (req, res, next) => {
    const errors = []
    const nameRegex = (/^[A-Za-z]+$/);
    const phoneRegex = /^\d{10}$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    const { name, phoneNumber, email, spaces, subject , lessonId } = req.body;

  if(!name || !phoneNumber || !email || !spaces || !subject || !lessonId) {
        errors.push("All fields are required.")
  }

  if(!nameRegex.test(name)) {
        errors.push("Please enter valid name")
  }

  if(!phoneRegex.test(phoneNumber)) {
        errors.push("Please enter valid phone number")
  }

  if(!emailRegex.test(email)) {
     errors.push("Please enter valid email")
  }

  if(errors.length > 0) {
    return res.status(400).send({
        orderSaved: false,
        errors
    })
  }
    const lessonIds = lessonId.map(id => ObjectID(id));
    const lessonCollection = db.collection('lesson');

    lessonCollection.find({_id: {$in: lessonIds}}).toArray((err, existingLessons) =>{
        if(err) return next(err);

        const lessonMap = {};
        existingLessons.forEach(l => {
            lessonMap[l._id.toString()] = {subject: l.subject, spaces: l.spaces}
        });    
        
        lessonIds.forEach((id) => {
            const idStr = id.toString();
            
            if(!lessonMap[idStr]) {
                errors.push(`Lesson id ${idStr} does not exist`);
            } else {
                if ((lessonMap[idStr].subject !== subject) ) {
                errors.push(`Subject for lesson ${idStr} does not match the id`)
                 }
                
                 if(spaces > lessonMap[idStr].spaces) {
                    errors.push(`No spaces left for Subject: ${subject}, Id: ${id}`)
                 }

            } 

        })

        if (errors.length > 0) {
            return res.status(400).send({
                orderSaved: false,
                errors,
            })
        }
    

    const orderInfoCollection = db.collection('orderInfo');
    const order = {
        name: name,
        phoneNumber: phoneNumber,
        email: email,
        subject: subject,
        spaces: spaces,
        lessonId: lessonIds
    }

  orderInfoCollection.insert(
          order, (e, results) => {
    if(e) return next(e) 
      res.send(results.ops)
  })

    })
});

app.put("/Afterschool/lesson/:id", (req,res, next) => {
    req.collection = db.collection('lesson')
    const lessonId = req.params.id
    const spaces = req.body.spaces
    
    req.collection.update(
        {_id: new ObjectID(lessonId)}, 
        {$set: {spaces: spaces}},
        {safe: true, multi: false},
        (e,result) => {
            if (e) return next(e)
            if (result.result && result.result.n === 1) {
                res.send({message: "success"})
            } else {
                res.send({message: "error"})
            }
        }
    )
});


app.get("/Afterschool/:lesson/search", (req,res, next) => {
    const keyword = req.query.q || "";
    console.log(keyword)

    const regex = new RegExp(keyword, "i");

    const collection = db.collection('lesson')
    
    const search = {
       $or: [
            { subject: { $regex: regex } },
            { location: { $regex: regex } },
        ]
    }

   collection.find(search).toArray((err, results) => {
        if (err) {
            console.error("MongoDB error:", err);
            return next(err);
        }

        console.log("Search results:", results); 
        res.send(results); 
    });

})