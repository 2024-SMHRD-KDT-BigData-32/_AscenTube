package com.cm.astb.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@RequiredArgsConstructor
@Entity
@Table(name = "TB_USER")
public class User {
    @Id
    @Column(name = "GOOGLE_ID", length = 100)
    @NonNull
    private String googleId;

    @Column(name = "NICKNAME", length = 50)
    @NonNull
    private String nickname;

    @Column(name = "EMAIL", length = 255)
    @NonNull
    private String email;

    @Column(name = "PROFILE_IMG", length = 1000)
    @NonNull
    private String profileImg;

    @Column(name = "JOINED_AT")
    @CreationTimestamp
    private LocalDateTime joinedAt;

    @Column(name = "UPDATED_AT")
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    @Column(name = "GOOGLE_REFRESH_TOKEN", length = 1000)
    private String googleRefreshToekn;
}
