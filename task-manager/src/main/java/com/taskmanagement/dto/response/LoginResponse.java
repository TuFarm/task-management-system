package com.taskmanagement.dto.response;

import lombok.Data;
import lombok.Builder;

@Data
@Builder
public class LoginResponse {
    private String token;
    @Builder.Default
    private String tokenType = "Bearer";
    private long expiresIn; // milliseconds until token expiry
    private UserDTO user;
}

