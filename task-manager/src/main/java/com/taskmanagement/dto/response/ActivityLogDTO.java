package com.taskmanagement.dto.response;

import lombok.Data;
import lombok.Builder;
import java.time.LocalDateTime;

@Data
@Builder
public class ActivityLogDTO {
    private Integer activityId;
    private Integer taskId;
    private String taskTitle;
    private Integer userId;
    private String userFullName;
    private String actionType;
    private String oldValue;
    private String newValue;
    private String description;
    private LocalDateTime createdAt;
}

