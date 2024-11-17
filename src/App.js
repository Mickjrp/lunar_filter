import { FaceMesh } from "@mediapipe/face_mesh";
import React, { useRef, useEffect, useCallback, useMemo, useState } from "react";
import * as cam from "@mediapipe/camera_utils";
import Webcam from "react-webcam";
import "./App.css";
import grayFilter from "./assets/gray.png";
import darkBrownFilter from "./assets/dark_brown.png";
import brownFilter from "./assets/brown.png";

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const camera = useRef(null);

  // State to manage the current filter and opacity
  const [currentFilter, setCurrentFilter] = useState(grayFilter);
  const [opacity, setOpacity] = useState(0.4); // Default opacity

  // Memoized image object for the filter
  const eyeFilter = useMemo(() => {
    const img = new Image();
    img.src = currentFilter;
    return img;
  }, [currentFilter]);

  const onResults = useCallback(
    (results) => {
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const canvasElement = canvasRef.current;
      const canvasCtx = canvasElement.getContext("2d");
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

      if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
          // Pupil landmarks
          const leftPupil = landmarks[468];
          const rightPupil = landmarks[473];

          // Calculate filter size dynamically
          const leftIrisSize =
            Math.sqrt(
              Math.pow(landmarks[468].x - landmarks[469].x, 2) +
                Math.pow(landmarks[468].y - landmarks[469].y, 2)
            ) *
            canvasElement.width *
            2.4;

          const rightIrisSize =
            Math.sqrt(
              Math.pow(landmarks[473].x - landmarks[474].x, 2) +
                Math.pow(landmarks[473].y - landmarks[474].y, 2)
            ) *
            canvasElement.width *
            2.4;

          // Pupil positions
          const leftX = leftPupil.x * canvasElement.width;
          const leftY = leftPupil.y * canvasElement.height;
          const rightX = rightPupil.x * canvasElement.width;
          const rightY = rightPupil.y * canvasElement.height;

          // Draw filters
          canvasCtx.globalAlpha = opacity;
          canvasCtx.filter = "blur(1px)";

          canvasCtx.drawImage(
            eyeFilter,
            leftX - leftIrisSize / 2,
            leftY - leftIrisSize / 2,
            leftIrisSize,
            leftIrisSize
          );

          canvasCtx.drawImage(
            eyeFilter,
            rightX - rightIrisSize / 2,
            rightY - rightIrisSize / 2,
            rightIrisSize,
            rightIrisSize
          );

          canvasCtx.globalAlpha = 1;
          canvasCtx.filter = "none";
        }
      }
    },
    [eyeFilter, opacity]
  );

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);

    if (webcamRef.current) {
      camera.current = new cam.Camera(webcamRef.current.video, {
        onFrame: async () => {
          await faceMesh.send({ image: webcamRef.current.video });
        },
        width: 640,
        height: 480,
      });
      camera.current.start();
    }
  }, [onResults]);

  return (
    <div className="app-container">
      <Webcam
        ref={webcamRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 9,
          transform: "scaleX(-1)",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 10,
          transform: "scaleX(-1)",
        }}
      ></canvas>

      {/* Filter Buttons */}
      <div className="filter-buttons">
        <img
          src={grayFilter}
          alt="Gray Lens"
          onClick={() => setCurrentFilter(grayFilter)}
          className="filter-button-image"
        />
        <img
          src={darkBrownFilter}
          alt="Dark Brown Lens"
          onClick={() => setCurrentFilter(darkBrownFilter)}
          className="filter-button-image"
        />
        <img
          src={brownFilter}
          alt="Brown Lens"
          onClick={() => setCurrentFilter(brownFilter)}
          className="filter-button-image"
        />
      </div>

      {/* Opacity Slider */}
      <div className="slider-container">
        <label htmlFor="opacity-slider">Opacity</label>
        <input
          id="opacity-slider"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

export default App;
