const draw = (
  srcImg,
  targetCanvas,
  flipHorizontally,
  flipVertically
) => {
  const targetCanvasContext = targetCanvas.getContext("2d");
  const targetCanvasData = targetCanvasContext.getImageData(0, 0, targetCanvas.width, targetCanvas.height).data;

  const points = targetCanvasData.reduce((a, p, i, ps) => {
    if (i % 4 === 1 && ps[i - 1] === 0 && ps[i + 1] === 0 && p === 255) {
      const ii = (i - 1) / 4;
      a.push([ii % targetCanvas.width, Math.floor(ii / targetCanvas.width)])
    }
    return a;
  }, []);
  if (points.length !== 4) {
    console.log(points);
    throw new Error("В шаблоне не 4 точки rgb(0, 255, 0).");
  }
  const pointsAscending = [...points].sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
  let [topLeft, bottomRight] = [
    pointsAscending[0],
    pointsAscending[3],
  ];
  let [topRight, bottomLeft] = [
    [...points].find(p => p[0] > topLeft[0] && p[1] < bottomRight[1]),
    [...points].find(p => p[0] < bottomRight[0] && p[1] > topLeft[1]),
  ];

  const targetMarginX = Math.min(...[topLeft, bottomLeft, topRight, bottomRight].map(p => p[0]));
  const targetMarginY = Math.min(...[topLeft, bottomLeft, topRight, bottomRight].map(p => p[1]));

  const targetPoints = [topLeft, topRight, bottomLeft, bottomRight].map(p => p.map((c, i) => c - (i % 2 === 0 ? targetMarginX : targetMarginY)));
  // const offByOneAdjustments = [-1, -1, 1, -1, -1, 1, 1, 1];
  const [
    topLeftX, topLeftY,
    topRightX, topRightY,
    bottomLeftX, bottomLeftY,
    bottomRightX, bottomRightY
  ] = targetPoints.flat(1);

  const targetTopWidth = topRightX - topLeftX;
  const targetTopOffset = topLeftX;
  const targetBottomWidth = bottomRightX - bottomLeftX;
  const targetBottomOffset = bottomLeftX;
  const targetLeftHeight = bottomLeftY - topLeftY;
  const targetLeftOffset = topLeftY;
  const targetRightHeight = bottomRightY - topRightY;
  const targetRightOffset = topRightY;

  const Xs = targetPoints.map(p => p[0]);
  const targetRectWidth = Math.max(...Xs) - Math.min(...Xs);
  const Ys = targetPoints.map(p => p[1]);
  const targetRectHeight = Math.max(...Ys) - Math.min(...Ys);
  const targetCanvasRect = targetCanvasContext.getImageData(targetMarginX, targetMarginY, targetRectWidth, targetRectHeight);
  const targetCanvasRectData = targetCanvasRect.data;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(
    targetTopWidth + targetTopOffset,
    targetBottomWidth + targetBottomOffset
  );
  canvas.height = Math.max(
    targetLeftHeight + targetLeftOffset,
    targetRightHeight + targetRightOffset
  );

  const srcWidth = srcImg.naturalWidth;
  const srcHeight = srcImg.naturalHeight;

  const context = canvas.getContext("2d");
  context.translate(
    flipHorizontally ? targetRectWidth : 0,
    flipVertically ? targetRectHeight : 0
  );
  context.scale(
    (flipHorizontally ? -1 : 1) * (targetRectWidth / srcWidth),
    (flipVertically ? -1 : 1) * (targetRectHeight / srcHeight)
  );
  context.drawImage(srcImg, 0, 0);
  const canvasData = context.getImageData(0, 0, targetRectWidth, targetRectHeight).data;

  for (let y = 0; y < targetRectHeight; y++) {
    for (let x = 0; x < targetRectWidth; x++) {
      const point = (y * targetRectWidth + x) * 4;

      const targetX = Math.round(
        (targetTopOffset + targetTopWidth * x / targetRectWidth)
        * (1 - y / targetRectHeight)
        + (targetBottomOffset + targetBottomWidth * x / targetRectWidth)
        * (y / targetRectHeight)
      );

      const targetY = Math.round(
        (targetLeftOffset + targetLeftHeight * y / targetRectHeight)
        * (1 - x / targetRectWidth)
        + (targetRightOffset + targetRightHeight * y / targetRectHeight)
        * (x / targetRectWidth)
      );

      const targetPoint = (targetY * targetRectWidth + targetX) * 4;

      targetCanvasRectData[targetPoint] = canvasData[point]; //red
      targetCanvasRectData[targetPoint + 1] = canvasData[point + 1]; //green
      targetCanvasRectData[targetPoint + 2] = canvasData[point + 2]; //blue
      targetCanvasRectData[targetPoint + 3] = canvasData[point + 3]; //alpha
    }
  }
  targetCanvasContext.putImageData(targetCanvasRect, targetMarginX, targetMarginY);
}

export default draw;