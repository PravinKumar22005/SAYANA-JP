#!/usr/bin/env python3
"""Extract MediaPipe Holistic landmarks for the Node sign-controller bridge."""

import base64
import json
import os
import sys
from typing import Any, Dict, List, Optional

import cv2  # pylint: disable=no-member
import numpy as np

try:
    if os.name == "nt" and os.environ.get("SIGN_DISABLE_XNNPACK", "1") == "1":
        # XNNPACK frequently crashes on some Windows CPUs; prefer pure CPU path.
        os.environ.setdefault("DISABLE_XNNPACK", "1")
    import mediapipe as mp
except ImportError:
    mp = None

if mp is not None:
    mp_holistic = mp.solutions.holistic
    POSE = mp_holistic.PoseLandmark
else:
    mp_holistic = None
    POSE = None

FACE_NOSE = 1
FACE_MOUTH_LEFT = 61
FACE_MOUTH_RIGHT = 291
FACE_CHIN = 152
FACE_FOREHEAD = 10


def _decode_image(image_base64: str) -> np.ndarray:
    try:
        data = base64.b64decode(image_base64)
    except Exception as exc:
        raise ValueError("Failed to decode base64 image payload") from exc

    array = np.frombuffer(data, dtype=np.uint8)

    # These members DO exist at runtime; pylint is wrong due to bad cv2 stubs
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)  # pylint: disable=no-member
    if image is None:
        raise ValueError("Unable to decode image bytes via OpenCV")

    return image


def _to_point(landmark: Any) -> Dict[str, float]:
    return {
        "x": round(float(getattr(landmark, "x", 0.0)), 6),
        "y": round(float(getattr(landmark, "y", 0.0)), 6),
        "z": round(float(getattr(landmark, "z", 0.0)), 6),
    }


def _landmark_list_to_points(landmarks: Optional[Any]) -> List[Dict[str, float]]:
    if not landmarks:
        return []
    return [_to_point(lm) for lm in landmarks.landmark]


def _point_from_list(
    landmarks: Optional[Any], index: int
) -> Optional[Dict[str, float]]:
    if not landmarks or index >= len(landmarks.landmark):
        return None
    return _to_point(landmarks.landmark[index])


def _average_points(
    points: List[Optional[Dict[str, float]]],
) -> Optional[Dict[str, float]]:
    valid = [p for p in points if p]
    if not valid:
        return None
    count = len(valid)
    return {
        "x": round(sum(p["x"] for p in valid) / count, 6),
        "y": round(sum(p["y"] for p in valid) / count, 6),
        "z": round(sum(p["z"] for p in valid) / count, 6),
    }


def _build_pose_summary(results: Any) -> Dict[str, Optional[Dict[str, float]]]:
    if POSE is None:
        return {}
    pose = results.pose_landmarks
    if not pose:
        return {}
    left_shoulder = _point_from_list(pose, POSE.LEFT_SHOULDER.value)
    right_shoulder = _point_from_list(pose, POSE.RIGHT_SHOULDER.value)
    chest = _average_points([left_shoulder, right_shoulder])
    return {
        "leftShoulder": left_shoulder,
        "rightShoulder": right_shoulder,
        "chest": chest,
        "shoulderCenter": chest,
    }


def _build_face_summary(results: Any) -> Dict[str, Optional[Dict[str, float]]]:
    face = results.face_landmarks
    if not face:
        return {}
    mouth = _average_points(
        [
            _point_from_list(face, FACE_MOUTH_LEFT),
            _point_from_list(face, FACE_MOUTH_RIGHT),
        ]
    )
    return {
        "nose": _point_from_list(face, FACE_NOSE),
        "mouth": mouth,
        "chin": _point_from_list(face, FACE_CHIN),
        "forehead": _point_from_list(face, FACE_FOREHEAD),
    }


_HOLISTIC_INSTANCE: Optional["mp.solutions.holistic.Holistic"] = None


def _get_holistic() -> Optional["mp.solutions.holistic.Holistic"]:
    global _HOLISTIC_INSTANCE  # pylint: disable=global-statement
    if mp_holistic is None:
        return None
    if _HOLISTIC_INSTANCE is None:
        _HOLISTIC_INSTANCE = mp_holistic.Holistic(
            static_image_mode=True,
            model_complexity=int(os.environ.get("SIGN_HOLISTIC_COMPLEXITY", 1)),
            refine_face_landmarks=True,
            enable_segmentation=False,
            smooth_landmarks=True,
        )
    return _HOLISTIC_INSTANCE


def _process(image_base64: str) -> Dict[str, Any]:
    holistic = _get_holistic()
    if holistic is None:
        return {
            "leftHand": [],
            "rightHand": [],
            "pose": {},
            "face": {},
        }

    image_bgr = _decode_image(image_base64)

    # These members DO exist at runtime; pylint is wrong due to bad cv2 stubs
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)  # pylint: disable=no-member

    results = holistic.process(image_rgb)

    return {
        "leftHand": _landmark_list_to_points(results.left_hand_landmarks),
        "rightHand": _landmark_list_to_points(results.right_hand_landmarks),
        "pose": _build_pose_summary(results),
        "face": _build_face_summary(results),
    }


def _serve_forever() -> None:
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
            image_base64 = payload.get("image_base64")
            if not image_base64:
                raise ValueError("image_base64 is required")
            output = _process(image_base64)
            sys.stdout.write(json.dumps(output, separators=(",", ":")) + "\n")
            sys.stdout.flush()
        except Exception as exc:  # pylint: disable=broad-except
            sys.stdout.write(json.dumps({"error": str(exc)}) + "\n")
            sys.stdout.flush()


def main() -> None:
    payload_raw = sys.stdin.read()
    if not payload_raw:
        raise ValueError("Missing stdin payload")

    payload = json.loads(payload_raw)
    image_base64 = payload.get("image_base64")
    if not image_base64:
        raise ValueError("image_base64 is required")

    output = _process(image_base64)
    sys.stdout.write(json.dumps(output, separators=(",", ":")))


if __name__ == "__main__":
    try:
        if os.environ.get("HOLISTIC_SERVER") == "1":
            _serve_forever()
        else:
            main()
    except Exception as exc:  # pylint: disable=broad-except
        sys.stderr.write(f"{exc}\n")
        sys.exit(1)
