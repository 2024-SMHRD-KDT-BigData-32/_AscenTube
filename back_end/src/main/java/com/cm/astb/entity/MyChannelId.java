package com.cm.astb.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Objects;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class MyChannelId implements Serializable {

    private static final long serialVersionUID = 1L;

    @Column(name = "GOOGLE_ID", length = 100, nullable = false)
    private String googleId;

    @Column(name = "CNL_ID", length = 100, nullable = false)
    private String channelId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        MyChannelId that = (MyChannelId) o;
        return Objects.equals(googleId, that.googleId) &&
               Objects.equals(channelId, that.channelId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(googleId, channelId);
    }
}