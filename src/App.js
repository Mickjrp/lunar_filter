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

  // State to manage the current filter, opacity
  const [currentFilter, setCurrentFilter] = useState(grayFilter);
  const [opacity, setOpacity] = useState(0.4); // Default opacity
  const opacityRef = useRef(0.4); // Real-time opacity reference for smoother updates

  const eyeFilter = useMemo(() => {
    const img = new Image();
    img.src = currentFilter;
    return img;
  }, [currentFilter]);

  const handleOpacityChange = (e) => {
    const newOpacity = Number(e.target.value);
    opacityRef.current = newOpacity;
    setOpacity(newOpacity);
  };

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

          const leftX = leftPupil.x * canvasElement.width;
          const leftY = leftPupil.y * canvasElement.height;
          const rightX = rightPupil.x * canvasElement.width;
          const rightY = rightPupil.y * canvasElement.height;

          // Draw filters
          canvasCtx.globalAlpha = opacityRef.current; // Use reference for real-time updates
          canvasCtx.globalCompositeOperation = "screen"; // Apply multiply blend mode
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

          // Add realistic lip coloring
          // Define upper and lower lip landmarks

          const upperLipLandmarks = [
            61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 306, 308, 415, 310, 311, 312, 13, 82 ,81, 80, 191, 78, 62, 61  // Upper lip
          ];

          const lowerLipLandmarks = [
            61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 62, 61 // Lower lip
          ];

          // Function to draw a section of the lip
          function drawLipSection(landmarks, indices, color) {
            canvasCtx.globalCompositeOperation = "multiply"; // Apply multiply blend mode
            canvasCtx.beginPath();
            indices.forEach((index, i) => {
              const landmark = landmarks[index];
              const x = landmark.x * canvasElement.width;
              const y = landmark.y * canvasElement.height;

              if (i === 0) {
                canvasCtx.moveTo(x, y);
              } else {
                canvasCtx.lineTo(x, y);
              }
            });

            canvasCtx.closePath();
            canvasCtx.fillStyle = color;
            canvasCtx.fill();
          }

          // Draw upper and lower lips
          drawLipSection(
            landmarks,
            upperLipLandmarks,
            "rgba(252, 165, 252, 0.5)" // Solid color for upper lip
          );
          drawLipSection(
            landmarks,
            lowerLipLandmarks,
            "rgba(252, 165, 252, 0.5)" // Solid color for lower lip
          );
        }
      }
    },
    [eyeFilter]
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

      <div className="slider-container">
        <label htmlFor="opacity-slider">Opacity</label>
        <input
          id="opacity-slider"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={opacity}
          onChange={handleOpacityChange}
        />
      </div>
    </div>
  );
}

export default App;
