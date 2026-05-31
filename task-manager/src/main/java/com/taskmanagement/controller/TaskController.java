package com.taskmanagement.controller;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.taskmanagement.config.SecurityUtils;
import com.taskmanagement.dto.request.CreateTaskRequest;
import com.taskmanagement.dto.request.TaskSearchCriteria;
import com.taskmanagement.dto.request.UpdateTaskRequest;
import com.taskmanagement.dto.response.PagedResponse;
import com.taskmanagement.dto.response.TaskDTO;
import com.taskmanagement.dto.response.TaskSimpleDTO;
import com.taskmanagement.service.CsvExportService;
import com.taskmanagement.service.TaskService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
@Tag(name = "Tasks", description = "Create, read, update, search and export tasks")
public class TaskController {

    private final TaskService taskService;
    private final CsvExportService csvExportService;

    @Operation(summary = "List all active tasks (Kanban board)")
    @GetMapping
    public List<TaskSimpleDTO> getAllTasks() {
        return taskService.getAllActiveTasks();
    }

    @Operation(summary = "Search/filter tasks with pagination")
    @GetMapping("/search")
    public PagedResponse<TaskSimpleDTO> search(@ModelAttribute TaskSearchCriteria criteria) {
        return taskService.searchTasks(criteria);
    }

    @Operation(summary = "Export filtered tasks as CSV")
    @GetMapping("/export")
    public ResponseEntity<byte[]> export(@ModelAttribute TaskSearchCriteria criteria,
                                         @RequestParam(defaultValue = "csv") String format) {
        byte[] body = csvExportService.exportTasks(criteria);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=tasks_export.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(body);
    }

    @Operation(summary = "Get tasks currently in trash")
    @GetMapping("/trash")
    public List<TaskSimpleDTO> getDeletedTasks() {
        return taskService.getDeletedTasks();
    }

    @Operation(summary = "Get tasks by status")
    @GetMapping("/by-status/{status}")
    public List<TaskSimpleDTO> getTasksByStatus(@PathVariable String status) {
        return taskService.getTasksByStatus(status);
    }

    @Operation(summary = "Get a single task with full details")
    @GetMapping("/{id}")
    public ResponseEntity<TaskDTO> getTaskById(@PathVariable Integer id) {
        return taskService.getTaskById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Create a new task (ADMIN or GROUP_LEADER)")
    @PostMapping
    public ResponseEntity<TaskDTO> createTask(@Valid @RequestBody CreateTaskRequest request) {
        if (request.getCreatedById() == null) {
            SecurityUtils.currentUserId().ifPresent(request::setCreatedById);
        }
        return ResponseEntity.ok(taskService.createTask(request));
    }

    @Operation(summary = "Update a task")
    @PutMapping("/{id}")
    public ResponseEntity<TaskDTO> updateTask(@PathVariable Integer id,
                                              @RequestBody UpdateTaskRequest request) {
        if (request.getUserId() == null) {
            SecurityUtils.currentUserId().ifPresent(request::setUserId);
        }
        return taskService.updateTask(id, request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Soft-delete a task (move to trash) (ADMIN or GROUP_LEADER)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Integer id) {
        boolean deleted = taskService.softDeleteTask(id);
        return deleted ? ResponseEntity.ok().build() : ResponseEntity.notFound().build();
    }

    @Operation(summary = "Restore a task from trash")
    @PutMapping("/{id}/restore")
    public ResponseEntity<TaskDTO> restoreTask(@PathVariable Integer id) {
        return taskService.restoreTask(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
