// SecurityConfig.java (CORS 설정 강화)
package com.cm.astb.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.cm.astb.security.CustomUserDetailsService;
import com.cm.astb.security.JwtAuthenticationFilter;
import com.cm.astb.security.JwtFilter;
import com.cm.astb.security.JwtTokenProvider;
import com.cm.astb.security.OAuth2LoginSuccessHandler;
import com.cm.astb.service.UserService;

import lombok.RequiredArgsConstructor; 

@Configuration
@EnableWebSecurity
//@RequiredArgsConstructor
public class SecurityConfig {

   @Value("${chrome.extension.id}") 
   private String chromeExtensionId;
   
//    private final JwtFilter jwtFilter;
    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService customUserDetailsService;
    
   public SecurityConfig(
         /* JwtFilter jwtFilter, */ UserService userService, JwtTokenProvider jwtTokenProvider,
         CustomUserDetailsService customUserDetailsService) {
//      this.jwtFilter = jwtFilter;
      this.userService = userService;
      this.jwtTokenProvider = jwtTokenProvider;
      this.customUserDetailsService = customUserDetailsService;
   }

    @Bean
    public OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler() {
        return new OAuth2LoginSuccessHandler(userService, jwtTokenProvider);
    }

    // WebSecurityCustomizer: 특정 경로에 대해 Spring Security 필터 체인 무시
   @Bean
   public WebSecurityCustomizer webSecurityCustomizer() {
      return (web) -> web.ignoring()
            .requestMatchers("/oauth/**")
            .requestMatchers("/swagger-ui/**", "/v3/api-docs/**")
            .requestMatchers("/static/**", "/css/**", "/js/**", "/images/**", "/favicon.ico");
   }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() { 
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:3000", "chrome-extension://" + chromeExtensionId));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS")); 
        configuration.setAllowedHeaders(List.of("*")); 
        configuration.setAllowCredentials(true); 
        configuration.setMaxAge(3600L); 

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration); 
        return source;
    }
    
    @Bean
   public JwtAuthenticationFilter jwtAuthenticationFilter() {
      return new JwtAuthenticationFilter(jwtTokenProvider, customUserDetailsService);
   }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception { 
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource())) 
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/favicon.ico", "/error").permitAll()
                .requestMatchers("/api/public/**").permitAll()   // 공개 API 접근 허용
                .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                .requestMatchers("/AscenTube/oauth/google/login").permitAll()
                .requestMatchers("/AscenTube/oauth/oauth2callback").permitAll()
                .requestMatchers("/api/ascen/user/me/favorite-channels").authenticated()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .successHandler(oAuth2LoginSuccessHandler())
            )
            .formLogin(formLogin -> formLogin.disable())
            .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // 비밀번호 암호화 Bean
   @Bean
   public PasswordEncoder passwordEncoder() {
      return new BCryptPasswordEncoder();
   }
   
   @Bean
   public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
      return authenticationConfiguration.getAuthenticationManager();
   }

   

}
