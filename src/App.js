import React, { useState, useReducer } from 'react';
import './App.css';

const ROTATE_CLOCKWISE = 'ROTATE_CLOCKWISE';
const ROTATE_COUNTERCLOCKWISE = 'ROTATE_COUNTERCLOCKWISE';
const UPLOAD_IMAGE = 'UPLOAD_IMAGE';
const RESET = 'RESET';
const UNDO = 'UNDO';
const REDO = 'REDO';

const initialGrid = Array(10).fill().map(() => Array(10).fill({ rotation: 0, image: null }));

function gridReducer(state, action) {
  switch (action.type) {
    case ROTATE_CLOCKWISE:
      return state.map((row, rowIndex) =>
        row.map((cell, colIndex) =>
          rowIndex === action.row && colIndex === action.col
            ? { ...cell, rotation: (cell.rotation + 90) % 360 }
            : cell
        )
      );
    case ROTATE_COUNTERCLOCKWISE:
      return state.map((row, rowIndex) =>
        row.map((cell, colIndex) =>
          rowIndex === action.row && colIndex === action.col
            ? { ...cell, rotation: (cell.rotation - 90 + 360) % 360 }
            : cell
        )
      );
    case UPLOAD_IMAGE:
      return state.map((row, rowIndex) =>
        row.map((cell, colIndex) => ({
          ...cell,
          image: action.images[rowIndex * 10 + colIndex],
        }))
      );
    case RESET:
      return action.grid;
    default:
      return state;
  }
}

function App() {
  const [grid, dispatch] = useReducer(gridReducer, initialGrid);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  const handleRotateClockwise = () => {
    if (selectedSquare) {
      saveStateToHistory();
      dispatch({ type: ROTATE_CLOCKWISE, row: selectedSquare.row, col: selectedSquare.col });
    }
  };

  const handleRotateCounterClockwise = () => {
    if (selectedSquare) {
      saveStateToHistory();
      dispatch({ type: ROTATE_COUNTERCLOCKWISE, row: selectedSquare.row, col: selectedSquare.col });
    }
  };

  const handleSquareClick = (rowIndex, colIndex) => {
    setSelectedSquare({ row: rowIndex, col: colIndex });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const images = fragmentImage(img);
          setOriginalImage(img);
          saveStateToHistory();
          dispatch({ type: UPLOAD_IMAGE, images });
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const fragmentImage = (image) => {
    const gridSize = 500;
    const size = gridSize / 10;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = size;
    canvas.height = size;

    const scaledCanvas = document.createElement('canvas');
    const scaledCtx = scaledCanvas.getContext('2d');
    scaledCanvas.width = gridSize;
    scaledCanvas.height = gridSize;
    scaledCtx.drawImage(image, 0, 0, gridSize, gridSize);

    const fragments = [];
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(scaledCanvas, col * size, row * size, size, size, 0, 0, size, size);
        fragments.push(canvas.toDataURL());
      }
    }
    return fragments;
  };

  const handleReset = () => {
    if (originalImage) {
      const images = fragmentImage(originalImage);
      saveStateToHistory();
      dispatch({
        type: RESET,
        grid: initialGrid.map((row, rowIndex) =>
          row.map((cell, colIndex) => ({
            ...cell,
            image: images[rowIndex * 10 + colIndex],
          }))
        ),
      });
    }
  };

  const saveStateToHistory = () => {
    setHistory([...history, grid]);
    setFuture([]);
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const prevState = history.pop();
      setFuture([grid, ...future]);
      setHistory([...history]);
      dispatch({ type: RESET, grid: prevState });
    }
  };

  const handleRedo = () => {
    if (future.length > 0) {
      const nextState = future.shift();
      setHistory([...history, grid]);
      setFuture([...future]);
      dispatch({ type: RESET, grid: nextState });
    }
  };

  const handleDragStart = (e, rowIndex, colIndex) => {
    e.dataTransfer.setData('text/plain', `${rowIndex},${colIndex}`);
  };

  const handleDrop = (e, rowIndex, colIndex) => {
    const draggedPos = e.dataTransfer.getData('text/plain');
    const [draggedRow, draggedCol] = draggedPos.split(',').map(Number);

    if (draggedRow !== rowIndex || draggedCol !== colIndex) {
      saveStateToHistory();
      const newGrid = [...grid];
      const temp = newGrid[rowIndex][colIndex];
      newGrid[rowIndex][colIndex] = newGrid[draggedRow][draggedCol];
      newGrid[draggedRow][draggedCol] = temp;
      dispatch({ type: RESET, grid: newGrid });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="App">
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      <div className="grid">
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`square ${selectedSquare && selectedSquare.row === rowIndex && selectedSquare.col === colIndex ? 'highlight' : ''}`}
              style={{
                transform: `rotate(${cell.rotation}deg)`,
                backgroundImage: cell.image ? `url(${cell.image})` : '',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              onClick={() => handleSquareClick(rowIndex, colIndex)}
              draggable
              onDragStart={(e) => handleDragStart(e, rowIndex, colIndex)}
              onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
              onDragOver={handleDragOver}
            />
          ))
        )}
      </div>

      <div className="controls">
        <button onClick={handleRotateCounterClockwise}>-90°</button>
        <button onClick={handleRotateClockwise}>+90°</button>
        <button onClick={handleUndo}>Undo</button>
        <button onClick={handleRedo}>Redo</button>
        <button onClick={handleReset}>Reset</button>
      </div>
    </div>
  );
}

export default App;
