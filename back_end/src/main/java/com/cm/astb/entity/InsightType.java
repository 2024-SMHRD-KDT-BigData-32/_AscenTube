package com.cm.astb.entity; // 적절한 패키지 경로로 변경

import java.util.Arrays;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

public enum InsightType {
    SUMMARY("SUMMARY"),
    SENTIMENT("SENTIMENT"),
    KEYWORD("KEYWORD");

    private final String dbValue;

    InsightType(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    @Converter(autoApply = true)
    public static class InsightTypeConverter implements AttributeConverter<InsightType, String> {
        @Override
        public String convertToDatabaseColumn(InsightType insightType) {
            return insightType != null ? insightType.getDbValue() : null;
        }

        @Override
        public InsightType convertToEntityAttribute(String dbData) {
            return Arrays.stream(InsightType.values())
                    .filter(type -> type.getDbValue().equals(dbData))
                    .findFirst()
                    .orElse(null);
        }
    }
}