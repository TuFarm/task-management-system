package com.taskmanagement.repository;

import com.taskmanagement.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TagRepo extends JpaRepository<Tag, Integer> {
    boolean existsByName(String name);
    Optional<Tag> findByName(String name);
}
