package com.cm.astb.entity;

import java.util.Arrays;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

public enum AgeGroup {
	_13_17("13-17"),
    _18_24("18-24"),
    _25_34("25-34"),
    _35_44("35-44"),
    _45_54("45-54"),
    _55_64("55-64"),
    _65_PLUS("65+"),
    UNKNOWN_AGE("UNKNOWN");
	
	private final String dbValue;

    AgeGroup(String dbValue) {
        this.dbValue = dbValue;
    }
    
    public String getDbValue() {
        return dbValue;
    }
    
    @Converter(autoApply = true)
    public static class AgeGroupConverter implements AttributeConverter<AgeGroup, String> {
        @Override
        public String convertToDatabaseColumn(AgeGroup ageGroup) {
            return ageGroup != null ? ageGroup.getDbValue() : null;
        }

        @Override
        public AgeGroup convertToEntityAttribute(String dbData) {
            return Arrays.stream(AgeGroup.values())
                    .filter(ageGroup -> ageGroup.getDbValue().equals(dbData))
                    .findFirst()
                    .orElse(UNKNOWN_AGE);
        }
    }
}
