package com.cm.astb.entity; // 적절한 패키지 경로로 변경 (MyChannel으로 명확하게)

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId; // @EmbeddedId 임포트
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "TB_MY_CHANNEL") // 테이블 명세서와 일치
public class MyChannel {

    @EmbeddedId
    private MyChannelId id;

    @CreationTimestamp
    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "UPDATED_AT", nullable = false)
    private LocalDateTime updatedAt;

}