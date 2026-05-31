package com.taskmanagement.dto.response;

import lombok.Data;
import lombok.Builder;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class TaskDTO {
    private Integer taskId;
    private String title;
    private String description;
    private String status;
    private String priority;
    private LocalDate startDate;
    private LocalDate dueDate;
    private String categoryName;
    private String createdByUsername;
    private List<String> assignedUsers;
    private List<String> tags;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

