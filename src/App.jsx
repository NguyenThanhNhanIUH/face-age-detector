import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

// Cấu hình constants
const CONFIG = {
  MODEL_URL: '/models',
  DETECTION: {
    INPUT_SIZE: 416,
    SCORE_THRESHOLD: 0.4,
    MAX_TRACKING_DISTANCE: 200,
  },
  SMOOTHING: {
    AGE_WEIGHT_NEW: 0.1,
    AGE_WEIGHT_OLD: 0.9,
    GENDER_HISTORY_SIZE: 10,
    GENDER_HIGH_CONFIDENCE: 0.85,
    GENDER_MEDIUM_CONFIDENCE: 0.75,
  },
  COLORS: {
    MALE: '#6366f1',
    FEMALE: '#ec4899',
  },
  LABEL: {
    FONT: '16px sans-serif',
    TEXT_HEIGHT: 20,
    PADDING: 5,
  },
};

// Hàm tìm khuôn mặt khớp từ frame trước
const findMatchingFace = (currentBox, previousDetections, maxDistance) => {
  const centerX = currentBox.x + currentBox.width / 2;
  const centerY = currentBox.y + currentBox.height / 2;

  let minDist = Infinity;
  let match = null;

  previousDetections.forEach(prev => {
    const prevBox = prev.detection.box;
    const prevX = prevBox.x + prevBox.width / 2;
    const prevY = prevBox.y + prevBox.height / 2;
    const dist = Math.hypot(centerX - prevX, centerY - prevY);

    if (dist < maxDistance && dist < minDist) {
      minDist = dist;
      match = prev;
    }
  });

  return match;
};

// Hàm làm mượt tuổi
const smoothAge = (currentAge, previousAge) => {
  return previousAge * CONFIG.SMOOTHING.AGE_WEIGHT_OLD +
    currentAge * CONFIG.SMOOTHING.AGE_WEIGHT_NEW;
};

// Hàm làm mượt giới tính với voting system
const smoothGender = (currentGender, genderProbability, previousGender, genderHistory) => {
  const updatedHistory = [...(genderHistory || []), currentGender];

  // Giữ tối đa số frame theo cấu hình
  if (updatedHistory.length > CONFIG.SMOOTHING.GENDER_HISTORY_SIZE) {
    updatedHistory.shift();
  }

  // Đếm phiếu
  const maleVotes = updatedHistory.filter(g => g === 'male').length;
  const femaleVotes = updatedHistory.filter(g => g === 'female').length;

  let smoothedGender = currentGender;

  // Logic quyết định giới tính
  if (genderProbability > CONFIG.SMOOTHING.GENDER_HIGH_CONFIDENCE) {
    smoothedGender = currentGender;
  } else if (genderProbability > CONFIG.SMOOTHING.GENDER_MEDIUM_CONFIDENCE) {
    const hasVoteMajority =
      (currentGender === 'male' && maleVotes > femaleVotes) ||
      (currentGender === 'female' && femaleVotes > maleVotes);
    smoothedGender = hasVoteMajority ? currentGender : previousGender;
  } else {
    smoothedGender = previousGender;
  }

  return { smoothedGender, updatedHistory };
};

// Hàm vẽ detection lên canvas
const drawDetection = (ctx, box, age, gender, canvasWidth) => {
  const genderText = gender === 'male' ? 'Nam' : 'Nữ';
  const label = `${Math.round(age)} tuổi - ${genderText}`;
  const color = CONFIG.COLORS[gender.toUpperCase()];

  // Lật tọa độ X để khớp với video mirror
  const flippedX = canvasWidth - box.x - box.width;

  // Vẽ khung
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(flippedX, box.y, box.width, box.height);

  // Vẽ nền nhãn
  ctx.font = CONFIG.LABEL.FONT;
  const textWidth = ctx.measureText(label).width;
  const { TEXT_HEIGHT, PADDING } = CONFIG.LABEL;

  ctx.fillStyle = color;
  ctx.fillRect(
    flippedX,
    box.y - TEXT_HEIGHT - PADDING,
    textWidth + PADDING * 2,
    TEXT_HEIGHT + PADDING
  );

  // Vẽ chữ
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, flippedX + PADDING, box.y - PADDING);
};

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isVideoStarted, setIsVideoStarted] = useState(false);
  const [error, setError] = useState(null);

  // Tải AI models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(CONFIG.MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(CONFIG.MODEL_URL),
        ]);
        setIsModelLoaded(true);
      } catch (err) {
        console.error("Lỗi tải models:", err);
        setError("Không thể tải AI models. Vui lòng kiểm tra thư mục public/models.");
      }
    };

    loadModels();
  }, []);

  // Bật camera
  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: {} })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Lỗi truy cập webcam:", err);
        setError("Không thể truy cập camera. Vui lòng cho phép quyền camera.");
      });
  };

  // Xử lý khi video bắt đầu phát
  const handleVideoPlay = () => {
    setIsVideoStarted(true);
    let animationFrameId;
    let isDetecting = false;
    let lastDetections = [];

    const detect = async () => {
      if (videoRef.current && canvasRef.current && isModelLoaded && !isDetecting) {
        isDetecting = true;

        try {
          const displaySize = {
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight,
          };

          // Đồng bộ kích thước canvas với video
          if (canvasRef.current.width !== displaySize.width ||
            canvasRef.current.height !== displaySize.height) {
            faceapi.matchDimensions(canvasRef.current, displaySize);
          }

          // Phát hiện khuôn mặt
          const detections = await faceapi
            .detectAllFaces(
              videoRef.current,
              new faceapi.TinyFaceDetectorOptions({
                inputSize: CONFIG.DETECTION.INPUT_SIZE,
                scoreThreshold: CONFIG.DETECTION.SCORE_THRESHOLD,
              })
            )
            .withFaceLandmarks()
            .withAgeAndGender();

          const resizedDetections = faceapi.resizeResults(detections, displaySize);

          // Xóa canvas
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const currentDetections = [];

          // Xử lý từng khuôn mặt
          resizedDetections.forEach(detection => {
            const { age, gender, genderProbability } = detection;
            const box = detection.detection.box;

            let smoothedAge = age;
            let smoothedGender = gender;
            let genderHistory = [gender];

            // Tìm khuôn mặt tương ứng từ frame trước
            const match = findMatchingFace(
              box,
              lastDetections,
              CONFIG.DETECTION.MAX_TRACKING_DISTANCE
            );

            if (match) {
              // Làm mượt tuổi
              smoothedAge = smoothAge(age, match.smoothedAge);

              // Làm mượt giới tính
              const result = smoothGender(
                gender,
                genderProbability,
                match.smoothedGender,
                match.genderHistory
              );
              smoothedGender = result.smoothedGender;
              genderHistory = result.updatedHistory;
            }

            // Lưu thông tin đã làm mượt
            detection.smoothedAge = smoothedAge;
            detection.smoothedGender = smoothedGender;
            detection.genderHistory = genderHistory;
            currentDetections.push(detection);

            // Vẽ lên canvas
            drawDetection(ctx, box, smoothedAge, smoothedGender, canvas.width);
          });

          lastDetections = currentDetections;

        } catch (error) {
          console.error("Lỗi phát hiện:", error);
        } finally {
          isDetecting = false;
        }
      }

      animationFrameId = requestAnimationFrame(detect);
    };

    detect();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  };

  return (
    <div className="container">
      <header>
        <h1>AI Face & Age Detector</h1>
        <p className="subtitle">Nhận diện tuổi và giới tính</p>
      </header>

      <div className="camera-container">
        {!isModelLoaded && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <div className="status-text">Đang tải AI Models...</div>
          </div>
        )}

        {error && (
          <div className="loading-overlay" style={{ background: 'rgba(220, 38, 38, 0.9)' }}>
            <div className="status-text">{error}</div>
          </div>
        )}

        <video ref={videoRef} autoPlay muted onPlay={handleVideoPlay} />
        <canvas ref={canvasRef} />
      </div>

      <div className="controls">
        <button
          onClick={startVideo}
          disabled={!isModelLoaded || isVideoStarted}
        >
          {isVideoStarted ? 'Camera Đang Hoạt Động' : 'Bật Camera'}
        </button>
      </div>

      {!isModelLoaded && !error && (
        <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
          Đang tải models...
        </p>
      )}
    </div>
  );
}

export default App;
