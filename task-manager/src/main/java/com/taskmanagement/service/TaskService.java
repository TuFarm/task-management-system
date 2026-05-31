package com.taskmanagement.service;

import java.util.List;
import java.util.Optional;

import com.taskmanagement.dto.request.CreateTaskRequest;
import com.taskmanagement.dto.request.TaskSearchCriteria;
import com.taskmanagement.dto.request.UpdateTaskRequest;
import com.taskmanagement.dto.response.PagedResponse;
import com.taskmanagement.dto.response.TaskDTO;
import com.taskmanagement.dto.response.TaskSimpleDTO;

public interface TaskService {
    List<TaskSimpleDTO> getAllActiveTasks();
    Optional<TaskDTO> getTaskById(Integer id);
    TaskDTO createTask(CreateTaskRequest request);
    Optional<TaskDTO> updateTask(Integer id, UpdateTaskRequest request);
    boolean softDeleteTask(Integer id);
    List<TaskSimpleDTO> getDeletedTasks();
    Optional<TaskDTO> restoreTask(Integer id);
    List<TaskSimpleDTO> getTasksByStatus(String status);
    PagedResponse<TaskSimpleDTO> searchTasks(TaskSearchCriteria criteria);
    List<TaskSimpleDTO> searchAll(TaskSearchCriteria criteria);
}

