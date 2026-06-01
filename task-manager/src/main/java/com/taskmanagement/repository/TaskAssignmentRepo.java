package com.taskmanagement.repository;

import com.taskmanagement.entity.TaskAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface TaskAssignmentRepo extends JpaRepository<TaskAssignment, Integer> {

    @Modifying
    @Query("DELETE FROM TaskAssignment ta WHERE ta.task.taskId = :taskId")
    void deleteByTaskId(Integer taskId);
}
