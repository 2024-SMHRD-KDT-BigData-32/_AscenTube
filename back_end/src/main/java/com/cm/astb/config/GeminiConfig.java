package com.cm.astb.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * 애플리케이션의 전반적인 또는 범용적인 설정을 담당하는 클래스.
 * @Configuration 어노테이션을 통해 Spring 컨테이너에 설정 정보를 제공합니다.
 */
@Configuration
public class GeminiConfig {

    /**
     * RestTemplate을 Spring의 Bean으로 등록합니다.
     * 이 Bean은 프로젝트의 다른 컴포넌트에서 외부 API를 호출할 때 사용될 수 있습니다.
     * @return 새로운 RestTemplate 인스턴스
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}