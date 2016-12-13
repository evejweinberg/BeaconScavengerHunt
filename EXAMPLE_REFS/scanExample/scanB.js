var noble = require('noble');   //noble library


noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    noble.startScanning(['A495FF20C5B14B44B5121370F02D74DE'.toLowerCase()], false);
    // noble.startScanning();
  } else {
    noble.stopScanning();
  }
});


noble.on('discover', function(peripheral) {
  console.log('\t' + 'name is:' + peripheral.advertisement.localName);

    console.log('\t' + 'RSSI is:'+ peripheral.rssi);

    peripheral.connect(function(error) {
        console.log('\t' + 'connected to peripheral: ' + peripheral.uuid);
    peripheral.discoverServices(['a495ff20c5b14b44b5121370f02d74de'], function(error, services) {
        var deviceInformationService = services[0];
        console.log('\t' + 'discovered device information service');

        deviceInformationService.discoverCharacteristics(['a495ff25c5b14b44b5121370f02d74de'], function(error, characteristics) {

          var manufacturerNameCharacteristic = characteristics[0];

          //console.log('discovered manufacturer name characteristic');
          //console.log(manufacturerNameCharacteristic);

        manufacturerNameCharacteristic.read(function(error, data) {
          // data is a buffer
          console.log('\t' + 'Decimal is: ' + data.readUInt8(0));
        });
      });
    });
  });
});
