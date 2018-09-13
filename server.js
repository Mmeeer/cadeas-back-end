#!/usr/bin/env nodejs
var config = require("./config.js")
config.setConfig()
var app = require("express")()
var server = require('http').Server(app)
var io = require('socket.io')(server)
var MongoClient = require("mongodb").MongoClient
var jwt = require("jsonwebtoken")
var randomstring = require("randomstring")
var cors = require("cors")
var bodyParser = require("body-parser")
var shuffle = require('shuffle-array')
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
          }, process.env.SECRET_KEY)
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
            jwt.verify(token, process.env.SECRET_KEY, function(err, decode){
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
app.get('/mastered/:day', function(req, res){
  var token = req.body.token || req.headers['authorization']
  var data = {};
  data.day = String(req.params.day)
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
            jwt.verify(token, process.env.SECRET_KEY, function(err, decode){
              if(err){
                res.json('error', {
                  success: false,
                  message: "Invalid Token!"
                })
              } else {
                if(decode.username == user.username && decode.password == user.password && decode.id == user._id){
                  if(!user.learning[Number(data.day)]){
                    res.json({
                      success: true,
                      mastered: 0
                    })
                  } else {
                    console.log(user.learning[Number(data.day)].server)
                    res.json({
                      success: true,
                      mastered: user.learning[Number(data.day)].server.masteredwords.length
                    })
                  }
                } else {
                  res.json({
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
app.get("/day/:day", function(req, res){
  var token = req.body.token || req.headers['authorization']
  var data = {};
  console.log(req.params.day)
  data.day = String(req.params.day);
  console.log(data.day)
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
            jwt.verify(token, process.env.SECRET_KEY, function(err, decode){
              if(err){
                res.json({
                  success: false,
                  message: "Invalid Token!"
                })
              } else {
                if(decode.username == user.username && decode.password == user.password && decode.id == user._id){
                  if(!user.learning[Number(data.day)]){
                    user.learning[Number(data.day)] = {client: { round: 1,point: { start: 0, end: 5, wordId: 0}, words: [], order: []}, server:{ knowwords: [], masteredwords: []}}
                    var i = user.learning[Number(data.day)].client.point.start, returning = [];
                    while(i < user.learning[Number(data.day)].client.point.end){
                      returning.push(user.list[Number(data.day)*100 + i])
                      i++
                    }
                    i = 0;
                    while(i < user.learning[Number(data.day)].client.point.end - user.learning[Number(data.day)].client.point.start){
                      user.learning[Number(data.day)].client.words.push({word: returning[i].word, isnew: true, score: 0, answers: []})
                      i++;
                    }
                    var testCol = [0, 1, 2, 3, 4], orderer = [];
                    i = 4;
                    while(i > 0){
                      i--;
                      var tmp = shuffle(testCol, { 'copy': true })
                      var size = tmp.length, j;
                      for(j = 0; j < size; j++){
                        orderer.push(tmp[j])
                      }
                    }
                    console.log(orderer)
                    user.learning[Number(data.day)].client.order = orderer.slice()
                    console.log("-----------day-created---------",user.learning[Number(data.day)].client, "-----------day-created---------")
                    db.collection('user').update({username: user.username}, user, {upsert: true})
                    res.json({success: true, wordId: user.learning[Number(data.day)].client.point.wordId})
                  } else {
                    console.log(user.learning[Number(data.day)],"haha")
                    res.json({success: true, wordId: user.learning[Number(data.day)].client.point.wordId})
                  }
                } else {
                  res.json({
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
app.get("/word/:day/:wordId", function(req, res){
  var token = req.body.token || req.headers['authorization']
  var data = {}
  data.day = String(req.params.day)
  data.wordId = String(req.params.wordId)
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
            jwt.verify(token, process.env.SECRET_KEY, function(err, decode){
              if(err){
                socket.emit('error', {
                  success: false,
                  message: "Invalid Token!"
                })
              } else {
                if(decode.username == user.username && decode.password == user.password && decode.id == user._id){
                  console.log(data)
                  db.collection('words').findOne({'word': data.wordId})
                  .then(function(theWord){
                    res.json({success:true, theWord})
                  })
                } else {
                  res.json({
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
app.get("/progress/:day/:wordId/:result", function(req, res){
  var token = req.body.token || req.headers['authorization']
  var data = {}
  data.day = String(req.params.day)
  data.wordId = Number(req.params.wordId)
  data.result = Number(req.params.result)
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
            jwt.verify(token, process.env.SECRET_KEY, function(err, decode){
              if(err){
                res.json({
                  success: false,
                  message: "Invalid Token!"
                })
              } else {
                if(decode.username == user.username && decode.password == user.password && decode.id == user._id){
                  console.log("fuuuuuuuuuck",data, "fuuuuuuuuuck")
                  console.log(Math.floor(data.wordId / user.learning[Number(data.day)].client.words.length), "ifif")
                  if(Math.floor(data.wordId / user.learning[Number(data.day)].client.words.length) == 0){
                    if(data.result == 4 || data.result == 3){
                      user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].score += 1;
                      user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].answers.push({answer: 1})
                    }
                    else {
                      user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].score += 0;
                      user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].answers.push({answer: 0})
                    }
                  }
                  else if(Math.floor(data.wordId / user.learning[Number(data.day)].client.words.length) == 1){
                    if(data.result == 4 || data.result == 3){
                      user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].score += 2;
                      user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].answers.push({answer: 2})
                    }
                    else {
                      user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].score += 0;
                      user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].answers.push({answer: 0})
                    }
                  }
                  else if(Math.floor(data.wordId / user.learning[Number(data.day)].client.words.length) == 2){
                    if(data.result == 4 || data.result == 3){
                      user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].score += 3;
                      user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].answers.push({answer: 3})
                    }
                    else {
                      user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].score += 0;
                      user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].answers.push({answer: 0})
                    }
                  }
                  else if(Math.floor(data.wordId / user.learning[Number(data.day)].client.words.length) == 3){
                    if(data.result == 4 || data.result == 3){
                      user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].score += 4;
                      user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].answers.push({answer: 4})
                    }
                    else {
                      user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].score += 0;
                      user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].answers.push({answer: 0})
                    }
                  }
                  console.log(user.learning[Number(data.day)].client.words, 'shaa')
                  user.learning[Number(data.day)].client.point.wordId = data.wordId + 1;
                  db.collection('user').update({username: user.username}, user, {upsert: true})
                  if(data.wordId == user.learning[Number(data.day)].client.words.length*4-1){
                    var i = user.learning[Number(data.day)].client.words.length
                    var size_known = user.learning[Number(data.day)].server.knowwords.length
                    var size_master = user.learning[Number(data.day)].server.masteredwords.length
                    console.log(i, size_known, size_master)
                    var j;
                    for(j = 0; j < i; j++){
                      var tmp = user.learning[Number(data.day)].client.words[j]
                      var b_known = false, b_master = false, k;
                      if(tmp.isnew == false){
                        for(k = 0; k < size_known; k++){
                          if(tmp.word == user.learning[Number(data.day)].server.knowwords[k].word){
                            b_known = true
                            user.learning[Number(data.day)].server.knowwords[k].score = tmp.score
                            user.learning[Number(data.day)].server.knowwords[k].answers = tmp.answers
                            user.learning[Number(data.day)].server.knowwords[k].isnew = false
                          }
                        }
                        for(k = 0; k < size_master; k++){
                          if(tmp.word == user.learning[Number(data.day)].server.masteredwords[k].word){
                            b_master = true
                            user.learning[Number(data.day)].server.knowwords[k].score = tmp.score
                            user.learning[Number(data.day)].server.knowwords[k].answers = tmp.answers
                            user.learning[Number(data.day)].server.knowwords[k].isnew = false
                          }
                        }
                      } else {
                        user.learning[Number(data.day)].server.knowwords.push({word: tmp.word, score: tmp.score, answers: tmp.answers, isnew: false})
                      }
                    }
                    console.log("FU")
                    var someorder = []
                    for(j = user.learning[Number(data.day)].server.knowwords.length; j > 0; j--){
                      console.log(user.learning[Number(data.day)].server.knowwords[j-1].score)
                      if(user.learning[Number(data.day)].server.knowwords[j-1].score >= 20){
                        user.learning[Number(data.day)].server.masteredwords.push(user.learning[Number(data.day)].server.knowwords[j-1])
                      } else {
                        someorder.push(user.learning[Number(data.day)].server.knowwords[j-1])
                      }
                    }
                    user.learning[Number(data.day)].server.knowwords = someorder
                    user.learning[Number(data.day)].server.knowwords.sort(function(a, b){
                      return a.score - b.score;
                    })
                    if(user.learning[Number(data.day)].server.masteredwords.length > 0){
                      user.learning[Number(data.day)].server.masteredwords.sort(function(a, b){
                        return a.score - b.score;
                      })
                    }
                    size_known = user.learning[Number(data.day)].server.knowwords.length
                    size_master = user.learning[Number(data.day)].server.masteredwords.length

                    console.log(user.learning[Number(data.day)].server.knowwords)
                    console.log(user.learning[Number(data.day)].server.masteredwords)
                    user.learning[Number(data.day)].client.words = []
                    user.learning[Number(data.day)].client.order = []
                    user.learning[Number(data.day)].client.round += 1
                    var x = user.learning[Number(data.day)].server.knowwords.length, y = user.learning[Number(data.day)].server.masteredwords.length
                    if(x < 6) {
                      user.learning[Number(data.day)].client.point.start =  user.learning[Number(data.day)].client.point.end;
                      user.learning[Number(data.day)].client.point.end = user.learning[Number(data.day)].client.point.end + 5;
                    }  else if(x < 12){
                      user.learning[Number(data.day)].client.point.start =  user.learning[Number(data.day)].client.point.end;
                      user.learning[Number(data.day)].client.point.end = user.learning[Number(data.day)].client.point.end + 4;
                    } else if(x < 18){
                      user.learning[Number(data.day)].client.point.start =  user.learning[Number(data.day)].client.point.end;
                      user.learning[Number(data.day)].client.point.end = user.learning[Number(data.day)].client.point.end + 3;
                    } else if(x < 24){
                      user.learning[Number(data.day)].client.point.start =  user.learning[Number(data.day)].client.point.end;
                      user.learning[Number(data.day)].client.point.end = user.learning[Number(data.day)].client.point.end + 2;
                    } else if (x < 30){
                      user.learning[Number(data.day)].client.point.start =  user.learning[Number(data.day)].client.point.end;
                      user.learning[Number(data.day)].client.point.end = user.learning[Number(data.day)].client.point.end + 1;
                    } else {
                      user.learning[Number(data.day)].client.point.start =  user.learning[Number(data.day)].client.point.end;
                      user.learning[Number(data.day)].client.point.end = user.learning[Number(data.day)].client.point.end;
                    }
                    console.log("FUNN")
                    user.learning[Number(data.day)].client.point.wordId = 0
                    //generate
                    //{client: { round: 1,point: { start: 0, end: 5, wordId: 0}, words: [], order: []}, server:{ knowwords: [], masteredwords: []}}
                    var i = user.learning[Number(data.day)].client.point.start, returning = [];
                    while(i < user.learning[Number(data.day)].client.point.end){
                      returning.push(user.list[Number(data.day)*100 + i])
                      i++
                    }
                    i = 0;
                    while(i < user.learning[Number(data.day)].client.point.end - user.learning[Number(data.day)].client.point.start){
                      user.learning[Number(data.day)].client.words.push({word: returning[i].word, isnew: true, score: 0, answers: []})
                      i++;
                    }
                    var tp = 10 - user.learning[Number(data.day)].client.words.length;
                    if(user.learning[Number(data.day)].server.masteredwords.length > 0){
                      tp--;
                      user.learning[Number(data.day)].client.words.push(user.learning[Number(data.day)].server.masteredwords[0])
                    }
                    for(i = 0; i < tp && i < user.learning[Number(data.day)].server.knowwords.length; i++){
                      user.learning[Number(data.day)].client.words.push(user.learning[Number(data.day)].server.knowwords[i])
                    }
                    tp = user.learning[Number(data.day)].client.words.length;
                    var testCol = [];
                    for(i = 0; i < tp; i++){
                      testCol.push(i)
                    }
                    var orderer = [];
                    i = 4;
                    while(i > 0){
                      i--;
                      var tmp = shuffle(testCol, { 'copy': true })
                      var size = tmp.length, j;
                      for(j = 0; j < size; j++){
                        orderer.push(tmp[j])
                      }
                    }
                    console.log(orderer)
                    user.learning[Number(data.day)].client.order = orderer.slice()
                    console.log("-----------gen-created---------",user.learning[Number(data.day)].client, "-----------gen-created---------")
                    db.collection('user').update({username: user.username}, user, {upsert: true})
                    res.json({success: true, wordId: user.learning[Number(data.day)].client.point.wordId})
                  } else {
                    res.json({success: true, wordId: user.learning[Number(data.day)].client.point.wordId})
                  }
                } else {
                  resj.json({
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
app.get('/cardgame/:day/:type', function(req, res){
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
            jwt.verify(token, process.env.SECRET_KEY, function(err, decode){
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
                  var start = req.params.day * 100;
                  var end = req.params.day*100 + 100, i;
                  if(end > le) end = le
                  for(i = start; i < end; i++){
                    listst.push(user.list[i])
                  }
                  if(req.params.type == 'random'){
                    var tmp = shuffle(listst, { 'copy': true })
                    user.learning[Number(req.params.day)] = {data: tmp, now: 0, right: 0, wrong: 0}
                    db.collection('user').updateOne({username: user.username}, {$set: user}, {upsert: true})
                    res.json({
                      success: true,
                      data: tmp,
                      right: 0,
                      wrong: 0,
                      now: 0
                    })
                  }
                }
              }
            })
          }
        }
      })
    })
  }
})
app.get('/cardgameAns/:day/:ans', function(req, res){
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
            jwt.verify(token, process.env.SECRET_KEY, function(err, decode){
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
                  var start = req.params.day * 100;
                  var end = req.params.day*100 + 100, i;
                  if(end > le) end = le;
                  console.log("WTF")
                  if(req.params.ans == 'itDoes'){
                    user.learning[Number(req.params.day)].data[user.learning[Number(req.params.day)].now].score++;
                    user.learning[Number(req.params.day)].data[user.learning[Number(req.params.day)].now].ans = {success: true};
                    user.learning[Number(req.params.day)].right++;
                    user.learning[Number(req.params.day)].now++;
                  } else if(req.params.ans == 'itDoesnt'){
                    user.learning[Number(req.params.day)].data[user.learning[Number(req.params.day)].now].ans = {success: false};
                    user.learning[Number(req.params.day)].wrong++;
                    user.learning[Number(req.params.day)].now++;

                  }
                  for(i = start; i < end; i++){
                    if(user.list[i].word == user.learning[Number(req.params.day)].data[user.learning[Number(req.params.day)].now - 1].word){
                      user.list[i] = user.learning[Number(req.params.day)].data[user.learning[Number(req.params.day)].now - 1];
                      break;
                    }
                  }
                  db.collection('user').update({username: user.username}, user, {upsert: true})
                  res.json({
                    success: true,
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
app.get('/getall/:day', function(req, res){
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
            jwt.verify(token, process.env.SECRET_KEY, function(err, decode){
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
                  var start = req.params.day * 100;
                  var end = req.params.day*100 + 100, i;
                  if(end > le) end = le
                  for(i = start; i < end; i++){
                    listst.push(user.list[i])
                  }
                  res.json({
                    success: true,
                    data: {success: true, list: listst}
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
// io.on('connection', function(socket){
//   socket.on('mastered', function(data){
//     var token = data.token
//     if(token){
//       MongoClient.connect("mongodb://localhost:27017", {useNewUrlParser: true}, function(err, client){
//         var db = client.db('test_db')
//         db.collection('user').findOne({'token': token})
//         .then(function(user){
//           if(err){
//             socket.emit('error', {
//               success: false,
//               message: "Something went wrong on the server"
//             })
//           } else {
//             if(!user){
//               socket.emit('error', {
//                 success: false,
//                 message: "Token is broken!"
//               })
//             } else {
//               jwt.verify(token, process.env.SECRET_KEY, function(err, decode){
//                 if(err){
//                   socket.emit('error', {
//                     success: false,
//                     message: "Invalid Token!"
//                   })
//                 } else {
//                   if(decode.username == user.username && decode.password == user.password && decode.id == user._id){
//                     if(!user.learning[Number(data.day)]){
//                       socket.emit('mastered', {mastered: 0})
//                     } else {
//                       console.log(user.learning[Number(data.day)].server)
//                       socket.emit('mastered', {mastered: user.learning[Number(data.day)].server.masteredwords.length})
//                     }
//                   } else {
//                     socket.emit('error', {
//                       success: false,
//                       message: "connection failed"
//                     })
//                   }
//                 }
//               })
//             }
//           }
//         })
//       })
//     }
//   })
//   socket.on('day', function(data){
//     var token = data.token
//     if(token){
//       MongoClient.connect("mongodb://localhost:27017", {useNewUrlParser: true}, function(err, client){
//         var db = client.db('test_db')
//         db.collection('user').findOne({'token': token})
//         .then(function(user){
//           if(err){
//             socket.emit('error', {
//               success: false,
//               message: "Something went wrong on the server"
//             })
//           } else {
//             if(!user){
//               socket.emit('error', {
//                 success: false,
//                 message: "Token is broken!"
//               })
//             } else {
//               jwt.verify(token, process.env.SECRET_KEY, function(err, decode){
//                 if(err){
//                   socket.emit('error', {
//                     success: false,
//                     message: "Invalid Token!"
//                   })
//                 } else {
//                   if(decode.username == user.username && decode.password == user.password && decode.id == user._id){
//                     if(!user.learning[Number(data.day)]){
//                       user.learning[Number(data.day)] = {client: { round: 1,point: { start: 0, end: 5, wordId: 0}, words: [], order: []}, server:{ knowwords: [], masteredwords: []}}
//                       var i = user.learning[Number(data.day)].client.point.start, returning = [];
//                       while(i < user.learning[Number(data.day)].client.point.end){
//                         returning.push(user.list[Number(data.day)*100 + i])
//                         i++
//                       }
//                       i = 0;
//                       while(i < user.learning[Number(data.day)].client.point.end - user.learning[Number(data.day)].client.point.start){
//                         user.learning[Number(data.day)].client.words.push({word: returning[i].word, isnew: true, score: 0, answers: []})
//                         i++;
//                       }
//                       var testCol = [0, 1, 2, 3, 4], orderer = [];
//                       i = 4;
//                       while(i > 0){
//                         i--;
//                         var tmp = shuffle(testCol, { 'copy': true })
//                         var size = tmp.length, j;
//                         for(j = 0; j < size; j++){
//                           orderer.push(tmp[j])
//                         }
//                       }
//                       console.log(orderer)
//                       user.learning[Number(data.day)].client.order = orderer.slice()
//                       console.log("-----------day-created---------",user.learning[Number(data.day)].client, "-----------day-created---------")
//                       db.collection('user').update({username: user.username}, user, {upsert: true})
//                       socket.emit('news', {wordId: user.learning[Number(data.day)].client.point.wordId})
//                     } else {
//                       console.log(user.learning[Number(data.day)],"haha")
//                       socket.emit('news', {wordId: user.learning[Number(data.day)].client.point.wordId})
//                     }
//                   } else {
//                     socket.emit('error', {
//                       success: false,
//                       message: "connection failed"
//                     })
//                   }
//                 }
//               })
//             }
//           }
//         })
//       })
//     }
//   })
//   socket.on('word', function(data){
//     var token = data.token
//     if(token){
//       MongoClient.connect("mongodb://localhost:27017", {useNewUrlParser: true}, function(err, client){
//         var db = client.db('test_db')
//         db.collection('user').findOne({'token': token})
//         .then(function(user){
//           if(err){
//             socket.emit('error', {
//               success: false,
//               message: "Something went wrong on the server"
//             })
//           } else {
//             if(!user){
//               socket.emit('error', {
//                 success: false,
//                 message: "Token is broken!"
//               })
//             } else {
//               jwt.verify(token, process.env.SECRET_KEY, function(err, decode){
//                 if(err){
//                   socket.emit('error', {
//                     success: false,
//                     message: "Invalid Token!"
//                   })
//                 } else {
//                   if(decode.username == user.username && decode.password == user.password && decode.id == user._id){
//                     console.log(data)
//                     db.collection('words').findOne({'word': user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].word})
//                     .then(function(theWord){
//                       socket.emit('word', {theWord})
//                     })
//                   } else {
//                     socket.emit('error', {
//                       success: false,
//                       message: "Connection failed!"
//                     })
//                   }
//                 }
//               })
//             }
//           }
//         })
//       })
//     }
//   })
//   socket.on('progress', function(data){
//     var token = data.token
//     if(token){
//       MongoClient.connect("mongodb://localhost:27017", {useNewUrlParser: true}, function(err, client){
//         var db = client.db('test_db')
//         db.collection('user').findOne({'token': token})
//         .then(function(user){
//           if(err){
//             socket.emit('error', {
//               success: false,
//               message: "Something went wrong on the server"
//             })
//           } else {
//             if(!user){
//               socket.emit('error', {
//                 success: false,
//                 message: "Token is broken!"
//               })
//             } else {
//               jwt.verify(token, process.env.SECRET_KEY, function(err, decode){
//                 if(err){
//                   socket.emit('error', {
//                     success: false,
//                     message: "Invalid Token!"
//                   })
//                 } else {
//                   if(decode.username == user.username && decode.password == user.password && decode.id == user._id){
//                     console.log("fuuuuuuuuuck",data, "fuuuuuuuuuck")
//                     console.log(Math.floor(data.wordId / user.learning[Number(data.day)].client.words.length), "ifif")
//                     if(Math.floor(data.wordId / user.learning[Number(data.day)].client.words.length) == 0){
//                       if(data.result == 4 || data.result == 3){
//                         user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].score += 1;
//                         user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].answers.push({answer: 1})
//                       }
//                       else {
//                         user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].score += 0;
//                         user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].answers.push({answer: 0})
//                       }
//                     }
//                     else if(Math.floor(data.wordId / user.learning[Number(data.day)].client.words.length) == 1){
//                       if(data.result == 4 || data.result == 3){
//                         user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].score += 2;
//                         user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].answers.push({answer: 2})
//                       }
//                       else {
//                         user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].score += 0;
//                         user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].answers.push({answer: 0})
//                       }
//                     }
//                     else if(Math.floor(data.wordId / user.learning[Number(data.day)].client.words.length) == 2){
//                       if(data.result == 4 || data.result == 3){
//                         user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].score += 3;
//                         user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].answers.push({answer: 3})
//                       }
//                       else {
//                         user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].score += 0;
//                         user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].answers.push({answer: 0})
//                       }
//                     }
//                     else if(Math.floor(data.wordId / user.learning[Number(data.day)].client.words.length) == 3){
//                       if(data.result == 4 || data.result == 3){
//                         user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].score += 4;
//                         user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].answers.push({answer: 4})
//                       }
//                       else {
//                         user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].score += 0;
//                         user.learning[Number(data.day)].client.words[user.learning[Number(data.day)].client.order[data.wordId]].answers.push({answer: 0})
//                       }
//                     }
//                     console.log(user.learning[Number(data.day)].client.words, 'shaa')
//                     user.learning[Number(data.day)].client.point.wordId = data.wordId + 1;
//                     db.collection('user').update({username: user.username}, user, {upsert: true})
//                     if(data.wordId == user.learning[Number(data.day)].client.words.length*4-1){
//                       var i = user.learning[Number(data.day)].client.words.length
//                       var size_known = user.learning[Number(data.day)].server.knowwords.length
//                       var size_master = user.learning[Number(data.day)].server.masteredwords.length
//                       console.log(i, size_known, size_master)
//                       var j;
//                       for(j = 0; j < i; j++){
//                         var tmp = user.learning[Number(data.day)].client.words[j]
//                         var b_known = false, b_master = false, k;
//                         if(tmp.isnew == false){
//                           for(k = 0; k < size_known; k++){
//                             if(tmp.word == user.learning[Number(data.day)].server.knowwords[k].word){
//                               b_known = true
//                               user.learning[Number(data.day)].server.knowwords[k].score = tmp.score
//                               user.learning[Number(data.day)].server.knowwords[k].answers = tmp.answers
//                               user.learning[Number(data.day)].server.knowwords[k].isnew = false
//                             }
//                           }
//                           for(k = 0; k < size_master; k++){
//                             if(tmp.word == user.learning[Number(data.day)].server.masteredwords[k].word){
//                               b_master = true
//                               user.learning[Number(data.day)].server.knowwords[k].score = tmp.score
//                               user.learning[Number(data.day)].server.knowwords[k].answers = tmp.answers
//                               user.learning[Number(data.day)].server.knowwords[k].isnew = false
//                             }
//                           }
//                         } else {
//                           user.learning[Number(data.day)].server.knowwords.push({word: tmp.word, score: tmp.score, answers: tmp.answers, isnew: false})
//                         }
//                       }
//                       console.log("FU")
//                       var someorder = []
//                       for(j = user.learning[Number(data.day)].server.knowwords.length; j > 0; j--){
//                         console.log(user.learning[Number(data.day)].server.knowwords[j-1].score)
//                         if(user.learning[Number(data.day)].server.knowwords[j-1].score >= 20){
//                           user.learning[Number(data.day)].server.masteredwords.push(user.learning[Number(data.day)].server.knowwords[j-1])
//                         } else {
//                           someorder.push(user.learning[Number(data.day)].server.knowwords[j-1])
//                         }
//                       }
//                       user.learning[Number(data.day)].server.knowwords = someorder
//                       user.learning[Number(data.day)].server.knowwords.sort(function(a, b){
//                         return a.score - b.score;
//                       })
//                       if(user.learning[Number(data.day)].server.masteredwords.length > 0){
//                         user.learning[Number(data.day)].server.masteredwords.sort(function(a, b){
//                           return a.score - b.score;
//                         })
//                       }
//                       size_known = user.learning[Number(data.day)].server.knowwords.length
//                       size_master = user.learning[Number(data.day)].server.masteredwords.length

//                       console.log(user.learning[Number(data.day)].server.knowwords)
//                       console.log(user.learning[Number(data.day)].server.masteredwords)
//                       user.learning[Number(data.day)].client.words = []
//                       user.learning[Number(data.day)].client.order = []
//                       user.learning[Number(data.day)].client.round += 1
//                       var x = user.learning[Number(data.day)].server.knowwords.length, y = user.learning[Number(data.day)].server.masteredwords.length
//                       if(x < 6) {
//                         user.learning[Number(data.day)].client.point.start =  user.learning[Number(data.day)].client.point.end;
//                         user.learning[Number(data.day)].client.point.end = user.learning[Number(data.day)].client.point.end + 5;
//                       }  else if(x < 12){
//                         user.learning[Number(data.day)].client.point.start =  user.learning[Number(data.day)].client.point.end;
//                         user.learning[Number(data.day)].client.point.end = user.learning[Number(data.day)].client.point.end + 4;
//                       } else if(x < 18){
//                         user.learning[Number(data.day)].client.point.start =  user.learning[Number(data.day)].client.point.end;
//                         user.learning[Number(data.day)].client.point.end = user.learning[Number(data.day)].client.point.end + 3;
//                       } else if(x < 24){
//                         user.learning[Number(data.day)].client.point.start =  user.learning[Number(data.day)].client.point.end;
//                         user.learning[Number(data.day)].client.point.end = user.learning[Number(data.day)].client.point.end + 2;
//                       } else if (x < 30){
//                         user.learning[Number(data.day)].client.point.start =  user.learning[Number(data.day)].client.point.end;
//                         user.learning[Number(data.day)].client.point.end = user.learning[Number(data.day)].client.point.end + 1;
//                       } else {
//                         user.learning[Number(data.day)].client.point.start =  user.learning[Number(data.day)].client.point.end;
//                         user.learning[Number(data.day)].client.point.end = user.learning[Number(data.day)].client.point.end;
//                       }
//                       console.log("FUNN")
//                       user.learning[Number(data.day)].client.point.wordId = 0
//                       //generate
//                       //{client: { round: 1,point: { start: 0, end: 5, wordId: 0}, words: [], order: []}, server:{ knowwords: [], masteredwords: []}}
//                       var i = user.learning[Number(data.day)].client.point.start, returning = [];
//                       while(i < user.learning[Number(data.day)].client.point.end){
//                         returning.push(user.list[Number(data.day)*100 + i])
//                         i++
//                       }
//                       i = 0;
//                       while(i < user.learning[Number(data.day)].client.point.end - user.learning[Number(data.day)].client.point.start){
//                         user.learning[Number(data.day)].client.words.push({word: returning[i].word, isnew: true, score: 0, answers: []})
//                         i++;
//                       }
//                       var tp = 10 - user.learning[Number(data.day)].client.words.length;
//                       if(user.learning[Number(data.day)].server.masteredwords.length > 0){
//                         tp--;
//                         user.learning[Number(data.day)].client.words.push(user.learning[Number(data.day)].server.masteredwords[0])
//                       }
//                       for(i = 0; i < tp && i < user.learning[Number(data.day)].server.knowwords.length; i++){
//                         user.learning[Number(data.day)].client.words.push(user.learning[Number(data.day)].server.knowwords[i])
//                       }
//                       tp = user.learning[Number(data.day)].client.words.length;
//                       var testCol = [];
//                       for(i = 0; i < tp; i++){
//                         testCol.push(i)
//                       }
//                       var orderer = [];
//                       i = 4;
//                       while(i > 0){
//                         i--;
//                         var tmp = shuffle(testCol, { 'copy': true })
//                         var size = tmp.length, j;
//                         for(j = 0; j < size; j++){
//                           orderer.push(tmp[j])
//                         }
//                       }
//                       console.log(orderer)
//                       user.learning[Number(data.day)].client.order = orderer.slice()
//                       console.log("-----------gen-created---------",user.learning[Number(data.day)].client, "-----------gen-created---------")
//                       db.collection('user').update({username: user.username}, user, {upsert: true})
//                       socket.emit('news', {wordId: user.learning[Number(data.day)].client.point.wordId})
//                     } else {
//                       socket.emit('news', {success: true, wordId: user.learning[Number(data.day)].client.point.wordId})
//                     }
//                   } else {
//                     socket.emit('error', {
//                       success: false,
//                       message: "Connection failed!"
//                     })
//                   }
//                 }
//               })
//             }
//           }
//         })
//       })
//     }
//   })
// })
