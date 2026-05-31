package com.taskmanagement.repository;

import com.taskmanagement.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepo extends JpaRepository<Comment, Integer> {
    List<Comment> findByTask_TaskIdOrderByCreatedAtAsc(Integer taskId);
    List<Comment> findByTask_TaskIdAndParentCommentIdIsNullOrderByCreatedAtAsc(Integer taskId);
}

