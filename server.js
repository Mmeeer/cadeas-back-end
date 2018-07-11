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
          db.collection('list').findOne()
          .then(function(foundone){
            var theList = foundone.list
            var ctr = theList.length, temp, index
            while(ctr > 0){
              index = Math.floor(Math.random() * ctr)
              ctr--
              temp = theList[ctr]
              theList[ctr] = theList[index]
              theList[index] = temp
            }
            var objLen = theList.length, theObj = [], i = 0;
            while(objLen > 0){
              objLen--
              theList[objLen] = {word: theList[objLen], score: 0, ans: []}
            }
            db.collection('user').insertOne({username: req.body.username, password: req.body.password, list: theList, option: 100, learning: []}) // i will hash password.
            .then(function(createdUser){
              res.json({
                success: true,
                message: "Your account is created."
              })
            })
          })
        }
      }
    })
  })
})
app.post('/login', function(req, res){
  MongoClient.connect("mongodb://localhost:27017", {useNewUrlParser: true}, function(err, client){
    var db = client.db('test_db')
    db.collection('user').findOne({username: req.body.username})
    .then(function(doesFound){
      if(!doesFound){
        res.json({
          success: false,
          message: "User not found"
        })
      } else {
        if(req.body.password != doesFound.password){
          res.json({
            succes: false,
            message: "Username or Password is wrong!"
          })
        } else {
          var date = new Date()
          var token = jwt.sign({
            username: doesFound.username,
            password: doesFound.password,
            id: doesFound._id
          }, "process.env.SECRET_KEY") // i will create this variable
          db.collection('user').findOneAndUpdate({username: req.body.username}, {$set: {token: token}}, function(err, createdUser){
            res.json({
              success: true,
              data: {
                token: token,
                id: createdUser.value._id
              }
            })
            console.log(createdUser)
          })
        }
      }
    })
  })
})
app.get('/lisa/:id', function(req, res){
  var token = req.body.token || req.headers['authorization']
  if(token){
    MongoClient.connect("mongodb://localhost:27017", {useNewUrlParser: true}, function(err, client){
      var db = client.db('test_db')
      db.collection('user').findOne({'token': token})
      .then(function(user){
        if(err){
          res.json({
            success: false,
            message: "Something went wrong on the server"
          })
        } else {
          if(!user){
            res.json({
              success: false,
              message: "Token is broken!"
            })
          } else {
            jwt.verify(token, "process.env.SECRET_KEY", function(err, decode){
              if(err){
                res.json({
                  success: false,
                  message: "Invalid Token!"
                })
              } else {
                if(decode.username == user.username && decode.password == user.password && decode.id == user._id){
                  console.log("----------hello lisa-----------")
                  var listst = []
                  var le = user.list.length
                  var it = 0
                  while(le > 0){
                    le-=100;
                    listst[it] = {id: it}
                    it++;
                  }
                  res.json({
                    success: true,
                    data: {list: listst}
                  })
                }
              }
            })
          }
        }
      })
    })
  }
})

io.on('connection', function(socket){
  socket.on('day', function(data){
    var token = data.token
    if(token){
      MongoClient.connect("mongodb://localhost:27017", {useNewUrlParser: true}, function(err, client){
        var db = client.db('test_db')
        db.collection('user').findOne({'token': token})
        .then(function(user){
          if(err){
            socket.emit('error', {
              success: false,
              message: "Something went wrong on the server"
            })
          } else {
            if(!user){
              socket.emit('error', {
                success: false,
                message: "Token is broken!"
              })
            } else {
              jwt.verify(token, "process.env.SECRET_KEY", function(err, decode){
                if(err){
                  socket.emit('error', {
                    success: false,
                    message: "Invalid Token!"
                  })
                } else {
                  if(decode.username == user.username && decode.password == user.password && decode.id == user._id){
                    if(!user.learning[Number(data.day)]){
                      user.learning[Number(data.day)] = {round: 1, start: 0, end: 5, newwords: [], oldwords: [], workingOn: []}
                      var i = user.learning[Number(data.day)].start, returning = [];
                      while(i < user.learning[Number(data.day)].end){
                        returning.push(user.list[Number(data.day)*100 + i])
                        i++
                      }
                      user.learning[Number(data.day)].newwords = returning.slice()
                      var ctr, theList = [], lenn = 4, temp, index
                      while(lenn > 0){
                        lenn--
                        ctr = returning.length
                        while(ctr > 0){
                          index = Math.floor(Math.random() * ctr)
                          ctr--
                          temp = returning[ctr]
                          returning[ctr] = returning[index]
                          returning[index] = temp
                        }
                        var lentt = returning.length
                        console.log(returning)
                        while(lentt > 0){
                          lentt--
                          theList.push({word: returning.slice()[lentt].word, scored: false, ans: ""})
                        }
                      }
                      console.log("-----------day-created---------",theList, "-----------day-created---------")
                      user.learning[Number(data.day)].workingOn = theList
                      db.collection('user').update({username: user.username}, user, {upsert: true})
                      socket.emit('news', {data: user.learning[Number(data.day)]})
                    } else {
                      console.log(user.learning[Number(data.day)])
                      socket.emit('news', {data: user.learning[Number(data.day)]})
                    }
                  } else {
                    socket.emit('error', {
                      success: false,
                      message: "connection failed"
                    })
                  }
                }
              })
            }
          }
        })
      })
    }
  })
  socket.on('progress', function(data){
    console.log(data)
    var token = data.token
    if(token){
      MongoClient.connect("mongodb://localhost:27017", {useNewUrlParser: true}, function(err, client){
        var db = client.db('test_db')
        db.collection('user').findOne({'token': token})
        .then(function(user){
          if(err){
            socket.on('error', {
              success: false,
              message: "Something went wrong on the server"
            })
          } else {
            if(!user){
              socket.on('error', {
                success: false,
                message: "Token is broken!"
              })
            } else {
              jwt.verify(token, "process.env.SECRET_KEY", function(err, decode){
                if(err){
                  socket.on('error', {
                    success: false,
                    message: "Invalid Token!"
                  })
                } else {
                  if(decode.username == user.username && decode.password == user.password && decode.id == user._id){
                    var i = 0;
                    while(i < 100){
                      if(user.list[Number(data.day) * 100 + i].word == data.word){
                        user.list[Number(data.day) * 100 + i] = data.change
                        break;
                      }
                      i++;
                    }
                    user.learning[Number(data.day)] = data.data
                    console.log("---------progress--------", data.data, "-----------progress-------------")
                    db.collection('user').update({username: user.username}, user, {upsert: true})
                    socket.emit('progress', {saved: true})
                  } else {
                    socket.on('error', {
                      success: false,
                      message: "Connection failed!"
                    })
                  }
                }
              })
            }
          }
        })
      })
    }
  })
  socket.on('finished', function(data){
    var token = data.token
    if(token){
      MongoClient.connect("mongodb://localhost:27017", {useNewUrlParser: true}, function(err, client){
        var db = client.db('test_db')
        db.collection('user').findOne({'token': token})
        .then(function(user){
          if(err){
            socket.on('error', {
              success: false,
              message: "Something went wrong on the server"
            })
          } else {
            if(!user){
              socket.on('error', {
                success: false,
                message: "Token is broken!"
              })
            } else {
              jwt.verify(token, "process.env.SECRET_KEY", function(err, decode){
                if(err){
                  socket.on('error', {
                    success: false,
                    message: "Invalid Token!"
                  })
                } else {
                  if(decode.username == user.username && decode.password == user.password && decode.id == user._id){
                    user.learning[Number(data.day)].workingOn = [];
                    var j = user.learning[Number(data.day)].oldwords.length, tmp = []
                    while(j > 0){
                      j--
                      if(user.learning[Number(data.day)].oldwords[j].score >= 25){

                      } else {
                        tmp.push(user.learning[Number(data.day)].oldwords[j])
                      }
                    }
                    user.learning[Number(data.day)].oldwords = tmp.slice()
                    j = user.learning[Number(data.day)].newwords.length
                    while(j > 0){
                      j--
                      user.learning[Number(data.day)].oldwords.push(user.learning[Number(data.day)].newwords[j])
                    }
                    user.learning[Number(data.day)].newwords = []
                    j = user.learning[Number(data.day)].oldwords.length
                    user.learning[Number(data.day)].start = user.learning[Number(data.day)].end
                    if(j <= 6) user.learning[Number(data.day)].end = user.learning[Number(data.day)].start + 5
                    else if(j <= 12) user.learning[Number(data.day)].end = user.learning[Number(data.day)].start + 4
                    else if(j <= 18) user.learning[Number(data.day)].end = user.learning[Number(data.day)].start + 3
                    else if(j <= 24) user.learning[Number(data.day)].end = user.learning[Number(data.day)].start + 2
                    else if(j <= 30) user.learning[Number(data.day)].end = user.learning[Number(data.day)].start + 1
                    else user.learning[Number(data.day)].end = user.learning[Number(data.day)].start
                    if(user.learning[Number(data.day)].end > 100) user.learning[Number(data.day)].end = 100
                    if(user.learning[Number(data.day)].start > 100) user.learning[Number(data.day)].start = 100
                    j = user.learning[Number(data.day)].start
                    tmp = []
                    while(j < user.learning[Number(data.day)].end){
                      tmp.push(user.list[Number(data.day)*100 + j])
                      j++
                    }
                    user.learning[Number(data.day)].newwords = tmp.slice()
                    j = 10 - tmp.length
                    var k = user.learning[Number(data.day)].oldwords.length, step = 0;
                    user.learning[Number(data.day)].oldwords.sort(function(a, b){
                      if(a.score > b.score) return 1
                      else return -1
                    })
                    while(j > 0 && step < k){
                      j--;
                      tmp.push(user.learning[Number(data.day)].oldwords[step])
                      step++;
                    }
                    // generate workingOn
                    var ctr, theList = [], lenn = 4, temp, index

                    console.log(tmp)
                    while(lenn > 0){
                      console.log(lenn)
                      lenn--
                      ctr = tmp.length
                      while(ctr > 0){
                        index = Math.floor(Math.random() * ctr)
                        ctr--
                        temp = tmp[ctr]
                        tmp[ctr] = tmp[index]
                        tmp[index] = temp
                      }
                      var lentt = tmp.length
                      console.log(tmp)
                      while(lentt > 0){
                        lentt--
                        theList.push({word: tmp.slice()[lentt].word, scored: false, ans: ""})
                      }
                    }
                    console.log("-----------finished-------------", theList, "----------finished-----------")
                    user.learning[Number(data.day)].workingOn = theList.slice()
                    db.collection('user').update({username: user.username}, user, {upsert: true})
                    if(user.learning[Number(data.day)].workingOn.length > 0){
                      socket.emit('news', {data: user.learning[Number(data.day)]})
                    } else {
                      socket.emit('cong', {success: true})
                    }
                  } else {
                    socket.on('error', {
                      success: false,
                      message: "Connection failed!"
                    })
                  }
                }
              })
            }
          }
        })
      })
    }
  })
  socket.on('word', function(data){
    var token = data.token
    if(token){
      MongoClient.connect("mongodb://localhost:27017", {useNewUrlParser: true}, function(err, client){
        var db = client.db('test_db')
        db.collection('user').findOne({'token': token})
        .then(function(user){
          if(err){
            socket.on('error', {
              success: false,
              message: "Something went wrong on the server"
            })
          } else {
            if(!user){
              socket.on('error', {
                success: false,
                message: "Token is broken!"
              })
            } else {
              jwt.verify(token, "process.env.SECRET_KEY", function(err, decode){
                if(err){
                  socket.on('error', {
                    success: false,
                    message: "Invalid Token!"
                  })
                } else {
                  if(decode.username == user.username && decode.password == user.password && decode.id == user._id){
                    console.log(data)
                    db.collection('words').findOne({word: data.word})
                    .then(function(theWord){
                      socket.emit('word', {data: theWord})
                    })
                  } else {
                    socket.on('error', {
                      success: false,
                      message: "Connection failed!"
                    })
                  }
                }
              })
            }
          }
        })
      })
    }
  })
})