import { FaceMesh } from "@mediapipe/face_mesh";
import React, { useRef, useEffect } from "react";
import * as Facemesh from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import Webcam from "react-webcam";
import eyeFilterImage from "./star.png"; // Replace with your PNG path
import './App.css';


function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  let camera = null;

  const eyeFilter = new Image();
  eyeFilter.src = eyeFilterImage;

  // Helper function to calculate the center of the eye based on landmarks
  function getEyeCenter(eyeLandmarks) {
    const eyeX = eyeLandmarks.reduce((sum, landmark) => sum + landmark.x, 0) / eyeLandmarks.length;
    const eyeY = eyeLandmarks.reduce((sum, landmark) => sum + landmark.y, 0) / eyeLandmarks.length;
    return { x: eyeX, y: eyeY };
  }

  // Helper function to calculate eye size based on distance between landmarks
  function getEyeSize(eyeLandmarks) {
    const width = Math.sqrt(
      Math.pow(eyeLandmarks[3].x - eyeLandmarks[0].x, 2) +
      Math.pow(eyeLandmarks[3].y - eyeLandmarks[0].y, 2)
    );
    return width * canvasRef.current.width; // Scale it to canvas width
  }

  function onResults(results) {
    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;

    // Set canvas width and height
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext("2d");
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiFaceLandmarks) {
      for (const landmarks of results.multiFaceLandmarks) {
        // Get eye landmarks
        const leftEyeLandmarks = Facemesh.FACEMESH_LEFT_EYE.map(
          (index) => landmarks[index[0]]
        );
        const rightEyeLandmarks = Facemesh.FACEMESH_RIGHT_EYE.map(
          (index) => landmarks[index[0]]
        );

        // Calculate the center and size of each eye
        const leftEyeCenter = getEyeCenter(leftEyeLandmarks);
        const rightEyeCenter = getEyeCenter(rightEyeLandmarks);
        const leftEyeSize = getEyeSize(leftEyeLandmarks);
        const rightEyeSize = getEyeSize(rightEyeLandmarks);

        // Set transparency and slight blur for natural effect
        canvasCtx.globalAlpha = 0.8; // Slight transparency
        canvasCtx.filter = "blur(1px)"; // Slight blur for soft edges

        // Draw the lens filter on the left eye
        canvasCtx.drawImage(
          eyeFilter,
          leftEyeCenter.x * canvasElement.width - leftEyeSize / 2,
          leftEyeCenter.y * canvasElement.height - leftEyeSize / 2,
          leftEyeSize,
          leftEyeSize
        );

        // Draw the lens filter on the right eye
        canvasCtx.drawImage(
          eyeFilter,
          rightEyeCenter.x * canvasElement.width - rightEyeSize / 2,
          rightEyeCenter.y * canvasElement.height - rightEyeSize / 2,
          rightEyeSize,
          rightEyeSize
        );

        // Reset transparency and blur
        canvasCtx.globalAlpha = 1;
        canvasCtx.filter = "none";
      }
    }
  }

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
      camera = new cam.Camera(webcamRef.current.video, {
        onFrame: async () => {
          await faceMesh.send({ image: webcamRef.current.video });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }
  }, []);

  return (
    <div className="app-container">
      <Webcam
        ref={webcamRef}
        style={{
          position: "absolute",
          marginLeft: "auto",
          marginRight: "auto",
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: 9,
          width: 640,
          height: 480,
          transform: "scaleX(-1)", // Flip the canvas horizontally
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          marginLeft: "auto",
          marginRight: "auto",
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: 9,
          width: 640,
          height: 480,
          transform: "scaleX(-1)", // Flip the canvas horizontally
        }}
      ></canvas>
    </div>
  );    
}

export default App;
