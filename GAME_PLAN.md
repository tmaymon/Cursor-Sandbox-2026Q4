# Tic Tac Toe — Game Plan

A simple two-player game on a 5×5 grid, played in the browser. This document is a plan only; no game code yet.

## Goal

Players take turns placing marks on a 5×5 board. The first player to get three of their marks in a row (horizontal, vertical, or diagonal) wins. If the board fills with no winner, the game is a draw.

## Players

- Two humans on the same screen: **X** and **O**
- No computer opponent in the first version
- X always goes first, including after Restart
- Players alternate turns
- A player may place a mark only in an empty cell

## Board

- A 5×5 grid (25 cells)
- Each cell is empty, X, or O
- The board starts empty
- Edges do not wrap around: a line that goes off one edge does not continue on the opposite edge

## Rules

1. On a turn, the current player chooses one empty cell and places their mark.
2. After each move, check for a win or a draw.
3. A **win** is three of the same mark in a consecutive line, anywhere on the board:
   - horizontal (in any row)
   - vertical (in any column)
   - diagonal (usual 45° neighbor lines only, either direction)
   The three marks must be adjacent with no gaps. `X X X` wins; `X _ X X` does not. Four or five in a row also wins, because it contains three. The three marks do not need to span the full board. A line that goes off one edge does not continue on the opposite edge.
4. The game **ends on the first 3-in-a-row**. The player who just completed it wins immediately, even if cells are still empty. A game can end as early as X’s third move. A full-board draw is possible but rare.
5. A **draw** happens when all 25 cells are filled and nobody has won.
6. After a win or draw, no further marks can be placed. Players can start a new game. Restart clears the board and X goes first.

## What the player should see

- A browser page with the 5×5 board
- Whose turn it is (X or O)
- A clear result when the game ends: “X wins”, “O wins”, or “Draw”
- A way to start a new game

## Scope for the first version

**In**

- Code built and run locally
- Opened and played in a web browser
- Two humans taking turns on the same screen
- Click or tap a cell to place a mark
- Win and draw detection
- Restart (X goes first)

**Out (for later, if we want it)**

- Computer opponent
- Score history across games
- Highlighting the winning line
- Online multiplayer
- Animations or sound
- Hosting or deploying the game to a remote server

## How we will build and run it

- Write and build the game **locally** (files on this machine; no remote host required for v1)
- **Run it in a web browser** by opening the local page (a simple local server is fine if the browser needs one)
- Success for a run: the 5×5 board appears in the browser and two people can play without deploying anywhere

## Later implementation order (when we start coding)

1. Set up a local page and open it in the browser
2. Draw an empty 5×5 board in the browser
3. Handle a click on an empty cell and place X or O
4. Switch turns after a valid move
5. Detect win and draw
6. Show the result and disable further moves
7. Add a restart control that clears the board and lets X start

## Success

The first version is done when the game is built locally, opened in a browser, and two people can play a full game, see a correct winner or draw, and start over without refreshing the page.

## Verified

- Three in a row means three **adjacent** marks with no gaps.
- Four or five in a row still wins, because it contains three.
- Lines do **not** wrap around opposite edges.
- Diagonals are only the usual 45° neighbor lines, not other shapes.
- The game ends on the first 3-in-a-row, even if the board is not full.
- First version is two humans on the same screen; no computer opponent.
- After Restart, X always goes first.
- It will be built locally and run in the browser.
- v1 is only board, turns, win/draw, and restart — nothing else.
