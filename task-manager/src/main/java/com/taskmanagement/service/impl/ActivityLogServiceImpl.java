package com.taskmanagement.service.impl;

import com.taskmanagement.dto.response.ActivityLogDTO;
import com.taskmanagement.entity.ActivityLog;
import com.taskmanagement.repository.ActivityLogRepo;
import com.taskmanagement.repository.TaskRepo;
import com.taskmanagement.repository.UserRepo;
import com.taskmanagement.service.ActivityLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ActivityLogServiceImpl implements ActivityLogService {

    private final ActivityLogRepo activityLogRepository;
    private final TaskRepo taskRepository;
    private final UserRepo userRepository;

    @Override
    public List<ActivityLogDTO> getRecentActivities(int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return activityLogRepository.findAll(pageable)
                .getContent()
                .stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(limit)
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<ActivityLogDTO> getActivitiesByTaskId(Integer taskId) {
        return activityLogRepository.findByTask_TaskIdOrderByCreatedAtDesc(taskId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ActivityLogDTO createActivityLog(Integer taskId, Integer userId, String actionType, String oldValue, String newValue, String description) {
        ActivityLog activityLog = new ActivityLog();
        
        taskRepository.findById(taskId).ifPresent(activityLog::setTask);
        userRepository.findById(userId).ifPresent(activityLog::setUser);
        
        try {
            activityLog.setActionType(ActivityLog.ActionType.valueOf(actionType));
        } catch (IllegalArgumentException e) {
            activityLog.setActionType(ActivityLog.ActionType.UPDATED);
        }
        
        activityLog.setOldValue(oldValue);
        activityLog.setNewValue(newValue);
        activityLog.setDescription(description);
        
        ActivityLog saved = activityLogRepository.save(activityLog);
        return convertToDTO(saved);
    }

    private ActivityLogDTO convertToDTO(ActivityLog activityLog) {
        Integer taskId = activityLog.getTask() != null ? activityLog.getTask().getTaskId() : null;
        Integer userId = activityLog.getUser() != null ? activityLog.getUser().getUserId() : null;
        
        return ActivityLogDTO.builder()
                .activityId(activityLog.getActivityId())
                .taskId(taskId)
                .taskTitle(activityLog.getTask() != null ? activityLog.getTask().getTitle() : null)
                .userId(userId)
                .userFullName(activityLog.getUser() != null ? activityLog.getUser().getFullName() : null)
                .actionType(activityLog.getActionType() != null ? activityLog.getActionType().toString() : null)
                .oldValue(activityLog.getOldValue())
                .newValue(activityLog.getNewValue())
                .description(activityLog.getDescription())
                .createdAt(activityLog.getCreatedAt())
                .build();
    }
}

