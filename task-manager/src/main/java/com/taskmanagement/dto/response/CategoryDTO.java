package com.taskmanagement.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CategoryDTO {
    private Integer categoryId;
    private String name;
    private String color;
    private long taskCount;
}
