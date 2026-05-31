package com.taskmanagement.dto.response;

import lombok.Data;
import lombok.Builder;
import java.time.LocalDateTime;

@Data
@Builder
public class CommentDTO {
    private Integer commentId;
    private Integer taskId;
    private Integer userId;
    private String username;
    private String userFullName;
    private Integer parentCommentId;
    private String text;
    private String category;
    private LocalDateTime createdAt;
}

