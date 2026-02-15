import cv2
import numpy as np
import mediapipe as mp
import time

mp_drawing = mp.solutions.drawing_utils
mp_hands = mp.solutions.hands

def get_angle(a, b, c):
    ba = a - b
    bc = c - b
    cos = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
    return np.degrees(np.arccos(cos))

def get_distance(p1, p2):
    return np.linalg.norm(p1 - p2)

def in_range(val, low, high):
    return low <= val <= high


letter_ranges = {
    "A": {
        "index": (15,45),
        "middle": (10,40),
        "ring": (3,30),
        "pinky": (0,25),
        "thumb": (0.09,0.18),
        "thumb_dx": (0.025, 0.055)
    },
    "B": {
        "index": (170,180),
        "middle": (170,180),
        "ring": (170,180),
        "pinky": (170,180),
        "thumb": (0.05,0.07)
    },
    "C": {
        "index": (85,120),
        "middle": (70,110),
        "ring": (70,110),
        "pinky": (90,145),
        "thumb": (0.07,0.16),
        "ti_dist": (0.1, 0.3)
    },
    "D": {
        "index": (168,180),
        "middle": (30,55),
        "ring": (20,100),
        "pinky": (5,50),
        "thumb": (0.06,0.16)
    },
    "E": {
        "index": (28,50),
        "middle": (15,32),
        "ring": (5,28),
        "pinky": (10,36),
        "thumb": (0.06,0.095),
        "thumb_dx": (-0.11, -0.02)
    },
    "F": {
        "index": (58,160),
        "middle": (155,180),
        "ring": (155,180),
        "pinky": (155,180),
        "thumb": (0.07,0.125)
    },
    "G": {
        "index": (160,180),
        "middle": (0,60),
        "ring": (25,70),
        "pinky": (15,110),
        "thumb": (0.028,0.15),
        "dir": "horizontal"   
    },
    "H": {
    "index": (170,180),
    "middle": (165,180),
    "ring": (0,80),
    "pinky": (60,120),
    "thumb": (0.03,0.25),
    "dir": "horizontal",
    "im_dist": (0.01, 0.05) 
    },
    "I": {
    "index": (20, 45),
    "middle": (20, 50),
    "ring": (10, 45),
    "pinky": (165, 180),
    "thumb": (0.03, 0.08)
    },
    "K": {
    "index": (165, 180),
    "middle": (149, 180),
    "ring": (60, 125),
    "pinky": (40, 140),
    "thumb": (0.03, 0.12),
    "ti_dist": (0.11, 0.19),
    "tp_dist":(0.19,0.3)
    },
    "L": {
    "index": (170, 180),
    "middle": (45, 120),
    "ring": (40, 110),
    "pinky": (25, 80),
    "thumb": (0.085, 0.30)
    },
    "M": {
    "index": (40, 90),
    "middle": (30, 60),
    "ring": (20, 50),
    "thumb": (0.07, 0.18),
    "tm_dist": (0.01, 0.30),     
    "ti_dist": (0.04, 0.25),     
    "thumb_dx": (-0.12, 0.16),
    "tr_dist": (0.03, 0.155),    
    "tp_dist": (0.05, 0.30)   
},
    "N": {
    "index": (30, 85),
    "middle": (20, 70),
    "ring": (35, 125),
    "thumb": (0.10, 0.145),
    "tm_dist": (0.05, 0.16),
    "ti_dist": (0.07, 0.20),
    "thumb_dx": (-0.11, 0.08),
    "tp_dist": (0.15, 0.25),
    "tr_dist": (0.12, 0.25)
    },    
    "O": {
    "index": (75, 120),
    "middle": (70, 115),
    "ring": (70, 110),
    "pinky": (80, 140),
    "thumb": (0.09, 0.20),
    "ti_dist": (0.015, 0.085)
    },
    "P": {
    "index": (150, 168),
    "middle": (100, 170),
    "ring": (65, 100),
    "pinky": (52, 110),
    "thumb": (0.055, 0.09)
    },
    "Q": {
    "index": (125, 165),
    "middle": (50, 90),
    "ring": (40, 80),
    "pinky": (55, 90),
    "thumb": (0.15, 0.25)
    },
    "R": {
    "index": (160, 180),
    "middle": (160, 175),
    "ring": (20, 90),
    "pinky": (40, 110),
    "thumb": (0.085, 0.135),
    "im_dist": (0.035, 0.085)
    },
    "S": {
    "index": (15, 45),
    "middle": (10, 30),
    "ring": (0, 20),
    "thumb": (0.02, 0.10),
    "thumb_dx": (-0.075, -0.01),
    "tm_dist": (0.025, 0.07),
    "ti_dist": (0.03, 0.09),
    "tr_dist": (0.04, 0.12),
    "tp_dist": (0.07, 0.15)
     },
    "T": {
    "index": (35, 55),
    "middle": (48, 120),
    "ring": (45, 120),
    "thumb": (0.085, 0.14),
    "tm_dist": (0.19, 0.25),
    "ti_dist": (0.11, 0.16),
    "thumb_dx": (-0.07, -0.02),
    "tp_dist": (0.165, 0.25),
    "tr_dist": (0.18, 0.26)
    },
    "U": {
    "index": (170,180),
    "middle": (170,180),
    "ring": (45,105),
    "pinky": (55, 140),
    "thumb": (0.089, 0.15),
    "im_dist": (0.019, 0.04)
    },
    "V": {
    "index": (165,180),
    "middle": (165,180),
    "ring": (35,130),
    "pinky": (25, 145),
    "thumb": (0.06, 0.2),
    "im_dist": (0.06, 0.145)
    },
    "W": {
    "index": (170,180),
    "middle": (170,180),
    "ring": (170,180),
    "pinky": (28, 125),
    "thumb": (0.085, 0.17)
    },
    "X": {
    "index": (45,110),
    "middle": (50,110),
    "ring": (40,115),
    "pinky": (45, 115),
    "thumb": (0.06, 0.4)
    },
    "Y": {
    "index": (30,70),
    "middle": (35,85),
    "ring": (35, 80),
    "pinky": (160, 180),
    "thumb": (0.09, 0.145)
    }

}

FEEDBACK_MAP = {
    "index": {
        "low": "Straighten your index finger",
        "high": "Curl your index finger slightly"
    },
    "middle": {
        "low": "Straighten your middle finger",
        "high": "Curl your middle finger more"
    },
    "ring": {
        "low": "Straighten your ring finger",
        "high": "Curl your ring finger more"
    },
    "pinky": {
        "low": "Raise your pinky finger",
        "high": "Relax your pinky finger"
    },
    "thumb": {
        "low": "Move your thumb outward",
        "high": "Bring your thumb closer to the palm"
    },
    "thumb_dx": {
        "low": "Move your thumb left",
        "high": "Move your thumb right"
    },
    "ti_dist": {
        "low": "Increase distance between thumb and index finger",
        "high": "Bring thumb closer to index finger"
    },
    "tm_dist": {
        "low": "Bring thumb closer to middle finger",
        "high": "Move thumb away from middle finger"
    },
    "tr_dist": {
        "low": "Bring thumb closer to ring finger",
        "high": "Move thumb away from ring finger"
    },
    "tp_dist": {
        "low": "Bring thumb closer to pinky",
        "high": "Move thumb away from pinky"
    },
    "im_dist": {
        "low": "Separate index and middle fingers",
        "high": "Bring index and middle fingers together"
    }
}

def generate_feedback(target_letter, angles, letter_ranges):
    if target_letter not in letter_ranges:
        return []

    expected = letter_ranges[target_letter]
    feedback = []

    for param, (low, high) in expected.items():
        if param not in angles:
            continue

        val = angles[param]
        if val < low:
            feedback.append((param, "low"))
        elif val > high:
            feedback.append((param, "high"))

    return feedback

cap = cv2.VideoCapture(0)

angles = None
prediction = "Waiting..."
INTERVAL = 1
last_update_time = 0

with mp_hands.Hands(
    min_detection_confidence=0.8,
    min_tracking_confidence=0.5,
    max_num_hands=1
) as hands:

    while cap.isOpened():
        ret, frame = cap.read()
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        results = hands.process(image)
        image.flags.writeable = True
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

        if results.multi_hand_landmarks:
            hand = results.multi_hand_landmarks[0]
            mp_drawing.draw_landmarks(
                image,
                hand,
                mp_hands.HAND_CONNECTIONS,
                mp_drawing.DrawingSpec(color=(25,25,255), circle_radius=2, thickness=2),
                mp_drawing.DrawingSpec(color=(0,255,0))
            )

            current_time = time.time()
            if current_time - last_update_time >= INTERVAL:
                lm = hand.landmark

                index_angle = get_angle(
                    np.array([lm[5].x, lm[5].y, lm[5].z]),
                    np.array([lm[6].x, lm[6].y, lm[6].z]),
                    np.array([lm[8].x, lm[8].y, lm[8].z])
                )

                middle_angle = get_angle(
                    np.array([lm[9].x, lm[9].y, lm[9].z]),
                    np.array([lm[10].x, lm[10].y, lm[10].z]),
                    np.array([lm[12].x, lm[12].y, lm[12].z])
                )

                ring_angle = get_angle(
                    np.array([lm[13].x, lm[13].y, lm[13].z]),
                    np.array([lm[14].x, lm[14].y, lm[14].z]),
                    np.array([lm[16].x, lm[16].y, lm[16].z])
                )

                pinky_angle = get_angle(
                    np.array([lm[17].x, lm[17].y, lm[17].z]),
                    np.array([lm[18].x, lm[18].y, lm[18].z]),
                    np.array([lm[20].x, lm[20].y, lm[20].z])
                )

                thumb_tip = np.array([lm[4].x, lm[4].y, lm[4].z])
                index_tip = np.array([lm[8].x, lm[8].y, lm[8].z])
                index_mcp = np.array([lm[5].x, lm[5].y, lm[5].z])
                middle_tip = np.array([lm[12].x, lm[12].y, lm[12].z])
                pinky_tip=np.array([lm[20].x, lm[20].y, lm[20].z])
                ring_tip=np.array([lm[16].x, lm[16].y, lm[16].z])
                ti_dist = get_distance(thumb_tip, index_tip)
                tm_dist = get_distance(thumb_tip, middle_tip)
                tr_dist=get_distance(thumb_tip,ring_tip)
                im_dist=get_distance(middle_tip, index_tip)
                tp_dist=get_distance(thumb_tip, pinky_tip)
                thumb_dist = get_distance(thumb_tip, index_mcp)
                thumb_dx = lm[4].x - lm[5].x
                index_dx = lm[8].x - lm[5].x   #for distinguishing horizontal and vertical direction
                index_dy = lm[8].y - lm[5].y

                angles = {
                    "index": int(index_angle),
                    "middle": int(middle_angle),
                    "ring": int(ring_angle),
                    "pinky": int(pinky_angle),
                    "thumb": round(thumb_dist, 3),
                    "thumb_dx": round(thumb_dx, 3),
                    "im_dist": round(im_dist, 3),
                    "ti_dist":round(ti_dist, 3),
                    "tm_dist":round(tm_dist, 3),
                    "tp_dist":round(tp_dist, 3),
                    "tr_dist":round(tr_dist,3)
                }

                prediction = "Unknown"

                for letter, ranges in letter_ranges.items():
                    if all(
                        in_range(angles[k], *ranges[k])
                        for k in (ranges.keys() & angles.keys())
                    ):
                        if "dir" in ranges:
                            if ranges["dir"] == "horizontal" and abs(index_dx) < abs(index_dy):
                                continue
                        prediction = letter
                        break
                    
                TARGET_LETTER = 'I'  # later frontend will send this
                feedback_msgs = []
                feedback_items = generate_feedback(TARGET_LETTER, angles, letter_ranges)
                for param, kind in feedback_items: 
                        msg = FEEDBACK_MAP.get(param, {}).get(kind)
                        if msg:
                              feedback_msgs.append(msg)

                last_update_time = current_time

        if angles:
            cv2.putText(image, f"Index: {angles['index']}", (30,40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)
            cv2.putText(image, f"Middle: {angles['middle']}", (30,70),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)
            cv2.putText(image, f"Ring: {angles['ring']}", (30,100),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)
            cv2.putText(image, f"Pinky: {angles['pinky']}", (30,130),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)
            cv2.putText(image, f"Thumb: {angles['thumb']}", (30,160),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)
            cv2.putText(image, f"Prediction: {prediction}", (30,210),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255), 3)
            y_offset = 260
            line_gap = 30 
            for msg in feedback_msgs:
                  cv2.putText(
                        image,
                        f"Tip: {msg}",
                        (30, y_offset),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6,
                        (255, 0, 0),
                        2
                  )
                  y_offset += line_gap

        cv2.imshow("ASL Stable Sampling", image)
        if cv2.waitKey(10) & 0xFF == ord('q'):
            break

cap.release()
cv2.destroyAllWindows()
