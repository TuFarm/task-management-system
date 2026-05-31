package com.taskmanagement.service;

import java.util.List;

import com.taskmanagement.dto.request.CreateCommentRequest;
import com.taskmanagement.dto.response.CommentDTO;

public interface CommentService {
    List<CommentDTO> getCommentsByTaskId(Integer taskId);
    CommentDTO createComment(CreateCommentRequest request);
    void deleteComment(Integer taskId, Integer commentId);
}

