package com.taskmanagement.service;

import com.taskmanagement.dto.response.ActivityLogDTO;

import java.util.List;

public interface ActivityLogService {
    List<ActivityLogDTO> getRecentActivities(int limit);
    List<ActivityLogDTO> getActivitiesByTaskId(Integer taskId);
    ActivityLogDTO createActivityLog(Integer taskId, Integer userId, String actionType, String oldValue, String newValue, String description);
}

