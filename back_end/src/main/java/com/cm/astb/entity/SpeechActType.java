package com.cm.astb.entity;

public enum SpeechActType {
    INFO,       // 정보
    QUESTION,   // 질문
    EMOTION,    // 감정
    CRITICISM,  // 비판
    REQUEST,    // 요청
    ETC,        // 기타
    EXCEPT;      // 예외 (분석 불가 등)
    
    private final String dbValue;

    SpeechActType() {
        this.dbValue = this.name();
    }
    SpeechActType(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }
}