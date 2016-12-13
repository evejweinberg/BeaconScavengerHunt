/*
adapted from Tom Igoe's repo
TO DO:  Add in a feature to send different formats of UUID, using the parse/unparse
functions from the npm UUID library.
*/

//this has to make a post request
//this has noble on it



var config = require('./config.js');
var express = require('express');         // include express.js
var app = express();                      // a local instance of it
var bodyParser = require('body-parser');  // include body-parser
var uuid = require('uuid');               // include a UUID generator
var http = require('http');      // include http to make a client
var noble = require('noble');   //noble library

// the service UUID and characteristic UUID for the game:
// var serviceUuid = config.serviceUuid;
// var characteristicUuid = config.characteristicUuid;
// var users = config.users;
// var beacons = config.beacons;
// var adminKey = config.adminKey;
// var beaconRange = config.beaconLimit;
// var finalBeaconName = config.beacons[config.beacons.length-1].name;
// var gameOver = false;
// var winner = '';

app.use(express.static('public'));                  // static files go in /public
app.use(bodyParser.json());
//what is this?                        // for  application/json
app.use(bodyParser.urlencoded({ extended: true })); // for application/x-www-form-urlencoded

// this runs after the server successfully starts:
function serverStart() {
  var port = server.address().port;
  console.log('Server listening on port '+ port + ' at ' + new Date());
}










  // start the server:
  var server = app.listen(8080, serverStart);
  // start the listeners for GET requests:
  //app.get('/files/:name', serveFiles);  // GET handler for all static files

  app.post('/scan', startScan);
  // app.get('/scan/:',startScan);



function startScan(request, response){
  console.log('hit scan route')
  var result = {
    name: "",
    closeness: "",
    score: ""
  }
  var charNoDashes = "''"+request.body.char.replace(/[-]/g, "")+ "''";
  var serviceNoDashes = "''"+request.body.service.replace(/[-]/g, "")+ "''";
  noble.startScanning([charNoDashes], false);



  //https://github.com/sandeepmistry/noble
  noble.on('discover', function(peripheral) {
    result.name = peripheral.advertisement.localName
    result.closeness = peripheral.rssi
    // console.log('\t' + 'name is:' + peripheral.advertisement.localName);
    // console.log('\t' + 'RSSI is:'+ peripheral.rssi);

      peripheral.connect(function(error) {
        result.uuid = peripheral.uuid;
          // console.log('\t' + 'connected to peripheral: ' + peripheral.uuid);
      peripheral.discoverServices([serviceNoDashes], function(error, services) {
          var deviceInformationService = services[0];
          // console.log('\t' + 'discovered device information service');

          deviceInformationService.discoverCharacteristics([charNoDashes], function(error, characteristics) {

            var manufacturerNameCharacteristic = characteristics[0];

            //console.log('discovered manufacturer name characteristic');
            //console.log(manufacturerNameCharacteristic);

          manufacturerNameCharacteristic.read(function(error, data) {
            // data is a buffer
            result.score = data.readUInt8(0);
            // console.log('\t' + 'Decimal is: ' + data.readUInt8(0));
          });
        });
      });
    });

  });

//what are my options of how to send data back to client?
//can I wait until the results are done?
//i think this part is better as non-restful so user can get 'hot or cold' feedback towards beacons

console.log(result)
response.send(result).end()


} //start scan over
