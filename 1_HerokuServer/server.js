/*
adapted from Tom Igoe's repo
TO DO:  Add in a feature to send different formats of UUID, using the parse/unparse
functions from the npm UUID library.
*/


//this is going to be running on a digital ocean server ////
//evesserver.com:8080
//this has all the routes /login


var config = require('./config.js');
var express = require('express');         // include express.js
var app = express();                      // a local instance of it
var bodyParser = require('body-parser');  // include body-parser
var uuid = require('uuid');               // include a UUID generator
var http = require('http');      // include http to make a client
// var noble = require('noble');   //noble library

// the service UUID and characteristic UUID for the game:
var serviceUuid = config.serviceUuid;
var characteristicUuid = config.characteristicUuid;
var users = config.users;
var beacons = config.beacons;
var adminKey = config.adminKey;
var beaconRange = config.beaconLimit;
var finalBeaconName = config.beacons[config.beacons.length-1].name;
var gameOver = false;
var winner = '';

app.use(express.static('public'));                  // static files go in /public
app.use(bodyParser.json());                         // for  application/json
app.use(bodyParser.urlencoded({ extended: true })); // for application/x-www-form-urlencoded

// this runs after the server successfully starts:
function serverStart() {
  var port = server.address().port;
  console.log('Server listening on port '+ port + ' at ' + new Date());
}

// callback function for the route /login:
function login(request, response) {

  var thisUser = {
    score : 0,
    token : uuid.v4()                 // generate a token
  };
  if (request.method === 'GET') {
    thisUser.username = request.params.username;  // get submitted username
    thisUser.ip = request.ip; // get submitted client IP address
    thisUser.adminKey = request.params.adminKey; // get user admin key, if submitted
  }

  if (request.method === 'POST') {
    // console.log(thisUser.ip)
      thisUser.username = request.body.username;  // get submitted username
      thisUser.ip = request.ip;                  // get submitted client IP address
      thisUser.adminKey = request.body.adminKey;  // get user admin key, if submitted
  }
  var result = {};               // JSON object for returning results

  userIndex = -1;                     // index of the requested user in the list
  result.timestamp = new Date();      // timestamp the response result
  result.clientAddress = request.ip;  // add the client address to the result

  // iterate over the users list, from the config file
  users.forEach(function(user) {
    if (user.ip === thisUser.ip && user.username != thisUser.username) {
      // if they have logged in another user from this address,
      // don't let them re-register:
      result.error ='another user is logged in from this address, ' + thisUser.username;
    }

    // if the username matches the request username:
    if (user.username === thisUser.username) {
      if (user.token) {
        // if they have a token already, don't let them re-register:
        result.error ='you have an existing token, ' + thisUser.username;
      }
      //isn't the first parameter true always bc we're in a forEach loop?
      if (user.ip && user.ip != thisUser.ip) {
        // if they are logged in from another address,
        // don't let them re-register:
        result.error = thisUser.username + ' is logged in from another address.';
      }
      if (thisUser.adminKey === adminKey) {
        // they get admin privileges
        user.admin = true;
      }
      // you'll need the index of this user in the list later,
      // so save it to a variable:
      userIndex = users.indexOf(user);
    }
  });

  // here's where you use the index of the user:
  if (userIndex === -1) {
    // if they are not in the list,
    // don't let them log in:
    result.error = thisUser.username + ' is not in the list of users.';
  }

  // if you got through with no errors, you have a valid user:
  if (!result.error) {
    // transfer properties from thisUser to users[userIndex]:
    users[userIndex].username = thisUser.username;
    users[userIndex].ip = thisUser.ip;
    users[userIndex].score = thisUser.score;
    users[userIndex].token = thisUser.token;
    result.username = thisUser.username;    // add the username to the response result
    result.token = thisUser.token;          // add the token
    result.service = serviceUuid;           // add service UUID and the characteristic UUID
    result.characteristic = characteristicUuid;
  }

  // send a JSON response:
  //end() - closes the socket that was opened to do the http request.
  response.json(result).end();
  console.log(result);
} //login function done

// callback function for the route /logout:
function logout(request, response) {
  var result = {};                      // JSON object for returning results
  var thisUser = request.body.username; // get submitted username
  var thisToken = request.body.token;   // get the user ID token
  result.timestamp = new Date();        // timestamp the response result
  result.clientAddress = request.ip;    // add the client address to the result

  // iterate over the users list:
  users.forEach(function(user) {
    if (user.username === thisUser) {   // if the username matches the request username
      if (user.token === thisToken ||   // if the token matches the request token
        user.ip === request.ip) {       // or the client IP matches the user IP
          user.token = null;            // clear the user token
          user.score = 0;               // clear the user score
          user.ip = null;               // clear the user IP
          releaseBeacons(thisUser);     // release any beacons the user has claimed
          result.message = 'user ' + user.username + ' logged out';
        }  else {                         // if they didn't give you a valid token,
        result.error ='invalid token for user ' + thisUser;
      }
    }
  });

  // send a JSON response:
  response.json(result).end();
  console.log(result);
  console.log('\n');
}

// helper function for the logout() function. Releases all beacons
// owned by a given owner:
function releaseBeacons(user) {
  beacons.forEach(function(beacon){
    if (beacon.owner === user) {
      beacon.owner = null;
    }
  });
}


function clearUser(request, response) {
  var result = {};

  var thisUser = request.params.username;
  users.forEach(function(user) {
    if (user.username === thisUser) {
      user.token = null;            // clear the user token
      user.score = 0;               // clear the user score
      user.ip = null;               // clear the user IP
      releaseBeacons(thisUser);     // release any beacons the user has claimed
      result.message = 'WARNING: user ' + user.username + ' cleared';
      result.timestamp = new Date();
    }
  });

  // send a JSON response:
  response.json(result).end();
  console.log(result);
  console.log('\n');
}

// helper function for server admin:
function listBeacons(request, response) {
  var result = {};
  users.forEach(function(user){     // check the list
    if (user.ip === request.ip &&   // if there's a user with this IP
    user.admin === true) {        // and that user is the admin
      result = beacons;           // then he or she can see the result
    } else {
      result.error = 'you are not an administrator.';
    }
  });
  // send a JSON response:
  response.json(result).end();
  console.log(result);
  console.log('\n');
}

// helper function for server admin:
function listUsers(request, response) {
  console.log(request.body);
  var result = {};
  users.forEach(function(user){
    if (user.ip === request.ip &&
      user.admin === true) {
        result = users;
      } else {
        result.error = 'you are not an administrator.';
      }
    });
    // send a JSON response:
    response.json(result).end();
    console.log(result);
    console.log('\n');
  }
  /*

  callback function for the route /login

  client will send:
  "token": your tokenUuid,
  "localname": the local name of the peripheral that you found,
  "rssi": the RSSI that you got when you found the peripheral,
  "characteristic":  the only characteristic that the <serviceUuid> service has
  "points": the value of the <characteristicUuid> characteristic
  */

  function getBeacon(request, response) {
    var result = {};                            // JSON object for returning results
    var thisUser;                               // the user who made this request
    users.forEach(function(user) {              // look up user from the request token
      if (user.token === request.body.token) {  // if the token matches, then
        thisUser = user;                        // this is the right user
      }
    });
    result.timestamp = new Date();        // timestamp the response result
    result.clientAddress = request.ip;    // add the client address to the result

    // if the game is over, tell the user that:
    if (gameOver === true) {
      result.error = 'The game is over. ' + winner + ' has won.';
    }

    // if the game is not over,
    // iterate over the beacons to validate the claim:
    beacons.forEach(function(beacon){
      // if one matches the request name:
      if (request.body.localname === beacon.name) {
        // check rssi:
        if (Math.abs(request.body.rssi - beacon.rssiLimit) > beaconRange) {
          result.name = beacon.name;
          result.error = 'not in range to claim beacon';
        }
        // if there is already an owner:
        if (beacon.owner) {
          //send the result with that other guys owner name
          result.name = beacon.name;
          result.error = 'beacon already claimed';
        }
        // check points:
        if (request.body.points != beacon.points) {
          result.name = beacon.name;
          result.error = 'incorrect points value';
        }
        // if there's still no error, credit the user:
        if (!result.error) {
          result.message = 'success. Beacon claimed';
          result.name = beacon.name;  // set the result localname for response
          users.forEach(function(user) {        // iterate over the user list
            if (user === thisUser) {            // find the user who submitted this
              beacon.owner = user.username;     // set the beacon owner
              user.score += beacon.points;      // increment the user's points
              checkScores();                    // check to see if anyone's score > 50
              result.username = user.username;  // set the result username
              result.score = user.score;        // set the result user's score
              if (beacon.name === finalBeaconName) {
                winner = user.username;
                result.message += user.username + ' has claimed the final beacon.';
                gameOver = true;
              }
            }
          });
        }
      }
    });

    response.json(result).end(); // send the result
    console.log(result);
    console.log('\n');
  }

  // checks to see if any user has reached 50 points:
  function checkScores() {
    users.forEach(function(user) {        // iterate over the user list
      if (user.score >= 50) {
        console.log('user ' + user.username + ' has unlocked the golden egg.');
        unlockGoldenEgg();
      }
    });
  }

  function unlockGoldenEgg() {
    // make the POST data a JSON object and stringify it:
    var postData =JSON.stringify({
      serviceName: config.goldenEgg.serviceName,
      uuid: config.goldenEgg.uuid
    });

    // set up the options for the request.
    var options = {
      host: config.goldenEgg.host,
      port: config.goldenEgg.port,
      path: '/start',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    function waitForResponse(response) {
      var result = '';		// string to hold the response

      // as each chunk comes in, add it to the result string:
      response.on('data', function (data) {
        result += data;
      });

      // when the final chunk comes in, print it out:
      response.on('end', function (error) {
        if (error) console.log(error);
        console.log(result);
      });

    }

    // make the actual request:
    console.log('requesting the golden egg to turn on:');
    var request = http.request(options, waitForResponse);	// start it
    request.write(postData);							// send the data
    request.end();												// end it
  }

  // start the server:
  var server = app.listen(8080, serverStart);
  // start the listeners for GET requests:
  //app.get('/files/:name', serveFiles);  // GET handler for all static files
  app.post('/listBeacons', listBeacons);
  app.post('/listUsers', listUsers);
  app.post('/login/', login);           // login page (TBD)
  app.get('/login/:username', login);// login page (TBD)
  app.post('/logout/', logout);           // login page (TBD)
  app.get('/clearUser/:username', clearUser);           // clear user page
  app.post('/beacon', getBeacon);      // request for beacon
  // app.post('/scan', startScan);
  // app.get('/scan/:',startScan);



// function startScan(request, response){
//   console.log('hit scan route')
//   var result = {
//     name: "",
//     closeness: "",
//     score: ""
//   }
//   var charNoDashes = "''"+request.body.char.replace(/[-]/g, "")+ "''";
//   var serviceNoDashes = "''"+request.body.service.replace(/[-]/g, "")+ "''";
//   noble.startScanning([charNoDashes.toLowerCase()], true);
//   // noble.startScanning();
//
//
//
//
//   //https://github.com/sandeepmistry/noble
//   noble.on('discover', function(peripheral) {
//     // console.log('discovered')
//     result.name = peripheral.advertisement.localName
//     result.closeness = peripheral.rssi
//     // console.log('\t' + 'name is:' + peripheral.advertisement.localName);
//     // console.log('\t' + 'RSSI is:'+ peripheral.rssi);
//
//       peripheral.connect(function(error) {
//         result.uuid = peripheral.uuid;
//           // console.log('\t' + 'connected to peripheral: ' + peripheral.uuid);
//       peripheral.discoverServices([serviceNoDashes], function(error, services) {
//           var deviceInformationService = services[0];
//           // console.log('\t' + 'discovered device information service');
//
//           deviceInformationService.discoverCharacteristics([charNoDashes], function(error, characteristics) {
//
//             var manufacturerNameCharacteristic = characteristics[0];
//
//             //console.log('discovered manufacturer name characteristic');
//             //console.log(manufacturerNameCharacteristic);
//
//           manufacturerNameCharacteristic.read(function(error, data) {
//             // data is a buffer
//             result.score = data.readUInt8(0);
//             console.log(result)
//             response.send(result.score).end();
//             // console.log('\t' + 'Decimal is: ' + data.readUInt8(0));
//           });
//         });
//       });
//     });
//
//   });
//
// //what are my options of how to send data back to client?
// //can I wait until the results are done?
// //i think this part is better as non-restful so user can get 'hot or cold' feedback towards beacons
//
//
//
//
// } //start scan over
