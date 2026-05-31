package com.taskmanagement.repository;


import com.taskmanagement.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepo extends JpaRepository<User, Integer> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);

    // Add these two methods:
    Boolean existsByUsername(String username);
    Boolean existsByEmail(String email);
}