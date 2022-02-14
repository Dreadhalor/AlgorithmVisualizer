import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './App.scss';
import { v4 as uuidv4 } from 'uuid';
import GridSquare from './components/GridSquare';
import TopNav from './components/TopNav';
import { bfs, bfs_raw } from './utilities/solvers/bfs';
import {
  kruskals,
  ellers,
  recursiveBacktracking,
  huntAndKill,
  prims,
} from './utilities/maze-generation';
import { Animator } from './utilities/animator';
import { finishAnimation } from './utilities/animations';
import { recursiveDivision } from './utilities/maze-generation/recursive-division';

function App() {
  const [rows, setRows] = useState(25);
  const [cols, setCols] = useState(39);
  let squareSize = useRef(25);

  const createNewGrid = (num_rows, num_cols) => {
    let new_grid = [];
    for (let i = 0; i < num_rows; i++) {
      let row = [];
      for (let j = 0; j < num_cols; j++) {
        row.push({ uuid: uuidv4() });
      }
      new_grid.push(row);
    }
    return new_grid;
  };
  const [grid, setGrid] = useState(createNewGrid(5, 5));

  const gridContainerRef = useRef();
  const mode = useRef(3);
  const solved = useRef(false);
  const navRef = useRef();
  const animatorRef = useRef(new Animator());
  const dragValRef = useRef(null);
  const finished = () => animatorRef.current.playAnimations([...finishAnimation(grid)]);
  animatorRef.current.setFinishFunction(finished);

  const checkForPathReset = () => {
    return animatorRef.current.animationsLeft() > 0;
  };
  const setValueCheck = (candidate_square, uuid, val, reset_override = false) => {
    let tile_match = candidate_square.uuid === uuid;
    let val_match = candidate_square.val === val;
    let exact_match = tile_match && val_match;
    if (exact_match) {
      candidate_square.setVal(0);
      return 0;
    } else if (tile_match) {
      if (val === 3 && candidate_square.pathVal === 2 && !reset_override) resetPath();
      if (val === 1 || val === 2) {
        if (candidate_square.val === 3) return null;
        if (!reset_override) resetPath();
        removeVal(val);
      }
      candidate_square.setVal(val);
      return val;
    }
    return null;
  };
  const setValue = (square_uuid, val = mode.current, reset_override = false) => {
    let value_set = null;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        let possible = setValueCheck(grid[i][j], square_uuid, val, reset_override);
        if ((possible ?? null) !== null) value_set = possible;
      }
    }
    if ((value_set ?? null) !== null && checkForPathReset() && !reset_override) resetPath();
    return value_set;
  };
  const removeVal = (val) => {
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        let tile = grid[i][j];
        if (tile.val === val) tile.setVal(0);
      }
    }
  };
  //eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    resetGridSize();
  }, []); //eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let middle_row = Math.floor(rows / 2);
    let potential_start = getTile([middle_row, 1]);
    let potential_end = getTile([middle_row, cols - 2]);
    if (potential_start) {
      setValue(potential_start.uuid, 1);
      potential_start.animate(1);
    }
    if (potential_end) {
      setValue(potential_end.uuid, 2);
      potential_end.animate(1);
    }
  }, [grid]); //eslint-disable-line react-hooks/exhaustive-deps

  // const resetCounter = useRef(5);

  function resetGridSize() {
    let w = gridContainerRef.current.clientWidth,
      h = gridContainerRef.current.clientHeight;
    squareSize.current = w < 600 ? 20 : 25;
    let new_rows = Math.floor(h / squareSize.current);
    if (new_rows % 2 === 0 && new_rows > 0) new_rows--;
    let new_cols = Math.floor(w / squareSize.current);
    if (new_cols % 2 === 0 && new_cols > 0) new_cols--;
    animatorRef.current.flushAnimationQueue();
    setRows(() => new_rows); //eslint-disable-line react-hooks/exhaustive-deps
    setCols(() => new_cols); //eslint disable-line exhaustive-deps
    setGrid(() => createNewGrid(new_rows, new_cols)); //eslint disable-line exhaustive-deps
    // resetCounter.current--;
    if (new_rows === 1) setTimeout(resetGridSize, 10);
  }
  useEffect(() => {
    window.addEventListener('resize', resetGridSize);
    return () => window.removeEventListener('resize', resetGridSize);
  }, []); //eslint-disable-line react-hooks/exhaustive-deps

  //console.log('app rendered');

  const gridStyle = {
    margin: 'auto',
    display: 'grid',
    gap: '0px',
    gridTemplateColumns: `repeat(${cols}, auto)`,
  };

  const resetPath = () => {
    solved.current = false;
    animatorRef.current.flushAnimationQueue();
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        let tile = grid[i][j];
        if (tile.pathVal) tile.setPathVal(0);
        tile.setDisplayVal(null);
        switch (tile.val) {
          case 4:
            tile.setVal(0);
            break;
          case 5:
            tile.setVal(3);
            break;
          case 6:
            tile.setVal(0);
            break;
          case 7:
            tile.setVal(3);
            break;
          default:
            break;
        }
      }
    }
    navRef.current.forceRender();
  };
  const resetWalls = (animate_tiles = false) => {
    let [start, end] = getStartAndEnd();
    resetPath();
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        let tile = grid[i][j];
        if (start && i === start[0] && j === start[1]) {
          tile.setVal(1);
          if (animate_tiles) tile.animate(1);
        } else if (end && i === end[0] && j === end[1]) {
          tile.setVal(2);
          if (animate_tiles) tile.animate(1);
        } else tile.setVal(0);
      }
    }
  };

  const wallifyItAll = () => {
    resetPath();
    grid.forEach((row) =>
      row.forEach((tile) => {
        tile.setVal(3);
        tile.setDisplayVal(null);
      })
    );
  };
  const solve = () => {
    resetPath();
    let start = null;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (grid[i][j].val === 1) {
          start = [i, j];
          break;
        }
      }
    }
    let animation_queue = [];
    let end = bfs({
      maze: grid,
      start_coords: start,
      check_solved_func: (tile) => tile.val === 2,
      traversal_animation_func: (tile) => tile.setPathVal(1),
      path_animation_func: (tile) => tile.setPathVal(2),
      animation_queue,
    });
    animation_queue.push(() => {
      if (!end) {
        gridContainerRef.current.classList.remove('no-solution');
        void gridContainerRef.current.offsetWidth;
        gridContainerRef.current.classList.add('no-solution');
      }
    });
    animatorRef.current.playAnimations(animation_queue, 3);
    solved.current = true;
    navRef.current.forceRender();
  };

  const getTile = (coords) => {
    if (coords) return grid?.[coords[0]]?.[coords[1]];
  };
  const getStartAndEnd = () => {
    let start = null,
      end = null;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (grid[i][j].val === 1) start = [i, j];
        if (grid[i][j].val === 2) end = [i, j];
      }
    }
    return [start, end];
  };
  const getClosestPathSquare = (new_grid, coords, val) => {
    return bfs_raw({
      maze: new_grid,
      start_coords: coords,
      solution_func: (tile_val) => tile_val === val,
    });
  };
  const resetStartAndEnd = (old_start, old_end) => {
    let new_grid = grid.map((row) =>
      row.map((square) => {
        if (square.val === 1 || square.val === 2) return 0;
        return square.val;
      })
    );
    let start = getClosestPathSquare(new_grid, old_start, 0);
    let end = getClosestPathSquare(new_grid, old_end, 0);

    if (start) {
      let tile = getTile(start);
      // setValue(tile.uuid, 1, true); //lol fuck it
      tile.setVal(1);
      tile.animate(1);
    }
    if (end) {
      let tile = getTile(end);
      // setValue(tile.uuid, 2, true);
      tile.setVal(2);
      tile.animate(1);
    }
  };
  const generateKruskals = () => {
    let [start, end] = getStartAndEnd();
    wallifyItAll();
    kruskals(grid, animatorRef);
    animatorRef.current.pushOneToOpenQueue(() => resetStartAndEnd(start, end));
    animatorRef.current.closeOpenQueue(true);
  };
  const generateEllers = () => {
    let [start, end] = getStartAndEnd();
    wallifyItAll();
    //eslint-disable-next-line no-unused-vars
    let [result, animations] = ellers(grid);
    animations = animations.concat(() => resetStartAndEnd(start, end));

    animatorRef.current.playAnimations(animations, 1, true);
  };
  const generateDFS = () => {
    let [start, end] = getStartAndEnd();
    wallifyItAll();
    //eslint-disable-next-line no-unused-vars
    let [result, animations] = recursiveBacktracking(grid);
    animations = animations.concat(() => resetStartAndEnd(start, end));

    animatorRef.current.playAnimations(animations, 2, true);
  };
  const generateHuntAndKill = () => {
    let [start, end] = getStartAndEnd();
    wallifyItAll();
    let [result, animations] = huntAndKill(grid); //eslint-disable-line no-unused-vars
    animations = animations.concat(() => resetStartAndEnd(start, end));
    animatorRef.current.playAnimations(animations, 2, true);
  };
  const generatePrims = () => {
    let [start, end] = getStartAndEnd();
    wallifyItAll();
    //eslint-disable-next-line no-unused-vars
    let [result, animations] = prims(grid);
    animations = animations.concat(() => resetStartAndEnd(start, end));
    animatorRef.current.playAnimations(animations, 2, true);
  };
  const generateRecursiveDivision = () => {
    let [start, end] = getStartAndEnd();
    resetWalls(false);
    let result = recursiveDivision(grid, 10).concat(() => resetStartAndEnd(start, end));
    animatorRef.current.playAnimations(result, 1, true);
  };

  return (
    <div className='App site-bg-empty h-full w-full flex flex-col'>
      <TopNav
        ref={navRef}
        modeRef={mode}
        solve={solve}
        solvedRef={solved}
        clearPath={resetPath}
        generateKruskals={generateKruskals}
        generateEllers={generateEllers}
        generateDFS={generateDFS}
        generateHuntAndKill={generateHuntAndKill}
        generatePrims={generatePrims}
        generateRecursiveDivision={generateRecursiveDivision}
        resetWalls={resetWalls}
      />
      <div className='w-full flex-1 relative min-h-0'>
        <div className='w-full h-full top-0 left-0 absolute flex overflow-auto p-1'>
          <div
            ref={gridContainerRef}
            className={(rows <= 1 ? 'opacity-0 ' : '') + 'flex-1 h-full flex min-w-0'}
          >
            <div style={gridStyle}>
              {grid &&
                grid.map((row) =>
                  row.map((square) => (
                    <GridSquare
                      key={square.uuid}
                      size={squareSize.current}
                      rows={rows}
                      square={square}
                      setValue={setValue}
                      dragValRef={dragValRef}
                      modeRef={mode}
                    />
                  ))
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
