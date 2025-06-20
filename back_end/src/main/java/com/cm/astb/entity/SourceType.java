package com.cm.astb.entity;

import java.util.Arrays;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

public enum SourceType {
    USER("USER"),
    SYSTEM("SYSTEM");

    private final String dbValue;

    SourceType(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    @Converter(autoApply = true)
    public static class SourceTypeConverter implements AttributeConverter<SourceType, String> {
        @Override
        public String convertToDatabaseColumn(SourceType sourceType) {
            return sourceType != null ? sourceType.getDbValue() : null;
        }

        @Override
        public SourceType convertToEntityAttribute(String dbData) {
            return Arrays.stream(SourceType.values())
                    .filter(type -> type.getDbValue().equals(dbData))
                    .findFirst()
                    .orElse(null);
        }
    }
}