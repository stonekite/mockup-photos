const draw = (
  srcImg,
  targetCanvas
) => {
  const targetContext = targetCanvas.getContext("2d", {
    willReadFrequently: true
  });

  const [targetCorners, ...targetMargins] = getCornersAndMargins(
    targetContext, targetCanvas.width, targetCanvas.height
  );
  let [targetMarginX, targetMarginY] = targetMargins;
  const xs = targetCorners.map(p => p[0]);
  const ys = targetCorners.map(p => p[1]);
  const [topLeftX, topRightX, bottomLeftX, bottomRightX] = xs;
  const [topLeftY, topRightY, bottomLeftY, bottomRightY] = ys;

  const targetTopWidth = topRightX - topLeftX;
  const targetTopOffset = topLeftX;
  const targetBottomWidth = bottomRightX - bottomLeftX;
  const targetBottomOffset = bottomLeftX;
  const targetLeftHeight = bottomLeftY - topLeftY;
  const targetLeftOffset = topLeftY;
  const targetRightHeight = bottomRightY - topRightY;
  const targetRightOffset = topRightY;

  let targetRectWidth = Math.max(...xs) - Math.min(...xs);
  let targetRectHeight = Math.max(...ys) - Math.min(...ys);

  const blurRadius = Math.floor(
    (targetRectWidth + targetRectHeight) / BLUR_COEFFICIENT
  );
  targetMarginX -= blurRadius;
  targetMarginY -= blurRadius;
  targetRectWidth += 2 * blurRadius;
  targetRectHeight += 2 * blurRadius;

  const srcContext = getSrcContext(srcImg, targetRectWidth, targetRectHeight);
  if (!srcContext) {
    return false;
  }
  const srcData = srcContext.getImageData(
    blurRadius,
    blurRadius,
    targetRectWidth - 2 * blurRadius,
    targetRectHeight - 2 * blurRadiu
  ).data;

  const intermediateCanvas = document.createElement("canvas");
  intermediateCanvas.width = targetRectWidth;
  intermediateCanvas.height = targetRectHeight;
  const intermediateContext = intermediateCanvas.getContext("2d");
  const intermediateRect = intermediateContext.getImageData(
    0, 0, targetRectWidth, targetRectHeight
  );
  const intermediateRectData = intermediateRect.data;

  for (let y = 0; y < targetRectHeight - 2 * blurRadius; y++) {
    for (let x = 0; x < targetRectWidth - 2 * blurRadius; x++) {
      const point = getPoint(x, y, targetRectWidth - 2 * blurRadius);

      const targetX = Math.round(
        (targetTopOffset +
          targetTopWidth * x / (targetRectWidth - 2 * blurRadius))
        * (1 - y / (targetRectHeight - 2 * blurRadius))
        + (targetBottomOffset +
          targetBottomWidth * x / (targetRectWidth - 2 * blurRadius))
        * (y / (targetRectHeight - 2 * blurRadius))
      );

      const targetY = Math.round(
        (targetLeftOffset +
          targetLeftHeight * y / (targetRectHeight - 2 * blurRadius))
        * (1 - x / (targetRectWidth - 2 * blurRadius))
        + (targetRightOffset +
          targetRightHeight * y / (targetRectHeight - 2 * blurRadius))
        * (x / (targetRectWidth - 2 * blurRadius))
      );

      const targetPoint = getPoint(
        targetX + blurRadius, targetY + blurRadius, targetRectWidth
      );

      for (let i = 0; i < 4; i++) {
        intermediateRectData[targetPoint + i] = srcData[point + i];
      }
    }
  }
  blur(intermediateRect, targetRectWidth, targetRectHeight, blurRadius);

  const targetRect = targetContext.getImageData(
    targetMarginX, targetMarginY, targetRectWidth, targetRectHeight
  );
  combine(
    intermediateRectData, targetRect.data, targetRectWidth, targetRectHeight
  );
  targetContext.putImageData(targetRect, targetMarginX, targetMarginY);
  return true;
};

const getCornersAndMargins = (context, width, height) => {
  const imageData = context.getImageData(0, 0, width, height).data;
  const points = imageData.reduce((a, p, i, ps) => {
    if (i % 4 === 1 && ps[i - 1] === 0 && ps[i + 1] === 0 && p === 255) {
      const ii = (i - 1) / 4;
      a.push([ii % width, Math.floor(ii / width)])
    }
    return a;
  }, []);
  if (points.length !== 4) {
    throw new Error("There should be exactly 4 rgb(0, 255, 0) points.");
  }
  const pointsAscending = [...points]
    .sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
  let [topLeft, bottomRight] = [
    pointsAscending[0],
    pointsAscending[3],
  ];
  let [topRight, bottomLeft] = [
    [...points].find(p => p[0] > topLeft[0] && p[1] < bottomRight[1]),
    [...points].find(p => p[0] < bottomRight[0] && p[1] > topLeft[1]),
  ];

  const targetMarginX = Math.min(
    ...[topLeft, bottomLeft, topRight, bottomRight].map(p => p[0])
  );
  const targetMarginY = Math.min(
    ...[topLeft, bottomLeft, topRight, bottomRight].map(p => p[1])
  );

  const targetPoints = [topLeft, topRight, bottomLeft, bottomRight].map(p =>
    p.map((c, i) =>
      c - (i % 2 === 0 ? targetMarginX : targetMarginY)
    )
  );
  return [targetPoints, targetMarginX, targetMarginY];
};

const getSrcContext = (srcImg, targetWidth, targetHeight) => {
  const rotate = (srcImg.naturalWidth > srcImg.naturalHeight)
    !== (targetWidth > targetHeight);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (rotate) {
    context.translate(targetWidth / 2, targetHeight / 2);
    context.rotate(-0.5 * Math.PI);
    context.translate(-targetHeight / 2, -targetWidth / 2);
    context.drawImage(srcImg, 0, 0, targetHeight, targetWidth);
    context.translate(targetHeight / 2, targetWidth / 2);
    context.rotate(0.5 * Math.PI);
    context.translate(-targetWidth / 2, -targetHeight / 2);
  } else {
    context.drawImage(srcImg, 0, 0, targetWidth, targetHeight);
  }

  return context;
};

const BLUR_COEFFICIENT = 100;
const blur = (rect, width, height, blurRadius) => {
  blurEdges(rect.data, width, height, blurRadius);
};
const blurEdges = (data, width, height, blurRadius) => {
  const args = {
    data,
    width,
    height,
    blurRadius,
    fromX: 0,
    fromY: 0,
  };
  blurFirstLine({ ...args, toX: width, toY: height, rotate: 0 });
  blurFirstLine({ ...args, toX: height, toY: width, rotate: 1 });
  blurFirstLine({ ...args, toX: width, toY: height, rotate: 2 });
  blurFirstLine({ ...args, toX: height, toY: width, rotate: 3 });
}
const blurFirstLine = (args) => {
  const { data, width, height, blurRadius, rotate } = args;
  let { toLeft = null } = args;
  const line = findFirstLine(args);
  if (!line?.length) {
    return;
  }
  const leftX = line[0][0],
    rightX = line[line.length - 1][0],
    nextY = line[0][1] + 1;
  const newArgs = {
    fromY: nextY,
    toY: nextY + 1,
    toLeft,
  };
  const leftArgs = {
    ...args,
    ...newArgs,
    toX: leftX,
  };
  const rightArgs = {
    ...args,
    ...newArgs,
    fromX: rightX + 1,
  };
  if (toLeft === null) {
    const left = findFirstLine({ ...leftArgs });
    const right = findFirstLine({ ...rightArgs  });
    toLeft = left.length === 0 && right.length === 0
      ? null
      : left.length >= right.length;
  }
  if (!toLeft) {
    line.reverse();
  }
  line.forEach(([x, y], i) => {
    data[getPoint(x, y, width, height, rotate) + 3] = (i / line.length) * 255;
  });
  if (toLeft === null) {
    return;
  } if (toLeft) {
    blurFirstLine({ ...leftArgs });
  } else {
    blurFirstLine({ ...rightArgs });
  }
};

const findFirstLine = ({
  data, width, height, fromX, fromY, toX, toY, rotate
}) => {
  const line = [];
  for (let y = fromY; y < toY; y++) {
    for (let x = fromX; x < toX; x++) {
      const point = getPoint(x, y, width, height, rotate);
      if (data[point + 3] > 0) {
        line.push([x, y]);
      } else if (line.length > 0) {
        return line;
      }
    }
  }
  return line;
};

const combine = (srcData, targetData, width, height) => {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const point = getPoint(x, y, width);
      const srcA = srcData[point + 3];
      const normalizedSrcA = srcA / 255;
      for (let i = point; i < (point + 3); i++) {
        targetData[i] = srcData[i] * normalizedSrcA + targetData[i] * (1 - normalizedSrcA);
      }
    }
  }
};

const getPoint = (x, y, w, h, rotate = 0) =>
  rotate === 0 ? (y * w + x) * 4 :
  rotate === 1 ? ((x + 1) * w - (y + 1)) * 4 :
  rotate === 2 ? ((h - y - 1) * w + (w - x - 1)) * 4 :
  rotate === 3 && ((h - x - 1) * w + y) * 4;

export default draw;