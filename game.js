(function () {
  const SIZE = 5;
  const WIN_LENGTH = 3;
  const DIRECTIONS = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const restartEl = document.getElementById("restart");
  const soundX = document.getElementById("sound-x");
  const soundO = document.getElementById("sound-o");
  const soundWin = document.getElementById("sound-win");

  let board = emptyBoard();
  let currentPlayer = "X";
  let gameOver = false;

  function emptyBoard() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  }

  function inBounds(row, col) {
    return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
  }

  function countInDirection(row, col, dRow, dCol, player) {
    let count = 0;
    let r = row + dRow;
    let c = col + dCol;
    while (inBounds(r, c) && board[r][c] === player) {
      count += 1;
      r += dRow;
      c += dCol;
    }
    return count;
  }

  function hasWinFrom(row, col) {
    const player = board[row][col];
    if (!player) {
      return false;
    }
    return DIRECTIONS.some(([dRow, dCol]) => {
      const total =
        1 +
        countInDirection(row, col, dRow, dCol, player) +
        countInDirection(row, col, -dRow, -dCol, player);
      return total >= WIN_LENGTH;
    });
  }

  function isBoardFull() {
    return board.every((row) => row.every((cell) => cell !== null));
  }

  function setStatus(text, isWin) {
    statusEl.textContent = text;
    statusEl.classList.toggle("win", Boolean(isWin));
  }

  function render() {
    boardEl.replaceChildren();
    for (let row = 0; row < SIZE; row += 1) {
      for (let col = 0; col < SIZE; col += 1) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cell";
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("aria-label", `Row ${row + 1}, column ${col + 1}`);
        const mark = board[row][col];
        if (mark) {
          cell.textContent = mark;
          cell.classList.add(mark === "X" ? "mark-x" : "mark-o");
        }
        cell.disabled = gameOver || Boolean(mark);
        cell.addEventListener("click", onCellClick);
        boardEl.appendChild(cell);
      }
    }
  }

  function onCellClick(event) {
    if (gameOver) {
      return;
    }
    const row = Number(event.currentTarget.dataset.row);
    const col = Number(event.currentTarget.dataset.col);
    if (board[row][col]) {
      return;
    }

    board[row][col] = currentPlayer;

    if (hasWinFrom(row, col)) {
      gameOver = true;
      setStatus(`${currentPlayer} wins`, true);
      playSound(soundWin);
      render();
      return;
    }

    if (isBoardFull()) {
      gameOver = true;
      setStatus("Draw", false);
      render();
      return;
    }

    playSound(currentPlayer === "X" ? soundX : soundO);
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    setStatus(`${currentPlayer}’s turn`, false);
    render();
  }

  function playSound(sound) {
    sound.pause();
    sound.currentTime = 0;
    const play = sound.play();
    if (play) {
      play.catch(() => {});
    }
  }

  function restart() {
    soundWin.pause();
    soundWin.currentTime = 0;
    board = emptyBoard();
    currentPlayer = "X";
    gameOver = false;
    setStatus("X’s turn", false);
    render();
  }

  restartEl.addEventListener("click", restart);
  restart();
})();
