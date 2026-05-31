package com.taskmanagement.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MemberStatDTO {
    private Integer userId;
    private String fullName;
    private long taskCount;
    private long doneCount;
}
