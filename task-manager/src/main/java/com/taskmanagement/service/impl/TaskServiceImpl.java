package com.taskmanagement.service.impl;

import com.taskmanagement.dto.request.CreateTaskRequest;
import com.taskmanagement.dto.request.TaskSearchCriteria;
import com.taskmanagement.dto.request.UpdateTaskRequest;
import com.taskmanagement.dto.response.PagedResponse;
import com.taskmanagement.dto.response.TaskDTO;
import com.taskmanagement.dto.response.TaskSimpleDTO;
import com.taskmanagement.entity.ActivityLog;
import com.taskmanagement.entity.Tag;
import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.TaskAssignment;
import com.taskmanagement.entity.User;
import com.taskmanagement.repository.ActivityLogRepo;
import com.taskmanagement.repository.TaskAssignmentRepo;
import com.taskmanagement.repository.TagRepo;
import com.taskmanagement.repository.CategoryRepo;
import com.taskmanagement.repository.TaskRepo;
import com.taskmanagement.repository.UserRepo;
import com.taskmanagement.service.TaskService;
import com.taskmanagement.spec.TaskSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class TaskServiceImpl implements TaskService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> ALLOWED_SORTS = Set.of("createdAt", "dueDate", "priority", "title");

    private final TaskRepo taskRepository;
    private final UserRepo userRepository;
    private final CategoryRepo categoryRepository;
    private final ActivityLogRepo activityLogRepository;
    private final TaskAssignmentRepo taskAssignmentRepository;
    private final TagRepo tagRepository;

    @Override
    public List<TaskSimpleDTO> getAllActiveTasks() {
        return taskRepository.findAll().stream()
                .filter(task -> !task.isDeleted())
                .map(this::convertToSimpleDTO)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<TaskDTO> getTaskById(Integer id) {
        return taskRepository.findById(id).map(this::convertToFullDTO);
    }

    @Override
    @Transactional
    public TaskDTO createTask(CreateTaskRequest request) {
        validateDates(request.getStartDate(), request.getDueDate());
        Task task = new Task();
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setStatus(Task.TaskStatus.valueOf(request.getStatus()));
        task.setPriority(Task.TaskPriority.valueOf(request.getPriority()));
        task.setStartDate(request.getStartDate());
        task.setDueDate(request.getDueDate());
        task.setDeleted(false);

        if (request.getCategoryId() != null) {
            categoryRepository.findById(request.getCategoryId())
                    .ifPresent(task::setCategory);
        }

        userRepository.findById(request.getCreatedById())
                .ifPresent(task::setCreatedBy);

        // Save task first to get the ID
        Task savedTask = taskRepository.save(task);

        // Add task assignments if provided
        if (request.getAssigneeIds() != null && !request.getAssigneeIds().isEmpty()) {
            final Task finalTask = savedTask;
            request.getAssigneeIds().forEach(userId -> {
                userRepository.findById(userId).ifPresent(user -> {
                    TaskAssignment assignment = new TaskAssignment();
                    assignment.setTask(finalTask);
                    assignment.setUser(user);
                    finalTask.getTaskAssignments().add(assignment);
                });
            });
            savedTask = taskRepository.save(finalTask);
        }

        // Create activity log for task creation
        if (savedTask.getCreatedBy() != null) {
            ActivityLog activityLog = new ActivityLog();
            activityLog.setTask(savedTask);
            activityLog.setUser(savedTask.getCreatedBy());
            activityLog.setActionType(ActivityLog.ActionType.CREATED);
            activityLog.setDescription("Started on " + savedTask.getTitle());
            activityLog.setNewValue(savedTask.getStatus().toString());
            activityLogRepository.save(activityLog);
        }

        return convertToFullDTO(savedTask);
    }

    @Override
    @Transactional
    public Optional<TaskDTO> updateTask(Integer id, UpdateTaskRequest request) {
        return taskRepository.findById(id)
                .map(task -> {
                    // Store old status for activity log
                    Task.TaskStatus oldStatus = task.getStatus();
                    
                    if (request.getTitle() != null) task.setTitle(request.getTitle());
                    if (request.getDescription() != null) task.setDescription(request.getDescription());
                    if (request.getStatus() != null) task.setStatus(Task.TaskStatus.valueOf(request.getStatus()));
                    if (request.getPriority() != null) task.setPriority(Task.TaskPriority.valueOf(request.getPriority()));
                    if (request.getStartDate() != null) task.setStartDate(request.getStartDate());
                    if (request.getDueDate() != null) task.setDueDate(request.getDueDate());
                    
                    // Update category if provided
                    if (request.getCategoryId() != null) {
                        categoryRepository.findById(request.getCategoryId())
                                .ifPresent(task::setCategory);
                    }
                    
                    // Update task assignments if provided
                    if (request.getAssigneeIds() != null) {
                        // Hard-delete existing rows directly — avoids Hibernate
                        // orphanRemoval ordering issue (INSERT before DELETE on same unique key)
                        taskAssignmentRepository.deleteByTaskId(task.getTaskId());
                        taskAssignmentRepository.flush();
                        task.getTaskAssignments().clear();

                        // Add new assignments
                        request.getAssigneeIds().forEach(userId -> {
                            userRepository.findById(userId).ifPresent(user -> {
                                TaskAssignment assignment = new TaskAssignment();
                                assignment.setTask(task);
                                assignment.setUser(user);
                                task.getTaskAssignments().add(assignment);
                            });
                        });
                    }
                    
                    // Update tags if provided
                    if (request.getTagIds() != null) {
                        Set<Tag> newTags = new HashSet<>();
                        request.getTagIds().forEach(tagId ->
                            tagRepository.findById(tagId).ifPresent(newTags::add)
                        );
                        task.setTags(newTags);
                    }

                    validateDates(task.getStartDate(), task.getDueDate());
                    Task savedTask = taskRepository.save(task);

                    // Get user for activity log from request, fallback to createdBy or first assignee
                    User activityUser = null;
                    if (request.getUserId() != null) {
                        activityUser = userRepository.findById(request.getUserId()).orElse(null);
                    }
                    if (activityUser == null) {
                        activityUser = savedTask.getCreatedBy();
                    }
                    if (activityUser == null && !savedTask.getTaskAssignments().isEmpty()) {
                        activityUser = savedTask.getTaskAssignments().iterator().next().getUser();
                    }
                    
                    // Create activity log for status change
                    if (request.getStatus() != null && !oldStatus.toString().equals(request.getStatus())) {
                        if (activityUser != null) {
                            ActivityLog activityLog = new ActivityLog();
                            activityLog.setTask(savedTask);
                            activityLog.setUser(activityUser);
                            activityLog.setActionType(ActivityLog.ActionType.STATUS_CHANGED);
                            activityLog.setOldValue(oldStatus.toString());
                            activityLog.setNewValue(savedTask.getStatus().toString());
                            activityLog.setDescription("updated status to " + savedTask.getTitle());
                            activityLogRepository.save(activityLog);
                        }
                    }
                    
                    // Create activity log for general update (if status didn't change)
                    else if (request.getStatus() == null || oldStatus.toString().equals(request.getStatus())) {
                        if (activityUser != null) {
                            ActivityLog activityLog = new ActivityLog();
                            activityLog.setTask(savedTask);
                            activityLog.setUser(activityUser);
                            activityLog.setActionType(ActivityLog.ActionType.UPDATED);
                            activityLog.setDescription("updated " + savedTask.getTitle());
                            activityLogRepository.save(activityLog);
                        }
                    }
                    
                    return convertToFullDTO(savedTask);
                });
    }

    @Override
    @Transactional
    public boolean softDeleteTask(Integer id) {
        return taskRepository.findById(id)
                .map(task -> {
                    task.setDeleted(true);
                    task.setDeletedAt(LocalDateTime.now());
                    Task savedTask = taskRepository.save(task);
                    
                    // Create activity log for deletion
                    var activityUser = savedTask.getCreatedBy();
                    if (activityUser == null && !savedTask.getTaskAssignments().isEmpty()) {
                        activityUser = savedTask.getTaskAssignments().iterator().next().getUser();
                    }
                    
                    if (activityUser != null) {
                        ActivityLog activityLog = new ActivityLog();
                        activityLog.setTask(savedTask);
                        activityLog.setUser(activityUser);
                        activityLog.setActionType(ActivityLog.ActionType.DELETED);
                        activityLog.setDescription("deleted " + savedTask.getTitle());
                        activityLogRepository.save(activityLog);
                    }
                    
                    return true;
                })
                .orElse(false);
    }

    @Override
    public List<TaskSimpleDTO> getDeletedTasks() {
        return taskRepository.findAll().stream()
                .filter(Task::isDeleted)
                .map(this::convertToSimpleDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public Optional<TaskDTO> restoreTask(Integer id) {
        return taskRepository.findById(id)
                .map(task -> {
                    task.setDeleted(false);
                    task.setDeletedAt(null);
                    Task savedTask = taskRepository.save(task);
                    
                    // Create activity log for restoration
                    var activityUser = savedTask.getCreatedBy();
                    if (activityUser == null && !savedTask.getTaskAssignments().isEmpty()) {
                        activityUser = savedTask.getTaskAssignments().iterator().next().getUser();
                    }
                    
                    if (activityUser != null) {
                        ActivityLog activityLog = new ActivityLog();
                        activityLog.setTask(savedTask);
                        activityLog.setUser(activityUser);
                        activityLog.setActionType(ActivityLog.ActionType.RESTORED);
                        activityLog.setDescription("restored " + savedTask.getTitle());
                        activityLogRepository.save(activityLog);
                    }
                    
                    return convertToFullDTO(savedTask);
                });
    }

    @Override
    public List<TaskSimpleDTO> getTasksByStatus(String status) {
        Task.TaskStatus taskStatus = Task.TaskStatus.valueOf(status.toUpperCase());
        return taskRepository.findAll().stream()
                .filter(task -> !task.isDeleted() && task.getStatus() == taskStatus)
                .map(this::convertToSimpleDTO)
                .collect(Collectors.toList());
    }

    @Override
    public PagedResponse<TaskSimpleDTO> searchTasks(TaskSearchCriteria criteria) {
        Pageable pageable = buildPageable(criteria);
        var page = taskRepository.findAll(
                TaskSpecification.build(criteria, LocalDate.now()), pageable);
        return PagedResponse.from(page, this::convertToSimpleDTO);
    }

    @Override
    public List<TaskSimpleDTO> searchAll(TaskSearchCriteria criteria) {
        Sort sort = buildSort(criteria);
        return taskRepository.findAll(TaskSpecification.build(criteria, LocalDate.now()), sort)
                .stream()
                .map(this::convertToSimpleDTO)
                .collect(Collectors.toList());
    }

    private Pageable buildPageable(TaskSearchCriteria criteria) {
        int page = Math.max(0, criteria.getPage());
        int size = criteria.getSize() <= 0 ? 20 : Math.min(criteria.getSize(), MAX_PAGE_SIZE);
        return PageRequest.of(page, size, buildSort(criteria));
    }

    private Sort buildSort(TaskSearchCriteria criteria) {
        String sortBy = ALLOWED_SORTS.contains(criteria.getSortBy()) ? criteria.getSortBy() : "createdAt";
        Sort.Direction dir = "asc".equalsIgnoreCase(criteria.getSortDir())
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(dir, sortBy);
    }

    /** Cross-field rule: startDate must be on or before dueDate. */
    private void validateDates(LocalDate startDate, LocalDate dueDate) {
        if (startDate != null && dueDate != null && startDate.isAfter(dueDate)) {
            throw new IllegalArgumentException("startDate must be before or equal to dueDate");
        }
    }

    private TaskSimpleDTO convertToSimpleDTO(Task task) {
        List<String> tagNames = task.getTags().stream()
                .map(tag -> tag.getName())
                .collect(Collectors.toList());
        List<Integer> assigneeIds = task.getTaskAssignments().stream()
                .map(assignment -> assignment.getUser().getUserId())
                .collect(Collectors.toList());
        List<String> assigneeNames = task.getTaskAssignments().stream()
                .map(assignment -> assignment.getUser().getFullName())
                .collect(Collectors.toList());

        return TaskSimpleDTO.builder()
                .taskId(task.getTaskId())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus().toString())
                .priority(task.getPriority().toString())
                .startDate(task.getStartDate())
                .dueDate(task.getDueDate())
                .categoryName(task.getCategory() != null ? task.getCategory().getName() : null)
                .createdByUsername(task.getCreatedBy() != null ? task.getCreatedBy().getUsername() : null)
                .assigneeCount(assigneeIds.size())
                .assigneeIds(assigneeIds)
                .assigneeNames(assigneeNames)
                .tags(tagNames)
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }

    private TaskDTO convertToFullDTO(Task task) {
        return TaskDTO.builder()
                .taskId(task.getTaskId())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus().toString())
                .priority(task.getPriority().toString())
                .startDate(task.getStartDate())
                .dueDate(task.getDueDate())
                .categoryName(task.getCategory() != null ? task.getCategory().getName() : null)
                .createdByUsername(task.getCreatedBy() != null ? task.getCreatedBy().getUsername() : null)
                .assignedUsers(task.getTaskAssignments().stream()
                        .map(assignment -> assignment.getUser().getFullName())
                        .collect(Collectors.toList()))
                .tags(task.getTags().stream()
                        .map(tag -> tag.getName())
                        .collect(Collectors.toList()))
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }
}

