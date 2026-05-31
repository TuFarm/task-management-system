package com.taskmanagement.dto.response;

import lombok.Data;
import lombok.Builder;
import java.time.LocalDateTime;

@Data
@Builder
public class UserDTO {
    private Integer userId;
    private String username;
    private String fullName;
    private String email;
    private String role;
    private String status;
    private String avatarColor;
    private LocalDateTime createdAt;
}

