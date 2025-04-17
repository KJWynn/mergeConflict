import { useState, useEffect, useCallback } from "react";
import { Tetromino, TETROMINOES } from "../constants";
import { extremeValCoords, InfiniteSequence, randomNumbers, subtractTuples } from "../modules/util";
import { BlockPos } from "../types";
import { GameMenu } from "./GameMenu";
import { LeftBar } from "./LeftBar";
import { LoginMenu } from "./LoginMenu";
import { Matrix } from "./Matrix";
import { RightBar } from "./RightBar";

type State = {
  score: number;
  level: number;
  lines: number;
  currentTetromino: Tetromino; // currently active tetromino that can be manipulated by player
  nextTetromino: Tetromino; // the next tetromino to be spawned after the current one is dropped.
  nextTetrominoRNG: InfiniteSequence;
  gridColours: string[][];
  gameStarted: boolean; // whether the game has started or not
  gameOver: boolean; // whether the game has ended or not
  dropInterval: number; // the interval at which the tetromino drops
  loggedIn: boolean;
  user: string;
  hasSaved: boolean;
  saveStatus: string;
};

const NUM_ROWS = 22;
const NUM_COLS = 10;
 
 // Initial state
 const initNextTetrominoRNG = randomNumbers(TETROMINOES.length - 1, 0);
 const initialTetromino = TETROMINOES[initNextTetrominoRNG.value];
 const initialNextTetromino = TETROMINOES[initNextTetrominoRNG.next().value];
 const initialState: State = {
   score: 0,
   level: 0,
   lines: 0,
   currentTetromino: initialTetromino,
   nextTetromino: initialNextTetromino,
   nextTetrominoRNG: initNextTetrominoRNG.next(),
   gridColours: Array(NUM_ROWS).fill(Array(NUM_COLS).fill("black")),
   gameStarted: false, // set to false initially to allow the player to start the game
   gameOver: false,
   dropInterval: 1000,  loggedIn: false,
  user: "Guest",
  hasSaved: false,
};

export function GameBoard({
  sound,
}: {
  sound: (type: "move" | "levelUp" | "land" | "rotate" | "lineClear" | "gameOver" | "fourLines") => void;
}) {
  const [state, setState] = useState(initialState);
  const LAST_ROW = 21;
  const FIRST_COLUMN = 0;
  const LAST_COLUMN = 9;

  const lineBonus = (numLines: number) => {
    // The number of lines cleared determines the base bonus.
    switch (numLines) {
      case 1:
        return 100;
      case 2:
        return 400;
      case 3:
        return 900;
      case 4:
        return 2000;
      default:
        return 0;
    }
  };

  

  const softDropBonus = useCallback(() => {
    // score awarded for soft drops depends on level. Also affects the line bonus
    switch (state.level) {
        case 0:
       case 1:
         return 1;
       case 2:
       case 3:
         return 2;
       case 4:
       case 5:
         return 3;
       case 6:
       case 7:
         return 4;
       default:
         return 5;
     }
   }, [state.level]);
 
   const calculateDropInterval = useCallback((dropInterval: number) => {
     if (dropInterval > 100) {
       return dropInterval - 100;
     } return dropInterval - 25;
    }, []);
  
    /**
     * Perfect clear is detected when the rows cleared are the last few continuous rows of the grid (identified by row index, depends on how many were cleared)
     * and all the cells in the rows above are completely empty (no colour other than black).
     * 10 x multiplier applied for perfect clears.
     *
     * removedRows: the indices of the rows that were cleared
     * completeRowsRemoved: the remaining rows after the cleared ones have been removed
     */
    const calcCollisionScore = useCallback(
      (prevScore: number, removedRows: number[], completeRowsRemoved: string[][]) => {
        if (removedRows.length > 0) {
          const baseScore = prevScore + softDropBonus() * lineBonus(removedRows.length); //
  
          const isPerfectClear =
            !completeRowsRemoved.some((row) => row.some((cell) => cell !== "black")) &&
            JSON.stringify(removedRows) ===
              JSON.stringify(Array.from({ length: removedRows.length }, (_, i) => NUM_ROWS - removedRows.length + i));
              return isPerfectClear ? 10 * baseScore : baseScore;
            }
      
            return prevScore;
          },
          [softDropBonus]
        );
      
        /**
         * Processes the grid of colours, handling cleared lines, and returning results to check for perfect clears.
         * @param gridColours - the grid of colours
         * @returns the resultant grid with cleared lines removed and black rows added to the top to replace them, array of removed rows' indices, array of remaining rows after removing the cleared rows
         */
        function removeClearedLines(gridColours: string[][]): [string[][], number[], string[][]] {
          const { completeRowsRemoved, removedIndices } = gridColours.reduce(
            (acc, row, index) => {
              if (row.some((colour: string) => colour === "black")) {
                acc.completeRowsRemoved.push(row);
              } else {
                acc.removedIndices.push(index);
              }return acc;
            },
            { completeRowsRemoved: [] as string[][], removedIndices: [] as number[] }
          );
      
          // create padding rows to fill the cleared lines
          const paddingRows: string[][] = [];
          for (let i = 0; i < removedIndices.length; i += 1) {
            paddingRows.push(Array(NUM_COLS).fill("black"));
          }
          const finalGrid: string[][] = paddingRows.concat(completeRowsRemoved); // add the padding rows to the top of the grid
          return [finalGrid, removedIndices, completeRowsRemoved];
        }
      
        const getDropPreviewPos = (currentBlockPos: BlockPos, gridColours: string[][]) => {
          let bottomMinos = extremeValCoords(currentBlockPos, "d");
          let newGridBlockPos = currentBlockPos;
          while (!bottomMinos.some(([x, y]) => x >= LAST_ROW || gridColours[x + 1][y] !== "black")) {
            // No collision, shift down
            newGridBlockPos = [...newGridBlockPos.map(([x, y]) => [x + 1, y])];
            bottomMinos = extremeValCoords(newGridBlockPos, "d");
            return newGridBlockPos;
        };
      
        const moveTetrominoLeft = useCallback(() => {
          setState((prevState) => {
            const leftmostCoords = extremeValCoords(prevState.currentTetromino.gridBlockPos, "l");
            let newBlockPos = prevState.currentTetromino.gridBlockPos;
            if (!leftmostCoords.some(([x, y]) => y <= FIRST_COLUMN || prevState.gridColours[x][y - 1] !== "black")) {
              sound("move");
              newBlockPos = prevState.currentTetromino.gridBlockPos.map(([x, y]) => [x, y - 1]);
            }
      
            const newGridColours = prevState.gridColours.map((row: string[], i: number) =>
              row.map((colour, j) => {
                const newPosition = newBlockPos.some(([nx, ny]) => nx === i && ny === j);
                // Clear previous positions
                if (!newPosition && prevState.currentTetromino.gridBlockPos.some(([px, py]) => px === i && py === j)) {
                  return "black";
                }
                // Set new position
                if (newPosition) {
                    return prevState.currentTetromino.colour;
                  }
                  return colour;
                })
              );
        
              return {
                ...prevState,
                gridColours: newGridColours,
                currentTetromino: {
                  ...prevState.currentTetromino,
                  ghostPiecePos: getDropPreviewPos(newBlockPos, newGridColours),
                  gridBlockPos: newBlockPos,
                },
              };
            });
          }, [sound]);

          const moveTetrominoDown = useCallback(
            (isSoftDrop = false) => {
              setState((prevState) => {
                const bottomMinos = extremeValCoords(prevState.currentTetromino.gridBlockPos, "d");
                // game over condition: when new tetromino spawns and is already in collision with existing minos
                if (bottomMinos.filter(([x]) => x <= 2).some(([x, y]) => prevState.gridColours[x + 1][y] !== "black")) {
                  sound("gameOver");
                  return {
                    ...prevState,
                    gameStarted: false,
                    gameOver: true,
                  };
                }
        
                if (!bottomMinos.some(([x, y]) => x >= LAST_ROW || prevState.gridColours[x + 1][y] !== "black")) {
                  if (isSoftDrop) {
                    sound("move");
                  }
                  // No collision, shift down
                  const newGridBlockPos: BlockPos = [...prevState.currentTetromino.gridBlockPos.map(([x, y]) => [x + 1, y])];
                  const newGridColours = prevState.gridColours.map((row: string[], i) =>
                    row.map((colour, j) => {
                      const newPosition = newGridBlockPos.some(([nx, ny]) => nx === i && ny === j);
                      // Clear previous positions
                      if (!newPosition && prevState.currentTetromino.gridBlockPos.some(([px, py]) => px === i && py === j)) {
                        return "black";
                      }
        
                      // Set new position
                      if (newPosition) {
                        return prevState.currentTetromino.colour;
                      }
                      return colour;
                    })
                  );
        
                  return {
                    ...prevState,
                    score: isSoftDrop ? prevState.score + softDropBonus() : prevState.score, // points awarded for soft drops, not natural drops
                    gridColours: newGridColours,
                    currentTetromino: {
                      ...prevState.currentTetromino,
                      ghostPiecePos: getDropPreviewPos(newGridBlockPos, newGridColours), // Update ghost piece position
                      gridBlockPos: newGridBlockPos, // Ensures correct type
                    },
                  };
                }
        
                // Collision detected, spawn new tetromino, clear any completed lines
                const clearedLines = removeClearedLines(prevState.gridColours);
                const newLevel = Math.floor((prevState.lines + clearedLines[1].length) / 10);
                sound("land");
                if (newLevel > prevState.level) {
                  sound("levelUp");
                }
                if (clearedLines[1].length === 4) {
                  sound("fourLines");
                } else if (clearedLines[1].length > 0) {
                  sound("lineClear");
                
                }
                const newState = {
          ...prevState,
          lines: prevState.lines + clearedLines[1].length,
          level: newLevel,
          score: calcCollisionScore(prevState.score, clearedLines[1], clearedLines[2]),
          gridColours: clearedLines[0],
          currentTetromino: {
            ...prevState.nextTetromino,
            ghostPiecePos: getDropPreviewPos(prevState.nextTetromino.gridBlockPos, clearedLines[0]),
          },
          nextTetromino: TETROMINOES[prevState.nextTetrominoRNG.value],
          nextTetrominoRNG: prevState.nextTetrominoRNG.next(),
          dropInterval:
            newLevel > prevState.level ? calculateDropInterval(prevState.dropInterval) : prevState.dropInterval,
        };
        saveGame(newState);
        return newState;
      });
    },
    [calcCollisionScore, calculateDropInterval, saveGame, softDropBonus, sound]
  );

  