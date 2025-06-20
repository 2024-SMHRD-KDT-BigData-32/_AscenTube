package com.cm.astb.entity;

import java.util.Arrays;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

public enum DeviceType {
	MOBILE("MOBILE"),
    DESKTOP("DESKTOP"),
    TABLET("TABLET"),
    TV("TV"),
    GAME_CONSOLE("GAME_CONSOLE"),
    UNKNOWN("UNKNOWN");
	
	private final String dbValue;

    DeviceType(String dbValue) {
        this.dbValue = dbValue;
    }

    public String getDbValue() {
        return dbValue;
    }

    @Converter(autoApply = true)
    public static class DeviceTypeConverter implements AttributeConverter<DeviceType, String> {
        @Override
        public String convertToDatabaseColumn(DeviceType deviceType) {
            return deviceType != null ? deviceType.getDbValue() : null;
        }

        @Override
        public DeviceType convertToEntityAttribute(String dbData) {
            return Arrays.stream(DeviceType.values())
                    .filter(deviceType -> deviceType.getDbValue().equals(dbData))
                    .findFirst()
                    .orElse(UNKNOWN);
        }
    }

    public static DeviceType fromDbValue(String dbData) {
        return Arrays.stream(DeviceType.values())
                     .filter(deviceType -> deviceType.getDbValue().equals(dbData))
                     .findFirst()
                     .orElse(UNKNOWN);
    }
	
}
