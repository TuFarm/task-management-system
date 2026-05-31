package com.taskmanagement.dto.request;

import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class UpdateTaskRequest {
    private String title;
    private String description;
    private String status;
    private String priority;
    private LocalDate startDate;
    private LocalDate dueDate;
    private Integer categoryId;
    private List<Integer> assigneeIds;
    private Integer userId; // User who is performing the update
}

