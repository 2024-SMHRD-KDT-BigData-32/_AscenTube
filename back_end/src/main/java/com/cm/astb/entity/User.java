package com.cm.astb.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@Entity
@Table(name = "TB_USER")
public class User {
    @Id
    @Column(name = "GOOGLE_ID", length = 100)
    private String googleId;

    @Column(name = "NICKNAME", length = 50)
    private String nickname;

    @Column(name = "EMAIL", length = 255)
    private String email;

    @Column(name = "PROFILE_IMG", length = 1000)
    private String profileImg;

    @Column(name = "JOINED_AT")
    @CreationTimestamp
    private LocalDateTime joinedAt;

    @Column(name = "UPDATED_AT")
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    @Column(name = "GOOGLE_REFRESH_TOKEN", length = 4000)
    private String googleRefreshToken;
    
    @Lob
    @Column(name = "GOOGLE_CREDENTIAL_JSON", columnDefinition = "LONGTEXT")
    private String googleCredentialJson;
    
    @Column(name = "MY_CHANNEL_ID", length = 100)
    private String myChannelId;
}
