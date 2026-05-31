package com.taskmanagement.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AttachmentDTO {
    private Integer attachmentId;
    private Integer taskId;
    private String fileName;
    private Long fileSize;
    private String mimeType;
    private Integer uploadedById;
    private String uploadedByName;
    private LocalDateTime uploadedAt;
    private String downloadUrl;
}
