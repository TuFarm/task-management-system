package com.taskmanagement.controller;

import com.taskmanagement.config.SecurityUtils;
import com.taskmanagement.dto.request.CreateCommentRequest;
import com.taskmanagement.dto.response.CommentDTO;
import com.taskmanagement.service.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tasks/{taskId}/comments")
@RequiredArgsConstructor
@Tag(name = "Comments", description = "Task discussion comments")
public class CommentController {

    private final CommentService commentService;

    @Operation(summary = "List comments for a task (oldest first)")
    @GetMapping
    public List<CommentDTO> getComments(@PathVariable Integer taskId) {
        return commentService.getCommentsByTaskId(taskId);
    }

    @Operation(summary = "Add a comment to a task")
    @PostMapping
    public ResponseEntity<CommentDTO> createComment(@PathVariable Integer taskId,
                                                    @Valid @RequestBody CreateCommentRequest request) {
        request.setTaskId(taskId);
        // The author is always the authenticated user.
        SecurityUtils.currentUserId().ifPresent(request::setUserId);
        return ResponseEntity.ok(commentService.createComment(request));
    }

    @Operation(summary = "Delete a comment (author or ADMIN only)")
    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable Integer taskId,
                                              @PathVariable Integer commentId) {
        commentService.deleteComment(taskId, commentId);
        return ResponseEntity.noContent().build();
    }
}
