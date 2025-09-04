const video = document.getElementById('webcam');
const canvas = document.getElementById('puzzleCanvas');
const ctx = canvas.getContext('2d');

const GRID_SIZE = 4;
const PIECE_WIDTH = canvas.width / GRID_SIZE;
const PIECE_HEIGHT = canvas.height / GRID_SIZE;
let pieces = [];
let highlightIndices = [];
let highlightTimeout = null;
// Track if puzzle has already been solved to prevent repeated alerts
let puzzleSolved = false;
let draggingPiece = null;
let offsetX = 0;
let offsetY = 0;

// Shuffle array helper
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Setup webcam
navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
  video.srcObject = stream;
  video.onloadedmetadata = () => {
    video.play();
    initPuzzle();
    requestAnimationFrame(draw);
  };
});

function initPuzzle() {
  pieces = [];
  // Create all grid positions
  let positions = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      positions.push({ x, y });
    }
  }
  // Shuffle positions for random assignment
  shuffle(positions);
  for (let i = 0; i < positions.length; i++) {
    pieces.push({
      srcX: positions[i].x,
      srcY: positions[i].y,
      destX: i % GRID_SIZE,
      destY: Math.floor(i / GRID_SIZE)
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    // If dragging, skip drawing that piece
    if (draggingPiece === i) continue;
    ctx.drawImage(
      video,
      p.srcX * PIECE_WIDTH,
      p.srcY * PIECE_HEIGHT,
      PIECE_WIDTH,
      PIECE_HEIGHT,
      p.destX * PIECE_WIDTH,
      p.destY * PIECE_HEIGHT,
      PIECE_WIDTH,
      PIECE_HEIGHT
    );
    // Highlight effect for swapped squares
    if (highlightIndices.includes(i)) {
      ctx.save();
      ctx.strokeStyle = 'yellow';
      ctx.lineWidth = 6;
      ctx.strokeRect(p.destX * PIECE_WIDTH + 2, p.destY * PIECE_HEIGHT + 2, PIECE_WIDTH - 4, PIECE_HEIGHT - 4);
      ctx.restore();
    } else {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.destX * PIECE_WIDTH, p.destY * PIECE_HEIGHT, PIECE_WIDTH, PIECE_HEIGHT);
    }
  }
  // Draw dragging piece on top
  if (draggingPiece !== null) {
    const p = pieces[draggingPiece];
    ctx.globalAlpha = 0.8;
    ctx.drawImage(
      video,
      p.srcX * PIECE_WIDTH,
      p.srcY * PIECE_HEIGHT,
      PIECE_WIDTH,
      PIECE_HEIGHT,
      offsetX - PIECE_WIDTH / 2,
      offsetY - PIECE_HEIGHT / 2,
      PIECE_WIDTH,
      PIECE_HEIGHT
    );
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = '#ff0';
    ctx.strokeRect(offsetX - PIECE_WIDTH / 2, offsetY - PIECE_HEIGHT / 2, PIECE_WIDTH, PIECE_HEIGHT);
  }
  requestAnimationFrame(draw);
}

// Mouse/touch drag logic
function checkPuzzleSolved() {
  for (let i = 0; i < pieces.length; i++) {
    if (pieces[i].srcX !== pieces[i].destX || pieces[i].srcY !== pieces[i].destY) {
      return false;
    }
  }
  return true;
}
canvas.addEventListener('mousedown', e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    const px = p.destX * PIECE_WIDTH;
    const py = p.destY * PIECE_HEIGHT;
    if (x > px && x < px + PIECE_WIDTH && y > py && y < py + PIECE_HEIGHT) {
      draggingPiece = i;
      offsetX = x;
      offsetY = y;
      break;
    }
  }
});

canvas.addEventListener('mousemove', e => {
  if (draggingPiece !== null) {
    const rect = canvas.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
  }
});

canvas.addEventListener('mouseup', e => {
  console.log('mouseup event triggered');
  if (draggingPiece !== null) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Snap to nearest grid
    const gridX = Math.floor(x / PIECE_WIDTH);
    const gridY = Math.floor(y / PIECE_HEIGHT);
    // Find the piece at the drop location
    let targetPieceIndex = null;
    for (let i = 0; i < pieces.length; i++) {
      if (pieces[i].destX === gridX && pieces[i].destY === gridY) {
        targetPieceIndex = i;
        break;
      }
    }
    if (targetPieceIndex !== null && targetPieceIndex !== draggingPiece) {
      console.log('Before swap:', JSON.stringify(pieces));
      // Swap only destX and destY between dragged and target piece
      const tempDestX = pieces[draggingPiece].destX;
      const tempDestY = pieces[draggingPiece].destY;
      pieces[draggingPiece].destX = pieces[targetPieceIndex].destX;
      pieces[draggingPiece].destY = pieces[targetPieceIndex].destY;
      pieces[targetPieceIndex].destX = tempDestX;
      pieces[targetPieceIndex].destY = tempDestY;
      console.log('After swap:', JSON.stringify(pieces));
      // Highlight swapped squares
      highlightIndices = [draggingPiece, targetPieceIndex];
      if (highlightTimeout) clearTimeout(highlightTimeout);
      highlightTimeout = setTimeout(() => { highlightIndices = []; }, 400);
    } else {
      // If no piece is there, just move
      pieces[draggingPiece].destX = gridX;
      pieces[draggingPiece].destY = gridY;
      console.log('Moved piece:', JSON.stringify(pieces[draggingPiece]));
      highlightIndices = [draggingPiece];
      if (highlightTimeout) clearTimeout(highlightTimeout);
      highlightTimeout = setTimeout(() => { highlightIndices = []; }, 400);
    }
    draggingPiece = null;
    // Show alert if puzzle is solved
    if (!puzzleSolved && checkPuzzleSolved()) {
      puzzleSolved = true;
      alert('Congratulations! Puzzle solved!');
    } else if (puzzleSolved && !checkPuzzleSolved()) {
      puzzleSolved = false;
    }
  }
});

// Touch support
canvas.addEventListener('touchstart', e => {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    const px = p.destX * PIECE_WIDTH;
    const py = p.destY * PIECE_HEIGHT;
    if (x > px && x < px + PIECE_WIDTH && y > py && y < py + PIECE_HEIGHT) {
      draggingPiece = i;
      offsetX = x;
      offsetY = y;
      break;
    }
  }
});

canvas.addEventListener('touchmove', e => {
  if (draggingPiece !== null) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;
  }
});

canvas.addEventListener('touchend', e => {
  console.log('touchend event triggered');
  if (draggingPiece !== null) {
    const rect = canvas.getBoundingClientRect();
    const x = offsetX;
    const y = offsetY;
    const gridX = Math.floor(x / PIECE_WIDTH);
    const gridY = Math.floor(y / PIECE_HEIGHT);
    // Find the piece at the drop location
    let targetPieceIndex = null;
    for (let i = 0; i < pieces.length; i++) {
      if (pieces[i].destX === gridX && pieces[i].destY === gridY) {
        targetPieceIndex = i;
        break;
      }
    }
    if (targetPieceIndex !== null && targetPieceIndex !== draggingPiece) {
      console.log('Before swap:', JSON.stringify(pieces));
      // Swap only destX and destY between dragged and target piece
      const tempDestX = pieces[draggingPiece].destX;
      const tempDestY = pieces[draggingPiece].destY;
      pieces[draggingPiece].destX = pieces[targetPieceIndex].destX;
      pieces[draggingPiece].destY = pieces[targetPieceIndex].destY;
      pieces[targetPieceIndex].destX = tempDestX;
      pieces[targetPieceIndex].destY = tempDestY;
      console.log('After swap:', JSON.stringify(pieces));
      // Highlight swapped squares
      highlightIndices = [draggingPiece, targetPieceIndex];
      if (highlightTimeout) clearTimeout(highlightTimeout);
      highlightTimeout = setTimeout(() => { highlightIndices = []; }, 400);
    } else {
      // If no piece is there, just move
      pieces[draggingPiece].destX = gridX;
      pieces[draggingPiece].destY = gridY;
      console.log('Moved piece:', JSON.stringify(pieces[draggingPiece]));
      highlightIndices = [draggingPiece];
      if (highlightTimeout) clearTimeout(highlightTimeout);
      highlightTimeout = setTimeout(() => { highlightIndices = []; }, 400);
    }
    draggingPiece = null;
    // Show alert if puzzle is solved
    if (checkPuzzleSolved()) {
      alert('Congratulations! Puzzle solved!');
    }
  }
});

// TODO: Hand gesture detection for pinch/grab (can be added with TensorFlow.js Handpose or MediaPipe Hands)
