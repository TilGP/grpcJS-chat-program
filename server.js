const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const server = new grpc.Server();
const SERVER_ADRESS = '0.0.0.0:50051';

const proto = grpc.loadPackageDefinition(
    protoLoader.loadSync('./protos/chat.proto', {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    })
);

let users = [];

let channels = []

function createChannel(call, callback){
    for (var i = 0; i < channels.length; i++){
        if (channels[i].channelName === call.request.channelName){
            callback(null, { user: 'Server', channel: null, text: 'Name is already taken' });
            return
        }
    }
    channels.push({
        channelName: call.request.channelName,
        users: []
    });
    callback(null, { user: 'Server', channel: null, text: `${call.request.channelName} created` });
}

function getAllChannels(call, callback) {
    let channelName = [];
    channels.forEach(channel => {
        channelName.push(channel.channelName);
    });
    callback(null, { channelName } );
}

function join(call, callback) {
    for(var i = 0; i < channels.length; i++){
        if(channels[i].channelName === call.request.channelName){
            channels[i].users.push(call)
            notifyChat(channels[i].channelName, { user: "Server", channel: channels[i].channelName, text: "new user joined..." });
            return;
        }
    }
    call.write({ user: 'Server', channel: null, text: 'there is no channel with this name' });
}

function notifyChat(channelName, message) {
    channels.forEach(channel => {
        if(channel.channelName === channelName){
            channel.users.forEach(user => {
                return user.write(message);
            })
        }
    })
}

function send(call, callback){
    notifyChat(call.request.channel, { user: call.request.user, channel: call.request.channel, text: call.request.text });
}

server.addService(proto.Chat.service, {
    createChannel: createChannel,
    getAllChannels: getAllChannels,
    send: send,
    join: join
});

server.bindAsync(
    "127.0.0.1:50051",
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
      console.log("Server running at http://127.0.0.1:50051");
      server.start();
    }
);