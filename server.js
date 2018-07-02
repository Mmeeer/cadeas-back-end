#!/usr/bin/env nodejs
var app = require("express")()
var server = require('http').Server(app)
var io = require('socket.io')(server)
var MongoClient = require("mongodb").MongoClient
var jwt = require("jsonwebtoken")
var randomstring = require("randomstring")
var cors = require("cors")
var bodyParser = require("body-parser")
app.use(bodyParser.json({limit: '1mb'}))
app.use(bodyParser.urlencoded({extended: true, limit: '1mb'}))
app.use(cors())
server.listen(8080, function(){
  console.log("Server is running!")
})

app.post('/signup', function(req, res){
  MongoClient.connect("mongodb://localhost:27017/", {useNewUrlParser: true}, function(err, client){
    var db = client.db('test_db')
    db.collection('user').findOne({username: req.body.username})
    .then(function(doesFound){
      console.log(doesFound)
      if(doesFound){
        res.json({
          success: false,
          message: "Username is taken"
        })
      } else {
        if(req.body.password.length < 6){
          res.json({
            success: false,
            message: "Password is too short"
          })
        } else {
          db.collection('user').insertOne({username: req.body.username, password: req.body.password}) // i will hash password.
        }
      }
    })
  })
})

io.on('connection', function(socket){
  socket.on('event', function(data){
    socket.emit('news', { hello: 'world'})
  })
})