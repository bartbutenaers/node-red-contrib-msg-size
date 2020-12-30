/**
 * Copyright 2020 Bart Butenaers
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
module.exports = function(RED) {
    "use strict";
    const sizeof = require('object-sizeof');
    const humanReadable = require('filesize');

    function sizeNode(config) {
        RED.nodes.createNode(this, config);
        this.statusContent = config.statusContent;
        this.humanReadableStatus = config.humanReadableStatus;
        
        var node = this;
  
        if (config.pauseAtStartup == true) {
            node.status({fill:"yellow",shape:"ring",text:"paused"});
        }
        
        // The real logic has been encapsulated in a separate NPM package, so it can be shared between multiple of my Node-RED nodes...
        const MessageAnalyzer = require('nr-msg-statistics');

        class MessageSizeAnalyzer extends MessageAnalyzer {
            calculateMsgStatistic( msg) {
                return sizeof(msg);
            }
    
            sendMsg(msgCountInBuffer, msgStatisticInBuffer) {
                debugger;
                var averageMsgSize = 0;
                
                if (msgCountInBuffer > 0) {
                    averageMsgSize = msgStatisticInBuffer / msgCountInBuffer;
                }
                
                node.send([{ totalMsgSize:          msgStatisticInBuffer,
                             averageMsgSize:        averageMsgSize,
                             frequency:             this.frequency,
                             interval:              this.interval,
                             intervalAndFrequency:  this.interval + " " + this.frequency
                }, null]);
            }
       
            changeStatus(msgCountInBuffer, msgStatisticInBuffer, isStartup) {
                var sizeToDisplay;
                var status;
                
                // Show the size that has been specified in the config screen
                switch(node.statusContent) {
                    case "avg":
                        var averageMsgSize = 0;
                
                        if (msgCountInBuffer > 0) {
                            averageMsgSize = msgStatisticInBuffer / msgCountInBuffer;
                        }
                        
                        sizeToDisplay = averageMsgSize;
                        break;
                    case "tot":
                        sizeToDisplay = msgStatisticInBuffer;
                        break;
                }
                
                if (node.humanReadableStatus) {
                    // Human readable format (KB, MB, ...) without decimal digits
                    sizeToDisplay = humanReadable(sizeToDisplay, {round: 0});
                }
                
                // The status contains both the interval and the frequency (e.g. "2 hour").
                // Except when interval is 1, then we don't show the interval (e.g. "hour" instead of "1 hour").
                if (this.interval === 1) {
                    status = sizeToDisplay + " / " + this.frequency;
                }
                else {
                    status = sizeToDisplay + " / " + this.interval + " " + this.frequency;
                }

                // Show startup speed values in orange, and real values in green
                if (isStartup == true) {
                    if (this.ignoreStartup == true) {
                        node.status({fill:"yellow",shape:"ring",text:" start ignored" });
                    }
                    else {
                        node.status({fill:"yellow",shape:"ring",text:status });
                    }
                }
                else {
                    node.status({fill:"green",shape:"dot",text:status });
                }            
            }
        }
    
        var messageSizeAnalyzer = new MessageSizeAnalyzer(config);

        this.on("input", function(msg) {
            var controlMsg = false;
            
            // When a reset message arrives, fill the buffer with zeros to start counting all over again.
            // Remark: the disadvantage is that you will end up again with a startup period ...
            if (msg.hasOwnProperty('size_reset') && msg.size_reset === true) {
                messageSizeAnalyzer.reset();
                node.status({fill:"yellow",shape:"ring",text:"reset"});
                controlMsg = true;
            }
            
            // When a resume message arrives, the size measurement will be resumed
            if (msg.hasOwnProperty('size_resume') && msg.size_resume === true) {
                messageSizeAnalyzer.resume();
                node.status({fill:"yellow",shape:"ring",text:"resumed"});
                controlMsg = true;
            }
            
            // When a pause message arrives, the size measurement will be paused
            if (msg.hasOwnProperty('size_pause') && msg.size_pause === true) {
                messageSizeAnalyzer.pause();
                node.status({fill:"yellow",shape:"ring",text:"paused"});
                controlMsg = true;
            }
            
            // Don't measure control messages (i.e. messages that contain at least one of the 3 above controlling fields)
            if (controlMsg === true) {
                return;
            }
            
            // In case of size measurements, extra (sizes) data need to be stored about the input message.  So let's pass the input msg ...
            messageSizeAnalyzer.process(msg);
            
            // Send the original message on the second output port (even when the speed measurement is inactive)
            node.send([null, msg]);
        });
        
        this.on("close",function() {   
            messageSizeAnalyzer.stop();       
            node.status({});
        });
    }

    RED.nodes.registerType("msg-size", sizeNode);
};
