package com.taskmanagement.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class CreateTaskRequest {

    @NotBlank
    @Size(max = 200)
    private String title;

    @Size(max = 2000)
    private String description;

    private String status = "PENDING";
    private String priority = "MEDIUM";
    private LocalDate startDate;

    @NotNull
    private LocalDate dueDate;

    private Integer categoryId;
    private Integer createdById;
    private List<Integer> assigneeIds;
}
