ndef = require('ndef');

message = [
    ndef.textRecord("hello, world")
];

bytes = ndef.encodeMessage(message);

// do something useful with bytes: write to a tag or send to a peer
  
records = ndef.decodeMessage(bytes);

text = ndef.text.decodePayload(records[0].payload);
console.log(text)
