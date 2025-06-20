# ml/predict.py

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pathlib import Path

# [수정] 모델의 예측값(0, 1)을 DB에 저장될 문자열로 올바르게 매핑합니다.
# 0 = 긍정(POSITIVE), 1 = 부정(NEGATIVE)
SENTIMENT_LABELS = {0: "POSITIVE", 1: "NEGATIVE"}

# 화행 분류도 DB ENUM 타입에 맞게 대문자로 통일합니다.
SPEECH_ACT_LABELS = {0: "INFO", 1: "QUESTION", 2: "EMOTION", 3: "CRITICISM", 4: "REQUEST", 5: "ETC"}

# --- 경로 설정 (이 부분을 수정합니다) ---
# predict.py -> ml -> crawling
CRAWLING_DIR = Path(__file__).resolve().parent.parent # 'crawling' 폴더

# crawling 폴더 바로 아래에 model 폴더가 있으므로 경로가 간단해집니다.
EMOTION_MODEL_DIR = CRAWLING_DIR / "model" / "emotion"
SPEECH_ACT_MODEL_DIR = CRAWLING_DIR / "model" / "speech_act"

class CommentClassifier:
    def __init__(self):
        # 사용 가능한 경우 GPU(cuda) 사용, 아니면 CPU
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {self.device}")

        try:
            # 감성 분석 모델 및 토크나이저 로드
            self.emotion_tokenizer = AutoTokenizer.from_pretrained(EMOTION_MODEL_DIR)
            self.emotion_model = AutoModelForSequenceClassification.from_pretrained(EMOTION_MODEL_DIR)
            self.emotion_model.to(self.device) # 모델을 해당 디바이스(CPU/GPU)로 이동
            self.emotion_model.eval() # 모델을 평가(추론) 모드로 설정

            # 화행 분류 모델 및 토크나이저 로드
            self.speech_act_tokenizer = AutoTokenizer.from_pretrained(SPEECH_ACT_MODEL_DIR)
            self.speech_act_model = AutoModelForSequenceClassification.from_pretrained(SPEECH_ACT_MODEL_DIR)
            self.speech_act_model.to(self.device) # 모델을 해당 디바이스(CPU/GPU)로 이동
            self.speech_act_model.eval() # 모델을 평가(추론) 모드로 설정

            print("Hugging Face 모델 및 토크나이저 로드가 완료되었습니다.")

        except Exception as e:
            print(f"모델 로딩 중 오류 발생: {e}")
            # 실제 운영 시에는 여기서 시스템을 종료하거나, 더 정교한 예외 처리가 필요합니다.
            self.emotion_model = None
            self.speech_act_model = None

    def predict(self, prefixed_content: str) -> dict:
        """하나의 댓글에 대해 감성과 화행을 모두 예측"""
        if not self.emotion_model or not self.speech_act_model:
            return {"sentiment": "EXCEPT", "speech_act": "EXCEPT"}
            
        with torch.no_grad(): # 추론 시에는 그래디언트 계산을 비활성화하여 속도를 높입니다.
            # 감성 예측
            emotion_inputs = self.emotion_tokenizer(prefixed_content, return_tensors="pt", truncation=True, padding=True, max_length=512).to(self.device)
            emotion_outputs = self.emotion_model(**emotion_inputs)
            emotion_pred_idx = torch.argmax(emotion_outputs.logits, dim=1).item()

            # 화행 예측
            speech_act_inputs = self.speech_act_tokenizer(prefixed_content, return_tensors="pt", truncation=True, padding=True, max_length=512).to(self.device)
            speech_act_outputs = self.speech_act_model(**speech_act_inputs)
            speech_act_pred_idx = torch.argmax(speech_act_outputs.logits, dim=1).item()

        return {
            "sentiment": SENTIMENT_LABELS.get(emotion_pred_idx, "EXCEPT"),
            "speech_act": SPEECH_ACT_LABELS.get(speech_act_pred_idx, "EXCEPT")
        }

# 앱 시작 시 한번만 모델을 로드하도록 CommentClassifier 인스턴스 생성
classifier = CommentClassifier()