# node-red-contrib-msg-size
A Node Red node for measuring the message sizes (and throughput).

## Install
Run the following npm command in your Node-RED user directory (typically ~/.node-red):
```
npm install node-red-contrib-msg-size
```

## Support my Node-RED developments

Please buy my wife a coffee to keep her happy, while I am busy developing Node-RED stuff for you ...

<a href="https://www.buymeacoffee.com/bartbutenaers" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy my wife a coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

## How it works
This node will calculate the seach of each individual message that arrives at the input port.  Based on those individual message sizes, it will calculate *every second* some message sizing statistics (for the specified interval):
+ *Total size*: size of all the messages accumulated (= throughput).
+ *Average size*: average size of all the messages.

For example when the frequency is '1 minute', it will calculate (and accumulate) the sizes of all the messages received in the *last minute*: 

![Timeline 1](https://user-images.githubusercontent.com/14224149/103375925-9bf8d000-4adb-11eb-96c5-ae3f511d8096.png)

The node will calculate the size of every message running through it, and sum all the message sizes that arrive during the specified interval.
In this case the *total* size = 3 + 5 + 7 = 15 ***KB per minute***, and the *average* size will be 15 / 3 = 5 KB per minute.

A second later, the calculation is repeated: again the sizes of the messages received in the last minute will be calculated (and accumulated).

![Timeline 2](https://user-images.githubusercontent.com/14224149/103376041-dc584e00-4adb-11eb-9269-28171e9a8cb8.png)

The measurement interval is like a **moving window**, that is being moved every second.

The process continues this way, while the moving window is discarding old messages and taking into account new messages...

## Output message
+ First output: The message size information will be send to the first output port.  This information can be used to trigger alarms, activate throttling, visualisation in a graph ...

   The output message contains following fields:
   + `msg.totalMsgSize` contains the total size of all the messages in the specified interval.
   + `msg.averageMsgSize` contains the average size of all the messages in the specified interval.
   + `msg.frequency` contains the specified frequency ('sec', 'min' or 'hour') from the config screen.
   + `msg.interval` contains the specified interval (e.g. 15) from the config screen, i.e. the length of the time window.
   + `msg.intervalAndFrequency` contains the both the interval and the frequency (e.g. '5 sec', '20 min', '1 hour').
   + `msg.topic` contains the topic for which the statistics have been calculated. It will contain the value "all_topics" for the aggregated statistics of all input messages that have arrived without topic. Note that this node only sends an msg.topic field in case the "topic dependent statistics" option has been enabled.
   
+ Second output: The original input message will be forwarded to this output port, which allows the size-node to be ***chained*** for better performance.

## Node status
The node status dependents on the fact whether the startup period (see next paragraph) is complete or not:

+ During the startup period the message size (followed by the interval period) will be displayed orange:

   ![image](https://user-images.githubusercontent.com/14224149/122665350-fc252080-d1a6-11eb-9a52-f7cb09e9a164.png)

   When 'ignore speed during startup' is active, the node status will indicate this during the startup period:

   ![image](https://user-images.githubusercontent.com/14224149/103376832-fb57df80-4add-11eb-8983-b745359c4d6c.png)

+ Once the startup period is completed, the nodes status depends on the "topic dependent statistics" setting:

   + In case of topic independent statistics, the message size (followed by the interval length) will be displayed as node status:

       ![image](https://user-images.githubusercontent.com/14224149/122665250-72755300-d1a6-11eb-811d-80878d6a248f.png)

   + In case of topic dependent statistics, the number of topics will be displayed as node status:

      ![image](https://user-images.githubusercontent.com/14224149/122665282-9fc20100-d1a6-11eb-9a9e-bf6e620c3181.png)

      When one or more topics are being paused, that will be indicate in the node status:
      
      ![image](https://user-images.githubusercontent.com/14224149/122665235-570a4800-d1a6-11eb-99a3-23f4a0579700.png)
   
## Startup period
The sizes are being calculated every second.  As a result there will be a startup period, when the frequency is minute or hour (respectively a startup period of 60 seconds or 3600 seconds).
For example when 1 message of 1 KByte is received per second, this corresponds to a total size of 60 KByte per minute.  However during the first minute the size will be incomplete:
+ After the first second, the size is 1 KByte per minute
+ After the second second, the size is 2 KByte per minute
+ ...
+ After one minute, the size is 60 KByte per minute

This means the size will increase during the startup period, to reach the final value:

![Startup](https://user-images.githubusercontent.com/14224149/103377181-edef2500-4ade-11eb-9af4-574887dd4d2e.png)

## Node configuration

### Frequency
The frequency (e.g. '5 second', '20 minute', '1 hour') defines the interval length of the moving window.
For example a frequency of '25 seconds' means that the average size is calculated (every second), based on the messages arrived in the last 25 seconds.

Caution: long intervals (like 'hour') will take more memory to store all the intermediate size calculations (i.e. one calculation per second).  Moreover the startup period (with incomplete values) will take longer...

### Status
Select whether the total size or the average size (of the selected interval) needs to be displayed in the node status.

### Estimate size (during startup period)
During the startup period, the calculated size will be incorrect.  When estimation is activated, the final size will be estimated during the startup period (using linear extrapolation).  The graph will start from zero immediately to an estimation of the final value:

![Estimation](https://user-images.githubusercontent.com/14224149/103377272-3dcdec00-4adf-11eb-9c81-63bf4bffb4ff.png)

Caution: estimation is very useful if the throughput is stable.  However when the throughput is very unpredictable, the estimation will result in incorrect values.  In the latter case it might be advised to enable 'ignore size during startup'.

### Ignore size (during startup period)
During the startup period, the calculated size will be incorrect.  When ignoring size is activated, no size information will be send on the output port during the startup period.  This way it can be avoided that faulty size values are generated.

Moreover during the startup period no node status would be displayed.

### Pause measurements at startup
When selected, this node will be paused automatically at startup.  This means that the size calculation needs to be resumed explicit via a control message.

### Human readable size in status
When selected, the node status will display the message size in human readable format (e.g. 5 KB) instead of raw bytes.

## Control node via msg

### Control with "topic dependent statistics" disabled
When topic dependent statistics are disabled, the size is being measured for all messages that arrive (independent of their msg.topic). So the control messages don't need to bother about topics.

The size measurement can be controlled via *'control messages'*, which contains one of the following fields:
+ ```msg.size_reset = true```: resets all measurements to 0 and starts measuring all over again.  This also means that there will again be a startup interval with temporary values!
+ ```msg.size_pause = true```: pause the size measurement.  This can be handy if you know in advance that - during some time interval - the messages will be arriving with abnormal sizes, and therefore they should be ignored for size calculation.  Especially in long measurement intervals, those messages could mess up the measurements for quite some time...
+ ```msg.size_resume = true```: resume the size measurement, when it is paused currently.

Example flow:

![Msg control](https://user-images.githubusercontent.com/14224149/103350043-ff184180-4a9e-11eb-929d-45b45cd423c3.png)
```
[{"id":"c2727b62.bec668","type":"inject","z":"7f1827bd.8acfe8","name":"Generate msg every second","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"test","payloadType":"str","x":360,"y":1160,"wires":[["9a7106a0.9343c8"]]},{"id":"7fc95fbc.17bcd","type":"inject","z":"7f1827bd.8acfe8","name":"Reset","repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"","payloadType":"date","x":290,"y":1200,"wires":[["4d0ff6d5.e9bc58"]]},{"id":"4d0ff6d5.e9bc58","type":"change","z":"7f1827bd.8acfe8","name":"","rules":[{"t":"set","p":"size_reset","pt":"msg","to":"true","tot":"bool"}],"action":"","property":"","from":"","to":"","reg":false,"x":490,"y":1200,"wires":[["9a7106a0.9343c8"]]},{"id":"8e34f29c.6a028","type":"inject","z":"7f1827bd.8acfe8","name":"Resume","repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"","payloadType":"date","x":300,"y":1240,"wires":[["3f9d6138.9e0aae"]]},{"id":"3f9d6138.9e0aae","type":"change","z":"7f1827bd.8acfe8","name":"","rules":[{"t":"set","p":"size_resume","pt":"msg","to":"true","tot":"bool"}],"action":"","property":"","from":"","to":"","reg":false,"x":500,"y":1240,"wires":[["9a7106a0.9343c8"]]},{"id":"5460124f.6ae8cc","type":"inject","z":"7f1827bd.8acfe8","name":"Pause","repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"","payloadType":"date","x":290,"y":1280,"wires":[["e518e1e.79fb92"]]},{"id":"e518e1e.79fb92","type":"change","z":"7f1827bd.8acfe8","name":"","rules":[{"t":"set","p":"size_pause","pt":"msg","to":"true","tot":"bool"}],"action":"","property":"","from":"","to":"","reg":false,"x":500,"y":1280,"wires":[["9a7106a0.9343c8"]]},{"id":"2af39912.a74596","type":"debug","z":"7f1827bd.8acfe8","name":"Size","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"true","targetType":"full","statusVal":"","statusType":"auto","x":950,"y":1160,"wires":[]},{"id":"9a7106a0.9343c8","type":"msg-size","z":"7f1827bd.8acfe8","name":"","frequency":"sec","interval":1,"statusContent":"tot","estimation":false,"ignore":false,"pauseAtStartup":true,"humanReadableStatus":true,"x":760,"y":1160,"wires":[["2af39912.a74596"],[]]}]
```

### Control with "topic dependent statistics" disabled
When topic dependent statistics are enabled, the size is calculated for every `msg.topic` that arrives.  So the control message needs to contain information about which topic needs to be controlled:
1. When the control message has its own `msg.topic` field, then only the statistics of that specific topic will be controlled.  E.g. pause only the statistics for "mytopic".
2. When the control message has no `msg.topic` field, then the statistics of **ALL** topics will be controlled!

The following example flow demonstrates how to control the topics separately or all topics at once:

![Topic msg control](https://user-images.githubusercontent.com/14224149/122670309-a0b45c00-d1c1-11eb-9c94-ff8bba5d90b7.png)
```
[{"id":"e3e2017d50f1110a","type":"msg-size","z":"c9780dc5b08324c2","name":"","frequency":"sec","interval":"100","statusContent":"avg","estimation":false,"ignore":false,"pauseAtStartup":false,"humanReadableStatus":true,"topicDependent":true,"x":640,"y":780,"wires":[["94dc2a7a4b4e846c"],[]]},{"id":"c4adbe9d770827ea","type":"debug","z":"c9780dc5b08324c2","name":"Size topic_A","active":true,"tosidebar":true,"console":false,"tostatus":true,"complete":"true","targetType":"full","statusVal":"totalMsgSize","statusType":"msg","x":1110,"y":760,"wires":[]},{"id":"94dc2a7a4b4e846c","type":"switch","z":"c9780dc5b08324c2","name":"Separate topic statistics","property":"topic","propertyType":"msg","rules":[{"t":"eq","v":"topic_A","vt":"str"},{"t":"eq","v":"topic_B","vt":"str"}],"checkall":"true","repair":false,"outputs":2,"x":870,"y":780,"wires":[["c4adbe9d770827ea"],["16a63087c9626264"]],"outputLabels":["topic_A","topic_B"]},{"id":"16a63087c9626264","type":"debug","z":"c9780dc5b08324c2","name":"Size topic_B","active":true,"tosidebar":true,"console":false,"tostatus":true,"complete":"true","targetType":"full","statusVal":"totalMsgSize","statusType":"msg","x":1110,"y":840,"wires":[]},{"id":"770a53638d03515f","type":"inject","z":"c9780dc5b08324c2","name":"Generate topic_B (102 bytes) every second","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"1","crontab":"","once":false,"onceDelay":0.1,"topic":"topic_B","payload":"Short text","payloadType":"str","x":330,"y":720,"wires":[["e3e2017d50f1110a"]]},{"id":"a98cc6ff96285230","type":"inject","z":"c9780dc5b08324c2","name":"Reset all topics","props":[{"p":"payload"},{"p":"size_reset","v":"true","vt":"bool"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payloadType":"date","x":240,"y":780,"wires":[["e3e2017d50f1110a"]]},{"id":"d9c031e2378abfeb","type":"inject","z":"c9780dc5b08324c2","name":"Resume all topics","props":[{"p":"payload"},{"p":"size_resume","v":"true","vt":"bool"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payloadType":"date","x":240,"y":920,"wires":[["e3e2017d50f1110a"]]},{"id":"3b0f54a8da4ca5ea","type":"inject","z":"c9780dc5b08324c2","name":"Pause all topics","props":[{"p":"payload"},{"p":"size_pause","v":"true","vt":"bool"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payloadType":"date","x":240,"y":1060,"wires":[["e3e2017d50f1110a"]]},{"id":"5468ef34b40aca05","type":"inject","z":"c9780dc5b08324c2","name":"Generate topic_A (536 bytes) every 2 seconds","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"2","crontab":"","once":false,"onceDelay":0.1,"topic":"topic_A","payload":"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum","payloadType":"str","x":340,"y":680,"wires":[["e3e2017d50f1110a"]]},{"id":"709a2b4e08923f86","type":"inject","z":"c9780dc5b08324c2","name":"Reset topic_B","props":[{"p":"payload"},{"p":"size_reset","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"topic_B","payloadType":"date","x":230,"y":860,"wires":[["e3e2017d50f1110a"]]},{"id":"df2dc8735fd323f8","type":"inject","z":"c9780dc5b08324c2","name":"Resume topic_B","props":[{"p":"payload"},{"p":"size_resume","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"topic_B","payloadType":"date","x":240,"y":1000,"wires":[["e3e2017d50f1110a"]]},{"id":"d0dc9d1732bee28e","type":"inject","z":"c9780dc5b08324c2","name":"Pause topic_B","props":[{"p":"payload"},{"p":"size_pause","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"topic_B","payloadType":"date","x":230,"y":1140,"wires":[["e3e2017d50f1110a"]]},{"id":"c12900bc7fea0ef2","type":"inject","z":"c9780dc5b08324c2","name":"Reset topic_A","props":[{"p":"payload"},{"p":"size_reset","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"topic_A","payloadType":"date","x":230,"y":820,"wires":[["e3e2017d50f1110a"]]},{"id":"27bb4655dc9ec205","type":"inject","z":"c9780dc5b08324c2","name":"Resume topic_A","props":[{"p":"payload"},{"p":"size_resume","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"topic_A","payloadType":"date","x":240,"y":960,"wires":[["e3e2017d50f1110a"]]},{"id":"7772c1ece09f7196","type":"inject","z":"c9780dc5b08324c2","name":"Pause topic_A","props":[{"p":"payload"},{"p":"size_pause","v":"true","vt":"bool"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"topic_A","payloadType":"date","x":230,"y":1100,"wires":[["e3e2017d50f1110a"]]}]
```

## Use case
My personal use case for this node is to calculate the throughput of the video stream from my IP cameras.

The following demo flow creates 640x480 images (via an online cloud service) and calculates the througput of those images through the Node-RED flow:

![msg_size_demo](https://user-images.githubusercontent.com/14224149/103378932-4aa10e80-4ae4-11eb-9e6a-b87d47fa96c4.gif)
```
[{"id":"f426e09d.7010d","type":"http request","z":"7f1827bd.8acfe8","name":"","method":"GET","ret":"bin","paytoqs":"ignore","url":"","tls":"","persist":false,"proxy":"","authType":"","x":810,"y":1060,"wires":[["24d2f124.2e451e"]]},{"id":"2d702ccb.d8ffe4","type":"inject","z":"7f1827bd.8acfe8","name":"Create 640x480 images","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"","payloadType":"str","x":420,"y":1060,"wires":[["d5450b6d.d39eb8"]]},{"id":"a2ee8b5c.434448","type":"debug","z":"7f1827bd.8acfe8","name":"totalMsgSize","active":true,"tosidebar":false,"console":false,"tostatus":true,"complete":"totalMsgSize","targetType":"msg","statusVal":"payload","statusType":"auto","x":1190,"y":1020,"wires":[]},{"id":"d5450b6d.d39eb8","type":"function","z":"7f1827bd.8acfe8","name":"","func":"var image_counter = flow.get(\"image_counter\") || 0;\n\nimage_counter++;\n\nmsg.url = \"https://dummyimage.com/600x400/000/fff&text=\" + image_counter;\n\nflow.set(\"image_counter\", image_counter);\n\nreturn msg;","outputs":1,"noerr":0,"initialize":"","finalize":"","x":640,"y":1060,"wires":[["f426e09d.7010d"]]},{"id":"24d2f124.2e451e","type":"msg-size","z":"7f1827bd.8acfe8","name":"","frequency":"sec","interval":"1","statusContent":"avg","estimation":false,"ignore":false,"pauseAtStartup":false,"humanReadableStatus":true,"x":980,"y":1060,"wires":[["a2ee8b5c.434448","e332c50b.184788"],["529aaf4d.8f91f"]]},{"id":"529aaf4d.8f91f","type":"image","z":"7f1827bd.8acfe8","name":"","width":"200","data":"payload","dataType":"msg","thumbnail":false,"active":true,"pass":false,"outputs":0,"x":1200,"y":1080,"wires":[]},{"id":"e332c50b.184788","type":"debug","z":"7f1827bd.8acfe8","name":"averageMsgSize","active":true,"tosidebar":false,"console":false,"tostatus":true,"complete":"averageMsgSize","targetType":"msg","statusVal":"payload","statusType":"auto","x":1210,"y":960,"wires":[]}]
```
Remark: note that the [node-red-contrib-image-output](https://flows.nodered.org/node/node-red-contrib-image-output) node needs to be installed, in order to run this flow!
