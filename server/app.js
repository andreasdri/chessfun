var express = require('express');
var path = require('path');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
var Chess = require('chess.js').Chess;

app.use(express.static(path.join(__dirname, '../public')));
app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));

var queue = [];
var games = [];
var clients = {};

var findGame = function(username) {
  var i = 0;
  for(i; i < games.length; i++) {
    var game = games[i];
    if(game.white.name === username || game.black.name === username) {
      return game;
    }
  }
};

io.on('connection', function(socket){
  console.log('A user connected');

  socket.on('new game', function(username) {
    var user = {username: username, socket: socket};
    clients[username] = socket.id;
    if(queue.length < 1) {
      queue.push(user);
      socket.emit('waiting');
    }

    else {
      var opponent = queue.pop();
      var game = {
        white: {name: opponent.username, id: opponent.socket.id, timeLeft: 60*5},
        black: {name: username, id: socket.id, timeLeft: 60*5},
        board: new Chess()
      };
      games.push(game);

      // Send game info without the Chess board instance (which contains BigInt)
      var gameInfo = {
        white: game.white,
        black: game.black
      };
      io.to(opponent.socket.id).emit('game found', gameInfo);
      io.to(socket.id).emit('game found', gameInfo);
    }

  });

  socket.on('new move', function(move, opponent) {
    var game = findGame(opponent);
    game.board.move(move);

    io.to(clients[opponent]).emit('new move', move);

  });

  socket.on('disconnect', function() {
    console.log('User disconnected');

    var index = queue.indexOf(socket);
    if(index !== -1) {
      queue = [];
    }
    else {
      for(var i = 0; i < games.length; i++) {
        var game = games[i];
        var white = game.white;
        var black = game.black;

        if(white.id === socket.id) {
          io.to(black.id).emit('player disconnected');
        }
        else if(black.id === socket.id) {
          io.to(white.id).emit('player disconnected');
        }
      }
    }
  });
});


server.listen(3000, function() {
  console.log('Listening on port 3000');
});



