package com.taskmanagement.controller;

import com.taskmanagement.config.SecurityUtils;
import com.taskmanagement.dto.response.AttachmentDTO;
import com.taskmanagement.service.AttachmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tasks/{taskId}/attachments")
@RequiredArgsConstructor
@Tag(name = "Attachments", description = "Upload, list, download and delete task attachments")
public class AttachmentController {

    private final AttachmentService attachmentService;

    @Operation(summary = "List attachments for a task")
    @GetMapping
    public List<AttachmentDTO> list(@PathVariable Integer taskId) {
        return attachmentService.list(taskId);
    }

    @Operation(summary = "Upload an attachment (jpg, png, pdf, docx, xlsx; max 10MB)")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AttachmentDTO> upload(@PathVariable Integer taskId,
                                                @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(attachmentService.upload(taskId, file));
    }

    @Operation(summary = "Download an attachment")
    @GetMapping("/{attachmentId}/download")
    public ResponseEntity<Resource> download(@PathVariable Integer taskId,
                                             @PathVariable Integer attachmentId) {
        AttachmentService.DownloadFile file = attachmentService.loadForDownload(taskId, attachmentId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + file.fileName() + "\"")
                .contentType(MediaType.parseMediaType(file.contentType()))
                .body(file.resource());
    }

    @Operation(summary = "Delete an attachment (ADMIN or GROUP_LEADER only)")
    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<Void> delete(@PathVariable Integer taskId,
                                       @PathVariable Integer attachmentId) {
        String role = SecurityUtils.currentUser().map(u -> u.role()).orElse("");
        if (!"ADMIN".equals(role) && !"GROUP_LEADER".equals(role)) {
            throw new AccessDeniedException("Only ADMIN or GROUP_LEADER can delete attachments");
        }
        attachmentService.delete(taskId, attachmentId);
        return ResponseEntity.noContent().build();
    }
}
