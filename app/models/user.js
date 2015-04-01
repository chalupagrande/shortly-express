var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,

  initialize : function(){
    this.on('creating', function(model, attrs, options){
      var salt = '$2a$10$BVbonrqUej2PlzLYfXiGju';
      var newStuff = bcrypt.hashSync(model.get('password'), salt);
      model.set('password', newStuff);
      console.log('new password is ',model.get('password'))
        
        //ASYNCH CODE 

        // , function() {}, function(err, hash) {
        //   console.log('hash is ',hash)
        //   model.set('password', hash)
        //   console.log('new password is ',model.get('password'))
        // })
      // })


      // bcrypt.hash(model.get('password'), 8, function(){ }, function(err, hash){
      //   console.log("Inside hash!!!!!!!", hash)
      //   model.set('password', hash)
      //   console.log('hashed password is ', model.get('password'))
        
      // });
    })
  }

  //put in database
});

module.exports = User;