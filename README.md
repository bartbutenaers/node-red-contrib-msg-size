# node-red-contrib-msg-size
A Node Red node for measuring flow message size.

## Install
Run the following npm command in your Node-RED user directory (typically ~/.node-red):
```
npm install node-red-contrib-msg-size
```

## Support my Node-RED developments

Please buy my wife a coffee to keep her happy, while I am busy developing Node-RED stuff for you ...

<a href="https://www.buymeacoffee.com/bartbutenaers" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy my wife a coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

## How it works
This node will calculate the seach of each individual message that arrives at the input port.  Based on those individual message sizes, it will calculate some msg sizing statistics *every second* for the specified interval:
+ *Total size*: size of all the messages accumulated.
+ *Average size*: average size of all the messages.

For example when the frequency is '1 minute', it will calculate (and accumulate) the sizes of all the messages received in the *last minute*: 

![Timeline 1](https://user-images.githubusercontent.com/14224149/103349694-d80d4000-4a9d-11eb-8348-8ef214ce8c36.png)

A second later, the calculation is repeated: again the sizes of the messages received in the last minute will be calculated (and accumulated).

![Timeline 2](https://user-images.githubusercontent.com/14224149/103349858-5a95ff80-4a9e-11eb-80a3-9c2814f52372.png)

The measurement interval is like a **moving window**, that is being moved every second.

The process continues this way, while the moving window is discarding old messages and taking into account new messages...

## Output message
+ First output: The message size information will be send to the first output port.  This payload could be visualised e.g. in a dashboard graph:

    ![Size chart](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-speed/master/images/speed_chart.png)

   The output message contains this fields:
   + `msg.totalMsgSize` contains the total size of all the messages in the specified interval/frequency.
   + `msg.averageMsgSize` contains the average size of all the messages in the specified interval/frequency.
   + `msg.frequency` contains the specified frequency ('sec', 'min' or 'hour') from the config screen.
   + `msg.interval` contains the specified interval (e.g. 15) from the config screen, i.e. the length of the time window.
   + `msg.intervalAndFrequency` contains the both the interval and the frequency (e.g. '5 sec', '20 min', '1 hour').
   
+ Second output: The original input message will be forwarded to this output port, which allows the speed node to be ***chained*** for better performance.

## Node status
The message size will be displayed as node status, in the flow editor:

![Node status](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-speed/master/images/speed4.png)

```

```

During the startup period the message size will be displayed orange:

![Startup status](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-speed/master/images/startup_status.png)

And when 'ignore size during startup' is active, the node status will indicate this during the startup period:

![Ignore startup](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-speed/master/images/startup_ignored.png)

## Startup period
The sizes are being calculated every second.  As a result there will be a startup period, when the frequency is minute or hour (respectively a startup period of 60 seconds or 3600 seconds).
For example when 1 message of 1 KByte is received per second, this corresponds to a total size of 60 KByte per minute.  However during the first minute the size will be incomplete:
+ After the first second, the size is 1 KByte per minute
+ After the second second, the size is 2 KByte per minute
+ ...
+ After one minute, the size is 60 KByte per minute

This means the size will increase during the startup period, to reach the final value:

![Startup](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-speed/master/images/Startup.png)

## Node configuration

### Frequency
The frequency (e.g. '5 second', '20 minute', '1 hour') defines the interval length of the moving window.
For example a frequency of '25 seconds' means that the average size is calculated (every second), based on the messages arrived in the last 25 seconds.

Caution: long intervals (like 'hour') will take more memory to store all the intermediate size calculations (i.e. one calculation per second).

### Estimate size (during startup period)
During the startup period, the calculated size will be incorrect.  When estimation is activated, the final size will be estimated during the startup period (using linear extrapolation).  The graph will start from zero immediately to an estimation of the final value:

![Estimation](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-msg-speed/master/images/estimation.png)

Caution: estimation is very useful if the message rate is stable.  However when the message rate is very unpredictable, the estimation will result in incorrect values.  In the latter case it might be advised to enable 'ignore size during startup'.

### Ignore size (during startup period)
During the startup period, the calculated size will be incorrect.  When ignoring size is activated, no messages will be send on the output port during the startup period.  This way it can be avoided that faulty size values are generated.

Moreover during the startup period no node status would be displayed.

### Pause measurements at startup
When selected, this node will be paused automatically at startup.  This means that the measurement calculation needs to be resumed explicit via a control message.

## Control node via msg
The size measurement can be controlled via *'control messages'*, which contains one of the following fields:
+ ```msg.size_reset = true```: resets all measurements to 0 and starts measuring all over again.  This also means that there will again be a startup interval with temporary values!
+ ```msg.size_pause = true```: pause the size measurement.  This can be handy if you know in advance that - during some time interval - the messages will be arriving with abnormal sizes, and therefore they should be ignored for size calculation.  Especially in long measurement intervals, those messages could mess up the measurements for quite some time...
+ ```msg.size_resume = true```: resume the size measurement, when it is paused currently.

Example flow:

![Msg control](https://user-images.githubusercontent.com/14224149/103350043-ff184180-4a9e-11eb-929d-45b45cd423c3.png)
```
[{"id":"c2727b62.bec668","type":"inject","z":"7f1827bd.8acfe8","name":"Generate msg every second","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"test","payloadType":"str","x":360,"y":1160,"wires":[["9a7106a0.9343c8"]]},{"id":"7fc95fbc.17bcd","type":"inject","z":"7f1827bd.8acfe8","name":"Reset","repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"","payloadType":"date","x":290,"y":1200,"wires":[["4d0ff6d5.e9bc58"]]},{"id":"4d0ff6d5.e9bc58","type":"change","z":"7f1827bd.8acfe8","name":"","rules":[{"t":"set","p":"size_reset","pt":"msg","to":"true","tot":"bool"}],"action":"","property":"","from":"","to":"","reg":false,"x":490,"y":1200,"wires":[["9a7106a0.9343c8"]]},{"id":"8e34f29c.6a028","type":"inject","z":"7f1827bd.8acfe8","name":"Resume","repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"","payloadType":"date","x":300,"y":1240,"wires":[["3f9d6138.9e0aae"]]},{"id":"3f9d6138.9e0aae","type":"change","z":"7f1827bd.8acfe8","name":"","rules":[{"t":"set","p":"size_resume","pt":"msg","to":"true","tot":"bool"}],"action":"","property":"","from":"","to":"","reg":false,"x":500,"y":1240,"wires":[["9a7106a0.9343c8"]]},{"id":"5460124f.6ae8cc","type":"inject","z":"7f1827bd.8acfe8","name":"Pause","repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"","payloadType":"date","x":290,"y":1280,"wires":[["e518e1e.79fb92"]]},{"id":"e518e1e.79fb92","type":"change","z":"7f1827bd.8acfe8","name":"","rules":[{"t":"set","p":"size_pause","pt":"msg","to":"true","tot":"bool"}],"action":"","property":"","from":"","to":"","reg":false,"x":500,"y":1280,"wires":[["9a7106a0.9343c8"]]},{"id":"2af39912.a74596","type":"debug","z":"7f1827bd.8acfe8","name":"Size","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"true","targetType":"full","statusVal":"","statusType":"auto","x":950,"y":1160,"wires":[]},{"id":"9a7106a0.9343c8","type":"msg-size","z":"7f1827bd.8acfe8","name":"","frequency":"sec","interval":1,"statusContent":"tot","estimation":false,"ignore":false,"pauseAtStartup":true,"humanReadableStatus":true,"x":760,"y":1160,"wires":[["2af39912.a74596"],[]]}]
```
