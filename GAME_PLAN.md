# Tic Tac Toe — Game Plan

A simple two-player game on a 5×5 grid. This document is a plan only; no game code yet.

## Goal

Players take turns placing marks on a 5×5 board. The first player to get five of their marks in a row (horizontal, vertical, or diagonal) wins. If the board fills with no winner, the game is a draw.

## Players

- Two players: **X** and **O**
- X always goes first
- Players alternate turns
- A player may place a mark only in an empty cell

## Board

- A 5×5 grid (25 cells)
- Each cell is empty, X, or O
- The board starts empty

## Rules

1. On a turn, the current player chooses one empty cell and places their mark.
2. After each move, check for a win or a draw.
3. A **win** is five of the same mark in a line:
   - any of the 5 rows
   - any of the 5 columns
   - either of the 2 full diagonals
4. A **draw** happens when all 25 cells are filled and nobody has won.
5. After a win or draw, the game ends. Players can start a new game.

## What the player should see

- The 5×5 board
- Whose turn it is (X or O)
- A clear result when the game ends: “X wins”, “O wins”, or “Draw”
- A way to start a new game

## Scope for the first version

**In**

- Two humans taking turns on the same screen
- Click or tap a cell to place a mark
- Win and draw detection
- Restart

**Out (for later, if we want it)**

- Computer opponent
- Score history across games
- Online multiplayer
- Animations or sound

## Later implementation order (when we start coding)

1. Draw an empty 5×5 board
2. Handle a click on an empty cell and place X or O
3. Switch turns after a valid move
4. Detect win and draw
5. Show the result and disable further moves
6. Add a restart control

## Success

The first version is done when two people can play a full game, see a correct winner or draw, and start over without refreshing the page.
