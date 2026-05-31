package com.taskmanagement.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.Map;
import java.util.List;

@Data
@Builder
public class DashboardStatsDTO {
    private Map<String, Long> tasksByStatus;
    private Map<String, Long> tasksByPriority;
    private long overdueCount;
    private long dueTodayCount;
    private double completionRate;
    private List<MemberStatDTO> tasksByMember;
    private List<ActivityLogDTO> recentActivity;
}
