window.onload = function() {
  var socket = io();
  var board;
  var game;
  var username;
  var opponent;

    // do not pick up pieces if the game is over
  // only pick up pieces for your color and if it is your turn
  var onDragStart = function(source, piece, position, orientation) {
    var color = orientation === "black" ? new RegExp("^w") : new RegExp("^b");
    if (game.in_checkmate() === true || game.in_draw() === true || piece.search(color) !== -1 || game.turn() !== orientation.charAt(0)) {
      return false;
    }
  };

  var onDrop = function(source, target) {
    // see if the move is legal
    var move = game.move({
      from: source,
      to: target,
      promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return 'snapback';
    socket.emit('new move', move, opponent);
  };

   // update the board position after the piece snap
  // for castling, en passant, pawn promotion
  var onSnapEnd = function() {
    board.position(game.fen());
  };

  $('button').click(function() {
    username = $("input").val();
    if(username && !game) {
      socket.emit('new game', username);
    }
  });

  socket.on('waiting', function() {
    $('#button').css('color', 'red').text('Waiting for opponent');
  });

  socket.on('game found', function(new_game) {
    $('#button').css('color', 'green').text('Game found').prop('disabled', true);
    $('input').prop('disabled', true);
    opponent = username === new_game.white.name ? new_game.black.name : new_game.white.name;
    var cfg = {
      draggable: true,
      orientation: username === new_game.white.name ? 'white' : 'black',
      position: 'start',
      onDrop: onDrop,
      onDragStart: onDragStart
    };
    game = new Chess();
    board = new Chessboard('board', cfg);

  });

  socket.on('new move', function(move) {
    game.move(move);
    board.position(game.fen());
  });


}
