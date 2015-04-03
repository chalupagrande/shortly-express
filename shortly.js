var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var bcrypt = require('bcrypt-nodejs');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var Session = require('./app/models/session.js');

var app = express();
// app.use(cookieParser())
// var salt = bcrypt.genSaltSync(10)//, function(err, salt) {

var cookieParser = function(string){
  var cookies = string.split("; ");
  var obj = {}
  for(var i = 0; i < cookies.length; i++){
    cookies[i]= cookies[i].split("=");
    obj[cookies[i][0]] = cookies[i][1]
  }
  return obj;
}

var createSessionId = function(req){
  var time = new Date().getTime()
  // console.log(time)
  var curPass = req.body.username + req.body.password + time;
  var salt = '$2a$10$BVbonrqUej2PlzLYfXiGju';
  var hashedp = bcrypt.hashSync(curPass, salt);
  return hashedp
}

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


app.get('/', 
function(req, res) {
  // console.log('test')
  if (req.headers.cookie === undefined) {
    res.redirect('/login')
  } else {
      // console.log('orig is ',req.headers.cookie);
      var cookie = cookieParser(req.headers.cookie);
      // console.log('cookie is ',cookie)
      // if (!cookie) {
      //   res.redirect('/login')
      // }
      // console.log('token is ',cookie['shortly_token']);
      new Session({session_key : cookie['shortly_token']})
        .fetch()
        .then(function(sess) {
          // console.log(sess)
          if (!sess) {
            res.redirect('/login')
          } else {
            res.render('index');
          }
        })
    }
});

app.get('/logout', 
function(req, res) {
  var cookie = cookieParser(req.headers.cookie);
   new Session({session_key : cookie['shortly_token'].replace(/%24/g,"$").replace(/%2F/g,"/")})
        .fetch()
        .then(function(sess) {
          if (sess) {
            console.log('destroyed')
           sess.destroy(); 
          }
        })
  
  res.redirect('/');
});

app.get('/create', 
function(req, res) {
  if (!req.headers.cookie) {
    res.redirect('/login')
  }
  res.render('index');
});

app.get('/links', 
function(req, res) {
  if (req.headers.cookie === undefined) {
    res.redirect('/login')
  }
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.get('/login', 
function(req, res) {
  res.render('login');
});

app.get('/signup', 
function(req, res) {
  res.render('signup');
});

//~~~~~~~~~~~
// var salt = bcrypt.genSaltSync(10)//, function(err, salt) {

app.post('/login', 
function(req, res) {
  new User({username : req.body.username})
    .fetch()
    .then(function(model) {
      if (model) {
        var pass = model.hashPassword(req);
        //their password is correct
        if(model.get('password') === pass){
          //create session id
          var session_id = createSessionId(req);
          // res.clearCookie('second_cookie')
          res.cookie('shortly_token', session_id);
          res.cookie('shortly_username', req.body.username);

          var session = new Session ({
            user_id : req.body.username,
            session_key : session_id
          })

          session.save().then(
            console.log("I didnt break.... ")
          )
          res.redirect('/');
          

        }else{
          console.log(" Your password were incorrect.")
          res.redirect('/login')
        }

      } else {
        //redirect to signup
        console.log(" Your username was not found.")
        res.redirect('/login')
        
      }
    })


});

app.post('/signup', 
function(req, res) {
  new User({username : req.body.username})
    .fetch()
    .then(function(found) {
      if (found) {
        console.log("Your username is taken. Choose another")
        res.redirect('/signup')
      } else {
        var user = new User({
          username : req.body.username,
          password : req.body.password,
        });
        user.save().then(function(newUser){
          Users.add(newUser);
          res.redirect('/')
        })
      }
    })
});

app.get('/logout', function(){

});

//~~~~~~~~~~


app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

//this is where the login and signup stuff goes

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
