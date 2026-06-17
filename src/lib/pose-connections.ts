// MediaPipe PoseLandmarker outputs 33 normalized landmarks.
// Indices reference: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker

export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const

export type LandmarkIndex = (typeof POSE_LANDMARKS)[keyof typeof POSE_LANDMARKS]

export interface LandmarkConnection {
  start: number
  end: number
}

// Skeleton bone connections grouped by body part for color coding.
export const POSE_CONNECTIONS: Record<string, LandmarkConnection[]> = {
  torso: [
    { start: 11, end: 12 }, // shoulders
    { start: 11, end: 23 }, // left rib
    { start: 12, end: 24 }, // right rib
    { start: 23, end: 24 }, // hips
  ],
  leftArm: [
    { start: 11, end: 13 }, // shoulder -> elbow
    { start: 13, end: 15 }, // elbow -> wrist
  ],
  rightArm: [
    { start: 12, end: 14 },
    { start: 14, end: 16 },
  ],
  leftHand: [
    { start: 15, end: 17 },
    { start: 15, end: 19 },
    { start: 15, end: 21 },
    { start: 17, end: 19 },
    { start: 19, end: 21 },
  ],
  rightHand: [
    { start: 16, end: 18 },
    { start: 16, end: 20 },
    { start: 16, end: 22 },
    { start: 18, end: 20 },
    { start: 20, end: 22 },
  ],
  leftLeg: [
    { start: 23, end: 25 }, // hip -> knee
    { start: 25, end: 27 }, // knee -> ankle
  ],
  rightLeg: [
    { start: 24, end: 26 },
    { start: 26, end: 28 },
  ],
  leftFoot: [
    { start: 27, end: 29 },
    { start: 27, end: 31 },
    { start: 29, end: 31 },
  ],
  rightFoot: [
    { start: 28, end: 30 },
    { start: 28, end: 32 },
    { start: 30, end: 32 },
  ],
  face: [
    { start: 9, end: 10 },
  ],
}

// All connections flattened (for quick iteration / hit testing).
export const ALL_POSE_CONNECTIONS: LandmarkConnection[] = Object.values(
  POSE_CONNECTIONS,
).flat()

// Landmarks worth rendering as larger highlighted joints.
export const KEY_JOINTS: number[] = [
  POSE_LANDMARKS.LEFT_SHOULDER,
  POSE_LANDMARKS.RIGHT_SHOULDER,
  POSE_LANDMARKS.LEFT_ELBOW,
  POSE_LANDMARKS.RIGHT_ELBOW,
  POSE_LANDMARKS.LEFT_WRIST,
  POSE_LANDMARKS.RIGHT_WRIST,
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.LEFT_KNEE,
  POSE_LANDMARKS.RIGHT_KNEE,
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_ANKLE,
]

export const LANDMARK_LABELS: Record<number, string> = {
  11: "L Shoulder",
  12: "R Shoulder",
  13: "L Elbow",
  14: "R Elbow",
  15: "L Wrist",
  16: "R Wrist",
  23: "L Hip",
  24: "R Hip",
  25: "L Knee",
  26: "R Knee",
  27: "L Ankle",
  28: "R Ankle",
}
