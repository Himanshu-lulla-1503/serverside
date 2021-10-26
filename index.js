const express = require('express');
const http = require('http');
const app = express();
const port = process.env.PORT||5000;
const server= http.createServer(app);
const io = require('socket.io')(server);


//Chat variables
let roomsmessages={}
let socketInroom={}
let userjoinedrooms={}


//Video chat variables
const users = {};
const usersinroom={};
const socketToRoom = {};

io.on('connection',socket=>{
    socket.on('create room',(payload)=>{
        const id = payload.roomID;
        roomsmessages[id]=[];
        socketInroom[id]=[
            {
            id:socket.id,
            name:payload.name,
            roomName:payload.roomName,
            admin:true
        }]
        socket.join(id);
        if(userjoinedrooms[socket.id]){
            userjoinedrooms[socket.id].push({roomID:id,roomName:payload.roomName})
        }
        else{
            userjoinedrooms[socket.id]=[{roomID:id,roomName:payload.roomName}]
        }
        socket.emit('rooms',userjoinedrooms[socket.id]);
        const usersinroom=socketInroom[id];
        io.to(id).emit('room data',{arr:usersinroom,roomID:id});
        console.log(socketInroom);
        console.log(userjoinedrooms);

    
    })
    socket.on('join room',(payload)=>{
        console.log(payload);
        if(!socketInroom[payload.roomjoined]){
            socket.emit('no room',"No such room exists")
        }
        else{
            socket.join(payload.roomjoined);
            socket.broadcast.to(payload.roomjoined).emit('message', { user: 'admin', text:`${payload.name} has joined the chat`,id:null,roomID:payload.roomjoined });
            const roomtobejoined=socketInroom[payload.roomjoined][0].roomName;
            socketInroom[payload.roomjoined].push({
                id:socket.id,
                name:payload.name,
                roomName:roomtobejoined
            })
            if(userjoinedrooms[socket.id]){
                userjoinedrooms[socket.id].push({roomID:payload.roomjoined,roomName:roomtobejoined})
            }
            else{
                userjoinedrooms[socket.id]=[{roomID:payload.roomjoined,roomName:roomtobejoined}]
            }
            socket.emit('rooms',userjoinedrooms[socket.id]);
            const usersinroom=socketInroom[payload.roomjoined];
            io.to(payload.roomjoined).emit('room data',{arr:usersinroom,roomID:payload.roomjoined});

           
        }

    })
 
    socket.on('send message',payload=>{
        if(payload.isChannel){
            io.to(payload.roomID).emit('message', { user: payload.sender, text: payload.message,id:socket.id,roomID:payload.roomID });
        }
        else{
            socket.to(payload.roomID).emit('message',{ user: payload.sender, text: payload.message,id:socket.id,roomID:payload.senderId })
            io.to(payload.senderId).emit('message',{ user: payload.sender, text: payload.message,id:socket.id,roomID:payload.roomID })
        }
           

    })
    socket.on('leave room',payload=>{
        socket.leave(payload.roomID);
        const newusers=userjoinedrooms[payload.myid].filter((curele)=>{
            return curele.roomID!=payload.roomID
        })
       userjoinedrooms[payload.myid]=[...newusers];
       socket.emit('rooms',userjoinedrooms[socket.id]);
       socket.broadcast.to(payload.roomID).emit('message', { user: 'admin', text:`${payload.name} has left the chat`,id:null,roomID:payload.roomID });
       const socketsrecord=socketInroom[payload.roomID].filter((curele)=>{
        return curele.id!=payload.myid
    })
        socketInroom[payload.roomID]=[...socketsrecord];
       const usersinroom=socketInroom[payload.roomID];
       socket.broadcast.to(payload.roomID).emit('room data',{arr:usersinroom,roomID:payload.roomID});
    })







    //Video conferencing server side code
    socket.on("joinvid room", roomID => {
        if (users[roomID]) {
            const length = users[roomID].length;
            if (length === 4) {
                socket.emit("room full");
                return;
            }
            users[roomID].push(socket.id);
           
        } else {
            users[roomID] = [socket.id];
        }
        socketToRoom[socket.id] = roomID;
        const usersInThisRoom = users[roomID].filter(id => id !== socket.id);

        socket.emit("all users", usersInThisRoom);
    });

    socket.on("sending signal", payload => {
        io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
    });

    socket.on("returning signal", payload => {
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
    });

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if (room) {
            room = room.filter(id => id !== socket.id);
            users[roomID] = room;
        }
        socket.broadcast.emit('user left',socket.id);
    });



});
server.listen(port,()=>console.log(`listening on port ${port}`));