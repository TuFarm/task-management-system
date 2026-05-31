package com.taskmanagement.dto.request;

import lombok.Data;

import java.time.LocalDate;

/** Holds all task search/filter parameters bound from query string. */
@Data
public class TaskSearchCriteria {
    private String keyword;       // searches title + description
    private String status;        // PENDING | TO_DO | IN_PROGRESS | DONE
    private String priority;      // LOW | MEDIUM | HIGH | URGENT
    private Integer categoryId;
    private Integer assigneeId;
    private LocalDate dueDateFrom;
    private LocalDate dueDateTo;
    private Integer createdBy;
    private Boolean isOverdue;

    private int page = 0;
    private int size = 20;
    private String sortBy = "createdAt";  // createdAt | dueDate | priority | title
    private String sortDir = "desc";      // asc | desc
}
