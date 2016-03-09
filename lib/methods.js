Meteor.methods({
  updateMetric(metric) {
    var deviceSelector = {lastname: metric.lastName, firstname: metric.firstName};
    var device = Devices.find(deviceSelector);
    var deviceId;
    if(device.count() === 0){
      deviceId = Devices.insert(deviceSelector);
    }else{
      deviceId = device.fetch()[0]._id;
    }

    metric.samples.forEach(function(sample){
      Metrics.upsert({
        device: deviceId,
        name: sample.identifier
      },{
        device: deviceId,
        name: sample.identifier,
        min: Math.round(sample.min*1000),
        max: Math.round(sample.max*1000),
        avg: Math.round(sample.avg*1000)
      });
    });
  },
  resetMetrics(deviceId){
    return Metrics.remove({device: deviceId});
  }
});
