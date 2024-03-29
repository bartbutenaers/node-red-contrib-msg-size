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
        this.config = config;
        this.analyzerPerTopic = new Map();
        
        var node = this;
  
        if (config.pauseAtStartup == true) {
            node.status({fill:"yellow",shape:"ring",text:"paused"});
        }
        
        function updateTopicDependentStatus() {
            var pausedCount = 0;
            
            node.analyzerPerTopic.forEach(function(messageSizeAnalyzer, topic) {
                if (messageSizeAnalyzer.paused) {
                    pausedCount++;
                }
            })
            
            // Only show the number of paused topics, when topics are being paused
            if (pausedCount > 0) {
                node.status({fill:"green",shape:"dot",text: node.analyzerPerTopic.size + " topics (" + pausedCount + " paused)"});
            }
            else {
                node.status({fill:"green",shape:"dot",text: node.analyzerPerTopic.size + " topics"});
            }
        }
        
        function getMessageSizeAnalyzer(topic) {
            var messageSizeAnalyzer = node.analyzerPerTopic.get(topic);
            
            if (!messageSizeAnalyzer) {
                messageSizeAnalyzer = new MessageSizeAnalyzer(node.config);
                messageSizeAnalyzer.topic = topic;
                node.analyzerPerTopic.set(topic, messageSizeAnalyzer);
                
                // When working topic dependent, show the (updated) number of topics in the node status
                if (node.config.topicDependent) {
                    updateTopicDependentStatus();
                }
            }
            
            return messageSizeAnalyzer;
        }
        
        // The real logic has been encapsulated in a separate NPM package, so it can be shared between multiple of my Node-RED nodes...
        const MessageAnalyzer = require('nr-msg-statistics');

        class MessageSizeAnalyzer extends MessageAnalyzer {
            calculateMsgStatistic( msg) {
                return sizeof(msg);
            }
    
            sendMsg(msgCountInBuffer, msgStatisticInBuffer) {
                var averageMsgSize = 0;
                
                if (msgCountInBuffer > 0) {
                    averageMsgSize = Math.round(msgStatisticInBuffer / msgCountInBuffer);
                }
                
                var outputMsg = {
                    totalMsgSize:          msgStatisticInBuffer,
                    averageMsgSize:        averageMsgSize,
                    frequency:             this.frequency,
                    interval:              this.interval,
                    intervalAndFrequency:  this.interval + " " + this.frequency
                }
                
                // Sending the topic only makes sence for topic dependent statistics.  Otherwise always "all_topics" will be used...
                if (node.config.topicDependent) {
                    outputMsg.topic = this.topic;
                }
                
                node.send([outputMsg, null]);
            }
       
            changeStatus(msgCountInBuffer, msgStatisticInBuffer, isStartup) {
                var sizeToDisplay;
                var status;
                
                // It has only use to update the node status (with calculated size), when only a SINGLE TOPIC is being watched.
                // For topic-dependent statistics are required, the status will be updated below by other triggers...
                if (!node.config.topicDependent) {
                    // Show the size that has been specified in the config screen
                    switch(node.config.statusContent) {
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
                    
                    if (node.config.humanReadableStatus) {
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
        }

        this.on("input", function(msg) {
            var controlMsg = false;
            var specifiedAnalyzers = [];
            
            // Determine whether this is a control message
            if ((msg.hasOwnProperty('size_reset')  && msg.size_reset  === true) || 
                (msg.hasOwnProperty('size_resume') && msg.size_resume === true) ||
                (msg.hasOwnProperty('size_pause')  && msg.size_pause  === true)) {
                controlMsg = true;
            }
            
            if (node.config.topicDependent) {
                if (!msg.topic || msg.topic == "") {
                     if (controlMsg) {
                        // When no topic has been definied in a control message, then ALL available topics need to be controlled
                        specifiedAnalyzers = Array.from(node.analyzerPerTopic.values());
                    }
                    else {
                        // All messages without topic are being collected under "all_topics"
                        specifiedAnalyzers.push(getMessageSizeAnalyzer("all_topics"));
                    }
                }
                else {
                    // Collect the message under its own topic
                    specifiedAnalyzers.push(getMessageSizeAnalyzer(msg.topic));
                }
            }
            else {
                // In topic-independent mode, all messages are being collected under "all_topics"
                specifiedAnalyzers.push(getMessageSizeAnalyzer("all_topics"));
            }
            
            if (specifiedAnalyzers.length == 0) {
                node.warn("No topics to be processed").
                return;
            }
            
            // When a reset message arrives, fill the buffer with zeros to start counting all over again.
            // Remark: the disadvantage is that you will end up again with a startup period ...
            if (msg.hasOwnProperty('size_reset') && msg.size_reset === true) {
                specifiedAnalyzers.forEach(function(messageSizeAnalyzer, topic) { 
                    messageSizeAnalyzer.reset();
                })
            }
            
            // When a resume message arrives, the size measurement will be resumed
            if (msg.hasOwnProperty('size_resume') && msg.size_resume === true) {
                specifiedAnalyzers.forEach(function(messageSizeAnalyzer, topic) { 
                    messageSizeAnalyzer.resume();
                })
            }
            
            // When a pause message arrives, the size measurement will be paused
            if (msg.hasOwnProperty('size_pause') && msg.size_pause === true) {
                specifiedAnalyzers.forEach(function(messageSizeAnalyzer, topic) { 
                    messageSizeAnalyzer.pause();
                })
            }

            // Don't use the control messages in speed calculations (i.e. messages that contain at least one of the 3 above controlling fields)
            if (controlMsg) {
                if (node.config.topicDependent) {
                    // For every control message the topic-dependent status might have to be updated (paused, non-paused)
                    updateTopicDependentStatus();                    
                }
                else {
                    // For topic-independent there is only one topic, so show if that topic is paused.
                    // If not paused then the size number will be displayed in the status (see changeStatus above).
                    if (specifiedAnalyzers[0].paused == true) {
                        node.status({fill:"yellow",shape:"ring",text:"paused"});
                    }
                }
            }
            else {
                // Normally we should only have 1 analyzer in the array
                specifiedAnalyzers.forEach(function(messageSizeAnalyzer, topic) {
                    // Use the message to do the size calculations.
                    // In case of size measurements, extra (sizes) data need to be stored about the input message.  So let's pass the input msg ...
                    messageSizeAnalyzer.process(msg);
                })
            
                // Send the original message on the second output port (even when the size measurement is inactive)
                node.send([null, msg]);
            }
        });
        
        this.on("close",function() {   
            node.status({});
            
            node.analyzerPerTopic.forEach(function(messageSizeAnalyzer, topic) { 
                messageSizeAnalyzer.stop();
            })

            node.analyzerPerTopic.clear();
        });
    }

    RED.nodes.registerType("msg-size", sizeNode);
};
