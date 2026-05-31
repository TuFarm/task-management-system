package com.taskmanagement.repository;

import com.taskmanagement.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import com.taskmanagement.entity.User;

public interface CategoryRepo extends JpaRepository<Category, Integer> {
}
