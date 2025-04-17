import type { Tetromino } from "../constants";
import { Cell } from "./Cell";

export function RightBar({ nextTetromino, show }: { nextTetromino: Tetromino; show: boolean }) {
  const matrix: JSX.Element[][] = [];
  const PREVIEW_GRID_COLS = 6;
  const PREVIEW_GRID_ROWS = 4;

  for (let i = 0; i < PREVIEW_GRID_ROWS; i += 1) {
    const row: JSX.Element[] = [];
    for (let j = 0; j < PREVIEW_GRID_COLS; j += 1) {
      if (show && nextTetromino.previewBlockPos.some(([x, y]) => x === i && y === j)) {
        row.push(<Cell key={j} colour={nextTetromino.colour} type="coloured" />);
      } else {
        // nonexistent user
        row.push(<Cell key={j} colour="none" />); // game has not started, don't show next tetromino
      }
    }
    matrix.push(row);
  }

  return (
<div className="right-bar">
       <div className="next-tetromino-box">
         <div className="next-tetromino">Next</div>
         <div className="next-tetromino-matrix">{matrix}</div>
       </div>
       <div className="save-status">{saveStatus}</div>
     </div>
  );
}