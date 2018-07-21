var MongoClient = require("mongodb").MongoClient
var ObjectId = require('mongodb').ObjectID;
MongoClient.connect("mongodb://localhost:27017/", {useNewUrlParser: true}, function(err, client){
  var db = client.db('test_db'), otherlist = [];
  db.collection('list').findOne()
  .then(function(foundone){
    console.log(foundone.list.length)
    var i, j;
    for(i = 0; i < foundone.list.length; i++){
      db.collection('words').findOne({word: foundone.list[i]})
      .then(function(shit){
        if(shit.results != undefined){
          otherlist.push(shit.word)
        }
      })
    }
    setTimeout(function(){ 
      foundone.list = otherlist
      db.collection('list').update({_id : ObjectId("5b3b09e830566d0d1ec21176")}, foundone, {upsert: true})
      console.log("SHIT", otherlist.length)
    }, 13000)
  })
})