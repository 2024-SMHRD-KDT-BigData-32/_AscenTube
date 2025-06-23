package com.cm.astb.dto;

import com.cm.astb.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserLoginResultDto {
    private User user;
    private boolean isNewUser;
}