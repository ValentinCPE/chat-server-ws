const fetch = require("node-fetch");
let rabbitmq = require('./../rabbitmq/transfer-message');
let messageWS = {};

const pwdLinkMiddle = process.env.pwdLinkMiddle;

const url = 'http://chatmiddlelink/api/chat';

messageWS.initWS = function (app) {
    let io = require('socket.io')(app, {
        path: '/ws/socket.io'
    });

    let connectionWorked = false;

    io.on("connection", socket => {
        const initSocket = function (currentRoom, currentUser) {
            socket.room = currentRoom;
            socket.user = currentUser;
            socket.roomname = currentRoom.roomname;
        };

        socket.on("onJoin", entity => {
            console.log(JSON.stringify(entity));
            if (entity.user.token) {
                let body = {
                  token: entity.user.token,
                  pwdLinkSent: pwdLinkMiddle
                };

                fetch(url + '/room/isAuthorizedToJoin', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
                    .then(res => res.json())
                    .then(room => {
                        connectionWorked = true;
                    })
                    .catch(error => {
                        socket.emit("errorJoin",{message : JSON.stringify(error)});
                    });

                socket.join(entity.room.roomname);
                initSocket(entity.room,entity.user);
                io.to(socket.roomname).emit("newPerson", entity.user.pseudo);
            } else {
                socket.emit("errorJoin",{message : 'no token'});
            }
        });

        socket.on('quitRoom', function () {
            socket.leaveAll();
            io.to(socket.roomname).volatile.emit("roomLeft", socket.user.pseudo);
        });

        socket.on('disconnect', function () {
            if(connectionWorked && socket.user){
                let disconnect = {
                    token: socket.user.token,
                    pwdLinkSent: pwdLinkMiddle
                };

                fetch(url + '/room/isDisconnected', { method: 'POST', body: JSON.stringify(disconnect), headers: { 'Content-Type': 'application/json' }})
                    .then(res => res.json())
                    .then(room => {
                    })
                    .catch(error => socket.emit("errorDisconnect",{message : error.toString()}));

                io.to(socket.roomname).volatile.emit("roomLeft", socket.user.pseudo);
            }
        });

        socket.on("messageSent", message => {
            message.date = new Date();
            io.to(socket.roomname).emit("newMessageReceived", message);
            socket.emit("newMessageSent", message);
            rabbitmq.sendMessage(message);
        });

        socket.on("adminMessageSent", message => {
            io.emit("newMessageReceivedAdmin", message)
        });

        socket.on("buttonList1", pseudo => {
            io.emit("buttonList1", pseudo);
        });

        socket.on("buttonList2", pseudo => {
            io.emit("buttonList2", pseudo);
        });

        socket.on("adminSendAlert", message => {
            socket.to(message.pseudo).emit("adminSentMeAnAlert", message);
        });

    });
};

module.exports = messageWS;