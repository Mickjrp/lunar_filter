import { FaceMesh } from "@mediapipe/face_mesh";
import React, { useRef, useEffect, useCallback, useMemo, useState } from "react";
import * as Facemesh from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import Webcam from "react-webcam";
import "./App.css";
import eyeFilterImage1 from "./star.png"; // Replace with your first PNG path
import eyeFilterImage2 from "./heart.png"; // Replace with your second PNG path
import eyeFilterImage3 from "./moon.png"; // Replace with your third PNG path

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const camera = useRef(null);

  // State to manage the current filter
  const [currentFilter, setCurrentFilter] = useState(eyeFilterImage1);

  // Memoize the eyeFilter initialization
  const eyeFilter = useMemo(() => {
    const img = new Image();
    img.src = currentFilter;
    return img;
  }, [currentFilter]);

  const getEyeCenter = (eyeLandmarks) => {
    const eyeX = eyeLandmarks.reduce((sum, landmark) => sum + landmark.x, 0) / eyeLandmarks.length;
    const eyeY = eyeLandmarks.reduce((sum, landmark) => sum + landmark.y, 0) / eyeLandmarks.length;
    return { x: eyeX, y: eyeY };
  };

  const getEyeSize = (eyeLandmarks) => {
    const width = Math.sqrt(
      Math.pow(eyeLandmarks[3].x - eyeLandmarks[0].x, 2) +
      Math.pow(eyeLandmarks[3].y - eyeLandmarks[0].y, 2)
    );
    return width * canvasRef.current.width;
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
          const leftEyeLandmarks = Facemesh.FACEMESH_LEFT_EYE.map((index) => landmarks[index[0]]);
          const rightEyeLandmarks = Facemesh.FACEMESH_RIGHT_EYE.map((index) => landmarks[index[0]]);
          const leftEyeCenter = getEyeCenter(leftEyeLandmarks);
          const rightEyeCenter = getEyeCenter(rightEyeLandmarks);
          const leftEyeSize = getEyeSize(leftEyeLandmarks);
          const rightEyeSize = getEyeSize(rightEyeLandmarks);

          canvasCtx.globalAlpha = 0.8;
          canvasCtx.filter = "blur(1px)";

          canvasCtx.drawImage(
            eyeFilter,
            leftEyeCenter.x * canvasElement.width - leftEyeSize / 2,
            leftEyeCenter.y * canvasElement.height - leftEyeSize / 2,
            leftEyeSize,
            leftEyeSize
          );

          canvasCtx.drawImage(
            eyeFilter,
            rightEyeCenter.x * canvasElement.width - rightEyeSize / 2,
            rightEyeCenter.y * canvasElement.height - rightEyeSize / 2,
            rightEyeSize,
            rightEyeSize
          );

          canvasCtx.globalAlpha = 1;
          canvasCtx.filter = "none";
        }
      }
    },
    [eyeFilter, webcamRef, canvasRef]
  );

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
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
            src={eyeFilterImage1}
            alt="Star Filter"
            onClick={() => setCurrentFilter(eyeFilterImage1)}
            className="filter-button-image"
          />
          <img
            src={eyeFilterImage2}
            alt="Heart Filter"
            onClick={() => setCurrentFilter(eyeFilterImage2)}
            className="filter-button-image"
          />
          <img
            src={eyeFilterImage3}
            alt="Circle Filter"
            onClick={() => setCurrentFilter(eyeFilterImage3)}
            className="filter-button-image"
          />
        </div>
    </div>
  );
}

export default App;
