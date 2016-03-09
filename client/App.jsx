
App = React.createClass({

  getInitialState() {
    return {
      lastname: localStorage.getItem("lastname") || '',
      firstname: localStorage.getItem("firstname") || '',
      deviceConnected: false,
      deviceIp: '172.20.10.1',
      reloadingIp: false,
      liveChart: null,
      metricsNames: [],
      devices: []
    };
  },

  loadLiveChart() {
    this.setState({
      liveChart: Highcharts.chart('liveChart', {
        chart: {
          type: 'bar'
        },
        title: {
          text: ''
        },
        subtitle: {
          text: 'Not connected',
          style:{ color: 'red', fontWeight: 'bold' }
        },
        xAxis: {
          categories: [],
          title: {
            text: 'Endpoints'
          }
        },
        yAxis: {
          min: 0,
          title: {
            text: 'Response times',
            align: 'high'
          },
          labels: {
            overflow: 'justify'
          },
          plotLines:[{
            color: '#FF0000',
            width:2,
            value:150
          }]
        },
        tooltip: {
          valueSuffix: 'millisec'
        },
        exporting: {
          type: 'image/jpeg'
        },
        plotOptions: {
          bar: {
            dataLabels: {
              enabled: false
            }
          }
        },
        legend: {
          layout: 'vertical',
          align: 'right',
          verticalAlign: 'top',
          x: -40,
          y: 80,
          floating: true,
          borderWidth: 1,
          backgroundColor: ((Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF'),
          shadow: true
        },
        credits: {
          enabled: false
        },
        series: [{
          name: 'min',
          data: []
        }, {
          name: 'max',
          data: []
        }, {
          name: 'avg',
          data: []
        }]
      })
    });
  },

  getDeviceIp(){
    return this.state.deviceIp;
  },

  isReloadingIp(){
    return this.state.reloadingIp;
  },

  launchDataUpdater(){
    var that = this;
    Meteor.setInterval(() => {
      HTTP.call("GET", "http://"+this.getDeviceIp()+":8080/profiler.json",
      null,
      (error, result) => {
        if(error === null && !that.isReloadingIp()){
          var metric = JSON.parse(result.content);
          this.setState({
            lastname: metric.lastName,
            firstname: metric.firstName,
            deviceConnected: true
          });
          localStorage.setItem("lastname", metric.lastName);
          localStorage.setItem("firstname", metric.firstName);
          Meteor.call("updateMetric", metric);
        }else{
          this.setState({
            deviceConnected: false,
            reloadingIp: false,
          });
        }
      });
    }, 1000);
  },

  subscibeToDevices(){
    var that = this;
    Meteor.subscribe("devices");
    Devices.find({}).observe({
      added(device){
        that.devices.push(device);
        that.forceUpdate();
        if( device.lastname == that.state.lastname && device.firstname == that.state.firstname){
          Meteor.call('resetMetrics', device._id, function(){
            that.subscribeToMetrics(device._id);
          });
        }
      }
    });
  },

  subscribeToMetrics(deviceId){
    var that = this;
    Meteor.subscribe("metrics", deviceId);
    Metrics.find({}).observe({
      added(metric){
        that.state.metricsNames.push(metric.name);
        that.state.liveChart.xAxis[0].setCategories(that.state.metricsNames, false);
        that.state.liveChart.series[0].addPoint(metric.min, false);
        that.state.liveChart.series[1].addPoint(metric.max, false);
        that.state.liveChart.series[2].addPoint(metric.avg);
      },
      changed(metric){
        var index = that.state.metricsNames.indexOf(metric.name);
        var min = that.state.liveChart.series[0].data.slice();
        min[index] = metric.min;
        var max = that.state.liveChart.series[1].data.slice();
        max[index] = metric.max;
        var avg = that.state.liveChart.series[2].data.slice();
        avg[index] = metric.avg;

        that.state.liveChart.series[0].setData(min, false);
        that.state.liveChart.series[1].setData(max, false);
        that.state.liveChart.series[2].setData(avg, true, true, true);
      }
    });
  },


  componentWillUpdate( nextProps, nextState){
    if( this.state.lastname.length === 0 && nextState.lastname.length > 0){
      this.subscibeToDevices();
    }

    if( this.state.liveChart ){
      var deviceStatus;
      if( nextState.deviceConnected ){
        deviceStatus = {text: "Connected", style:{ color: 'green', fontWeight: 'bold' }};
      }else{
        deviceStatus = {text: "Not connected", style:{ color: 'red', fontWeight: 'bold' }};
      }

      this.state.liveChart.setTitle({text: nextState.firstname+" "+nextState.lastname}, deviceStatus);
    }
  },

  refreshIp(){
    this.setState({
      deviceIp: this.refs.ipCustom.value,
      reloadingIp: true,
      deviceConnected: false
    });
  },

  selectDevice(){

  },

  componentDidMount() {
    this.loadLiveChart();
    if( this.state.lastname.length > 0){
      this.subscibeToDevices();
    }
    this.launchDataUpdater();
  },

  render() {
    var devicesList =  this.state.devices.map((device) => {
      return (
        <div key={device._id} onCLick={this.selectDevice}>
          {device.firstname+" "+device.lastname}
        </div>
      );
    });

    return (
      <div className="container">
        iPhone IP: <input type="text" ref="ipCustom" placeholder/>
      <button onClick={this.refreshIp}>Connect</button>
      <div>
        <div id="devicesList" >
          {devicesList}
        </div>
        <div id="liveChart">
        </div>
      </div>
    </div>
  );
}
});
