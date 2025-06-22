package com.cm.astb.entity;

import java.util.Arrays;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

public enum SentimentType {
    POSITIVE("POSITIVE"),
    NEGATIVE("NEGATIVE"),
    EXCEPT("EXCEPT");
	
    private final String dbValue;

    SentimentType(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    @Converter(autoApply = true)
    public static class SentimentTypeConverter implements AttributeConverter<SentimentType, String> {
        @Override
        public String convertToDatabaseColumn(SentimentType sentimentType) {
            return sentimentType != null ? sentimentType.getDbValue() : null;
        }

        @Override
        public SentimentType convertToEntityAttribute(String dbData) {
            return Arrays.stream(SentimentType.values())
                    .filter(type -> type.getDbValue().equals(dbData))
                    .findFirst()
                    .orElse(null);
        }
    }
}