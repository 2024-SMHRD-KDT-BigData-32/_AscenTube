package com.cm.astb;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching; // 캐싱 활성화 import 추가
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableCaching // 캐싱 기능 활성화 어노테이션 추가
public class AscenTubeApplication {

	public static void main(String[] args) {
		SpringApplication.run(AscenTubeApplication.class, args);
	}

}