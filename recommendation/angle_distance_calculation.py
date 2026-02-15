import cv2
import numpy as np
import mediapipe as mp

mp_drawing=mp.solutions.drawing_utils
mp_hands=mp.solutions.hands

def get_angle(a,b,c):
    ba=a-b
    bc=c-b
    cos=np.dot(ba,bc)/(np.linalg.norm(ba)*np.linalg.norm(bc))
    return np.degrees(np.arccos(cos))

def get_distance(p1,p2):
    return np.linalg.norm(p1-p2)

cap=cv2.VideoCapture(0)

angles=None

with mp_hands.Hands(min_detection_confidence=0.8,min_tracking_confidence=0.5,max_num_hands=1) as hands:
    while cap.isOpened():
        ret,frame=cap.read()
        image=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB)  #opencv:BGR and mediapipe:RBG
        image.flags.writeable=False  # drawing and altering is not allowed while inferencing
        results=hands.process(image)
        image.flags.writeable=True
        image=cv2.cvtColor(image,cv2.COLOR_RGB2BGR)

        if results.multi_hand_landmarks:
            hand=results.multi_hand_landmarks[0]  #we have set max_num_hands=1
            mp_drawing.draw_landmarks(
                image,
                hand,
                mp_hands.HAND_CONNECTIONS,
                mp_drawing.DrawingSpec(color=(25,25,255),circle_radius=2,thickness=2),
                mp_drawing.DrawingSpec(color=(0,255,0))
            )

            lm=hand.landmark

            index_angle=get_angle(
                np.array([lm[5].x,lm[5].y,lm[5].z]),
                np.array([lm[6].x,lm[6].y,lm[6].z]),
                np.array([lm[8].x,lm[8].y,lm[8].z])
            )

            middle_angle=get_angle(
                np.array([lm[9].x,lm[9].y,lm[9].z]),
                np.array([lm[10].x,lm[10].y,lm[10].z]),
                np.array([lm[12].x,lm[12].y,lm[12].z])
            )

            ring_angle=get_angle(
                np.array([lm[13].x,lm[13].y,lm[13].z]),
                np.array([lm[14].x,lm[14].y,lm[14].z]),
                np.array([lm[16].x,lm[16].y,lm[16].z])
            )

            pinky_angle=get_angle(
                np.array([lm[17].x,lm[17].y,lm[17].z]),
                np.array([lm[18].x,lm[18].y,lm[18].z]),
                np.array([lm[20].x,lm[20].y,lm[20].z])
            )

            thumb_tip=np.array([lm[4].x,lm[4].y,lm[4].z])
            index_mcp=np.array([lm[5].x,lm[5].y,lm[5].z])
            thumb_dist=get_distance(thumb_tip,index_mcp)   # (thumb tip to index MCP)

            key=cv2.waitKey(10)&0xFF # Wait for a key press for up to 10ms, then mask the result to get the ASCII character code.
            if key==ord('c'):
                angles={
                    "index":int(index_angle),
                    "middle":int(middle_angle),
                    "ring":int(ring_angle),
                    "pinky":int(pinky_angle),
                    "thumb":round(thumb_dist,3)
                }
                print("Captured values:",angles)

        if angles:
            cv2.putText(image,f"Index: {angles['index']}",(30,40),
                        cv2.FONT_HERSHEY_SIMPLEX,0.8,(0,255,0),2)
            cv2.putText(image,f"Middle: {angles['middle']}",(30,75),
                        cv2.FONT_HERSHEY_SIMPLEX,0.8,(0,255,0),2)
            cv2.putText(image,f"Ring: {angles['ring']}",(30,110),
                        cv2.FONT_HERSHEY_SIMPLEX,0.8,(0,255,0),2)
            cv2.putText(image,f"Pinky: {angles['pinky']}",(30,145),
                        cv2.FONT_HERSHEY_SIMPLEX,0.8,(0,255,0),2)
            cv2.putText(image,f"ThumbDist: {angles['thumb']}",(30,180),
                        cv2.FONT_HERSHEY_SIMPLEX,0.8,(0,255,0),2)

        cv2.imshow("Hand Geometry ",image)
        if cv2.waitKey(10)&0xFF==ord('q'): #quit
            break

cap.release()
cv2.destroyAllWindows()
