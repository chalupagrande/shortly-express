var db = require('../config');

var Session = db.Model.extend({
  tableName: 'sessions',
  hasTimestamps: true,


  initialize: function(){
  }

});

module.exports = Session;
