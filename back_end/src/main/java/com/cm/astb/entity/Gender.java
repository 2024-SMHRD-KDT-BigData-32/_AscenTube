package com.cm.astb.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

public enum Gender {
	MALE, 
	FEMALE,
	UNKNOWN;

	@Converter(autoApply = true)
	public static class GenderConverter implements AttributeConverter<Gender, String> {

		@Override
		public String convertToDatabaseColumn(Gender gender) {
			return gender != null ? gender.name() : null;
		}

		@Override
		public Gender convertToEntityAttribute(String dbData) {
			return dbData != null ? Gender.valueOf(dbData) : null;
		}

	}
}
