package com.taskmanagement.dto.request;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
public class CreateCommentRequest {
    // taskId is taken from the URL path; userId is taken from the JWT.
    private Integer taskId;
    private Integer userId;

    private Integer parentCommentId;

    @NotBlank
    @Size(max = 2000)
    private String text;

    private String category;
}
