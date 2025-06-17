package com.cm.astb.entity;

import java.util.Arrays;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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
    
    public static AgeGroup fromDbValue(String dbData) {
        if (dbData == null) {
            LoggerFactory.getLogger(AgeGroup.class).debug("AgeGroup.fromDbValue: Received null dbData. Returning UNKNOWN_AGE.");
            return UNKNOWN_AGE;
        }
        
        String processedApiValue = dbData.trim(); 

        if (processedApiValue.startsWith("age") && processedApiValue.length() > 3) {
            processedApiValue = processedApiValue.substring(3); 
        }
        
        processedApiValue = processedApiValue.toUpperCase();

        if (processedApiValue.equals("65_")) { 
            processedApiValue = "65+";
        }
        if (processedApiValue.equals("UNKNOWN")) { 
            processedApiValue = "UNKNOWN";
        }

        // --- 수정 시작 ---
        // (1) 이 시점에서 processedApiValue와 각 enum 상수의 getDbValue()를 직접 비교합니다.
        //     이전 switch 문은 API의 'AGE_GROUP_XX_YY' 형태를 예상했는데, now processedApiValue is 'XX-YY'.
        //     따라서 switch를 제거하고 stream filter에 집중합니다.
        
        final String finalProcessedApiValue = processedApiValue;
        Optional<AgeGroup> foundAgeGroup = Arrays.stream(AgeGroup.values())
                .filter(ageGroup -> ageGroup.getDbValue().equals(finalProcessedApiValue)) // 정규화된 API 값과 DB 매핑 값 비교
                .findFirst();

        if (foundAgeGroup.isPresent()) {
            LoggerFactory.getLogger(AgeGroup.class).debug("AgeGroup.fromDbValue: Found match for API value '{}' (Normalized: '{}') -> {}.getDbValue(): '{}'", dbData, processedApiValue, foundAgeGroup.get(), foundAgeGroup.get().getDbValue());
            return foundAgeGroup.get();
        } else {
            LoggerFactory.getLogger(AgeGroup.class).warn("AgeGroup.fromDbValue: No exact match found for API value '{}' (Normalized: '{}'). Defaulting to UNKNOWN_AGE. DB value will be '{}'", dbData, processedApiValue, UNKNOWN_AGE.getDbValue());
            return UNKNOWN_AGE;
        }
    }
    @Converter(autoApply = true)
    public static class AgeGroupConverter implements AttributeConverter<AgeGroup, String> {
        private static final Logger logger = LoggerFactory.getLogger(AgeGroupConverter.class);

        @Override
        public String convertToDatabaseColumn(AgeGroup ageGroup) {
            String dbValue = (ageGroup != null ? ageGroup.getDbValue() : null);
            logger.debug("AgeGroupConverter.convertToDatabaseColumn: Converting enum '{}' to DB string '{}'", ageGroup, dbValue);
            return dbValue;
        }

        @Override
        public AgeGroup convertToEntityAttribute(String dbData) {
            if (dbData == null) {
                logger.debug("AgeGroupConverter.convertToEntityAttribute: Received null dbData. Returning UNKNOWN_AGE.");
                return UNKNOWN_AGE;
            }
            
            String processedApiValue = dbData.trim(); 

            if (processedApiValue.startsWith("age") && processedApiValue.length() > 3) {
                processedApiValue = processedApiValue.substring(3); 
            }
            
            processedApiValue = processedApiValue.toUpperCase();

            if (processedApiValue.equals("65_")) { 
                processedApiValue = "65+";
            }
            else if (processedApiValue.equals("UNKNOWN")) { 
                processedApiValue = "UNKNOWN";
            }
            else if (processedApiValue.equals("13-17")) {
                processedApiValue = "13-17";
            }
            else if (processedApiValue.equals("18-24")) {
                processedApiValue = "18-24";
            }
            else if (processedApiValue.equals("25-34")) {
                processedApiValue = "25-34";
            }
            else if (processedApiValue.equals("35-44")) {
                processedApiValue = "35-44";
            }
            else if (processedApiValue.equals("45-54")) {
                processedApiValue = "45-54";
            }
            else if (processedApiValue.equals("55-64")) {
                processedApiValue = "55-64";
            }
            // (7) 그 외 모든 경우는 UNKNOWN_AGE로 강제 변환
            else {
                logger.warn("AgeGroupConverter.convertToEntityAttribute: Unrecognized or non-matching AgeGroup API value '{}' (Normalized: '{}'). Defaulting to UNKNOWN_AGE.", dbData, processedApiValue);
                return UNKNOWN_AGE;
            }

            logger.debug("AgeGroupConverter.convertToEntityAttribute: Original dbData='{}', Final Processed='{}'", dbData, processedApiValue);
            
            final String processedApiValueFinal = processedApiValue;
            
            Optional<AgeGroup> foundAgeGroup = Arrays.stream(AgeGroup.values())
                    .filter(ageGroup -> ageGroup.getDbValue().equals(processedApiValueFinal)) 
                    .findFirst();

            if (foundAgeGroup.isPresent()) {
                logger.debug("AgeGroupConverter.convertToEntityAttribute: Found match for '{}' -> {}.getDbValue(): '{}'", processedApiValue, foundAgeGroup.get(), foundAgeGroup.get().getDbValue());
                return foundAgeGroup.get();
            } else {
                // 이 부분에 도달해서는 안됩니다. processedApiValue가 위의 else if 체인에서 UNKNOWN_AGE가 아닌 다른 값이었다면,
                // 반드시 여기서는 일치하는 AgeGroup을 찾아야 합니다.
                logger.error("AgeGroupConverter.convertToEntityAttribute: CRITICAL ERROR: Processed value '{}' did not find a matching enum constant. This indicates a logical error in fromDbValue or missing enum literal. Returning UNKNOWN_AGE.", processedApiValue);
                return UNKNOWN_AGE;
            }
        }
    }
}