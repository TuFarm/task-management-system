package com.taskmanagement.controller;

import com.taskmanagement.dto.response.ActivityLogDTO;
import com.taskmanagement.service.ActivityLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/activities")
@RequiredArgsConstructor
@Tag(name = "Activity Log", description = "Recent activity feed")
public class ActivityLogController {

    private final ActivityLogService activityLogService;

    @Operation(summary = "Get the most recent activity log entries")
    @GetMapping("/recent")
    public List<ActivityLogDTO> getRecentActivities(
            @RequestParam(defaultValue = "10") int limit) {
        return activityLogService.getRecentActivities(limit);
    }

    @Operation(summary = "Get activity for a specific task")
    @GetMapping("/task/{taskId}")
    public List<ActivityLogDTO> getActivitiesByTaskId(@PathVariable Integer taskId) {
        return activityLogService.getActivitiesByTaskId(taskId);
    }
}
