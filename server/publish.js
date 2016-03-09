
Meteor.publish("devices", function(){
  return Devices.find({});
});

Meteor.publish("metrics", function(){
  return Metrics.find({});

});
