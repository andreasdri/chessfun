import { Chessboard, COLOR, FEN, INPUT_EVENT_TYPE } from '../node_modules/cm-chessboard/src/Chessboard.js';
import { Chess } from '../node_modules/chess.js/dist/esm/chess.js';

window.onload = function() {
  const socket = io();
  let board;
  let game;
  let username;
  let opponent;
  let myColor;

  // UI Elements
  const nameInput = document.getElementById('nameInput');
  const findButton = document.getElementById('findButton');

  // cm-chessboard move input handler
  function moveInputHandler(event) {
    // Allow starting move input
    if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
      const piece = game.get(event.squareFrom);
      if (!piece) return false;

      const pieceColor = piece.color;
      const playerColor = myColor === 'white' ? 'w' : 'b';

      // Only allow moving own pieces on own turn
      if (pieceColor !== playerColor || game.turn() !== playerColor) {
        return false;
      }

      return true;
    }

    // Validate the move
    if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
      const move = game.move({
        from: event.squareFrom,
        to: event.squareTo,
        promotion: 'q'
      });

      if (move === null) {
        return false; // Invalid move
      }

      // Move was valid, send to opponent
      socket.emit('new move', {
        from: event.squareFrom,
        to: event.squareTo,
        promotion: 'q'
      }, opponent);

      return true;
    }

    // After move is finished, update board position
    if (event.type === INPUT_EVENT_TYPE.moveInputFinished) {
      board.setPosition(game.fen(), true);
    }
  }

  // Vanilla JS: Button click handler (was jQuery)
  findButton.addEventListener('click', function() {
    username = nameInput.value.trim();
    if (username && !game) {
      socket.emit('new game', username);
    }
  });

  // Socket.IO: Waiting for opponent
  socket.on('waiting', function() {
    findButton.style.color = 'red';
    findButton.textContent = 'Waiting for opponent';
  });

  // Socket.IO: Game found
  socket.on('game found', function(new_game) {
    findButton.style.color = 'green';
    findButton.textContent = 'Game found';
    findButton.disabled = true;
    nameInput.disabled = true;

    opponent = username === new_game.white.name
      ? new_game.black.name
      : new_game.white.name;

    myColor = username === new_game.white.name ? 'white' : 'black';

    game = new Chess();

    board = new Chessboard(document.getElementById('board'), {
      position: FEN.start,
      orientation: myColor === 'white' ? COLOR.white : COLOR.black,
      assetsUrl: '/node_modules/cm-chessboard/assets/',
      style: {
        cssClass: 'default',
        showCoordinates: true,
        aspectRatio: 1,
        pieces: {
          file: 'pieces/standard.svg'
        }
      },
      responsive: true,
      animationDuration: 300
    });

    board.enableMoveInput(moveInputHandler, myColor === 'white' ? COLOR.white : COLOR.black);
  });

  // Socket.IO: Receive opponent's move
  socket.on('new move', function(move) {
    game.move(move);
    board.setPosition(game.fen(), true);
  });

  // Socket.IO: Player disconnected
  socket.on('player disconnected', function() {
    alert('Opponent disconnected!');
    findButton.disabled = false;
    findButton.textContent = 'Find opponent';
    findButton.style.color = '';
    nameInput.disabled = false;
    game = null;
    board.destroy();
  });
}
