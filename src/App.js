import React, { useState, useReducer } from 'react';
import './App.css';

const ROTATE_CLOCKWISE = 'ROTATE_CLOCKWISE';
const ROTATE_COUNTERCLOCKWISE = 'ROTATE_COUNTERCLOCKWISE';
const TOGGLE_TRANSPARENCY = 'TOGGLE_TRANSPARENCY';
const RESET = 'RESET';
const UNDO = 'UNDO';
const REDO = 'REDO';
const UPLOAD_IMAGE = 'UPLOAD_IMAGE';

const initialGrid = Array(10).fill().map(() => Array(10).fill({ rotation: 0, transparent: false, image: null }));

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
    case TOGGLE_TRANSPARENCY:
      return state.map((row, rowIndex) =>
        row.map((cell, colIndex) =>
          rowIndex === action.row && colIndex === action.col
            ? { ...cell, transparent: !cell.transparent }
            : cell
        )
      );
    case RESET:
      return initialGrid;
    case UPLOAD_IMAGE:
      return state.map((row, rowIndex) =>
        row.map((cell, colIndex) => ({
          ...cell,
          image: action.images[rowIndex * 10 + colIndex], // Associe la portion d'image à chaque cellule
        }))
      );
    case UNDO:
    case REDO:
      return action.history[action.step] || state;
    default:
      return state;
  }
}

function App() {
  const [grid, dispatch] = useReducer(gridReducer, initialGrid);
  const [history, setHistory] = useState([initialGrid]);
  const [currentStep, setCurrentStep] = useState(0);

  const handleAction = (action) => {
    const newGrid = gridReducer(grid, action);
    const newHistory = [...history.slice(0, currentStep + 1), newGrid];
    setHistory(newHistory);
    setCurrentStep(newHistory.length - 1);
    dispatch(action);
  };

  const undo = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      dispatch({ type: UNDO, history, step: currentStep - 1 });
    }
  };

  const redo = () => {
    if (currentStep < history.length - 1) {
      setCurrentStep(currentStep + 1);
      dispatch({ type: REDO, history, step: currentStep + 1 });
    }
  };

  // Handle image upload and fragmentation
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const images = fragmentImage(img);
          handleAction({ type: UPLOAD_IMAGE, images });
        };
      };
      reader.readAsDataURL(file);
    }
  };

  // Fragment the image into 10x10 squares and resize to fit the grid
  const fragmentImage = (image) => {
    const gridSize = 500; // Taille totale de la grille
    const size = gridSize / 10; // Taille de chaque carré (50px si la grille est 500x500)
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = size;
    canvas.height = size;
    
    // Redimensionner l'image entière à 500x500
    const scaledCanvas = document.createElement('canvas');
    const scaledCtx = scaledCanvas.getContext('2d');
    scaledCanvas.width = gridSize;
    scaledCanvas.height = gridSize;
    scaledCtx.drawImage(image, 0, 0, gridSize, gridSize); // Dessine l'image redimensionnée dans le canvas
    
    const fragments = [];
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(scaledCanvas, col * size, row * size, size, size, 0, 0, size, size); // Découpe l'image redimensionnée
        fragments.push(canvas.toDataURL()); // Enregistre chaque fragment en tant que data URL
      }
    }
    return fragments;
  };

  return (
    <div className="App">
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      <div className="grid">
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`square ${cell.transparent ? 'transparent' : ''}`}
              style={{
                transform: `rotate(${cell.rotation}deg)`,
                backgroundImage: cell.image ? `url(${cell.image})` : '',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              onClick={() => handleAction({ type: ROTATE_CLOCKWISE, row: rowIndex, col: colIndex })}
              onContextMenu={(e) => {
                e.preventDefault();
                handleAction({ type: ROTATE_COUNTERCLOCKWISE, row: rowIndex, col: colIndex });
              }}
              onDoubleClick={() =>
                handleAction({ type: TOGGLE_TRANSPARENCY, row: rowIndex, col: colIndex })
              }
            />
          ))
        )}
      </div>
      <button onClick={() => handleAction({ type: RESET })}>Reset</button>
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
    </div>
  );
}

export default App;
