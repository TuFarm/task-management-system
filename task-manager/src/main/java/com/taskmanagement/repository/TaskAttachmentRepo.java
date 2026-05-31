package com.taskmanagement.repository;

import com.taskmanagement.entity.TaskAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskAttachmentRepo extends JpaRepository<TaskAttachment, Integer> {
    List<TaskAttachment> findByTask_TaskIdOrderByUploadedAtDesc(Integer taskId);
}
