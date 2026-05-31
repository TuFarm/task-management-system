package com.taskmanagement.service;

import com.taskmanagement.config.SecurityUtils;
import com.taskmanagement.dto.response.AttachmentDTO;
import com.taskmanagement.entity.ActivityLog;
import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.TaskAttachment;
import com.taskmanagement.entity.User;
import com.taskmanagement.exception.ResourceNotFoundException;
import com.taskmanagement.repository.ActivityLogRepo;
import com.taskmanagement.repository.TaskAttachmentRepo;
import com.taskmanagement.repository.TaskRepo;
import com.taskmanagement.repository.UserRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class AttachmentService {

    private static final long MAX_SIZE = 10L * 1024 * 1024; // 10MB
    private static final Set<String> ALLOWED_EXT = Set.of("jpg", "jpeg", "png", "pdf", "docx", "xlsx");

    private final TaskAttachmentRepo attachmentRepository;
    private final TaskRepo taskRepository;
    private final UserRepo userRepository;
    private final ActivityLogRepo activityLogRepository;

    @Value("${app.upload.dir}")
    private String uploadDir;

    public List<AttachmentDTO> list(Integer taskId) {
        requireTask(taskId);
        return attachmentRepository.findByTask_TaskIdOrderByUploadedAtDesc(taskId)
                .stream().map(this::toDTO).toList();
    }

    @Transactional
    public AttachmentDTO upload(Integer taskId, MultipartFile file) {
        Task task = requireTask(taskId);
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new IllegalArgumentException("File exceeds the maximum allowed size (10MB)");
        }
        String original = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
        String ext = extensionOf(original);
        if (!ALLOWED_EXT.contains(ext)) {
            throw new IllegalArgumentException(
                    "File type ." + ext + " is not allowed. Allowed: jpg, png, pdf, docx, xlsx");
        }

        User uploader = currentUser();
        try {
            Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            String storedName = taskId + "_" + UUID.randomUUID() + "." + ext;
            Path target = dir.resolve(storedName);
            try (var in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }

            TaskAttachment attachment = new TaskAttachment();
            attachment.setTask(task);
            attachment.setFileName(original);
            attachment.setFilePath(target.toString());
            attachment.setFileSize(file.getSize());
            attachment.setMimeType(file.getContentType());
            attachment.setUploadedBy(uploader);
            TaskAttachment saved = attachmentRepository.save(attachment);

            logActivity(task, uploader, ActivityLog.ActionType.FILE_UPLOADED,
                    "Tải lên tệp: " + original);
            log.info("Attachment uploaded for task {}: {}", taskId, original);
            return toDTO(saved);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to store file: " + e.getMessage());
        }
    }

    @Transactional
    public void delete(Integer taskId, Integer attachmentId) {
        TaskAttachment attachment = requireAttachment(taskId, attachmentId);
        try {
            Files.deleteIfExists(Paths.get(attachment.getFilePath()));
        } catch (IOException e) {
            log.warn("Could not delete file {}: {}", attachment.getFilePath(), e.getMessage());
        }
        Task task = attachment.getTask();
        String name = attachment.getFileName();
        attachmentRepository.delete(attachment);
        logActivity(task, currentUser(), ActivityLog.ActionType.FILE_REMOVED, "Xoá tệp: " + name);
        log.info("Attachment {} deleted from task {}", attachmentId, taskId);
    }

    public DownloadFile loadForDownload(Integer taskId, Integer attachmentId) {
        TaskAttachment attachment = requireAttachment(taskId, attachmentId);
        try {
            Path path = Paths.get(attachment.getFilePath());
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResourceNotFoundException("File no longer available on the server");
            }
            String contentType = attachment.getMimeType() != null
                    ? attachment.getMimeType() : "application/octet-stream";
            return new DownloadFile(resource, attachment.getFileName(), contentType);
        } catch (MalformedURLException e) {
            throw new ResourceNotFoundException("File path is invalid");
        }
    }

    public record DownloadFile(Resource resource, String fileName, String contentType) {
    }

    // --- helpers ---

    private Task requireTask(Integer taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + taskId));
    }

    private TaskAttachment requireAttachment(Integer taskId, Integer attachmentId) {
        TaskAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found: " + attachmentId));
        if (attachment.getTask() == null || !attachment.getTask().getTaskId().equals(taskId)) {
            throw new ResourceNotFoundException("Attachment does not belong to task " + taskId);
        }
        return attachment;
    }

    private User currentUser() {
        Integer userId = SecurityUtils.currentUserId()
                .orElseThrow(() -> new IllegalStateException("No authenticated user"));
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    private void logActivity(Task task, User user, ActivityLog.ActionType type, String description) {
        ActivityLog activityLog = new ActivityLog();
        activityLog.setTask(task);
        activityLog.setUser(user);
        activityLog.setActionType(type);
        activityLog.setDescription(description);
        activityLogRepository.save(activityLog);
    }

    private String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1).toLowerCase() : "";
    }

    private AttachmentDTO toDTO(TaskAttachment a) {
        return AttachmentDTO.builder()
                .attachmentId(a.getAttachmentId())
                .taskId(a.getTask().getTaskId())
                .fileName(a.getFileName())
                .fileSize(a.getFileSize())
                .mimeType(a.getMimeType())
                .uploadedById(a.getUploadedBy() != null ? a.getUploadedBy().getUserId() : null)
                .uploadedByName(a.getUploadedBy() != null ? a.getUploadedBy().getFullName() : null)
                .uploadedAt(a.getUploadedAt())
                .downloadUrl("/api/v1/tasks/" + a.getTask().getTaskId()
                        + "/attachments/" + a.getAttachmentId() + "/download")
                .build();
    }
}
