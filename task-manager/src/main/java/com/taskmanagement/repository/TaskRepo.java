package com.taskmanagement.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import com.taskmanagement.entity.Task;

@Repository
public interface TaskRepo extends JpaRepository<Task, Integer>, JpaSpecificationExecutor<Task> {

    long countByCategory_CategoryId(Integer categoryId);
}
