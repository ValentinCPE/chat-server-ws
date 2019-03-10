let rabbitmq = {};
let messagesAnswer = 'messages-processed';
let messagesEmitter = 'messages-received';

let open = require('amqplib').connect('amqp://rabbitmq');

let connection;

// Consumer
open.then(function(conn) {
    return conn.createChannel();
}).then(function(ch) {
    connection = ch;
    return ch.assertQueue(messagesAnswer, {durable: true}).then(function(ok) {
        return ch.consume(messagesAnswer, function(msg) {
            if (msg !== null) {
                console.log(msg.content.toString());
                ch.ack(msg);
            }
        });
    });
}).catch(console.warn);

rabbitmq.sendMessage = function (message) {
    if (!connection){
        console.error('Connexion RabbitMQ null');
        return;
    }
    return connection.assertQueue(messagesEmitter, {durable: true}).then(function(ok) {
        console.log('Send from WS : ' + JSON.stringify(message));
        return connection.sendToQueue(messagesEmitter, Buffer.from(JSON.stringify(message)), {persistent: true});
    });
};

module.exports = rabbitmq;