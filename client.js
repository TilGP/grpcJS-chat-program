const grpc = require('@grpc/grpc-js');
const { createChildChannelControlHelper } = require('@grpc/grpc-js/build/src/load-balancer');
const protoLoader = require('@grpc/proto-loader');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const proto = grpc.loadPackageDefinition(
    protoLoader.loadSync("./protos/chat.proto", {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    })
);

const REMOTE_SERVER = '0.0.0.0:50051';

let channel;
let username;

const client = new proto.Chat(
    REMOTE_SERVER,
    grpc.credentials.createInsecure()
);

function handleCommand(command) {
    let _command = command.split(' ');
    switch (_command[0]){
        case ('/join'):
            if(_command[1]){
                return join(_command[1]);
            }
        case ('/create'):
            if(_command[1]){
                return createChannel(_command[1]);
            }
        case ('/list'):
            return listChannels();
        default:
            console.log({
                commands: [
                    {
                        name: '/join <channel-name>',
                        description: 'join a channel'
                    },
                    {
                        name: '/create <channel-name',
                        description: 'create a channel'
                    },
                    {
                        name: '/list',
                        description: 'list all channels'
                    }
                ]
            });
        }
}

function listChannels() {
    client.getAllChannels({}, (error, channelList) => {
        if (error) console.log(error);
        for (var i = 0; i < channelList.channelName.length; i++){
            console.log(channelList.channelName[i]);
        }
    });
}

function createChannel(channelName) {
    client.createChannel({ channelName: channelName }, (error, message) => {
        if (error) console.log(error);
        console.log(`${message.user}: ${message.text}`);
    })
}


function join(channelName) {
    channel = channelName;
    let _channel = client.join({ channelName: channelName })

    _channel.on('data', (message) => {
        if(message.user != username){
            console.log(`${message.channel}/${message.user}: ${message.text}`)
        }
    });
}

function waitForInput(){
    rl.on('line', function(text){
        if (text.startsWith('/')){
            handleCommand(text)
        } else {
            if (!channel) return console.log('join a channel first');
            client.send({ user: username, channel: channel, text: text }, res => {
                console.log(res);
            });
        }
    })
}

rl.question("What's your name?\t", answer => {
    username = answer;
    waitForInput();
})