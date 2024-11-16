import { FaceMesh } from "@mediapipe/face_mesh";
import React, { useRef, useEffect, useCallback, useMemo } from "react";
import * as Facemesh from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import Webcam from "react-webcam";
import './App.css';
import eyeFilterImage from "./star.png"; // Replace with your PNG path

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const camera = useRef(null); // Use useRef instead of let variable

  // Memoize the eyeFilter initialization
  const eyeFilter = useMemo(() => {
    const img = new Image();
    img.src = eyeFilterImage;
    return img;
  }, []);

  // Helper function to calculate the center of the eye based on landmarks
  const getEyeCenter = (eyeLandmarks) => {
    const eyeX = eyeLandmarks.reduce((sum, landmark) => sum + landmark.x, 0) / eyeLandmarks.length;
    const eyeY = eyeLandmarks.reduce((sum, landmark) => sum + landmark.y, 0) / eyeLandmarks.length;
    return { x: eyeX, y: eyeY };
  };

  // Helper function to calculate eye size based on distance between landmarks
  const getEyeSize = (eyeLandmarks) => {
    const width = Math.sqrt(
      Math.pow(eyeLandmarks[3].x - eyeLandmarks[0].x, 2) +
      Math.pow(eyeLandmarks[3].y - eyeLandmarks[0].y, 2)
    );
    return width * canvasRef.current.width; // Scale it to canvas width
  };

  // Memoize onResults to avoid unnecessary re-creation
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
  }, [onResults]); // Add onResults as a dependency

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
          objectFit: "cover", // Ensures the video fills the screen while preserving the aspect ratio
          zIndex: 9,
          transform: "scaleX(-1)", // Flip the canvas horizontally
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
          objectFit: "cover", // Match the canvas size with the video
          zIndex: 10,
          transform: "scaleX(-1)", // Flip the canvas horizontally
        }}
      ></canvas>
    </div>
  );
}

export default App;
